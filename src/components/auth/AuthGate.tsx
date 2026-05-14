import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { fetchProfile, getCurrentSession, onAuthStateChange, type Profile } from "../../lib/auth";
import { isAuthEnabled } from "../../lib/featureFlags";
import { migrateAnonymousData } from "../../lib/userStorage";
import ForgotPasswordScreen from "./ForgotPasswordScreen";
import LoginScreen from "./LoginScreen";
import RegisterScreen from "./RegisterScreen";
import ResetPasswordScreen from "./ResetPasswordScreen";
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

type AuthScreen = "login" | "register" | "forgot";

type Props = {
  children: ReactNode;
};

// Détecte une erreur de retour Supabase dans le hash, e.g. lien recovery
// expiré : `#error=access_denied&error_code=otp_expired&error_description=...`.
// Retourne un message FR lisible + nettoie l'URL pour ne pas re-déclencher.
const consumeAuthHashError = (): string | null => {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  if (!hash.includes("error=")) return null;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const code = params.get("error_code") ?? "";
  const desc = params.get("error_description") ?? "";
  // Nettoie l'URL (sinon refresh = re-déclenche le toast)
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  if (code === "otp_expired") {
    return "Le lien de réinitialisation a expiré (valable 1 h). Demandez-en un nouveau.";
  }
  if (desc) return decodeURIComponent(desc.replace(/\+/g, " "));
  return "Lien d'authentification invalide ou expiré.";
};

const AuthGate = ({ children }: Props) => {
  const enabled = isAuthEnabled();

  // Tous les hooks DOIVENT être appelés avant tout return conditionnel
  // (règle React). On les appelle inconditionnellement ; quand enabled=false,
  // ils sont juste no-op (pas de network call).
  // L'init est lazy pour éviter de toucher window.location avant le mount
  // côté SSR (pas notre cas mais propre).
  const [screen, setScreen] = useState<AuthScreen>(() =>
    typeof window !== "undefined" && window.location.hash.includes("error=") ? "forgot" : "login"
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [hashError, setHashError] = useState<string | null>(() => consumeAuthHashError());

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
    const unsub = onAuthStateChange(
      async (user) => {
        if (cancelled) return;
        if (!user) {
          setProfile(null);
          setShowAdmin(false);
          return;
        }
        const result = await fetchProfile(user.id);
        if (!cancelled && result.ok) setProfile(result.data);
      },
      () => {
        // Lien « mot de passe oublié » cliqué : on bascule sur le ResetPasswordScreen
        // avant tout autre routing (même si l'user a une session active).
        if (!cancelled) setRecovering(true);
      }
    );
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

  // Recovery (PASSWORD_RECOVERY) prend la priorité sur tout autre routing.
  if (recovering) {
    return (
      <ResetPasswordScreen
        onDone={() => {
          setRecovering(false);
          setProfile(null);
          setScreen("login");
        }}
      />
    );
  }

  // Pas de session → écrans login / register / forgot
  if (!profile) {
    if (screen === "register") {
      return <RegisterScreen onGoToLogin={() => setScreen("login")} />;
    }
    if (screen === "forgot") {
      return (
        <ForgotPasswordScreen
          onBackToLogin={() => {
            setHashError(null);
            setScreen("login");
          }}
          initialError={hashError}
        />
      );
    }
    return (
      <LoginScreen
        onLoggedIn={() => {
          /* le useEffect onAuthStateChange recharge le profile */
        }}
        onGoToRegister={() => setScreen("register")}
        onGoToForgot={() => setScreen("forgot")}
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
