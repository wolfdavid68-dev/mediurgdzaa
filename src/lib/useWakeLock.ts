import { useEffect } from "react";

// Wake Lock API (navigator.wakeLock.request('screen')) : empêche l'écran de
// s'éteindre tant que le lock est tenu. Crucial en contexte SMUR/REA : pendant
// qu'on prépare une seringue ou qu'on suit le chrono ACR, l'écran ne doit pas
// se verrouiller au bout de 30 s — sinon il faut rentrer le code de session,
// inacceptable les mains gantées.
//
// Le lock est automatiquement libéré quand l'onglet passe en arrière-plan
// (sécurité du navigateur). On le ré-acquiert sur visibilitychange → retour
// au premier plan.
//
// Support : Chrome 84+, Edge 84+, Safari 16.4+, Firefox 126+ (Android compris).
// Fallback silencieux sur les vieux navigateurs (le useEffect ne fait rien).
export const useWakeLock = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
        // Si le browser libère le lock spontanément (background, batterie faible),
        // on apprend qu'il est tombé via cet event — utile pour debug.
        sentinel.addEventListener("release", () => { sentinel = null; });
      } catch {
        // NotAllowedError quand le doc n'est pas visible, ou batterie critique.
        // Pas de toast — c'est juste un best-effort.
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && !sentinel && !cancelled) {
        request();
      }
    };

    request();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (sentinel) {
        sentinel.release().catch(() => {});
        sentinel = null;
      }
    };
  }, [enabled]);
};
