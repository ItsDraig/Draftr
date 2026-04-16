#!/usr/bin/env python3
"""
Fetch matchup and synergy matrices from Lolalytics.

Run once (or after each patch) to populate:
  backend/data/matchups.json   — per-role head-to-head win rates
  backend/data/synergies.json  — ally synergy win rates

Usage (from the backend/ directory):
  python data/fetch_matrices.py --dry-run      # inspect one champion's raw response
  python data/fetch_matrices.py                # full fetch (~15 min, 860 requests)
  python data/fetch_matrices.py --champ Aatrox # single champion, all roles
"""

import json
import time
import argparse
import sys
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlencode
from urllib.error import HTTPError, URLError

# ── Config ────────────────────────────────────────────────────────────────────

BASE_URL  = "https://lolalytics.com/api/champion1/"
TIER      = "emerald_plus"
QUEUE     = "420"           # ranked solo/duo
PATCH     = "1"             # "1" = latest patch on Lolalytics

ROLE_KEYS = ["top", "jungle", "mid", "adc", "support"]
DELAY     = 0.35            # seconds between requests — be a good citizen

DATA_DIR    = Path(__file__).parent
CHAMPS_FILE = DATA_DIR / "champions.json"
OUT_MATCHUPS  = DATA_DIR / "matchups.json"
OUT_SYNERGIES = DATA_DIR / "synergies.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://lolalytics.com/",
}

# ── HTTP ──────────────────────────────────────────────────────────────────────

def fetch(champion: str, lane: str) -> dict:
    params = urlencode({
        "patch":  PATCH,
        "tier":   TIER,
        "region": "all",
        "queue":  QUEUE,
        "pick":   champion,
        "lane":   lane,
    })
    url = f"{BASE_URL}?{params}"
    req = Request(url, headers=HEADERS)
    with urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())


# ── Parsers ───────────────────────────────────────────────────────────────────

def _entries_from(block) -> list[dict]:
    """Normalise a block that might be a dict-of-lists or a list."""
    if isinstance(block, list):
        return block
    if isinstance(block, dict):
        for key in ("counters", "synergies", "data", "picks"):
            if isinstance(block.get(key), list):
                return block[key]
    return []


def parse_matchups(data: dict) -> dict[str, float]:
    """
    Return {opponent_champion: win_rate} from a Lolalytics champion response.

    Lolalytics stores this under a 'counters' key whose entries look like:
      {"n": "Darius", "wr": 48.2, "games": 1234}
    or as positional arrays: [wr, games, "Darius"]
    """
    results: dict[str, float] = {}

    for top_key in ("counters", "counter", "matchups"):
        block = data.get(top_key)
        if not block:
            continue
        for entry in _entries_from(block):
            if isinstance(entry, dict):
                name = entry.get("n") or entry.get("name") or entry.get("champion")
                wr   = entry.get("wr") or entry.get("winRate") or entry.get("win_rate")
            elif isinstance(entry, (list, tuple)) and len(entry) >= 3:
                # [win_rate, games, champion_name]
                wr, name = entry[0], entry[2]
            else:
                continue
            if name and wr is not None:
                results[str(name)] = round(float(wr), 2)
        if results:
            return results

    return results


def parse_synergies(data: dict) -> dict[str, float]:
    """
    Return {ally_champion: win_rate} from a Lolalytics champion response.
    """
    results: dict[str, float] = {}

    for top_key in ("synergies", "synergy", "allies", "lane"):
        block = data.get(top_key)
        if not block:
            continue
        # 'lane' often contains a nested 'synergy' list
        if isinstance(block, dict) and top_key == "lane":
            block = block.get("synergy") or block.get("synergies") or {}
        for entry in _entries_from(block):
            if isinstance(entry, dict):
                name = entry.get("n") or entry.get("name") or entry.get("champion")
                wr   = entry.get("wr") or entry.get("winRate") or entry.get("win_rate")
            elif isinstance(entry, (list, tuple)) and len(entry) >= 3:
                wr, name = entry[0], entry[2]
            else:
                continue
            if name and wr is not None:
                results[str(name)] = round(float(wr), 2)
        if results:
            return results

    return results


# ── Main ──────────────────────────────────────────────────────────────────────

def load_champion_names() -> list[str]:
    with CHAMPS_FILE.open() as f:
        return list(json.load(f)["champions"].keys())


def fetch_champion(champ: str, matchups: dict, synergies: dict, verbose: bool = True):
    """Fetch all roles for one champion and merge into the accumulator dicts."""
    synergy_acc: dict[str, list[float]] = {}

    for role in ROLE_KEYS:
        try:
            data = fetch(champ, role)
            matchups[role][champ] = parse_matchups(data)
            for ally, wr in parse_synergies(data).items():
                synergy_acc.setdefault(ally, []).append(wr)
            if verbose:
                mu_count = len(matchups[role][champ])
                print(f"  {role:8s}  {mu_count} matchups")
        except HTTPError as e:
            print(f"  {role:8s}  HTTP {e.code} — skipped")
        except Exception as e:
            print(f"  {role:8s}  ERROR: {e} — skipped")
        time.sleep(DELAY)

    # Average synergy win rate across roles
    synergies[champ] = {
        ally: round(sum(wrs) / len(wrs), 2)
        for ally, wrs in synergy_acc.items()
    }


def main():
    parser = argparse.ArgumentParser(description="Fetch Lolalytics matchup/synergy matrices")
    parser.add_argument("--dry-run", action="store_true",
                        help="Fetch Aatrox/top only and print the raw JSON structure")
    parser.add_argument("--champ", metavar="NAME",
                        help="Fetch a single champion (all roles) then save")
    args = parser.parse_args()

    # ── Dry run ──
    if args.dry_run:
        print("Dry run: fetching Aatrox/top …")
        data = fetch("Aatrox", "top")
        print("\nTop-level keys:", list(data.keys()))
        print("\nFull response (truncated to 4 000 chars):")
        print(json.dumps(data, indent=2)[:4000])
        print("\nParsed matchups:", dict(list(parse_matchups(data).items())[:5]))
        print("Parsed synergies:", dict(list(parse_synergies(data).items())[:5]))
        return

    # ── Load existing data (resume-friendly) ──
    matchups: dict  = json.loads(OUT_MATCHUPS.read_text())  if OUT_MATCHUPS.exists()  else {r: {} for r in ROLE_KEYS}
    synergies: dict = json.loads(OUT_SYNERGIES.read_text()) if OUT_SYNERGIES.exists() else {}

    # ── Single champion ──
    if args.champ:
        print(f"Fetching {args.champ} …")
        fetch_champion(args.champ, matchups, synergies)
        OUT_MATCHUPS.write_text(json.dumps(matchups, indent=2))
        OUT_SYNERGIES.write_text(json.dumps(synergies, indent=2))
        print("Saved.")
        return

    # ── Full run ──
    all_champs = load_champion_names()
    total      = len(all_champs)
    done       = sum(1 for c in all_champs if c in synergies)  # rough resume count

    print(f"Fetching {total} champions × {len(ROLE_KEYS)} roles "
          f"({total * len(ROLE_KEYS)} requests, ~{total * len(ROLE_KEYS) * DELAY / 60:.0f} min)")
    if done:
        print(f"Resuming — {done}/{total} already fetched")

    for i, champ in enumerate(all_champs, 1):
        if champ in synergies and all(champ in matchups[r] for r in ROLE_KEYS):
            print(f"[{i}/{total}] {champ} — already cached, skipping")
            continue

        print(f"[{i}/{total}] {champ}")
        fetch_champion(champ, matchups, synergies)

        # Save incrementally every 10 champions
        if i % 10 == 0:
            OUT_MATCHUPS.write_text(json.dumps(matchups, indent=2))
            OUT_SYNERGIES.write_text(json.dumps(synergies, indent=2))
            print(f"  → checkpoint saved ({i}/{total})")

    OUT_MATCHUPS.write_text(json.dumps(matchups, indent=2))
    OUT_SYNERGIES.write_text(json.dumps(synergies, indent=2))
    print(f"\nDone. {total} champions written to matchups.json and synergies.json")


if __name__ == "__main__":
    main()
