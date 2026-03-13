import time
import httpx
from fastapi import APIRouter, HTTPException
from models.schemas import VersionResponse

router = APIRouter()

# Simple in-process cache — one hour TTL
_cache: dict = {"version": None, "fetched_at": 0.0}
CACHE_TTL = 3600  # seconds


@router.get("/version", response_model=VersionResponse)
async def get_version():
    now = time.time()

    if _cache["version"] and (now - _cache["fetched_at"]) < CACHE_TTL:
        return VersionResponse(version=_cache["version"], cached=True)

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get("https://ddragon.leagueoflegends.com/api/versions.json")
            res.raise_for_status()
            versions: list[str] = res.json()

        _cache["version"]    = versions[0]
        _cache["fetched_at"] = now

        return VersionResponse(version=versions[0], cached=False)

    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"DDragon unreachable: {e}")
