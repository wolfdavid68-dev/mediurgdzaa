import type { Profile } from "./auth";

const { getSupabaseMock, rpcMock } = vi.hoisted(() => ({
  getSupabaseMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock("./supabase", () => ({
  getSupabase: getSupabaseMock,
}));

import { approveProfile, banProfile, rejectProfile, unbanProfile } from "./auth";

const profile: Profile = {
  id: "11111111-1111-4111-8111-111111111111",
  matricule: "M123456",
  email: "agent@ghrmsa.fr",
  prenom: "Ada",
  nom: "Lovelace",
  fonction: "Infirmier",
  service: "SAU",
  status: "pending",
  role: "user",
  created_at: "2026-01-01T00:00:00.000Z",
  approved_at: null,
  approved_by: null,
  banned_at: null,
  ban_reason: null,
};

describe("actions admin atomiques", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    getSupabaseMock.mockReset();
    getSupabaseMock.mockReturnValue({ rpc: rpcMock });
    rpcMock.mockResolvedValue({ error: null });
  });

  test("approveProfile appelle la RPC SQL d'audit atomique", async () => {
    await expect(approveProfile(profile, "admin-id")).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    expect(rpcMock).toHaveBeenCalledWith("admin_approve_profile", {
      p_target_profile_id: profile.id,
    });
  });

  test("rejectProfile appelle la RPC SQL sans mutation directe client", async () => {
    await expect(rejectProfile(profile, "admin-id")).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    expect(rpcMock).toHaveBeenCalledWith("admin_reject_profile", {
      p_target_profile_id: profile.id,
    });
  });

  test("banProfile transmet le motif a la RPC SQL", async () => {
    await expect(banProfile(profile, "Compte doublon", "admin-id")).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    expect(rpcMock).toHaveBeenCalledWith("admin_ban_profile", {
      p_target_profile_id: profile.id,
      p_reason: "Compte doublon",
    });
  });

  test("unbanProfile appelle la RPC SQL d'audit atomique", async () => {
    await expect(unbanProfile(profile, "admin-id")).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    expect(rpcMock).toHaveBeenCalledWith("admin_unban_profile", {
      p_target_profile_id: profile.id,
    });
  });

  test("propage les erreurs RPC", async () => {
    rpcMock.mockResolvedValue({ error: { message: "admin_mfa_required" } });
    await expect(approveProfile(profile, "admin-id")).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining("admin_mfa_required"),
    });
  });
});
