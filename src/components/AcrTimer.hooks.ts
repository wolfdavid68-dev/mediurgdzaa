// Hooks extraits d'AcrTimer pour rendre la machine d'état lisible.
// Chaque hook gère une préoccupation isolée :
//   - useAcrChrono : tick wall-clock (elapsed en secondes)
//   - useAcrMetronome : bips MCE 100-120/min indépendants du chrono
//   - useAcrAutoAdvance : auto-passage à l'analyse à 2 min de RCP + alerte adré 4 min
//   - useAcrAnalysisCue : bips/vibration de préparation DSA (T-5 à T-1)
//   - useAcrAnalysisVoice : annonces vocales préparation (T-15, T-5)

import { useEffect, useRef, useState } from "react";
import { CYCLE_ANALYSE_S } from "./AcrTimer.constants";
import { beep, metroTick, speak } from "./AcrTimer.helpers";

// ─────────────────────────────────────────────────────────────────────────────
// Chrono wall-clock — source de vérité pour `elapsed` (secondes depuis démarrage).
// elapsedRef est exposé pour les call-sites qui ne peuvent pas attendre le
// re-render React (ex : addEvent appelé dans le handler de toggleAction).
export const useAcrChrono = (running: boolean) => {
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    startedAtRef.current = Date.now() - elapsedRef.current * 1000;
    const id = setInterval(() => {
      const e = Math.floor((Date.now() - (startedAtRef.current ?? Date.now())) / 1000);
      elapsedRef.current = e;
      setElapsed(e);
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  // Encapsule la remise à zéro pour que les call-sites n'aient pas à muter
  // elapsedRef.current eux-mêmes (React Compiler n'aime pas les mutations
  // de refs lus dans le JSX, et c'est plus propre).
  const setElapsedSeconds = (nextElapsed: number) => {
    const safeElapsed = Math.max(0, Math.floor(nextElapsed));
    elapsedRef.current = safeElapsed;
    startedAtRef.current = Date.now() - safeElapsed * 1000;
    setElapsed(safeElapsed);
  };

  const resetChrono = () => {
    setElapsedSeconds(0);
  };

  return { elapsed, elapsedRef, setElapsedSeconds, resetChrono };
};

// ─────────────────────────────────────────────────────────────────────────────
// Métronome MCE — indépendant du chrono pour pouvoir s'entraîner sans démarrer
// la session. Période = 60_000 / bpm ms ; premier tick immédiat puis interval.
export const useAcrMetronome = (on: boolean, audioOn: boolean, bpm: number) => {
  useEffect(() => {
    if (!on || !audioOn) return;
    const periodMs = Math.round(60000 / bpm);
    metroTick();
    const id = setInterval(metroTick, periodMs);
    return () => clearInterval(id);
  }, [on, bpm, audioOn]);
};

// ─────────────────────────────────────────────────────────────────────────────
// Auto-passage à l'analyse à 2 min de RCP + rappel adrénaline (4 min).
// À 2 min RCP : alerte sonore/voix ET passe automatiquement en phase analyse.
// Si on arrive depuis "actions" (= RCP avec checklist), on archive le cycle
// avant de basculer pour ne pas perdre les actions cochées.

type AutoAdvanceArgs = {
  running: boolean;
  phase: string;
  audioOn: boolean;
  voiceOn: boolean;
  cycleStartedAt: number;
  rcpInCycle: number;
  adreIdx: number;
  lastAdreAt: number | null;
  // Appelé quand on franchit les 2 min de RCP. Le parent décide quoi faire
  // (typiquement dispatch({type:'AUTO_ADVANCE', elapsed: elapsedRef.current})).
  onAdvance: () => void;
};

export const useAcrAutoAdvance = (args: AutoAdvanceArgs) => {
  const lastAnalyseAlertRef = useRef(-1);
  const lastAdreAlertRef = useRef(-1);
  // Capture le dernier onAdvance pour que l'effet n'ait pas besoin de
  // re-tirer à chaque render parent (le callback est recréé à chaque fois).
  const onAdvanceRef = useRef(args.onAdvance);
  onAdvanceRef.current = args.onAdvance;

  const { running, phase, audioOn, voiceOn, cycleStartedAt, rcpInCycle, adreIdx, lastAdreAt } =
    args;

  useEffect(() => {
    if (!running) return;
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
      onAdvanceRef.current();
    }
    if (lastAdreAt !== null && adreIdx > lastAdreAlertRef.current && adreIdx >= 1) {
      lastAdreAlertRef.current = adreIdx;
      if (audioOn) beep(880, 220);
      if (voiceOn) speak("Prochaine adrénaline");
    }
  }, [running, phase, audioOn, voiceOn, rcpInCycle, cycleStartedAt, adreIdx, lastAdreAt]);

  // Permet au reset() parent de remettre les compteurs à zéro
  const resetAlerts = () => {
    lastAnalyseAlertRef.current = -1;
    lastAdreAlertRef.current = -1;
  };

  return { resetAlerts };
};

// ─────────────────────────────────────────────────────────────────────────────
// Compte à rebours préparation DSA — bips/vibration discrets de T-5 à T-1.
// Une seule cue par seconde (clé = nextAnalyseIn) pour éviter le double-tick.
export const useAcrAnalysisCue = (
  running: boolean,
  visualOn: boolean,
  audioOn: boolean,
  phase: string,
  nextAnalyseIn: number
) => {
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
};

// ─────────────────────────────────────────────────────────────────────────────
// Annonces vocales préparation DSA — une seule fois par cycle (clé = cycleStartedAt).
// T-15 : "Préparation analyse. Charger le défibrillateur sans arrêter le massage."
// T-5  : "On s'écarte"
export const useAcrAnalysisVoice = (
  running: boolean,
  voiceOn: boolean,
  phase: string,
  nextAnalyseIn: number,
  cycleStartedAt: number
) => {
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
};
