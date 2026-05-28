import type { Session, User } from "@supabase/supabase-js";
import { clearCachedProfile } from "./profileCache";

// API d'authentification haut-niveau pour MediURG. Toute la logique est
// regroupée ici : signup, login, logout, fetch profile, actions admin.
// Les composants UI (LoginScreen, AdminDashboard…) consomment ces fonctions
// sans connaître Supabase directement → faciliter un éventuel changement
// de backend (Firebase, Auth0) plus tard.

export const MATRICULE_REGEX = /^M\d{6}$/;
export const EMAIL_DOMAIN = "@ghrmsa.fr";

const getSupabaseClient = async () => {
  const { getSupabase } = await import("./supabase");
  return getSupabase();
};

// ─── Types métier ────────────────────────────────────────────
export type ProfileStatus = "pending" | "active" | "banned";
type ProfileRole = "user" | "admin";

export type Profile = {
  id: string; // uuid Supabase
  matricule: string; // M + 6 chiffres
  email: string;
  prenom: string;
  nom: string;
  fonction: string;
  service: string;
  status: ProfileStatus;
  role: ProfileRole;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  banned_at: string | null;
  ban_reason: string | null;
};

type AdminAuditAction = "approve" | "reject" | "ban" | "unban";
type AdminAuditTarget = Pick<Profile, "id" | "matricule" | "email" | "prenom" | "nom">;

export type SignupPayload = {
  matricule: string;
  email: string;
  password: string;
  prenom: string;
  nom: string;
  fonction: string;
  service: string;
};

// ─── Validation ──────────────────────────────────────────────
export const isValidMatricule = (m: string): boolean => MATRICULE_REGEX.test(m);

const normalizeFunctionLabel = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const isStudentFunction = (fonction: string): boolean => {
  const normalized = normalizeFunctionLabel(fonction);
  if (["esi", "etudiant ide", "etudiant infirmier", "etudiant as"].includes(normalized)) {
    return true;
  }
  return /\betudiant\b/.test(normalized) && /\b(as|esi|ide|infirmier)\b/.test(normalized);
};

export const isMedicalFunction = (fonction: string): boolean => {
  const normalized = normalizeFunctionLabel(fonction);
  return /\b(medecin|interne|pharmacien|pharmacienne)\b/.test(normalized);
};

export const isAsFunction = (fonction: string): boolean => {
  const normalized = normalizeFunctionLabel(fonction);
  return (
    normalized === "as" ||
    /\baide soignant\b/.test(normalized) ||
    /\baide soignante\b/.test(normalized)
  );
};

export const isIdeFunction = (fonction: string): boolean => {
  const normalized = normalizeFunctionLabel(fonction);
  return (
    normalized === "ide" || /\binfirmier\b/.test(normalized) || /\binfirmiere\b/.test(normalized)
  );
};

export const isCadreFunction = (fonction: string): boolean => {
  const normalized = normalizeFunctionLabel(fonction);
  return /\bcadre\b/.test(normalized);
};

export const hasAdminAccess = (profile: Pick<Profile, "role" | "fonction">): boolean =>
  profile.role === "admin" || isCadreFunction(profile.fonction);

// Whitelist optionnelle : emails admins externes au domaine @ghrmsa.fr.
// Renseigner VITE_ADMIN_EMAILS dans .env.local (séparés par virgules) pour
// permettre à un admin GHR ayant un email perso de s'inscrire pendant le
// rodage. À retirer / vider quand tous les admins auront un compte
// @ghrmsa.fr officiel.
const adminEmailsWhitelist = (): string[] => {
  const raw = (import.meta.env.VITE_ADMIN_EMAILS as string | undefined) ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
};

export const isValidEmail = (e: string): boolean => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return false;
  const lower = e.toLowerCase();
  if (lower.endsWith(EMAIL_DOMAIN)) return true;
  return adminEmailsWhitelist().includes(lower);
};

export const isValidEmailForFunction = (email: string, fonction: string): boolean => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  return isStudentFunction(fonction) || isValidEmail(email);
};

export const isValidPassword = (p: string): boolean => p.length >= 8;

// Score de force du mot de passe (0-5) selon : longueur ≥8, majuscule,
// chiffre, caractère spécial, longueur ≥12. Affiché en barres dans Register.
export const passwordStrength = (p: string): number => {
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (p.length >= 12) score++;
  return score;
};

// ─── Result type pour les opérations qui peuvent échouer ────
// `kind` (optionnel) discrimine la cause d'échec — utilisé par le
// fallback offline (cf. AuthGate.resolveProfile) : seul `network`
// déclenche le repli sur le profil caché.
type AuthErrorKind = "network" | "notfound" | "config" | "unknown";
export type AuthResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; kind?: AuthErrorKind };

// Heuristique « erreur réseau » : message fetch/timeout OU navigator
// hors-ligne. Volontairement large — pour un outil d'urgence, mieux
// vaut un faux positif (repli sur cache valide) qu'un mur de login.
export const isNetworkError = (e: unknown): boolean => {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg = (
    e instanceof Error
      ? e.message
      : typeof e === "string"
        ? e
        : ((e as { message?: string })?.message ?? "")
  ).toLowerCase();
  return /failed to fetch|fetch failed|networkerror|network error|load failed|timeout|err_(network|internet)|connection|offline/.test(
    msg
  );
};

// ─── Inscription ─────────────────────────────────────────────
// Crée un compte auth Supabase + une ligne profile (status=pending).
// L'admin doit ensuite approuver depuis la console.
export const signup = async (payload: SignupPayload): Promise<AuthResult<{ id: string }>> => {
  const supabase = await getSupabaseClient();
  if (!supabase) return { ok: false, error: "Backend non configuré" };

  if (!isValidMatricule(payload.matricule)) {
    return { ok: false, error: "Matricule invalide (format attendu : M + 6 chiffres)" };
  }
  if (!isValidEmailForFunction(payload.email, payload.fonction)) {
    return {
      ok: false,
      error: `Email invalide (doit se terminer par ${EMAIL_DOMAIN}, sauf comptes étudiants)`,
    };
  }
  if (!isValidPassword(payload.password)) {
    return { ok: false, error: "Mot de passe trop court (min 8 caractères)" };
  }

  // Note : le matricule est stocké dans `user_metadata` au signup, puis
  // copié dans `profiles` par le trigger SQL (cf. docs/AUTH_SETUP.md).
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        matricule: payload.matricule,
        prenom: payload.prenom,
        nom: payload.nom,
        fonction: payload.fonction,
        service: payload.service,
      },
    },
  });
  if (error) return { ok: false, error: humanizeError(error.message) };
  if (!data.user) return { ok: false, error: "Création de compte échouée (aucun user retourné)" };
  return { ok: true, data: { id: data.user.id } };
};

// ─── Login ───────────────────────────────────────────────────
// L'utilisateur saisit matricule + password. Supabase Auth utilise email,
// donc on résout le matricule → email via la table profiles avant le login.
export const login = async (
  matricule: string,
  password: string
): Promise<AuthResult<{ session: Session; profile: Profile }>> => {
  const supabase = await getSupabaseClient();
  if (!supabase) return { ok: false, error: "Backend non configuré" };
  if (!isValidMatricule(matricule)) {
    return { ok: false, error: "Matricule invalide (format : M + 6 chiffres)" };
  }

  // 1. Résolution matricule → email via la fonction SECURITY DEFINER
  //    `matricule_to_email` (ne révèle rien d'autre : juste l'email
  //    associé, et seulement pour le matricule exact passé en argument —
  //    aucune énumération possible, contrairement à l'ancienne vue qui
  //    ouvrait toute la table profiles aux anonymes).
  const { data: email, error: lookupErr } = await supabase.rpc("matricule_to_email", {
    p_matricule: matricule,
  });
  if (lookupErr || !email) {
    return { ok: false, error: "Matricule inconnu ou mot de passe incorrect" };
  }

  // 2. Login standard via email + password
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session) {
    return { ok: false, error: humanizeError(error?.message ?? "Échec du login") };
  }

  // 3. Récupère le profile complet pour vérifier status/role
  const profileResult = await fetchProfile(data.session.user.id);
  if (!profileResult.ok) return { ok: false, error: profileResult.error };

  const profile = profileResult.data;
  // Si le compte n'est pas actif, on déconnecte immédiatement et on renvoie
  // un message explicite (l'AuthGate affichera l'écran adapté).
  if (profile.status === "banned") {
    await supabase.auth.signOut();
    return { ok: false, error: "Compte suspendu. Contactez l'administrateur du service." };
  }
  if (profile.status === "pending") {
    await supabase.auth.signOut();
    return { ok: false, error: "Demande en attente de validation par l'administrateur." };
  }

  return { ok: true, data: { session: data.session, profile } };
};

// ─── Logout ──────────────────────────────────────────────────
export const logout = async (): Promise<void> => {
  // Purge le profil caché : une déconnexion explicite ne doit pas laisser
  // un fallback offline réactivable au prochain lancement.
  clearCachedProfile();
  const supabase = await getSupabaseClient();
  if (!supabase) return;
  // scope:"local" → vide la session locale (localStorage) SANS appel
  // réseau. Le scope "global" par défaut révoque le refresh-token côté
  // serveur → rejette hors-ligne, faisait throw logout() et bloquait la
  // déconnexion (« clic, rien ne se passe »). Pour un outil offline-first
  // la déco doit toujours réussir localement. .catch pour ne jamais throw.
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* hors-ligne / réseau KO : la session locale est tout de même purgée */
  }
};

// ─── Mot de passe oublié — étape 1 : envoi du mail ──────────
// On résout matricule → email puis Supabase envoie un lien magique
// pointant vers `redirectTo`. Au clic, le client Supabase détecte le
// hash `#access_token=...&type=recovery` (cf. detectSessionInUrl) et
// déclenche un event `PASSWORD_RECOVERY` qu'AuthGate écoute pour
// afficher le ResetPasswordScreen.
//
// On retourne toujours { ok: true } même si le matricule est inconnu :
// éviter la fuite d'info (énumération de matricules valides).
export const requestPasswordReset = async (matricule: string): Promise<AuthResult> => {
  const supabase = await getSupabaseClient();
  if (!supabase) return { ok: false, error: "Backend non configuré" };
  if (!isValidMatricule(matricule)) {
    return { ok: false, error: "Matricule invalide (format : M + 6 chiffres)" };
  }

  const { data: email } = await supabase.rpc("matricule_to_email", {
    p_matricule: matricule,
  });

  // Matricule inconnu → on fait semblant de réussir (anti-énumération).
  if (!email) return { ok: true, data: undefined };

  // On préserve `search` pour garder les éventuels paramètres en cours
  // (notamment preview interne) au retour du mail.
  const { origin, pathname, search } = window.location;
  const redirectTo = `${origin}${pathname}${search}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return { ok: false, error: humanizeError(error.message) };
  return { ok: true, data: undefined };
};

// ─── Mot de passe oublié — étape 2 : nouveau mot de passe ────
// Appelé depuis le ResetPasswordScreen après que Supabase a établi
// la session de récupération via le lien email.
export const updatePassword = async (newPassword: string): Promise<AuthResult> => {
  const supabase = await getSupabaseClient();
  if (!supabase) return { ok: false, error: "Backend non configuré" };
  if (!isValidPassword(newPassword)) {
    return { ok: false, error: "Mot de passe trop court (min 8 caractères)" };
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: humanizeError(error.message) };
  return { ok: true, data: undefined };
};

// ─── Récupération de la session courante ─────────────────────
export const getCurrentSession = async (): Promise<Session | null> => {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
};

// ─── Fetch profile par id ────────────────────────────────────
export const fetchProfile = async (userId: string): Promise<AuthResult<Profile>> => {
  const supabase = await getSupabaseClient();
  if (!supabase) return { ok: false, error: "Backend non configuré", kind: "config" };
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      return {
        ok: false,
        error: "Profil introuvable",
        kind: isNetworkError(error) ? "network" : "unknown",
      };
    }
    if (!data) return { ok: false, error: "Profil introuvable", kind: "notfound" };
    return { ok: true, data: data as Profile };
  } catch (e) {
    // supabase-js peut throw (fetch rejeté) plutôt que renvoyer {error}.
    return {
      ok: false,
      error: "Connexion impossible",
      kind: isNetworkError(e) ? "network" : "unknown",
    };
  }
};

// ─── Actions admin ───────────────────────────────────────────
export const fetchProfilesByStatus = async (
  status: ProfileStatus
): Promise<AuthResult<Profile[]>> => {
  const supabase = await getSupabaseClient();
  if (!supabase) return { ok: false, error: "Backend non configuré" };
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });
  if (error) return { ok: false, error: humanizeError(error.message) };
  return { ok: true, data: (data ?? []) as Profile[] };
};

const logAdminAction = async (
  actorId: string,
  target: AdminAuditTarget,
  action: AdminAuditAction,
  reason?: string
): Promise<void> => {
  const supabase = await getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.from("admin_audit_events").insert({
      actor_id: actorId,
      target_profile_id: target.id,
      target_matricule: target.matricule,
      target_email: target.email,
      target_prenom: target.prenom,
      target_nom: target.nom,
      action,
      reason: reason || null,
    });
  } catch {
    // Best-effort : l'audit ne doit pas bloquer une action urgente si la table
    // n'a pas encore été déployée ou si le réseau tombe après la mutation.
  }
};

export const approveProfile = async (profile: Profile, actorId: string): Promise<AuthResult> => {
  const supabase = await getSupabaseClient();
  if (!supabase) return { ok: false, error: "Backend non configuré" };
  const { error } = await supabase
    .from("profiles")
    .update({
      status: "active",
      approved_at: new Date().toISOString(),
      approved_by: actorId,
    })
    .eq("id", profile.id);
  if (error) return { ok: false, error: humanizeError(error.message) };
  await logAdminAction(actorId, profile, "approve");
  return { ok: true, data: undefined };
};

export const rejectProfile = async (profile: Profile, actorId: string): Promise<AuthResult> => {
  const supabase = await getSupabaseClient();
  if (!supabase) return { ok: false, error: "Backend non configuré" };
  // Reject = on supprime le profile (l'auth.user reste mais sans profile,
  // il ne peut plus se login car matricule_to_email ne le trouve plus).
  const { error } = await supabase.from("profiles").delete().eq("id", profile.id);
  if (error) return { ok: false, error: humanizeError(error.message) };
  await logAdminAction(actorId, profile, "reject");
  return { ok: true, data: undefined };
};

export const banProfile = async (
  profile: Profile,
  reason: string,
  actorId: string
): Promise<AuthResult> => {
  const supabase = await getSupabaseClient();
  if (!supabase) return { ok: false, error: "Backend non configuré" };
  const { error } = await supabase
    .from("profiles")
    .update({
      status: "banned",
      banned_at: new Date().toISOString(),
      ban_reason: reason,
    })
    .eq("id", profile.id);
  if (error) return { ok: false, error: humanizeError(error.message) };
  await logAdminAction(actorId, profile, "ban", reason);
  return { ok: true, data: undefined };
};

export const unbanProfile = async (profile: Profile, actorId: string): Promise<AuthResult> => {
  const supabase = await getSupabaseClient();
  if (!supabase) return { ok: false, error: "Backend non configuré" };
  const { error } = await supabase
    .from("profiles")
    .update({
      status: "active",
      banned_at: null,
      ban_reason: null,
    })
    .eq("id", profile.id);
  if (error) return { ok: false, error: humanizeError(error.message) };
  await logAdminAction(actorId, profile, "unban");
  return { ok: true, data: undefined };
};

// ─── Subscribe aux changements de session ───────────────────
// Permet à AuthGate de re-render quand l'user se logout depuis un autre
// onglet, ou quand le token expire. `onRecovery` est appelé quand le
// client détecte un retour depuis un lien « mot de passe oublié »
// (event `PASSWORD_RECOVERY`) — dans ce cas, AuthGate doit afficher
// le ResetPasswordScreen avant tout autre routing.
export const onAuthStateChange = (
  callback: (user: User | null) => void,
  onRecovery?: () => void
) => {
  let active = true;
  let unsubscribe: (() => void) | undefined;
  getSupabaseClient().then((supabase) => {
    if (!active || !supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        onRecovery?.();
        return;
      }
      callback(session?.user ?? null);
    });
    unsubscribe = () => data.subscription.unsubscribe();
  });
  return () => {
    active = false;
    unsubscribe?.();
  };
};

// ─── Utils ───────────────────────────────────────────────────
// Traduit les messages d'erreur Supabase (anglais) en français lisible.
const humanizeError = (msg: string): string => {
  if (/invalid login credentials/i.test(msg)) {
    return "Matricule inconnu ou mot de passe incorrect";
  }
  if (/email not confirmed/i.test(msg)) {
    return "Email non confirmé. Vérifie ta boîte mail.";
  }
  if (/user already registered/i.test(msg)) {
    return "Un compte existe déjà avec cet email ou ce matricule.";
  }
  if (/password should be at least/i.test(msg)) {
    return "Mot de passe trop court (min 8 caractères).";
  }
  return msg;
};
