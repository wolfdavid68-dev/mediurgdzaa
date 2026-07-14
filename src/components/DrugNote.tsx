import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { ChevronDown, PencilLine } from "lucide-react";
import { useAuthProfile } from "../lib/authProfile";
import { readUserNote, removeUserNote, writeUserNote } from "../lib/userStorage";

// Note personnelle par drug, persistée dans localStorage (mediurg-note-{id}).
// onChange(hasContent) permet au parent d'afficher l'indicateur ✎ dans l'en-tête.
type DrugNoteProps = {
  drugId: number;
  onChange?: (hasContent: boolean) => void;
  onValueChange?: (note: string) => void;
  openRequest?: number;
};

const DrugNote = ({ drugId, onChange, onValueChange, openRequest = 0 }: DrugNoteProps) => {
  const authProfile = useAuthProfile();
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const focusRequested = useRef(false);
  const userId = authProfile?.id ?? null;

  useEffect(() => {
    const saved = readUserNote(userId, drugId) ?? "";
    setNote(saved);
    setExpanded(false);
    onChange?.(Boolean(saved.trim()));
    onValueChange?.(saved);
  }, [drugId, onChange, onValueChange, userId]);

  useEffect(() => {
    if (!openRequest) return;
    focusRequested.current = true;
    setExpanded(true);
  }, [openRequest]);

  useEffect(() => {
    if (!expanded || !focusRequested.current) return;
    const frame = requestAnimationFrame(() => {
      focusRequested.current = false;
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      textareaRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [expanded]);

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    []
  );

  const handleNoteChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNote(value);
    if (value.trim()) writeUserNote(userId, drugId, value);
    else removeUserNote(userId, drugId);
    setNoteSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setNoteSaved(false), 1500);
    onChange?.(Boolean(value.trim()));
    onValueChange?.(value);
  };

  return (
    <section ref={rootRef} className={`poso-note ${expanded ? "is-expanded" : ""}`}>
      <button
        type="button"
        className="poso-note-toggle"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="poso-note-icon" aria-hidden="true">
          <PencilLine />
        </span>
        <span className="poso-note-heading">
          <strong>Note personnelle</strong>
          <small>{note.trim() ? "Note enregistrée localement" : "Ajouter une note locale"}</small>
        </span>
        {noteSaved && (
          <span className="note-saved" role="status">
            Enregistré
          </span>
        )}
        <ChevronDown className="poso-note-chevron" aria-hidden="true" />
      </button>

      {!expanded && note.trim() && <p className="poso-note-preview">{note}</p>}

      {expanded && (
        <div className="poso-note-content" id={contentId}>
          <div className="poso-note-warning" role="note">
            Stockage local uniquement. Ne saisir aucune identité patient, IPP, date de naissance ou
            donnée nominative.
          </div>
          <textarea
            ref={textareaRef}
            className="poso-note-textarea"
            value={note}
            onChange={handleNoteChange}
            aria-label="Note personnelle pour ce médicament"
            placeholder="Remarque locale sans donnée patient nominative…"
            rows={3}
          />
        </div>
      )}
    </section>
  );
};

export default DrugNote;
