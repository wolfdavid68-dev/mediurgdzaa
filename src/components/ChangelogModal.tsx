import { useState } from "react";
import "../styles/changelog.css";
import { CHANGELOG } from "../data/changelog";
import type { ChangelogEntry } from "../types/data";
import NotesBackup from "./NotesBackup";
import LegalModal from "./LegalModal";
import CharterModal from "./CharterModal";
import ModalDialog from "./ModalDialog";

const TYPE_LABEL = {
  feat: "Nouveau",
  fix: "Correctif",
  chore: "Maintenance",
  refactor: "Refacto",
  docs: "Doc",
};

const formatDateFr = (iso: string) => {
  // iso = "AAAA-MM-JJ" — on évite le constructeur Date pour ne pas dépendre du fuseau
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  const mois = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];
  return `${parseInt(d, 10)} ${mois[parseInt(mo, 10) - 1]} ${y}`;
};

// <dialog> natif (Chrome 37+, Firefox 98+, Safari 15.4+) : focus trap, ESC,
// scroll lock côté navigateur, plus de useEffect à orchestrer.
type ChangelogModalProps = { open: boolean; onClose: () => void };

const ChangelogModal = ({ open, onClose }: ChangelogModalProps) => {
  const [showLegal, setShowLegal] = useState(false);
  const [showCharter, setShowCharter] = useState(false);

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      className="changelog-dialog"
      aria-labelledby="changelog-title"
    >
      <header className="changelog-header">
        <h2 id="changelog-title">Notes de version</h2>
        <button
          type="button"
          className="changelog-close"
          onClick={onClose}
          aria-label="Fermer les notes de version"
        >
          ×
        </button>
      </header>

      <div className="changelog-body">
        <NotesBackup />
        {(CHANGELOG as ChangelogEntry[]).map((entry) => (
          <section key={entry.version} className="changelog-entry">
            <div className="changelog-entry-head">
              <span className="changelog-version">{entry.version}</span>
              <span className="changelog-date">{formatDateFr(entry.date)}</span>
            </div>
            {entry.titre && <h3 className="changelog-titre">{entry.titre}</h3>}
            <ul className="changelog-list">
              {entry.changes.map((c, i) => (
                <li key={i} className={`changelog-item changelog-item-${c.type}`}>
                  <span className={`changelog-tag changelog-tag-${c.type}`}>
                    {TYPE_LABEL[c.type as keyof typeof TYPE_LABEL] || c.type}
                  </span>
                  <span className="changelog-text">{c.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <footer className="changelog-footer">
        <button type="button" className="auth-legal-link" onClick={() => setShowCharter(true)}>
          Charte d&apos;utilisation
        </button>
        <span aria-hidden="true" style={{ color: "var(--text-mute)" }}>
          ·
        </span>
        <button type="button" className="auth-legal-link" onClick={() => setShowLegal(true)}>
          Mentions légales &amp; confidentialité
        </button>
      </footer>

      <LegalModal open={showLegal} onClose={() => setShowLegal(false)} />
      <CharterModal
        open={showCharter}
        onAccept={() => setShowCharter(false)}
        onClose={() => setShowCharter(false)}
      />
    </ModalDialog>
  );
};

export default ChangelogModal;
