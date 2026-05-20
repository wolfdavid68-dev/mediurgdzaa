import { useEffect, useRef, type MouseEvent } from "react";
import NotesBackup from "./NotesBackup";

// Modale dédiée pour la sauvegarde / restauration des notes utilisateur.
// Accessible via le bouton 💾 dans l'en-tête. Le composant NotesBackup
// reste utilisable indépendamment (toujours présent dans ChangelogModal
// en bonus de découvrabilité).
//
// <dialog> natif : focus trap + ESC + scroll lock côté navigateur.

type Props = { open: boolean; onClose: () => void };

const NotesBackupModal = ({ open, onClose }: Props) => {
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
      className="notes-backup-dialog"
      aria-labelledby="notes-backup-title"
      onClose={onClose}
      onClick={onBackdropClick}
    >
      <div className="notes-backup-modal">
        <header className="notes-backup-modal-header">
          <h2 id="notes-backup-title">💾 Mes notes personnelles</h2>
          <button
            type="button"
            className="notes-backup-modal-close"
            onClick={onClose}
            aria-label="Fermer la sauvegarde"
          >
            ×
          </button>
        </header>
        <div className="notes-backup-modal-body">
          <NotesBackup />
        </div>
      </div>
    </dialog>
  );
};

export default NotesBackupModal;
