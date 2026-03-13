import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from models.schemas import AnalyzeRequest, AnalyzeResponse, TeamResult, Verdict, BreakdownRow

router = APIRouter()

# ── Load champion DB ──────────────────────────────────────────────────────────

_data_path = Path(__file__).parent.parent / "data" / "champions.json"
with _data_path.open() as f:
    CHAMP_DB: dict = json.load(f).get("champions", {})


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


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    # Flatten and validate — no duplicates across teams
    all_picks = [p for p in (req.blue + req.red) if p]
    if len(all_picks) != len(set(all_picks)):
        raise HTTPException(status_code=400, detail="Duplicate champion detected across teams.")

    blue_picks = [p for p in req.blue if p]
    red_picks  = [p for p in req.red  if p]

    blue_result = analyze_team(blue_picks)
    red_result  = analyze_team(red_picks)

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
