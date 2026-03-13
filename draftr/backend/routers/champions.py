import json
from pathlib import Path
from fastapi import APIRouter, HTTPException

router = APIRouter()

# Load once at startup
_data_path = Path(__file__).parent.parent / "data" / "champions.json"
with _data_path.open() as f:
    _raw = json.load(f)

_meta      = _raw.get("_meta", {})
_champions = _raw.get("champions", {})


@router.get("/champions")
async def get_all_champions():
    """Return the full champion database."""
    return {"meta": _meta, "champions": _champions}


@router.get("/champions/{champion_id}")
async def get_champion(champion_id: str):
    """Return a single champion by Data Dragon ID."""
    champ = _champions.get(champion_id)
    if not champ:
        raise HTTPException(status_code=404, detail=f'Champion "{champion_id}" not found.')
    return {"id": champion_id, **champ}
