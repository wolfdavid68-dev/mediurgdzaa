import { UsersRound } from "lucide-react";
import ModalDialog from "./ModalDialog";

// Annonce ponctuelle affichée à l'ouverture de l'app pour présenter une
// nouveauté importante. Vue une seule fois par appareil (clé localStorage
// versionnée). Purement informatif → dismissable (×, backdrop, bouton).
// Bump ANNOUNCE_VERSION pour ré-annoncer plus tard.

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
            <UsersRound aria-hidden="true" size={28} strokeWidth={2} />
          </div>
        </div>
        <div className="announce-copy">
          <h2 id="announce-title" className="announce-title">
            Tutorat démo ouvert <span className="announce-tag">nouveau</span>
          </h2>
          <p className="announce-where">
            <span className="announce-where-icon" aria-hidden="true">
              <UsersRound size={16} strokeWidth={2.2} />
            </span>
            <span>
              Disponible via la pastille <strong>Tutorat</strong> dans l'en-tête.
            </span>
          </p>
          <p className="announce-text">
            Le compagnon de tutorat SAU Mulhouse passe en accès main. Il sert de support de
            démonstration pour accompagner les ESI/EAS dans les repères du service.
          </p>
          <div className="announce-points" aria-label="Points clés du tutorat démo">
            <span>Parcours d'accueil</span>
            <span>Repères terrain</span>
            <span>Accès ESI/EAS</span>
          </div>
        </div>
        <button type="button" className="announce-btn" onClick={onClose} autoFocus>
          Découvrir plus tard
        </button>
      </div>
    </ModalDialog>
  );
};

export default AnnounceModal;
