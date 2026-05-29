import ModalDialog from "./ModalDialog";
import { STORAGE_KEYS } from "../lib/storageKeys";

// Annonce ponctuelle affichée à l'ouverture de l'app pour présenter le
// nouvel outil d'aide à l'interprétation ECG. Vue une seule fois par
// appareil (clé localStorage versionnée). Purement informatif → dismissable
// (×, backdrop, bouton). Bump ANNOUNCE_VERSION pour ré-annoncer plus tard.

export const ANNOUNCE_VERSION = "ecg-1";
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
      <div className="announce-card">
        <div className="announce-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="30"
            height="30"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 12h4l2 6 4-14 2 8h6" />
          </svg>
        </div>
        <h2 id="announce-title" className="announce-title">
          Nouveau — Lecteur ECG <span className="announce-tag">en test</span>
        </h2>
        <p className="announce-text">
          Un nouvel outil d&apos;aide à l&apos;interprétation de l&apos;ECG est en test. Il{" "}
          <strong>ne remplace en rien l&apos;interprétation médicale</strong> : il sert uniquement
          d&apos;aide à la décision.
        </p>
        <p className="announce-where">
          Disponible dans <strong>Protocoles → ECG</strong>.
        </p>
        <button type="button" className="announce-btn" onClick={onClose} autoFocus>
          J&apos;ai compris
        </button>
      </div>
    </ModalDialog>
  );
};

export default AnnounceModal;
