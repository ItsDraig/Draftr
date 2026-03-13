# draftr.gg

League of Legends draft analysis tool.

## Stack

| Layer    | Tech                              |
|----------|-----------------------------------|
| Frontend | React 18, Vite 5                  |
| Backend  | Python 3.11+, FastAPI, uvicorn    |
| Data     | DDragon CDN + curated JSON        |

## Project Structure

```
draftr/
├── setup.sh               One-time setup script
├── package.json           Root scripts (runs both servers)
├── backend/
│   ├── main.py            App entry point + CORS
│   ├── requirements.txt
│   ├── routers/
│   │   ├── version.py     GET  /api/version
│   │   ├── champions.py   GET  /api/champions
│   │   └── analyze.py     POST /api/analyze
│   ├── models/
│   │   └── schemas.py     Pydantic models
│   └── data/
│       └── champions.json 169 champions
└── frontend/
    └── src/
        ├── components/    Nav, DraftBoard, Slot, ChampionInput,
        │                  AnalysisPanel, SidePanel, AlgoFooter, Toast
        ├── hooks/
        │   └── useDraft.js
        ├── lib/
        │   └── api.js
        └── styles/
            ├── globals.css
            └── components.css
```

## Quick Start

**Prerequisites:** Python 3.11+, Node.js 18+

```bash
# 1. One-time setup
chmod +x setup.sh && ./setup.sh

# 2. Every time you work on it
source backend/venv/bin/activate
npm run dev
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:3001
- API docs: http://localhost:3001/docs

## API Endpoints

| Method | Path                | Description                  |
|--------|---------------------|------------------------------|
| GET    | /api/version        | Latest DDragon patch version |
| GET    | /api/champions      | Full champion DB             |
| GET    | /api/champions/{id} | Single champion              |
| POST   | /api/analyze        | Draft analysis               |
| GET    | /docs               | Interactive Swagger UI       |

## Roadmap

- [x] Phase 1 — Full champion DB (169 champions)
- [x] Phase 2 — React + FastAPI split
- [ ] Phase 3 — Matchup / synergy matrices
- [ ] Phase 4 — Live patch data (op.gg / lolalytics winrates)
- [ ] Phase 5 — Claude API natural language analysis
