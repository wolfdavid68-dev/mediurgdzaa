import { useRef, useState, type ChangeEvent } from "react";
import { DRUGS } from "../data/drugs";
import { APP_VERSION } from "../data/appVersion";
import { safeGetItem, safeSetItem } from "../lib/safeStorage";
import { storageKey } from "../lib/storageKeys";

// Backup utilisateur des notes personnelles par médicament. Les notes vivent
// dans localStorage (`mediurg-note-{drugId}`) et survivent normalement aux
// updates de l'app, mais peuvent être perdues si :
//   - L'user vide les données du site (Chrome/Safari)
//   - Désinstallation PWA sur iOS
//   - Mode privé/incognito
//   - Bug ou corruption locale
//
// Format JSON exporté (versionné pour permettre des migrations futures) :
//   {
//     schema: 1,
//     exportedAt: "2026-05-14T12:34:56Z",
//     appVersion: "v94",
//     notes: [
//       { drugId: 12, drugName: "DIPRIVAN", note: "..." },
//       ...
//     ]
//   }
//
// Import : match prioritaire par drugId (cas standard, drugs.js inchangé).
// Fallback : si l'id n'existe plus mais drugName matche un drug actuel, on
// migre la note vers le nouvel id (utile si on a renuméroté — ne devrait pas
// arriver grâce à drug-ids.snapshot.json mais filet de sécurité).

type NoteEntry = { drugId: number; drugName: string; note: string };
type ExportPayload = {
  schema: number;
  exportedAt: string;
  appVersion: string;
  notes: NoteEntry[];
};

const collectNotes = (): NoteEntry[] => {
  const out: NoteEntry[] = [];
  for (const drug of DRUGS as Array<{ id: number; nom: string }>) {
    const note = safeGetItem(storageKey.note(drug.id));
    if (note && note.trim()) {
      out.push({ drugId: drug.id, drugName: drug.nom, note });
    }
  }
  return out;
};

const NotesBackup = () => {
  const [status, setStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onExport = () => {
    const notes = collectNotes();
    if (notes.length === 0) {
      setStatus("Aucune note à exporter.");
      setTimeout(() => setStatus(""), 3000);
      return;
    }
    const payload: ExportPayload = {
      schema: 1,
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      notes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const ts = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mediurg-notes_${ts}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus(
      `✓ ${notes.length} note${notes.length > 1 ? "s" : ""} exportée${notes.length > 1 ? "s" : ""}`
    );
    setTimeout(() => setStatus(""), 3000);
  };

  const onImport = () => fileInputRef.current?.click();

  const onFileChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de re-sélectionner le même fichier
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as Partial<ExportPayload>;
      if (!data || !Array.isArray(data.notes)) {
        setStatus("⚠ Fichier invalide (format inattendu).");
        setTimeout(() => setStatus(""), 4000);
        return;
      }

      const drugsById = new Map<number, { id: number; nom: string }>();
      const drugsByName = new Map<string, { id: number; nom: string }>();
      for (const d of DRUGS as Array<{ id: number; nom: string }>) {
        drugsById.set(d.id, d);
        drugsByName.set(d.nom, d);
      }

      let imported = 0;
      let migrated = 0;
      let skipped = 0;
      for (const entry of data.notes as NoteEntry[]) {
        if (!entry || typeof entry.note !== "string" || !entry.note.trim()) continue;
        // 1. Match par id direct
        let target = drugsById.get(entry.drugId);
        // 2. Fallback : id inconnu mais nom existe → migration
        if (!target && entry.drugName) {
          target = drugsByName.get(entry.drugName);
          if (target) migrated++;
        }
        if (!target) {
          skipped++;
          continue;
        }
        if (safeSetItem(storageKey.note(target.id), entry.note)) {
          imported++;
        } else {
          skipped++;
        }
      }

      const parts = [
        `✓ ${imported} note${imported > 1 ? "s" : ""} importée${imported > 1 ? "s" : ""}`,
      ];
      if (migrated > 0) parts.push(`${migrated} migrée${migrated > 1 ? "s" : ""} par nom`);
      if (skipped > 0) parts.push(`${skipped} ignorée${skipped > 1 ? "s" : ""}`);
      setStatus(parts.join(" · ") + ". Recharge l'app pour les voir.");
      setTimeout(() => setStatus(""), 6000);
    } catch {
      setStatus("⚠ Lecture du fichier échouée.");
      setTimeout(() => setStatus(""), 4000);
    }
  };

  return (
    <div className="notes-backup">
      <div className="notes-backup-text">
        <strong>Mes notes personnelles</strong>
        <span className="notes-backup-hint">
          Sauvegarde un fichier .json pour migrer entre téléphones ou avant un changement
          d&apos;appareil. Ne pas saisir de nom, IPP, date de naissance ou autre donnée patient
          nominative dans les notes.
        </span>
      </div>
      <div className="notes-backup-actions">
        <button type="button" className="notes-backup-btn" onClick={onExport}>
          ⇩ Exporter
        </button>
        <button type="button" className="notes-backup-btn" onClick={onImport}>
          ⇧ Importer
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={onFileChosen}
          style={{ display: "none" }}
          aria-hidden="true"
        />
      </div>
      {status && (
        <div className="notes-backup-status" role="status" aria-live="polite">
          {status}
        </div>
      )}
    </div>
  );
};

export default NotesBackup;
