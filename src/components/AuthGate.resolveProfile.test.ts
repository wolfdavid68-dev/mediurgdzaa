import type { Profile } from "../lib/auth";

// Régression cœur de l'offline-first : resolveProfile (AuthGate) retombe
// sur le profil caché UNIQUEMENT sur erreur réseau (result.kind ===
// "network"), pas sur notfound/config (login légitime). Plus robuste que
// l'ancien navigator.onLine (couvre wifi sans route, timeout).

const { fetchProfileMock, getCachedProfileMock, cacheProfileMock } = vi.hoisted(() => ({
  fetchProfileMock: vi.fn(),
  getCachedProfileMock: vi.fn(),
  cacheProfileMock: vi.fn(),
}));

vi.mock("../lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/auth")>();
  return { ...actual, fetchProfile: fetchProfileMock };
});
vi.mock("../lib/profileCache", () => ({
  cacheProfile: cacheProfileMock,
  getCachedProfile: getCachedProfileMock,
  getLastCachedProfile: vi.fn(),
  clearCachedProfile: vi.fn(),
}));

import { resolveProfile } from "./auth/AuthGate";

const profile = { id: "user-1", status: "active" } as Profile;

describe("resolveProfile — tolérance hors-ligne (par kind)", () => {
  beforeEach(() => {
    fetchProfileMock.mockReset();
    getCachedProfileMock.mockReset();
    cacheProfileMock.mockReset();
  });

  test("fetch OK → met en cache et renvoie le profil", async () => {
    fetchProfileMock.mockResolvedValue({ ok: true, data: profile });
    expect(await resolveProfile("user-1")).toEqual(profile);
    expect(cacheProfileMock).toHaveBeenCalledWith(profile);
  });

  // Durcissement A : TOUT échec retombe sur le cache si dispo (appareil
  // appairé → plus jamais de login sauf déconnexion explicite).
  test.each(["network", "notfound", "config", "unknown"] as const)(
    "échec kind=%s + cache présent → profil caché (pas de login)",
    async (kind) => {
      fetchProfileMock.mockResolvedValue({ ok: false, error: "x", kind });
      getCachedProfileMock.mockReturnValue(profile);
      expect(await resolveProfile("user-1")).toEqual(profile);
      expect(getCachedProfileMock).toHaveBeenCalledWith("user-1");
    }
  );

  test("échec + aucun cache (jamais appairé) → null → login", async () => {
    fetchProfileMock.mockResolvedValue({ ok: false, error: "x", kind: "notfound" });
    getCachedProfileMock.mockReturnValue(null);
    expect(await resolveProfile("user-1")).toBeNull();
  });
});
