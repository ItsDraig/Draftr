import React from 'react';
import Slot from './Slot.jsx';

export default function DraftBoard({ blue, red, activeSlot, version, onActivate, onRemove }) {
  return (
    <div className="teams">
      {/* Blue Team */}
      <div className="team blue">
        <div className="team-label blue">Blue Side</div>
        <div className="slots">
          {blue.map((champ, i) => (
            <Slot
              key={i}
              idx={i}
              team="blue"
              champion={champ}
              isActive={activeSlot.team === 'blue' && activeSlot.idx === i}
              version={version}
              onActivate={onActivate}
              onRemove={onRemove}
            />
          ))}
        </div>
      </div>

      {/* VS */}
      <div className="vs-col"><div className="vs">VS</div></div>

      {/* Red Team */}
      <div className="team red">
        <div className="team-label red">Red Side</div>
        <div className="slots">
          {red.map((champ, i) => (
            <Slot
              key={i}
              idx={i}
              team="red"
              champion={champ}
              isActive={activeSlot.team === 'red' && activeSlot.idx === i}
              version={version}
              onActivate={onActivate}
              onRemove={onRemove}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
