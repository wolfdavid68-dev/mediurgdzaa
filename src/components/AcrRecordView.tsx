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
  TimerReset,
  X,
  Zap,
} from "lucide-react";
import ModalDialog from "./ModalDialog";
import {
  ACR_H_CAUSES,
  ACR_RHYTHMS,
  ACR_T_CAUSES,
  createEmptyAcrSession,
  formatAcrElapsed,
  formatWallTime,
  mergeTimerSnapshotIntoSession,
  type AcrCycleRecord,
  type AcrFullSession,
  type AcrRhythm,
  type AcrTimedEvent,
  type AcrTimerHistoryEntry,
  type AcrVoie,
} from "../lib/acrSession";
import { readSession, writeSession } from "../lib/acrSessionStore";
import { enqueueSyncItem } from "../lib/deviceSync";
import {
  CheckOption,
  Chip,
  DESTINATIONS,
  Field,
  parseOptionalNumber,
  Section,
  SIGNE_REVEIL,
  toggleInArray,
  VOIES,
} from "./acr/AcrRecordControls";
import { buildRecordText, displayPatient, getTimelineEvents } from "./acr/AcrRecordText";

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

        <div className="acr-record-content" ref={captureRef} data-acr-theme={themePreference}>
          {/* Cartes supérieures : chrono + patient anonyme */}
          <div className="acr-record-topcards">
            <div className="acr-record-timecard">
              <span className="acr-record-time-icon" aria-hidden="true">
                <TimerReset size={34} strokeWidth={2.5} />
              </span>
              <span>Temps écoulé</span>
              <strong>{formatAcrElapsed(elapsed)}</strong>
              <small>Depuis le début de la RCP</small>
            </div>
            <div className="acr-record-patient-card">
              <span>Patient (anonyme)</span>
              <strong>{displayPatient(record)}</strong>
              <div className="acr-record-patient-inline">
                <label>
                  <small>Âge</small>
                  <div className="acr-record-patient-input-wrap">
                    <input
                      value={record.patient.age ?? ""}
                      placeholder="—"
                      onChange={(e) =>
                        updateRecord((prev) => ({
                          ...prev,
                          patient: { ...prev.patient, age: e.currentTarget.value },
                        }))
                      }
                    />
                    <em>ans</em>
                  </div>
                </label>
                <label>
                  <small>Sexe</small>
                  <div className="acr-record-patient-input-wrap">
                    <input
                      value={record.patient.sexe ?? ""}
                      placeholder="M/F"
                      onChange={(e) =>
                        updateRecord((prev) => ({
                          ...prev,
                          patient: { ...prev.patient, sexe: e.currentTarget.value },
                        }))
                      }
                    />
                  </div>
                </label>
              </div>
              <em>
                {pediatric ? "Enfant" : "Adulte"} · {protocol === "acls" ? "ACLS" : "ERC"} · Cycle{" "}
                {cycle}
              </em>
            </div>
          </div>

          <div className="acr-record-sections">
            {/* 1. Demande de renfort */}
            <Section title="1. Demande de renfort">
              <div className="acr-record-fields acr-record-fields-two acr-record-compact-fields">
                <Field
                  label="Heure de survenue ACR"
                  value={record.horaires.survenueAcr}
                  placeholder="HH:MM"
                  onChange={(value) =>
                    updateRecord((prev) => ({
                      ...prev,
                      horaires: { ...prev.horaires, survenueAcr: value },
                    }))
                  }
                />
                <Field
                  label="Durée no-flow estimée"
                  type="number"
                  value={record.initial.noFlowMin}
                  suffix="min"
                  onChange={(value) =>
                    updateRecord((prev) => ({
                      ...prev,
                      initial: { ...prev.initial, noFlowMin: parseOptionalNumber(value) },
                    }))
                  }
                />
              </div>
            </Section>

            {/* 2. RCP */}
            <Section
              title="2. RCP"
              subtitle="massage sur plan dur, 100–120/min, 5–6 cm, profondeur optimale"
            >
              <div className="acr-record-fields acr-record-compact-fields">
                <Field
                  label="Heure de début de la RCP"
                  value={record.horaires.debutRcp}
                  placeholder="auto"
                  onChange={(value) =>
                    updateRecord((prev) => ({
                      ...prev,
                      horaires: { ...prev.horaires, debutRcp: value },
                    }))
                  }
                />
              </div>
            </Section>

            {/* 3. Première analyse + pose du défibrillateur */}
            <Section title="3. Première analyse + pose du défibrillateur">
              <div className="acr-record-analyse-row">
                <Field
                  label="Heure de la 1ère analyse"
                  value={record.horaires.premiereAnalyse}
                  placeholder="auto"
                  onChange={(value) =>
                    updateRecord((prev) => ({
                      ...prev,
                      horaires: { ...prev.horaires, premiereAnalyse: value },
                    }))
                  }
                />
                <div>
                  <div className="acr-record-chip-group" role="group" aria-label="Rythme initial">
                    <span className="acr-record-chip-label">Rythme</span>
                    {ACR_RHYTHMS.map((rhythm) => (
                      <Chip
                        key={rhythm}
                        active={record.initial.rythmeInitial === rhythm}
                        onClick={() =>
                          updateRecord((prev) => ({
                            ...prev,
                            initial: {
                              ...prev.initial,
                              rythmeInitial: rhythm as AcrRhythm,
                            },
                          }))
                        }
                      >
                        {rhythm}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* 4. VVP & pronostic */}
            <Section title="4. VVP & pronostic">
              <div className="acr-record-vvp-row">
                <Field
                  label="Heure pose VVP"
                  value={record.horaires.poseVvp}
                  onChange={(value) =>
                    updateRecord((prev) => ({
                      ...prev,
                      horaires: { ...prev.horaires, poseVvp: value },
                    }))
                  }
                />
                <div>
                  <div className="acr-record-chip-group" role="group" aria-label="Voie d'abord VVP">
                    <span className="acr-record-chip-label">Voie</span>
                    {VOIES.map((voie) => (
                      <Chip
                        key={voie}
                        active={record.initial.voieVvp === voie}
                        onClick={() =>
                          updateRecord((prev) => ({
                            ...prev,
                            initial: { ...prev.initial, voieVvp: voie as AcrVoie },
                          }))
                        }
                      >
                        {voie}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
              <div className="acr-record-fields acr-record-fields-three acr-record-compact-fields">
                <Field
                  label="Température"
                  value={record.initial.temperature}
                  suffix="°C"
                  onChange={(value) =>
                    updateRecord((prev) => ({
                      ...prev,
                      initial: { ...prev.initial, temperature: value },
                    }))
                  }
                />
                <Field
                  label="Glycémie"
                  value={record.initial.glycemie}
                  suffix="g/L"
                  onChange={(value) =>
                    updateRecord((prev) => ({
                      ...prev,
                      initial: { ...prev.initial, glycemie: value },
                    }))
                  }
                />
                <Field
                  label="Capnographie initiale"
                  value={record.initial.capnoInitiale}
                  suffix="mmHg"
                  onChange={(value) =>
                    updateRecord((prev) => ({
                      ...prev,
                      initial: { ...prev.initial, capnoInitiale: value },
                    }))
                  }
                />
              </div>
            </Section>

            {/* 5. Suivi de la réanimation — tableau de cycles */}
            <Section title="5. Suivi de la réanimation" showStatus={false}>
              <div className="acr-record-stats">
                <span>
                  <strong>{shocks}</strong> choc{shocks > 1 ? "s" : ""}
                </span>
                <span>
                  <strong>{adres}</strong> adré
                </span>
                <span>
                  <strong>{amios}</strong> amio
                </span>
                <span>
                  <strong>{history.length}</strong> cycle{history.length > 1 ? "s" : ""}
                </span>
              </div>
              {record.cycles.length === 0 ? (
                <div className="acr-record-empty">
                  Aucun cycle clos pour l'instant. Les cycles du chrono apparaîtront ici
                  automatiquement.
                </div>
              ) : (
                <div className="acr-record-cycle-table-wrap" role="region" aria-label="Cycles ACR">
                  <table className="acr-record-cycle-table">
                    <thead>
                      <tr>
                        <th>Cycle</th>
                        <th>Rythme</th>
                        <th>Choc</th>
                        <th>Médicaments</th>
                        <th>Voie aérienne</th>
                        <th>Capno</th>
                      </tr>
                    </thead>
                    <tbody>
                      {record.cycles.map((item) => (
                        <tr key={item.cycle}>
                          <td className="acr-cycle-num">
                            <strong>Cycle {item.cycle}</strong>
                            <span>T+{formatAcrElapsed(item.t)}</span>
                            {item.wallTime && <em>{item.wallTime}</em>}
                          </td>
                          <td>{item.rhythm || "—"}</td>
                          <td className={item.choc ? "acr-cycle-choc" : ""}>{item.choc || "—"}</td>
                          <td className="acr-cycle-drugs">
                            {item.drogues || item.actions.join(" · ") || "—"}
                            {item.commentaire && (
                              <em className="acr-cycle-comment">{item.commentaire}</em>
                            )}
                          </td>
                          <td>
                            <div className="acr-cycle-input">
                              <input
                                value={item.ventilation ?? ""}
                                placeholder="IOT, BAVU…"
                                onChange={(e) =>
                                  updateCycle(item.cycle, {
                                    ventilation: e.currentTarget.value,
                                  })
                                }
                              />
                            </div>
                          </td>
                          <td>
                            <div className="acr-cycle-input">
                              <input
                                value={item.capno ?? ""}
                                placeholder="—"
                                onChange={(e) =>
                                  updateCycle(item.cycle, { capno: e.currentTarget.value })
                                }
                              />
                              <em>mmHg</em>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {timelineEvents.length > 0 && (
                <section
                  className="acr-record-events-card"
                  aria-label="Horaires RCP et traitements"
                >
                  <h4>Horaires RCP / traitements</h4>
                  <ul className="acr-record-events">
                    {timelineEvents.map((event) => (
                      <li key={event.id}>
                        <strong>{formatWallTime(event.at)}</strong>
                        <span>T+{formatAcrElapsed(event.t)}</span>
                        <em>{event.label}</em>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </Section>

            {/* 6. Analyse du dossier médical */}
            <Section title="6. Analyse du dossier médical">
              <CheckOption
                checked={Boolean(record.analyseDossier.directivesAnticipeesContraireRcp)}
                onChange={() =>
                  updateRecord((prev) => ({
                    ...prev,
                    analyseDossier: {
                      ...prev.analyseDossier,
                      directivesAnticipeesContraireRcp:
                        !prev.analyseDossier.directivesAnticipeesContraireRcp,
                    },
                  }))
                }
              >
                Directives anticipées / niveau de soins contraire à la RCP
              </CheckOption>
              <div className="acr-record-causes">
                <div>
                  <strong>5H</strong>
                  <div className="acr-record-chip-group">
                    {ACR_H_CAUSES.map((cause) => (
                      <Chip
                        key={cause}
                        active={record.analyseDossier.causesH.includes(cause)}
                        onClick={() =>
                          updateRecord((prev) => ({
                            ...prev,
                            analyseDossier: {
                              ...prev.analyseDossier,
                              causesH: toggleInArray(prev.analyseDossier.causesH, cause),
                            },
                          }))
                        }
                      >
                        {cause}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <strong>5T</strong>
                  <div className="acr-record-chip-group">
                    {ACR_T_CAUSES.map((cause) => (
                      <Chip
                        key={cause}
                        active={record.analyseDossier.causesT.includes(cause)}
                        onClick={() =>
                          updateRecord((prev) => ({
                            ...prev,
                            analyseDossier: {
                              ...prev.analyseDossier,
                              causesT: toggleInArray(prev.analyseDossier.causesT, cause),
                            },
                          }))
                        }
                      >
                        {cause}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
              <div className="acr-record-check-grid">
                <CheckOption
                  checked={Boolean(record.analyseDossier.ecmoRecherche)}
                  onChange={() =>
                    updateRecord((prev) => ({
                      ...prev,
                      analyseDossier: {
                        ...prev.analyseDossier,
                        ecmoRecherche: !prev.analyseDossier.ecmoRecherche,
                      },
                    }))
                  }
                >
                  ECMO recherchée
                </CheckOption>
                <CheckOption
                  checked={Boolean(record.analyseDossier.inclusionEcmo)}
                  onChange={() =>
                    updateRecord((prev) => ({
                      ...prev,
                      analyseDossier: {
                        ...prev.analyseDossier,
                        inclusionEcmo: !prev.analyseDossier.inclusionEcmo,
                      },
                    }))
                  }
                >
                  Critères ECMO présents
                </CheckOption>
                <CheckOption
                  checked={Boolean(record.analyseDossier.nonEligibleEcmo)}
                  onChange={() =>
                    updateRecord((prev) => ({
                      ...prev,
                      analyseDossier: {
                        ...prev.analyseDossier,
                        nonEligibleEcmo: !prev.analyseDossier.nonEligibleEcmo,
                      },
                    }))
                  }
                >
                  Non éligible ECMO
                </CheckOption>
              </div>
            </Section>

            {/* 7. RACS */}
            <Section title="7. RACS (reprise d'activité cardiaque spontanée)">
              <div className="acr-record-fields acr-record-compact-fields">
                <Field
                  label="Heure RACS"
                  value={record.racs.heure || record.horaires.racs}
                  placeholder="auto"
                  onChange={(value) =>
                    updateRecord((prev) => ({
                      ...prev,
                      horaires: { ...prev.horaires, racs: value },
                      racs: { ...prev.racs, heure: value },
                    }))
                  }
                />
              </div>
              <CheckOption
                className="acr-record-racs-obtained"
                checked={Boolean(record.racs.obtenu)}
                onChange={() =>
                  updateRecord((prev) => ({
                    ...prev,
                    racs: { ...prev.racs, obtenu: !prev.racs.obtenu },
                  }))
                }
              >
                RACS obtenu
              </CheckOption>
              <div
                className="acr-record-chip-group acr-record-wake-signs"
                role="group"
                aria-label="Signes de réveil"
              >
                <span className="acr-record-chip-label">Signes de réveil</span>
                {SIGNE_REVEIL.map((signe) => (
                  <Chip
                    key={signe}
                    active={record.racs.signesReveil.includes(signe)}
                    onClick={() =>
                      updateRecord((prev) => ({
                        ...prev,
                        racs: {
                          ...prev.racs,
                          signesReveil: toggleInArray(prev.racs.signesReveil, signe),
                        },
                      }))
                    }
                  >
                    {signe}
                  </Chip>
                ))}
              </div>
              {record.racs.signesReveil.includes("Autre") && (
                <div className="acr-record-fields acr-record-compact-fields acr-record-wake-precision">
                  <Field
                    label="Préciser"
                    value={record.racs.signesReveilAutre}
                    placeholder="Préciser…"
                    onChange={(value) =>
                      updateRecord((prev) => ({
                        ...prev,
                        racs: { ...prev.racs, signesReveilAutre: value },
                      }))
                    }
                  />
                </div>
              )}
              <div className="acr-record-check-grid">
                <CheckOption
                  checked={Boolean(record.racs.monitorageComplet)}
                  onChange={() =>
                    updateRecord((prev) => ({
                      ...prev,
                      racs: { ...prev.racs, monitorageComplet: !prev.racs.monitorageComplet },
                    }))
                  }
                >
                  Monitorage complet (PA, SpO₂, ECG)
                </CheckOption>
                <CheckOption
                  checked={Boolean(record.racs.ecg18d)}
                  onChange={() =>
                    updateRecord((prev) => ({
                      ...prev,
                      racs: { ...prev.racs, ecg18d: !prev.racs.ecg18d },
                    }))
                  }
                >
                  ECG 18D
                </CheckOption>
                <CheckOption
                  checked={Boolean(record.racs.sedationAmines)}
                  onChange={() =>
                    updateRecord((prev) => ({
                      ...prev,
                      racs: { ...prev.racs, sedationAmines: !prev.racs.sedationAmines },
                    }))
                  }
                >
                  Sédation / amines si besoin
                </CheckOption>
              </div>
            </Section>

            {/* 8. Devenir & commentaires */}
            <Section title="8. Devenir & commentaires">
              <div className="acr-record-chip-group">
                {DESTINATIONS.map((destination) => (
                  <Chip
                    key={destination}
                    active={record.devenir.destination === destination}
                    onClick={() =>
                      updateRecord((prev) => ({
                        ...prev,
                        devenir: { ...prev.devenir, destination },
                      }))
                    }
                  >
                    {destination}
                  </Chip>
                ))}
              </div>
              <label className="acr-record-textarea">
                <span>Commentaires</span>
                <textarea
                  value={record.devenir.commentaires ?? ""}
                  placeholder="Transmission, décisions, destination, éléments médico-légaux…"
                  onChange={(event: { currentTarget: HTMLTextAreaElement }) =>
                    updateRecord((prev) => ({
                      ...prev,
                      devenir: { ...prev.devenir, commentaires: event.currentTarget.value },
                    }))
                  }
                />
              </label>
            </Section>
          </div>
        </div>

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
