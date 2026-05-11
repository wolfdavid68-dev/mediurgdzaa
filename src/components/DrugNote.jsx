import React, { useState, useEffect } from "react";

// Note personnelle par drug, persistée dans localStorage (mediurg-note-{id}).
// onChange(hasContent) permet au parent d'afficher l'indicateur ✎ dans l'en-tête.
const DrugNote = ({ drugId, onChange }) => {
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`mediurg-note-${drugId}`);
      if (saved) {
        setNote(saved);
        if (onChange) onChange(true);
      }
    } catch (err) {
      // localStorage indisponible (mode privé, restrictions)
    }
  }, [drugId, onChange]);

  const handleNoteChange = (e) => {
    const value = e.target.value;
    setNote(value);
    try {
      if (value.trim()) {
        localStorage.setItem(`mediurg-note-${drugId}`, value);
      } else {
        localStorage.removeItem(`mediurg-note-${drugId}`);
      }
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 1500);
    } catch (err) {
      // ignore
    }
    if (onChange) onChange(!!value.trim());
  };

  return (
    <div className="poso-note">
      <div className="poso-note-header">
        <div className="poso-note-label">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span>Note personnelle</span>
        </div>
        {noteSaved && <span className="note-saved">✓ Enregistré</span>}
      </div>
      <textarea
        className="poso-note-textarea"
        value={note}
        onChange={handleNoteChange}
        placeholder="Ajoutez une remarque, protocole local, rappel personnel…"
        rows={3}
      />
    </div>
  );
};

export default DrugNote;
