import { render, waitFor } from "@testing-library/react";

// Mock complet de auth.ts : aucune dépendance Supabase en test. On vérifie
// surtout la régression « double fetch au montage » (cf. dedup) : le tab
// initial "pending" ne doit déclencher qu'UN appel fetchProfilesByStatus.
const { fetchProfilesByStatus } = vi.hoisted(() => ({
  fetchProfilesByStatus: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}));
vi.mock("../../../lib/auth", () => ({
  fetchProfilesByStatus,
  approveProfile: vi.fn().mockResolvedValue({ ok: true }),
  rejectProfile: vi.fn().mockResolvedValue({ ok: true }),
  banProfile: vi.fn().mockResolvedValue({ ok: true }),
  unbanProfile: vi.fn().mockResolvedValue({ ok: true }),
  logout: vi.fn().mockResolvedValue(undefined),
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
});
