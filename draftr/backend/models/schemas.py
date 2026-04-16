from pydantic import BaseModel, field_validator
from typing import Literal

# ── Analyze ───────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    blue: list[str | None]
    red:  list[str | None]

    @field_validator("blue", "red")
    @classmethod
    def must_be_five(cls, v: list) -> list:
        if len(v) != 5:
            raise ValueError("Each team must have exactly 5 slots.")
        return v


class BreakdownRow(BaseModel):
    label: str
    value: int
    max:   int


class CounterpickNote(BaseModel):
    my_champ:  str   # DDragon ID of this team's champion
    opp_champ: str   # DDragon ID of the opposing champion
    role:      str   # "TOP" | "JGL" | "MID" | "BOT" | "SUP"
    favorable: bool  # True = my_champ counters opp_champ; False = opp_champ counters my_champ


class TeamResult(BaseModel):
    label:     str
    grade:     Literal["S", "A", "B", "C", "D"]
    score:     float
    phys_pct:  int
    magic_pct: int
    strengths:   list[str]
    weaknesses:  list[str]
    breakdown:   list[BreakdownRow]
    counterpicks: list[CounterpickNote] = []


class Verdict(BaseModel):
    favored: Literal["blue", "red"]
    delta:   float
    edge:    Literal["EVEN", "SLIGHT EDGE", "CLEAR EDGE"]


class AnalyzeResponse(BaseModel):
    blue:    TeamResult
    red:     TeamResult
    verdict: Verdict


# ── Version ───────────────────────────────────────────────────────────────────

class VersionResponse(BaseModel):
    version: str
    cached:  bool


# ── Champions ─────────────────────────────────────────────────────────────────

class ChampionEntry(BaseModel):
    id:         str
    archetypes: list[str]
    dmg:        Literal["physical", "magic", "mixed"]
    threat:     int


class ChampionsResponse(BaseModel):
    meta:      dict
    champions: dict[str, ChampionEntry]
