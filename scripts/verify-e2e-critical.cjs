#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const net = require("node:net");
const { chromium } = require("@playwright/test");

const root = process.cwd();
const indexPath = path.join(root, "build", "index.html");
let port = Number(process.env.PWA_E2E_TEST_PORT || process.env.PWA_TEST_PORT || 4175);
let baseUrl = `http://127.0.0.1:${port}`;

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

const expectBody = async (page, pattern, label) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10000) {
    const body = await page.locator("body").innerText({ timeout: 10000 });
    if (pattern.test(body)) return body;
    await sleep(250);
  }
  throw new Error(`${label} introuvable`);
};

const seedOfflineProfile = async (context) => {
  await context.addInitScript(() => {
    const profile = {
      id: "e2e-critical-test",
      matricule: "M000003",
      email: "e2e.test@ghrmsa.fr",
      prenom: "Test",
      nom: "Critique",
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
  fail("build/ doit exister avant l'E2E critique (lancer npm run build)");
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
    await seedOfflineProfile(context);
    const page = await context.newPage();

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await waitForServiceWorker(page);
    await context.setOffline(true);

    await page.goto(`${baseUrl}/?page=medicaments`, { waitUntil: "domcontentloaded" });
    await expectBody(page, /Médicaments|Recherche|Adrénaline/i, "page Médicaments offline");
    await page.getByRole("spinbutton", { name: /Poids patient en kilogrammes/i }).fill("20");
    await page.getByLabel(/Rechercher un médicament/i).fill("adrénaline");
    await expectBody(page, /ADRÉNALINE|Adrénaline/i, "recherche Adrénaline");
    await page.locator("button.drug-header").filter({ hasText: /ADRÉNALINE/i }).first().click();
    await expectBody(page, /0,01 mg\/kg|0\.01 mg\/kg|0,2 mg|0\.2 mg/i, "calcul dose Adrénaline");

    await page.goto(`${baseUrl}/?page=protocoles&tab=kits`, { waitUntil: "domcontentloaded" });
    await expectBody(page, /Kit ACR|Arrêt Cardio-Respiratoire/i, "liste kits");
    await page.locator("button.drug-header").filter({ hasText: /Kit ACR/i }).first().click();
    await expectBody(page, /Adrénaline|Amiodarone|Séquence/i, "contenu Kit ACR");

    await page.locator("button.drug-header").filter({ hasText: /Kit ISR/i }).first().click();
    await page.getByRole("button", { name: /Check-list/i }).click();
    await page.locator(".kit-checklist .checklist-label").first().click();
    await expectBody(page, /1\/|complété/i, "checklist ISR cochée");

    await page.goto(`${baseUrl}/?page=protocoles&tab=incompatibilites`, {
      waitUntil: "domcontentloaded",
    });
    await expectBody(page, /Incompatibilit|Fiche|Comparer|Matrice/i, "incompatibilités offline");

    await context.close();
    ok("parcours critique E2E validé hors-ligne");
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (preview) await stopPreview(preview);
  }
})();
