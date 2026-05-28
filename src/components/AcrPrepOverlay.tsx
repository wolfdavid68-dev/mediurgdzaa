import { useEffect, useRef } from "react";

// Overlay préparation rapide d'une drogue ACR (Adré / Cordarone).
// Affiché par-dessus le chrono (position: absolute, z-index plus haut que
// .acr-zoom) pour ne pas perdre le décompte. L'utilisateur peut toujours
// basculer vers la fiche complète si besoin (= ancien comportement).
//
// A11y : pas un <dialog> natif car position: absolute over chrono (et non
// fixed centered). On gère manuellement focus auto + ESC pour rester
// keyboard-friendly et cohérent avec aria-modal="true".
type AcrPrepContentBlock = {
  dose: string;
  pure?: boolean;
  etapes: string[];
  notes?: string[];
};

type AcrPrepContent = {
  couleur: string;
  icon: string;
  adulte: AcrPrepContentBlock;
  enfant: AcrPrepContentBlock;
};

type Props = {
  drugName: string;
  content: AcrPrepContent;
  pediatric: boolean;
  onClose: () => void;
  onOpenFullSheet: (() => void) | null;
};

const AcrPrepOverlay = ({ drugName, content, pediatric, onClose, onOpenFullSheet }: Props) => {
  const data = pediatric ? content.enfant : content.adulte;
  const mode = pediatric ? "Enfant" : "Adulte";
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Focus auto sur le bouton « Retour » à l'ouverture pour permettre la
  // fermeture clavier immédiate (Enter/Space). Utile pour screen readers.
  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);

  // ESC ferme l'overlay (cohérent avec le pattern <dialog> des autres modales).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="acr-prep-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Préparation ${drugName} ${mode}`}
    >
      <div className="acr-prep-header" style={{ background: content.couleur }}>
        <span className="acr-prep-header-title">
          <span aria-hidden="true">{content.icon}</span> {drugName} · {mode}
        </span>
        <button
          type="button"
          className="acr-prep-close"
          onClick={onClose}
          aria-label="Fermer la fiche préparation"
        >
          ×
        </button>
      </div>
      <div className="acr-prep-body">
        <div className="acr-prep-dose">
          <div className="acr-prep-dose-label">Dose</div>
          <div className="acr-prep-dose-value">{data.dose}</div>
          <div
            className={`acr-prep-mode-tag ${data.pure ? "acr-prep-mode-pure" : "acr-prep-mode-dilute"}`}
          >
            {data.pure ? "PUR (sans dilution)" : "DILUER avant injection"}
          </div>
        </div>

        <div className="acr-prep-section">
          <div className="acr-prep-section-title">Préparation</div>
          <ol className="acr-prep-steps">
            {data.etapes.map((step, i) => (
              <li key={i} className="acr-prep-step">
                {step}
              </li>
            ))}
          </ol>
        </div>

        {data.notes && data.notes.length > 0 && (
          <div className="acr-prep-section">
            <div className="acr-prep-section-title">À retenir</div>
            <ul className="acr-prep-notes">
              {data.notes.map((n, i) => (
                <li key={i} className="acr-prep-note">
                  {n}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="acr-prep-footer">
        <button ref={closeBtnRef} type="button" className="acr-prep-back" onClick={onClose}>
          ← Retour au chrono
        </button>
        {onOpenFullSheet && (
          <button
            type="button"
            className="acr-prep-full"
            onClick={onOpenFullSheet}
            title="Quitter le mode ACR pour voir la fiche complète"
          >
            Fiche complète ↗
          </button>
        )}
      </div>
    </div>
  );
};

export default AcrPrepOverlay;
