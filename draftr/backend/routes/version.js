import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

// Simple in-process cache — refreshes once per server restart
// (good enough; DDragon versions change with patches, not hourly)
let cachedVersion = null;
let cachedAt = null;
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cachedVersion && cachedAt && now - cachedAt < CACHE_TTL_MS) {
      return res.json({ version: cachedVersion, cached: true });
    }

    const response = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    if (!response.ok) throw new Error('DDragon unreachable');

    const versions = await response.json();
    cachedVersion = versions[0];
    cachedAt = now;

    res.json({ version: cachedVersion, cached: false });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

export default router;
