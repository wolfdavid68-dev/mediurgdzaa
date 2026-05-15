import { render, screen, waitFor } from "@testing-library/react";
import type { Profile } from "../lib/auth";

// Garantie offline-first de bout en bout : avec auth ACTIVÉE, un soignant
// déjà appairé mais hors-réseau doit voir l'APP (contenu clinique), pas
// le mur de login — via le profil caché.

const activeProfile = {
  id: "u1",
  matricule: "M402100",
  email: "x@ghrmsa.fr",
  prenom: "C",
  nom: "B",
  fonction: "Médecin urgentiste",
  service: "SAU",
  status: "active",
  role: "user",
  created_at: "2024-01-01",
  approved_at: null,
  approved_by: null,
  banned_at: null,
  ban_reason: null,
} as Profile;

const h = vi.hoisted(() => ({
  isAuthEnabled: vi.fn(() => true),
  getCurrentSession: vi.fn(),
  fetchProfile: vi.fn(),
  onAuthStateChange: vi.fn(() => () => {}),
  getCachedProfile: vi.fn(),
  getLastCachedProfile: vi.fn(),
}));

vi.mock("../lib/featureFlags", () => ({ isAuthEnabled: h.isAuthEnabled }));
vi.mock("../lib/useIsMobile", () => ({ useIsMobile: () => false }));
vi.mock("../lib/userStorage", () => ({ migrateAnonymousData: vi.fn() }));
vi.mock("../lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/auth")>();
  return {
    ...actual,
    getCurrentSession: h.getCurrentSession,
    fetchProfile: h.fetchProfile,
    onAuthStateChange: h.onAuthStateChange,
  };
});
vi.mock("../lib/profileCache", () => ({
  cacheProfile: vi.fn(),
  getCachedProfile: h.getCachedProfile,
  getLastCachedProfile: h.getLastCachedProfile,
  clearCachedProfile: vi.fn(),
}));

import AuthGate from "./auth/AuthGate";

const setOnline = (v: boolean) =>
  Object.defineProperty(navigator, "onLine", { configurable: true, value: v });

describe("AuthGate — garantie offline (auth activée)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.isAuthEnabled.mockReturnValue(true);
    h.onAuthStateChange.mockReturnValue(() => {});
    setOnline(true);
  });

  test("session valide + fetch profil échoue (réseau) → APP via cache, pas login", async () => {
    h.getCurrentSession.mockResolvedValue({ user: { id: "u1" } });
    h.fetchProfile.mockResolvedValue({ ok: false, error: "x", kind: "network" });
    h.getCachedProfile.mockReturnValue(activeProfile);

    render(
      <AuthGate>
        <div>CONTENU_APP</div>
      </AuthGate>
    );

    await waitFor(() => expect(screen.getByText("CONTENU_APP")).toBeInTheDocument());
    expect(screen.queryByText(/Se connecter/i)).not.toBeInTheDocument();
  });

  test("aucune session + hors-ligne + appareil appairé → APP via dernier cache", async () => {
    h.getCurrentSession.mockResolvedValue(null);
    h.getLastCachedProfile.mockReturnValue(activeProfile);
    setOnline(false);

    render(
      <AuthGate>
        <div>CONTENU_APP</div>
      </AuthGate>
    );

    await waitFor(() => expect(screen.getByText("CONTENU_APP")).toBeInTheDocument());
  });

  test("aucune session + en ligne (jamais appairé) → écran login", async () => {
    h.getCurrentSession.mockResolvedValue(null);
    h.getLastCachedProfile.mockReturnValue(null);
    setOnline(true);

    render(
      <AuthGate>
        <div>CONTENU_APP</div>
      </AuthGate>
    );

    await waitFor(() => expect(screen.getByText(/Se connecter/i)).toBeInTheDocument());
    expect(screen.queryByText("CONTENU_APP")).not.toBeInTheDocument();
  });
});
