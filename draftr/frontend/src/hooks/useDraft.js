import { useState, useCallback, useRef } from 'react';
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
  const [log,          setLog]          = useState([makeLog('system', 'Waiting for API connection...')]);
  const [connection,   setConnection]   = useState('idle'); // idle | connecting | connected | error
  const [version,      setVersion]      = useState('');
  const [championList, setChampionList] = useState([]);
  const [analysis,     setAnalysis]     = useState(null);
  const [analyzing,    setAnalyzing]    = useState(false);
  const apiKeyRef = useRef('');

  // ── Logging ──
  const addLog = useCallback((type, message) => {
    setLog(prev => [...prev, makeLog(type, message)]);
  }, []);

  // ── API Connection ──
  const connect = useCallback(async (apiKey) => {
    apiKeyRef.current = apiKey;
    setConnection('connecting');
    addLog('system', 'Attempting API connection...');
    try {
      // 1. Get DDragon version from our backend (cached)
      const { version: ver } = await api.getVersion();
      setVersion(ver);
      addLog('success', `Data Dragon v${ver} loaded`);

      // 2. Load full champion list from our backend
      const { champions } = await api.getChampions();
      const list = Object.entries(champions)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => a.id.localeCompare(b.id));
      setChampionList(list);
      addLog('success', `${list.length} champions loaded`);

      // 3. Validate the Riot API key via a status endpoint
      const testRes = await fetch(
        'https://euw1.api.riotgames.com/lol/status/v4/platform-data',
        { headers: { 'X-Riot-Token': apiKey } }
      );
      if (testRes.status === 401 || testRes.status === 403) {
        throw new Error('Invalid or expired API key');
      }
      if (testRes.ok) {
        const platform = await testRes.json();
        addLog('success', `Connected to ${platform.name ?? 'Riot API'}`);
      } else {
        addLog('warn', `Riot API responded ${testRes.status} — key accepted`);
      }

      setConnection('connected');
      addLog('success', 'Ready. Begin your draft.');

      // Auto-activate first slot
      setActiveSlot({ team: 'blue', idx: 0 });
    } catch (err) {
      setConnection('error');
      addLog('system', `Error: ${err.message}`);
      apiKeyRef.current = '';
    }
  }, [addLog]);

  // ── Pick a champion into the active slot ──
  const pickChampion = useCallback(async (champ) => {
    const { team, idx } = activeSlot;

    // Duplicate check
    const taken = [...blue, ...red].filter(Boolean).map(c => c.id);
    if (taken.includes(champ.id)) return { error: `${champ.name} is already in the draft` };

    const updatedBlue = team === 'blue'
      ? blue.map((c, i) => i === idx ? champ : c)
      : [...blue];
    const updatedRed = team === 'red'
      ? red.map((c, i) => i === idx ? champ : c)
      : [...red];

    setBlue(updatedBlue);
    setRed(updatedRed);
    addLog(team, `${team === 'blue' ? 'Blue' : 'Red'} picks ${champ.name}`);

    // Check if draft is complete
    const allFilled = updatedBlue.every(Boolean) && updatedRed.every(Boolean);
    if (allFilled) {
      await runAnalysis(updatedBlue, updatedRed);
    } else {
      // Advance to next empty slot
      const next = nextEmptySlot(updatedBlue, updatedRed);
      if (next) setActiveSlot(next);
    }

    return {};
  }, [activeSlot, blue, red, addLog]);

  // ── Remove a champion from a slot ──
  const removeChampion = useCallback((team, idx) => {
    const arr = team === 'blue' ? blue : red;
    if (!arr[idx]) return;
    const name = arr[idx].name;

    if (team === 'blue') setBlue(b => b.map((c, i) => i === idx ? null : c));
    else                 setRed(r  => r.map((c, i) => i === idx ? null : c));

    setAnalysis(null);
    addLog('system', `Removed ${name} from ${team} side`);
    setActiveSlot({ team, idx });
  }, [blue, red, addLog]);

  // ── Activate a slot manually ──
  const activateSlot = useCallback((team, idx) => {
    setActiveSlot({ team, idx });
  }, []);

  // ── Run analysis via backend ──
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

  // ── Reset ──
  const reset = useCallback(() => {
    setBlue(Array(5).fill(null));
    setRed(Array(5).fill(null));
    setActiveSlot({ team: 'blue', idx: 0 });
    setAnalysis(null);
    addLog('system', 'Draft reset.');
  }, [addLog]);

  const filledCount = [...blue, ...red].filter(Boolean).length;
  const isDraftComplete = filledCount === 10;

  return {
    // State
    blue, red, activeSlot, log, connection,
    version, championList, analysis, analyzing,
    isDraftComplete, filledCount,
    // Actions
    connect, pickChampion, removeChampion, activateSlot, reset,
  };
}
