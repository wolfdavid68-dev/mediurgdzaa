import { formatAcrElapsed, formatWallTime, type AcrFullSession } from "../../lib/acrSession";

const TIMELINE_EVENT_TYPES = new Set(["start", "choc", "adre", "amio", "rosc"]);

// Dossier anonyme : pas de nom patient. Résumé clinique non identifiant.
export const displayPatient = (record: AcrFullSession) => {
  const summary = [record.patient.age && `${record.patient.age} ans`, record.patient.sexe]
    .filter(Boolean)
    .join(" · ");
  return summary || "Patient anonyme";
};

export const getTimelineEvents = (record: AcrFullSession) =>
  record.events.filter((event) => TIMELINE_EVENT_TYPES.has(event.type));

// Texte de transmission copiable, dossier anonyme — aucune donnée nominative.
export const buildRecordText = (record: AcrFullSession): string => {
  const lines: string[] = [];
  const s = record.stats;
  const timelineEvents = getTimelineEvents(record);
  lines.push(
    `BILAN ACR ANONYME — ${record.pediatric ? "Enfant" : "Adulte"} · ${record.protocol === "acls" ? "ACLS" : "ERC"}`
  );
  const ident = [record.patient.age && `${record.patient.age} ans`, record.patient.sexe]
    .filter(Boolean)
    .join(" · ");
  if (ident) lines.push(`Patient      : ${ident}`);
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
  if (timelineEvents.length > 0) {
    lines.push("");
    lines.push("Horaires RCP / traitements :");
    timelineEvents.forEach((event) => {
      lines.push(`  ${formatWallTime(event.at)} · T+${formatAcrElapsed(event.t)} · ${event.label}`);
    });
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
