export type AcrRhythm = "TV" | "FV" | "Asystolie" | "AESP" | "Sinusal + pouls" | "Autre";
export type AcrVoie = "Périphérique" | "Centrale" | "IO";
export type AcrDevenir = "Décès" | "Transfert réa" | "Retour domicile" | "Autre";

export type AcrTimedEvent = {
  id: string;
  type: string;
  label: string;
  t: number;
  at: number;
};

export type AcrCycleRecord = {
  cycle: number;
  t: number;
  wallTime?: string;
  rhythm?: string;
  actions: string[];
  choc?: string;
  drogues?: string;
  ventilation?: string;
  capno?: string;
  commentaire?: string;
};

export type AcrFullSession = {
  id: string;
  createdAt: number;
  updatedAt: number;
  pediatric: boolean;
  protocol: string;
  stats: {
    elapsed: number;
    shocks: number;
    adres: number;
    amios: number;
    cycle: number;
  };
  // Dossier anonyme : aucune donnée nominative (pas de nom/prénom/IPP).
  patient: { age?: string; sexe?: string };
  contexte: { equipe?: string; lit?: string; medecinLeader?: string; infirmierReferent?: string };
  horaires: {
    survenueAcr?: string;
    debutRcp?: string;
    premiereAnalyse?: string;
    poseVvp?: string;
    racs?: string;
  };
  initial: {
    noFlowMin?: number;
    rythmeInitial?: AcrRhythm;
    voieVvp?: AcrVoie;
    temperature?: string;
    glycemie?: string;
    capnoInitiale?: string;
  };
  cycles: AcrCycleRecord[];
  analyseDossier: {
    directivesAnticipeesContraireRcp?: boolean;
    causesH: string[];
    causesT: string[];
    ecmoRecherche?: boolean;
    inclusionEcmo?: boolean;
    nonEligibleEcmo?: boolean;
  };
  racs: {
    obtenu?: boolean;
    heure?: string;
    signesReveil: string[];
    signesReveilAutre?: string;
    monitorageComplet?: boolean;
    ecg18d?: boolean;
    sedationAmines?: boolean;
  };
  devenir: {
    destination?: AcrDevenir;
    commentaires?: string;
  };
  events: AcrTimedEvent[];
};

export type AcrTimerHistoryEntry = {
  cycle: number;
  t: number;
  rhythm: string | null;
  actions: string[];
};

export type AcrTimerSnapshot = {
  pediatric: boolean;
  protocol: string;
  elapsed: number;
  shocks: number;
  adres: number;
  amios: number;
  cycle: number;
  history: AcrTimerHistoryEntry[];
  events: AcrTimedEvent[];
};

export const ACR_RHYTHMS: AcrRhythm[] = [
  "TV",
  "FV",
  "Asystolie",
  "AESP",
  "Sinusal + pouls",
  "Autre",
];

export const ACR_H_CAUSES = [
  "Hypoxie",
  "Hypovolémie",
  "Hypo/hyperkaliémie",
  "Hypothermie",
  "H+ / acidose",
];

export const ACR_T_CAUSES = [
  "Tamponnade",
  "Toxiques",
  "Thrombose coronaire",
  "Thrombose pulmonaire",
  "Tension pneumothorax",
];

const makeId = () => `acr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const formatAcrElapsed = (seconds: number): string => {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export const formatWallTime = (ts?: number): string => {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
};

export const createEmptyAcrSession = (): AcrFullSession => ({
  id: makeId(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  pediatric: false,
  protocol: "erc",
  stats: { elapsed: 0, shocks: 0, adres: 0, amios: 0, cycle: 1 },
  patient: {},
  contexte: {},
  horaires: {},
  initial: {},
  cycles: [],
  analyseDossier: { causesH: [], causesT: [] },
  racs: { signesReveil: [] },
  devenir: {},
  events: [],
});

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

export const coerceAcrSession = (value: unknown): AcrFullSession => {
  const base = createEmptyAcrSession();
  const raw = asObject(value);
  const stats = asObject(raw.stats);
  const analyseDossier = asObject(raw.analyseDossier);
  const racs = asObject(raw.racs);

  return {
    ...base,
    ...raw,
    id: typeof raw.id === "string" ? raw.id : base.id,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : base.createdAt,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : base.updatedAt,
    pediatric: typeof raw.pediatric === "boolean" ? raw.pediatric : base.pediatric,
    protocol: typeof raw.protocol === "string" ? raw.protocol : base.protocol,
    stats: {
      elapsed: typeof stats.elapsed === "number" ? stats.elapsed : base.stats.elapsed,
      shocks: typeof stats.shocks === "number" ? stats.shocks : base.stats.shocks,
      adres: typeof stats.adres === "number" ? stats.adres : base.stats.adres,
      amios: typeof stats.amios === "number" ? stats.amios : base.stats.amios,
      cycle: typeof stats.cycle === "number" ? stats.cycle : base.stats.cycle,
    },
    // Dossier anonyme : on ne reprend que l'âge et le sexe, jamais de
    // donnée nominative — scrube aussi un éventuel ancien dossier stocké
    // qui contiendrait encore nom/prénom/IPP.
    patient: (() => {
      const p = asObject(raw.patient);
      return {
        ...(typeof p.age === "string" ? { age: p.age } : {}),
        ...(typeof p.sexe === "string" ? { sexe: p.sexe } : {}),
      };
    })(),
    contexte: { ...base.contexte, ...asObject(raw.contexte) },
    horaires: { ...base.horaires, ...asObject(raw.horaires) },
    initial: { ...base.initial, ...asObject(raw.initial) },
    cycles: Array.isArray(raw.cycles) ? (raw.cycles as AcrCycleRecord[]) : [],
    analyseDossier: {
      ...base.analyseDossier,
      ...analyseDossier,
      causesH: asStringArray(analyseDossier.causesH),
      causesT: asStringArray(analyseDossier.causesT),
    },
    racs: { ...base.racs, ...racs, signesReveil: asStringArray(racs.signesReveil) },
    devenir: { ...base.devenir, ...asObject(raw.devenir) },
    events: Array.isArray(raw.events) ? (raw.events as AcrTimedEvent[]) : [],
  };
};

const rhythmLabel = (rhythm: string | null): string => {
  if (rhythm === "choquable") return "FV / TV sans pouls";
  if (rhythm === "non_choquable") return "Asystolie / AESP";
  if (rhythm === "rosc") return "RACS";
  return "—";
};

const shockLabelFromActions = (actions: string[]): string | undefined =>
  actions.find((action) => /choc/i.test(action));

const drugLabelFromActions = (actions: string[]): string | undefined => {
  const drugs = actions.filter((action) => /adr|amio|cordarone/i.test(action));
  return drugs.length > 0 ? drugs.join(" · ") : undefined;
};

const mergeCycle = (
  previous: AcrCycleRecord | undefined,
  incoming: AcrCycleRecord
): AcrCycleRecord => ({
  ...incoming,
  ventilation: previous?.ventilation ?? incoming.ventilation,
  capno: previous?.capno ?? incoming.capno,
  commentaire: previous?.commentaire ?? incoming.commentaire,
});

const isPristineTimerSnapshot = (snapshot: AcrTimerSnapshot) =>
  snapshot.elapsed === 0 &&
  snapshot.shocks === 0 &&
  snapshot.adres === 0 &&
  snapshot.amios === 0 &&
  snapshot.history.length === 0 &&
  snapshot.events.length === 0;

const clearStaleTimerDerivedFields = (session: AcrFullSession): AcrFullSession => {
  const hasPreviousTimerTrace =
    session.events.length > 0 ||
    session.cycles.length > 0 ||
    session.stats.elapsed > 0 ||
    session.stats.shocks > 0 ||
    session.stats.adres > 0 ||
    session.stats.amios > 0;

  if (!hasPreviousTimerTrace) return session;

  const {
    debutRcp: _debutRcp,
    premiereAnalyse: _premiereAnalyse,
    racs: _racs,
    ...horaires
  } = session.horaires;

  return {
    ...session,
    horaires,
    racs: {
      ...session.racs,
      obtenu: undefined,
      heure: undefined,
    },
  };
};

export const mergeTimerSnapshotIntoSession = (
  session: AcrFullSession,
  snapshot: AcrTimerSnapshot
): AcrFullSession => {
  const sourceSession = isPristineTimerSnapshot(snapshot)
    ? clearStaleTimerDerivedFields(session)
    : session;
  const eventStart = snapshot.events.find((event) => event.type === "start");
  const eventRosc = snapshot.events.find((event) => event.type === "rosc");
  const eventFirstTherapy = snapshot.events.find((event) =>
    ["choc", "adre", "amio"].includes(event.type)
  );
  const previousByCycle = new Map(sourceSession.cycles.map((item) => [item.cycle, item]));
  const cycles = snapshot.history.map((entry) => {
    const incoming: AcrCycleRecord = {
      cycle: entry.cycle,
      t: entry.t,
      wallTime: formatWallTime(snapshot.events.find((event) => event.t === entry.t)?.at),
      rhythm: rhythmLabel(entry.rhythm),
      actions: entry.actions,
      choc: shockLabelFromActions(entry.actions),
      drogues: drugLabelFromActions(entry.actions),
    };
    return mergeCycle(previousByCycle.get(entry.cycle), incoming);
  });

  return {
    ...sourceSession,
    updatedAt: Date.now(),
    pediatric: snapshot.pediatric,
    protocol: snapshot.protocol,
    stats: {
      elapsed: snapshot.elapsed,
      shocks: snapshot.shocks,
      adres: snapshot.adres,
      amios: snapshot.amios,
      cycle: snapshot.cycle,
    },
    horaires: {
      ...sourceSession.horaires,
      debutRcp: sourceSession.horaires.debutRcp || formatWallTime(eventStart?.at),
      premiereAnalyse:
        sourceSession.horaires.premiereAnalyse || formatWallTime(eventFirstTherapy?.at),
      racs: sourceSession.horaires.racs || formatWallTime(eventRosc?.at),
    },
    racs: {
      ...sourceSession.racs,
      obtenu: sourceSession.racs.obtenu || Boolean(eventRosc),
      heure: sourceSession.racs.heure || formatWallTime(eventRosc?.at),
    },
    cycles,
    events: snapshot.events,
  };
};
