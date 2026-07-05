import { isAuthEnabled, isPreview, isPsePreview } from "../lib/featureFlags";

// Régression : le mode preview interne doit rester strictement explicite.
// Seul `?author=preview` dans l'URL courante active les surcharges
// drugs.preview.js / pse.preview.js. Sans ce paramètre visible : main.

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
  test("sans preview → true depuis l'ouverture officielle du login", () => {
    expect(isAuthEnabled()).toBe(true);
  });
});

describe("isPreview — preview explicite", () => {
  test("sans ?author=preview → false", () => {
    expect(isPreview()).toBe(false);
  });

  test("?auth=preview ne déclenche plus la preview interne", () => {
    window.history.replaceState(null, "", "/?auth=preview");
    expect(isPreview()).toBe(false);
    expect(store.get("mediurg-preview-author")).toBeUndefined();
  });

  test("?author=preview dans l'URL → true sans mémorisation", () => {
    window.history.replaceState(null, "", "/?author=preview");
    expect(isPreview()).toBe(true);
    expect(store.get("mediurg-preview-author")).toBeUndefined();
  });

  test("param perdu après coup → redevient false", () => {
    window.history.replaceState(null, "", "/?author=preview");
    expect(isPreview()).toBe(true);
    window.history.replaceState(null, "", "/");
    expect(isPreview()).toBe(false);
  });

  test("nouvelle session (sessionStorage vide) + pas de param → false", () => {
    store.clear();
    window.history.replaceState(null, "", "/");
    expect(isPreview()).toBe(false);
  });

  test("?author=preview → true", () => {
    window.history.replaceState(null, "", "/?author=preview");
    expect(isPreview()).toBe(true);
    expect(store.get("mediurg-preview-author")).toBeUndefined();
  });

  test("?preview=preview seul ne déclenche plus la preview interne", () => {
    window.history.replaceState(null, "", "/?preview=preview");
    expect(isPreview()).toBe(false);
  });
});

describe("isPsePreview — preview unifiée (?author=preview)", () => {
  test("sans preview → false (public : PSE inchangé)", () => {
    expect(isPsePreview()).toBe(false);
  });

  test("?auth=preview n'active PAS la PSE preview", () => {
    window.history.replaceState(null, "", "/?auth=preview");
    expect(isPsePreview()).toBe(false);
  });

  test("?author=preview active la PSE preview", () => {
    window.history.replaceState(null, "", "/?author=preview");
    expect(isPsePreview()).toBe(true);
  });

  test("param perdu après coup → PSE preview se désactive", () => {
    window.history.replaceState(null, "", "/?author=preview");
    expect(isPsePreview()).toBe(true);
    window.history.replaceState(null, "", "/");
    expect(isPsePreview()).toBe(false);
  });

  test("?pse=preview seul ne fait RIEN (param unifié = author)", () => {
    window.history.replaceState(null, "", "/?pse=preview");
    expect(isPsePreview()).toBe(false);
  });
});
