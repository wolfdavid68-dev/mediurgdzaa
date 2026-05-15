import type { Profile } from "./auth";

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

// Accès au global `localStorage` (convention du projet, cf. userStorage.ts),
// chaque opération protégée par try/catch (mode privé, quota, indispo).
export const cacheProfile = (profile: Profile): void => {
  try {
    const entry: CachedEntry = { id: profile.id, profile, at: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    // Best-effort : quota dépassé / storage indisponible → on ignore.
  }
};

export const getCachedProfile = (userId: string): Profile | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedEntry;
    return entry && entry.id === userId ? entry.profile : null;
  } catch {
    return null;
  }
};

export const clearCachedProfile = (): void => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
};
