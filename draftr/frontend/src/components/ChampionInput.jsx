import React, { useState, useRef, useEffect } from 'react';

export default function ChampionInput({
  activeSlot, championList, version,
  isDraftComplete, onPick, onToast,
}) {
  const [value,     setValue]     = useState('');
  const [matches,   setMatches]   = useState([]);
  const [highlight, setHighlight] = useState(-1);
  const inputRef = useRef(null);

  // Re-focus + clear whenever the active slot changes
  useEffect(() => {
    setValue('');
    setMatches([]);
    setHighlight(-1);
    if (!isDraftComplete) inputRef.current?.focus();
  }, [activeSlot, isDraftComplete]);

  function handleChange(e) {
    const val = e.target.value;
    setValue(val);
    setHighlight(-1);

    if (!val || val.length < 1 || !championList.length) {
      setMatches([]);
      return;
    }
    const q = val.toLowerCase();
    setMatches(
      championList
        .filter(c => c.id.toLowerCase().startsWith(q) ||
                     (c.name ?? c.id).toLowerCase().startsWith(q))
        .slice(0, 8)
    );
  }

  function handleKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, -1));
    } else if (e.key === 'Enter') {
      if (highlight >= 0 && matches[highlight]) {
        commit(matches[highlight]);
      } else if (matches.length === 1) {
        commit(matches[0]);
      } else {
        // Fuzzy match on current value
        const q = value.toLowerCase();
        const exact = championList.find(
          c => (c.name ?? c.id).toLowerCase() === q || c.id.toLowerCase() === q
        ) ?? championList.find(
          c => (c.name ?? c.id).toLowerCase().startsWith(q)
        );
        if (exact) commit(exact);
        else onToast(`Champion "${value}" not found`);
      }
    } else if (e.key === 'Escape') {
      setMatches([]);
    }
  }

  async function commit(champ) {
    setMatches([]);
    setValue('');
    const result = await onPick(champ);
    if (result?.error) onToast(result.error);
  }

  const isRed      = activeSlot.team === 'red';
  const pickNum    = 1; // display only — hook tracks real order
  const promptText = isDraftComplete
    ? 'DRAFT COMPLETE — ANALYSIS READY'
    : `SELECT ${activeSlot.team.toUpperCase()} SIDE — PICK ${pickNum} OF 5`;

  return (
    <div className="input-area">
      <div className={`input-prompt${isRed ? ' red' : ''}${isDraftComplete ? ' done' : ''}`}>
        {promptText}
      </div>
      <div className="champion-input-wrap">
        <input
          ref={inputRef}
          type="text"
          className={`champion-input${isRed ? ' red-focus' : ''}`}
          placeholder="Champion name..."
          value={value}
          disabled={isDraftComplete}
          onChange={handleChange}
          onKeyDown={handleKey}
          autoComplete="off"
        />
        <button
          className={`confirm-btn${isRed ? ' red' : ''}`}
          disabled={isDraftComplete || !value}
          onClick={() => {
            const q = value.toLowerCase();
            const match = championList.find(
              c => (c.name ?? c.id).toLowerCase() === q || c.id.toLowerCase() === q
            ) ?? championList.find(
              c => (c.name ?? c.id).toLowerCase().startsWith(q)
            );
            if (match) commit(match);
            else onToast(`Champion "${value}" not found`);
          }}
        >
          Pick
        </button>

        {/* Autocomplete dropdown */}
        {matches.length > 0 && (
          <div className="autocomplete">
            {matches.map((c, i) => (
              <div
                key={c.id}
                className={`autocomplete-item${i === highlight ? ' highlighted' : ''}`}
                onMouseDown={e => { e.preventDefault(); commit(c); }}
                onMouseEnter={() => setHighlight(i)}
              >
                {version && (
                  <img
                    src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${c.id}.png`}
                    alt={c.name ?? c.id}
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                <span className="ac-name">{c.name ?? c.id}</span>
                <span className="ac-title">{c.archetypes?.join(' · ') ?? ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
