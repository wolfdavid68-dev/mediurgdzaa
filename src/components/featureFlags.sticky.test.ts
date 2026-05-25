import { isAuthEnabled, isPreview, isPsePreview } from "../lib/featureFlags";

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

describe("isAuthEnabled — activation officielle", () => {
  test("sans ?auth=preview → true depuis l'ouverture officielle du login", () => {
    expect(isAuthEnabled()).toBe(true);
  });
});

describe("isPreview — preview collant", () => {
  test("sans ?auth=preview → false", () => {
    expect(isPreview()).toBe(false);
  });

  test("?auth=preview dans l'URL → true (et mémorisé)", () => {
    window.history.replaceState(null, "", "/?auth=preview");
    expect(isPreview()).toBe(true);
    expect(store.get("mediurg-preview-auth")).toBe("1");
  });

  test("param perdu APRÈS coup → reste true (sticky session)", () => {
    window.history.replaceState(null, "", "/?auth=preview");
    expect(isPreview()).toBe(true);
    // L'app réécrit l'URL sans le param (popstate/pushState)…
    window.history.replaceState(null, "", "/");
    expect(isPreview()).toBe(true); // ← avant le fix : false
  });

  test("nouvelle session (sessionStorage vide) + pas de param → false", () => {
    store.clear();
    window.history.replaceState(null, "", "/");
    expect(isPreview()).toBe(false);
  });

  test("alias ?author=preview (faute de frappe courante) → true", () => {
    window.history.replaceState(null, "", "/?author=preview");
    expect(isPreview()).toBe(true);
    // clé sticky canonique = 1ᵉʳ alias, indépendante de l'alias tapé
    expect(store.get("mediurg-preview-auth")).toBe("1");
  });

  test("alias ?preview=preview → true", () => {
    window.history.replaceState(null, "", "/?preview=preview");
    expect(isPreview()).toBe(true);
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
