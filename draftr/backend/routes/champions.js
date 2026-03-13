import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load once at startup — data doesn't change at runtime
const raw = readFileSync(join(__dirname, '../data/champions.json'), 'utf-8');
const champDB = JSON.parse(raw);

// GET /api/champions         → full DB
// GET /api/champions/:id     → single champion by Data Dragon ID
router.get('/', (_req, res) => {
  res.json(champDB);
});

router.get('/:id', (req, res) => {
  const champ = champDB.champions[req.params.id];
  if (!champ) return res.status(404).json({ error: `Champion "${req.params.id}" not found` });
  res.json({ id: req.params.id, ...champ });
});

export default router;
