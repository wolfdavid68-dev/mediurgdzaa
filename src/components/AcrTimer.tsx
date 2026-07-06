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
import {
  createEmptyAcrSession,
  mergeTimerSnapshotIntoSession,
  type AcrFullSession,
} from "../lib/acrSession";
import {
  computeAcrRuntime,
  listSessions,
  readSession,
  writeSession,
  type AcrSessionSummary,
  type AcrRuntimeState,
} from "../lib/acrSessionStore";
import { enqueueSyncItem, mergeAcrSessionCandidates, pullSessions } from "../lib/deviceSync";
import AcrPrepOverlay from "./AcrPrepOverlay";
import AcrRecordView from "./AcrRecordView";
import type { SessionState } from "./AcrTimer.reducer";

type AcrTimerProps = {
  pediatric?: boolean;
  protocol?: string;
  onOpenDrug?: (name: string) => void;
};

const parseTodayTime = (value: string): number | null => {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;
  const [, hh, mm, ss = "0"] = match;
  const date = new Date();
  date.setHours(Number(hh), Number(mm), Number(ss), 0);
  if (date.getTime() > Date.now() + 60_000) date.setDate(date.getDate() - 1);
  return date.getTime();
};

const elapsedBetween = (fromTs: number, toTs: number) =>
  Math.max(0, Math.floor((toTs - fromTs) / 1000));

const timerRhythmFromRecord = (rhythm?: string): SessionState["currentRhythm"] => {
  if (!rhythm) return null;
  if (/racs|rosc/i.test(rhythm)) return "rosc";
  if (/fv|tv|choquable/i.test(rhythm)) return "choquable";
  if (/asystolie|aesp|non/i.test(rhythm)) return "non_choquable";
  return null;
};

type AcrSessionEntry = AcrSessionSummary & {
  source: "local" | "remote";
  remoteSession?: AcrFullSession;
};

const lastElapsedOfType = (events: AcrFullSession["events"], type: string): number | null => {
  const matches = events.filter((event) => event.type === type);
  return matches.length > 0 ? Math.max(...matches.map((event) => event.t)) : null;
};

const hydrateTimerState = (record: AcrFullSession, runtime: AcrRuntimeState): SessionState => {
  const hasRosc = record.events.some((event) => event.type === "rosc");
  const history = record.cycles.map((item) => ({
    cycle: item.cycle,
    t: item.t,
    rhythm: timerRhythmFromRecord(item.rhythm),
    actions: item.actions,
  }));
  return {
    running: runtime.running,
    phase: hasRosc ? "post-rosc" : record.events.length > 0 ? "analyse" : "rcp",
    cycle: record.stats.cycle,
    cycleStartedAt: history.at(-1)?.t ?? 0,
    currentRhythm: hasRosc ? "rosc" : null,
    pendingActions: [],
    history,
    shocks: record.stats.shocks,
    adres: record.stats.adres,
    amios: record.stats.amios,
    lastAdreAt: lastElapsedOfType(record.events, "adre"),
    events: record.events,
  };
};

const formatSessionTime = (ts: number) =>
  new Date(ts)
    .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false })
    .replace(":", " h ");

const formatSessionLabel = (session: AcrSessionSummary) =>
  `${session.pediatric ? "Enfant" : "Adulte"} · ${session.protocol === "acls" ? "ACLS" : "ERC"} · débutée ${formatSessionTime(session.createdAt)} · ${session.shocks} choc${session.shocks > 1 ? "s" : ""} · cycle ${session.cycle}`;

const summarizeEntry = (session: AcrFullSession, source: "local" | "remote"): AcrSessionEntry => ({
  id: session.id,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
  pediatric: session.pediatric,
  protocol: session.protocol,
  shocks: session.stats.shocks,
  cycle: session.stats.cycle,
  source,
  ...(source === "remote" ? { remoteSession: session } : {}),
});

const enqueueAcrSession = (session: AcrFullSession) => {
  enqueueSyncItem({
    kind: "acr-session",
    item_id: session.id,
    payload: session,
    updated_at: session.updatedAt,
  });
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
  const { elapsed, elapsedRef, setElapsedSeconds, resetChrono } = useAcrChrono(running);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [recentSessions, setRecentSessions] = useState<AcrSessionEntry[]>(() =>
    listSessions().map((item) => ({ ...item, source: "local" }))
  );
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

  const loadRecord = (record: AcrFullSession) => {
    const runtime = computeAcrRuntime(record);
    setElapsedSeconds(runtime.elapsed);
    dispatch({ type: "HYDRATE", state: hydrateTimerState(record, runtime) });
    setActiveSessionId(record.id);
    setShowRecord(false);
    setRecentSessions(listSessions().map((item) => ({ ...item, source: "local" })));
  };

  const startNewSession = () => {
    const sessionRecord = {
      ...createEmptyAcrSession(),
      pediatric,
      protocol,
      updatedAt: Date.now(),
    };
    writeSession(sessionRecord);
    enqueueAcrSession(sessionRecord);
    loadRecord(sessionRecord);
  };

  const resumeSession = (sessionId: string) => {
    const entry = recentSessions.find((item) => item.id === sessionId);
    const record = entry?.remoteSession ?? readSession(sessionId);
    if (!record) return;
    if (entry?.source === "remote") writeSession(record);
    loadRecord(record);
  };

  useWakeLock(running);
  useAcrMetronome(metroOn, audioOn, metroBpm);

  useEffect(() => {
    let cancelled = false;
    const local = listSessions();
    setRecentSessions(local.map((item) => ({ ...item, source: "local" })));
    void pullSessions().then((remote) => {
      if (cancelled) return;
      const localRecords = listSessions()
        .map((item) => readSession(item.id))
        .filter((item): item is AcrFullSession => Boolean(item));
      const merged = mergeAcrSessionCandidates(localRecords, remote);
      setRecentSessions(merged.map((item) => summarizeEntry(item.session, item.source)));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeSessionId) return;
    const previous = readSession(activeSessionId) ?? {
      ...createEmptyAcrSession(),
      id: activeSessionId,
    };
    const nextRecord = mergeTimerSnapshotIntoSession(previous, {
      pediatric,
      protocol,
      elapsed,
      shocks,
      adres,
      amios,
      history,
      events,
      cycle,
    });
    writeSession(nextRecord);
    enqueueAcrSession(nextRecord);
    setRecentSessions(listSessions().map((item) => ({ ...item, source: "local" })));
  }, [activeSessionId, pediatric, protocol, elapsed, shocks, adres, amios, history, events, cycle]);

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
  const setStartTime = (value: string) => {
    const startAt = parseTodayTime(value);
    if (startAt === null) return;
    const nextElapsed = elapsedBetween(startAt, Date.now());
    setElapsedSeconds(nextElapsed);
    dispatch({ type: "SET_START_TIME", at: startAt, elapsed: nextElapsed });
    resetAlerts();
  };
  const setEventTime = (eventId: string, value: string) => {
    const eventAt = parseTodayTime(value);
    if (eventAt === null) return;
    const startAt =
      events.find((event) => event.type === "start")?.at ?? Date.now() - elapsedRef.current * 1000;
    dispatch({
      type: "SET_EVENT_TIME",
      eventId,
      at: eventAt,
      elapsed: elapsedBetween(startAt, eventAt),
    });
  };

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

  if (!activeSessionId) {
    return (
      <div className="acr-session-entry" role="region" aria-label="Sessions ACR">
        <button type="button" className="acr-session-new" onClick={startNewSession}>
          Nouvelle session
        </button>
        <section className="acr-session-recent" aria-label="Sessions récentes">
          <h3>Sessions récentes</h3>
          {recentSessions.length === 0 ? (
            <p>Aucune session ACR récente.</p>
          ) : (
            <div className="acr-session-list">
              {recentSessions.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="acr-session-row"
                  onClick={() => resumeSession(item.id)}
                >
                  <span>{formatSessionLabel(item)}</span>
                  {item.source === "remote" && (
                    <em className="acr-session-source">depuis un autre appareil</em>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

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
          sessionId={activeSessionId}
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
        events={events}
        historyLength={history.length}
        editingTally={editingTally}
        onSetEditingTally={setEditingTally}
        onAdjustTally={(kind: "choc" | "adre" | "amio", delta: 1 | -1) =>
          dispatch({ type: "ADJUST_TALLY", kind, delta, elapsed: elapsedRef.current, pediatric })
        }
        onSetStartTime={setStartTime}
        onSetEventTime={setEventTime}
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
