import React, { useState, useEffect, useRef } from 'react';

function LogEntry({ entry }) {
  return (
    <div className={`log-entry ${entry.type}`} style={{ animation: 'logIn 0.2s ease forwards' }}>
      <div className="log-dot" />
      <span>[{entry.time}] {entry.message}</span>
    </div>
  );
}

export default function SidePanel({ log, connection, onConnect, onReset }) {
  const [keyValue, setKeyValue] = useState('');
  const logRef = useRef(null);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  function handleConnect() {
    if (!keyValue.trim()) return;
    onConnect(keyValue.trim());
  }

  return (
    <div className="side-panel">
      <div className="side-section">
        <div className="side-title">Riot API Key</div>
        <div className="key-input-wrap">
          <input
            type="password"
            className="key-input"
            placeholder="RGAPI-xxxxxxxx-..."
            value={keyValue}
            onChange={e => setKeyValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConnect()}
          />
          <div className="key-note">
            Development keys expire every 24h.<br />
            Enter your key to enable live data.
          </div>
          <button
            className="key-btn"
            onClick={handleConnect}
            disabled={connection === 'connecting'}
          >
            {connection === 'connecting' ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>

      <div className="side-title" style={{ padding: '16px 20px 0', marginBottom: 0 }}>
        Draft Log
      </div>
      <div className="draft-log" ref={logRef}>
        {log.map(entry => <LogEntry key={entry.id} entry={entry} />)}
      </div>

      <button className="reset-btn" onClick={onReset}>↺ Reset Draft</button>
    </div>
  );
}
