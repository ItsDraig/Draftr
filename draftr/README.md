# draftr.gg

League of Legends draft analysis tool.

## Project Structure

```
draftr/
├── backend/               Express API
│   ├── data/
│   │   └── champions.json  Full champion DB (169 champs)
│   ├── routes/
│   │   ├── analyze.js      POST /api/analyze  — scoring engine
│   │   ├── champions.js    GET  /api/champions — champion data
│   │   └── version.js      GET  /api/version   — DDragon version (cached)
│   └── server.js
└── frontend/              Vite + React
    └── src/
        ├── components/
        │   ├── Nav.jsx
        │   ├── DraftBoard.jsx
        │   ├── Slot.jsx
        │   ├── ChampionInput.jsx
        │   ├── AnalysisPanel.jsx
        │   ├── SidePanel.jsx
        │   ├── AlgoFooter.jsx
        │   └── Toast.jsx
        ├── hooks/
        │   └── useDraft.js   All draft state + actions
        ├── lib/
        │   └── api.js        Typed fetch wrappers
        └── styles/
            ├── globals.css
            └── components.css
```

## Quick Start

```bash
# 1. Install all dependencies
npm run install:all

# 2. Start both servers in parallel
npm run dev
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:3001

The Vite dev server proxies `/api/*` to the backend automatically — no CORS config needed locally.

## API Endpoints

| Method | Path              | Description                          |
|--------|-------------------|--------------------------------------|
| GET    | /api/version      | Latest DDragon patch version         |
| GET    | /api/champions    | Full champion DB with archetype data |
| GET    | /api/champions/:id| Single champion by DDragon ID        |
| POST   | /api/analyze      | Draft analysis for two teams         |

### POST /api/analyze

**Request:**
```json
{
  "blue": ["Malphite", "Amumu", "Orianna", "Jinx", "Thresh"],
  "red":  ["Darius", "Khazix", "Zed", "Caitlyn", "Nautilus"]
}
```

**Response:**
```json
{
  "blue": {
    "label": "Teamfight",
    "grade": "A",
    "score": 76.4,
    "physPct": 30,
    "magicPct": 70,
    "strengths": [...],
    "weaknesses": [...],
    "breakdown": [
      { "label": "Coherence",   "value": 80, "max": 100 },
      { "label": "Threat",      "value": 71, "max": 100 },
      { "label": "Dmg Balance", "value": 10, "max": 10  }
    ]
  },
  "red": { ... },
  "verdict": {
    "favored": "blue",
    "delta": 8.2,
    "edge": "SLIGHT EDGE"
  }
}
```

## Deploying

1. Build the frontend: `npm run build` (outputs to `frontend/dist/`)
2. Serve `frontend/dist/` as static files (Vercel, Netlify, nginx, etc.)
3. Deploy `backend/` to any Node host (Railway, Render, Fly.io, VPS)
4. Set `VITE_API_URL` in your frontend host to your backend URL
5. Set `FRONTEND_URL` in your backend host to your frontend URL

## Roadmap

- [x] Phase 1 — Full champion DB (169 champions)
- [x] Phase 2 — React + Express split
- [ ] Phase 3 — Matchup/synergy matrices
- [ ] Phase 4 — Live patch data (op.gg / u.gg winrates)
- [ ] Phase 5 — Claude API natural language analysis
