import React, { useState } from 'react';

export default function AlgoFooter() {
  const [open, setOpen] = useState(false);

  return (
    <footer className="app-footer">
      <div className="footer-toggle" onClick={() => setOpen(o => !o)}>
        <div className="footer-toggle-left">
          <span className="footer-toggle-label">How the Algorithm Works</span>
          <span className="footer-toggle-tag">v1.0</span>
        </div>
        <span className={`footer-toggle-icon${open ? ' open' : ''}`}>▼</span>
      </div>

      <div className={`footer-body${open ? ' open' : ''}`}>
        <div className="footer-body-inner">
          <div className="footer-content">

            {/* Scoring formula */}
            <div className="algo-section">
              <div className="algo-section-title" style={{ '--accent': 'var(--blue)' }}>
                Scoring Formula
                <span className="algo-weight">3 components</span>
              </div>
              <div className="algo-body">
                Each team receives a <strong>score from 0–100</strong> based on three weighted
                components. The final score maps to a letter grade, and the higher-scoring team
                is marked as favored.
              </div>
              <div className="algo-formula">
                Score =<br />
                &nbsp;&nbsp;Coherence &nbsp;× 0.50<br />
                + Threat &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;× 0.35<br />
                + Dmg Balance × 0.15
              </div>
              <div className="algo-body" style={{ marginTop: 4 }}>
                The verdict edge label — <strong>EVEN</strong>, <strong>SLIGHT EDGE</strong>,
                or <strong>CLEAR EDGE</strong> — reflects the raw score gap between the two
                teams (&lt;5, &lt;15, or 15+).
              </div>
            </div>

            {/* Component breakdown */}
            <div className="algo-section">
              <div className="algo-section-title" style={{ '--accent': 'var(--gold)' }}>
                Component Breakdown
                <span className="algo-weight">weights</span>
              </div>
              <div className="algo-body">
                <strong>Coherence (50%)</strong> — measures how cleanly your five picks align to
                a single playstyle. The most common archetype tag across the team determines the
                label; the proportion of champions contributing to it drives this score.
              </div>
              <div className="algo-body" style={{ marginTop: 8 }}>
                <strong>Threat (35%)</strong> — the average individual threat rating of your five
                champions, normalized to 0–100. Ratings range from 6 (low-threat utility picks)
                to 9 (high-carry assassins and hyperscalers).
              </div>
              <div className="algo-body" style={{ marginTop: 8 }}>
                <strong>Damage Balance (15%)</strong> — a flat bonus awarded when your composition
                has at least 25% of both physical and magic damage. Itemizing against a one-type
                team is far easier for opponents.
              </div>
            </div>

            {/* Grades */}
            <div className="algo-section">
              <div className="algo-section-title" style={{ '--accent': 'var(--green)' }}>
                Grades &amp; Archetypes
              </div>
              <div className="grade-scale">
                {[
                  { g: 'S', color: 'var(--gold)',  w: '100%', range: '88 – 100' },
                  { g: 'A', color: 'var(--blue)',  w: '79%',  range: '74 – 87'  },
                  { g: 'B', color: '#9090a8',      w: '62%',  range: '58 – 73'  },
                  { g: 'C', color: '#ff8c69',      w: '45%',  range: '42 – 57'  },
                  { g: 'D', color: '#ff3a3a',      w: '25%',  range: '0 – 41'   },
                ].map(({ g, color, w, range }) => (
                  <div className="grade-scale-row" key={g}>
                    <span className={`grade-scale-letter grade-${g}`}>{g}</span>
                    <div className="grade-scale-bar">
                      <div className="grade-scale-fill" style={{ width: w, background: color }} />
                    </div>
                    <span className="grade-scale-range">{range}</span>
                  </div>
                ))}
              </div>
              <div className="archetype-tags">
                {['Dive','Poke','Split','Teamfight','Peel','Pick'].map(t => (
                  <span className="arch-tag" key={t}>{t}</span>
                ))}
              </div>
              <div className="algo-body" style={{ marginTop: 8 }}>
                Champions can carry multiple archetype tags. A comp's label is the plurality
                winner. Ties resolve to the first alphabetically.
              </div>
            </div>

            <div className="footer-divider" />
            <div className="footer-note">
              Champion data is sourced from Riot's Data Dragon CDN. Archetype tags, threat
              ratings, and damage classifications are manually curated. Champions not present
              in the database default to neutral values and do not break scoring.
            </div>

          </div>
        </div>
      </div>
    </footer>
  );
}
