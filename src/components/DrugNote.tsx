import { useState, useEffect, type ChangeEvent } from "react";
import { safeGetItem, safeRemoveItem, safeSetItem } from "../lib/safeStorage";

// Note personnelle par drug, persistée dans localStorage (mediurg-note-{id}).
// onChange(hasContent) permet au parent d'afficher l'indicateur ✎ dans l'en-tête.
type DrugNoteProps = { drugId: number; onChange?: (hasContent: boolean) => void };

const DrugNote = ({ drugId, onChange }: DrugNoteProps) => {
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const storageKey = `mediurg-note-${drugId}`;

  useEffect(() => {
    const saved = safeGetItem(storageKey);
    if (saved) {
      setNote(saved);
      if (onChange) onChange(true);
    }
  }, [onChange, storageKey]);

  const handleNoteChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNote(value);
    if (value.trim()) safeSetItem(storageKey, value);
    else safeRemoveItem(storageKey);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 1500);
    if (onChange) onChange(!!value.trim());
  };

  return (
    <div className="poso-note">
      <div className="poso-note-header">
        <div className="poso-note-label">
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span>Note personnelle</span>
        </div>
        {noteSaved && <span className="note-saved">✓ Enregistré</span>}
      </div>
      <div className="poso-note-warning" role="note">
        Notes locales uniquement : ne saisir aucune identité patient, IPP, date de naissance ou
        donnée nominative.
      </div>
      <textarea
        className="poso-note-textarea"
        value={note}
        onChange={handleNoteChange}
        placeholder="Remarque locale sans donnée patient nominative…"
        rows={3}
      />
    </div>
  );
};

export default DrugNote;
