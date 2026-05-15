import { isAuthEnabled } from "../lib/featureFlags";

// Régression : l'override ?auth=preview doit rester actif même quand l'app
// réécrit l'URL et fait sauter le query param (sinon AuthGate bypassait
// l'auth → retour à l'app au lieu du login après logout).

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
  window.history.replaceState(null, "", "/");
});
afterEach(() => vi.unstubAllGlobals());

describe("isAuthEnabled — preview collant", () => {
  test("sans ?auth=preview et AUTH_ENABLED=false → false", () => {
    expect(isAuthEnabled()).toBe(false);
  });

  test("?auth=preview dans l'URL → true (et mémorisé)", () => {
    window.history.replaceState(null, "", "/?auth=preview");
    expect(isAuthEnabled()).toBe(true);
    expect(store.get("mediurg-preview-auth")).toBe("1");
  });

  test("param perdu APRÈS coup → reste true (sticky session)", () => {
    window.history.replaceState(null, "", "/?auth=preview");
    expect(isAuthEnabled()).toBe(true);
    // L'app réécrit l'URL sans le param (popstate/pushState)…
    window.history.replaceState(null, "", "/");
    expect(isAuthEnabled()).toBe(true); // ← avant le fix : false
  });

  test("nouvelle session (sessionStorage vide) + pas de param → false", () => {
    store.clear();
    window.history.replaceState(null, "", "/");
    expect(isAuthEnabled()).toBe(false);
  });
});
