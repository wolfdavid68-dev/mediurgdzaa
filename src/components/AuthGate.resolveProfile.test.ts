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

  test("échec kind=network → profil caché (pas de renvoi au login)", async () => {
    fetchProfileMock.mockResolvedValue({ ok: false, error: "x", kind: "network" });
    getCachedProfileMock.mockReturnValue(profile);
    expect(await resolveProfile("user-1")).toEqual(profile);
    expect(getCachedProfileMock).toHaveBeenCalledWith("user-1");
  });

  test("échec kind=notfound → null (login légitime, pas de fallback)", async () => {
    fetchProfileMock.mockResolvedValue({ ok: false, error: "x", kind: "notfound" });
    getCachedProfileMock.mockReturnValue(profile);
    expect(await resolveProfile("user-1")).toBeNull();
    expect(getCachedProfileMock).not.toHaveBeenCalled();
  });

  test("échec kind=config → null (backend non configuré)", async () => {
    fetchProfileMock.mockResolvedValue({ ok: false, error: "x", kind: "config" });
    expect(await resolveProfile("user-1")).toBeNull();
  });

  test("échec network mais aucun cache → null", async () => {
    fetchProfileMock.mockResolvedValue({ ok: false, error: "x", kind: "network" });
    getCachedProfileMock.mockReturnValue(null);
    expect(await resolveProfile("user-1")).toBeNull();
  });
});
