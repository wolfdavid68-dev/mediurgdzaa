import { fireEvent, render, screen, waitFor } from "@testing-library/react";

// Mock complet de auth.ts : aucune dépendance Supabase en test. On vérifie
// surtout la régression « double fetch au montage » (cf. dedup) : le tab
// initial "pending" ne doit déclencher qu'UN appel fetchProfilesByStatus.
const { fetchProfilesByStatus, logoutMock } = vi.hoisted(() => ({
  fetchProfilesByStatus: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  logoutMock: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../../lib/auth", () => ({
  fetchProfilesByStatus,
  approveProfile: vi.fn().mockResolvedValue({ ok: true }),
  rejectProfile: vi.fn().mockResolvedValue({ ok: true }),
  banProfile: vi.fn().mockResolvedValue({ ok: true }),
  unbanProfile: vi.fn().mockResolvedValue({ ok: true }),
  logout: logoutMock,
}));

import MobileAdminDashboard from "./MobileAdminDashboard";

describe("MobileAdminDashboard — dedup fetch au montage", () => {
  beforeEach(() => fetchProfilesByStatus.mockClear());

  test("un seul fetch (pending) au montage, pas de double appel", async () => {
    render(
      <MobileAdminDashboard currentUserName="Admin Test" onLogout={vi.fn()} onExitAdmin={vi.fn()} />
    );
    await waitFor(() => expect(fetchProfilesByStatus).toHaveBeenCalled());
    // Laisse les promesses/effets se stabiliser pour détecter un 2e appel.
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchProfilesByStatus).toHaveBeenCalledTimes(1);
    expect(fetchProfilesByStatus).toHaveBeenCalledWith("pending");
  });

  // Régression : clic « Se déconnecter » DOIT appeler onLogout même si
  // logout() rejette (ex. signOut hors-ligne) — sinon « rien ne se passe ».
  test("déconnexion appelle onLogout même si logout() rejette (offline)", async () => {
    logoutMock.mockRejectedValueOnce(new Error("network down"));
    const onLogout = vi.fn();
    render(
      <MobileAdminDashboard
        currentUserName="Admin Test"
        onLogout={onLogout}
        onExitAdmin={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Se déconnecter/i }));
    await waitFor(() => expect(onLogout).toHaveBeenCalled());
  });
});
