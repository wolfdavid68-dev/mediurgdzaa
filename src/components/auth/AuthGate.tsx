import { useEffect, useState, type ReactNode } from "react";
import {
  fetchProfile,
  getCurrentSession,
  hasAdminAccess,
  onAuthStateChange,
  type Profile,
} from "../../lib/auth";
import { cacheProfile, getCachedProfile, getLastCachedProfile } from "../../lib/profileCache";
import { isAuthEnabled } from "../../lib/featureFlags";
import { useIsMobile } from "../../lib/useIsMobile";
import { migrateAnonymousData } from "../../lib/userStorage";
import { AuthProfileProvider } from "../../lib/authProfile";
import { DRUGS } from "../../data/drugs";
import ForgotPasswordScreen from "./ForgotPasswordScreen";
import LoginScreen from "./LoginScreen";
import RegisterScreen from "./RegisterScreen";
import ResetPasswordScreen from "./ResetPasswordScreen";
import { BannedScreen, PendingApprovalScreen } from "./StatusScreens";
import MobileLoginScreen from "./mobile/MobileLoginScreen";
import MobileRegisterScreen from "./mobile/MobileRegisterScreen";
import MobileForgotPasswordScreen from "./mobile/MobileForgotPasswordScreen";
import MobileResetPasswordScreen from "./mobile/MobileResetPasswordScreen";
import { MobileBannedScreen, MobilePendingScreen } from "./mobile/MobileStatusScreens";
// Dashboards admin en import STATIQUE (comme tout le reste) : pas de chunk
// lazy qui pourrait échouer à fetch hors-ligne. Cf. App.tsx.
import AdminDashboard from "./AdminDashboard";
import MobileAdminDashboard from "./mobile/MobileAdminDashboard";

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
//   - Session + profile.status='active' + admin access → toggle App ↔ AdminDashboard
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

// Récupère le profil avec tolérance hors-ligne (outil d'urgence offline-first).
// Garantie « appairé une fois → plus jamais de login sauf déconnexion » :
// - succès → on met le profil en cache et on le renvoie ;
// - ÉCHEC, quelle qu'en soit la cause (réseau, serveur down, erreur non
//   classée…) → on retombe sur le profil caché de cet user s'il existe.
//   Seul un appareil JAMAIS appairé (aucun cache) tombe sur le login.
// Compromis assumé : un compte banni reste détecté (le fetch réussit et
// renvoie status:banned → écran suspendu) ; seul un compte SUPPRIMÉ
// côté serveur garderait l'accès via cache jusqu'à purge (cf. AUTH_SETUP).
export const resolveProfile = async (userId: string): Promise<Profile | null> => {
  const result = await fetchProfile(userId);
  if (result.ok) {
    cacheProfile(result.data);
    return result.data;
  }
  return getCachedProfile(userId);
};

const AuthGate = ({ children }: Props) => {
  const enabled = isAuthEnabled();
  const isMobile = useIsMobile();

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
        // Pas de session : soit jamais connecté, soit token expiré ET
        // refresh impossible hors-ligne. Si on est offline ET que
        // l'appareil a déjà été appairé (un profil est caché), on
        // autorise l'usage offline plutôt qu'un mur de login infranchissable.
        const offline = typeof navigator !== "undefined" && navigator.onLine === false;
        setProfile(offline ? getLastCachedProfile() : null);
        setLoading(false);
        return;
      }
      const resolved = await resolveProfile(session.user.id);
      if (cancelled) return;
      if (resolved) setProfile(resolved);
      setLoading(false);
    };
    init();
    const unsub = onAuthStateChange(
      async (user) => {
        if (cancelled) return;
        if (!user) {
          // SIGNED_OUT : déco explicite (logout() a purgé le cache →
          // getLastCachedProfile null → login) OU échec de refresh token
          // hors-ligne (le cache survit → on garde l'accès offline).
          const offline = typeof navigator !== "undefined" && navigator.onLine === false;
          setProfile(offline ? getLastCachedProfile() : null);
          setShowAdmin(false);
          return;
        }
        const resolved = await resolveProfile(user.id);
        if (!cancelled && resolved) setProfile(resolved);
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
  // On extrait id + status en primitifs : la migration ne doit se rejouer
  // que si on change d'utilisateur ou qu'il passe « active », pas à chaque
  // ré-hydratation de l'objet profile (nouvelle référence) — et ça garde
  // les déps exhaustives sans désactiver de règle (React Compiler-friendly).
  const profileId = profile?.id;
  const profileStatus = profile?.status;
  useEffect(() => {
    if (!enabled || !profileId || profileStatus !== "active") return;
    const ids = (DRUGS as Array<{ id: number }>).map((d) => d.id);
    migrateAnonymousData(profileId, ids);
  }, [enabled, profileId, profileStatus]);

  // Accès admin par geste caché : appui long sur le logo (App.tsx) émet
  // `mediurg:open-admin`. On ouvre la console — le rendu ne l'affiche que
  // si le profil a un accès admin (no-op pour un non-admin). Remplace
  // l'ancienne roue crantée flottante.
  useEffect(() => {
    const open = () => setShowAdmin(true);
    window.addEventListener("mediurg:open-admin", open);
    return () => window.removeEventListener("mediurg:open-admin", open);
  }, []);

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
    const onDone = () => {
      setRecovering(false);
      setProfile(null);
      setScreen("login");
    };
    return isMobile ? (
      <MobileResetPasswordScreen onDone={onDone} />
    ) : (
      <ResetPasswordScreen onDone={onDone} />
    );
  }

  // Pas de session → écrans login / register / forgot.
  // Sous 600px : design mobile dédié (handoff). Forgot/Reset n'ont pas de
  // maquette mobile spécifiée → on garde l'écran responsive desktop.
  if (!profile) {
    if (screen === "register") {
      return isMobile ? (
        <MobileRegisterScreen onGoToLogin={() => setScreen("login")} />
      ) : (
        <RegisterScreen onGoToLogin={() => setScreen("login")} />
      );
    }
    if (screen === "forgot") {
      const onBackToLogin = () => {
        setHashError(null);
        setScreen("login");
      };
      return isMobile ? (
        <MobileForgotPasswordScreen onBackToLogin={onBackToLogin} initialError={hashError} />
      ) : (
        <ForgotPasswordScreen onBackToLogin={onBackToLogin} initialError={hashError} />
      );
    }
    const loginProps = {
      onLoggedIn: () => {
        /* le useEffect onAuthStateChange recharge le profile */
      },
      onGoToRegister: () => setScreen("register"),
      onGoToForgot: () => setScreen("forgot"),
    };
    return isMobile ? <MobileLoginScreen {...loginProps} /> : <LoginScreen {...loginProps} />;
  }

  // Session + profile pending
  if (profile.status === "pending") {
    return isMobile ? (
      <MobilePendingScreen onLogout={() => setProfile(null)} />
    ) : (
      <PendingApprovalScreen onLogout={() => setProfile(null)} />
    );
  }

  // Session + profile banned
  if (profile.status === "banned") {
    return isMobile ? (
      <MobileBannedScreen onLogout={() => setProfile(null)} reason={profile.ban_reason} />
    ) : (
      <BannedScreen onLogout={() => setProfile(null)} reason={profile.ban_reason} />
    );
  }

  // Active : si admin et showAdmin → console, sinon → app normale
  if (hasAdminAccess(profile) && showAdmin) {
    const adminProps = {
      currentUserName: `${profile.prenom} ${profile.nom}`,
      onLogout: () => setProfile(null),
      onExitAdmin: () => setShowAdmin(false),
    };
    return isMobile ? <MobileAdminDashboard {...adminProps} /> : <AdminDashboard {...adminProps} />;
  }

  // App normale. L'accès admin se fait par appui long sur le logo
  // (cf. useEffect "mediurg:open-admin") — plus de bouton flottant.
  return <AuthProfileProvider value={profile}>{children}</AuthProfileProvider>;
};

export default AuthGate;
