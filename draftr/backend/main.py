from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from routers import version, champions, analyze, matchups

load_dotenv()

app = FastAPI(
    title       = "draftr.gg API",
    description = "League of Legends draft analysis backend",
    version     = "1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["http://localhost:5173", frontend_url, "https://draftr.win", "https://www.draftr.win"],
    allow_methods     = ["GET", "POST"],
    allow_headers     = ["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(version.router,   prefix="/api", tags=["version"])
app.include_router(champions.router, prefix="/api", tags=["champions"])
app.include_router(analyze.router,   prefix="/api", tags=["analyze"])
app.include_router(matchups.router,  prefix="/api", tags=["matchups"])


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
