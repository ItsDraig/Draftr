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


# Loaded once at startup; re-start the server after running fetch_matrices.py.
# Format: { "Aatrox": { "strong": ["Varus", "DrMundo", "Teemo"],
#                       "weak":   ["Kled", "Chogath", "Singed"] }, ... }
MATCHUP_DB: dict = _load("matchups.json")


@router.get("/matchups/{champion}")
async def get_matchups(champion: str):
    """
    Returns the general strong/weak counter lists for a champion.
    'strong' = champions this champion counters.
    'weak'   = champions that counter this champion.
    Run fetch_matrices.py to populate this data.
    """
    data = MATCHUP_DB.get(champion)
    if data is None:
        raise HTTPException(
            status_code=404,
            detail=f"No counter data for '{champion}'. Run fetch_matrices.py first.",
        )
    return {"champion": champion, **data}
