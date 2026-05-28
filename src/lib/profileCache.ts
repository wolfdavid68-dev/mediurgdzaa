import type { Profile } from "./auth";
import { safeGetJson, safeRemoveItem, safeSetJson } from "./safeStorage";

// Cache du profil auth en localStorage pour l'usage HORS-LIGNE.
//
// MediURG est un outil d'urgence offline-first : une fois l'appareil
// connecté une fois (en ligne), il doit fonctionner indéfiniment sans
// réseau. Or `fetchProfile` est une requête DB Supabase qui échoue
// offline → sans ce cache, AuthGate renverrait un utilisateur déjà
// authentifié vers l'écran de login qu'il ne peut pas franchir.
//
// On mémorise donc le dernier profil connu (clé indexée par user id) et
// AuthGate y retombe quand le fetch échoue ALORS qu'on est hors-ligne.
// Compromis assumé : un compte suspendu pendant que l'appareil est
// hors-ligne conserve l'accès jusqu'au retour du réseau (le contenu
// clinique prime sur l'enforcement temps réel pour un outil d'urgence).

const KEY = "mediurg-profile-cache-v1";

type CachedEntry = { id: string; profile: Profile; at: number };

export const cacheProfile = (profile: Profile): void => {
  const entry: CachedEntry = { id: profile.id, profile, at: Date.now() };
  safeSetJson(KEY, entry);
};

export const getCachedProfile = (userId: string): Profile | null => {
  const entry = safeGetJson<CachedEntry | null>(KEY, null);
  return entry && entry.id === userId ? entry.profile : null;
};

// Dernier profil caché SANS connaître le user id — pour le cas « session
// expirée hors-ligne » : getSession() renvoie null (refresh impossible
// offline), on n'a donc pas d'id, mais l'appareil a déjà été appairé
// (un cache existe) → on autorise l'usage offline. Si aucun cache →
// null → mur de login (appareil jamais appairé), conforme au modèle.
export const getLastCachedProfile = (): Profile | null => {
  const entry = safeGetJson<CachedEntry | null>(KEY, null);
  return entry?.profile ?? null;
};

export const clearCachedProfile = (): void => {
  safeRemoveItem(KEY);
};
