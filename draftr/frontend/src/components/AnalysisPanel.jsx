import React from 'react';

function GradeBadge({ grade }) {
  return <div className={`grade-badge grade-${grade}`}>{grade}</div>;
}

function DamageBar({ phys_pct, magic_pct }) {
  return (
    <div className="dmg-section">
      <div className="dmg-label">Damage Profile</div>
      <div className="dmg-bar">
        <div className="dmg-phys"  style={{ width: phys_pct  + '%' }} />
        <div className="dmg-magic" style={{ width: magic_pct + '%' }} />
      </div>
      <div className="dmg-legend">
        <span className="dmg-legend-item">
          <span className="dmg-dot phys" />{phys_pct}% Physical
        </span>
        <span className="dmg-legend-item">
          <span className="dmg-dot magic" />{magic_pct}% Magic
        </span>
      </div>
    </div>
  );
}

function Breakdown({ rows, color }) {
  return (
    <div className="score-breakdown">
      {rows.map(row => {
        const pct = Math.round((row.value / row.max) * 100);
        return (
          <div className="breakdown-row" key={row.label}>
            <span className="breakdown-row-label">{row.label}</span>
            <div className="breakdown-bar-wrap">
              <div className="breakdown-bar-fill"
                style={{ width: pct + '%', background: color, opacity: 0.5 }} />
            </div>
            <span className="breakdown-val">{row.value}</span>
          </div>
        );
      })}
    </div>
  );
}

function StrengthsWeaknesses({ strengths, weaknesses }) {
  return (
    <div className="sw-section">
      <div className="sw-label">Strengths</div>
      <div className="sw-list">
        {strengths.map((s, i) => (
          <div className="sw-item" key={i}>
            <span className="sw-icon str">▲</span><span>{s}</span>
          </div>
        ))}
      </div>
      <div className="sw-label" style={{ marginTop: 8 }}>Weaknesses</div>
      <div className="sw-list">
        {weaknesses.map((w, i) => (
          <div className="sw-item" key={i}>
            <span className="sw-icon wk">▼</span><span>{w}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamCard({ result, side }) {
  const isBlue  = side === 'blue';
  const color   = isBlue ? 'var(--blue)' : 'var(--red)';
  const reverse = isBlue ? {} : { flexDirection: 'row-reverse' };
  const align   = isBlue ? {} : { textAlign: 'right' };

  return (
    <div className={`analysis-card ${isBlue ? 'blue-card' : 'red-card'}`}>
      <div className="card-top" style={reverse}>
        <GradeBadge grade={result.grade} />
        <div className="card-meta" style={align}>
          <div className="card-label">{result.label.toUpperCase()}</div>
          <div className="card-team-name" style={{ color }}>
            {isBlue ? 'Blue Side' : 'Red Side'}
          </div>
        </div>
      </div>
      <DamageBar phys_pct={result.phys_pct} magic_pct={result.magic_pct} />
      <Breakdown rows={result.breakdown} color={color} />
      <StrengthsWeaknesses strengths={result.strengths} weaknesses={result.weaknesses} />
    </div>
  );
}

export default function AnalysisPanel({ analysis }) {
  if (!analysis) return null;
  const { blue, red, verdict } = analysis;
  const favoredColor = verdict.favored === 'blue' ? 'var(--blue)' : 'var(--red)';

  return (
    <div className="analysis-panel" style={{ animation: 'fadeInUp 0.4s ease forwards' }}>
      <div className="analysis-header">
        <span className="draft-title">Draft Analysis</span>
        <span className="analysis-vs-label">
          BLUE <span style={{ color: 'var(--dim)' }}>vs</span> RED
        </span>
      </div>
      <div className="analysis-grid">
        <TeamCard result={blue} side="blue" />

        <div className="verdict-col">
          <div className="verdict-box">
            <div className="verdict-label">FAVORED</div>
            <div className="verdict-team" style={{ color: favoredColor }}>
              {verdict.favored.toUpperCase()}
            </div>
            <div className="verdict-delta">{verdict.edge}</div>
          </div>
        </div>

        <TeamCard result={red} side="red" />
      </div>
    </div>
  );
}
