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
const protocolCardPath = path.join(root, "src", "components", "ProtocolCard.tsx");
const strict = process.argv.includes("--strict");

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
const drugsById = new Map(DRUGS.map((drug) => [drug.id, drug]));
const pseIds = new Set(Object.keys(PSE).map(Number));
const incompatNames = new Set(INCOMPATIBILITIES.map((entry) => entry.drug));
const alerts = [];
const warnings = [];

const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const doseKgPattern =
  /\d+(?:[,.]\d+)?\s*(?:mg|µg|mcg|mL|ml|g|UI|U|mmol|mEq|γ)(?:\s+[A-Z]{1,4})?\/kg/i;
const looksLikeWeightDose = /\/kg/i;

const parseDrugPatterns = () => {
  if (!fs.existsSync(protocolCardPath)) return [];
  const source = fs.readFileSync(protocolCardPath, "utf8");
  const match = source.match(/DRUG_PATTERNS\s*=\s*\[([\s\S]*?)\];/);
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
};

const drugPatterns = parseDrugPatterns();
const normalizedDrugPatterns = drugPatterns.map(normalize);

const duplicateIds = DRUGS.map((drug) => drug.id).filter(
  (id, index, ids) => ids.indexOf(id) !== index
);
if (duplicateIds.length > 0) alerts.push(`IDs médicaments dupliqués : ${duplicateIds.join(", ")}`);

const orphanPse = [...pseIds].filter((id) => !drugIds.has(id));
if (orphanPse.length > 0) alerts.push(`Entrées PSE sans médicament : ${orphanPse.join(", ")}`);

[...pseIds].forEach((id) => {
  const drug = drugsById.get(id);
  if (drug && !drug.prep) {
    warnings.push(`PSE ${id} ${drug.nom} : aucune préparation structurée dans DRUGS`);
  }
});

DRUGS.forEach((drug) => {
  ["a", "p"].forEach((group) => {
    (drug.poso?.[group] ?? []).forEach((line, index) => {
      if (looksLikeWeightDose.test(line) && !doseKgPattern.test(line)) {
        alerts.push(`${drug.id} ${drug.nom} poso.${group}[${index}] : dose /kg non parsable`);
      }
    });
  });
});

PREP_KITS.forEach((kit) => {
  if (!kit.drogues?.length) warnings.push(`Kit ${kit.id} : aucune drogue renseignée`);
  if (!kit.materiel?.length) warnings.push(`Kit ${kit.id} : aucun matériel renseigné`);
  kit.drogues.forEach((drogue) => {
    if (drogue.drugId !== undefined && !drugIds.has(drogue.drugId)) {
      alerts.push(`Kit ${kit.id} : drugId ${drogue.drugId} introuvable (${drogue.nom})`);
    }
  });
  (kit.checklist ?? []).forEach((section) => {
    if (!section.items?.length)
      warnings.push(`Kit ${kit.id} : section checklist vide (${section.titre})`);
    section.items.forEach((item) => {
      if (item.type === "select" && item.from) {
        const needle = normalize(item.from);
        const hasMatch = kit.drogues.some((drogue) => normalize(drogue.role).includes(needle));
        if (!hasMatch) {
          alerts.push(
            `Kit ${kit.id} : select "${item.label}" from="${item.from}" sans drogue correspondante`
          );
        }
      }
    });
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

const protocolTexts = PROTOCOLS.map((protocol) => ({
  code: protocol.code,
  text: normalize(
    [
      protocol.titre,
      ...(protocol.sections ?? []).flatMap((section) => [
        section.titre,
        ...(section.items ?? []).flatMap((item) => [item.text, ...(item.sub ?? [])]),
      ]),
    ].join(" ")
  ),
}));

const genericDrugTerms = new Set([
  "solution",
  "oxygen",
  "oxygene",
  "glucose",
  "sodium",
  "chlorure",
  "physiologique",
  "physiologiques",
]);
const drugTerms = DRUGS.flatMap((drug) => [drug.nom, drug.dci, drug.commercial])
  .flatMap((value) => String(value ?? "").split(/[+/(),®\s]+/))
  .map((term) => term.trim())
  .filter((term) => term.length >= 6)
  .filter((term, index, arr) => arr.indexOf(term) === index)
  .filter((term) => !genericDrugTerms.has(normalize(term)));

const unlinkedProtocolMentions = [];
drugTerms.forEach((term) => {
  const normalizedTerm = normalize(term);
  const isLinked = normalizedDrugPatterns.some(
    (pattern) => pattern.includes(normalizedTerm) || normalizedTerm.includes(pattern)
  );
  if (isLinked) return;
  protocolTexts.forEach((protocol) => {
    if (protocol.text.includes(normalizedTerm)) {
      unlinkedProtocolMentions.push(
        `${protocol.code} mentionne "${term}" sans DRUG_PATTERNS évident`
      );
    }
  });
});
if (unlinkedProtocolMentions.length > 0) {
  warnings.push(...unlinkedProtocolMentions.slice(0, 30));
  if (unlinkedProtocolMentions.length > 30) {
    warnings.push(`${unlinkedProtocolMentions.length - 30} autres mentions protocole à vérifier`);
  }
}

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

## Points de vigilance

${
  warnings.length === 0
    ? "Aucun point de vigilance structurel détecté."
    : warnings.map((warning) => `- ${warning}`).join("\n")
}

## Notes

- Ce rapport ne valide pas la justesse clinique des doses ; il résume la structure et les liens internes.
- Les tests automatisés restent la source bloquante pour les invariants critiques.
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, report, "utf8");
console.log(`Rapport écrit : ${path.relative(root, outPath)}`);

if (strict && alerts.length > 0) {
  console.error(`Mode strict : ${alerts.length} alerte(s) de cohérence clinique.`);
  process.exit(1);
}
