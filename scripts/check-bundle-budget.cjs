#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const root = process.cwd();
const buildStaticDir = path.join(root, "build", "static");
const baselinePath = path.join(root, "docs", "BUNDLE_BUDGET_BASELINE.json");
const reportDir = path.join(root, "build", "reports");

const fail = (message) => {
  console.error(`ERREUR - ${message}`);
  process.exitCode = 1;
};
const ok = (message) => console.log(`OK - ${message}`);

const assetBaseName = (asset, ext) =>
  path.basename(asset, ext).replace(/\.[A-Za-z0-9_-]+$/, "");

const gzipKb = (filePath) => zlib.gzipSync(fs.readFileSync(filePath)).length / 1024;

const readCurrentAssets = (kind) => {
  const ext = `.${kind}`;
  const dir = path.join(buildStaticDir, kind);
  const current = new Map();
  if (!fs.existsSync(dir)) return current;
  fs.readdirSync(dir)
    .filter((file) => file.endsWith(ext))
    .forEach((file) => {
      const name = assetBaseName(file, ext);
      current.set(name, {
        file,
        gzipKb: gzipKb(path.join(dir, file)),
      });
    });
  return current;
};

const checkGroup = ({ label, current, baseline, allowGrowthKb }) => {
  const failures = [];
  const rows = [];

  Object.entries(baseline ?? {}).forEach(([name, baseKb]) => {
    const now = current.get(name);
    if (!now) {
      failures.push(`${label} ${name}: absent du build`);
      return;
    }
    const maxKb = Number(baseKb) + allowGrowthKb;
    rows.push({
      type: label,
      name,
      file: now.file,
      baselineKb: Number(baseKb),
      gzipKb: now.gzipKb,
      deltaKb: now.gzipKb - Number(baseKb),
      maxKb,
    });
    if (now.gzipKb > maxKb) {
      failures.push(
        `${label} ${name}: ${now.gzipKb.toFixed(2)} kB gzip > baseline ${baseKb} + ${allowGrowthKb}`
      );
    }
  });

  const unknown = [...current.keys()].filter((name) => !(name in (baseline ?? {})));
  if (unknown.length > 0) {
    failures.push(`${label} nouveaux sans baseline: ${unknown.join(", ")}`);
  }

  return { failures, rows };
};

if (!fs.existsSync(buildStaticDir)) {
  fail("build/static introuvable (lancer npm run build avant le budget bundle)");
  process.exit();
}
if (!fs.existsSync(baselinePath)) {
  fail("baseline bundle introuvable: docs/BUNDLE_BUDGET_BASELINE.json");
  process.exit();
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const allowGrowthKb = Number(baseline.allowGrowthKb ?? 10);
const currentJs = readCurrentAssets("js");
const currentCss = readCurrentAssets("css");

const jsResult = checkGroup({
  label: "js",
  current: currentJs,
  baseline: baseline.chunks,
  allowGrowthKb,
});
const cssResult = checkGroup({
  label: "css",
  current: currentCss,
  baseline: baseline.css,
  allowGrowthKb: Number(baseline.allowCssGrowthKb ?? allowGrowthKb),
});

const rows = [...jsResult.rows, ...cssResult.rows].sort((a, b) =>
  `${a.type}-${a.name}`.localeCompare(`${b.type}-${b.name}`, "fr")
);
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(
  path.join(reportDir, "bundle-budget.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2),
  "utf8"
);
fs.writeFileSync(
  path.join(reportDir, "bundle-budget.md"),
  [
    "# Budget bundle MediURG",
    "",
    `Généré le ${new Date().toISOString()}.`,
    "",
    "| Type | Chunk | Gzip actuel | Baseline | Delta | Maximum |",
    "| --- | --- | ---: | ---: | ---: | ---: |",
    ...rows.map(
      (row) =>
        `| ${row.type} | ${row.name} | ${row.gzipKb.toFixed(2)} kB | ${row.baselineKb.toFixed(
          2
        )} kB | ${row.deltaKb.toFixed(2)} kB | ${row.maxKb.toFixed(2)} kB |`
    ),
    "",
  ].join("\n"),
  "utf8"
);

const failures = [...jsResult.failures, ...cssResult.failures];
if (failures.length > 0) {
  failures.forEach(fail);
} else {
  ok(
    `budget bundle respecté (${currentJs.size} JS, ${currentCss.size} CSS, rapports dans build/reports)`
  );
}
