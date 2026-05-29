#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const net = require("node:net");
const { chromium } = require("@playwright/test");

const root = process.cwd();
const buildDir = path.join(root, "build");
const indexPath = path.join(buildDir, "index.html");
const screenshotDir = path.join(buildDir, "offline-screenshots");
let port = Number(process.env.PWA_TEST_PORT || 4173);
let baseUrl = `http://127.0.0.1:${port}`;
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablette", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 900 },
];

const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
};

const ok = (message) => {
  console.log(`✓ ${message}`);
};

const findFreePort = (candidate) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(findFreePort(candidate + 1)));
    server.once("listening", () => {
      server.close(() => resolve(candidate));
    });
    server.listen(candidate, "127.0.0.1");
  });

if (!fs.existsSync(indexPath)) {
  fail("build/ doit exister avant le test navigateur offline (lancer npm run build)");
  process.exit();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForPreview = async (child) => {
  let exitCode = null;
  child.on("exit", (code) => {
    exitCode = code;
  });

  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (exitCode !== null) {
      throw new Error(`vite preview s'est arrêté trop tôt (code ${exitCode})`);
    }
    try {
      const resp = await fetch(baseUrl);
      if (resp.ok) return;
    } catch {
      // Serveur pas encore prêt.
    }
    await sleep(250);
  }
  throw new Error("vite preview n'a pas démarré dans les temps");
};

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
  await waitForPreview(child);
  return child;
};

const stopPreview = (child) =>
  new Promise((resolve) => {
    if (process.platform !== "win32") {
      child.kill();
      resolve();
      return;
    }
    const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    killer.on("exit", resolve);
    killer.on("error", () => {
      child.kill();
      resolve();
    });
  });

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
        setTimeout(() => reject(new Error("service worker non prêt après 15 s")), 15000);
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
  await page.screenshot({ path: filePath, fullPage: true });
  const bytes = fs.statSync(filePath).size;
  if (bytes < 1000) {
    throw new Error(`capture ${filename} vide ou trop petite (${bytes} octets)`);
  }
};

(async () => {
  let preview;
  let browser;
  try {
    port = await findFreePort(port);
    baseUrl = `http://127.0.0.1:${port}`;
    fs.rmSync(screenshotDir, { recursive: true, force: true });
    fs.mkdirSync(screenshotDir, { recursive: true });
    preview = await startPreview();
    browser = await chromium.launch();
    const context = await browser.newContext({ serviceWorkers: "allow" });
    const page = await context.newPage();

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await waitForServiceWorker(page);
    ok("service worker installé et contrôleur actif en navigateur");

    await page.evaluate(() => {
      const profile = {
        id: "offline-browser-test",
        matricule: "M000001",
        email: "offline.test@ghrmsa.fr",
        prenom: "Test",
        nom: "Offline",
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
    await expectVisibleText(page, /M[ée]dicaments|Recherche/i, "route Médicaments");
    ok("navigation Médicaments servie hors-ligne");

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
        pattern: /M[ée]dicaments|Recherche/i,
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
    ok("captures offline multi-viewports enregistrées");

    await context.setOffline(false);
    await context.close();
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (preview) {
      await stopPreview(preview);
    }
  }
})();
