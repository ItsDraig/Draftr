#!/usr/bin/env python3
"""
Scrape general counter data (strong/weak vs 3 champions each) from Lolalytics
and save to backend/data/matchups.json.

Data source: lolalytics.com/lol/{champion}/build/  — the QW_1 span contains:
  "X is a strong counter to A, B & C while X is countered most by D, E & F"

Usage (from the backend/ directory):
  python data/fetch_matrices.py --dry-run          # test one champion, print raw output
  python data/fetch_matrices.py --champ Aatrox     # fetch & save a single champion
  python data/fetch_matrices.py                    # full run (~172 champions)
"""

import json
import re
import time
import argparse
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

# ── Config ────────────────────────────────────────────────────────────────────

BASE_URL  = "https://lolalytics.com/lol/{slug}/build/"
DELAY     = 0.5   # seconds between requests

DATA_DIR      = Path(__file__).parent
CHAMPS_FILE   = DATA_DIR / "champions.json"
OUT_MATCHUPS  = DATA_DIR / "matchups.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept":          "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}

# URL slug → DDragon ID  (for parsing opponent hrefs in the response HTML)
SLUG_OVERRIDES = {
    "wukong": "MonkeyKing",
}

# DDragon ID → URL slug  (for building the fetch URL when they differ)
ID_TO_URL_SLUG = {
    "MonkeyKing": "wukong",
}

# ── Slug helpers ──────────────────────────────────────────────────────────────

def to_slug(name: str) -> str:
    """'DrMundo' → 'drmundo',  'KhaZix' → 'khazix'"""
    return re.sub(r"[^a-z0-9]", "", name.lower())


def build_slug_map(champion_ids: list[str]) -> dict[str, str]:
    """Build {lolalytics_slug: ddragon_id} lookup, with manual overrides."""
    m = {to_slug(c): c for c in champion_ids}
    m.update(SLUG_OVERRIDES)
    return m


# ── HTML fetch & parse ────────────────────────────────────────────────────────

QW1_RE   = re.compile(r'q:key="QW_1"(.*?)</span>', re.DOTALL)
# Matches the opponent slug in hrefs like /lol/aatrox/vs/drmundo/build/
HREF_RE  = re.compile(r'/lol/[^/]+/vs/([^/?]+)/build/')


def fetch_page(slug: str) -> str:
    url = BASE_URL.format(slug=slug)
    req = Request(url, headers=HEADERS)
    with urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8", errors="replace")


def parse_counters(html: str, slug_map: dict) -> tuple[list[str], list[str]]:
    """
    Returns (strong_ddragon_ids, weak_ddragon_ids) — each a list of up to 3 IDs.
    'strong' = this champion counters them.
    'weak'   = this champion is countered by them.
    """
    m = QW1_RE.search(html)
    if not m:
        return [], []

    slugs = HREF_RE.findall(m.group(1))   # up to 6: first 3 strong, last 3 weak

    def resolve(s: str) -> str | None:
        return slug_map.get(to_slug(s))

    strong = [r for s in slugs[:3] if (r := resolve(s))]
    weak   = [r for s in slugs[3:6] if (r := resolve(s))]
    return strong, weak


# ── Main ──────────────────────────────────────────────────────────────────────

def load_champion_ids() -> list[str]:
    with CHAMPS_FILE.open() as f:
        return list(json.load(f)["champions"].keys())


def fetch_champion(champ_id: str, slug_map: dict) -> tuple[list[str], list[str]]:
    """Fetch one champion and return (strong, weak) DDragon ID lists."""
    url_slug = ID_TO_URL_SLUG.get(champ_id, to_slug(champ_id))
    html = fetch_page(url_slug)
    return parse_counters(html, slug_map)


def main():
    parser = argparse.ArgumentParser(description="Fetch Lolalytics counter data")
    parser.add_argument("--dry-run", action="store_true",
                        help="Fetch Aatrox only, print raw QW_1 content and parsed result")
    parser.add_argument("--champ", metavar="NAME",
                        help="Fetch a single champion then save (e.g. --champ Aatrox)")
    args = parser.parse_args()

    all_ids  = load_champion_ids()
    slug_map = build_slug_map(all_ids)

    # ── Dry run ──────────────────────────────────────────────────────────────
    if args.dry_run:
        print("Dry run: fetching Aatrox …")
        html  = fetch_page("aatrox")
        m     = QW1_RE.search(html)
        print("\nQW_1 raw content:")
        print(m.group(1) if m else "(QW_1 span not found)")
        strong, weak = parse_counters(html, slug_map)
        print(f"\nParsed  strong: {strong}")
        print(f"Parsed  weak:   {weak}")
        return

    # ── Load existing data (so we can resume partial runs) ───────────────────
    matchups: dict = (
        json.loads(OUT_MATCHUPS.read_text()) if OUT_MATCHUPS.exists() else {}
    )

    targets = [args.champ] if args.champ else all_ids
    total   = len(targets)

    for i, champ_id in enumerate(targets, 1):
        if champ_id not in all_ids:
            print(f"Unknown champion: {champ_id}")
            continue

        if not args.champ and champ_id in matchups:
            print(f"[{i}/{total}] {champ_id} — already cached, skipping")
            continue

        print(f"[{i}/{total}] {champ_id} … ", end="", flush=True)
        try:
            strong, weak = fetch_champion(champ_id, slug_map)
            matchups[champ_id] = {"strong": strong, "weak": weak}
            print(f"strong={strong}  weak={weak}")
        except HTTPError as e:
            print(f"HTTP {e.code} — skipped")
        except Exception as e:
            print(f"ERROR: {e} — skipped")

        time.sleep(DELAY)

        # Incremental save every 20 champions
        if i % 20 == 0:
            OUT_MATCHUPS.write_text(json.dumps(matchups, indent=2))
            print(f"  checkpoint saved ({i}/{total})")

    OUT_MATCHUPS.write_text(json.dumps(matchups, indent=2))
    print(f"\nDone. {len(matchups)} champions saved to matchups.json")


if __name__ == "__main__":
    main()
