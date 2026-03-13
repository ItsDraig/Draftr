import React from 'react';

const STATUS_CONFIG = {
  idle:       { cls: '',          label: 'NO API KEY'   },
  connecting: { cls: '',          label: 'CONNECTING...' },
  connected:  { cls: 'connected', label: 'CONNECTED'    },
  error:      { cls: 'error',     label: 'ERROR'        },
};

export default function Nav({ connection }) {
  const { cls, label } = STATUS_CONFIG[connection] ?? STATUS_CONFIG.idle;

  return (
    <nav className="nav">
      <div className="nav-logo">draftr<span>.gg</span></div>
      <div className="nav-status">
        <div className="api-status">
          <div className={`status-dot ${cls}`} />
          <span className={`status-label ${cls}`}>{label}</span>
        </div>
      </div>
    </nav>
  );
}
