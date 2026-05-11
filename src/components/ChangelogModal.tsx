import { useEffect, useRef } from "react";
import { CHANGELOG } from "../data/changelog";

const TYPE_LABEL = {
  feat: "Nouveau",
  fix: "Correctif",
  chore: "Maintenance",
  refactor: "Refacto",
  docs: "Doc",
};

const formatDateFr = (iso) => {
  // iso = "AAAA-MM-JJ" — on évite le constructeur Date pour ne pas dépendre du fuseau
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  const mois = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  return `${parseInt(d, 10)} ${mois[parseInt(mo, 10) - 1]} ${y}`;
};

// <dialog> natif (Chrome 37+, Firefox 98+, Safari 15.4+) : focus trap, ESC,
// scroll lock côté navigateur, plus de useEffect à orchestrer.
const ChangelogModal = ({ open, onClose }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      try { d.showModal(); } catch {}
    } else if (!open && d.open) {
      try { d.close(); } catch {}
    }
  }, [open]);

  // Ferme si clic sur le backdrop (zone hors du <dialog> direct)
  const onBackdropClick = (e) => {
    if (e.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="changelog-dialog"
      aria-labelledby="changelog-title"
      onClose={onClose}
      onClick={onBackdropClick}
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
        {CHANGELOG.map((entry) => (
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
                    {TYPE_LABEL[c.type] || c.type}
                  </span>
                  <span className="changelog-text">{c.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </dialog>
  );
};

export default ChangelogModal;
