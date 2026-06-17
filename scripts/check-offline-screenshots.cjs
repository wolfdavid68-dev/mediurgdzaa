#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const screenshotDir = path.join(root, "build", "offline-screenshots");
const baselinePath = path.join(root, "docs", "OFFLINE_SCREENSHOT_BASELINE.json");
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const fail = (message) => {
  console.error(`ERREUR - ${message}`);
  process.exitCode = 1;
};
const ok = (message) => console.log(`OK - ${message}`);

if (!fs.existsSync(screenshotDir)) {
  fail("captures offline absentes (lancer npm run verify:pwa-offline:browser)");
  process.exit();
}
if (!fs.existsSync(baselinePath)) {
  fail("baseline captures absente: docs/OFFLINE_SCREENSHOT_BASELINE.json");
  process.exit();
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const shrinkRatio = Number(baseline.maxShrinkRatio ?? 0.35);
const growthRatio = Number(baseline.maxGrowthRatio ?? 1.75);
const expected = baseline.screenshots ?? {};
const existing = new Set(fs.readdirSync(screenshotDir).filter((file) => file.endsWith(".png")));

Object.entries(expected).forEach(([file, spec]) => {
  const filePath = path.join(screenshotDir, file);
  if (!fs.existsSync(filePath)) {
    fail(`capture manquante: ${file}`);
    return;
  }

  const bytes = fs.readFileSync(filePath);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(pngSignature)) {
    fail(`${file}: fichier PNG invalide`);
    return;
  }

  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const minBytes = Number(spec.minBytes ?? 1000);
  const referenceBytes = Number(spec.referenceBytes ?? minBytes);
  const minHeight = Number(spec.minHeight ?? 1);

  if (width !== Number(spec.width)) {
    fail(`${file}: largeur ${width}px au lieu de ${spec.width}px`);
  }
  if (height < minHeight) {
    fail(`${file}: hauteur ${height}px < minimum ${minHeight}px`);
  }
  if (bytes.length < minBytes) {
    fail(`${file}: ${bytes.length} octets < minimum ${minBytes}`);
  }
  if (referenceBytes > 0 && bytes.length < referenceBytes * (1 - shrinkRatio)) {
    fail(`${file}: taille en baisse suspecte (${bytes.length} vs ref ${referenceBytes})`);
  }
  if (referenceBytes > 0 && bytes.length > referenceBytes * growthRatio) {
    fail(`${file}: taille en hausse suspecte (${bytes.length} vs ref ${referenceBytes})`);
  }

  // Journalise systématiquement la taille de CHAQUE capture (pas seulement en
  // cas d'échec). Sans ça, diagnostiquer une dérive de baseline imposait de
  // télécharger l'artefact ; ici le ratio observé vs ref est lisible direct
  // dans le log CI → re-baseline trivial.
  const ratio = referenceBytes > 0 ? (bytes.length / referenceBytes).toFixed(2) : "—";
  console.log(`  ${file}: ${bytes.length} octets (ref ${referenceBytes}, ×${ratio})`);
});

const unknown = [...existing].filter((file) => !(file in expected));
if (unknown.length > 0) {
  fail(`captures non referencees: ${unknown.join(", ")}`);
}

if (!process.exitCode) {
  ok(`${Object.keys(expected).length} captures offline comparees a la baseline`);
}
