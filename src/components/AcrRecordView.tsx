import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check as CheckIcon,
  ChevronDown,
  ClipboardCopy,
  Download,
  FileText,
  HeartPulse,
  MoreHorizontal,
  RotateCcw,
  Save,
  Share2,
  X,
  Zap,
} from "lucide-react";
import ModalDialog from "./ModalDialog";
import {
  createEmptyAcrSession,
  formatAcrElapsed,
  mergeTimerSnapshotIntoSession,
  type AcrCycleRecord,
  type AcrFullSession,
  type AcrTimedEvent,
  type AcrTimerHistoryEntry,
} from "../lib/acrSession";
import { readSession, writeSession } from "../lib/acrSessionStore";
import { enqueueSyncItem } from "../lib/deviceSync";
import { buildRecordText, displayPatient, getTimelineEvents } from "./acr/AcrRecordText";
import AcrRecordContent from "./acr/AcrRecordContent";

type AcrRecordViewProps = {
  sessionId: string;
  open: boolean;
  onClose: () => void;
  pediatric: boolean;
  protocol: string;
  elapsed: number;
  shocks: number;
  adres: number;
  amios: number;
  history: AcrTimerHistoryEntry[];
  events: AcrTimedEvent[];
  cycle: number;
};

type ThemePreference = "dark" | "light";

const readStoredRecord = (sessionId: string) =>
  readSession(sessionId) ?? { ...createEmptyAcrSession(), id: sessionId };

const syncAcrRecord = (record: AcrFullSession) => {
  enqueueSyncItem({
    kind: "acr-session",
    item_id: record.id,
    payload: record,
    updated_at: record.updatedAt,
  });
};

const readThemePreference = (): ThemePreference =>
  document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";

const AcrRecordView = ({
  sessionId,
  open,
  onClose,
  pediatric,
  protocol,
  elapsed,
  shocks,
  adres,
  amios,
  history,
  events,
  cycle,
}: AcrRecordViewProps) => {
  const snapshot = useMemo(
    () => ({ pediatric, protocol, elapsed, shocks, adres, amios, history, events, cycle }),
    [pediatric, protocol, elapsed, shocks, adres, amios, history, events, cycle]
  );
  const [record, setRecord] = useState(() =>
    mergeTimerSnapshotIntoSession(readStoredRecord(sessionId), snapshot)
  );
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<null | "shared" | "downloaded" | "error">(null);
  const [showActions, setShowActions] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>(readThemePreference);
  const captureRef = useRef<HTMLDivElement>(null);
  const timeoutIds = useRef(new Set<number>());
  const timelineEvents = getTimelineEvents(record);

  const scheduleTimeout = (callback: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      timeoutIds.current.delete(id);
      callback();
    }, delay);
    timeoutIds.current.add(id);
  };

  useEffect(
    () => () => {
      timeoutIds.current.forEach(window.clearTimeout);
      timeoutIds.current.clear();
    },
    []
  );

  useEffect(() => {
    setRecord((prev) =>
      mergeTimerSnapshotIntoSession(
        prev.id === sessionId ? prev : readStoredRecord(sessionId),
        snapshot
      )
    );
  }, [sessionId, snapshot]);

  useEffect(() => {
    writeSession(record);
    syncAcrRecord(record);
  }, [record]);

  useEffect(() => {
    setThemePreference(readThemePreference());
    const observer = new MutationObserver(() => setThemePreference(readThemePreference()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const updateRecord = (mutator: (prev: AcrFullSession) => AcrFullSession) => {
    setRecord((prev) => mutator(prev));
    setSaved(false);
  };

  const saveNow = () => {
    writeSession(record);
    syncAcrRecord(record);
    setSaved(true);
    scheduleTimeout(() => setSaved(false), 1800);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    link.href = url;
    link.download = `dossier-acr_${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printPdf = () => {
    saveNow();
    scheduleTimeout(() => window.print(), 80);
  };

  const resetRecord = () => {
    if (
      !window.confirm(
        "Réinitialiser uniquement le dossier ACR saisi ? Le chrono live n'est pas modifié."
      )
    )
      return;
    const empty = createEmptyAcrSession();
    setRecord(
      mergeTimerSnapshotIntoSession(
        { ...empty, id: sessionId, createdAt: record.createdAt },
        snapshot
      )
    );
    setSaved(false);
  };

  const updateCycle = (cycleNumber: number, patch: Partial<AcrCycleRecord>) => {
    updateRecord((prev) => ({
      ...prev,
      cycles: prev.cycles.map((item) =>
        item.cycle === cycleNumber ? { ...item, ...patch } : item
      ),
    }));
  };

  const onCopy = async () => {
    const text = buildRecordText(record);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      scheduleTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Capture le dossier en PNG. html-to-image clone le DOM : les valeurs
  // des <input>/<textarea> sont des propriétés (non reflétées en attributs),
  // on les synchronise en attribut avant capture.
  const generatePng = async () => {
    const node = captureRef.current;
    if (!node) return null;
    node.setAttribute("data-acr-theme", themePreference);
    // Déplie toutes les sections le temps de la capture (dossier complet).
    node.setAttribute("data-acr-export", "1");
    node.querySelectorAll("input").forEach((input) => input.setAttribute("value", input.value));
    node.querySelectorAll("textarea").forEach((area) => {
      area.textContent = area.value;
    });
    try {
      const { toPng } = await import("html-to-image");
      const bg =
        getComputedStyle(node).backgroundColor ||
        getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
      const dataUrl = await toPng(node, { backgroundColor: bg, pixelRatio: 2, cacheBust: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
      return { dataUrl, filename: `dossier-acr_${stamp}.png` };
    } finally {
      node.removeAttribute("data-acr-export");
    }
  };

  // Partage natif (Android share sheet) avec repli téléchargement direct.
  const onShareImage = async () => {
    if (exporting) return;
    saveNow();
    setExporting(true);
    setExportStatus(null);
    try {
      const result = await generatePng();
      if (!result) throw new Error("capture failed");
      const { dataUrl, filename } = result;
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "Dossier ACR" });
          setExportStatus("shared");
          scheduleTimeout(() => setExportStatus(null), 2500);
          return;
        }
      } catch (shareErr) {
        if ((shareErr as Error).name === "AbortError") {
          setExportStatus(null);
          return;
        }
      }
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
      setExportStatus("downloaded");
      scheduleTimeout(() => setExportStatus(null), 2500);
    } catch {
      setExportStatus("error");
      scheduleTimeout(() => setExportStatus(null), 3000);
    } finally {
      setExporting(false);
    }
  };

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      className="acr-record-dialog"
      aria-labelledby="acr-record-title"
      data-acr-theme={themePreference}
    >
      <div className="acr-record-modal">
        <header className="acr-record-header">
          <div className="acr-record-brand" aria-hidden="true">
            <HeartPulse size={26} strokeWidth={2.5} />
          </div>
          <div className="acr-record-title-block">
            <h3 id="acr-record-title">Prise en charge ACR</h3>
            <div className="acr-record-subtitle">
              <span>Équipe : {record.contexte.equipe || "—"}</span>
              <span>Lit : {record.contexte.lit || "—"}</span>
            </div>
          </div>
          <div className="acr-record-desktop-status" aria-hidden="true">
            <span>ACR en cours</span>
            <strong>{formatAcrElapsed(elapsed)}</strong>
            <small>Début RCP : {record.horaires.debutRcp || "auto"}</small>
          </div>
          <button
            type="button"
            className="acr-record-header-action"
            onClick={() => setShowActions((value) => !value)}
            aria-label="Actions rapides du dossier ACR"
            aria-expanded={showActions}
            aria-controls="acr-record-actions-menu"
          >
            <MoreHorizontal size={22} strokeWidth={2.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="acr-record-close"
            onClick={onClose}
            aria-label="Fermer le dossier ACR"
          >
            <X size={23} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </header>

        <div className="acr-record-desktop-strip" aria-hidden="true">
          <span>Patient : {displayPatient(record)}</span>
          <span>Âge : {record.patient.age || "—"}</span>
          <span>Sexe : {record.patient.sexe || "—"}</span>
          <span>Équipe : {record.contexte.equipe || "—"}</span>
          <span>Lit : {record.contexte.lit || "—"}</span>
          <strong>
            Protocole : {protocol === "acls" ? "ACLS" : "ERC"} ({pediatric ? "Enfant" : "Adulte"})
          </strong>
        </div>

        <AcrRecordContent
          captureRef={captureRef}
          record={record}
          elapsed={elapsed}
          cycle={cycle}
          shocks={shocks}
          adres={adres}
          amios={amios}
          protocol={protocol}
          pediatric={pediatric}
          themePreference={themePreference}
          timelineEvents={timelineEvents}
          updateRecord={updateRecord}
          updateCycle={updateCycle}
        />

        <footer className="acr-record-toolbar" data-export-ignore="true">
          <button
            type="button"
            className="acr-record-toolbar-primary"
            onClick={saveNow}
            aria-label="Enregistrer le dossier ACR"
          >
            {saved ? (
              <>
                <CheckIcon size={17} strokeWidth={3} aria-hidden="true" />
                Sauvegardé
              </>
            ) : (
              <>
                <Save size={17} strokeWidth={2.4} aria-hidden="true" />
                Enregistrer
              </>
            )}
          </button>
          <button
            type="button"
            className="acr-record-toolbar-outline"
            onClick={printPdf}
            aria-label="Exporter le dossier ACR en PDF"
          >
            <FileText size={17} strokeWidth={2.4} aria-hidden="true" />
            Exporter PDF
          </button>
          <div className="acr-record-actions-wrap">
            <button
              type="button"
              className="acr-record-toolbar-action"
              onClick={() => setShowActions((value) => !value)}
              aria-label="Ouvrir les actions rapides du dossier ACR"
              aria-expanded={showActions}
              aria-controls="acr-record-actions-menu"
            >
              <Zap size={17} strokeWidth={2.5} aria-hidden="true" />
              Actions rapides
              <ChevronDown size={15} strokeWidth={2.5} aria-hidden="true" />
            </button>
            {showActions && (
              <div
                id="acr-record-actions-menu"
                className="acr-record-actions-menu"
                role="group"
                aria-label="Actions rapides du dossier ACR"
              >
                <button
                  type="button"
                  onClick={onShareImage}
                  disabled={exporting}
                  aria-label="Partager l'image du dossier"
                >
                  <Share2 size={16} strokeWidth={2.4} aria-hidden="true" />
                  {exporting
                    ? "Capture en cours…"
                    : exportStatus === "shared"
                      ? "Image partagée"
                      : exportStatus === "downloaded"
                        ? "Image téléchargée"
                        : exportStatus === "error"
                          ? "Erreur de capture"
                          : "Partager l'image"}
                </button>
                <button type="button" onClick={onCopy} aria-label="Copier le texte de transmission">
                  <ClipboardCopy size={16} strokeWidth={2.4} aria-hidden="true" />
                  {copied ? "Transmission copiée" : "Copier la transmission"}
                </button>
                <button type="button" onClick={exportJson} aria-label="Exporter le dossier en JSON">
                  <Download size={16} strokeWidth={2.4} aria-hidden="true" />
                  Exporter JSON
                </button>
                <button
                  type="button"
                  className="acr-record-danger"
                  onClick={resetRecord}
                  aria-label="Réinitialiser le dossier ACR"
                >
                  <RotateCcw size={16} strokeWidth={2.4} aria-hidden="true" />
                  Reset dossier
                </button>
              </div>
            )}
          </div>
        </footer>
      </div>
    </ModalDialog>
  );
};

export default AcrRecordView;
