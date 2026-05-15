import {
  cacheProfile,
  getCachedProfile,
  getLastCachedProfile,
  clearCachedProfile,
} from "../lib/profileCache";
import type { Profile } from "../lib/auth";

// profileCache vit dans src/lib mais a besoin de localStorage → test dans
// le projet "dom" (happy-dom). Couvre le cache offline du profil auth.

const makeProfile = (over: Partial<Profile> = {}): Profile => ({
  id: "user-1",
  matricule: "M402100",
  email: "c.bernard@ghrmsa.fr",
  prenom: "Camille",
  nom: "Bernard",
  fonction: "Médecin urgentiste",
  service: "SAU",
  status: "active",
  role: "user",
  created_at: "2024-01-01",
  approved_at: "2024-01-02",
  approved_by: null,
  banned_at: null,
  ban_reason: null,
  ...over,
});

// Stub localStorage Map-based (Node 22 + happy-dom n'a pas de localStorage
// fonctionnel) — convention projet, cf. userStorage.test.ts.
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

describe("profileCache", () => {
  beforeEach(() => clearCachedProfile());

  test("cacheProfile puis getCachedProfile(même id) → profil", () => {
    const p = makeProfile();
    cacheProfile(p);
    expect(getCachedProfile("user-1")).toEqual(p);
  });

  test("getCachedProfile(autre id) → null (cache indexé par user)", () => {
    cacheProfile(makeProfile({ id: "user-1" }));
    expect(getCachedProfile("user-2")).toBeNull();
  });

  test("aucun cache → null", () => {
    expect(getCachedProfile("user-1")).toBeNull();
  });

  test("clearCachedProfile efface l'entrée", () => {
    cacheProfile(makeProfile());
    clearCachedProfile();
    expect(getCachedProfile("user-1")).toBeNull();
  });

  test("JSON corrompu en storage → null (pas de crash)", () => {
    localStorage.setItem("mediurg-profile-cache-v1", "{pas du json");
    expect(getCachedProfile("user-1")).toBeNull();
  });

  test("le dernier cacheProfile écrase le précédent", () => {
    cacheProfile(makeProfile({ id: "user-1", status: "active" }));
    cacheProfile(makeProfile({ id: "user-1", status: "banned", ban_reason: "Test" }));
    expect(getCachedProfile("user-1")?.status).toBe("banned");
  });

  describe("getLastCachedProfile (session expirée hors-ligne)", () => {
    test("renvoie le profil caché SANS connaître l'id", () => {
      const p = makeProfile({ id: "user-42" });
      cacheProfile(p);
      expect(getLastCachedProfile()).toEqual(p);
    });

    test("aucun cache → null (appareil jamais appairé → mur login)", () => {
      expect(getLastCachedProfile()).toBeNull();
    });

    test("JSON corrompu → null (pas de crash)", () => {
      localStorage.setItem("mediurg-profile-cache-v1", "{cassé");
      expect(getLastCachedProfile()).toBeNull();
    });

    test("clearCachedProfile (logout) → getLastCachedProfile null", () => {
      cacheProfile(makeProfile());
      clearCachedProfile();
      expect(getLastCachedProfile()).toBeNull();
    });
  });
});
