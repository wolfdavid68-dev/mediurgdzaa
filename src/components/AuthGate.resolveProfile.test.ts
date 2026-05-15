import type { Profile } from "../lib/auth";

// Régression cœur de l'offline-first : resolveProfile (AuthGate) ne doit
// PAS renvoyer un utilisateur déjà appairé vers le login quand il est
// hors-ligne — il retombe sur le profil caché. En ligne, un échec reste
// un échec (login légitime, ré-auth possible).

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
  clearCachedProfile: vi.fn(),
}));

import { resolveProfile } from "./auth/AuthGate";

const profile = { id: "user-1", status: "active" } as Profile;

const setOnline = (online: boolean) =>
  Object.defineProperty(navigator, "onLine", { configurable: true, value: online });

describe("resolveProfile — tolérance hors-ligne", () => {
  beforeEach(() => {
    fetchProfileMock.mockReset();
    getCachedProfileMock.mockReset();
    cacheProfileMock.mockReset();
    setOnline(true);
  });

  test("fetch OK → met en cache et renvoie le profil", async () => {
    fetchProfileMock.mockResolvedValue({ ok: true, data: profile });
    const r = await resolveProfile("user-1");
    expect(r).toEqual(profile);
    expect(cacheProfileMock).toHaveBeenCalledWith(profile);
  });

  test("fetch KO + hors-ligne → profil caché (pas de renvoi au login)", async () => {
    fetchProfileMock.mockResolvedValue({ ok: false, error: "Profil introuvable" });
    getCachedProfileMock.mockReturnValue(profile);
    setOnline(false);
    const r = await resolveProfile("user-1");
    expect(r).toEqual(profile);
    expect(getCachedProfileMock).toHaveBeenCalledWith("user-1");
  });

  test("fetch KO + en ligne → null (login légitime, ré-auth possible)", async () => {
    fetchProfileMock.mockResolvedValue({ ok: false, error: "Profil introuvable" });
    getCachedProfileMock.mockReturnValue(profile);
    setOnline(true);
    const r = await resolveProfile("user-1");
    expect(r).toBeNull();
    expect(getCachedProfileMock).not.toHaveBeenCalled();
  });

  test("fetch KO + hors-ligne + aucun cache → null", async () => {
    fetchProfileMock.mockResolvedValue({ ok: false, error: "x" });
    getCachedProfileMock.mockReturnValue(null);
    setOnline(false);
    expect(await resolveProfile("user-1")).toBeNull();
  });
});
