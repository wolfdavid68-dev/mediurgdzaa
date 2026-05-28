#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DRUGS } from "../src/data/drugs.js";
import { PSE } from "../src/data/pse.js";
import { INCOMPATIBILITIES } from "../src/data/incompatibilities.js";
import { PROTOCOLS } from "../src/data/protocols.js";
import { PREP_KITS } from "../src/data/prepKits.js";
import { APP_VERSION } from "../src/data/changelog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "docs", "RAPPORT_DONNEES_CLINIQUES.md");

const countBy = (items, getter) =>
  items.reduce((acc, item) => {
    const key = getter(item) || "Non renseigné";
    acc.set(key, (acc.get(key) ?? 0) + 1);
    return acc;
  }, new Map());

const rows = (entries) =>
  [...entries]
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]), "fr"))
    .map(([label, count]) => `| ${label} | ${count} |`)
    .join("\n");

const drugIds = new Set(DRUGS.map((drug) => drug.id));
const pseIds = new Set(Object.keys(PSE).map(Number));
const incompatNames = new Set(INCOMPATIBILITIES.map((entry) => entry.drug));
const alerts = [];

const duplicateIds = DRUGS.map((drug) => drug.id).filter(
  (id, index, ids) => ids.indexOf(id) !== index
);
if (duplicateIds.length > 0) alerts.push(`IDs médicaments dupliqués : ${duplicateIds.join(", ")}`);

const orphanPse = [...pseIds].filter((id) => !drugIds.has(id));
if (orphanPse.length > 0) alerts.push(`Entrées PSE sans médicament : ${orphanPse.join(", ")}`);

PREP_KITS.forEach((kit) => {
  kit.drogues.forEach((drogue) => {
    if (drogue.drugId !== undefined && !drugIds.has(drogue.drugId)) {
      alerts.push(`Kit ${kit.id} : drugId ${drogue.drugId} introuvable (${drogue.nom})`);
    }
  });
});

INCOMPATIBILITIES.forEach((entry) => {
  (entry.items ?? []).forEach((item) => {
    if (!incompatNames.has(item.with))
      alerts.push(`${entry.drug} → with introuvable : ${item.with}`);
  });
  (entry.compatibleWith ?? []).forEach((name) => {
    if (!incompatNames.has(name))
      alerts.push(`${entry.drug} → compatibleWith introuvable : ${name}`);
  });
});

const sectionTypes = countBy(
  PROTOCOLS.flatMap((protocol) => protocol.sections),
  (section) => section.type
);
const kitChecklistItems = PREP_KITS.flatMap((kit) => kit.checklist ?? []).flatMap(
  (section) => section.items
);
const generatedAt = new Date().toISOString().slice(0, 10);

const report = `# Rapport données cliniques MediURG

Généré le ${generatedAt} pour ${APP_VERSION}.

## Synthèse

| Domaine | Volume |
| --- | ---: |
| Médicaments | ${DRUGS.length} |
| Médicaments avec préparation | ${DRUGS.filter((drug) => Boolean(drug.prep)).length} |
| Entrées PSE | ${Object.keys(PSE).length} |
| Protocoles | ${PROTOCOLS.length} |
| Kits de préparation | ${PREP_KITS.length} |
| Entrées incompatibilités | ${INCOMPATIBILITIES.length} |
| Items de check-list kit | ${kitChecklistItems.length} |

## Répartition médicaments

| Catégorie | Nombre |
| --- | ---: |
${rows(countBy(DRUGS, (drug) => drug.cat))}

## Couverture services

| Service | Nombre |
| --- | ---: |
${rows(
  countBy(
    DRUGS.flatMap((drug) => drug.svc ?? []),
    (service) => service
  )
)}

## Protocoles

| Type de section | Nombre |
| --- | ---: |
${rows(sectionTypes)}

## Kits

| Kit | Drogues | Matériel | Check-list |
| --- | ---: | ---: | ---: |
${PREP_KITS.map(
  (kit) =>
    `| ${kit.nom} | ${kit.drogues.length} | ${kit.materiel.length} | ${
      kit.checklist?.reduce((sum, section) => sum + section.items.length, 0) ?? 0
    } |`
).join("\n")}

## Alertes automatiques

${
  alerts.length === 0
    ? "Aucune alerte de cohérence détectée."
    : alerts.map((alert) => `- ${alert}`).join("\n")
}

## Notes

- Ce rapport ne valide pas la justesse clinique des doses ; il résume la structure et les liens internes.
- Les tests automatisés restent la source bloquante pour les invariants critiques.
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, report, "utf8");
console.log(`Rapport écrit : ${path.relative(root, outPath)}`);
