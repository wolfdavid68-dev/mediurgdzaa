import { useEffect } from "react";

// Persistent Storage API : demande au navigateur de garantir que le stockage
// de cette origine ne sera PAS évincé en cas de pression disque (cleanup
// automatique quand le device manque d'espace). Critique pour MediURG :
// l'app est utilisée en SAU/SMUR offline, le cache précache (≈ 920 kB +
// localStorage des notes/favoris/historique) ne doit jamais disparaître au
// pire moment.
//
// Comportement navigateur :
//   - PWA installée (display-mode: standalone) : Chrome/Edge accordent
//     automatiquement, sans prompt.
//   - Mode browser tab : le navigateur peut accorder en silence si
//     l'engagement est suffisant (visites fréquentes, bookmarks…) sinon
//     refuse silencieusement. Pas de prompt utilisateur intrusif.
//   - Safari iOS : pas de Persistent Storage API → no-op silencieux.
//
// Best-effort : si refusé, on n'affiche rien à l'user (pas de UX
// alarmiste). Le cache reste fonctionnel, juste sans garantie anti-éviction.
//
// Support : Chrome 55+, Edge 79+, Firefox 57+. Pas de Safari.
export const usePersistentStorage = () => {
  useEffect(() => {
    const tryPersist = async () => {
      try {
        if (typeof navigator === "undefined" || !navigator.storage?.persist) return;
        // Si déjà persistant, ne pas re-demander (évite des appels inutiles)
        const already = await navigator.storage.persisted();
        if (already) return;
        await navigator.storage.persist();
        // Pas de log : best-effort silencieux. L'état est observable via
        // les DevTools (Application → Storage → "Persistent" badge).
      } catch {
        // NotAllowedError, SecurityError… on ne peut rien faire d'utile.
      }
    };
    tryPersist();
  }, []);
};
