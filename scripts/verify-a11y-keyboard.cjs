#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const net = require("node:net");
const { chromium } = require("@playwright/test");

const root = process.cwd();
const indexPath = path.join(root, "build", "index.html");
let port = Number(process.env.PWA_KEYBOARD_TEST_PORT || process.env.PWA_TEST_PORT || 4174);
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

const waitForPreview = async (child) => {
  let exitCode = null;
  child.on("exit", (code) => {
    exitCode = code;
  });
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (exitCode !== null) throw new Error(`vite preview s'est arrêté trop tôt (code ${exitCode})`);
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
          detached: true,
          env: { ...process.env, BROWSER: "none" },
          stdio: ["ignore", "ignore", "ignore"],
        });
  child.stdout?.resume();
  child.stderr?.resume();
  await waitForPreview(child);
  return child;
};

const stopPreview = (child) =>
  new Promise((resolve) => {
    if (process.platform !== "win32") {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      child.once("exit", finish);
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill();
      }
      setTimeout(() => {
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {
          // Processus deja termine.
        }
        finish();
      }, 3000).unref?.();
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

const expectVisibleText = async (page, pattern, label) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10000) {
    const body = await page.locator("body").innerText({ timeout: 10000 });
    if (pattern.test(body)) return;
    await sleep(250);
  }
  throw new Error(`${label} introuvable`);
};

const waitForServiceWorker = async (page) => {
  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) {
      throw new Error("serviceWorker indisponible dans ce navigateur");
    }
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

const focusedSignature = () => {
  const element = document.activeElement;
  if (!element || element === document.body) return "";
  const text = (element.textContent || element.getAttribute("aria-label") || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return `${element.tagName}.${element.className}:${text}`;
};

const assertTouchTargets = async (page, label) => {
  const violations = await page.evaluate(() => {
    const controls = document.querySelectorAll("button, [role='button'], [role='tab']");
    return [...controls]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const minSize =
          window.innerWidth <= 640 && element.hasAttribute("data-compact-hit") ? 36 : 40;
        return {
          label: (element.getAttribute("aria-label") || element.textContent || element.className)
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 48),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          minSize,
        };
      })
      .filter(({ width, height, minSize }) => width < minSize || height < minSize);
  });

  if (violations.length > 0) {
    const details = violations
      .slice(0, 8)
      .map(
        ({ label: control, width, height, minSize }) =>
          `${control || "contrôle"} (${width}×${height}, minimum ${minSize})`
      )
      .join(", ");
    throw new Error(`${label}: cibles tactiles sous le minimum attendu — ${details}`);
  }
};

const assertMobileHeaderDensity = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/?page=medicaments`, { waitUntil: "networkidle" });
  await expectVisibleText(page, /Médicaments|Recherche|Adrénaline/i, "Médicaments mobile");

  const filtersToggle = page.locator(".filters-toggle");
  await filtersToggle.click({ timeout: 5000 });
  const controls = await page.locator("[data-compact-hit]").evaluateAll((elements) =>
    elements
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.height > 0;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: (element.getAttribute("aria-label") || element.textContent || element.className)
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 48),
          height: Math.round(rect.height),
        };
      })
  );
  const invalid = controls.filter(({ height }) => height !== 36);
  if (controls.length === 0 || invalid.length > 0) {
    const details = invalid.map(({ label, height }) => `${label} (${height}px)`).join(", ");
    throw new Error(`header mobile : hauteur compacte inattendue${details ? ` — ${details}` : ""}`);
  }
  await assertTouchTargets(page, "Médicaments mobile compact");
};

const assertTabStops = async (page, route, pattern, label, minStops) => {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  await expectVisibleText(page, pattern, label);
  if (!route.includes("mode=acr")) {
    await page.keyboard.press("Escape");
    await sleep(250);
  }

  await assertTouchTargets(page, label);

  const seen = new Set();
  for (let index = 0; index < 36; index++) {
    await page.keyboard.press("Tab");
    const signature = await page.evaluate(focusedSignature);
    if (signature) seen.add(signature);
  }
  if (seen.size < minStops) {
    throw new Error(
      `${label}: seulement ${seen.size} focus clavier distinct(s), attendu ${minStops}`
    );
  }
};

if (!fs.existsSync(indexPath)) {
  fail("build/ doit exister avant l'audit clavier (lancer npm run build)");
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
    const context = await browser.newContext();
    await context.addInitScript(() => {
      const profile = {
        id: "keyboard-test",
        matricule: "M000002",
        email: "keyboard.test@ghrmsa.fr",
        prenom: "Test",
        nom: "Clavier",
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
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await waitForServiceWorker(page);
    await context.setOffline(true);

    await assertTabStops(page, "/?mode=acr", /Urgence vitale|ACR|Adulte|Enfant/i, "ACR", 3);
    await page
      .locator(".acr-mode-close")
      .click({ timeout: 5000 })
      .catch(() => {});
    await assertTabStops(
      page,
      "/?page=medicaments",
      /Médicaments|Recherche|Adrénaline/i,
      "Médicaments",
      10
    );
    await assertTabStops(page, "/?page=protocoles&tab=kits", /Kits|Kit ISR|Réarmement/i, "Kits", 8);
    await assertTabStops(
      page,
      "/?page=protocoles&tab=incompatibilites",
      /Incompatibilit|Fiche|Comparer|Matrice/i,
      "Incompatibilités",
      8
    );
    await assertTabStops(page, "/?page=echelles", /Échelles|Glasgow|RASS/i, "Échelles", 8);

    await page.goto(`${baseUrl}/?page=protocoles&tab=incompatibilites`, {
      waitUntil: "networkidle",
    });
    await page.getByRole("button", { name: "Comparer" }).focus();
    await page.keyboard.press("Enter");
    await expectVisibleText(page, /Médicament A|Medicament A/i, "activation clavier Comparer");

    await assertMobileHeaderDensity(page);

    await context.close();
    ok("navigation clavier, cibles tactiles et densité du header mobile validées");
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (preview) await stopPreview(preview);
  }
})();
