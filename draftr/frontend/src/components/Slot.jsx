import React from 'react';

const ROLES = [
  { label: 'TOP', src: '/icons/top.png'     },
  { label: 'JGL', src: '/icons/jungle.png'  },
  { label: 'MID', src: '/icons/mid.png'     },
  { label: 'BOT', src: '/icons/bottom.png'  },
  { label: 'SUP', src: '/icons/support.png' },
];

export default function Slot({ idx, team, champion, isActive, version, onActivate, onRemove }) {
  const role   = ROLES[idx];
  const filled = !!champion;

  let className = 'slot';
  if (isActive) className += ' active' + (team === 'red' ? ' red-side' : '');
  if (filled)   className += ' filled';

  const iconUrl = champion && version
    ? `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion.id}.png`
    : null;

  return (
    <div className={className} onClick={() => !filled && onActivate(team, idx)}>
      <span className="slot-num">{idx + 1}</span>

      {/* Role icon */}
      <div className="slot-role-icon">
        <img src={role.src} alt={role.label} title={role.label}
          onError={e => { e.currentTarget.style.display = 'none'; }} />
      </div>

      {/* Champion icon */}
      <div className="slot-icon">
        {iconUrl
          ? <img src={iconUrl} alt={champion.name}
              onError={e => { e.currentTarget.parentElement.innerHTML = `<span class="icon-placeholder">${champion.name[0]}</span>`; }} />
          : <span className="icon-placeholder">?</span>
        }
      </div>

      {/* Name / role tags */}
      <div className="slot-info" style={filled ? { animation: 'slotFill 0.25s ease forwards' } : {}}>
        {champion
          ? <>
              <div className="slot-name">{champion.name ?? champion.id}</div>
              <div className="slot-role">{champion.tags ? champion.tags.join(' / ') : ''}</div>
            </>
          : <div className="slot-name empty">— empty —</div>
        }
      </div>

      {/* Remove button — only when filled */}
      {filled && (
        <button
          className="slot-remove"
          onClick={e => { e.stopPropagation(); onRemove(team, idx); }}
        >✕</button>
      )}
    </div>
  );
}
