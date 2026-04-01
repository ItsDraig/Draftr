import React, { useRef } from 'react';
import { useDraft } from './hooks/useDraft.js';
import Nav            from './components/Nav.jsx';
import DraftBoard     from './components/DraftBoard.jsx';
import ChampionInput  from './components/ChampionInput.jsx';
import AnalysisPanel  from './components/AnalysisPanel.jsx';
import SidePanel      from './components/SidePanel.jsx';
import AlgoFooter     from './components/AlgoFooter.jsx';
import Toast          from './components/Toast.jsx';

export default function App() {
  const toastRef = useRef(null);

  const {
    blue, red, activeSlot, log, connection, riotKey,
    version, championList, analysis, isDraftComplete,
    connectRiotKey, pickChampion, removeChampion, activateSlot, reset,
  } = useDraft();

  const filledCount = [...blue, ...red].filter(Boolean).length;
  const phase = filledCount === 0
    ? '— AWAITING PICKS —'
    : filledCount < 10
      ? `PICK ${filledCount} / 10`
      : '— DRAFT COMPLETE —';

  return (
    <>
      <Nav
        connection={connection}
        riotKey={riotKey}
        onConnectRiotKey={connectRiotKey}
      />

      <div className="app">
        {/* ── Draft Panel ── */}
        <div className="draft-panel">
          <div className="draft-header">
            <span className="draft-title">Champion Draft</span>
            <span className="draft-phase">{phase}</span>
          </div>

          <DraftBoard
            blue={blue}
            red={red}
            activeSlot={activeSlot}
            version={version}
            onActivate={activateSlot}
            onRemove={removeChampion}
          />

          <ChampionInput
            activeSlot={activeSlot}
            championList={championList}
            version={version}
            isDraftComplete={isDraftComplete}
            onPick={pickChampion}
            onToast={msg => toastRef.current?.show(msg)}
          />

          {analysis && <AnalysisPanel analysis={analysis} />}
        </div>

        {/* ── Side Panel ── */}
        <SidePanel
          log={log}
          onReset={reset}
        />
      </div>

      <AlgoFooter />
      <Toast ref={toastRef} />
    </>
  );
}
