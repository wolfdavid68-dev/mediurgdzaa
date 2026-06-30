import { act, render, screen, waitFor } from "@testing-library/react";
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

type AuthStateCallback = (user: { id: string } | null) => void | Promise<void>;
type AuthRecoveryCallback = () => void;

const h = vi.hoisted(() => ({
  isAuthEnabled: vi.fn(() => true),
  getCurrentSession: vi.fn(),
  fetchProfile: vi.fn(),
  getAdminMfaStatus: vi.fn(),
  onAuthStateChange: vi.fn(
    (_callback: AuthStateCallback, _onRecovery?: AuthRecoveryCallback) => () => {}
  ),
  authStateCallback: undefined as undefined | AuthStateCallback,
  authRecoveryCallback: undefined as undefined | AuthRecoveryCallback,
  getCachedProfile: vi.fn(),
  getLastCachedProfile: vi.fn(),
  migrateAnonymousData: vi.fn(),
}));

vi.mock("../lib/featureFlags", () => ({ isAuthEnabled: h.isAuthEnabled }));
vi.mock("../lib/useIsMobile", () => ({ useIsMobile: () => false }));
vi.mock("../lib/userStorage", () => ({ migrateAnonymousData: h.migrateAnonymousData }));
vi.mock("./auth/AdminDashboard", () => ({
  default: ({ onLogout }: { onLogout: () => void }) => (
    <div>
      <span>ADMIN_CONSOLE</span>
      <button type="button" onClick={onLogout}>
        Déconnexion admin
      </button>
    </div>
  ),
}));
vi.mock("./auth/mobile/MobileAdminDashboard", () => ({
  default: ({ onLogout }: { onLogout: () => void }) => (
    <div>
      <span>ADMIN_CONSOLE_MOBILE</span>
      <button type="button" onClick={onLogout}>
        Déconnexion admin
      </button>
    </div>
  ),
}));
vi.mock("./auth/LoginScreen", () => ({
  default: () => <div>Se connecter</div>,
}));
vi.mock("./auth/mobile/MobileLoginScreen", () => ({
  default: () => <div>Se connecter</div>,
}));
vi.mock("./auth/ResetPasswordScreen", () => ({
  default: () => <div>RESET_PASSWORD_SCREEN</div>,
}));
vi.mock("./auth/mobile/MobileResetPasswordScreen", () => ({
  default: () => <div>RESET_PASSWORD_SCREEN_MOBILE</div>,
}));
vi.mock("../lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/auth")>();
  return {
    ...actual,
    getCurrentSession: h.getCurrentSession,
    fetchProfile: h.fetchProfile,
    getAdminMfaStatus: h.getAdminMfaStatus,
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
    h.authStateCallback = undefined;
    h.authRecoveryCallback = undefined;
    h.onAuthStateChange.mockImplementation(
      (callback: AuthStateCallback, onRecovery?: AuthRecoveryCallback) => {
        h.authStateCallback = callback;
        h.authRecoveryCallback = onRecovery;
        return () => {};
      }
    );
    h.getAdminMfaStatus.mockResolvedValue({ ok: true, data: { state: "verified" } });
    h.migrateAnonymousData.mockReset();
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

  test("profil pending → accès clinique bloqué et pas de migration locale", async () => {
    h.getCurrentSession.mockResolvedValue({ user: { id: "u1" } });
    h.fetchProfile.mockResolvedValue({
      ok: true,
      data: { ...activeProfile, status: "pending" },
    });

    render(
      <AuthGate>
        <div>CONTENU_APP</div>
      </AuthGate>
    );

    await waitFor(() => expect(screen.getByText(/validation|attente/i)).toBeInTheDocument());
    expect(screen.queryByText("CONTENU_APP")).not.toBeInTheDocument();
    expect(h.migrateAnonymousData).not.toHaveBeenCalled();
  });

  test("profil suspendu → accès clinique bloqué avec motif affiché", async () => {
    h.getCurrentSession.mockResolvedValue({ user: { id: "u1" } });
    h.fetchProfile.mockResolvedValue({
      ok: true,
      data: { ...activeProfile, status: "banned", ban_reason: "Compte test suspendu" },
    });

    render(
      <AuthGate>
        <div>CONTENU_APP</div>
      </AuthGate>
    );

    await waitFor(() => expect(screen.getByText(/Compte test suspendu/i)).toBeInTheDocument());
    expect(screen.queryByText("CONTENU_APP")).not.toBeInTheDocument();
    expect(h.migrateAnonymousData).not.toHaveBeenCalled();
  });

  test("session perdue hors-ligne après appairage → conserve l'accès clinique via cache", async () => {
    h.getCurrentSession.mockResolvedValue({ user: { id: "u1" } });
    h.fetchProfile.mockResolvedValue({ ok: true, data: activeProfile });
    h.getLastCachedProfile.mockReturnValue(activeProfile);

    render(
      <AuthGate>
        <div>CONTENU_APP</div>
      </AuthGate>
    );

    await waitFor(() => expect(screen.getByText("CONTENU_APP")).toBeInTheDocument());
    setOnline(false);
    await act(async () => {
      await h.authStateCallback?.(null);
    });

    expect(screen.getByText("CONTENU_APP")).toBeInTheDocument();
    expect(screen.queryByText(/Se connecter/i)).not.toBeInTheDocument();
  });

  test("session perdue en ligne → revient au login sans utiliser le cache offline", async () => {
    h.getCurrentSession.mockResolvedValue({ user: { id: "u1" } });
    h.fetchProfile.mockResolvedValue({ ok: true, data: activeProfile });
    h.getLastCachedProfile.mockReturnValue(activeProfile);

    render(
      <AuthGate>
        <div>CONTENU_APP</div>
      </AuthGate>
    );

    await waitFor(() => expect(screen.getByText("CONTENU_APP")).toBeInTheDocument());
    setOnline(true);
    await act(async () => {
      await h.authStateCallback?.(null);
    });

    await waitFor(() => expect(screen.getByText(/Se connecter/i)).toBeInTheDocument());
    expect(screen.queryByText("CONTENU_APP")).not.toBeInTheDocument();
  });

  test("retour reset password Supabase → écran de réinitialisation prioritaire", async () => {
    h.getCurrentSession.mockResolvedValue({ user: { id: "u1" } });
    h.fetchProfile.mockResolvedValue({ ok: true, data: activeProfile });

    render(
      <AuthGate>
        <div>CONTENU_APP</div>
      </AuthGate>
    );

    await waitFor(() => expect(screen.getByText("CONTENU_APP")).toBeInTheDocument());
    act(() => {
      h.authRecoveryCallback?.();
    });

    await waitFor(() => expect(screen.getByText("RESET_PASSWORD_SCREEN")).toBeInTheDocument());
    expect(screen.queryByText("CONTENU_APP")).not.toBeInTheDocument();
  });

  test("profil devenu suspendu après reconnexion → bloque l'accès clinique", async () => {
    h.getCurrentSession.mockResolvedValue({ user: { id: "u1" } });
    h.fetchProfile.mockResolvedValueOnce({ ok: true, data: activeProfile }).mockResolvedValueOnce({
      ok: true,
      data: { ...activeProfile, status: "banned", ban_reason: "Suspension RSSI" },
    });

    render(
      <AuthGate>
        <div>CONTENU_APP</div>
      </AuthGate>
    );

    await waitFor(() => expect(screen.getByText("CONTENU_APP")).toBeInTheDocument());
    await act(async () => {
      await h.authStateCallback?.({ id: "u1" });
    });

    await waitFor(() => expect(screen.getByText(/Suspension RSSI/i)).toBeInTheDocument());
    expect(screen.queryByText("CONTENU_APP")).not.toBeInTheDocument();
  });

  test("geste admin ignoré pour un utilisateur non admin", async () => {
    h.getCurrentSession.mockResolvedValue({ user: { id: "u1" } });
    h.fetchProfile.mockResolvedValue({ ok: true, data: activeProfile });

    render(
      <AuthGate>
        <div>CONTENU_APP</div>
      </AuthGate>
    );

    await waitFor(() => expect(screen.getByText("CONTENU_APP")).toBeInTheDocument());
    act(() => window.dispatchEvent(new Event("mediurg:open-admin")));
    expect(screen.queryByText("ADMIN_CONSOLE")).not.toBeInTheDocument();
  });

  test("geste admin ignoré pour un cadre IFSI sans role admin", async () => {
    h.getCurrentSession.mockResolvedValue({ user: { id: "u1" } });
    h.fetchProfile.mockResolvedValue({
      ok: true,
      data: { ...activeProfile, fonction: "Cadre IFSI" },
    });

    render(
      <AuthGate>
        <div>CONTENU_APP</div>
      </AuthGate>
    );

    await waitFor(() => expect(screen.getByText("CONTENU_APP")).toBeInTheDocument());
    act(() => window.dispatchEvent(new Event("mediurg:open-admin")));
    expect(screen.queryByText("ADMIN_CONSOLE")).not.toBeInTheDocument();
  });

  test("geste admin ouvre la console uniquement pour un profil autorisé", async () => {
    h.getCurrentSession.mockResolvedValue({ user: { id: "admin-1" } });
    h.fetchProfile.mockResolvedValue({
      ok: true,
      data: { ...activeProfile, id: "admin-1", role: "admin" },
    });

    render(
      <AuthGate>
        <div>CONTENU_APP</div>
      </AuthGate>
    );

    await waitFor(() => expect(screen.getByText("CONTENU_APP")).toBeInTheDocument());
    act(() => window.dispatchEvent(new Event("mediurg:open-admin")));
    // La console admin est lazy-loadée derrière une vérification MFA asynchrone :
    // sur un runner CI lent, le timeout waitFor par défaut (1 s) peut expirer
    // avant la résolution de l'import dynamique. On laisse plus de marge.
    await waitFor(() => expect(screen.getByText("ADMIN_CONSOLE")).toBeInTheDocument(), {
      timeout: 5000,
    });
  });
});
