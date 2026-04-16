import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from models.schemas import AnalyzeRequest, AnalyzeResponse, TeamResult, Verdict, BreakdownRow, CounterpickNote

router = APIRouter()

# ── Load champion DB ──────────────────────────────────────────────────────────

_data_dir  = Path(__file__).parent.parent / "data"

with (_data_dir / "champions.json").open() as f:
    CHAMP_DB: dict = json.load(f).get("champions", {})

def _load_json(filename: str) -> dict:
    path = _data_dir / filename
    if not path.exists():
        return {}
    with path.open() as f:
        return json.load(f)

# Loaded at startup; re-start server after running fetch_matrices.py.
# Format: { "Aatrox": { "strong": [...], "weak": [...] }, ... }
MATCHUP_DB: dict = _load_json("matchups.json")


# ── Static data ───────────────────────────────────────────────────────────────

ARCHETYPE_SW: dict[str, dict] = {
    "Teamfight": {
        "strengths":  ["Dominant in even 5v5 skirmishes", "Scales well into late-game fights"],
        "weaknesses": ["Vulnerable to split push pressure", "Struggles against sustained poke"],
    },
    "Dive": {
        "strengths":  ["High kill threat on priority targets", "Forces reactive, defensive play"],
        "weaknesses": ["Falls off significantly if behind", "Weak into disengage or peel comps"],
    },
    "Poke": {
        "strengths":  ["Controls lane and siege phases", "Low-risk, high-pressure trading pattern"],
        "weaknesses": ["Collapses if enemies close the gap", "Relies entirely on maintaining range"],
    },
    "Split": {
        "strengths":  ["Creates persistent side-lane pressure", "Forces enemies to fracture their response"],
        "weaknesses": ["Team can be 4v5'd at objectives", "Requires strong map awareness and timing"],
    },
    "Pick": {
        "strengths":  ["Can snowball off eliminating key targets", "Punishes isolated or overextended enemies"],
        "weaknesses": ["Ineffective if targets play safe", "Weak in open, sustained teamfights"],
    },
    "Peel": {
        "strengths":  ["Protects win conditions extremely well", "Hard to burst priority carries"],
        "weaknesses": ["Passive — depends entirely on carry performance", "Low kill pressure in proactive fights"],
    },
}

GRADE_THRESHOLDS: list[tuple[int, str]] = [
    (88, "S"),
    (74, "A"),
    (58, "B"),
    (42, "C"),
    (0,  "D"),
]


# ── Scoring logic ─────────────────────────────────────────────────────────────

def score_to_grade(score: float) -> str:
    for minimum, grade in GRADE_THRESHOLDS:
        if score >= minimum:
            return grade
    return "D"


def analyze_team(picks: list[str]) -> TeamResult:
    """
    picks: list of Data Dragon champion IDs (non-null only).
    Returns a fully scored TeamResult.
    """
    data = [CHAMP_DB.get(p) for p in picks]

    # --- Coherence ---
    arch_counts: dict[str, int] = {}
    for d in data:
        if not d:
            continue
        for arch in d["archetypes"]:
            arch_counts[arch] = arch_counts.get(arch, 0) + 1

    if arch_counts:
        top_arch  = max(arch_counts, key=lambda k: (arch_counts[k], k))  # ties → alphabetical
        top_count = arch_counts[top_arch]
    else:
        top_arch, top_count = "Teamfight", 0

    coherence = (top_count / 5) * 100

    # --- Damage balance ---
    phys = magic = 0
    for d in data:
        if not d:
            phys  += 1
            magic += 1
        elif d["dmg"] == "physical":
            phys  += 2
        elif d["dmg"] == "magic":
            magic += 2
        else:  # mixed
            phys  += 1
            magic += 1

    total      = phys + magic
    phys_pct   = round((phys  / total) * 100)
    magic_pct  = 100 - phys_pct
    balance_bonus = 10 if min(phys_pct, magic_pct) >= 25 else 0

    # --- Threat ---
    known = [d for d in data if d]
    avg_threat   = sum(d["threat"] for d in known) / len(known) if known else 6.0
    threat_score = ((avg_threat - 1) / 9) * 100

    # --- Final score ---
    raw   = (coherence * 0.50) + (threat_score * 0.35) + (balance_bonus * 0.15 * 10)
    score = min(100.0, max(0.0, raw))
    grade = score_to_grade(score)

    # --- S&W ---
    sw = ARCHETYPE_SW.get(top_arch, {
        "strengths":  ["Flexible draft with multiple win conditions"],
        "weaknesses": ["Unclear primary identity may hurt execution"],
    })

    return TeamResult(
        label      = top_arch,
        grade      = grade,
        score      = round(score, 1),
        phys_pct   = phys_pct,
        magic_pct  = magic_pct,
        strengths  = sw["strengths"],
        weaknesses = sw["weaknesses"],
        breakdown  = [
            BreakdownRow(label="Coherence",   value=round(coherence),   max=100),
            BreakdownRow(label="Threat",       value=round(threat_score), max=100),
            BreakdownRow(label="Dmg Balance",  value=balance_bonus,      max=10),
        ],
    )


# ── Matrix scoring ────────────────────────────────────────────────────────────

# Same-role lane matchup gets full weight; cross-role matchup gets partial weight
# (counters are based on default role but still relevant in team fights / skirmishes).
SAME_ROLE_WEIGHT  = 1.0
CROSS_ROLE_WEIGHT = 0.35


def matchup_score(my_picks: list[str | None], opp_picks: list[str | None]) -> float | None:
    """
    Score 0–100 representing how favourable this team's matchups are against the opponent.
    50 = neutral, >50 = more favourable, <50 = more unfavourable.

    Slot index encodes role (0=TOP … 4=SUP).  Same-slot comparisons use full
    weight; cross-slot comparisons use CROSS_ROLE_WEIGHT so off-role counters
    still contribute but don't dominate the score.

    Returns None when matchups.json is empty (fetch_matrices.py hasn't been run).
    """
    if not MATCHUP_DB:
        return None

    favorable = unfavorable = 0.0

    for i, my in enumerate(my_picks):
        if not my:
            continue
        data   = MATCHUP_DB.get(my, {})
        strong = set(data.get("strong", []))
        weak   = set(data.get("weak",   []))

        for j, opp in enumerate(opp_picks):
            if not opp:
                continue
            weight = SAME_ROLE_WEIGHT if i == j else CROSS_ROLE_WEIGHT
            if opp in strong:
                favorable   += weight
            elif opp in weak:
                unfavorable += weight

    total = favorable + unfavorable
    if total == 0:
        return None

    return round((favorable / total) * 100, 1)


ROLE_LABELS = ["TOP", "JGL", "MID", "BOT", "SUP"]


def get_counterpick_notes(
    my_picks: list[str | None],
    opp_picks: list[str | None],
) -> list[CounterpickNote]:
    """
    Returns same-role counterpick relationships only (slot index = role).
    favorable=True  → my champion counters theirs.
    favorable=False → their champion counters mine.
    """
    if not MATCHUP_DB:
        return []

    notes: list[CounterpickNote] = []
    for i, (my, opp) in enumerate(zip(my_picks, opp_picks)):
        if not my or not opp:
            continue
        data = MATCHUP_DB.get(my, {})
        role = ROLE_LABELS[i]
        if opp in data.get("strong", []):
            notes.append(CounterpickNote(my_champ=my, opp_champ=opp, role=role, favorable=True))
        elif opp in data.get("weak", []):
            notes.append(CounterpickNote(my_champ=my, opp_champ=opp, role=role, favorable=False))

    return notes


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    # Flatten and validate — no duplicates across teams
    all_picks = [p for p in (req.blue + req.red) if p]
    if len(all_picks) != len(set(all_picks)):
        raise HTTPException(status_code=400, detail="Duplicate champion detected across teams.")

    blue_result = analyze_team([p for p in req.blue if p])
    red_result  = analyze_team([p for p in req.red  if p])

    # ── Matchup rows (appended only when matchups.json has been populated) ────
    blue_mu = matchup_score(req.blue, req.red)
    red_mu  = matchup_score(req.red,  req.blue)

    blue_notes = get_counterpick_notes(req.blue, req.red)
    red_notes  = get_counterpick_notes(req.red,  req.blue)

    blue_updates: dict = {"counterpicks": blue_notes}
    red_updates:  dict = {"counterpicks": red_notes}

    if blue_mu is not None:
        blue_updates["breakdown"] = blue_result.breakdown + [BreakdownRow(label="Matchups", value=round(blue_mu), max=100)]
    if red_mu is not None:
        red_updates["breakdown"]  = red_result.breakdown  + [BreakdownRow(label="Matchups", value=round(red_mu),  max=100)]

    blue_result = blue_result.model_copy(update=blue_updates)
    red_result  = red_result.model_copy(update=red_updates)

    delta   = abs(blue_result.score - red_result.score)
    favored = "blue" if blue_result.score >= red_result.score else "red"
    edge    = "EVEN" if delta < 5 else "SLIGHT EDGE" if delta < 15 else "CLEAR EDGE"

    return AnalyzeResponse(
        blue    = blue_result,
        red     = red_result,
        verdict = Verdict(
            favored = favored,
            delta   = round(delta, 1),
            edge    = edge,
        ),
    )
