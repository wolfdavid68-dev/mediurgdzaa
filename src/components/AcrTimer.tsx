import { useState, useEffect, useRef } from "react";
import {
  ACLS_PREP_STEPS,
  BPM_OPTIONS,
  COACH_ICON,
  COACH_LS_KEY,
  COACH_NAME,
  COACH_NEXT,
  COACH_TITLE,
  CYCLE_ADRE_S,
  CYCLE_ANALYSE_S,
  HT_CAUSES,
  POST_ROSC_TARGETS,
  PREP_CONTENT,
} from "./AcrTimer.constants";
import {
  beep,
  ensureAudio,
  fmt,
  metroTick,
  readCoach,
  speak,
  stepState,
  suggestActions,
} from "./AcrTimer.helpers";
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

  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState("rcp");
  const [cycle, setCycle] = useState(1);
  // Ancrage du cycle 2 min de RCP : compte à rebours relatif au début du cycle
  // RCP courant (mis à jour à chaque finishCycle), pas à l'elapsed absolu.
  // Sinon le temps passé en analyse/actions raccourcit la RCP du cycle suivant.
  const [cycleStartedAt, setCycleStartedAt] = useState(0);
  const [currentRhythm, setCurrentRhythm] = useState(null); // "choquable" | "non_choquable" | null
  const [pendingActions, setPendingActions] = useState([]); // [{type, label, hint?, done}]
  const [history, setHistory] = useState([]); // [{cycle, t, rhythm, actions:[]}]
  const [shocks, setShocks] = useState(0);
  const [adres, setAdres] = useState(0);
  const [amios, setAmios] = useState(0);
  const [lastAdreAt, setLastAdreAt] = useState(null);
  // Horodatage des actions critiques pour le bilan/transmission.
  // Chaque event = { id, type:'choc'|'adre'|'amio', label, t (s depuis début chrono), at (Date.now ms) }
  // Permet d'afficher l'heure téléphone ET T+ depuis le début de la RCP.
  const [events, setEvents] = useState([]);
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
  const [prepDrug, setPrepDrug] = useState(null);
  // Causes réversibles (H&T) : Set d'ids d'items investigués/exclus. Persiste
  // au sein de la session (pas reset entre cycles — c'est le but).
  const [htChecked, setHtChecked] = useState(() => new Set());
  const [htExpanded, setHtExpanded] = useState(false);
  const [htDetail, setHtDetail] = useState(null); // id de l'item dont on affiche l'action
  const htCauses = HT_CAUSES[protocol] || HT_CAUSES.erc;

  const startedAtRef = useRef(null);
  const elapsedRef = useRef(0);
  const lastAnalyseAlertRef = useRef(-1);
  const lastAdreAlertRef = useRef(-1);

  // Tick wall-clock
  useEffect(() => {
    if (!running) return;
    startedAtRef.current = Date.now() - elapsedRef.current * 1000;
    const id = setInterval(() => {
      const e = Math.floor((Date.now() - startedAtRef.current) / 1000);
      elapsedRef.current = e;
      setElapsed(e);
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  // Wake Lock — empêche l'écran de s'éteindre pendant que le chrono tourne.
  // Sans ça, Android coupe l'écran après ~30 s sans toucher, le tempo de
  // massage et le chrono disparaissent en plein cycle. Reverrouille au
  // retour de foreground (le verrou est auto-libéré quand l'app passe en
  // arrière-plan). API supportée Chrome 84+, Safari 16.4+, Firefox 126+.
  useEffect(() => {
    if (!running) return;
    if (typeof navigator === "undefined" || !navigator.wakeLock) return;

    let sentinel = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          try {
            await lock.release();
          } catch {}
          return;
        }
        sentinel = lock;
      } catch {}
    };

    const onVis = () => {
      if (document.visibilityState === "visible" && (!sentinel || sentinel.released)) {
        acquire();
      }
    };

    acquire();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      if (sentinel) {
        try {
          sentinel.release();
        } catch {}
      }
    };
  }, [running]);

  // Métronome MCE — indépendant du chrono pour pouvoir s'entraîner sans démarrer la session
  useEffect(() => {
    if (!metroOn || !audioOn) return;
    const periodMs = Math.round(60000 / metroBpm);
    metroTick(); // premier tick immédiat
    const id = setInterval(metroTick, periodMs);
    return () => clearInterval(id);
  }, [metroOn, metroBpm, audioOn]);

  // Compteurs de cycle (rappels temporels)
  // Cycle analyse : relatif au début du cycle RCP courant (cycleStartedAt)
  const rcpInCycle = Math.max(0, elapsed - cycleStartedAt);
  const nextAnalyseIn = Math.max(0, CYCLE_ANALYSE_S - rcpInCycle);
  // Cycle adré : relatif à la dernière dose (4 min)
  const adreIdx = lastAdreAt === null ? -1 : Math.floor((elapsed - lastAdreAt) / CYCLE_ADRE_S);
  const nextAdreIn =
    lastAdreAt === null ? null : CYCLE_ADRE_S - (elapsed - lastAdreAt - adreIdx * CYCLE_ADRE_S);

  // Bip au passage de cycle (toutes les 2 min DE RCP, pas elapsed absolu)
  useEffect(() => {
    if (!running) return;
    // À 2 min RCP : alerter ET auto-passer au cycle suivant (analyse). Inclut
    // les phases "rcp" et "actions" (= RCP avec checklist) pour que l'user
    // n'ait pas à cliquer manuellement « Passer au cycle X+1 ».
    const inCycleRcp = phase === "rcp" || phase === "actions";
    if (
      inCycleRcp &&
      rcpInCycle >= CYCLE_ANALYSE_S &&
      lastAnalyseAlertRef.current !== cycleStartedAt
    ) {
      lastAnalyseAlertRef.current = cycleStartedAt;
      if (audioOn) {
        beep(660, 180);
        setTimeout(() => beep(660, 180), 280);
      }
      if (voiceOn) speak("Analyser le rythme");
      // Si actions : on archive le cycle complet avant de passer à l'analyse suivante
      if (phase === "actions") {
        const doneActions = pendingActions.filter((a) => a.done).map((a) => a.label);
        setHistory((h) => [
          ...h,
          { cycle, t: elapsed, rhythm: currentRhythm, actions: doneActions },
        ]);
        setCycle((c) => c + 1);
        setCurrentRhythm(null);
        setPendingActions([]);
      }
      setPhase("analyse");
    }
    if (lastAdreAt !== null && adreIdx > lastAdreAlertRef.current && adreIdx >= 1) {
      lastAdreAlertRef.current = adreIdx;
      if (audioOn) beep(880, 220);
      if (voiceOn) speak("Prochaine adrénaline");
    }
  }, [
    elapsed,
    running,
    phase,
    audioOn,
    voiceOn,
    rcpInCycle,
    cycleStartedAt,
    adreIdx,
    lastAdreAt,
    cycle,
    currentRhythm,
    pendingActions,
  ]);

  // Compte à rebours préparation DSA — bips/vibration discrets de T-5 à T-1
  const lastZoomCueRef = useRef(-1);
  useEffect(() => {
    const inCycleRcp = phase === "rcp" || phase === "actions";
    if (!running || !visualOn || !inCycleRcp) {
      lastZoomCueRef.current = -1;
      return;
    }
    if (nextAnalyseIn > 5) {
      lastZoomCueRef.current = -1;
      return;
    }
    if (nextAnalyseIn >= 1 && nextAnalyseIn !== lastZoomCueRef.current) {
      lastZoomCueRef.current = nextAnalyseIn;
      if (audioOn) beep(1000, 60, 0.18, "square");
      try {
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(40);
      } catch {}
    }
  }, [nextAnalyseIn, running, audioOn, visualOn, phase]);

  // Annonces vocales préparation DSA — une seule fois par cycle (clé = cycleStartedAt)
  const voicedRef = useRef({ t15: -1, t5: -1 });
  useEffect(() => {
    const inCycleRcp = phase === "rcp" || phase === "actions";
    if (!running || !voiceOn || !inCycleRcp) return;
    if (nextAnalyseIn === 15 && voicedRef.current.t15 !== cycleStartedAt) {
      voicedRef.current.t15 = cycleStartedAt;
      speak("Préparation analyse. Charger le défibrillateur sans arrêter le massage.");
    }
    if (nextAnalyseIn === 5 && voicedRef.current.t5 !== cycleStartedAt) {
      voicedRef.current.t5 = cycleStartedAt;
      speak("On s'écarte");
    }
  }, [nextAnalyseIn, running, voiceOn, phase, cycleStartedAt]);

  const onRhythm = (rhythm) => {
    setCurrentRhythm(rhythm);
    const sugg = suggestActions({
      rhythm,
      totalShocks: shocks,
      lastAdreAt,
      elapsed,
      pediatric,
      protocol,
    });
    setPendingActions(sugg.map((a) => ({ ...a, done: false })));
    setPhase("actions");
    // Le MCE reprend pile maintenant → le chrono 2 min de RCP du nouveau cycle
    // démarre ici (et non au moment de l'analyse précédente). Garantit 2 min
    // pleines de massage entre 2 analyses, peu importe le délai de décision.
    setCycleStartedAt(elapsedRef.current);
  };

  // ROSC obtenu : on archive l'historique et on passe en phase post-rosc.
  // Le chrono continue (compte le temps post-ROSC, utile pour TTM/coro timing).
  const onRosc = () => {
    setHistory((h) => [...h, { cycle, t: elapsed, rhythm: "rosc", actions: ["ROSC obtenu"] }]);
    setCurrentRhythm("rosc");
    setPendingActions([]);
    setPhase("post-rosc");
    addEvent("rosc", "ROSC obtenu · post-réa");
  };

  // Retour ACR depuis post-ROSC (re-arrêt) : on relance un cycle d'analyse.
  const onReAcr = () => {
    setCycle((c) => c + 1);
    setCurrentRhythm(null);
    setPendingActions([]);
    setPhase("analyse");
    setCycleStartedAt(elapsedRef.current);
    addEvent("reacr", "Re-arrêt — relance cycle");
  };

  const toggleHt = (id) => {
    setHtChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Horodatage : on capture l'heure téléphone ET T+ (depuis début chrono).
  // elapsedRef.current = source de vérité (mis à jour à chaque tick), évite les
  // races si plusieurs setX au même tick.
  const addEvent = (type, label) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setEvents((es) => [...es, { id, type, label, t: elapsedRef.current, at: Date.now() }]);
    return id;
  };
  const removeEvent = (id) => setEvents((es) => es.filter((e) => e.id !== id));
  const removeLastEventOfType = (type) =>
    setEvents((es) => {
      for (let i = es.length - 1; i >= 0; i--) {
        if (es[i].type === type) return [...es.slice(0, i), ...es.slice(i + 1)];
      }
      return es;
    });

  const toggleAction = (idx) => {
    setPendingActions((prev) =>
      prev.map((a, i) => {
        if (i !== idx) return a;
        const nextDone = !a.done;
        if (nextDone) {
          // Cocher : incrémente, horodate et mémorise l'ancien lastAdreAt pour pouvoir l'annuler proprement
          let evId = null;
          if (a.type === "choc" || a.type === "adre" || a.type === "amio") {
            evId = addEvent(a.type, a.label);
          }
          if (a.type === "choc") setShocks((s) => s + 1);
          if (a.type === "adre") {
            setAdres((c) => c + 1);
            setLastAdreAt(elapsed);
          }
          if (a.type === "amio") setAmios((c) => c + 1);
          return { ...a, done: true, prevLastAdreAt: lastAdreAt, eventId: evId };
        } else {
          // Décocher : annule l'incrément, retire l'event et restaure l'état d'avant le clic
          if (a.eventId) removeEvent(a.eventId);
          if (a.type === "choc") setShocks((s) => Math.max(0, s - 1));
          if (a.type === "adre") {
            setAdres((c) => Math.max(0, c - 1));
            setLastAdreAt(a.prevLastAdreAt ?? null);
          }
          if (a.type === "amio") setAmios((c) => Math.max(0, c - 1));
          return { ...a, done: false };
        }
      })
    );
  };

  // Bouton manuel « Cycle suivant maintenant » — utile si tout est coché avant 2 min.
  // Comportement aligné sur l'auto-passage (à 2 min) : archive + cycle++ + phase=analyse.
  // cycleStartedAt sera mis à jour au prochain onRhythm (= reprise MCE).
  const finishCycle = () => {
    const doneActions = pendingActions.filter((a) => a.done).map((a) => a.label);
    setHistory((h) => [...h, { cycle, t: elapsed, rhythm: currentRhythm, actions: doneActions }]);
    setCycle((c) => c + 1);
    setCurrentRhythm(null);
    setPendingActions([]);
    setPhase("analyse");
  };

  const skipToAnalyse = () => setPhase("analyse");

  const reset = () => {
    if (!window.confirm("Réinitialiser le chrono ACR (cycle, historique, compteurs) ?")) return;
    setRunning(false);
    setElapsed(0);
    elapsedRef.current = 0;
    setPhase("rcp");
    setCycle(1);
    setCycleStartedAt(0);
    setCurrentRhythm(null);
    setPendingActions([]);
    setHistory([]);
    setShowSummary(false);
    setShocks(0);
    setAdres(0);
    setAmios(0);
    setLastAdreAt(null);
    setEvents([]);
    setHtChecked(new Set());
    setHtExpanded(false);
    setHtDetail(null);
    lastAnalyseAlertRef.current = -1;
    lastAdreAlertRef.current = -1;
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

      {/* Compteurs de cycle (rappels temporels) */}
      <div className="acr-timer-cycles">
        <div className={`acr-cycle ${analyseAlert ? "acr-cycle-alert" : ""}`}>
          <div className="acr-cycle-label">Analyse DSA</div>
          <div className="acr-cycle-value">{running ? fmt(nextAnalyseIn) : "—"}</div>
          <div className="acr-cycle-sub">cycle 2 min</div>
        </div>
        <div className={`acr-cycle ${adreAlert ? "acr-cycle-alert" : ""}`}>
          <div className="acr-cycle-label">Adrénaline</div>
          <div className="acr-cycle-value">
            {lastAdreAt === null ? (
              <span className="acr-cycle-none">après 1re dose</span>
            ) : running ? (
              fmt(nextAdreIn)
            ) : (
              "—"
            )}
          </div>
          <div className="acr-cycle-sub">cycle 4 min</div>
        </div>
      </div>

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

      {/* Panneau guidé : varie selon la phase */}
      <div className="acr-step">
        {!running && (
          <div className="acr-step-empty">
            <strong>Chrono à l'arrêt.</strong> Appuie sur « Démarrer » au début de l'ACR.
          </div>
        )}

        {running && phase === "rcp" && (
          <div className="acr-step-rcp">
            <div className="acr-step-title">RCP en cours</div>
            <div className="acr-step-text">
              Prochaine analyse rythme dans <strong>{fmt(nextAnalyseIn)}</strong>. Le médecin
              annonce le rythme à l'arrêt du MCE.
            </div>
            <button type="button" className="acr-step-link" onClick={skipToAnalyse}>
              Analyser maintenant ↗
            </button>
          </div>
        )}

        {running && phase === "analyse" && (
          <div className="acr-step-analyse">
            <div className="acr-step-title acr-step-title-alert">Analyser le rythme</div>
            <div className="acr-step-text">Stop MCE 5 sec, lecture du tracé. Quel rythme ?</div>
            <div className="acr-step-rhythms">
              <button
                type="button"
                className="acr-rhythm-btn acr-rhythm-shock"
                onClick={() => onRhythm("choquable")}
              >
                <span className="acr-rhythm-icon">⚡</span>
                <span className="acr-rhythm-label">Choquable</span>
                <span className="acr-rhythm-sub">FV / TV sans pouls</span>
              </button>
              <button
                type="button"
                className="acr-rhythm-btn acr-rhythm-noshock"
                onClick={() => onRhythm("non_choquable")}
              >
                <span className="acr-rhythm-icon">💚</span>
                <span className="acr-rhythm-label">Non choquable</span>
                <span className="acr-rhythm-sub">Asystole / AESP</span>
              </button>
              <button type="button" className="acr-rhythm-btn acr-rhythm-rosc" onClick={onRosc}>
                <span className="acr-rhythm-icon">❤️</span>
                <span className="acr-rhythm-label">ROSC</span>
                <span className="acr-rhythm-sub">Pouls retrouvé · post-réa</span>
              </button>
            </div>
          </div>
        )}

        {running && phase === "actions" && (
          <div className="acr-step-actions">
            <div className="acr-step-title">
              {currentRhythm === "choquable" ? "⚡ Choquable" : "💚 Non choquable"}
              <span className="acr-step-cycle-label"> · Cycle {cycle}</span>
            </div>
            {pendingActions.length === 0 ? (
              <div className="acr-step-text">
                Pas d'action médicamenteuse suggérée à ce cycle. Reprendre la RCP 2 min.
              </div>
            ) : (
              <ul className="acr-action-list">
                {pendingActions.map((a, i) => {
                  const drugName =
                    a.type === "adre" ? "Adrénaline" : a.type === "amio" ? "Amiodarone" : null;
                  const hasPrep = drugName && !!PREP_CONTENT[drugName];
                  return (
                    <li key={i} className={`acr-action ${a.done ? "acr-action-done" : ""}`}>
                      <button
                        type="button"
                        className="acr-action-check"
                        onClick={() => toggleAction(i)}
                        aria-label={a.done ? "Décocher" : "Cocher comme fait"}
                      >
                        {a.done ? "✓" : ""}
                      </button>
                      <div className="acr-action-text">
                        {hasPrep ? (
                          <button
                            type="button"
                            className="acr-action-label acr-action-link"
                            onClick={() => setPrepDrug(drugName)}
                            title={`Préparation ${drugName}`}
                          >
                            {a.label} <span aria-hidden="true">↗</span>
                          </button>
                        ) : (
                          <div className="acr-action-label">{a.label}</div>
                        )}
                        {a.hint && <div className="acr-action-hint">{a.hint}</div>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <button type="button" className="acr-step-next" onClick={finishCycle}>
              Passer au cycle {cycle + 1} →
            </button>
          </div>
        )}

        {running && phase === "post-rosc" && (
          <div className="acr-step-postrosc">
            <div className="acr-step-title acr-step-title-rosc">❤️ ROSC obtenu · Post-réa</div>
            <div className="acr-postrosc-grid">
              {POST_ROSC_TARGETS.map((t, i) => (
                <div key={i} className="acr-postrosc-card">
                  <div className="acr-postrosc-icon" aria-hidden="true">
                    {t.icon}
                  </div>
                  <div className="acr-postrosc-cat">{t.cat}</div>
                  <div className="acr-postrosc-cible">{t.cible}</div>
                  <div className="acr-postrosc-action">{t.action}</div>
                </div>
              ))}
            </div>
            <button type="button" className="acr-step-next acr-step-reacr" onClick={onReAcr}>
              ↻ Re-arrêt — relancer un cycle
            </button>
          </div>
        )}
      </div>

      {/* Causes réversibles (H&T) — collapsible, masqué en post-ROSC */}
      {running && phase !== "post-rosc" && (
        <div className={`acr-ht ${htExpanded ? "acr-ht-open" : ""}`}>
          <button
            type="button"
            className="acr-ht-toggle"
            onClick={() => setHtExpanded((x) => !x)}
            aria-expanded={htExpanded}
          >
            <span aria-hidden="true">🔍</span>
            <span className="acr-ht-toggle-label">
              Causes réversibles ({protocol === "acls" ? "5H/5T" : "4H/4T"})
            </span>
            <span className="acr-ht-count">
              {htChecked.size}/{htCauses.length}
            </span>
            <span className="acr-ht-chevron" aria-hidden="true">
              {htExpanded ? "▾" : "▸"}
            </span>
          </button>
          {htExpanded && (
            <div className="acr-ht-body">
              <ul className="acr-ht-list">
                {htCauses.map((c) => {
                  const checked = htChecked.has(c.id);
                  const open = htDetail === c.id;
                  return (
                    <li
                      key={c.id}
                      className={`acr-ht-item ${checked ? "acr-ht-item-checked" : ""}`}
                    >
                      <button
                        type="button"
                        className="acr-ht-pill"
                        onClick={() => setHtDetail(open ? null : c.id)}
                        title={c.action}
                      >
                        <span className="acr-ht-pill-icon" aria-hidden="true">
                          {c.icon}
                        </span>
                        <span className="acr-ht-pill-name">{c.nom}</span>
                        <span className="acr-ht-pill-chevron" aria-hidden="true">
                          {open ? "▾" : "▸"}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="acr-ht-check"
                        onClick={() => toggleHt(c.id)}
                        aria-label={checked ? "Décocher" : "Marquer comme vu/exclu"}
                      >
                        {checked ? "✓" : ""}
                      </button>
                      {open && <div className="acr-ht-action">{c.action}</div>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Boutons généraux */}
      <div className="acr-timer-controls">
        {!running ? (
          <button
            type="button"
            className="acr-btn acr-btn-start"
            onClick={() => {
              // 1er démarrage (pas une reprise après pause) : prompt analyse rythme initial
              const isFirstStart = elapsed === 0 && phase === "rcp";
              if (isFirstStart) setPhase("analyse");
              setRunning(true);
              // Horodatage : « Début ACR » au 1er démarrage, « Reprise » sinon
              addEvent(isFirstStart ? "start" : "resume", isFirstStart ? "Début ACR" : "Reprise");
            }}
          >
            ▶ {elapsed === 0 ? "Démarrer" : "Reprendre"}
          </button>
        ) : (
          <button
            type="button"
            className="acr-btn acr-btn-pause"
            onClick={() => {
              setRunning(false);
              addEvent("pause", "Pause");
            }}
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

      {/* Tally rapide / éditable (préset à l'arrivée si déjà choqué par le DSA) */}
      <div className={`acr-tally ${editingTally ? "acr-tally-editing" : ""}`}>
        {!editingTally ? (
          <>
            <span>
              <strong>{shocks}</strong> choc{shocks > 1 ? "s" : ""}
            </span>
            <span className="acr-tally-sep">·</span>
            <span>
              <strong>{adres}</strong> adré
            </span>
            <span className="acr-tally-sep">·</span>
            <span>
              <strong>{amios}</strong> cordarone
            </span>
            <span className="acr-tally-sep">·</span>
            <span>
              <strong>{history.length}</strong> cycle{history.length > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              className="acr-tally-edit-btn"
              onClick={() => setEditingTally(true)}
              title="Préciser ce qui a déjà été fait avant l'arrivée"
            >
              ✏︎ Modifier
            </button>
          </>
        ) : (
          <div className="acr-tally-edit-grid">
            <div className="acr-tally-edit-row">
              <span className="acr-tally-edit-label">Chocs déjà donnés</span>
              <div className="acr-tally-stepper">
                <button
                  type="button"
                  onClick={() => {
                    setShocks((s) => Math.max(0, s - 1));
                    removeLastEventOfType("choc");
                  }}
                  aria-label="Moins un choc"
                  disabled={shocks === 0}
                >
                  −
                </button>
                <span className="acr-tally-num">{shocks}</span>
                <button
                  type="button"
                  onClick={() => {
                    setShocks((s) => s + 1);
                    addEvent("choc", "Choc (DSA / manuel)");
                  }}
                  aria-label="Plus un choc"
                >
                  +
                </button>
              </div>
            </div>
            <div className="acr-tally-edit-row">
              <span className="acr-tally-edit-label">Adré déjà donnée</span>
              <div className="acr-tally-stepper">
                <button
                  type="button"
                  onClick={() => {
                    if (adres === 0) return;
                    const next = adres - 1;
                    setAdres(next);
                    if (next === 0) setLastAdreAt(null);
                    removeLastEventOfType("adre");
                  }}
                  aria-label="Moins une adrénaline"
                  disabled={adres === 0}
                >
                  −
                </button>
                <span className="acr-tally-num">{adres}</span>
                <button
                  type="button"
                  onClick={() => {
                    setAdres((a) => a + 1);
                    // On considère la dose ajoutée comme « venant juste d'être donnée » :
                    // ça relance correctement le timer 4 min.
                    setLastAdreAt(elapsed);
                    addEvent("adre", pediatric ? "Adrénaline 0,01 mg/kg" : "Adrénaline 1 mg");
                  }}
                  aria-label="Plus une adrénaline"
                >
                  +
                </button>
              </div>
            </div>
            <div className="acr-tally-edit-row">
              <span className="acr-tally-edit-label">Cordarone déjà donnée</span>
              <div className="acr-tally-stepper">
                <button
                  type="button"
                  onClick={() => {
                    setAmios((a) => Math.max(0, a - 1));
                    removeLastEventOfType("amio");
                  }}
                  aria-label="Moins une cordarone"
                  disabled={amios === 0}
                >
                  −
                </button>
                <span className="acr-tally-num">{amios}</span>
                <button
                  type="button"
                  onClick={() => {
                    // Adulte ERC/ACLS : 1re dose = 300 mg (3e choc), 2e = 150 mg (5e choc).
                    // Le label est précis selon le rang pour cohérence dans le bilan.
                    const label = pediatric
                      ? "Amiodarone 5 mg/kg"
                      : amios === 0
                        ? "Amiodarone 300 mg"
                        : "Amiodarone 150 mg";
                    setAmios((a) => a + 1);
                    addEvent("amio", label);
                  }}
                  aria-label="Plus une cordarone"
                >
                  +
                </button>
              </div>
            </div>
            <div className="acr-tally-edit-hint">
              À l'arrivée, ajuste les chocs déjà délivrés par le DSA et toute adré déjà reçue. Le
              prochain choc sera proposé en cohérence (ex : si chocs = 2, le suivant est le 3e →
              suggestion Amio 300 mg).
            </div>
            <button type="button" className="acr-tally-done" onClick={() => setEditingTally(false)}>
              Terminé
            </button>
          </div>
        )}
      </div>

      {/* Overlay « zoom préparation DSA » — checklist ACLS High-Performance CPR */}
      {showZoom && (
        <div
          className="acr-zoom"
          role="alert"
          aria-live="assertive"
          aria-label="Préparation analyse DSA"
        >
          <div className="acr-zoom-header">
            <span className="acr-zoom-header-title">⚡ Coach ACR · Préparation DSA</span>
            <button
              type="button"
              className="acr-zoom-skip"
              onClick={skipToAnalyse}
              aria-label="Passer à l'analyse maintenant"
            >
              Analyser maintenant ↗
            </button>
          </div>
          <div className="acr-zoom-body">
            <div className="acr-zoom-label">Analyse rythme dans</div>
            <div
              className={`acr-zoom-count ${nextAnalyseIn <= 5 ? "acr-zoom-count-danger" : nextAnalyseIn <= 10 ? "acr-zoom-count-warn" : "acr-zoom-count-info"}`}
              aria-hidden="true"
            >
              {nextAnalyseIn === 0 ? "GO" : nextAnalyseIn}
            </div>
            {nextAnalyseIn > 0 && <div className="acr-zoom-unit">secondes</div>}
            <div className="acr-zoom-bar" aria-hidden="true">
              <div
                className="acr-zoom-bar-fill"
                style={{ width: `${Math.min(100, ((15 - nextAnalyseIn) / 15) * 100)}%` }}
              />
            </div>
          </div>
          <ul className="acr-zoom-checklist">
            {ACLS_PREP_STEPS.map((step, i) => {
              const state = stepState(step, nextAnalyseIn);
              return (
                <li key={i} className={`acr-zoom-step acr-zoom-step-${state}`}>
                  <span className="acr-zoom-step-icon" aria-hidden="true">
                    {step.icon}
                  </span>
                  <span className="acr-zoom-step-label">{step.label}</span>
                  {state === "done" && (
                    <span className="acr-zoom-step-mark" aria-hidden="true">
                      ✓
                    </span>
                  )}
                  {state === "active" && <span className="acr-zoom-step-dot" aria-hidden="true" />}
                </li>
              );
            })}
          </ul>
          <div className="acr-zoom-foot">
            ACLS · High-Performance CPR · <em>Charging during compressions</em>
          </div>
        </div>
      )}

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

      {/* Historique */}
      {history.length > 0 && (
        <div className="acr-history">
          <button
            type="button"
            className="acr-history-toggle"
            onClick={() => setShowHistory((s) => !s)}
          >
            {showHistory ? "▾" : "▸"} Historique ({history.length})
          </button>
          {showHistory && (
            <ul className="acr-history-list">
              {history.map((h) => (
                <li key={h.cycle} className="acr-history-item">
                  <span className="acr-history-cycle">C{h.cycle}</span>
                  <span className="acr-history-time">{fmt(h.t)}</span>
                  <span className={`acr-history-rhythm acr-history-rhythm-${h.rhythm}`}>
                    {h.rhythm === "choquable" ? "Choquable" : "Non choquable"}
                  </span>
                  <span className="acr-history-actions">
                    {h.actions.length === 0 ? "—" : h.actions.join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

// Sous-composants AcrSummary et AcrPrepOverlay extraits dans leurs fichiers
// respectifs. Code restant : machine d'état du chrono + rendu principal.

export default AcrTimer;
