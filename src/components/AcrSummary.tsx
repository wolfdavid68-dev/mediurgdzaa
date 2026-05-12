import { useState, useRef, useEffect, useCallback } from "react";
import { toPng } from "html-to-image";
import { fmt, fmtWall } from "./AcrTimer.helpers";

// Icône par type d'event horodaté. Étendu en v83 pour couvrir aussi les
// transitions d'état (ROSC, re-arrêt) et les marqueurs chrono (start, pause,
// reprise) en plus des actions thérapeutiques (choc / adré / amio).
const EVENT_ICON: Record<string, string> = {
  choc: "⚡",
  adre: "💉",
  amio: "💓",
  rosc: "❤️",
  reacr: "↻",
  start: "▶",
  pause: "⏸",
  resume: "⏯",
};

// Affiche la dose totale au lieu du nombre brut de doses.
// - Adulte : 1 mg × N doses → "N mg"
// - Pédiatrique : dose dépend du poids → "N × 0,01 mg/kg"
const formatAdre = (count: number, pediatric: boolean): string => {
  if (count === 0) return "0";
  if (pediatric) return `${count} × 0,01 mg/kg`;
  return `${count} mg`;
};

// Cordarone adulte ERC/ACLS : 300 mg (3e choc) puis 150 mg (5e choc).
// Affichage en séquence brute des doses (pas de total cumulé) :
// - 1 dose  → "300 mg"
// - 2 doses → "300 + 150 mg"
// - 3 doses → "300 + 150 + 150 mg"
const formatAmio = (count: number, pediatric: boolean): string => {
  if (count === 0) return "0";
  if (pediatric) return `${count} × 5 mg/kg`;
  if (count === 1) return "300 mg";
  // 1re dose = 300, doses suivantes = 150 chacune
  const doses = ["300", ...Array.from({ length: count - 1 }, () => "150")];
  return `${doses.join(" + ")} mg`;
};

// Bilan de fin de séance ACR — récap copiable + exportable en image (pour
// glisser dans le dossier patient ou partager via Android share sheet).
// Extrait de AcrTimer.tsx (v81) pour alléger le composant principal.
const AcrSummary = ({
  pediatric,
  elapsed,
  shocks,
  adres,
  amios,
  history,
  events = [],
  cycle,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<null | "shared" | "downloaded" | "error">(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  // <dialog> natif : focus trap, ESC, scroll lock automatiques par le navigateur.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (!d.open) {
      try {
        d.showModal();
      } catch {}
    }
  }, []);

  const lines: string[] = [];
  lines.push(`BILAN ACR — ${pediatric ? "Enfant" : "Adulte"}`);
  lines.push(`Durée totale : ${fmt(elapsed)}`);
  lines.push(`Cycles clos  : ${history.length} (cycle en cours : ${cycle})`);
  lines.push(`Chocs        : ${shocks}`);
  lines.push(`Adrénaline   : ${formatAdre(adres, pediatric)}`);
  lines.push(`Cordarone    : ${formatAmio(amios, pediatric)}`);
  if (events.length > 0) {
    lines.push("");
    lines.push("Horodatage des actions :");
    lines.push("  Heure tel · T+ RCP · Action");
    events.forEach((e) => {
      lines.push(`  ${fmtWall(e.at)} · T+${fmt(e.t)} · ${e.label}`);
    });
  }
  if (history.length > 0) {
    lines.push("");
    lines.push("Cycles :");
    history.forEach((h) => {
      const r = h.rhythm === "choquable" ? "Choquable" : "Non choquable";
      const acts = h.actions.length ? h.actions.join(", ") : "—";
      lines.push(`  C${h.cycle} (${fmt(h.t)}) ${r} → ${acts}`);
    });
  }
  const summaryText = lines.join("\n");

  const onCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(summaryText);
      } else {
        const ta = document.createElement("textarea");
        ta.value = summaryText;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Capture le DOM en PNG. Retourne { dataUrl, filename } ou null en cas d'échec.
  // Helper partagé entre le bouton « Partager » (Web Share API) et le bouton
  // « Télécharger » (download direct dans Downloads/).
  const generatePng = useCallback(async () => {
    if (!captureRef.current) return null;
    const bg =
      getComputedStyle(document.documentElement).getPropertyValue("--card").trim() || "#161620";
    const dataUrl = await toPng(captureRef.current, {
      backgroundColor: bg,
      pixelRatio: 2,
      cacheBust: true,
    });
    const ts = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").substring(0, 19);
    return { dataUrl, filename: `bilan-acr_${ts}.png` };
  }, []);

  // Bouton « Partager » : ouvre le menu de partage natif (Android share sheet,
  // iOS share). L'utilisateur choisit l'app cible — Photos, WhatsApp, Drive...
  // Si Web Share API absent (browsers anciens), tombe sur le download.
  const onShareImage = useCallback(async () => {
    if (exporting) return;
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
          await navigator.share({
            files: [file],
            title: "Bilan ACR",
            text: `Bilan ACR — ${pediatric ? "Enfant" : "Adulte"} · Durée ${fmt(elapsed)}`,
          });
          setExportStatus("shared");
          setTimeout(() => setExportStatus(null), 2500);
          return;
        }
      } catch (shareErr) {
        if ((shareErr as Error).name === "AbortError") {
          setExportStatus(null);
          return;
        }
      }

      // Fallback download
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
      setExportStatus("downloaded");
      setTimeout(() => setExportStatus(null), 2500);
    } catch {
      setExportStatus("error");
      setTimeout(() => setExportStatus(null), 3000);
    } finally {
      setExporting(false);
    }
  }, [exporting, elapsed, pediatric, generatePng]);

  // Bouton « Télécharger » : force le download direct dans Downloads/ sans
  // passer par le menu de partage. Sur la plupart des Android, les apps
  // Galerie (Samsung Gallery, MIUI, etc.) scannent automatiquement Downloads/
  // donc l'image apparaît dans la galerie sans manipulation supplémentaire.
  const onDownloadImage = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    setExportStatus(null);
    try {
      const result = await generatePng();
      if (!result) throw new Error("capture failed");
      const link = document.createElement("a");
      link.download = result.filename;
      link.href = result.dataUrl;
      link.click();
      setExportStatus("downloaded");
      setTimeout(() => setExportStatus(null), 2500);
    } catch {
      setExportStatus("error");
      setTimeout(() => setExportStatus(null), 3000);
    } finally {
      setExporting(false);
    }
  }, [exporting, generatePng]);

  const onBackdropClick = (e) => {
    if (e.target === dialogRef.current) onClose();
  };

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <dialog
      ref={dialogRef}
      className="acr-summary-dialog"
      aria-labelledby="acr-summary-title"
      onClose={onClose}
      onClick={onBackdropClick}
    >
      <div className="acr-summary-modal" ref={captureRef}>
        <header className="acr-summary-header">
          <h3 id="acr-summary-title">📋 Bilan ACR — {pediatric ? "Enfant" : "Adulte"}</h3>
          <button
            type="button"
            className="acr-summary-close"
            onClick={onClose}
            aria-label="Fermer le bilan"
          >
            ×
          </button>
        </header>

        <div className="acr-summary-body">
          <div className="acr-summary-stats">
            <div className="acr-summary-stat">
              <span className="acr-summary-stat-num">{fmt(elapsed)}</span>
              <span className="acr-summary-stat-label">Durée</span>
            </div>
            <div className="acr-summary-stat">
              <span className="acr-summary-stat-num">{shocks}</span>
              <span className="acr-summary-stat-label">Choc{shocks > 1 ? "s" : ""}</span>
            </div>
            <div className="acr-summary-stat">
              <span className="acr-summary-stat-num">{formatAdre(adres, pediatric)}</span>
              <span className="acr-summary-stat-label">Adré</span>
            </div>
            <div className="acr-summary-stat">
              <span className="acr-summary-stat-num">{formatAmio(amios, pediatric)}</span>
              <span className="acr-summary-stat-label">Cordarone</span>
            </div>
            <div className="acr-summary-stat">
              <span className="acr-summary-stat-num">{history.length}</span>
              <span className="acr-summary-stat-label">Cycles</span>
            </div>
          </div>

          {events.length > 0 && (
            <div className="acr-summary-events">
              <div className="acr-summary-section-title">Horodatage des actions</div>
              <div className="acr-summary-events-head">
                <span>Heure tel</span>
                <span>T+ RCP</span>
                <span>Action</span>
              </div>
              <ul className="acr-summary-event-list">
                {events.map((e) => (
                  <li key={e.id} className={`acr-summary-event acr-summary-event-${e.type}`}>
                    <span className="acr-summary-event-wall">{fmtWall(e.at)}</span>
                    <span className="acr-summary-event-elapsed">T+{fmt(e.t)}</span>
                    <span className="acr-summary-event-icon" aria-hidden="true">
                      {EVENT_ICON[e.type] || "•"}
                    </span>
                    <span className="acr-summary-event-label">{e.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {history.length > 0 && (
            <div className="acr-summary-cycles">
              <div className="acr-summary-section-title">Détail des cycles</div>
              <ul className="acr-summary-cycle-list">
                {history.map((h) => (
                  <li key={h.cycle} className="acr-summary-cycle">
                    <span className="acr-summary-cycle-num">C{h.cycle}</span>
                    <span className="acr-summary-cycle-time">{fmt(h.t)}</span>
                    <span
                      className={`acr-summary-cycle-rhythm acr-summary-cycle-rhythm-${h.rhythm}`}
                    >
                      {h.rhythm === "choquable" ? "Choquable" : "Non choquable"}
                    </span>
                    <span className="acr-summary-cycle-actions">
                      {h.actions.length === 0 ? "—" : h.actions.join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="acr-summary-text-block" data-export-ignore="true">
            <div className="acr-summary-section-title">Pour transmission</div>
            <pre className="acr-summary-text">{summaryText}</pre>
          </div>
        </div>

        <footer className="acr-summary-footer">
          <button
            type="button"
            className="acr-summary-share"
            onClick={onShareImage}
            disabled={exporting}
            title="Partager l'image (menu Android : Photos, WhatsApp, Drive…)"
          >
            {exporting
              ? "..."
              : exportStatus === "shared"
                ? "✓ Partagé"
                : exportStatus === "error"
                  ? "Erreur"
                  : "🖼 Partager"}
          </button>
          <button
            type="button"
            className="acr-summary-download"
            onClick={onDownloadImage}
            disabled={exporting}
            title="Télécharger l'image dans Downloads/ (visible dans la Galerie)"
          >
            {exporting ? "..." : exportStatus === "downloaded" ? "✓ Téléchargé" : "📥 Télécharger"}
          </button>
          <button type="button" className="acr-summary-copy" onClick={onCopy}>
            {copied ? "✓ Copié" : "Copier"}
          </button>
          <button type="button" className="acr-summary-done" onClick={onClose}>
            Fermer
          </button>
        </footer>
      </div>
    </dialog>
  );
};

export default AcrSummary;
