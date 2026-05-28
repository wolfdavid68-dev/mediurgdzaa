import {
  safeGetItem,
  safeGetJson,
  safeGetSessionItem,
  safeRemoveItem,
  safeSetItem,
  safeSetJson,
  safeSetSessionItem,
} from "./safeStorage";

describe("safeStorage", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    const sessionStore = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
      }),
      clear: vi.fn(() => store.clear()),
    });
    vi.stubGlobal("sessionStorage", {
      getItem: vi.fn((key: string) => sessionStore.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        sessionStore.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        sessionStore.delete(key);
      }),
      clear: vi.fn(() => sessionStore.clear()),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("lit et écrit des chaînes sans exposer localStorage aux appelants", () => {
    expect(safeSetItem("test-key", "ok")).toBe(true);
    expect(safeGetItem("test-key")).toBe("ok");
    expect(safeRemoveItem("test-key")).toBe(true);
    expect(safeGetItem("test-key")).toBeNull();
  });

  test("lit et écrit du JSON avec fallback si la donnée est invalide", () => {
    expect(safeSetJson("test-json", { a: 1 })).toBe(true);
    expect(safeGetJson("test-json", { a: 0 })).toEqual({ a: 1 });

    store.set("test-json", "{cassé");
    expect(safeGetJson("test-json", { a: 0 })).toEqual({ a: 0 });
  });

  test("lit et écrit des chaînes dans sessionStorage sans exposer l'API brute", () => {
    expect(safeSetSessionItem("test-session", "ok")).toBe(true);
    expect(safeGetSessionItem("test-session")).toBe("ok");
    expect(safeGetSessionItem("missing")).toBeNull();
  });
});
