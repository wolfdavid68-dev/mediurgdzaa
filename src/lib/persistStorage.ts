// Demande à l'OS/navigateur de NE PAS évincer le stockage de l'app.
//
// Sans ça, iOS/Chromium peuvent purger localStorage (PWA non installée
// inactive ~7 j, pression disque…) → on perdrait la session Supabase ET
// le cache profil → re-login forcé. Pour un outil d'urgence offline-first
// c'est inacceptable : on réclame le bucket « persistant ».
//
// Best-effort : l'API n'existe pas partout, et le navigateur peut refuser
// (Safari l'accorde surtout en PWA installée / après engagement user).
// Fire-and-forget, jamais bloquant, jamais throw.

export const requestPersistentStorage = async (): Promise<boolean> => {
  try {
    if (
      typeof navigator === "undefined" ||
      !navigator.storage ||
      typeof navigator.storage.persist !== "function"
    ) {
      return false;
    }
    // Déjà persistant ? on évite un appel inutile.
    if (typeof navigator.storage.persisted === "function") {
      const already = await navigator.storage.persisted();
      if (already) return true;
    }
    return await navigator.storage.persist();
  } catch {
    return false;
  }
};
