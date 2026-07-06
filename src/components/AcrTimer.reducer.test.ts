import { initialSessionState, sessionReducer, type SessionState } from "./AcrTimer.reducer";

const make = (overrides: Partial<SessionState> = {}): SessionState => ({
  ...initialSessionState,
  ...overrides,
});

describe("sessionReducer · START / PAUSE", () => {
  test("START depuis l'état initial : 1er démarrage → phase=analyse, running=true, event 'start'", () => {
    const next = sessionReducer(initialSessionState, { type: "START", elapsed: 0 });
    expect(next.running).toBe(true);
    expect(next.phase).toBe("analyse");
    expect(next.events).toHaveLength(1);
    expect(next.events[0]).toMatchObject({ type: "start", label: "Début ACR", t: 0 });
  });

  test("START après une pause : pas de bascule de phase, event 'resume'", () => {
    const paused = make({ running: false, phase: "actions", cycleStartedAt: 240, cycle: 3 });
    const next = sessionReducer(paused, { type: "START", elapsed: 250 });
    expect(next.running).toBe(true);
    expect(next.phase).toBe("actions");
    expect(next.cycle).toBe(3);
    expect(next.events[0]).toMatchObject({ type: "resume", label: "Reprise" });
  });

  test("PAUSE : running=false, event 'pause'", () => {
    const running = make({ running: true, phase: "rcp" });
    const next = sessionReducer(running, { type: "PAUSE", elapsed: 60 });
    expect(next.running).toBe(false);
    expect(next.phase).toBe("rcp"); // conservé
    expect(next.events[0]).toMatchObject({ type: "pause", label: "Pause", t: 60 });
  });
});

describe("sessionReducer · PICK_RHYTHM", () => {
  test("choquable adulte : phase=actions, suggestions calculées, cycleStartedAt=elapsed", () => {
    const start = make({ running: true, phase: "analyse", shocks: 0 });
    const next = sessionReducer(start, {
      type: "PICK_RHYTHM",
      rhythm: "choquable",
      elapsed: 30,
      pediatric: false,
      protocol: "erc",
    });
    expect(next.phase).toBe("actions");
    expect(next.currentRhythm).toBe("choquable");
    expect(next.cycleStartedAt).toBe(30);
    expect(next.pendingActions.length).toBeGreaterThan(0);
    // Toutes les actions partent décochées
    expect(next.pendingActions.every((a) => a.done === false)).toBe(true);
    // Premier choc proposé
    expect(next.pendingActions.some((a) => a.type === "choc")).toBe(true);
  });

  test("non_choquable : phase=actions, currentRhythm enregistré", () => {
    const start = make({ running: true, phase: "analyse" });
    const next = sessionReducer(start, {
      type: "PICK_RHYTHM",
      rhythm: "non_choquable",
      elapsed: 0,
      pediatric: false,
      protocol: "erc",
    });
    expect(next.phase).toBe("actions");
    expect(next.currentRhythm).toBe("non_choquable");
  });
});

describe("sessionReducer · ROSC / RE_ACR", () => {
  test("ROSC : archive history avec rythme=rosc, phase=post-rosc", () => {
    const start = make({ running: true, phase: "actions", cycle: 4, currentRhythm: "choquable" });
    const next = sessionReducer(start, { type: "ROSC", elapsed: 480 });
    expect(next.phase).toBe("post-rosc");
    expect(next.currentRhythm).toBe("rosc");
    expect(next.history).toHaveLength(1);
    expect(next.history[0]).toEqual({
      cycle: 4,
      t: 480,
      rhythm: "rosc",
      actions: ["ROSC obtenu"],
    });
    expect(next.pendingActions).toEqual([]);
    // Event horodaté
    expect(next.events[0]).toMatchObject({ type: "rosc" });
  });

  test("RE_ACR depuis post-rosc : cycle++, phase=analyse, cycleStartedAt=elapsed", () => {
    const post = make({ phase: "post-rosc", cycle: 4, currentRhythm: "rosc" });
    const next = sessionReducer(post, { type: "RE_ACR", elapsed: 600 });
    expect(next.cycle).toBe(5);
    expect(next.phase).toBe("analyse");
    expect(next.currentRhythm).toBeNull();
    expect(next.pendingActions).toEqual([]);
    expect(next.cycleStartedAt).toBe(600);
    expect(next.events[0]).toMatchObject({ type: "reacr" });
  });
});

describe("sessionReducer · AUTO_ADVANCE", () => {
  test("depuis 'rcp' : juste phase=analyse (pas d'archive)", () => {
    const start = make({ phase: "rcp", cycle: 2 });
    const next = sessionReducer(start, { type: "AUTO_ADVANCE", elapsed: 240 });
    expect(next.phase).toBe("analyse");
    expect(next.cycle).toBe(2);
    expect(next.history).toEqual([]);
  });

  test("depuis 'actions' : archive le cycle avec actions cochées + cycle++", () => {
    const actions = [
      { type: "choc", label: "Choc 200 J", done: true },
      { type: "adre", label: "Adrénaline 1 mg", done: true },
      { type: "amio", label: "Amiodarone 300 mg", done: false },
    ];
    const start = make({
      phase: "actions",
      cycle: 3,
      currentRhythm: "choquable",
      pendingActions: actions,
    });
    const next = sessionReducer(start, { type: "AUTO_ADVANCE", elapsed: 360 });
    expect(next.phase).toBe("analyse");
    expect(next.cycle).toBe(4);
    expect(next.currentRhythm).toBeNull();
    expect(next.pendingActions).toEqual([]);
    expect(next.history).toHaveLength(1);
    expect(next.history[0]).toEqual({
      cycle: 3,
      t: 360,
      rhythm: "choquable",
      actions: ["Choc 200 J", "Adrénaline 1 mg"],
    });
  });

  test("SKIP_TO_ANALYSE : juste phase=analyse, rien d'autre", () => {
    const start = make({ phase: "rcp", cycle: 2, cycleStartedAt: 100 });
    const next = sessionReducer(start, { type: "SKIP_TO_ANALYSE" });
    expect(next.phase).toBe("analyse");
    expect(next.cycle).toBe(2);
    expect(next.cycleStartedAt).toBe(100);
  });
});

describe("sessionReducer · TOGGLE_ACTION", () => {
  test("cocher choc : shocks++ et event horodaté", () => {
    const start = make({
      phase: "actions",
      pendingActions: [{ type: "choc", label: "Choc 200 J", done: false }],
      shocks: 0,
    });
    const next = sessionReducer(start, { type: "TOGGLE_ACTION", idx: 0, elapsed: 120 });
    expect(next.shocks).toBe(1);
    expect(next.pendingActions[0].done).toBe(true);
    expect(next.pendingActions[0].eventId).toBeTruthy();
    expect(next.events).toHaveLength(1);
    expect(next.events[0]).toMatchObject({ type: "choc", label: "Choc 200 J", t: 120 });
  });

  test("cocher adré : adres++, lastAdreAt=elapsed, prevLastAdreAt mémorisé", () => {
    const start = make({
      pendingActions: [{ type: "adre", label: "Adrénaline 1 mg", done: false }],
      adres: 0,
      lastAdreAt: null,
    });
    const next = sessionReducer(start, { type: "TOGGLE_ACTION", idx: 0, elapsed: 150 });
    expect(next.adres).toBe(1);
    expect(next.lastAdreAt).toBe(150);
    expect(next.pendingActions[0].prevLastAdreAt).toBeNull();
  });

  test("décocher adré : restaure prevLastAdreAt et retire l'event", () => {
    // Préparation : on coche, puis on décoche
    const start = make({
      pendingActions: [{ type: "adre", label: "Adrénaline 1 mg", done: false }],
      adres: 0,
      lastAdreAt: 60,
    });
    const cocheState = sessionReducer(start, { type: "TOGGLE_ACTION", idx: 0, elapsed: 150 });
    expect(cocheState.lastAdreAt).toBe(150);
    const decocheState = sessionReducer(cocheState, {
      type: "TOGGLE_ACTION",
      idx: 0,
      elapsed: 160,
    });
    expect(decocheState.adres).toBe(0);
    // Restauré à la valeur d'avant le clic, pas à null
    expect(decocheState.lastAdreAt).toBe(60);
    expect(decocheState.events).toEqual([]);
    expect(decocheState.pendingActions[0].done).toBe(false);
  });

  test("idx invalide : state inchangé", () => {
    const start = make({
      pendingActions: [{ type: "choc", label: "Choc", done: false }],
    });
    const next = sessionReducer(start, { type: "TOGGLE_ACTION", idx: 99, elapsed: 0 });
    expect(next).toBe(start);
  });
});

describe("sessionReducer · FINISH_CYCLE", () => {
  test("archive le cycle courant et bascule en analyse, cycle++", () => {
    const actions = [
      { type: "choc", label: "Choc 200 J", done: true },
      { type: "adre", label: "Adrénaline 1 mg", done: false },
    ];
    const start = make({
      phase: "actions",
      cycle: 5,
      currentRhythm: "non_choquable",
      pendingActions: actions,
    });
    const next = sessionReducer(start, { type: "FINISH_CYCLE", elapsed: 600 });
    expect(next.cycle).toBe(6);
    expect(next.phase).toBe("analyse");
    expect(next.history).toEqual([
      { cycle: 5, t: 600, rhythm: "non_choquable", actions: ["Choc 200 J"] },
    ]);
    expect(next.pendingActions).toEqual([]);
    expect(next.currentRhythm).toBeNull();
  });
});

describe("sessionReducer · ADJUST_TALLY", () => {
  test("+choc : shocks++, event horodaté", () => {
    const start = make({ shocks: 2 });
    const next = sessionReducer(start, {
      type: "ADJUST_TALLY",
      kind: "choc",
      delta: 1,
      elapsed: 90,
      pediatric: false,
    });
    expect(next.shocks).toBe(3);
    expect(next.events[0]).toMatchObject({ type: "choc", t: 90 });
  });

  test("+adre : lastAdreAt mis à elapsed (relance le timer 4 min), label adapté au pédiatrique", () => {
    const start = make({ adres: 1, lastAdreAt: 0 });
    const next = sessionReducer(start, {
      type: "ADJUST_TALLY",
      kind: "adre",
      delta: 1,
      elapsed: 200,
      pediatric: true,
    });
    expect(next.adres).toBe(2);
    expect(next.lastAdreAt).toBe(200);
    expect(next.events[0]).toMatchObject({ label: "Adrénaline 0,01 mg/kg" });
  });

  test("+amio adulte 1re dose : label = 300 mg ; 2e = 150 mg", () => {
    const first = sessionReducer(make({ amios: 0 }), {
      type: "ADJUST_TALLY",
      kind: "amio",
      delta: 1,
      elapsed: 0,
      pediatric: false,
    });
    expect(first.events[0]).toMatchObject({ label: "Amiodarone 300 mg" });
    const second = sessionReducer(make({ amios: 1 }), {
      type: "ADJUST_TALLY",
      kind: "amio",
      delta: 1,
      elapsed: 0,
      pediatric: false,
    });
    expect(second.events[0]).toMatchObject({ label: "Amiodarone 150 mg" });
  });

  test("-adre quand adres=1 : remet lastAdreAt à null", () => {
    const start = make({
      adres: 1,
      lastAdreAt: 100,
      events: [{ id: "e1", type: "adre", label: "Adrénaline 1 mg", t: 100, at: Date.now() }],
    });
    const next = sessionReducer(start, {
      type: "ADJUST_TALLY",
      kind: "adre",
      delta: -1,
      elapsed: 0,
      pediatric: false,
    });
    expect(next.adres).toBe(0);
    expect(next.lastAdreAt).toBeNull();
    expect(next.events).toEqual([]);
  });

  test("-X quand compteur=0 : no-op (pas de tally négatif)", () => {
    const start = make({ shocks: 0, adres: 0, amios: 0 });
    for (const kind of ["choc", "adre", "amio"] as const) {
      const next = sessionReducer(start, {
        type: "ADJUST_TALLY",
        kind,
        delta: -1,
        elapsed: 0,
        pediatric: false,
      });
      expect(next).toBe(start);
    }
  });
});

describe("sessionReducer · horaires manuels", () => {
  test("SET_START_TIME recale les T+ existants depuis le début RCP", () => {
    const start = make({
      running: false,
      phase: "rcp",
      events: [
        { id: "c1", type: "choc", label: "Choc", t: 0, at: 10_120_000 },
        { id: "a1", type: "adre", label: "Adrénaline 1 mg", t: 0, at: 10_240_000 },
      ],
      lastAdreAt: 0,
    });

    const next = sessionReducer(start, {
      type: "SET_START_TIME",
      at: 10_000_000,
      elapsed: 300,
    });

    expect(next.running).toBe(true);
    expect(next.phase).toBe("analyse");
    expect(next.events).toEqual([
      expect.objectContaining({ type: "start", t: 0, at: 10_000_000 }),
      expect.objectContaining({ id: "c1", t: 120 }),
      expect.objectContaining({ id: "a1", t: 240 }),
    ]);
    expect(next.lastAdreAt).toBe(240);
  });

  test("SET_EVENT_TIME modifie l'heure d'une adré et recale le rappel 4 min", () => {
    const start = make({
      adres: 1,
      lastAdreAt: 120,
      events: [{ id: "a1", type: "adre", label: "Adrénaline 1 mg", t: 120, at: 10_120_000 }],
    });

    const next = sessionReducer(start, {
      type: "SET_EVENT_TIME",
      eventId: "a1",
      at: 10_300_000,
      elapsed: 300,
    });

    expect(next.events[0]).toMatchObject({ id: "a1", at: 10_300_000, t: 300 });
    expect(next.lastAdreAt).toBe(300);
  });
});

describe("sessionReducer · RESET", () => {
  test("RESET : retour à l'état initial peu importe ce qui précède", () => {
    const dirty = make({
      running: true,
      phase: "actions",
      cycle: 7,
      cycleStartedAt: 600,
      currentRhythm: "choquable",
      pendingActions: [{ type: "choc", label: "X", done: true }],
      history: [{ cycle: 1, t: 60, rhythm: "choquable", actions: [] }],
      shocks: 5,
      adres: 3,
      amios: 2,
      lastAdreAt: 480,
      events: [{ id: "x", type: "choc", label: "y", t: 0, at: 0 }],
    });
    const next = sessionReducer(dirty, { type: "RESET" });
    expect(next).toEqual(initialSessionState);
  });

  test("HYDRATE : remplace l'état courant par une session reconstruite", () => {
    const hydrated = make({ running: true, cycle: 3, shocks: 2 });
    const next = sessionReducer(initialSessionState, { type: "HYDRATE", state: hydrated });
    expect(next).toBe(hydrated);
  });
});
