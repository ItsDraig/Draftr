import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../lib/api.js';

const PICK_ORDER = [
  { team: 'blue', idx: 0 }, { team: 'red',  idx: 0 },
  { team: 'blue', idx: 1 }, { team: 'red',  idx: 1 },
  { team: 'blue', idx: 2 }, { team: 'red',  idx: 2 },
  { team: 'blue', idx: 3 }, { team: 'red',  idx: 3 },
  { team: 'blue', idx: 4 }, { team: 'red',  idx: 4 },
];

function makeLog(type, message) {
  return {
    id:   Math.random().toString(36).slice(2),
    type,
    message,
    time: new Date().toLocaleTimeString('en-US', { hour12: false }),
  };
}

function nextEmptySlot(blue, red) {
  for (const step of PICK_ORDER) {
    const arr = step.team === 'blue' ? blue : red;
    if (!arr[step.idx]) return step;
  }
  return null;
}

export function useDraft() {
  const [blue,         setBlue]         = useState(Array(5).fill(null));
  const [red,          setRed]          = useState(Array(5).fill(null));
  const [activeSlot,   setActiveSlot]   = useState({ team: 'blue', idx: 0 });
  const [log,          setLog]          = useState([makeLog('system', 'Initialising...')]);
  const [connection,   setConnection]   = useState('idle');
  const [riotKey,      setRiotKey]      = useState('idle');
  const [version,      setVersion]      = useState('');
  const [championList, setChampionList] = useState([]);
  const [analysis,     setAnalysis]     = useState(null);
  const [analyzing,    setAnalyzing]    = useState(false);
  const apiKeyRef = useRef('');

  // ── Logging ──
  const addLog = useCallback((type, message) => {
    setLog(prev => [...prev, makeLog(type, message)]);
  }, []);

  // ── Auto-connect to DDragon on mount ──────────────────────────────────────
  const initDDragon = useCallback(async () => {
    setConnection('connecting');
    try {
      const { version: ver } = await api.getVersion();
      setVersion(ver);
      addLog('success', `Data Dragon v${ver} loaded`);

      const { champions } = await api.getChampions();
      const list = Object.entries(champions)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => a.id.localeCompare(b.id));
      setChampionList(list);
      addLog('success', `${list.length} champions loaded`);

      setConnection('connected');
      addLog('success', 'Ready. Begin your draft.');
      setActiveSlot({ team: 'blue', idx: 0 });
    } catch (err) {
      setConnection('error');
      addLog('system', `Failed to load champion data: ${err.message}`);
    }
  }, [addLog]);

  useEffect(() => { initDDragon(); }, []);

  // ── Connect Riot API key (optional, for Phase 4) ──────────────────────────
  const connectRiotKey = useCallback(async (apiKey) => {
    apiKeyRef.current = apiKey;
    setRiotKey('connecting');
    addLog('system', 'Validating Riot API key...');
    try {
      const testRes = await fetch(
        'https://euw1.api.riotgames.com/lol/status/v4/platform-data',
        { headers: { 'X-Riot-Token': apiKey } }
      );
      if (testRes.status === 401 || testRes.status === 403) {
        throw new Error('Invalid or expired API key');
      }
      if (testRes.ok) {
        const platform = await testRes.json();
        addLog('success', `Riot API connected — ${platform.name ?? 'EUW1'}`);
      } else {
        addLog('warn', `Riot API responded ${testRes.status} — key saved`);
      }
      setRiotKey('connected');
    } catch (err) {
      setRiotKey('error');
      addLog('system', `Riot key error: ${err.message}`);
      apiKeyRef.current = '';
    }
  }, [addLog]);

  // ── Pick a champion ───────────────────────────────────────────────────────
  const pickChampion = useCallback(async (champ) => {
    const { team, idx } = activeSlot;
    const taken = [...blue, ...red].filter(Boolean).map(c => c.id);
    if (taken.includes(champ.id)) return { error: `${champ.name ?? champ.id} is already in the draft` };

    const updatedBlue = team === 'blue'
      ? blue.map((c, i) => i === idx ? champ : c)
      : [...blue];
    const updatedRed = team === 'red'
      ? red.map((c, i) => i === idx ? champ : c)
      : [...red];

    setBlue(updatedBlue);
    setRed(updatedRed);
    addLog(team, `${team === 'blue' ? 'Blue' : 'Red'} picks ${champ.name ?? champ.id}`);

    const allFilled = updatedBlue.every(Boolean) && updatedRed.every(Boolean);
    if (allFilled) {
      await runAnalysis(updatedBlue, updatedRed);
    } else {
      const next = nextEmptySlot(updatedBlue, updatedRed);
      if (next) setActiveSlot(next);
    }
    return {};
  }, [activeSlot, blue, red, addLog]);

  // ── Remove a champion ─────────────────────────────────────────────────────
  const removeChampion = useCallback((team, idx) => {
    const arr = team === 'blue' ? blue : red;
    if (!arr[idx]) return;
    const name = arr[idx].name ?? arr[idx].id;

    if (team === 'blue') setBlue(b => b.map((c, i) => i === idx ? null : c));
    else                 setRed(r  => r.map((c, i) => i === idx ? null : c));

    setAnalysis(null);
    addLog('system', `Removed ${name} from ${team} side`);
    setActiveSlot({ team, idx });
  }, [blue, red, addLog]);

  // ── Activate a slot ───────────────────────────────────────────────────────
  const activateSlot = useCallback((team, idx) => {
    setActiveSlot({ team, idx });
  }, []);

  // ── Run analysis ──────────────────────────────────────────────────────────
  const runAnalysis = useCallback(async (b = blue, r = red) => {
    setAnalyzing(true);
    addLog('system', 'Analyzing draft...');
    try {
      const result = await api.analyze(
        b.map(c => c?.id ?? null),
        r.map(c => c?.id ?? null)
      );
      setAnalysis(result);
      addLog('success', `Blue: ${result.blue.label} [${result.blue.grade}]  Red: ${result.red.label} [${result.red.grade}]`);
      addLog('success', `Favored: ${result.verdict.favored === 'blue' ? 'Blue Side' : 'Red Side'} — ${result.verdict.edge}`);
    } catch (err) {
      addLog('system', `Analysis error: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  }, [blue, red, addLog]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setBlue(Array(5).fill(null));
    setRed(Array(5).fill(null));
    setActiveSlot({ team: 'blue', idx: 0 });
    setAnalysis(null);
    addLog('system', 'Draft reset.');
  }, [addLog]);

  const filledCount     = [...blue, ...red].filter(Boolean).length;
  const isDraftComplete = filledCount === 10;

  return {
    blue, red, activeSlot, log, connection, riotKey,
    version, championList, analysis, analyzing,
    isDraftComplete, filledCount,
    connectRiotKey, pickChampion, removeChampion, activateSlot, reset,
  };
}
