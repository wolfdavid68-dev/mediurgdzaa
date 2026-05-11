import React, { useEffect, useRef, useState } from "react";
import AcrTimer from "./AcrTimer";

// Modale plein écran déclenchée par le bouton URGENCE.
// Étape 1 : choix Adulte / Enfant.
// Étape 2 : chrono RCP guidé.
//
// <dialog> natif : focus trap, ESC, scroll lock côté navigateur. Plus de
// useEffect ESC ni d'override sur document.body.style.overflow.
const AcrModeModal = ({ open, onClose, onOpenDrug }) => {
  const dialogRef = useRef(null);
  const [pediatric, setPediatric] = useState(null); // null tant que pas choisi

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      try { d.showModal(); } catch {}
    } else if (!open && d.open) {
      try { d.close(); } catch {}
    }
  }, [open]);

  // Reset du choix à la fermeture pour repartir propre la prochaine fois
  useEffect(() => {
    if (!open) setPediatric(null);
  }, [open]);

  // Clic backdrop = ferme. Le clic intérieur ne déclenche pas (event sur l'enfant).
  const onBackdropClick = (e) => {
    if (e.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="acr-mode-dialog"
      aria-label="Mode urgence ACR"
      onClose={onClose}
      onClick={onBackdropClick}
    >
      <div className="acr-mode-modal">
        <header className="acr-mode-header">
          <div className="acr-mode-title">
            <span className="acr-mode-flash" aria-hidden="true">🚨</span>
            Urgence vitale · ACR
            {pediatric !== null && (
              <span className="acr-mode-subtitle">
                · {pediatric ? "Enfant" : "Adulte"}
              </span>
            )}
          </div>
          <button
            type="button"
            className="acr-mode-close"
            onClick={onClose}
            aria-label="Fermer le mode urgence"
          >
            ×
          </button>
        </header>

        <div className="acr-mode-body">
          {pediatric === null ? (
            <div className="acr-mode-picker">
              <div className="acr-mode-picker-text">Patient ?</div>
              <div className="acr-mode-picker-buttons">
                <button
                  type="button"
                  className="acr-mode-pick acr-mode-pick-adulte"
                  onClick={() => setPediatric(false)}
                >
                  <span className="acr-mode-pick-icon">🧑</span>
                  <span className="acr-mode-pick-label">Adulte</span>
                  <span className="acr-mode-pick-sub">Adré 1 mg · Amio 300/150 mg</span>
                </button>
                <button
                  type="button"
                  className="acr-mode-pick acr-mode-pick-enfant"
                  onClick={() => setPediatric(true)}
                >
                  <span className="acr-mode-pick-icon">🧒</span>
                  <span className="acr-mode-pick-label">Enfant</span>
                  <span className="acr-mode-pick-sub">Adré 0,01 mg/kg · Amio 5 mg/kg</span>
                </button>
              </div>
              <div className="acr-mode-picker-hint">
                Recommandations ERC 2021. Le médecin reste décideur.
              </div>
            </div>
          ) : (
            <>
              <AcrTimer pediatric={pediatric} onOpenDrug={onOpenDrug} />
              <button
                type="button"
                className="acr-mode-switch"
                onClick={() => {
                  if (window.confirm("Changer Adulte ↔ Enfant remet le chrono à zéro. Continuer ?")) {
                    setPediatric(p => !p);
                  }
                }}
              >
                Basculer en {pediatric ? "Adulte" : "Enfant"}
              </button>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
};

export default AcrModeModal;
