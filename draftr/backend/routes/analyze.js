import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

const raw = readFileSync(join(__dirname, '../data/champions.json'), 'utf-8');
const { champions: CHAMP_DB } = JSON.parse(raw);

// ─── Constants ────────────────────────────────────────────────────────────────

const ARCHETYPE_SW = {
  Teamfight: {
    strengths:  ['Dominant in even 5v5 skirmishes', 'Scales well into late-game fights'],
    weaknesses: ['Vulnerable to split push pressure', 'Struggles against sustained poke'],
  },
  Dive: {
    strengths:  ['High kill threat on priority targets', 'Forces reactive, defensive play'],
    weaknesses: ['Falls off significantly if behind', 'Weak into disengage or peel comps'],
  },
  Poke: {
    strengths:  ['Controls lane and siege phases', 'Low-risk, high-pressure trading pattern'],
    weaknesses: ['Collapses if enemies close the gap', 'Relies entirely on maintaining range'],
  },
  Split: {
    strengths:  ['Creates persistent side-lane pressure', 'Forces enemies to fracture their response'],
    weaknesses: ["Team can be 4v5'd at objectives", 'Requires strong map awareness and timing'],
  },
  Pick: {
    strengths:  ['Can snowball off eliminating key targets', 'Punishes isolated or overextended enemies'],
    weaknesses: ['Ineffective if targets play safe', 'Weak in open, sustained teamfights'],
  },
  Peel: {
    strengths:  ['Protects win conditions extremely well', 'Hard to burst priority carries'],
    weaknesses: ['Passive — depends entirely on carry performance', 'Low kill pressure in proactive fights'],
  },
};

const GRADE_THRESHOLDS = [
  { min: 88, grade: 'S' },
  { min: 74, grade: 'A' },
  { min: 58, grade: 'B' },
  { min: 42, grade: 'C' },
  { min: 0,  grade: 'D' },
];

// ─── Scoring Logic ────────────────────────────────────────────────────────────

function getChampData(champId) {
  return CHAMP_DB[champId] ?? null;
}

function analyzeTeam(picks) {
  // picks: array of Data Dragon champion IDs (strings), length 5
  const data = picks.map(getChampData);

  // --- Coherence ---
  const archCounts = {};
  data.forEach(d => {
    if (!d) return;
    d.archetypes.forEach(a => {
      archCounts[a] = (archCounts[a] || 0) + 1;
    });
  });
  const sorted = Object.entries(archCounts).sort((a, b) => b[1] - a[1]);
  const topArch  = sorted[0]?.[0] ?? 'Teamfight';
  const topCount = sorted[0]?.[1] ?? 0;
  const coherence = (topCount / 5) * 100;

  // --- Damage balance ---
  let phys = 0, magic = 0;
  data.forEach(d => {
    if (!d) { phys += 1; magic += 1; return; }
    if (d.dmg === 'physical')      { phys  += 2; }
    else if (d.dmg === 'magic')    { magic += 2; }
    else                            { phys  += 1; magic += 1; } // mixed
  });
  const total    = phys + magic;
  const physPct  = Math.round((phys  / total) * 100);
  const magicPct = 100 - physPct;
  const balanceBonus = Math.min(physPct, magicPct) >= 25 ? 10 : 0;

  // --- Threat ---
  const knownData  = data.filter(Boolean);
  const avgThreat  = knownData.length
    ? knownData.reduce((s, d) => s + d.threat, 0) / knownData.length
    : 6;
  const threatScore = ((avgThreat - 1) / 9) * 100;

  // --- Final score & grade ---
  const raw   = (coherence * 0.50) + (threatScore * 0.35) + (balanceBonus * 0.15 * 10);
  const score = Math.min(100, Math.max(0, raw));
  const grade = GRADE_THRESHOLDS.find(t => score >= t.min)?.grade ?? 'D';

  // --- S&W ---
  const sw = ARCHETYPE_SW[topArch] ?? {
    strengths:  ['Flexible draft with multiple win conditions'],
    weaknesses: ['Unclear primary identity may hurt execution'],
  };

  return {
    label:      topArch,
    grade,
    score:      Math.round(score * 10) / 10,   // 1 decimal
    physPct,
    magicPct,
    strengths:  sw.strengths,
    weaknesses: sw.weaknesses,
    breakdown: [
      { label: 'Coherence',    value: Math.round(coherence),   max: 100 },
      { label: 'Threat',       value: Math.round(threatScore),  max: 100 },
      { label: 'Dmg Balance',  value: balanceBonus ? 10 : 0,   max: 10  },
    ],
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

/**
 * POST /api/analyze
 * Body: { blue: string[5], red: string[5] }
 * Each element is a Data Dragon champion ID or null for an empty slot.
 */
router.post('/', (req, res) => {
  const { blue, red } = req.body ?? {};

  if (!Array.isArray(blue) || !Array.isArray(red)) {
    return res.status(400).json({ error: 'Request body must contain blue and red arrays.' });
  }
  if (blue.length !== 5 || red.length !== 5) {
    return res.status(400).json({ error: 'Each team must have exactly 5 slots.' });
  }

  const allPicks = [...blue, ...red].filter(Boolean);
  const unique   = new Set(allPicks);
  if (unique.size !== allPicks.length) {
    return res.status(400).json({ error: 'Duplicate champion detected across teams.' });
  }

  const blueResult = analyzeTeam(blue.filter(Boolean));
  const redResult  = analyzeTeam(red.filter(Boolean));

  const delta   = Math.abs(blueResult.score - redResult.score);
  const favored = blueResult.score >= redResult.score ? 'blue' : 'red';
  const edge    = delta < 5 ? 'EVEN' : delta < 15 ? 'SLIGHT EDGE' : 'CLEAR EDGE';

  res.json({
    blue: blueResult,
    red:  redResult,
    verdict: { favored, delta: Math.round(delta * 10) / 10, edge },
  });
});

export default router;
