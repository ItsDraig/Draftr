import React, { useState } from 'react';

const DDragon_STATUS = {
  idle:       { cls: '',          label: 'CONNECTING...' },
  connecting: { cls: '',          label: 'CONNECTING...' },
  connected:  { cls: 'connected', label: 'CONNECTED'     },
  error:      { cls: 'error',     label: 'ERROR'         },
};

const RIOT_STATUS = {
  idle:       { cls: '',          label: 'NO API KEY'    },
  connecting: { cls: '',          label: 'VALIDATING...' },
  connected:  { cls: 'connected', label: 'RIOT LINKED'   },
  error:      { cls: 'error',     label: 'KEY ERROR'     },
};

export default function Nav({ connection, riotKey, onConnectRiotKey }) {
  const [open,     setOpen]     = useState(false);
  const [keyValue, setKeyValue] = useState('');

  const ddStatus   = DDragon_STATUS[connection] ?? DDragon_STATUS.idle;
  const riotStatus = RIOT_STATUS[riotKey]       ?? RIOT_STATUS.idle;

  function handleSubmit() {
    if (!keyValue.trim()) return;
    onConnectRiotKey(keyValue.trim());
    setOpen(false);
  }

  return (
    <div className="nav-wrapper">
      <nav className="nav">
        <div className="nav-logo">draftr<span>.win</span></div>

        <div className="nav-status">
          {/* DDragon status — always shown */}
          <div className="api-status">
            <div className={`status-dot ${ddStatus.cls}`} />
            <span className={`status-label ${ddStatus.cls}`}>
              {ddStatus.label}
            </span>
          </div>

          {/* Divider */}
          <div className="nav-divider" />

          {/* Riot API key status + toggle */}
          <div className="api-status">
            <div className={`status-dot ${riotStatus.cls}`} />
            <span className={`status-label ${riotStatus.cls}`}>
              {riotStatus.label}
            </span>
          </div>

          <button
            className={`nav-key-toggle${open ? ' active' : ''}`}
            onClick={() => setOpen(o => !o)}
            title="Riot API Key"
          >
            {open ? '✕' : 'API KEY'}
          </button>
        </div>
      </nav>

      {/* Collapsible key panel */}
      <div className={`nav-key-panel${open ? ' open' : ''}`}>
        <div className="nav-key-panel-inner">
          <span className="nav-key-label">RIOT API KEY</span>
          <div className="nav-key-row">
            <input
              type="password"
              className="nav-key-input"
              placeholder="RGAPI-xxxxxxxx-..."
              value={keyValue}
              onChange={e => setKeyValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <button
              className="nav-key-btn"
              onClick={handleSubmit}
              disabled={riotKey === 'connecting'}
            >
              {riotKey === 'connecting' ? 'Validating...' : 'Connect'}
            </button>
          </div>
          <span className="nav-key-note">
            Optional — required for live match data (Phase 4). Development keys expire every 24h.
          </span>
        </div>
      </div>
    </div>
  );
}
