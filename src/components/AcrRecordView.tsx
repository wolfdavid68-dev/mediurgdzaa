import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ModalDialog from "./ModalDialog";
import {
  ACR_H_CAUSES,
  ACR_RHYTHMS,
  ACR_T_CAUSES,
  coerceAcrSession,
  createEmptyAcrSession,
  formatAcrElapsed,
  formatWallTime,
  mergeTimerSnapshotIntoSession,
  type AcrCycleRecord,
  type AcrDevenir,
  type AcrFullSession,
  type AcrRhythm,
  type AcrTimedEvent,
  type AcrTimerHistoryEntry,
  type AcrVoie,
} from "../lib/acrSession";
import { safeGetJson, safeSetJson } from "../lib/safeStorage";
import { STORAGE_KEYS } from "../lib/storageKeys";

type AcrRecordViewProps = {
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

type FieldProps = {
  label: string;
  value?: string | number;
  type?: string;
  placeholder?: string;
  suffix?: string;
  onChange: (value: string) => void;
};

const SIGNE_REVEIL = [
  "Mouvements volontaires",
  "Ouverture des yeux",
  "Respiration spontanée",
  "Autre",
];
const DESTINATIONS: AcrDevenir[] = ["Décès", "Transfert réa", "Retour domicile", "Autre"];
const VOIES: AcrVoie[] = ["Périphérique", "Centrale", "IO"];

const readStoredRecord = () =>
  coerceAcrSession(safeGetJson<unknown>(STORAGE_KEYS.acrSession, createEmptyAcrSession()));

const Field = ({ label, value, type = "text", placeholder, suffix, onChange }: FieldProps) => (
  <label className="acr-record-field">
    <span>{label}</span>
    <div className="acr-record-input-wrap">
      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event: { currentTarget: HTMLInputElement }) =>
          onChange(event.currentTarget.value)
        }
      />
      {suffix && <em>{suffix}</em>}
    </div>
  </label>
);

const Section = ({ title, children }: { title: string; children: ReactNode }) => {
  const match = /^(\d+)\.\s*(.*)$/.exec(title);
  const index = match?.[1];
  const cleanTitle = match?.[2] ?? title;
  return (
    <section className="acr-record-section">
      <header className="acr-record-section-head">
        {index && <span className="acr-record-section-index">{index}</span>}
        <h4>{cleanTitle}</h4>
        <span className="acr-record-section-status" aria-hidden="true">
          ✓
        </span>
        <span className="acr-record-section-chevron" aria-hidden="true">
          ⌄
        </span>
      </header>
      <div className="acr-record-section-body">{children}</div>
    </section>
  );
};

const Chip = ({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    className={`acr-record-chip ${active ? "acr-record-chip-active" : ""}`}
    onClick={onClick}
  >
    {children}
  </button>
);

const Check = ({
  checked,
  children,
  onChange,
}: {
  checked: boolean;
  children: ReactNode;
  onChange: () => void;
}) => (
  <button
    type="button"
    className={`acr-record-check ${checked ? "acr-record-check-on" : ""}`}
    onClick={onChange}
  >
    <span aria-hidden="true">{checked ? "✓" : ""}</span>
    {children}
  </button>
);

const toggleInArray = (items: string[], value: string): string[] =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

const parseOptionalNumber = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const displayPatient = (record: AcrFullSession) => {
  const name = [record.patient.prenom, record.patient.nom].filter(Boolean).join(" ").trim();
  return name || "Patient non renseigné";
};

// Texte de transmission copiable, construit depuis le dossier saisi.
// Repris du Bilan ACR (AcrSummary) lors de la fusion Bilan = Dossier.
const buildRecordText = (record: AcrFullSession): string => {
  const lines: string[] = [];
  const s = record.stats;
  lines.push(
    `BILAN ACR — ${record.pediatric ? "Enfant" : "Adulte"} · ${record.protocol === "acls" ? "ACLS" : "ERC"}`
  );
  lines.push(`Patient      : ${displayPatient(record)}`);
  const ident = [
    record.patient.age,
    record.patient.sexe,
    record.patient.ipp && `IPP ${record.patient.ipp}`,
  ]
    .filter(Boolean)
    .join(" · ");
  if (ident) lines.push(`Identité     : ${ident}`);
  const ctx = [record.contexte.equipe, record.contexte.lit].filter(Boolean).join(" · ");
  if (ctx) lines.push(`Contexte     : ${ctx}`);
  lines.push(`Durée RCP    : ${formatAcrElapsed(s.elapsed)} (cycle ${s.cycle})`);
  lines.push(`Chocs        : ${s.shocks}`);
  lines.push(`Adrénaline   : ${s.adres}`);
  lines.push(`Amiodarone   : ${s.amios}`);
  if (record.horaires.survenueAcr || record.horaires.debutRcp || record.racs.heure) {
    lines.push("");
    lines.push("Horaires :");
    if (record.horaires.survenueAcr) lines.push(`  Survenue ACR : ${record.horaires.survenueAcr}`);
    if (record.horaires.debutRcp) lines.push(`  Début RCP    : ${record.horaires.debutRcp}`);
    if (record.racs.heure || record.horaires.racs)
      lines.push(`  RACS         : ${record.racs.heure || record.horaires.racs}`);
  }
  if (record.cycles.length > 0) {
    lines.push("");
    lines.push("Cycles :");
    record.cycles.forEach((c) => {
      const acts = [c.choc, c.drogues].filter(Boolean).join(" · ") || c.actions.join(" · ") || "—";
      lines.push(`  C${c.cycle} (T+${formatAcrElapsed(c.t)}) ${c.rhythm || "—"} → ${acts}`);
    });
  }
  if (record.devenir.destination || record.devenir.commentaires) {
    lines.push("");
    if (record.devenir.destination) lines.push(`Devenir      : ${record.devenir.destination}`);
    if (record.devenir.commentaires) lines.push(`Commentaires : ${record.devenir.commentaires}`);
  }
  return lines.join("\n");
};

const AcrRecordView = ({
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
    mergeTimerSnapshotIntoSession(readStoredRecord(), snapshot)
  );
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<null | "shared" | "downloaded" | "error">(null);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecord((prev) => mergeTimerSnapshotIntoSession(prev, snapshot));
  }, [snapshot]);

  useEffect(() => {
    safeSetJson(STORAGE_KEYS.acrSession, record);
  }, [record]);

  const updateRecord = (mutator: (prev: AcrFullSession) => AcrFullSession) => {
    setRecord((prev) => mutator(prev));
    setSaved(false);
  };

  const saveNow = () => {
    safeSetJson(STORAGE_KEYS.acrSession, record);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
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
    window.setTimeout(() => window.print(), 80);
  };

  const resetRecord = () => {
    if (
      !window.confirm(
        "Réinitialiser uniquement le dossier ACR saisi ? Le chrono live n'est pas modifié."
      )
    )
      return;
    setRecord(mergeTimerSnapshotIntoSession(createEmptyAcrSession(), snapshot));
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
      window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Capture le dossier rempli en PNG. html-to-image clone le DOM : les valeurs
  // des <input>/<textarea> sont des propriétés (non reflétées en attributs), on
  // les synchronise donc en attribut avant capture pour qu'elles apparaissent.
  const generatePng = async () => {
    const node = captureRef.current;
    if (!node) return null;
    node.querySelectorAll("input").forEach((input) => input.setAttribute("value", input.value));
    node.querySelectorAll("textarea").forEach((area) => {
      area.textContent = area.value;
    });
    const { toPng } = await import("html-to-image");
    const bg =
      getComputedStyle(document.documentElement).getPropertyValue("--card").trim() || "#161620";
    const dataUrl = await toPng(node, { backgroundColor: bg, pixelRatio: 2, cacheBust: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
    return { dataUrl, filename: `dossier-acr_${stamp}.png` };
  };

  // Partage natif de l'image (Android share sheet → WhatsApp, Drive, Photos…),
  // avec repli en téléchargement direct si la Web Share API est absente.
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
          window.setTimeout(() => setExportStatus(null), 2500);
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
      window.setTimeout(() => setExportStatus(null), 2500);
    } catch {
      setExportStatus("error");
      window.setTimeout(() => setExportStatus(null), 3000);
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
    >
      <div className="acr-record-modal">
        <header className="acr-record-header">
          <div className="acr-record-brand" aria-hidden="true">
            ♥
          </div>
          <div className="acr-record-title-block">
            <p className="acr-record-kicker">Dossier ACR numérique</p>
            <h3 id="acr-record-title">Prise en charge ACR</h3>
            <div className="acr-record-subtitle">
              <span>Équipe : {record.contexte.equipe || "—"}</span>
              <span>Lit : {record.contexte.lit || "—"}</span>
            </div>
          </div>
          <button
            type="button"
            className="acr-record-close"
            onClick={onClose}
            aria-label="Fermer le dossier ACR"
          >
            ×
          </button>
        </header>

        <div className="acr-record-content" ref={captureRef}>
          <div className="acr-record-topcards">
            <div className="acr-record-timecard">
              <span>Temps écoulé</span>
              <strong>{formatAcrElapsed(elapsed)}</strong>
              <small>Depuis le début de la RCP</small>
            </div>
            <div className="acr-record-patient-card">
              <span>Patient</span>
              <strong>{displayPatient(record)}</strong>
              <small>
                {record.patient.age || "—"} · {record.patient.sexe || "—"} · IPP :{" "}
                {record.patient.ipp || "—"}
              </small>
              <em>
                {pediatric ? "Enfant" : "Adulte"} · {protocol === "acls" ? "ACLS" : "ERC"} · Cycle{" "}
                {cycle}
              </em>
            </div>
          </div>

          <main className="acr-record-grid">
            <div className="acr-record-left">
              <Section title="1. Informations générales">
                <div className="acr-record-fields acr-record-fields-two">
                  <Field
                    label="Nom"
                    value={record.patient.nom}
                    onChange={(value) =>
                      updateRecord((prev) => ({
                        ...prev,
                        patient: { ...prev.patient, nom: value },
                      }))
                    }
                  />
                  <Field
                    label="Prénom"
                    value={record.patient.prenom}
                    onChange={(value) =>
                      updateRecord((prev) => ({
                        ...prev,
                        patient: { ...prev.patient, prenom: value },
                      }))
                    }
                  />
                  <Field
                    label="Âge"
                    value={record.patient.age}
                    onChange={(value) =>
                      updateRecord((prev) => ({
                        ...prev,
                        patient: { ...prev.patient, age: value },
                      }))
                    }
                  />
                  <Field
                    label="Sexe"
                    value={record.patient.sexe}
                    onChange={(value) =>
                      updateRecord((prev) => ({
                        ...prev,
                        patient: { ...prev.patient, sexe: value },
                      }))
                    }
                  />
                  <Field
                    label="IPP"
                    value={record.patient.ipp}
                    onChange={(value) =>
                      updateRecord((prev) => ({
                        ...prev,
                        patient: { ...prev.patient, ipp: value },
                      }))
                    }
                  />
                  <Field
                    label="Équipe / secteur"
                    value={record.contexte.equipe}
                    onChange={(value) =>
                      updateRecord((prev) => ({
                        ...prev,
                        contexte: { ...prev.contexte, equipe: value },
                      }))
                    }
                  />
                  <Field
                    label="Lit / lieu"
                    value={record.contexte.lit}
                    onChange={(value) =>
                      updateRecord((prev) => ({
                        ...prev,
                        contexte: { ...prev.contexte, lit: value },
                      }))
                    }
                  />
                  <Field
                    label="Médecin leader"
                    value={record.contexte.medecinLeader}
                    onChange={(value) =>
                      updateRecord((prev) => ({
                        ...prev,
                        contexte: { ...prev.contexte, medecinLeader: value },
                      }))
                    }
                  />
                  <Field
                    label="IDE référent"
                    value={record.contexte.infirmierReferent}
                    onChange={(value) =>
                      updateRecord((prev) => ({
                        ...prev,
                        contexte: { ...prev.contexte, infirmierReferent: value },
                      }))
                    }
                  />
                </div>
              </Section>

              <Section title="2. Demande de renfort">
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

              <Section title="3. RCP et première analyse">
                <div className="acr-record-fields acr-record-fields-two acr-record-compact-fields">
                  <Field
                    label="Heure de début RCP"
                    value={record.horaires.debutRcp}
                    placeholder="auto"
                    onChange={(value) =>
                      updateRecord((prev) => ({
                        ...prev,
                        horaires: { ...prev.horaires, debutRcp: value },
                      }))
                    }
                  />
                  <Field
                    label="Heure 1ère analyse"
                    value={record.horaires.premiereAnalyse}
                    placeholder="auto"
                    onChange={(value) =>
                      updateRecord((prev) => ({
                        ...prev,
                        horaires: { ...prev.horaires, premiereAnalyse: value },
                      }))
                    }
                  />
                </div>
                <div className="acr-record-chip-group" role="group" aria-label="Rythme initial">
                  {ACR_RHYTHMS.map((rhythm) => (
                    <Chip
                      key={rhythm}
                      active={record.initial.rythmeInitial === rhythm}
                      onClick={() =>
                        updateRecord((prev) => ({
                          ...prev,
                          initial: { ...prev.initial, rythmeInitial: rhythm as AcrRhythm },
                        }))
                      }
                    >
                      {rhythm}
                    </Chip>
                  ))}
                </div>
              </Section>

              <Section title="4. VVP & pronostic">
                <div className="acr-record-chip-group" role="group" aria-label="Voie d'abord">
                  {VOIES.map((voie) => (
                    <Chip
                      key={voie}
                      active={record.initial.voieVvp === voie}
                      onClick={() =>
                        updateRecord((prev) => ({
                          ...prev,
                          initial: { ...prev.initial, voieVvp: voie },
                        }))
                      }
                    >
                      {voie}
                    </Chip>
                  ))}
                </div>
                <div className="acr-record-fields acr-record-fields-three acr-record-compact-fields">
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
                    label="Capno initiale"
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
            </div>

            <section className="acr-record-center acr-record-section acr-record-section-feature">
              <header className="acr-record-section-head">
                <span className="acr-record-section-index">5</span>
                <h4>Suivi de la réanimation</h4>
                <span className="acr-record-section-chevron" aria-hidden="true">
                  ⌄
                </span>
              </header>
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
                  Aucun cycle clos pour l’instant. Les cycles du chrono apparaîtront ici
                  automatiquement.
                </div>
              ) : (
                <div className="acr-record-cycle-list">
                  {record.cycles.map((item) => (
                    <article key={item.cycle} className="acr-record-cycle-card">
                      <div className="acr-record-cycle-head">
                        <strong>Cycle {item.cycle}</strong>
                        <span>
                          T+{formatAcrElapsed(item.t)} {item.wallTime ? `· ${item.wallTime}` : ""}
                        </span>
                      </div>
                      <div className="acr-record-cycle-main">
                        <div>
                          <span>Rythme</span>
                          <strong>{item.rhythm || "—"}</strong>
                        </div>
                        <div>
                          <span>Choc</span>
                          <strong>{item.choc || "—"}</strong>
                        </div>
                        <div>
                          <span>Médicaments</span>
                          <strong>{item.drogues || item.actions.join(" · ") || "—"}</strong>
                        </div>
                        <div>
                          <span>Voie aérienne</span>
                          <strong>{item.ventilation || "—"}</strong>
                        </div>
                        <div>
                          <span>Capno</span>
                          <strong>{item.capno || "—"}</strong>
                        </div>
                      </div>
                      <div className="acr-record-fields acr-record-fields-three acr-record-cycle-fields">
                        <Field
                          label="Voie aérienne / ventilation"
                          value={item.ventilation}
                          placeholder="IOT, BAVU, ventilateur…"
                          onChange={(value) => updateCycle(item.cycle, { ventilation: value })}
                        />
                        <Field
                          label="Capno"
                          value={item.capno}
                          suffix="mmHg"
                          onChange={(value) => updateCycle(item.cycle, { capno: value })}
                        />
                        <Field
                          label="Commentaire cycle"
                          value={item.commentaire}
                          onChange={(value) => updateCycle(item.cycle, { commentaire: value })}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <div className="acr-record-right">
              <Section title="6. Analyse du dossier médical">
                <Check
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
                </Check>
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
                  <Check
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
                  </Check>
                  <Check
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
                  </Check>
                  <Check
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
                  </Check>
                </div>
              </Section>

              <Section title="7. RACS">
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
                <Check
                  checked={Boolean(record.racs.obtenu)}
                  onChange={() =>
                    updateRecord((prev) => ({
                      ...prev,
                      racs: { ...prev.racs, obtenu: !prev.racs.obtenu },
                    }))
                  }
                >
                  RACS obtenu
                </Check>
                <div className="acr-record-chip-group">
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
                <div className="acr-record-check-grid">
                  <Check
                    checked={Boolean(record.racs.monitorageComplet)}
                    onChange={() =>
                      updateRecord((prev) => ({
                        ...prev,
                        racs: { ...prev.racs, monitorageComplet: !prev.racs.monitorageComplet },
                      }))
                    }
                  >
                    Monitorage complet
                  </Check>
                  <Check
                    checked={Boolean(record.racs.ecg18d)}
                    onChange={() =>
                      updateRecord((prev) => ({
                        ...prev,
                        racs: { ...prev.racs, ecg18d: !prev.racs.ecg18d },
                      }))
                    }
                  >
                    ECG 18D
                  </Check>
                  <Check
                    checked={Boolean(record.racs.sedationAmines)}
                    onChange={() =>
                      updateRecord((prev) => ({
                        ...prev,
                        racs: { ...prev.racs, sedationAmines: !prev.racs.sedationAmines },
                      }))
                    }
                  >
                    Sédation / amines
                  </Check>
                </div>
              </Section>

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

              <Section title="9. Événements horodatés">
                <ul className="acr-record-events">
                  {events.length === 0 ? (
                    <li>Aucun événement horodaté.</li>
                  ) : (
                    events.map((event) => (
                      <li key={event.id}>
                        <span>{formatWallTime(event.at)}</span>
                        <strong>T+{formatAcrElapsed(event.t)}</strong>
                        <em>{event.label}</em>
                      </li>
                    ))
                  )}
                </ul>
              </Section>
            </div>
          </main>
        </div>

        <footer className="acr-record-toolbar" data-export-ignore="true">
          <button type="button" onClick={saveNow}>
            {saved ? "✓ Sauvegardé" : "Enregistrer"}
          </button>
          <button
            type="button"
            onClick={onShareImage}
            disabled={exporting}
            title="Partager l'image du dossier (menu Android : WhatsApp, Drive, Photos…)"
          >
            {exporting
              ? "…"
              : exportStatus === "shared"
                ? "✓ Partagé"
                : exportStatus === "downloaded"
                  ? "✓ Image"
                  : exportStatus === "error"
                    ? "Erreur"
                    : "🖼 Partager"}
          </button>
          <button type="button" onClick={printPdf}>
            Exporter PDF
          </button>
          <button type="button" onClick={onCopy}>
            {copied ? "✓ Copié" : "Copier"}
          </button>
          <button type="button" onClick={exportJson}>
            JSON
          </button>
          <button type="button" className="acr-record-danger" onClick={resetRecord}>
            Reset dossier
          </button>
        </footer>
      </div>
    </ModalDialog>
  );
};

export default AcrRecordView;
