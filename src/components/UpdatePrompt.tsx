import { useState, useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

// Bandeau discret affiché en bas quand vite-plugin-pwa détecte qu'un nouveau
// service worker est prêt à prendre la main. Avec registerType: 'prompt'
// (vite.config.ts), le nouveau SW reste en waiting jusqu'à ce que l'user
// clique sur « Mettre à jour » → updateServiceWorker(true) déclenche le
// skipWaiting + reload. L'user contrôle le moment de la mise à jour
// (jamais d'auto-update en plein milieu d'une réa).
const UpdatePrompt = () => {
  const [swReg, setSwReg] = useState<ServiceWorkerRegistration | null>(null);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(reg) {
      if (reg) setSwReg(reg);
    },
    onRegisterError(err) {
      console.warn("SW registration error", err);
    },
  });

  // Recherche d'une nouvelle version : immédiatement à l'enregistrement, à
  // chaque retour sur l'app (l'onglet redevient visible / la fenêtre reprend
  // le focus) et toutes les 5 min en session longue. Avant, la vérification
  // n'avait lieu qu'une fois par heure : après un déploiement, le toast
  // « Mettre à jour » pouvait mettre jusqu'à 1 h à apparaître et l'app
  // continuait de servir l'ancienne version en cache. On garde le toast
  // actionnable (pas d'auto-update en pleine réa).
  useEffect(() => {
    if (!swReg) return;
    const check = () => swReg.update().catch(() => {});
    check();
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    const id = setInterval(check, 5 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      clearInterval(id);
    };
  }, [swReg]);

  // Cache la nouvelle version après reload (l'utilisateur n'a pas besoin de
  // voir le toast s'il a déjà cliqué « Mettre à jour »).
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (needRefresh) setClosed(false);
  }, [needRefresh]);

  // offlineReady fire une fois que le SW a fini de précacher TOUTE l'app :
  // c'est le seul moment où couper le réseau est garanti sûr. On l'affiche
  // explicitement (« ✓ Disponible hors-ligne ») pour qu'un soignant sache
  // qu'il peut partir en SMUR sans risque de tomber sur la page d'erreur du
  // navigateur. Auto-disparition après 5 s (info, pas une action).
  useEffect(() => {
    if (!offlineReady) return;
    const id = setTimeout(() => setOfflineReady(false), 5000);
    return () => clearTimeout(id);
  }, [offlineReady, setOfflineReady]);

  // Le toast de mise à jour (actionnable) est prioritaire sur l'info offline.
  if (needRefresh && !closed) {
    return (
      <div className="update-prompt" role="status" aria-live="polite">
        <span className="update-prompt-text">Nouvelle version disponible</span>
        <button
          type="button"
          className="update-prompt-action"
          onClick={() => updateServiceWorker(true)}
        >
          Mettre à jour
        </button>
        <button
          type="button"
          className="update-prompt-close"
          onClick={() => {
            setNeedRefresh(false);
            setClosed(true);
          }}
          aria-label="Fermer"
        >
          ×
        </button>
      </div>
    );
  }

  if (offlineReady) {
    return (
      <div className="update-prompt update-prompt--ready" role="status" aria-live="polite">
        <span className="update-prompt-text">✓ Disponible hors-ligne</span>
      </div>
    );
  }

  return null;
};

export default UpdatePrompt;
