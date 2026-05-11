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
  useEffect(() => { if (needRefresh) setClosed(false); }, [needRefresh]);

  if (!needRefresh || closed) return null;

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
        onClick={() => { setNeedRefresh(false); setClosed(true); }}
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  );
};

export default UpdatePrompt;
