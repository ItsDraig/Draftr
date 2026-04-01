import React, { useEffect, useRef, useState } from 'react';

function LogEntry({ entry }) {
  return (
    <div className={`log-entry ${entry.type}`} style={{ animation: 'logIn 0.2s ease forwards' }}>
      <div className="log-dot" />
      <span>[{entry.time}] {entry.message}</span>
    </div>
  );
}

export default function SidePanel({ log, onReset }) {
  const [open, setOpen] = useState(true);
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  return (
    <div className={`side-panel${open ? '' : ' collapsed'}`}>
      {/* Header — always visible, clicking toggles */}
      <div className="side-panel-header" onClick={() => setOpen(o => !o)}>
        <span className="side-title" style={{ margin: 0 }}>Draft Log</span>
        <span className="side-panel-toggle-icon">{open ? '◀' : '▶'}</span>
      </div>

      {/* Collapsible body */}
      <div className="side-panel-body">
        <div className="draft-log" ref={logRef}>
          {log.map(entry => <LogEntry key={entry.id} entry={entry} />)}
        </div>
        <button className="reset-btn" onClick={onReset}>↺ Reset Draft</button>
      </div>
    </div>
  );
}
