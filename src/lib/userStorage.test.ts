import {
  migrateAnonymousData,
  readUserItem,
  readUserNote,
  removeUserItem,
  removeUserNote,
  writeUserItem,
  writeUserNote,
} from "./userStorage";

// Stub localStorage Map-based (Node 22 + happy-dom n'a pas de localStorage
// fonctionnel) — cf. AcrModeModal.test.tsx pour le détail.
const lsStore = new Map<string, string>();
beforeEach(() => {
  lsStore.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => lsStore.get(k) ?? null,
    setItem: (k: string, v: string) => {
      lsStore.set(k, String(v));
    },
    removeItem: (k: string) => {
      lsStore.delete(k);
    },
    clear: () => lsStore.clear(),
    key: (i: number) => Array.from(lsStore.keys())[i] ?? null,
    get length() {
      return lsStore.size;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("userStorage — mode anonyme (userId=null)", () => {
  test("read/write/remove avec préfixe mediurg-", () => {
    writeUserItem(null, "favorites", "[1,2,3]");
    expect(lsStore.get("mediurg-favorites")).toBe("[1,2,3]");
    expect(readUserItem(null, "favorites")).toBe("[1,2,3]");
    removeUserItem(null, "favorites");
    expect(readUserItem(null, "favorites")).toBeNull();
  });

  test("notes par drug : mediurg-note-{id}", () => {
    writeUserNote(null, 12, "Ma note sur Adrénaline");
    expect(lsStore.get("mediurg-note-12")).toBe("Ma note sur Adrénaline");
    expect(readUserNote(null, 12)).toBe("Ma note sur Adrénaline");
  });
});

describe("userStorage — mode authentifié (userId=abc)", () => {
  test("read/write avec préfixe mediurg-uabc-", () => {
    writeUserItem("abc", "favorites", "[5]");
    expect(lsStore.get("mediurg-uabc-favorites")).toBe("[5]");
    expect(readUserItem("abc", "favorites")).toBe("[5]");
  });

  test("isolation entre 2 users sur le même device", () => {
    writeUserItem("user1", "favorites", "[1]");
    writeUserItem("user2", "favorites", "[42]");
    expect(readUserItem("user1", "favorites")).toBe("[1]");
    expect(readUserItem("user2", "favorites")).toBe("[42]");
  });

  test("isolation entre user authentifié et anonyme", () => {
    writeUserItem(null, "favorites", "[1]");
    writeUserItem("user1", "favorites", "[42]");
    expect(readUserItem(null, "favorites")).toBe("[1]");
    expect(readUserItem("user1", "favorites")).toBe("[42]");
  });

  test("notes par drug isolées par user", () => {
    writeUserNote("user1", 12, "Note user1");
    writeUserNote("user2", 12, "Note user2");
    expect(readUserNote("user1", 12)).toBe("Note user1");
    expect(readUserNote("user2", 12)).toBe("Note user2");
    removeUserNote("user1", 12);
    expect(readUserNote("user1", 12)).toBeNull();
    expect(readUserNote("user2", 12)).toBe("Note user2");
  });
});

describe("migrateAnonymousData", () => {
  test("copie favorites/history/theme/notes/kits anonymes vers user", () => {
    // Setup : données anonymes pré-existantes
    lsStore.set("mediurg-favorites", "[1,2,3]");
    lsStore.set("mediurg-history", "[10,20]");
    lsStore.set("mediurg-theme", "dark");
    lsStore.set("mediurg-note-12", "Note Adrénaline");
    lsStore.set("mediurg-note-23", "Note Amiodarone");
    lsStore.set("mediurg-kit-check-isr", JSON.stringify({ ts: 1, items: { 0: true } }));
    lsStore.set("mediurg-kit-checklist-acr", JSON.stringify({ ts: 2, values: { dose: "ok" } }));

    const result = migrateAnonymousData("user1", [12, 23, 99]);
    expect(result.migrated).toBe(7); // 3 settings + 2 notes + 2 kits
    expect(result.skipped).toBe(0);

    expect(readUserItem("user1", "favorites")).toBe("[1,2,3]");
    expect(readUserItem("user1", "history")).toBe("[10,20]");
    expect(readUserItem("user1", "theme")).toBe("dark");
    expect(readUserNote("user1", 12)).toBe("Note Adrénaline");
    expect(readUserNote("user1", 23)).toBe("Note Amiodarone");
    expect(readUserItem("user1", "kit-check-isr")).toBe(
      JSON.stringify({ ts: 1, items: { 0: true } })
    );
    expect(readUserItem("user1", "kit-checklist-acr")).toBe(
      JSON.stringify({ ts: 2, values: { dose: "ok" } })
    );

    // Les clés anonymes restent (fallback pour autres users du device)
    expect(lsStore.get("mediurg-favorites")).toBe("[1,2,3]");
  });

  test("ne pas écraser une checklist kit user déjà présente", () => {
    lsStore.set("mediurg-kit-check-isr", "anon");
    lsStore.set("mediurg-uuser1-kit-check-isr", "user");
    const result = migrateAnonymousData("user1", []);
    expect(result.skipped).toBe(1);
    expect(readUserItem("user1", "kit-check-isr")).toBe("user");
  });

  test("idempotent : ré-exécution = no-op", () => {
    lsStore.set("mediurg-favorites", "[1]");
    const r1 = migrateAnonymousData("user1", []);
    expect(r1.migrated).toBe(1);
    const r2 = migrateAnonymousData("user1", []);
    expect(r2.migrated).toBe(0); // skip car déjà fait
  });

  test("ne pas écraser une donnée user déjà présente", () => {
    lsStore.set("mediurg-favorites", "[1]");
    lsStore.set("mediurg-uuser1-favorites", "[42]"); // user a déjà sa valeur
    const result = migrateAnonymousData("user1", []);
    expect(result.skipped).toBeGreaterThanOrEqual(1);
    expect(readUserItem("user1", "favorites")).toBe("[42]"); // pas écrasé
  });

  test("userId vide → no-op", () => {
    lsStore.set("mediurg-favorites", "[1]");
    const result = migrateAnonymousData("", [12]);
    expect(result.migrated).toBe(0);
  });

  test("aucune donnée anonyme → no-op silencieux", () => {
    const result = migrateAnonymousData("user1", [12]);
    expect(result.migrated).toBe(0);
  });
});
