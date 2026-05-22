import { useState, useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

// Bandeau discret affiché en bas quand vite-plugin-pwa détecte qu'un nouveau
// service worker est prêt à prendre la main. Avec registerType: 'prompt'
// (vite.config.ts), le nouveau SW reste en waiting jusqu'à ce que l'user
// clique sur « Mettre à jour » → updateServiceWorker(true) déclenche le
// skipWaiting + reload. L'user contrôle le moment de la mise à jour
// (jamais d'auto-update en plein milieu d'une réa).
const UpdatePrompt = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(reg) {
      // Vérification d'update toutes les heures tant que la page reste ouverte.
      // Utile pour les sessions longues (entre 2 réas, le tel reste sur l'app).
      if (reg) {
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      }
    },
    onRegisterError(err) {
      console.warn("SW registration error", err);
    },
  });

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
