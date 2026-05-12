// Fonctions pures et utilitaires pour AcrTimer. Aucune dépendance React.
// Testable isolément (cf. AcrTimer.helpers.test.js).

import { COACH_LS_KEY } from "./AcrTimer.constants";

// Formate un nombre de secondes en MM:SS (≥ 0).
export const fmt = (s) => {
  if (s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

// Heure murale (téléphone) — format HH:MM:SS 24h FR pour transmission.
export const fmtWall = (ts) => {
  try {
    return new Date(ts).toLocaleTimeString("fr-FR", { hour12: false });
  } catch {
    return "—";
  }
};

// Singleton AudioContext — créé/réveillé lors d'un geste utilisateur,
// réutilisé pour tous les sons (sinon iOS/Chrome bloquent les contextes hors-geste).
let _audioCtx = null;
export const ensureAudio = () => {
  try {
    if (!_audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      _audioCtx = new Ctx();
    }
    if (_audioCtx.state === "suspended") {
      _audioCtx.resume().catch(() => {});
    }
    return _audioCtx;
  } catch {
    return null;
  }
};

export const beep = (freq = 880, ms = 220, gainVal = 0.18, type = "sine") => {
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
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur);
  } catch {}
};

// Tick métronome court et sec (clic plutôt que bip)
export const metroTick = () => beep(1600, 35, 0.25, "square");

// Synthèse vocale FR (Web Speech API). Indépendant du Web Audio.
// Sur iOS/Android, le 1er appel doit suivre un geste utilisateur — la bascule
// vers "full" via le picto coach déclenche un warm-up speak("Coach activé").
export const speak = (text) => {
  try {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    u.rate = 1.05;
    u.pitch = 1.0;
    u.volume = 1.0;
    synth.cancel();
    synth.speak(u);
  } catch {}
};

// Lecture du mode coach persisté en localStorage (default = "full")
export const readCoach = () => {
  try {
    const v = localStorage.getItem(COACH_LS_KEY);
    if (v === "full" || v === "visual" || v === "silent") return v;
  } catch {}
  return "full";
};

// État d'une étape de prep DSA (pending / active / done) selon le compte à rebours
export const stepState = (step, t) => {
  if (t > step.from) return "pending";
  if (t >= step.to) return "active";
  return "done";
};

// Calcule les actions suggérées pour un cycle, sachant l'historique.
// Le médecin reste décideur — on n'affiche que les rappels protocolaires.
// ERC : Adré + Amio après 3e CEE.
// ACLS : Adré dès le 2e CEE (q3-5 min), Amio 300 après 3e CEE, 150 après 5e.
export const suggestActions = ({
  rhythm,
  totalShocks,
  lastAdreAt,
  elapsed,
  pediatric,
  protocol = "erc",
}) => {
  const adreLabel = pediatric ? "Adrénaline 0,01 mg/kg IV" : "Adrénaline 1 mg IV";
  const amio300 = pediatric ? "Amiodarone 5 mg/kg IV" : "Amiodarone 300 mg IV";
  const amio150 = pediatric ? "Amiodarone 5 mg/kg IV" : "Amiodarone 150 mg IV";
  const out = [];
  const adreFirstShock = protocol === "acls" ? 2 : 3;

  if (rhythm === "choquable") {
    const nextShockNum = totalShocks + 1;
    out.push({ type: "choc", label: `Choc n°${nextShockNum}` });
    if (nextShockNum === adreFirstShock && lastAdreAt === null) {
      out.push({
        type: "adre",
        label: adreLabel,
        hint: `1re dose · ${protocol === "acls" ? "après 2e" : "après 3e"} choc`,
      });
    }
    if (nextShockNum === 3) {
      out.push({ type: "amio", label: amio300, hint: "après 3e choc" });
    } else if (nextShockNum === 5) {
      out.push({ type: "amio", label: amio150, hint: "après 5e choc" });
    }
    if (lastAdreAt !== null && elapsed - lastAdreAt >= 240 - 10) {
      out.push({ type: "adre", label: adreLabel, hint: "cycle 4 min" });
    }
    // ACLS Focused Update 2024 : FV/TV réfractaire après 3 chocs → changement
    // de position des palettes (antéro-postérieur) ou DSED. DOSE-VF trial.
    if (protocol === "acls" && totalShocks >= 3) {
      out.push({
        type: "tech",
        label: "Changer position palettes (antéro-postérieur)",
        hint: "FV/TV réfractaire — ACLS 2024 · ou DSED si dispo",
      });
    }
  } else if (rhythm === "non_choquable") {
    if (lastAdreAt === null) {
      out.push({ type: "adre", label: adreLabel, hint: "ASAP en non choquable" });
    } else if (elapsed - lastAdreAt >= 240 - 10) {
      out.push({ type: "adre", label: adreLabel, hint: "cycle 4 min" });
    }
  }
  return out;
};
