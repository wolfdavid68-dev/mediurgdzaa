import ModalDialog from "./ModalDialog";
import { STORAGE_KEYS } from "../lib/storageKeys";

// Annonce ponctuelle affichée à l'ouverture de l'app pour présenter une
// nouveauté importante. Vue une seule fois par appareil (clé localStorage
// versionnée). Purement informatif → dismissable (×, backdrop, bouton).
// Bump ANNOUNCE_VERSION pour ré-annoncer plus tard.

export const ANNOUNCE_VERSION = "tutorat-demo-1";
export const ANNOUNCE_LS_KEY = STORAGE_KEYS.announce;

type Props = { open: boolean; onClose: () => void };

const AnnounceModal = ({ open, onClose }: Props) => {
  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      className="announce-dialog"
      aria-labelledby="announce-title"
    >
      <div className="announce-card announce-card-tutorat">
        <div className="announce-hero" aria-hidden="true">
          <div className="announce-logo">
            <img src="/logo-sau.png" alt="" draggable={false} />
          </div>
          <div className="announce-icon">
            <svg
              viewBox="0 0 24 24"
              width="30"
              height="30"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
        </div>
        <h2 id="announce-title" className="announce-title">
          Tutorat démo ouvert <span className="announce-tag">nouveau</span>
        </h2>
        <p className="announce-text">
          Le compagnon de tutorat SAU Mulhouse passe en accès main. Il sert de support de
          démonstration pour accompagner les ESI/AS dans les repères du service.
        </p>
        <div className="announce-points" aria-label="Points clés du tutorat démo">
          <span>Parcours d'accueil</span>
          <span>Repères terrain</span>
          <span>Accès soignant dédié</span>
        </div>
        <p className="announce-where">Disponible via la pastille Tutorat dans l'en-tête.</p>
        <button type="button" className="announce-btn" onClick={onClose} autoFocus>
          Découvrir plus tard
        </button>
      </div>
    </ModalDialog>
  );
};

export default AnnounceModal;
