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
import AcrSummary from "./AcrSummary";
import AcrPrepOverlay from "./AcrPrepOverlay";

// phase ∈ "rcp" | "analyse" | "actions" | "post-rosc"
const AcrTimer = ({ pediatric = false, protocol = "erc", onOpenDrug }) => {
  // Doses de référence ERC pour ce patient — affichées en permanence
  const refDoses = pediatric
    ? [
        { drug: "Adrénaline", dose: "0,01 mg/kg", note: "IV / IO" },
        { drug: "Amiodarone", dose: "5 mg/kg", note: "3e + 5e choc" },
      ]
    : [
        { drug: "Adrénaline", dose: "1 mg", note: "IV / IO · q4 min" },
        { drug: "Amiodarone", dose: "300 mg → 150 mg", note: "3e puis 5e choc" },
      ];

  // Toute la session ACR (running, phase, cycle, cycleStartedAt, currentRhythm,
  // pendingActions, history, shocks, adres, amios, lastAdreAt, events) vit dans
  // un reducer pour que les transitions soient atomiques et testables. Cf.
  // AcrTimer.reducer.ts. Le reset = un seul dispatch au lieu de 12 setters.
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
  const [showSummary, setShowSummary] = useState(false);
  const [coachMode, setCoachMode] = useState(readCoach);
  // Dérivés alignés sur la table : seul "voix" distingue full ↔ visual
  const audioOn = coachMode !== "silent"; // bips + métronome
  const visualOn = coachMode !== "silent"; // zoom DSA + flashs
  const voiceOn = coachMode === "full"; // annonces TTS françaises
  useEffect(() => {
    try {
      localStorage.setItem(COACH_LS_KEY, coachMode);
    } catch {}
  }, [coachMode]);
  const [showHistory, setShowHistory] = useState(false);
  const [metroOn, setMetroOn] = useState(false);
  const [metroBpm, setMetroBpm] = useState(110); // ERC : 100-120 / min, défaut au milieu
  const [editingTally, setEditingTally] = useState(false);
  // Overlay préparation rapide (Adré / Cordarone) — affiché par-dessus le
  // chrono. Permet de consulter la dilution sans quitter le mode ACR.
  // null = pas d'overlay. Clé = "Adrénaline" | "Amiodarone".
  const [prepDrug, setPrepDrug] = useState<string | null>(null);
  // Causes réversibles (H&T) : Set d'ids d'items investigués/exclus. Persiste
  // au sein de la session (pas reset entre cycles — c'est le but).
  const [htChecked, setHtChecked] = useState(() => new Set<string>());
  const [htExpanded, setHtExpanded] = useState(false);
  const [htDetail, setHtDetail] = useState<string | null>(null); // id de l'item dont on affiche l'action
  const htCauses = HT_CAUSES[protocol] || HT_CAUSES.erc;

  // Wake Lock pendant que le chrono tourne (l'écran ne doit pas s'éteindre).
  // La modale parent tient déjà un lock global ; ce 2nd lock est défensif
  // au cas où AcrTimer serait monté en dehors d'AcrModeModal.
  useWakeLock(running);

  useAcrMetronome(metroOn, audioOn, metroBpm);

  // Compteurs de cycle (rappels temporels)
  // Cycle analyse : relatif au début du cycle RCP courant (cycleStartedAt)
  const rcpInCycle = Math.max(0, elapsed - cycleStartedAt);
  const nextAnalyseIn = Math.max(0, CYCLE_ANALYSE_S - rcpInCycle);
  // Cycle adré : relatif à la dernière dose (4 min)
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

  // Wrappers fins autour du dispatch pour passer aux sous-composants. Chaque
  // appel capture elapsedRef.current pour que l'horodatage soit précis même
  // si plusieurs actions enchaînent au même tick.
  const onRhythm = (rhythm: "choquable" | "non_choquable") => {
    dispatch({
      type: "PICK_RHYTHM",
      rhythm,
      elapsed: elapsedRef.current,
      pediatric,
      protocol,
    });
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
    setShowSummary(false);
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
      {/* En-tête : chrono + cycle */}
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
            // Réveille les moteurs audio dans le geste utilisateur :
            // - AudioContext (bips, métronome) dès qu'on quitte "silent"
            // - Speech synthesis (voix) si on bascule vers "full"
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

      {/* Doses de référence (adaptées au protocole) */}
      <div className="acr-doses">
        <div className="acr-doses-label">
          Doses {pediatric ? "Enfant" : "Adulte"}
          <span className={`acr-protocol-badge acr-protocol-${protocol}`}>
            {protocol === "acls" ? "ACLS" : "ERC"}
          </span>
        </div>
        <div className="acr-doses-pills">
          {refDoses.map((d, i) => {
            const hasPrep = !!PREP_CONTENT[d.drug];
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

      {/* Métronome MCE (100-120/min) */}
      <div className={`acr-metro ${metroOn ? "acr-metro-on" : ""}`}>
        <button
          type="button"
          className="acr-metro-toggle"
          onClick={() => {
            // Réveille l'AudioContext dans le geste utilisateur (politiques d'autoplay)
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

      {/* Causes réversibles (H&T) — collapsible, masqué en post-ROSC */}
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

      {/* Boutons généraux */}
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
        <button
          type="button"
          className="acr-btn acr-btn-bilan"
          onClick={() => setShowSummary(true)}
          disabled={
            elapsed === 0 && shocks === 0 && adres === 0 && amios === 0 && history.length === 0
          }
        >
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

      {/* Modale Bilan */}
      {showSummary && (
        <AcrSummary
          pediatric={pediatric}
          elapsed={elapsed}
          shocks={shocks}
          adres={adres}
          amios={amios}
          history={history}
          events={events}
          cycle={cycle}
          onClose={() => setShowSummary(false)}
        />
      )}

      <AcrTallyEditor
        shocks={shocks}
        adres={adres}
        amios={amios}
        historyLength={history.length}
        editingTally={editingTally}
        onSetEditingTally={setEditingTally}
        onAdjustTally={(kind, delta) =>
          dispatch({
            type: "ADJUST_TALLY",
            kind,
            delta,
            elapsed: elapsedRef.current,
            pediatric,
          })
        }
      />

      {/* Overlay « zoom préparation DSA » — checklist ACLS High-Performance CPR */}
      {showZoom && <AcrZoomOverlay nextAnalyseIn={nextAnalyseIn} onSkip={skipToAnalyse} />}

      {/* Overlay « Préparation rapide » — Adré / Cordarone, sans quitter le mode ACR */}
      {prepDrug && PREP_CONTENT[prepDrug] && (
        <AcrPrepOverlay
          drugName={prepDrug}
          content={PREP_CONTENT[prepDrug]}
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

// Sous-composants AcrSummary et AcrPrepOverlay extraits dans leurs fichiers
// respectifs. Code restant : machine d'état du chrono + rendu principal.

export default AcrTimer;
