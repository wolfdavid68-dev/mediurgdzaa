import { renderHook } from "@testing-library/react";
import type { PointerEvent } from "react";
import { useLongPress } from "../lib/useLongPress";

// useLongPress vit dans src/lib mais renderHook → projet "dom".

const pe = (x = 0, y = 0) => ({ clientX: x, clientY: y }) as PointerEvent;

describe("useLongPress", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test("appui maintenu ≥ délai → callback déclenché une fois", () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useLongPress(cb, 600));
    result.current.onPointerDown(pe());
    vi.advanceTimersByTime(600);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("relâché avant le délai → pas de déclenchement", () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useLongPress(cb, 600));
    result.current.onPointerDown(pe());
    vi.advanceTimersByTime(300);
    result.current.onPointerUp();
    vi.advanceTimersByTime(600);
    expect(cb).not.toHaveBeenCalled();
  });

  test("mouvement > tolérance (scroll) → annulé", () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useLongPress(cb, 600));
    result.current.onPointerDown(pe(0, 0));
    result.current.onPointerMove(pe(0, 40));
    vi.advanceTimersByTime(600);
    expect(cb).not.toHaveBeenCalled();
  });

  test("petit micro-mouvement (< tolérance) → toujours déclenché", () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useLongPress(cb, 600));
    result.current.onPointerDown(pe(0, 0));
    result.current.onPointerMove(pe(3, 4));
    vi.advanceTimersByTime(600);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("onContextMenu empêche le menu/callout", () => {
    const { result } = renderHook(() => useLongPress(vi.fn()));
    const preventDefault = vi.fn();
    result.current.onContextMenu({ preventDefault });
    expect(preventDefault).toHaveBeenCalled();
  });
});
