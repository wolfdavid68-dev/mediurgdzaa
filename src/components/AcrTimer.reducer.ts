// Reducer pour la session ACR. Consolide tous les états cliniques (phase,
// cycle, rythme, actions cochées, history, compteurs choc/adré/amio, events
// horodatés) en une seule source de vérité.
//
// Bénéfice principal : reset() devient `dispatch({type:'RESET'})` au lieu de
// 12+ setters d'affilée. Et chaque transition (PICK_RHYTHM, FINISH_CYCLE,
// AUTO_ADVANCE…) est testable isolément en tant que fonction pure.
//
// Hors reducer (gérés en useState séparés dans AcrTimer.tsx) :
//   - elapsed (vit dans useAcrChrono)
//   - États UI : showSummary, coachMode, showHistory, metroOn, metroBpm,
//     editingTally, prepDrug, htChecked/htExpanded/htDetail
//   Ces états ne forment pas une machine d'état avec le reste.

import { suggestActions } from "./AcrTimer.helpers";

// Types internes au reducer. Ré-exporter si un sous-composant en a besoin.
type Phase = "rcp" | "analyse" | "actions" | "post-rosc";
type Rhythm = "choquable" | "non_choquable" | "rosc" | null;

type ActionItem = {
  type: string;
  label: string;
  done: boolean;
  hint?: string;
  prevLastAdreAt?: number | null;
  eventId?: string | null;
};

type HistoryEntry = {
  cycle: number;
  t: number;
  rhythm: Rhythm;
  actions: string[];
};

type EventEntry = {
  id: string;
  type: string;
  label: string;
  t: number;
  at: number;
};

export type SessionState = {
  running: boolean;
  phase: Phase;
  cycle: number;
  cycleStartedAt: number;
  currentRhythm: Rhythm;
  pendingActions: ActionItem[];
  history: HistoryEntry[];
  shocks: number;
  adres: number;
  amios: number;
  lastAdreAt: number | null;
  events: EventEntry[];
};

export const initialSessionState: SessionState = {
  running: false,
  phase: "rcp",
  cycle: 1,
  cycleStartedAt: 0,
  currentRhythm: null,
  pendingActions: [],
  history: [],
  shocks: 0,
  adres: 0,
  amios: 0,
  lastAdreAt: null,
  events: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Génération d'IDs déterministes-ish pour les events. Math.random est suffisant
// puisque les IDs ne servent qu'à retrouver l'event dans la liste pour le
// remove (clic décocher). Pas besoin de cryptographie.
const nextEventId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const addEvent = (
  state: SessionState,
  type: string,
  label: string,
  elapsed: number
): { state: SessionState; id: string } => {
  const id = nextEventId();
  return {
    state: { ...state, events: [...state.events, { id, type, label, t: elapsed, at: Date.now() }] },
    id,
  };
};

const removeEvent = (state: SessionState, id: string): SessionState => ({
  ...state,
  events: state.events.filter((e) => e.id !== id),
});

const removeLastEventOfType = (state: SessionState, type: string): SessionState => {
  for (let i = state.events.length - 1; i >= 0; i--) {
    if (state.events[i].type === type) {
      return { ...state, events: [...state.events.slice(0, i), ...state.events.slice(i + 1)] };
    }
  }
  return state;
};

// ─────────────────────────────────────────────────────────────────────────────
export type SessionAction =
  | { type: "START"; elapsed: number }
  | { type: "PAUSE"; elapsed: number }
  | {
      type: "PICK_RHYTHM";
      rhythm: "choquable" | "non_choquable";
      elapsed: number;
      pediatric: boolean;
      protocol: string;
    }
  | { type: "ROSC"; elapsed: number }
  | { type: "RE_ACR"; elapsed: number }
  | { type: "AUTO_ADVANCE"; elapsed: number }
  | { type: "SKIP_TO_ANALYSE" }
  | { type: "TOGGLE_ACTION"; idx: number; elapsed: number }
  | { type: "FINISH_CYCLE"; elapsed: number }
  | {
      type: "ADJUST_TALLY";
      kind: "choc" | "adre" | "amio";
      delta: 1 | -1;
      elapsed: number;
      pediatric: boolean;
    }
  | { type: "RESET" };

export const sessionReducer = (state: SessionState, action: SessionAction): SessionState => {
  switch (action.type) {
    case "START": {
      // 1er démarrage (pas une reprise) : prompt analyse rythme initial.
      const isFirstStart = state.cycleStartedAt === 0 && state.phase === "rcp" && !state.running;
      const next = {
        ...state,
        running: true,
        phase: isFirstStart ? ("analyse" as Phase) : state.phase,
      };
      const label = isFirstStart ? "Début ACR" : "Reprise";
      const evType = isFirstStart ? "start" : "resume";
      return addEvent(next, evType, label, action.elapsed).state;
    }

    case "PAUSE": {
      const next = { ...state, running: false };
      return addEvent(next, "pause", "Pause", action.elapsed).state;
    }

    case "PICK_RHYTHM": {
      const sugg = suggestActions({
        rhythm: action.rhythm,
        totalShocks: state.shocks,
        lastAdreAt: state.lastAdreAt,
        elapsed: action.elapsed,
        pediatric: action.pediatric,
        protocol: action.protocol,
      });
      return {
        ...state,
        currentRhythm: action.rhythm,
        pendingActions: sugg.map((a: any) => ({ ...a, done: false })),
        phase: "actions",
        // Le MCE reprend pile maintenant → le chrono 2 min de RCP du nouveau
        // cycle démarre ici (et non au moment de l'analyse précédente).
        cycleStartedAt: action.elapsed,
      };
    }

    case "ROSC": {
      const next: SessionState = {
        ...state,
        history: [
          ...state.history,
          { cycle: state.cycle, t: action.elapsed, rhythm: "rosc", actions: ["ROSC obtenu"] },
        ],
        currentRhythm: "rosc",
        pendingActions: [],
        phase: "post-rosc",
      };
      return addEvent(next, "rosc", "ROSC obtenu · post-réa", action.elapsed).state;
    }

    case "RE_ACR": {
      const next: SessionState = {
        ...state,
        cycle: state.cycle + 1,
        currentRhythm: null,
        pendingActions: [],
        phase: "analyse",
        cycleStartedAt: action.elapsed,
      };
      return addEvent(next, "reacr", "Re-arrêt — relance cycle", action.elapsed).state;
    }

    case "AUTO_ADVANCE": {
      // Atteint à 2 min de RCP. Si on était en "actions", on archive le cycle
      // avec les actions cochées avant de basculer.
      if (state.phase === "actions") {
        const doneActions = state.pendingActions.filter((a) => a.done).map((a) => a.label);
        return {
          ...state,
          history: [
            ...state.history,
            {
              cycle: state.cycle,
              t: action.elapsed,
              rhythm: state.currentRhythm,
              actions: doneActions,
            },
          ],
          cycle: state.cycle + 1,
          currentRhythm: null,
          pendingActions: [],
          phase: "analyse",
        };
      }
      return { ...state, phase: "analyse" };
    }

    case "SKIP_TO_ANALYSE":
      return { ...state, phase: "analyse" };

    case "TOGGLE_ACTION": {
      const a = state.pendingActions[action.idx];
      if (!a) return state;
      const nextDone = !a.done;
      let next = { ...state };
      let newAction: ActionItem;

      if (nextDone) {
        // Cocher : incrémente, horodate, mémorise prevLastAdreAt pour pouvoir annuler
        let evId: string | null = null;
        if (a.type === "choc" || a.type === "adre" || a.type === "amio") {
          const r = addEvent(next, a.type, a.label, action.elapsed);
          next = r.state;
          evId = r.id;
        }
        if (a.type === "choc") next = { ...next, shocks: next.shocks + 1 };
        if (a.type === "adre") {
          next = { ...next, adres: next.adres + 1, lastAdreAt: action.elapsed };
        }
        if (a.type === "amio") next = { ...next, amios: next.amios + 1 };
        newAction = { ...a, done: true, prevLastAdreAt: state.lastAdreAt, eventId: evId };
      } else {
        // Décocher : annule l'incrément, retire l'event, restaure l'état d'avant le clic
        if (a.eventId) next = removeEvent(next, a.eventId);
        if (a.type === "choc") next = { ...next, shocks: Math.max(0, next.shocks - 1) };
        if (a.type === "adre") {
          next = {
            ...next,
            adres: Math.max(0, next.adres - 1),
            lastAdreAt: a.prevLastAdreAt ?? null,
          };
        }
        if (a.type === "amio") next = { ...next, amios: Math.max(0, next.amios - 1) };
        newAction = { ...a, done: false };
      }

      const nextActions = [...next.pendingActions];
      nextActions[action.idx] = newAction;
      return { ...next, pendingActions: nextActions };
    }

    case "FINISH_CYCLE": {
      // Bouton manuel « Cycle suivant maintenant ». Aligné sur AUTO_ADVANCE :
      // archive + cycle++ + phase=analyse. cycleStartedAt sera mis à jour au
      // prochain PICK_RHYTHM (= reprise MCE).
      const doneActions = state.pendingActions.filter((a) => a.done).map((a) => a.label);
      return {
        ...state,
        history: [
          ...state.history,
          {
            cycle: state.cycle,
            t: action.elapsed,
            rhythm: state.currentRhythm,
            actions: doneActions,
          },
        ],
        cycle: state.cycle + 1,
        currentRhythm: null,
        pendingActions: [],
        phase: "analyse",
      };
    }

    case "ADJUST_TALLY": {
      const { kind, delta, elapsed, pediatric } = action;
      if (delta === 1) {
        if (kind === "choc") {
          return addEvent(
            { ...state, shocks: state.shocks + 1 },
            "choc",
            "Choc (DSA / manuel)",
            elapsed
          ).state;
        }
        if (kind === "adre") {
          // « Venant juste d'être donnée » → relance correctement le timer 4 min.
          return addEvent(
            { ...state, adres: state.adres + 1, lastAdreAt: elapsed },
            "adre",
            pediatric ? "Adrénaline 0,01 mg/kg" : "Adrénaline 1 mg",
            elapsed
          ).state;
        }
        // amio
        // Adulte ERC/ACLS : 1re dose = 300 mg (3e choc), 2e = 150 mg (5e choc).
        const label = pediatric
          ? "Amiodarone 5 mg/kg"
          : state.amios === 0
            ? "Amiodarone 300 mg"
            : "Amiodarone 150 mg";
        return addEvent({ ...state, amios: state.amios + 1 }, "amio", label, elapsed).state;
      }
      // delta === -1
      if (kind === "choc") {
        if (state.shocks === 0) return state;
        return removeLastEventOfType({ ...state, shocks: state.shocks - 1 }, "choc");
      }
      if (kind === "adre") {
        if (state.adres === 0) return state;
        const next = state.adres - 1;
        const interim: SessionState = {
          ...state,
          adres: next,
          lastAdreAt: next === 0 ? null : state.lastAdreAt,
        };
        return removeLastEventOfType(interim, "adre");
      }
      // amio
      if (state.amios === 0) return state;
      return removeLastEventOfType({ ...state, amios: state.amios - 1 }, "amio");
    }

    case "RESET":
      return initialSessionState;

    default:
      return state;
  }
};
