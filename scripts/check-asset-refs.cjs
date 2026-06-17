#!/usr/bin/env node

// Vérifie que chaque asset statique référencé dans le code source existe
// réellement dans public/. Garde-fou contre les références cassées (un PNG
// supprimé/renommé mais encore pointé quelque part).
//
// Incident à l'origine : logo_ghrmsa_HD_transparent.png supprimé lors de la
// compression WebP des schémas, alors que le splash de index.html le
// référençait encore → logo GHR manquant au lancement, et captures offline
// CI faussées. Aucun check statique ne l'a attrapé (verify:pwa-offline ne
// valide que les .js/.css émis au build). Ce script comble ce trou en
// scannant la SOURCE — il échoue donc AVANT le build, avec un message clair.
//
// Principe : on ne matche que des chaînes littérales « chemin » (entre
// guillemets, sans espace, finissant par une extension d'asset). La prose
// (changelog, commentaires) contient des espaces → jamais matchée. Les data:
// URIs, URLs http(s) et globs (*) sont ignorés. Les chemins construits par
// template string (`${x}.png`) ne sont pas résolubles statiquement → ignorés.

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

// Extensions d'assets servis depuis public/. Les woff2 (polices) viennent de
// node_modules via @fontsource, pas de public/ → hors scope.
const ASSET_EXT = "png|jpe?g|webp|svg|ico|gif|avif";
const ASSET_RE = new RegExp(`["']([^"'\\s]+\\.(?:${ASSET_EXT}))["']`, "g");

// Fichiers source scannés. index.html + les configs PWA (manifest shortcuts,
// source des icônes générées) + tout src/. On évite les .test.* (fixtures).
const SOURCE_GLOBS = [
  "index.html",
  "vite.config.ts",
  "pwa-assets.config.ts",
];
const SRC_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".html"]);

const fail = (lines) => {
  console.error("\n\x1b[31m✗ Références d'assets cassées :\x1b[0m");
  lines.forEach((l) => console.error(`  ${l}`));
  console.error(
    "\nChaque asset ci-dessus est référencé dans le code mais introuvable dans public/." +
      "\nCorrige la référence ou restaure le fichier, puis relance.\n"
  );
  process.exit(1);
};

// Parcours récursif de src/ (hors node_modules, hors tests).
const walk = (dir, acc) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(full, acc);
    } else if (SRC_EXT.has(path.extname(entry.name)) && !/\.test\.[a-z]+$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
};

const files = [
  ...SOURCE_GLOBS.map((rel) => path.join(ROOT, rel)).filter((p) => fs.existsSync(p)),
  ...walk(path.join(ROOT, "src"), []),
];

// Normalise une référence vers un chemin relatif à public/.
// "/logo.png" → "logo.png" ; "./a/b.svg" → "a/b.svg" ; "public/x.png" → "x.png".
const toPublicRel = (ref) =>
  ref
    .replace(/^\.{0,2}\//, "") // ./  ../  /
    .replace(/^public\//, "")
    .replace(/[?#].*$/, ""); // query/hash éventuels

const isIgnorable = (ref) =>
  ref.startsWith("data:") ||
  ref.startsWith("http://") ||
  ref.startsWith("https://") ||
  ref.includes("*") || // glob (globPatterns/globIgnores Workbox)
  ref.includes("${"); // template string non résoluble

const broken = [];
const seen = new Set();
let checked = 0;

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  for (const match of content.matchAll(ASSET_RE)) {
    const ref = match[1];
    if (isIgnorable(ref)) continue;
    const rel = toPublicRel(ref);
    if (!rel) continue;
    checked += 1;
    const key = `${rel}`;
    if (!fs.existsSync(path.join(PUBLIC_DIR, rel)) && !seen.has(key)) {
      seen.add(key);
      broken.push(`${path.relative(ROOT, file)} → "${ref}" (attendu : public/${rel})`);
    }
  }
}

if (broken.length > 0) fail(broken);

console.log(`✓ ${checked} références d'assets vérifiées, toutes présentes dans public/`);
