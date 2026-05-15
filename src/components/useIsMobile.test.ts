import { act, renderHook } from "@testing-library/react";
import { useIsMobile } from "../lib/useIsMobile";

// useIsMobile vit dans src/lib mais son test doit tourner dans le projet
// "dom" (happy-dom + renderHook) → fichier placé sous src/components.
// On stube window.matchMedia (happy-dom n'évalue pas réellement la requête).

type Listener = () => void;

const makeMatchMedia = (initial: boolean) => {
  let matches = initial;
  const listeners = new Set<Listener>();
  const mql = {
    get matches() {
      return matches;
    },
    media: "",
    addEventListener: (_: string, cb: Listener) => listeners.add(cb),
    removeEventListener: (_: string, cb: Listener) => listeners.delete(cb),
  };
  const fn = vi.fn(() => mql);
  const set = (v: boolean) => {
    matches = v;
    listeners.forEach((cb) => cb());
  };
  return { fn, set, mql };
};

describe("useIsMobile", () => {
  afterEach(() => {
    // @ts-expect-error nettoyage du stub entre tests
    delete window.matchMedia;
    vi.restoreAllMocks();
  });

  test("retourne true quand la media query matche au montage", () => {
    const mm = makeMatchMedia(true);
    window.matchMedia = mm.fn as unknown as typeof window.matchMedia;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  test("retourne false quand elle ne matche pas", () => {
    const mm = makeMatchMedia(false);
    window.matchMedia = mm.fn as unknown as typeof window.matchMedia;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  test("réagit à un changement (rotation / resize) via l'event change", () => {
    const mm = makeMatchMedia(false);
    window.matchMedia = mm.fn as unknown as typeof window.matchMedia;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    act(() => mm.set(true));
    expect(result.current).toBe(true);
    act(() => mm.set(false));
    expect(result.current).toBe(false);
  });

  test("interroge bien la requête côté-court (max-width OU max-height+coarse)", () => {
    const mm = makeMatchMedia(false);
    window.matchMedia = mm.fn as unknown as typeof window.matchMedia;
    renderHook(() => useIsMobile());
    expect(mm.fn).toHaveBeenCalledWith(
      "(max-width: 600px), (max-height: 600px) and (pointer: coarse)"
    );
  });

  test("désabonne le listener au démontage (pas de fuite)", () => {
    const mm = makeMatchMedia(false);
    const removeSpy = vi.spyOn(mm.mql, "removeEventListener");
    window.matchMedia = mm.fn as unknown as typeof window.matchMedia;
    const { unmount } = renderHook(() => useIsMobile());
    unmount();
    expect(removeSpy).toHaveBeenCalled();
  });
});
