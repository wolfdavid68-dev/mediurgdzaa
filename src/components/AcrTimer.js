import React, { useState, useEffect, useRef } from "react";

// Cycles RCP (recommandations ERC/AHA 2021)
const CYCLE_ANALYSE_S = 120; // analyse rythme DSA toutes les 2 min
const CYCLE_ADRE_S    = 240; // adrénaline toutes les 4 min après la 1re dose

const fmt = (s) => {
  if (s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

// Singleton AudioContext — créé/réveillé lors d'un geste utilisateur,
// réutilisé pour tous les sons (sinon iOS/Chrome bloquent les contextes hors-geste).
let _audioCtx = null;
const ensureAudio = () => {
  try {
    if (!_audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      _audioCtx = new Ctx();
    }
    if (_audioCtx.state === "suspended") {
      // resume() retourne une promesse, on s'en fiche ici
      _audioCtx.resume().catch(() => {});
    }
    return _audioCtx;
  } catch { return null; }
};

const beep = (freq = 880, ms = 220, gainVal = 0.18, type = "sine") => {
  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = type;
    const now = ctx.currentTime;
    const dur = ms / 1000;
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur);
  } catch {}
};

// Tick métronome court et sec (clic plutôt que bip)
const metroTick = () => beep(1600, 35, 0.25, "square");

// Synthèse vocale FR (Web Speech API). Indépendant du Web Audio.
// Sur iOS/Android, le 1er appel doit suivre un geste utilisateur — la bascule
// vers "full" via le picto coach déclenche un warm-up speak("Coach activé").
const speak = (text) => {
  try {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    u.rate = 1.05;
    u.pitch = 1.0;
    u.volume = 1.0;
    synth.cancel(); // évite l'empilement si une annonce précédente n'a pas fini
    synth.speak(u);
  } catch {}
};

const BPM_OPTIONS = [100, 110, 120];

// ─────────────────────────────────────────────────────────
// Coach mode : 3 états cyclables persistés en localStorage
//   full   = visuel + bips + métronome + voix (TTS)
//   visual = visuel + bips + métronome (sans voix) — sweet spot SAUV bruyante
//   silent = aucun feedback (pas de bip, pas de zoom, pas de voix)
// ─────────────────────────────────────────────────────────
const COACH_LS_KEY = "mediurg-acr-coach";
const COACH_NEXT   = { full: "visual", visual: "silent", silent: "full" };
const COACH_ICON   = { full: "🔊",     visual: "👁",     silent: "🔇" };
const COACH_NAME   = { full: "Complet", visual: "Visuel", silent: "Muet" };
const COACH_TITLE  = {
  full:   "Coach complet (visuel + bips + voix) — clic pour visuel sans voix",
  visual: "Coach visuel (bips, voix coupée) — clic pour silencieux",
  silent: "Silencieux (aucun feedback) — clic pour coach complet",
};
const readCoach = () => {
  try {
    const v = localStorage.getItem(COACH_LS_KEY);
    if (v === "full" || v === "visual" || v === "silent") return v;
  } catch {}
  return "full";
};

// ─────────────────────────────────────────────────────────
// Préparation DSA — checklist ACLS High-Performance CPR
// Affichée en overlay « zoom » 15s avant l'analyse rythme.
// Principe ACLS clé : Charging during compressions
// (anticiper la charge sans interrompre le MCE) + minimiser
// la pause péri-choc et le post-shock pause = 0.
// Chaque étape a une fenêtre [from..to] (en s avant T-0).
// ─────────────────────────────────────────────────────────
const ACLS_PREP_STEPS = [
  { icon: "⚡", label: "Charger le défib · MCE continue",        from: 15, to: 11 },
  { icon: "🔄", label: "Préparer relève masseur · cycle 2 min",  from: 10, to: 6  },
  { icon: "🗣", label: "Annoncer « on s'écarte » · arrêt MCE",   from: 5,  to: 2  },
  { icon: "👁", label: "Analyse ≤ 10 s · reprise MCE immédiate", from: 1,  to: 0  },
];
const stepState = (step, t) => {
  if (t > step.from) return "pending";
  if (t >= step.to)  return "active";
  return "done";
};

// Calcule les actions suggérées pour un cycle, sachant l'historique.
// Le médecin reste décideur — on n'affiche que les rappels ERC.
const suggestActions = ({ rhythm, totalShocks, lastAdreAt, elapsed, pediatric }) => {
  const adreLabel = pediatric ? "Adrénaline 0,01 mg/kg IV" : "Adrénaline 1 mg IV";
  const amio300 = pediatric ? "Amiodarone 5 mg/kg IV"   : "Amiodarone 300 mg IV";
  const amio150 = pediatric ? "Amiodarone 5 mg/kg IV"   : "Amiodarone 150 mg IV";
  const out = [];

  if (rhythm === "choquable") {
    const nextShockNum = totalShocks + 1;
    out.push({ type: "choc", label: `Choc n°${nextShockNum}` });
    if (nextShockNum === 3) {
      out.push({ type: "adre", label: adreLabel, hint: "après 3e choc" });
      out.push({ type: "amio", label: amio300, hint: "après 3e choc" });
    } else if (nextShockNum === 5) {
      out.push({ type: "adre", label: adreLabel, hint: "après 5e choc" });
      out.push({ type: "amio", label: amio150, hint: "après 5e choc" });
    } else if (nextShockNum > 5 && (lastAdreAt === null || (elapsed - lastAdreAt) >= 240 - 10)) {
      out.push({ type: "adre", label: adreLabel, hint: "cycle 4 min" });
    }
  } else if (rhythm === "non_choquable") {
    if (lastAdreAt === null) {
      out.push({ type: "adre", label: adreLabel, hint: "ASAP en non choquable" });
    } else if ((elapsed - lastAdreAt) >= 240 - 10) {
      out.push({ type: "adre", label: adreLabel, hint: "cycle 4 min" });
    }
  }
  return out;
};

// phase ∈ "rcp" (RCP en cours, attente analyse) | "analyse" (rythme à choisir) | "actions" (actions à confirmer)
const AcrTimer = ({ pediatric = false, onOpenDrug }) => {
  // Doses de référence ERC pour ce patient — affichées en permanence
  const refDoses = pediatric
    ? [
        { drug: "Adrénaline", dose: "0,01 mg/kg",        note: "IV / IO" },
        { drug: "Amiodarone", dose: "5 mg/kg",           note: "3e + 5e choc" },
      ]
    : [
        { drug: "Adrénaline", dose: "1 mg",              note: "IV / IO · q4 min" },
        { drug: "Amiodarone", dose: "300 mg → 150 mg",   note: "3e puis 5e choc" },
      ];

  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState("rcp");
  const [cycle, setCycle] = useState(1);
  const [currentRhythm, setCurrentRhythm] = useState(null);  // "choquable" | "non_choquable" | null
  const [pendingActions, setPendingActions] = useState([]);  // [{type, label, hint?, done}]
  const [history, setHistory] = useState([]);                 // [{cycle, t, rhythm, actions:[]}]
  const [shocks, setShocks] = useState(0);
  const [adres, setAdres] = useState(0);
  const [amios, setAmios] = useState(0);
  const [lastAdreAt, setLastAdreAt] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [coachMode, setCoachMode] = useState(readCoach);
  // Dérivés alignés sur la table : seul "voix" distingue full ↔ visual
  const audioOn  = coachMode !== "silent"; // bips + métronome
  const visualOn = coachMode !== "silent"; // zoom DSA + flashs
  const voiceOn  = coachMode === "full";   // annonces TTS françaises
  useEffect(() => {
    try { localStorage.setItem(COACH_LS_KEY, coachMode); } catch {}
  }, [coachMode]);
  const [showHistory, setShowHistory] = useState(false);
  const [metroOn, setMetroOn]   = useState(false);
  const [metroBpm, setMetroBpm] = useState(110); // ERC : 100-120 / min, défaut au milieu
  const [editingTally, setEditingTally] = useState(false);

  const startedAtRef = useRef(null);
  const elapsedRef   = useRef(0);
  const lastAnalyseAlertRef = useRef(-1);
  const lastAdreAlertRef    = useRef(-1);

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

  // Métronome MCE — indépendant du chrono pour pouvoir s'entraîner sans démarrer la session
  useEffect(() => {
    if (!metroOn || !audioOn) return;
    const periodMs = Math.round(60000 / metroBpm);
    metroTick(); // premier tick immédiat
    const id = setInterval(metroTick, periodMs);
    return () => clearInterval(id);
  }, [metroOn, metroBpm, audioOn]);

  // Compteurs de cycle (rappels temporels)
  const analyseIdx    = Math.floor(elapsed / CYCLE_ANALYSE_S);
  const nextAnalyseIn = CYCLE_ANALYSE_S - (elapsed - analyseIdx * CYCLE_ANALYSE_S);
  const adreIdx       = lastAdreAt === null ? -1 : Math.floor((elapsed - lastAdreAt) / CYCLE_ADRE_S);
  const nextAdreIn    = lastAdreAt === null ? null : CYCLE_ADRE_S - ((elapsed - lastAdreAt) - adreIdx * CYCLE_ADRE_S);

  // Bips au passage de cycle
  useEffect(() => {
    if (!running) return;
    // analyseIdx >= 1 : ne déclencher qu'au VRAI 1er passage de cycle (elapsed >= 120s).
    // Sans ce garde, à elapsed=1s la condition (0 > -1) flippait phase en "analyse"
    // immédiatement après Démarrer → le zoom T-15s ne s'affichait jamais.
    if (analyseIdx >= 1 && analyseIdx > lastAnalyseAlertRef.current) {
      lastAnalyseAlertRef.current = analyseIdx;
      if (audioOn) {
        beep(660, 180);
        setTimeout(() => beep(660, 180), 280);
      }
      if (voiceOn) speak("Analyser le rythme");
      // Auto bascule en phase "analyse" si on est en RCP — laisse le médecin reprendre la main
      setPhase(prev => prev === "rcp" ? "analyse" : prev);
    }
    if (lastAdreAt !== null && adreIdx > lastAdreAlertRef.current && adreIdx >= 1) {
      lastAdreAlertRef.current = adreIdx;
      if (audioOn) beep(880, 220);
      if (voiceOn) speak("Prochaine adrénaline");
    }
  }, [elapsed, running, audioOn, voiceOn, analyseIdx, adreIdx, lastAdreAt]);

  // Compte à rebours préparation DSA — bips/vibration discrets de T-5 à T-1
  const lastZoomCueRef = useRef(-1);
  useEffect(() => {
    if (!running || !visualOn || phase !== "rcp") {
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

  // Annonces vocales préparation DSA — une seule fois par cycle d'analyse
  const voicedRef = useRef({ t15: -1, t5: -1 });
  useEffect(() => {
    if (!running || !voiceOn || phase !== "rcp") return;
    if (nextAnalyseIn === 15 && voicedRef.current.t15 !== analyseIdx) {
      voicedRef.current.t15 = analyseIdx;
      speak("Préparation analyse. Charger le défibrillateur sans arrêter le massage.");
    }
    if (nextAnalyseIn === 5 && voicedRef.current.t5 !== analyseIdx) {
      voicedRef.current.t5 = analyseIdx;
      speak("On s'écarte");
    }
  }, [nextAnalyseIn, running, voiceOn, phase, analyseIdx]);

  const onRhythm = (rhythm) => {
    setCurrentRhythm(rhythm);
    const sugg = suggestActions({ rhythm, totalShocks: shocks, lastAdreAt, elapsed, pediatric });
    setPendingActions(sugg.map(a => ({ ...a, done: false })));
    setPhase("actions");
  };

  const toggleAction = (idx) => {
    setPendingActions(prev => prev.map((a, i) => {
      if (i !== idx) return a;
      const nextDone = !a.done;
      if (nextDone) {
        // Cocher : incrémente et mémorise l'ancien lastAdreAt pour pouvoir l'annuler proprement
        if (a.type === "choc") setShocks(s => s + 1);
        if (a.type === "adre") {
          setAdres(c => c + 1);
          setLastAdreAt(elapsed);
        }
        if (a.type === "amio") setAmios(c => c + 1);
        return { ...a, done: true, prevLastAdreAt: lastAdreAt };
      } else {
        // Décocher : annule l'incrément et restaure l'état d'avant le clic
        if (a.type === "choc") setShocks(s => Math.max(0, s - 1));
        if (a.type === "adre") {
          setAdres(c => Math.max(0, c - 1));
          setLastAdreAt(a.prevLastAdreAt ?? null);
        }
        if (a.type === "amio") setAmios(c => Math.max(0, c - 1));
        return { ...a, done: false };
      }
    }));
  };

  const finishCycle = () => {
    const doneActions = pendingActions.filter(a => a.done).map(a => a.label);
    setHistory(h => [
      ...h,
      { cycle, t: elapsed, rhythm: currentRhythm, actions: doneActions },
    ]);
    setCycle(c => c + 1);
    setCurrentRhythm(null);
    setPendingActions([]);
    setPhase("rcp");
  };

  const skipToAnalyse = () => setPhase("analyse");

  const reset = () => {
    if (!window.confirm("Réinitialiser le chrono ACR (cycle, historique, compteurs) ?")) return;
    setRunning(false);
    setElapsed(0);
    elapsedRef.current = 0;
    setPhase("rcp");
    setCycle(1);
    setCurrentRhythm(null);
    setPendingActions([]);
    setHistory([]);
    setShowSummary(false);
    setShocks(0);
    setAdres(0);
    setAmios(0);
    setLastAdreAt(null);
    lastAnalyseAlertRef.current = -1;
    lastAdreAlertRef.current = -1;
  };

  const analyseAlert = running && phase === "rcp" && nextAnalyseIn <= 10;
  const adreAlert    = running && nextAdreIn !== null && nextAdreIn <= 10;
  const showZoom     = running && phase === "rcp" && elapsed > 0 && visualOn
                       && nextAnalyseIn <= 15 && nextAnalyseIn >= 0;

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
          <span className="acr-coach-icon" aria-hidden="true">{COACH_ICON[coachMode]}</span>
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
            {lastAdreAt === null
              ? <span className="acr-cycle-none">après 1re dose</span>
              : (running ? fmt(nextAdreIn) : "—")}
          </div>
          <div className="acr-cycle-sub">cycle 4 min</div>
        </div>
      </div>

      {/* Doses de référence ERC */}
      <div className="acr-doses">
        <div className="acr-doses-label">Doses {pediatric ? "Enfant" : "Adulte"}</div>
        <div className="acr-doses-pills">
          {refDoses.map((d, i) => (
            <button
              key={i}
              type="button"
              className="acr-dose-pill"
              onClick={() => onOpenDrug && onOpenDrug(d.drug)}
              disabled={!onOpenDrug}
              title={onOpenDrug ? `Voir la fiche ${d.drug}` : d.drug}
            >
              <span className="acr-dose-pill-name">{d.drug}</span>
              <span className="acr-dose-pill-dose">{d.dose}</span>
              <span className="acr-dose-pill-note">{d.note}</span>
              {onOpenDrug && <span className="acr-dose-pill-arrow" aria-hidden="true">↗</span>}
            </button>
          ))}
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
            setMetroOn(o => !o);
          }}
          aria-pressed={metroOn}
          aria-label={metroOn ? "Arrêter le métronome MCE" : "Démarrer le métronome MCE"}
        >
          <span className="acr-metro-icon" aria-hidden="true">{metroOn ? "■" : "▶"}</span>
          <span className="acr-metro-label">Métronome MCE</span>
        </button>
        <div className="acr-metro-bpm" role="radiogroup" aria-label="Cadence">
          {BPM_OPTIONS.map(b => (
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
              Prochaine analyse rythme dans <strong>{fmt(nextAnalyseIn)}</strong>.
              Le médecin annonce le rythme à l'arrêt du MCE.
            </div>
            <button type="button" className="acr-step-link" onClick={skipToAnalyse}>
              Analyser maintenant ↗
            </button>
          </div>
        )}

        {running && phase === "analyse" && (
          <div className="acr-step-analyse">
            <div className="acr-step-title acr-step-title-alert">Analyser le rythme</div>
            <div className="acr-step-text">
              Stop MCE 5 sec, lecture du tracé. Quel rythme ?
            </div>
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
                  const drugName = a.type === "adre" ? "Adrénaline" : a.type === "amio" ? "Amiodarone" : null;
                  const canLink = drugName && typeof onOpenDrug === "function";
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
                        {canLink ? (
                          <button
                            type="button"
                            className="acr-action-label acr-action-link"
                            onClick={() => onOpenDrug(drugName)}
                            title={`Voir la fiche ${drugName}`}
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
      </div>

      {/* Boutons généraux */}
      <div className="acr-timer-controls">
        {!running ? (
          <button type="button" className="acr-btn acr-btn-start" onClick={() => setRunning(true)}>
            ▶ {elapsed === 0 ? "Démarrer" : "Reprendre"}
          </button>
        ) : (
          <button type="button" className="acr-btn acr-btn-pause" onClick={() => setRunning(false)}>
            ⏸ Pause
          </button>
        )}
        <button
          type="button"
          className="acr-btn acr-btn-bilan"
          onClick={() => setShowSummary(true)}
          disabled={elapsed === 0 && shocks === 0 && adres === 0 && amios === 0 && history.length === 0}
        >
          📋 Bilan
        </button>
        <button
          type="button"
          className="acr-btn acr-btn-reset"
          onClick={reset}
          disabled={elapsed === 0 && shocks === 0 && adres === 0 && amios === 0 && history.length === 0}
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
          cycle={cycle}
          onClose={() => setShowSummary(false)}
        />
      )}

      {/* Tally rapide / éditable (préset à l'arrivée si déjà choqué par le DSA) */}
      <div className={`acr-tally ${editingTally ? "acr-tally-editing" : ""}`}>
        {!editingTally ? (
          <>
            <span><strong>{shocks}</strong> choc{shocks > 1 ? "s" : ""}</span>
            <span className="acr-tally-sep">·</span>
            <span><strong>{adres}</strong> adré</span>
            <span className="acr-tally-sep">·</span>
            <span><strong>{amios}</strong> cordarone</span>
            <span className="acr-tally-sep">·</span>
            <span><strong>{history.length}</strong> cycle{history.length > 1 ? "s" : ""}</span>
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
                  onClick={() => setShocks(s => Math.max(0, s - 1))}
                  aria-label="Moins un choc"
                  disabled={shocks === 0}
                >−</button>
                <span className="acr-tally-num">{shocks}</span>
                <button
                  type="button"
                  onClick={() => setShocks(s => s + 1)}
                  aria-label="Plus un choc"
                >+</button>
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
                  }}
                  aria-label="Moins une adrénaline"
                  disabled={adres === 0}
                >−</button>
                <span className="acr-tally-num">{adres}</span>
                <button
                  type="button"
                  onClick={() => {
                    setAdres(a => a + 1);
                    // On considère la dose ajoutée comme « venant juste d'être donnée » :
                    // ça relance correctement le timer 4 min.
                    setLastAdreAt(elapsed);
                  }}
                  aria-label="Plus une adrénaline"
                >+</button>
              </div>
            </div>
            <div className="acr-tally-edit-row">
              <span className="acr-tally-edit-label">Cordarone déjà donnée</span>
              <div className="acr-tally-stepper">
                <button
                  type="button"
                  onClick={() => setAmios(a => Math.max(0, a - 1))}
                  aria-label="Moins une cordarone"
                  disabled={amios === 0}
                >−</button>
                <span className="acr-tally-num">{amios}</span>
                <button
                  type="button"
                  onClick={() => setAmios(a => a + 1)}
                  aria-label="Plus une cordarone"
                >+</button>
              </div>
            </div>
            <div className="acr-tally-edit-hint">
              À l'arrivée, ajuste les chocs déjà délivrés par le DSA et toute adré déjà reçue.
              Le prochain choc sera proposé en cohérence (ex : si chocs = 2, le suivant est le 3e → suggestion Amio 300 mg).
            </div>
            <button
              type="button"
              className="acr-tally-done"
              onClick={() => setEditingTally(false)}
            >
              Terminé
            </button>
          </div>
        )}
      </div>

      {/* Overlay « zoom préparation DSA » — checklist ACLS High-Performance CPR */}
      {showZoom && (
        <div className="acr-zoom" role="alert" aria-live="assertive" aria-label="Préparation analyse DSA">
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
                  <span className="acr-zoom-step-icon" aria-hidden="true">{step.icon}</span>
                  <span className="acr-zoom-step-label">{step.label}</span>
                  {state === "done"   && <span className="acr-zoom-step-mark" aria-hidden="true">✓</span>}
                  {state === "active" && <span className="acr-zoom-step-dot"  aria-hidden="true" />}
                </li>
              );
            })}
          </ul>
          <div className="acr-zoom-foot">
            ACLS · High-Performance CPR · <em>Charging during compressions</em>
          </div>
        </div>
      )}

      {/* Historique */}
      {history.length > 0 && (
        <div className="acr-history">
          <button
            type="button"
            className="acr-history-toggle"
            onClick={() => setShowHistory(s => !s)}
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

// ─────────────────────────────────────────────────────────
// Bilan de fin de séance — récap copiable pour transmission
// ─────────────────────────────────────────────────────────
const AcrSummary = ({ pediatric, elapsed, shocks, adres, amios, history, cycle, onClose }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const lines = [];
  lines.push(`BILAN ACR — ${pediatric ? "Enfant" : "Adulte"}`);
  lines.push(`Durée totale : ${fmt(elapsed)}`);
  lines.push(`Cycles clos  : ${history.length} (cycle en cours : ${cycle})`);
  lines.push(`Chocs        : ${shocks}`);
  lines.push(`Adrénaline   : ${adres} ${pediatric ? "× 0,01 mg/kg" : "× 1 mg"}`);
  lines.push(`Cordarone    : ${amios} ${pediatric ? "× 5 mg/kg" : "(300 puis 150 mg)"}`);
  if (history.length > 0) {
    lines.push("");
    lines.push("Cycles :");
    history.forEach((h) => {
      const r = h.rhythm === "choquable" ? "Choquable" : "Non choquable";
      const acts = h.actions.length ? h.actions.join(", ") : "—";
      lines.push(`  C${h.cycle} (${fmt(h.t)}) ${r} → ${acts}`);
    });
  }
  const summaryText = lines.join("\n");

  const onCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(summaryText);
      } else {
        const ta = document.createElement("textarea");
        ta.value = summaryText;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="acr-summary-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="acr-summary-modal" onClick={(e) => e.stopPropagation()}>
        <header className="acr-summary-header">
          <h3>📋 Bilan ACR — {pediatric ? "Enfant" : "Adulte"}</h3>
          <button type="button" className="acr-summary-close" onClick={onClose} aria-label="Fermer">×</button>
        </header>

        <div className="acr-summary-body">
          <div className="acr-summary-stats">
            <div className="acr-summary-stat">
              <span className="acr-summary-stat-num">{fmt(elapsed)}</span>
              <span className="acr-summary-stat-label">Durée</span>
            </div>
            <div className="acr-summary-stat">
              <span className="acr-summary-stat-num">{shocks}</span>
              <span className="acr-summary-stat-label">Choc{shocks > 1 ? "s" : ""}</span>
            </div>
            <div className="acr-summary-stat">
              <span className="acr-summary-stat-num">{adres}</span>
              <span className="acr-summary-stat-label">Adré</span>
            </div>
            <div className="acr-summary-stat">
              <span className="acr-summary-stat-num">{amios}</span>
              <span className="acr-summary-stat-label">Cordarone</span>
            </div>
            <div className="acr-summary-stat">
              <span className="acr-summary-stat-num">{history.length}</span>
              <span className="acr-summary-stat-label">Cycles</span>
            </div>
          </div>

          {history.length > 0 && (
            <div className="acr-summary-cycles">
              <div className="acr-summary-section-title">Détail des cycles</div>
              <ul className="acr-summary-cycle-list">
                {history.map((h) => (
                  <li key={h.cycle} className="acr-summary-cycle">
                    <span className="acr-summary-cycle-num">C{h.cycle}</span>
                    <span className="acr-summary-cycle-time">{fmt(h.t)}</span>
                    <span className={`acr-summary-cycle-rhythm acr-summary-cycle-rhythm-${h.rhythm}`}>
                      {h.rhythm === "choquable" ? "Choquable" : "Non choquable"}
                    </span>
                    <span className="acr-summary-cycle-actions">
                      {h.actions.length === 0 ? "—" : h.actions.join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="acr-summary-text-block">
            <div className="acr-summary-section-title">Pour transmission</div>
            <pre className="acr-summary-text">{summaryText}</pre>
          </div>
        </div>

        <footer className="acr-summary-footer">
          <button type="button" className="acr-summary-copy" onClick={onCopy}>
            {copied ? "✓ Copié" : "Copier le bilan"}
          </button>
          <button type="button" className="acr-summary-done" onClick={onClose}>
            Fermer
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AcrTimer;
