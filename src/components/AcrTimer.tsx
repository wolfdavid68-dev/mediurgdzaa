import { useState, useEffect, useReducer } from "react";
import {
  BPM_OPTIONS,
  COACH_ICON,
  COACH_LS_KEY,
  COACH_NAME,
  COACH_NEXT,
  COACH_TITLE,
  CYCLE_ADRE_S,
  CYCLE_ANALYSE_S,
  HT_CAUSES,
  PREP_CONTENT,
} from "./AcrTimer.constants";
import { ensureAudio, fmt, readCoach, speak } from "./AcrTimer.helpers";
import { initialSessionState, sessionReducer } from "./AcrTimer.reducer";
import {
  useAcrAnalysisCue,
  useAcrAnalysisVoice,
  useAcrAutoAdvance,
  useAcrChrono,
  useAcrMetronome,
} from "./AcrTimer.hooks";
import {
  AcrCycleCounters,
  AcrHTPanel,
  AcrHistory,
  AcrStepPanel,
  AcrTallyEditor,
  AcrZoomOverlay,
} from "./AcrTimer.parts";
import { useWakeLock } from "../lib/useWakeLock";
import { safeSetItem } from "../lib/safeStorage";
import AcrPrepOverlay from "./AcrPrepOverlay";
import AcrRecordView from "./AcrRecordView";

type AcrTimerProps = {
  pediatric?: boolean;
  protocol?: string;
  onOpenDrug?: (name: string) => void;
};

// phase ∈ "rcp" | "analyse" | "actions" | "post-rosc"
const AcrTimer = ({ pediatric = false, protocol = "erc", onOpenDrug }: AcrTimerProps) => {
  const refDoses = pediatric
    ? [
        { drug: "Adrénaline", dose: "0,01 mg/kg", note: "IV / IO" },
        { drug: "Amiodarone", dose: "5 mg/kg", note: "3e + 5e choc" },
      ]
    : [
        { drug: "Adrénaline", dose: "1 mg", note: "IV / IO · q4 min" },
        { drug: "Amiodarone", dose: "300 mg → 150 mg", note: "3e puis 5e choc" },
      ];

  const [session, dispatch] = useReducer(sessionReducer, initialSessionState);
  const {
    running,
    phase,
    cycle,
    cycleStartedAt,
    currentRhythm,
    pendingActions,
    history,
    shocks,
    adres,
    amios,
    lastAdreAt,
    events,
  } = session;
  const { elapsed, elapsedRef, resetChrono } = useAcrChrono(running);
  const [showRecord, setShowRecord] = useState(false);
  const [coachMode, setCoachMode] = useState<"full" | "visual" | "silent">(readCoach);
  const audioOn = coachMode !== "silent";
  const visualOn = coachMode !== "silent";
  const voiceOn = coachMode === "full";
  useEffect(() => {
    safeSetItem(COACH_LS_KEY, coachMode);
  }, [coachMode]);
  const [showHistory, setShowHistory] = useState(false);
  const [metroOn, setMetroOn] = useState(false);
  const [metroBpm, setMetroBpm] = useState(110);
  const [editingTally, setEditingTally] = useState(false);
  const [prepDrug, setPrepDrug] = useState<string | null>(null);
  const [htChecked, setHtChecked] = useState(() => new Set<string>());
  const [htExpanded, setHtExpanded] = useState(false);
  const [htDetail, setHtDetail] = useState<string | null>(null);
  const htCauses = HT_CAUSES[protocol as keyof typeof HT_CAUSES] || HT_CAUSES.erc;

  useWakeLock(running);
  useAcrMetronome(metroOn, audioOn, metroBpm);

  const rcpInCycle = Math.max(0, elapsed - cycleStartedAt);
  const nextAnalyseIn = Math.max(0, CYCLE_ANALYSE_S - rcpInCycle);
  const adreIdx = lastAdreAt === null ? -1 : Math.floor((elapsed - lastAdreAt) / CYCLE_ADRE_S);
  const nextAdreIn =
    lastAdreAt === null ? null : CYCLE_ADRE_S - (elapsed - lastAdreAt - adreIdx * CYCLE_ADRE_S);

  const { resetAlerts } = useAcrAutoAdvance({
    running,
    phase,
    audioOn,
    voiceOn,
    cycleStartedAt,
    rcpInCycle,
    adreIdx,
    lastAdreAt,
    onAdvance: () => dispatch({ type: "AUTO_ADVANCE", elapsed: elapsedRef.current }),
  });

  useAcrAnalysisCue(running, visualOn, audioOn, phase, nextAnalyseIn);
  useAcrAnalysisVoice(running, voiceOn, phase, nextAnalyseIn, cycleStartedAt);

  const onRhythm = (rhythm: "choquable" | "non_choquable") => {
    dispatch({ type: "PICK_RHYTHM", rhythm, elapsed: elapsedRef.current, pediatric, protocol });
  };
  const onRosc = () => dispatch({ type: "ROSC", elapsed: elapsedRef.current });
  const onReAcr = () => dispatch({ type: "RE_ACR", elapsed: elapsedRef.current });
  const skipToAnalyse = () => dispatch({ type: "SKIP_TO_ANALYSE" });
  const toggleAction = (idx: number) =>
    dispatch({ type: "TOGGLE_ACTION", idx, elapsed: elapsedRef.current });
  const finishCycle = () => dispatch({ type: "FINISH_CYCLE", elapsed: elapsedRef.current });

  const toggleHt = (id: string) => {
    setHtChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const reset = () => {
    if (!window.confirm("Réinitialiser le chrono ACR (cycle, historique, compteurs) ?")) return;
    dispatch({ type: "RESET" });
    resetChrono();
    setShowRecord(false);
    setHtChecked(new Set());
    setHtExpanded(false);
    setHtDetail(null);
    resetAlerts();
  };

  const inCycleRcp = phase === "rcp" || phase === "actions";
  const analyseAlert = running && inCycleRcp && nextAnalyseIn <= 10;
  const adreAlert = running && nextAdreIn !== null && nextAdreIn <= 10;
  const showZoom =
    running && inCycleRcp && elapsed > 0 && visualOn && nextAnalyseIn <= 15 && nextAnalyseIn >= 0;

  return (
    <div className="acr-timer" role="region" aria-label="Chrono RCP">
      <div className="acr-timer-top">
        <div className="acr-timer-title">
          <span className="acr-timer-pulse" aria-hidden="true" />
          Chrono RCP · Cycle {cycle}
        </div>
        <div className="acr-timer-elapsed">{fmt(elapsed)}</div>
        <button
          type="button"
          className={`acr-coach-toggle acr-coach-${coachMode}`}
          onClick={() => {
            const next = COACH_NEXT[coachMode];
            if (next !== "silent") ensureAudio();
            if (next === "full") speak("Coach activé");
            setCoachMode(next);
          }}
          aria-label={COACH_TITLE[coachMode]}
          title={COACH_TITLE[coachMode]}
        >
          <span className="acr-coach-icon" aria-hidden="true">
            {COACH_ICON[coachMode]}
          </span>
          <span className="acr-coach-name">{COACH_NAME[coachMode]}</span>
        </button>
      </div>

      <AcrCycleCounters
        running={running}
        nextAnalyseIn={nextAnalyseIn}
        nextAdreIn={nextAdreIn}
        lastAdreAt={lastAdreAt}
        analyseAlert={analyseAlert}
        adreAlert={adreAlert}
      />

      <div className="acr-doses">
        <div className="acr-doses-label">
          Doses {pediatric ? "Enfant" : "Adulte"}
          <span className={`acr-protocol-badge acr-protocol-${protocol}`}>
            {protocol === "acls" ? "ACLS" : "ERC"}
          </span>
        </div>
        <div className="acr-doses-pills">
          {refDoses.map((d: { drug: string; dose: string; note: string }, i: number) => {
            const hasPrep = !!PREP_CONTENT[d.drug as keyof typeof PREP_CONTENT];
            return (
              <button
                key={i}
                type="button"
                className="acr-dose-pill"
                onClick={() => {
                  if (hasPrep) setPrepDrug(d.drug);
                  else if (onOpenDrug) onOpenDrug(d.drug);
                }}
                disabled={!hasPrep && !onOpenDrug}
                title={hasPrep ? `Préparation ${d.drug}` : d.drug}
              >
                <span className="acr-dose-pill-name">{d.drug}</span>
                <span className="acr-dose-pill-dose">{d.dose}</span>
                <span className="acr-dose-pill-note">{d.note}</span>
                {(hasPrep || onOpenDrug) && (
                  <span className="acr-dose-pill-arrow" aria-hidden="true">
                    ↗
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`acr-metro ${metroOn ? "acr-metro-on" : ""}`}>
        <button
          type="button"
          className="acr-metro-toggle"
          onClick={() => {
            ensureAudio();
            setMetroOn((o) => !o);
          }}
          aria-pressed={metroOn}
          aria-label={metroOn ? "Arrêter le métronome MCE" : "Démarrer le métronome MCE"}
        >
          <span className="acr-metro-icon" aria-hidden="true">
            {metroOn ? "■" : "▶"}
          </span>
          <span className="acr-metro-label">Métronome MCE</span>
        </button>
        <div className="acr-metro-bpm" role="radiogroup" aria-label="Cadence">
          {BPM_OPTIONS.map((b) => (
            <button
              key={b}
              type="button"
              role="radio"
              aria-checked={metroBpm === b}
              className={`acr-metro-bpm-btn ${metroBpm === b ? "acr-metro-bpm-active" : ""}`}
              onClick={() => setMetroBpm(b)}
            >
              {b}
            </button>
          ))}
          <span className="acr-metro-unit">/min</span>
        </div>
      </div>

      <AcrStepPanel
        running={running}
        phase={phase}
        currentRhythm={currentRhythm}
        cycle={cycle}
        pendingActions={pendingActions}
        nextAnalyseIn={nextAnalyseIn}
        onRhythm={onRhythm}
        onRosc={onRosc}
        onReAcr={onReAcr}
        onSkipToAnalyse={skipToAnalyse}
        onToggleAction={toggleAction}
        onFinishCycle={finishCycle}
        onPrepDrug={setPrepDrug}
      />

      {running && phase !== "post-rosc" && (
        <AcrHTPanel
          protocol={protocol}
          htCauses={htCauses}
          htChecked={htChecked}
          htExpanded={htExpanded}
          htDetail={htDetail}
          onToggleExpanded={() => setHtExpanded((x) => !x)}
          onToggleHt={toggleHt}
          onSetDetail={setHtDetail}
        />
      )}

      <div className="acr-timer-controls">
        {!running ? (
          <button
            type="button"
            className="acr-btn acr-btn-start"
            onClick={() => dispatch({ type: "START", elapsed: elapsedRef.current })}
          >
            ▶ {elapsed === 0 ? "Démarrer" : "Reprendre"}
          </button>
        ) : (
          <button
            type="button"
            className="acr-btn acr-btn-pause"
            onClick={() => dispatch({ type: "PAUSE", elapsed: elapsedRef.current })}
          >
            ⏸ Pause
          </button>
        )}
        <button type="button" className="acr-btn acr-btn-bilan" onClick={() => setShowRecord(true)}>
          📋 Bilan
        </button>
        <button
          type="button"
          className="acr-btn acr-btn-reset"
          onClick={reset}
          disabled={
            elapsed === 0 && shocks === 0 && adres === 0 && amios === 0 && history.length === 0
          }
        >
          ↻ Reset
        </button>
      </div>

      {showRecord && (
        <AcrRecordView
          open={showRecord}
          onClose={() => setShowRecord(false)}
          pediatric={pediatric}
          protocol={protocol}
          elapsed={elapsed}
          shocks={shocks}
          adres={adres}
          amios={amios}
          history={history}
          events={events}
          cycle={cycle}
        />
      )}

      <AcrTallyEditor
        shocks={shocks}
        adres={adres}
        amios={amios}
        historyLength={history.length}
        editingTally={editingTally}
        onSetEditingTally={setEditingTally}
        onAdjustTally={(kind: "choc" | "adre" | "amio", delta: 1 | -1) =>
          dispatch({ type: "ADJUST_TALLY", kind, delta, elapsed: elapsedRef.current, pediatric })
        }
      />

      {showZoom && <AcrZoomOverlay nextAnalyseIn={nextAnalyseIn} onSkip={skipToAnalyse} />}

      {prepDrug && PREP_CONTENT[prepDrug as keyof typeof PREP_CONTENT] && (
        <AcrPrepOverlay
          drugName={prepDrug}
          content={PREP_CONTENT[prepDrug as keyof typeof PREP_CONTENT]}
          pediatric={pediatric}
          onClose={() => setPrepDrug(null)}
          onOpenFullSheet={
            onOpenDrug
              ? () => {
                  onOpenDrug(prepDrug);
                  setPrepDrug(null);
                }
              : null
          }
        />
      )}

      {history.length > 0 && (
        <AcrHistory
          history={history}
          showHistory={showHistory}
          onToggleShow={() => setShowHistory((s) => !s)}
        />
      )}
    </div>
  );
};

export default AcrTimer;
