import { isAuthEnabled, isPsePreview } from "../lib/featureFlags";

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

  test("alias ?author=preview (faute de frappe courante) → true", () => {
    window.history.replaceState(null, "", "/?author=preview");
    expect(isAuthEnabled()).toBe(true);
    // clé sticky canonique = 1ᵉʳ alias, indépendante de l'alias tapé
    expect(store.get("mediurg-preview-auth")).toBe("1");
  });

  test("alias ?preview=preview → true", () => {
    window.history.replaceState(null, "", "/?preview=preview");
    expect(isAuthEnabled()).toBe(true);
  });
});

describe("isPsePreview — preview unifiée (?auth=preview)", () => {
  test("sans preview → false (public : PSE inchangé)", () => {
    expect(isPsePreview()).toBe(false);
  });

  test("?auth=preview active AUSSI la PSE preview", () => {
    window.history.replaceState(null, "", "/?auth=preview");
    expect(isPsePreview()).toBe(true);
  });

  test("sticky : param perdu après coup → PSE preview reste active", () => {
    window.history.replaceState(null, "", "/?auth=preview");
    expect(isPsePreview()).toBe(true);
    window.history.replaceState(null, "", "/");
    expect(isPsePreview()).toBe(true);
  });

  test("alias ?author=preview active AUSSI la PSE preview", () => {
    window.history.replaceState(null, "", "/?author=preview");
    expect(isPsePreview()).toBe(true);
  });

  test("?pse=preview seul ne fait RIEN (param unifié = auth/author/preview)", () => {
    window.history.replaceState(null, "", "/?pse=preview");
    expect(isPsePreview()).toBe(false);
  });
});
