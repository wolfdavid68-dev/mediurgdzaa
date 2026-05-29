#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const net = require("node:net");
const { chromium } = require("@playwright/test");

const root = process.cwd();
const indexPath = path.join(root, "build", "index.html");
const reportDir = path.join(root, "build", "reports");
let port = Number(process.env.PWA_PERF_TEST_PORT || process.env.PWA_TEST_PORT || 4176);
let baseUrl = `http://127.0.0.1:${port}`;

const thresholds = {
  shellReadyMs: 2500,
  searchAdrMs: 900,
  kitsReadyMs: 1800,
  incompatReadyMs: 1800,
};

const fail = (message) => {
  console.error(`ERREUR - ${message}`);
  process.exitCode = 1;
};
const ok = (message) => console.log(`OK - ${message}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const findFreePort = (candidate) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(findFreePort(candidate + 1)));
    server.once("listening", () => {
      server.close(() => resolve(candidate));
    });
    server.listen(candidate, "127.0.0.1");
  });

const startPreview = async () => {
  const args = [
    "run",
    "preview",
    "--",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ];
  const child =
    process.platform === "win32"
      ? spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `npm ${args.join(" ")}`], {
          cwd: root,
          env: { ...process.env, BROWSER: "none" },
          stdio: ["ignore", "pipe", "pipe"],
        })
      : spawn("npm", args, {
          cwd: root,
          env: { ...process.env, BROWSER: "none" },
          stdio: ["ignore", "pipe", "pipe"],
        });
  child.stdout.resume();
  child.stderr.resume();

  let exitCode = null;
  child.on("exit", (code) => {
    exitCode = code;
  });
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (exitCode !== null) throw new Error(`vite preview s'est arrêté trop tôt (code ${exitCode})`);
    try {
      const resp = await fetch(baseUrl);
      if (resp.ok) return child;
    } catch {
      // Serveur pas encore prêt.
    }
    await sleep(250);
  }
  throw new Error("vite preview n'a pas démarré dans les temps");
};

const stopPreview = (child) =>
  new Promise((resolve) => {
    if (process.platform !== "win32") {
      child.kill();
      resolve();
      return;
    }
    const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    killer.on("exit", resolve);
    killer.on("error", () => {
      child.kill();
      resolve();
    });
  });

const waitForBody = async (page, pattern, label) => {
  const started = performance.now();
  while (performance.now() - started < 10000) {
    const body = await page.locator("body").innerText({ timeout: 10000 });
    if (pattern.test(body)) return performance.now() - started;
    await sleep(50);
  }
  throw new Error(`${label} introuvable`);
};

const waitForServiceWorker = async (page) => {
  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) throw new Error("serviceWorker indisponible");
    await navigator.serviceWorker.ready;
  });
  try {
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
      timeout: 10000,
    });
  } catch {
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
      timeout: 10000,
    });
  }
};

const seedProfile = async (context) => {
  await context.addInitScript(() => {
    const profile = {
      id: "perf-test",
      matricule: "M000004",
      email: "perf.test@ghrmsa.fr",
      prenom: "Test",
      nom: "Perf",
      fonction: "Médecin urgentiste",
      service: "SAU",
      status: "active",
      role: "user",
      created_at: "2026-01-01T00:00:00.000Z",
      approved_at: "2026-01-01T00:00:00.000Z",
      approved_by: null,
      banned_at: null,
      ban_reason: null,
    };
    localStorage.setItem("mediurg-charter-accepted", "1.0|2026-01-01T00:00:00.000Z");
    localStorage.setItem("mediurg-announce", "ecg-1");
    localStorage.setItem(
      "mediurg-profile-cache-v1",
      JSON.stringify({ id: profile.id, profile, at: Date.now() })
    );
  });
};

if (!fs.existsSync(indexPath)) {
  fail("build/ doit exister avant l'audit perf runtime (lancer npm run build)");
  process.exit();
}

(async () => {
  let preview;
  let browser;
  try {
    port = await findFreePort(port);
    baseUrl = `http://127.0.0.1:${port}`;
    preview = await startPreview();
    browser = await chromium.launch();
    const context = await browser.newContext({ serviceWorkers: "allow" });
    await seedProfile(context);
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await waitForServiceWorker(page);
    await context.setOffline(true);

    const measures = {};
    const shellStart = performance.now();
    await page.goto(`${baseUrl}/?page=medicaments`, { waitUntil: "domcontentloaded" });
    await waitForBody(page, /Médicaments|Recherche|ADRÉNALINE/i, "shell Médicaments");
    measures.shellReadyMs = performance.now() - shellStart;

    const searchStart = performance.now();
    await page.getByLabel(/Rechercher un médicament/i).fill("adrénaline");
    await waitForBody(page, /ADRÉNALINE/i, "recherche Adrénaline");
    measures.searchAdrMs = performance.now() - searchStart;

    const kitsStart = performance.now();
    await page.goto(`${baseUrl}/?page=protocoles&tab=kits`, { waitUntil: "domcontentloaded" });
    await waitForBody(page, /Kit ISR|Kit ACR|Réarmement/i, "Kits");
    measures.kitsReadyMs = performance.now() - kitsStart;

    const incompatStart = performance.now();
    await page.goto(`${baseUrl}/?page=protocoles&tab=incompatibilites`, {
      waitUntil: "domcontentloaded",
    });
    await waitForBody(page, /Incompatibilit|Fiche|Comparer|Matrice/i, "Incompatibilités");
    measures.incompatReadyMs = performance.now() - incompatStart;

    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(
      path.join(reportDir, "runtime-performance.json"),
      JSON.stringify({ generatedAt: new Date().toISOString(), thresholds, measures }, null, 2),
      "utf8"
    );
    fs.writeFileSync(
      path.join(reportDir, "runtime-performance.md"),
      [
        "# Performance runtime MediURG",
        "",
        `Généré le ${new Date().toISOString()}.`,
        "",
        "| Mesure | Actuel | Seuil |",
        "| --- | ---: | ---: |",
        ...Object.entries(measures).map(
          ([name, value]) => `| ${name} | ${Math.round(value)} ms | ${thresholds[name]} ms |`
        ),
        "",
      ].join("\n"),
      "utf8"
    );

    const failures = Object.entries(measures).filter(([name, value]) => value > thresholds[name]);
    if (failures.length > 0) {
      failures.forEach(([name, value]) =>
        fail(`${name}: ${Math.round(value)} ms > seuil ${thresholds[name]} ms`)
      );
    } else {
      ok("seuils de performance runtime respectés");
    }

    await context.close();
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (preview) await stopPreview(preview);
  }
})();
