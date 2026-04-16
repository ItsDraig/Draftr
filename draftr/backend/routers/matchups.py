import json
from pathlib import Path
from fastapi import APIRouter, HTTPException

router = APIRouter()

_data_dir = Path(__file__).parent.parent / "data"

def _load(filename: str) -> dict:
    path = _data_dir / filename
    if not path.exists():
        return {}
    with path.open() as f:
        return json.load(f)

# Loaded once at startup; re-start the server after running fetch_matrices.py
MATCHUP_DB:  dict = _load("matchups.json")   # {role: {champion: {opponent: wr}}}
SYNERGY_DB:  dict = _load("synergies.json")  # {champion: {ally: wr}}

VALID_ROLES = {"top", "jungle", "mid", "adc", "support"}


@router.get("/matchups/{role}/{champion}")
async def get_matchups(role: str, champion: str):
    """
    Returns head-to-head win rates for *champion* in *role* vs every tracked opponent.
    Win rates are from the champion's perspective (>50 = favourable).
    """
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"role must be one of {sorted(VALID_ROLES)}")

    role_data = MATCHUP_DB.get(role, {})
    data = role_data.get(champion)
    if data is None:
        raise HTTPException(status_code=404, detail=f"No matchup data for {champion} ({role}). Run fetch_matrices.py first.")

    return {"champion": champion, "role": role, "matchups": data}


@router.get("/synergies/{champion}")
async def get_synergies(champion: str):
    """
    Returns synergy win rates for *champion* with every tracked ally.
    Win rates are for the duo (>50 = the pair wins more than average).
    """
    data = SYNERGY_DB.get(champion)
    if data is None:
        raise HTTPException(status_code=404, detail=f"No synergy data for {champion}. Run fetch_matrices.py first.")

    return {"champion": champion, "synergies": data}
