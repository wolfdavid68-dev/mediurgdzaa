import type { Session, User } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

// API d'authentification haut-niveau pour MediURG. Toute la logique est
// regroupée ici : signup, login, logout, fetch profile, actions admin.
// Les composants UI (LoginScreen, AdminDashboard…) consomment ces fonctions
// sans connaître Supabase directement → faciliter un éventuel changement
// de backend (Firebase, Auth0) plus tard.

export const MATRICULE_REGEX = /^M\d{6}$/;
export const EMAIL_DOMAIN = "@ghrmsa.fr";

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
export type AuthResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

// ─── Inscription ─────────────────────────────────────────────
// Crée un compte auth Supabase + une ligne profile (status=pending).
// L'admin doit ensuite approuver depuis la console.
export const signup = async (payload: SignupPayload): Promise<AuthResult<{ id: string }>> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Backend non configuré" };

  if (!isValidMatricule(payload.matricule)) {
    return { ok: false, error: "Matricule invalide (format attendu : M + 6 chiffres)" };
  }
  if (!isValidEmail(payload.email)) {
    return { ok: false, error: `Email invalide (doit se terminer par ${EMAIL_DOMAIN})` };
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
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Backend non configuré" };
  if (!isValidMatricule(matricule)) {
    return { ok: false, error: "Matricule invalide (format : M + 6 chiffres)" };
  }

  // 1. Résolution matricule → email via la vue publique `matricule_lookup`
  //    (ne révèle rien de sensible : juste l'email associé pour le login).
  const { data: lookup, error: lookupErr } = await supabase
    .from("matricule_lookup")
    .select("email")
    .eq("matricule", matricule)
    .maybeSingle();
  if (lookupErr || !lookup?.email) {
    return { ok: false, error: "Matricule inconnu ou mot de passe incorrect" };
  }

  // 2. Login standard via email + password
  const { data, error } = await supabase.auth.signInWithPassword({
    email: lookup.email,
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
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
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
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Backend non configuré" };
  if (!isValidMatricule(matricule)) {
    return { ok: false, error: "Matricule invalide (format : M + 6 chiffres)" };
  }

  const { data: lookup } = await supabase
    .from("matricule_lookup")
    .select("email")
    .eq("matricule", matricule)
    .maybeSingle();

  // Matricule inconnu → on fait semblant de réussir (anti-énumération).
  if (!lookup?.email) return { ok: true, data: undefined };

  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.resetPasswordForEmail(lookup.email, { redirectTo });
  if (error) return { ok: false, error: humanizeError(error.message) };
  return { ok: true, data: undefined };
};

// ─── Mot de passe oublié — étape 2 : nouveau mot de passe ────
// Appelé depuis le ResetPasswordScreen après que Supabase a établi
// la session de récupération via le lien email.
export const updatePassword = async (newPassword: string): Promise<AuthResult> => {
  const supabase = getSupabase();
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
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
};

// ─── Fetch profile par id ────────────────────────────────────
export const fetchProfile = async (userId: string): Promise<AuthResult<Profile>> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Backend non configuré" };
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Profil introuvable" };
  return { ok: true, data: data as Profile };
};

// ─── Actions admin ───────────────────────────────────────────
export const fetchProfilesByStatus = async (
  status: ProfileStatus
): Promise<AuthResult<Profile[]>> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Backend non configuré" };
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });
  if (error) return { ok: false, error: humanizeError(error.message) };
  return { ok: true, data: (data ?? []) as Profile[] };
};

export const approveProfile = async (profileId: string): Promise<AuthResult> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Backend non configuré" };
  const { error } = await supabase
    .from("profiles")
    .update({
      status: "active",
      approved_at: new Date().toISOString(),
    })
    .eq("id", profileId);
  if (error) return { ok: false, error: humanizeError(error.message) };
  return { ok: true, data: undefined };
};

export const rejectProfile = async (profileId: string): Promise<AuthResult> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Backend non configuré" };
  // Reject = on supprime le profile (l'auth.user reste mais sans profile,
  // il ne peut plus se login car notre login resolve via matricule_lookup).
  const { error } = await supabase.from("profiles").delete().eq("id", profileId);
  if (error) return { ok: false, error: humanizeError(error.message) };
  return { ok: true, data: undefined };
};

export const banProfile = async (profileId: string, reason: string): Promise<AuthResult> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Backend non configuré" };
  const { error } = await supabase
    .from("profiles")
    .update({
      status: "banned",
      banned_at: new Date().toISOString(),
      ban_reason: reason,
    })
    .eq("id", profileId);
  if (error) return { ok: false, error: humanizeError(error.message) };
  return { ok: true, data: undefined };
};

export const unbanProfile = async (profileId: string): Promise<AuthResult> => {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Backend non configuré" };
  const { error } = await supabase
    .from("profiles")
    .update({
      status: "active",
      banned_at: null,
      ban_reason: null,
    })
    .eq("id", profileId);
  if (error) return { ok: false, error: humanizeError(error.message) };
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
  const supabase = getSupabase();
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      onRecovery?.();
      return;
    }
    callback(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
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
