import ModalDialog from "./ModalDialog";
import NotesBackup from "./NotesBackup";

// Modale dédiée pour la sauvegarde / restauration des notes utilisateur.
// Accessible via le bouton 💾 dans l'en-tête. Le composant NotesBackup
// reste utilisable indépendamment (toujours présent dans ChangelogModal
// en bonus de découvrabilité).
//
// <dialog> natif : focus trap + ESC + scroll lock côté navigateur.

type Props = { open: boolean; onClose: () => void };

const NotesBackupModal = ({ open, onClose }: Props) => {
  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      className="notes-backup-dialog"
      aria-labelledby="notes-backup-title"
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
    </ModalDialog>
  );
};

export default NotesBackupModal;
