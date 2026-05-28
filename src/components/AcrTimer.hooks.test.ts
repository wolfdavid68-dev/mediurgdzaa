import { act, renderHook } from "@testing-library/react";
import { useAcrAnalysisCue, useAcrAutoAdvance, useAcrChrono } from "./AcrTimer.hooks";
import { CYCLE_ANALYSE_S } from "./AcrTimer.constants";

// happy-dom n'embarque pas AudioContext / speechSynthesis ; les helpers
// beep()/speak() de useAcrAutoAdvance les wrap déjà en try/catch — pas besoin
// de stubs ici, les appels sont silencieux.

describe("useAcrChrono", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("initial : elapsed=0 et elapsedRef=0", () => {
    const { result } = renderHook(() => useAcrChrono(false));
    expect(result.current.elapsed).toBe(0);
    expect(result.current.elapsedRef.current).toBe(0);
  });

  test("running=false : pas de tick", () => {
    const { result } = renderHook(() => useAcrChrono(false));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.elapsed).toBe(0);
  });

  test("running=true : elapsed s'incrémente avec le temps réel", () => {
    const { result } = renderHook(() => useAcrChrono(true));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    // Le tick interne fait setInterval(250ms) et lit Date.now() → la valeur
    // doit refléter le temps écoulé en secondes (3 s ici).
    expect(result.current.elapsed).toBe(3);
    expect(result.current.elapsedRef.current).toBe(3);
  });

  test("pause : elapsed gelé à la dernière valeur", () => {
    const { result, rerender } = renderHook(({ running }) => useAcrChrono(running), {
      initialProps: { running: true },
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.elapsed).toBe(2);

    rerender({ running: false });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    // Pendant la pause, le temps avance mais elapsed ne doit pas bouger.
    expect(result.current.elapsed).toBe(2);
  });

  test("resume : redémarre depuis la valeur de pause, pas zéro", () => {
    const { result, rerender } = renderHook(({ running }) => useAcrChrono(running), {
      initialProps: { running: true },
    });
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.elapsed).toBe(4);

    rerender({ running: false });
    // Pause : on simule 10 s de temps réel passé sans incrémenter elapsed
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.elapsed).toBe(4);

    // Reprise : elapsed continue à 4, puis avance d'1 s supplémentaire
    rerender({ running: true });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.elapsed).toBe(5);
  });

  test("resetChrono() remet elapsed et elapsedRef à 0", () => {
    const { result, rerender } = renderHook(({ running }) => useAcrChrono(running), {
      initialProps: { running: true },
    });
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(result.current.elapsed).toBe(7);

    // Reset typique : on stoppe le chrono puis on appelle resetChrono.
    rerender({ running: false });
    act(() => {
      result.current.resetChrono();
    });
    expect(result.current.elapsed).toBe(0);
    expect(result.current.elapsedRef.current).toBe(0);
  });

  test("après reset, redémarrer repart bien de 0", () => {
    const { result, rerender } = renderHook(({ running }) => useAcrChrono(running), {
      initialProps: { running: true },
    });
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    rerender({ running: false });
    act(() => {
      result.current.resetChrono();
    });
    rerender({ running: true });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.elapsed).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

// Depuis le passage à useReducer, useAcrAutoAdvance ne fait plus que détecter
// le franchissement des 2 min RCP et appeler onAdvance. La logique d'archive
// du cycle vit désormais dans le reducer (testé séparément dans
// AcrTimer.reducer.test.ts).

type AdvanceProps = {
  running: boolean;
  phase: string;
  audioOn: boolean;
  voiceOn: boolean;
  cycleStartedAt: number;
  rcpInCycle: number;
  adreIdx: number;
  lastAdreAt: number | null;
  onAdvance: () => void;
};

const makeProps = (overrides: Partial<AdvanceProps> = {}): AdvanceProps => ({
  running: true,
  phase: "rcp",
  audioOn: false,
  voiceOn: false,
  cycleStartedAt: 0,
  rcpInCycle: 0,
  adreIdx: -1,
  lastAdreAt: null,
  onAdvance: vi.fn(),
  ...overrides,
});

describe("useAcrAutoAdvance", () => {
  test("running=false : onAdvance pas appelé même au-delà de 2 min", () => {
    const onAdvance = vi.fn();
    renderHook(() =>
      useAcrAutoAdvance(makeProps({ running: false, rcpInCycle: CYCLE_ANALYSE_S + 10, onAdvance }))
    );
    expect(onAdvance).not.toHaveBeenCalled();
  });

  test("rcpInCycle < CYCLE_ANALYSE_S : pas de déclenchement", () => {
    const onAdvance = vi.fn();
    renderHook(() => useAcrAutoAdvance(makeProps({ rcpInCycle: CYCLE_ANALYSE_S - 1, onAdvance })));
    expect(onAdvance).not.toHaveBeenCalled();
  });

  test("rcpInCycle >= CYCLE_ANALYSE_S en phase rcp : onAdvance appelé 1 fois", () => {
    const onAdvance = vi.fn();
    renderHook(() =>
      useAcrAutoAdvance(makeProps({ phase: "rcp", rcpInCycle: CYCLE_ANALYSE_S, onAdvance }))
    );
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  test("rcpInCycle >= CYCLE_ANALYSE_S en phase actions : onAdvance aussi (le reducer gère l'archive)", () => {
    const onAdvance = vi.fn();
    renderHook(() =>
      useAcrAutoAdvance(makeProps({ phase: "actions", rcpInCycle: CYCLE_ANALYSE_S, onAdvance }))
    );
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  test("phase analyse ou post-rosc : pas de déclenchement (anti-bascule)", () => {
    const onAdvance = vi.fn();
    const { rerender } = renderHook((p) => useAcrAutoAdvance(p), {
      initialProps: makeProps({ phase: "analyse", rcpInCycle: CYCLE_ANALYSE_S, onAdvance }),
    });
    expect(onAdvance).not.toHaveBeenCalled();
    rerender(makeProps({ phase: "post-rosc", rcpInCycle: CYCLE_ANALYSE_S, onAdvance }));
    expect(onAdvance).not.toHaveBeenCalled();
  });

  test("re-render au même cycleStartedAt ne re-déclenche pas", () => {
    const onAdvance = vi.fn();
    const props = makeProps({ phase: "rcp", rcpInCycle: CYCLE_ANALYSE_S, onAdvance });
    const { rerender } = renderHook((p) => useAcrAutoAdvance(p), { initialProps: props });
    expect(onAdvance).toHaveBeenCalledTimes(1);
    rerender({ ...props, rcpInCycle: CYCLE_ANALYSE_S + 1 });
    rerender({ ...props, rcpInCycle: CYCLE_ANALYSE_S + 2 });
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  test("nouveau cycleStartedAt ré-arme le déclenchement", () => {
    const onAdvance = vi.fn();
    const base = makeProps({ phase: "rcp", rcpInCycle: CYCLE_ANALYSE_S, onAdvance });
    const { rerender } = renderHook((p) => useAcrAutoAdvance(p), { initialProps: base });
    expect(onAdvance).toHaveBeenCalledTimes(1);

    rerender({ ...base, cycleStartedAt: CYCLE_ANALYSE_S, rcpInCycle: CYCLE_ANALYSE_S });
    expect(onAdvance).toHaveBeenCalledTimes(2);
  });

  test("alerte adré ne déclenche pas onAdvance (c'est juste une cue audio)", () => {
    const onAdvance = vi.fn();
    renderHook(() =>
      useAcrAutoAdvance(makeProps({ lastAdreAt: 60, adreIdx: 1, rcpInCycle: 30, onAdvance }))
    );
    expect(onAdvance).not.toHaveBeenCalled();
  });

  test("resetAlerts() permet à onAdvance de re-tirer après reset+redémarrage", () => {
    const onAdvance = vi.fn();
    const fired = makeProps({ phase: "rcp", rcpInCycle: CYCLE_ANALYSE_S, onAdvance });
    const { result, rerender } = renderHook((p) => useAcrAutoAdvance(p), { initialProps: fired });
    expect(onAdvance).toHaveBeenCalledTimes(1);

    rerender({ ...fired, running: false, rcpInCycle: 0 });
    act(() => {
      result.current.resetAlerts();
    });
    rerender({ ...fired });
    expect(onAdvance).toHaveBeenCalledTimes(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("useAcrAnalysisCue", () => {
  // Le seul side-effect observable depuis l'extérieur est navigator.vibrate(40).
  // beep() est silencieux faute d'AudioContext sous happy-dom.
  let vibrate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", {
      value: vibrate,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "vibrate");
  });

  type CueProps = {
    running: boolean;
    visualOn: boolean;
    audioOn: boolean;
    phase: string;
    nextAnalyseIn: number;
  };
  const renderCue = (initial: CueProps) =>
    renderHook(
      ({ running, visualOn, audioOn, phase, nextAnalyseIn }: CueProps) =>
        useAcrAnalysisCue(running, visualOn, audioOn, phase, nextAnalyseIn),
      { initialProps: initial }
    );

  test("running=false : aucune cue même dans la fenêtre T-5", () => {
    renderCue({ running: false, visualOn: true, audioOn: true, phase: "rcp", nextAnalyseIn: 3 });
    expect(vibrate).not.toHaveBeenCalled();
  });

  test("visualOn=false : aucune cue", () => {
    renderCue({ running: true, visualOn: false, audioOn: true, phase: "rcp", nextAnalyseIn: 3 });
    expect(vibrate).not.toHaveBeenCalled();
  });

  test("phase hors RCP (analyse) : aucune cue", () => {
    renderCue({ running: true, visualOn: true, audioOn: true, phase: "analyse", nextAnalyseIn: 3 });
    expect(vibrate).not.toHaveBeenCalled();
  });

  test("nextAnalyseIn > 5 : pas encore dans la fenêtre, aucune cue", () => {
    renderCue({ running: true, visualOn: true, audioOn: true, phase: "rcp", nextAnalyseIn: 10 });
    expect(vibrate).not.toHaveBeenCalled();
  });

  test("nextAnalyseIn = 5 : 1ère cue, vibre", () => {
    renderCue({ running: true, visualOn: true, audioOn: true, phase: "rcp", nextAnalyseIn: 5 });
    expect(vibrate).toHaveBeenCalledWith(40);
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  test("nextAnalyseIn = 0 : pas de cue (le code exige >= 1, GO se voit visuellement)", () => {
    renderCue({ running: true, visualOn: true, audioOn: true, phase: "rcp", nextAnalyseIn: 0 });
    expect(vibrate).not.toHaveBeenCalled();
  });

  test("séquence T-5..T-1 : 5 cues distinctes", () => {
    const { rerender } = renderCue({
      running: true,
      visualOn: true,
      audioOn: true,
      phase: "rcp",
      nextAnalyseIn: 5,
    });
    expect(vibrate).toHaveBeenCalledTimes(1);
    for (const t of [4, 3, 2, 1]) {
      rerender({ running: true, visualOn: true, audioOn: true, phase: "rcp", nextAnalyseIn: t });
    }
    expect(vibrate).toHaveBeenCalledTimes(5);
  });

  test("re-render au même nextAnalyseIn ne re-déclenche pas (anti double-tick)", () => {
    const { rerender } = renderCue({
      running: true,
      visualOn: true,
      audioOn: true,
      phase: "rcp",
      nextAnalyseIn: 4,
    });
    expect(vibrate).toHaveBeenCalledTimes(1);
    // Tick interne du chrono à 250 ms : nextAnalyseIn peut être recalculé
    // identique. La cue ne doit pas re-tirer.
    rerender({ running: true, visualOn: true, audioOn: true, phase: "rcp", nextAnalyseIn: 4 });
    rerender({ running: true, visualOn: true, audioOn: true, phase: "rcp", nextAnalyseIn: 4 });
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  test("BUG-CRITIQUE : reset du ref hors fenêtre permet à T-1 du cycle suivant de tirer", () => {
    // Sans le reset `lastZoomCueRef.current = -1` quand nextAnalyseIn > 5,
    // le ref garderait sa dernière valeur (1) et au cycle suivant, la cue
    // T-1 ne tirerait pas (1 === ref). On vérifie qu'au cycle 2, T-1 fire bien.
    const { rerender } = renderCue({
      running: true,
      visualOn: true,
      audioOn: true,
      phase: "rcp",
      nextAnalyseIn: 5,
    });
    // Cycle 1 complet
    for (const t of [4, 3, 2, 1]) {
      rerender({ running: true, visualOn: true, audioOn: true, phase: "rcp", nextAnalyseIn: t });
    }
    expect(vibrate).toHaveBeenCalledTimes(5);

    // Hors fenêtre : sortie + 2 min de RCP cycle 2 (nextAnalyseIn redescend)
    for (const t of [120, 60, 10, 6]) {
      rerender({ running: true, visualOn: true, audioOn: true, phase: "rcp", nextAnalyseIn: t });
    }
    expect(vibrate).toHaveBeenCalledTimes(5);

    // Cycle 2 : T-5..T-1 doivent toutes re-tirer
    for (const t of [5, 4, 3, 2, 1]) {
      rerender({ running: true, visualOn: true, audioOn: true, phase: "rcp", nextAnalyseIn: t });
    }
    expect(vibrate).toHaveBeenCalledTimes(10);
  });

  test("sortir/revenir dans la fenêtre dans le même cycle re-déclenche (le ref est remis à -1)", () => {
    // Cas tordu mais possible : le médecin clique « Analyser maintenant » à T-3,
    // puis fait setPhase("analyse") (sort de inCycleRcp) puis revient en rcp.
    const { rerender } = renderCue({
      running: true,
      visualOn: true,
      audioOn: true,
      phase: "rcp",
      nextAnalyseIn: 3,
    });
    expect(vibrate).toHaveBeenCalledTimes(1);
    rerender({ running: true, visualOn: true, audioOn: true, phase: "analyse", nextAnalyseIn: 3 });
    rerender({ running: true, visualOn: true, audioOn: true, phase: "rcp", nextAnalyseIn: 3 });
    // ref remis à -1 quand on est sorti, donc 3 !== -1 → re-cue.
    expect(vibrate).toHaveBeenCalledTimes(2);
  });
});
