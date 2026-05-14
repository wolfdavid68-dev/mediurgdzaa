import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { fetchProfile, getCurrentSession, onAuthStateChange, type Profile } from "../../lib/auth";
import { isAuthEnabled } from "../../lib/featureFlags";
import { migrateAnonymousData } from "../../lib/userStorage";
import LoginScreen from "./LoginScreen";
import RegisterScreen from "./RegisterScreen";
import { BannedScreen, PendingApprovalScreen } from "./StatusScreens";

// AdminDashboard est lazy-loadé : seuls les admins voient cet écran, et
// même pour eux il sort du bundle initial (~10 kB).
const AdminDashboard = lazy(() => import("./AdminDashboard"));

// AuthGate — wrapper qui décide quoi rendre selon l'état d'auth.
//
// Si AUTH_ENABLED=false : rend directement les enfants (App), aucun appel
// Supabase. C'est le mode actuel par défaut (la feature est codée mais
// désactivée tant que le projet Supabase n'est pas configuré).
//
// Si AUTH_ENABLED=true :
//   - Pas de session → LoginScreen / RegisterScreen
//   - Session + profile.status='pending' → PendingApprovalScreen
//   - Session + profile.status='banned' → BannedScreen
//   - Session + profile.status='active' + role='admin' → toggle App ↔ AdminDashboard
//   - Session + profile.status='active' + role='user' → App (les enfants)

type AuthScreen = "login" | "register";

type Props = {
  children: ReactNode;
};

const AuthGate = ({ children }: Props) => {
  const enabled = isAuthEnabled();

  // Tous les hooks DOIVENT être appelés avant tout return conditionnel
  // (règle React). On les appelle inconditionnellement ; quand enabled=false,
  // ils sont juste no-op (pas de network call).
  const [screen, setScreen] = useState<AuthScreen>("login");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const init = async () => {
      const session = await getCurrentSession();
      if (cancelled) return;
      if (!session) {
        setProfile(null);
        setLoading(false);
        return;
      }
      const result = await fetchProfile(session.user.id);
      if (cancelled) return;
      if (result.ok) setProfile(result.data);
      setLoading(false);
    };
    init();
    const unsub = onAuthStateChange(async (user) => {
      if (cancelled) return;
      if (!user) {
        setProfile(null);
        setShowAdmin(false);
        return;
      }
      const result = await fetchProfile(user.id);
      if (!cancelled && result.ok) setProfile(result.data);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [enabled]);

  // Migration des données locales anonymes vers le user au 1er login.
  useEffect(() => {
    if (!enabled || !profile || profile.status !== "active") return;
    // Liste des IDs de drugs connus pour migrer les notes — passe par l'import
    // dynamique pour ne pas charger DRUGS si l'auth est désactivée.
    import("../../data/drugs").then((m) => {
      const ids = (m.DRUGS as Array<{ id: number }>).map((d) => d.id);
      migrateAnonymousData(profile.id, ids);
    });
  }, [enabled, profile?.id, profile?.status]);

  // Mode désactivé → bypass total, l'app fonctionne comme avant.
  if (!enabled) return <>{children}</>;

  // Loading initial (1 round-trip Supabase getSession)
  if (loading) {
    return (
      <div className="auth-stage">
        <div className="auth-loading">
          <span className="auth-spinner" aria-hidden="true" />
          <span>Vérification de la session…</span>
        </div>
      </div>
    );
  }

  // Pas de session → écrans login / register
  if (!profile) {
    if (screen === "register") {
      return <RegisterScreen onGoToLogin={() => setScreen("login")} />;
    }
    return (
      <LoginScreen
        onLoggedIn={() => {
          /* le useEffect onAuthStateChange recharge le profile */
        }}
        onGoToRegister={() => setScreen("register")}
      />
    );
  }

  // Session + profile pending
  if (profile.status === "pending") {
    return <PendingApprovalScreen onLogout={() => setProfile(null)} />;
  }

  // Session + profile banned
  if (profile.status === "banned") {
    return <BannedScreen onLogout={() => setProfile(null)} reason={profile.ban_reason} />;
  }

  // Active : si admin et showAdmin → console, sinon → app normale
  if (profile.role === "admin" && showAdmin) {
    return (
      <Suspense
        fallback={
          <div className="auth-stage">
            <span className="auth-spinner" />
          </div>
        }
      >
        <AdminDashboard
          currentUserName={`${profile.prenom} ${profile.nom}`}
          onLogout={() => setProfile(null)}
          onExitAdmin={() => setShowAdmin(false)}
        />
      </Suspense>
    );
  }

  // App normale — pour les admins, on ajoute un mini bouton qui leur permet
  // d'ouvrir la console. Pour les users normaux, rien à signaler.
  return (
    <>
      {children}
      {profile.role === "admin" && (
        <button
          type="button"
          className="auth-admin-fab"
          onClick={() => setShowAdmin(true)}
          aria-label="Ouvrir la console d'administration"
          title="Console admin"
        >
          ⚙
        </button>
      )}
    </>
  );
};

export default AuthGate;
