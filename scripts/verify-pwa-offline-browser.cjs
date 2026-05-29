#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");
const { findFreePort, sleep, startPreview, stopPreview } = require("./lib/preview-server.cjs");

const root = process.cwd();
const buildDir = path.join(root, "build");
const indexPath = path.join(buildDir, "index.html");
const screenshotDir = path.join(buildDir, "offline-screenshots");
let port = Number(process.env.PWA_TEST_PORT || 4173);
let baseUrl = `http://127.0.0.1:${port}`;
const SCRIPT_TIMEOUT_MS = Number(process.env.PWA_BROWSER_TIMEOUT_MS || 180000);
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablette", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 900 },
];

const fail = (message) => {
  console.error(`ERREUR - ${message}`);
  process.exitCode = 1;
};

const ok = (message) => {
  console.log(`OK - ${message}`);
};

if (!fs.existsSync(indexPath)) {
  fail("build/ doit exister avant le test navigateur offline (lancer npm run build)");
  process.exit();
}

const waitForServiceWorker = async (page) => {
  await page.evaluate(async () => {
    await Promise.race([
      (async () => {
        if (!("serviceWorker" in navigator)) {
          throw new Error("serviceWorker indisponible dans ce navigateur");
        }
        const registration = await navigator.serviceWorker.ready;
        const installing = registration.installing || registration.waiting;
        if (installing) {
          await new Promise((resolve) => {
            installing.addEventListener("statechange", () => {
              if (installing.state === "activated") resolve();
            });
          });
        }
      })(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("service worker non pret apres 15 s")), 15000);
      }),
    ]);
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

const expectVisibleText = async (page, pattern, label) => {
  const startedAt = Date.now();
  let body = "";
  while (Date.now() - startedAt < 10000) {
    body = await page.locator("body").innerText({ timeout: 10000 });
    if (pattern.test(body)) return;
    await sleep(250);
  }
  throw new Error(`${label} introuvable dans la page offline`);
};

const screenshotOfflineRoute = async (page, viewport, route, pattern, label, filename) => {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  await expectVisibleText(page, pattern, label);
  const filePath = path.join(screenshotDir, filename);
  console.log(`Capture offline ${filename}`);
  await page.screenshot({
    path: filePath,
    fullPage: true,
    animations: "disabled",
    caret: "hide",
    timeout: 20000,
  });
  const bytes = fs.statSync(filePath).size;
  if (bytes < 1000) {
    throw new Error(`capture ${filename} vide ou trop petite (${bytes} octets)`);
  }
};

let preview;
let browser;
let cleanupStarted = false;

const cleanup = async () => {
  if (cleanupStarted) return;
  cleanupStarted = true;
  if (browser) await browser.close().catch(() => {});
  if (preview) await stopPreview(preview);
};

const hardTimeout = setTimeout(() => {
  console.error(`ERREUR - audit navigateur offline interrompu apres ${SCRIPT_TIMEOUT_MS} ms`);
  cleanup().finally(() => process.exit(1));
  setTimeout(() => process.exit(1), 5000).unref?.();
}, SCRIPT_TIMEOUT_MS);
hardTimeout.unref?.();

(async () => {
  try {
    port = await findFreePort(port);
    baseUrl = `http://127.0.0.1:${port}`;
    fs.rmSync(screenshotDir, { recursive: true, force: true });
    fs.mkdirSync(screenshotDir, { recursive: true });
    preview = await startPreview({ root, port });
    browser = await chromium.launch(
      process.env.CI ? { args: ["--disable-dev-shm-usage"] } : undefined
    );
    const context = await browser.newContext({ serviceWorkers: "allow" });
    const page = await context.newPage();

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await waitForServiceWorker(page);
    ok("service worker installe et controleur actif en navigateur");

    await page.evaluate(() => {
      const profile = {
        id: "offline-browser-test",
        matricule: "M000001",
        email: "offline.test@ghrmsa.fr",
        prenom: "Test",
        nom: "Offline",
        fonction: "Medecin urgentiste",
        service: "SAU",
        status: "active",
        role: "user",
        created_at: "2026-01-01T00:00:00.000Z",
        approved_at: "2026-01-01T00:00:00.000Z",
        approved_by: null,
        banned_at: null,
        ban_reason: null,
      };
      localStorage.setItem(
        "mediurg-profile-cache-v1",
        JSON.stringify({ id: profile.id, profile, at: Date.now() })
      );
    });

    await context.setOffline(true);

    await page.goto(`${baseUrl}/?page=protocoles&tab=incompatibilites`, {
      waitUntil: "domcontentloaded",
    });
    await expectVisibleText(page, /Protocoles|Incompatibilit/i, "route Protocoles");
    ok("navigation Protocoles servie hors-ligne");

    await page.goto(`${baseUrl}/?page=protocoles&tab=kits`, {
      waitUntil: "domcontentloaded",
    });
    await expectVisibleText(page, /Kits|Kit ISR|R.armement/i, "route Kits");
    ok("navigation Kits servie hors-ligne");

    await page.goto(`${baseUrl}/?mode=acr`, { waitUntil: "domcontentloaded" });
    await expectVisibleText(page, /Urgence vitale|ACR|Adulte|Enfant/i, "raccourci ACR");
    ok("raccourci ACR servi hors-ligne");

    await page.goto(`${baseUrl}/?page=medicaments`, { waitUntil: "domcontentloaded" });
    await expectVisibleText(page, /M[eé]dicaments|Recherche/i, "route Medicaments");
    ok("navigation Medicaments servie hors-ligne");

    const clinicalScreens = [
      {
        route: "/?mode=acr",
        pattern: /Urgence vitale|ACR|Adulte|Enfant/i,
        label: "capture ACR",
        file: "acr",
      },
      {
        route: "/?page=protocoles&tab=kits",
        pattern: /Kits|Kit ISR|R.armement/i,
        label: "capture Kits",
        file: "kits",
      },
      {
        route: "/?page=protocoles&tab=incompatibilites",
        pattern: /Protocoles|Incompatibilit/i,
        label: "capture Incompatibilites",
        file: "incompatibilites",
      },
      {
        route: "/?page=medicaments",
        pattern: /M[eé]dicaments|Recherche/i,
        label: "capture Medicaments",
        file: "medicaments",
      },
    ];
    for (const viewport of VIEWPORTS) {
      for (const screen of clinicalScreens) {
        await screenshotOfflineRoute(
          page,
          viewport,
          screen.route,
          screen.pattern,
          `${screen.label} ${viewport.name}`,
          `${viewport.name}-${screen.file}.png`
        );
      }
    }

    await page.evaluate(() => {
      localStorage.removeItem("mediurg-profile-cache-v1");
      Object.keys(localStorage)
        .filter((key) => key.startsWith("sb-") || key.includes("supabase"))
        .forEach((key) => localStorage.removeItem(key));
    });
    for (const viewport of VIEWPORTS) {
      await screenshotOfflineRoute(
        page,
        viewport,
        "/",
        /Connexion|Matricule|Mot de passe/i,
        `capture Login ${viewport.name}`,
        `${viewport.name}-login.png`
      );
    }
    ok("captures offline multi-viewports enregistrees");

    await context.setOffline(false);
    await context.close();
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  } finally {
    clearTimeout(hardTimeout);
    await cleanup();
  }
})();
