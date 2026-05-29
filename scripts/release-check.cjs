#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

const steps = [
  ["Audit npm", ["audit", "--audit-level=moderate"]],
  ["Qualité code et tests", ["run", "verify"]],
  ["Rapport données cliniques strict", ["run", "report:data:strict"]],
  ["Sécurité sources/config", ["run", "verify:security"]],
  ["Build PWA", ["run", "build"]],
  ["Sécurité build", ["run", "verify:security"]],
  ["Budget bundle JS/CSS", ["run", "verify:bundle-budget"]],
  ["Manifest PWA", ["run", "verify:pwa-manifest"]],
  ["Offline statique", ["run", "verify:pwa-offline"]],
  ["Offline navigateur", ["run", "verify:pwa-offline:browser"]],
  ["Baseline captures offline", ["run", "verify:offline-screenshots"]],
  ["Accessibilité clavier", ["run", "verify:a11y-keyboard"]],
  ["E2E critique", ["run", "verify:e2e-critical"]],
  ["Performance runtime", ["run", "verify:perf-runtime"]],
  ["Format", ["run", "format:check"]],
];

const startedAt = Date.now();
const results = [];

const runNpm = (args) => {
  if (process.platform === "win32") {
    return spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npm", ...args], {
      stdio: "inherit",
    });
  }
  return spawnSync("npm", args, { stdio: "inherit" });
};

for (const [label, args] of steps) {
  const stepStart = Date.now();
  console.log(`\n== ${label} ==`);
  const result = runNpm(args);
  const seconds = ((Date.now() - stepStart) / 1000).toFixed(1);
  results.push({ label, ok: result.status === 0, seconds });
  if (result.status !== 0) {
    console.error(`\nERREUR - ${label} a échoué après ${seconds}s`);
    console.error("\nRésumé release:");
    results.forEach((item) => console.error(`${item.ok ? "OK" : "KO"} - ${item.label} (${item.seconds}s)`));
    process.exit(result.status ?? 1);
  }
}

const totalSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log("\nRésumé release:");
results.forEach((item) => console.log(`OK - ${item.label} (${item.seconds}s)`));
console.log(`\nOK - release:check complet en ${totalSeconds}s`);
