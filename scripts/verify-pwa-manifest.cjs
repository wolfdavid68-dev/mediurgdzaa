#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const buildDir = path.join(root, "build");
const manifestPath = path.join(buildDir, "manifest.webmanifest");
const errors = [];

const fail = (message) => errors.push(message);
const ok = (message) => console.log(`OK - ${message}`);

if (!fs.existsSync(manifestPath)) {
  fail("manifest.webmanifest introuvable (lancer npm run build)");
} else {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const required = {
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
  };

  Object.entries(required).forEach(([key, expected]) => {
    if (manifest[key] !== expected) fail(`manifest.${key}=${manifest[key]} au lieu de ${expected}`);
  });
  if (!manifest.name?.includes("MediURG")) fail("manifest.name doit identifier MediURG");
  if (!manifest.short_name) fail("manifest.short_name manquant");
  if (!/^#[0-9a-f]{6}$/i.test(manifest.theme_color ?? "")) {
    fail("manifest.theme_color doit etre une couleur hexadécimale");
  }
  if (!/^#[0-9a-f]{6}$/i.test(manifest.background_color ?? "")) {
    fail("manifest.background_color doit etre une couleur hexadécimale");
  }

  const icons = manifest.icons ?? [];
  const iconSizes = new Set(icons.flatMap((icon) => String(icon.sizes ?? "").split(/\s+/)));
  ["64x64", "192x192", "512x512"].forEach((size) => {
    if (!iconSizes.has(size)) fail(`icone PWA ${size} manquante`);
  });
  if (!icons.some((icon) => String(icon.purpose ?? "").includes("maskable"))) {
    fail("icone maskable manquante");
  }
  icons.forEach((icon) => {
    if (!icon.src) fail("icone sans src");
    else if (!fs.existsSync(path.join(buildDir, icon.src))) fail(`icone introuvable: ${icon.src}`);
  });

  const shortcuts = manifest.shortcuts ?? [];
  if (shortcuts.length < 4) fail("manifest.shortcuts doit exposer les raccourcis cliniques");
  shortcuts.forEach((shortcut) => {
    if (!shortcut.name || !shortcut.url) fail("raccourci PWA incomplet");
    (shortcut.icons ?? []).forEach((icon) => {
      if (!fs.existsSync(path.join(buildDir, icon.src))) {
        fail(`icone raccourci introuvable: ${icon.src}`);
      }
    });
  });
}

if (errors.length > 0) {
  errors.forEach((message) => console.error(`ERREUR - ${message}`));
  process.exit(1);
}

ok("manifest PWA, icones et raccourcis coherents");
