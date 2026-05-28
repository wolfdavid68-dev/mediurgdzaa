import { useEffect, useState } from "react";
import AcrTimer from "./AcrTimer";
import ModalDialog from "./ModalDialog";
import TestVersionBanner from "./TestVersionBanner";
import { safeGetItem, safeSetItem } from "../lib/safeStorage";
import { useWakeLock } from "../lib/useWakeLock";

// Modale plein écran déclenchée par le bouton URGENCE.
// Étape 1 : choix Adulte / Enfant + protocole (ERC / ACLS).
// Étape 2 : chrono RCP guidé.
//
// <dialog> natif : focus trap, ESC, scroll lock côté navigateur. Plus de
// useEffect ESC ni d'override sur document.body.style.overflow.
const PROTOCOL_LS_KEY = "mediurg-acr-protocol";
const readProtocol = () => {
  const v = safeGetItem(PROTOCOL_LS_KEY);
  if (v === "erc" || v === "acls") return v;
  return "erc";
};
type AcrModeModalProps = {
  open: boolean;
  onClose: () => void;
  onOpenDrug?: (name: string) => void;
};

const AcrModeModal = ({ open, onClose, onOpenDrug }: AcrModeModalProps) => {
  const [pediatric, setPediatric] = useState<boolean | null>(null); // null tant que pas choisi
  const [protocol, setProtocol] = useState(readProtocol);
  useEffect(() => {
    safeSetItem(PROTOCOL_LS_KEY, protocol);
  }, [protocol]);

  // Wake Lock : tant que la modale URGENCE est ouverte, l'écran reste allumé.
  // Une réa typique = 10-30 min. Pas question que l'écran se verrouille en
  // plein milieu pendant qu'on suit le chrono compressions ou qu'on lit la
  // dose adrénaline pédiatrique.
  useWakeLock(open);

  // Reset du choix à la fermeture pour repartir propre la prochaine fois
  useEffect(() => {
    if (!open) setPediatric(null);
  }, [open]);

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      className="acr-mode-dialog"
      aria-labelledby="acr-mode-title"
    >
      <div className="acr-mode-modal">
        <TestVersionBanner />
        <header className="acr-mode-header">
          <h2 id="acr-mode-title" className="acr-mode-title">
            <span className="acr-mode-flash" aria-hidden="true">
              🚨
            </span>
            Urgence vitale · ACR
            {pediatric !== null && (
              <span className="acr-mode-subtitle">· {pediatric ? "Enfant" : "Adulte"}</span>
            )}
          </h2>
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
              <div className="acr-mode-picker-text">Protocole</div>
              <div className="acr-mode-protocol-toggle" role="radiogroup" aria-label="Protocole">
                <button
                  type="button"
                  role="radio"
                  aria-checked={protocol === "erc"}
                  className={`acr-mode-protocol-btn ${protocol === "erc" ? "acr-mode-protocol-active" : ""}`}
                  onClick={() => setProtocol("erc")}
                >
                  <span className="acr-mode-protocol-name">ERC 2021</span>
                  <span className="acr-mode-protocol-sub">Adré dès 3e CEE · Europe</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={protocol === "acls"}
                  className={`acr-mode-protocol-btn ${protocol === "acls" ? "acr-mode-protocol-active" : ""}`}
                  onClick={() => setProtocol("acls")}
                >
                  <span className="acr-mode-protocol-name">ACLS 2024</span>
                  <span className="acr-mode-protocol-sub">Adré dès 2e CEE · AHA</span>
                </button>
              </div>

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
                {protocol === "acls"
                  ? "AHA / ACLS — Focused Update 2024."
                  : "Recommandations ERC 2021."}{" "}
                Le médecin reste décideur.
              </div>
            </div>
          ) : (
            <>
              <AcrTimer pediatric={pediatric} protocol={protocol} onOpenDrug={onOpenDrug} />
              <div className="acr-mode-switch-row">
                <button
                  type="button"
                  className="acr-mode-switch"
                  onClick={() => {
                    if (
                      window.confirm("Changer Adulte ↔ Enfant remet le chrono à zéro. Continuer ?")
                    ) {
                      setPediatric((p) => !p);
                    }
                  }}
                >
                  ↔ {pediatric ? "Adulte" : "Enfant"}
                </button>
                <button
                  type="button"
                  className="acr-mode-switch acr-mode-switch-protocol"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Basculer ${protocol === "erc" ? "ERC → ACLS" : "ACLS → ERC"} remet le chrono à zéro. Continuer ?`
                      )
                    ) {
                      setProtocol((p) => (p === "erc" ? "acls" : "erc"));
                      setPediatric(null);
                    }
                  }}
                >
                  ↔ {protocol === "erc" ? "ACLS" : "ERC"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ModalDialog>
  );
};

export default AcrModeModal;
