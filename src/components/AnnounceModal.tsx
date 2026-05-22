import { useEffect, useRef, type MouseEvent } from "react";

// Annonce ponctuelle affichée à l'ouverture de l'app pour présenter le
// nouvel outil d'aide à l'interprétation ECG. Vue une seule fois par
// appareil (clé localStorage versionnée). Purement informatif → dismissable
// (×, backdrop, bouton). Bump ANNOUNCE_VERSION pour ré-annoncer plus tard.

export const ANNOUNCE_VERSION = "ecg-1";
export const ANNOUNCE_LS_KEY = "mediurg-announce";

type Props = { open: boolean; onClose: () => void };

const AnnounceModal = ({ open, onClose }: Props) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      try {
        d.showModal();
      } catch {}
    } else if (!open && d.open) {
      try {
        d.close();
      } catch {}
    }
  }, [open]);

  const onBackdropClick = (e: MouseEvent) => {
    if (e.target === dialogRef.current) onClose();
  };

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <dialog
      ref={dialogRef}
      className="announce-dialog"
      aria-labelledby="announce-title"
      onClose={onClose}
      onClick={onBackdropClick}
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
    </dialog>
  );
};

export default AnnounceModal;
