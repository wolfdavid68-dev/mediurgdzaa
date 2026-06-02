import { act, renderHook } from "@testing-library/react";
import { useIsMobile } from "../lib/useIsMobile";

// useIsMobile vit dans src/lib mais son test doit tourner dans le projet
// "dom" (happy-dom + renderHook) → fichier placé sous src/components.
// On stube window.matchMedia (happy-dom n'évalue pas réellement la requête).

type MatchMediaListener = ((event: Event) => void) | { handleEvent(event: Event): void };

const makeMatchMedia = (initial: boolean) => {
  let matches = initial;
  let media = "";
  const listeners = new Set<MatchMediaListener>();
  const mql: MediaQueryList = {
    get matches() {
      return matches;
    },
    get media() {
      return media;
    },
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: (_type: string, cb: MatchMediaListener | null) => {
      if (cb) listeners.add(cb);
    },
    removeEventListener: (_type: string, cb: MatchMediaListener | null) => {
      if (cb) listeners.delete(cb);
    },
    dispatchEvent: () => true,
  };
  const fn: typeof window.matchMedia = vi.fn((query: string) => {
    media = query;
    return mql;
  });
  const set = (v: boolean) => {
    matches = v;
    const event = new Event("change");
    listeners.forEach((listener) => {
      if (typeof listener === "function") listener(event);
      else listener.handleEvent(event);
    });
  };
  return { fn, set, mql };
};

const installMatchMedia = (matchMedia: typeof window.matchMedia) => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: matchMedia,
  });
};

describe("useIsMobile", () => {
  afterEach(() => {
    Object.defineProperty(window, "matchMedia", { configurable: true, value: undefined });
    vi.restoreAllMocks();
  });

  test("retourne true quand la media query matche au montage", () => {
    const mm = makeMatchMedia(true);
    installMatchMedia(mm.fn);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  test("retourne false quand elle ne matche pas", () => {
    const mm = makeMatchMedia(false);
    installMatchMedia(mm.fn);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  test("réagit à un changement (rotation / resize) via l'event change", () => {
    const mm = makeMatchMedia(false);
    installMatchMedia(mm.fn);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    act(() => mm.set(true));
    expect(result.current).toBe(true);
    act(() => mm.set(false));
    expect(result.current).toBe(false);
  });

  test("interroge bien la requête côté-court (max-width OU max-height+coarse)", () => {
    const mm = makeMatchMedia(false);
    installMatchMedia(mm.fn);
    renderHook(() => useIsMobile());
    expect(mm.fn).toHaveBeenCalledWith(
      "(max-width: 600px), (max-height: 600px) and (pointer: coarse)"
    );
  });

  test("désabonne le listener au démontage (pas de fuite)", () => {
    const mm = makeMatchMedia(false);
    const removeSpy = vi.spyOn(mm.mql, "removeEventListener");
    installMatchMedia(mm.fn);
    const { unmount } = renderHook(() => useIsMobile());
    unmount();
    expect(removeSpy).toHaveBeenCalled();
  });
});
