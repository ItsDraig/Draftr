#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════╗"
echo "║     draftr.gg  setup         ║"
echo "╚══════════════════════════════╝"
echo ""

# ── Python venv + deps ────────────────────────────────────────────────────────
echo "▶ Setting up Python backend..."
cd backend

python3 -m venv venv
source venv/bin/activate

pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

# Copy .env if it doesn't exist yet
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  ✓ Created backend/.env from .env.example"
fi

deactivate
cd ..

echo "  ✓ Python venv ready"
echo ""

# ── Node frontend deps ────────────────────────────────────────────────────────
echo "▶ Installing frontend dependencies..."
npm install --prefix frontend --silent
npm install --silent   # root (concurrently)
echo "  ✓ Node deps ready"
echo ""

echo "╔══════════════════════════════════════════════════╗"
echo "║  Setup complete!                                 ║"
echo "║                                                  ║"
echo "║  To start the app:                               ║"
echo "║                                                  ║"
echo "║    source backend/venv/bin/activate              ║"
echo "║    npm run dev                                   ║"
echo "║                                                  ║"
echo "║  Then open: http://localhost:5173                ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
