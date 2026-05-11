// Post-build : produit build/asset-manifest.json au format historique CRA, à
// partir des fichiers réellement émis par Vite. Le service worker précache
// ses bundles en lisant ce manifest (public/service-worker.js → install).
//
// Format CRA attendu :
//   {
//     "files": { "main.css": "/static/css/main.HASH.css", "main.js": "...", ... },
//     "entrypoints": [ "static/js/main.HASH.js", "static/css/main.HASH.css" ]
//   }

const fs   = require("fs");
const path = require("path");

const ROOT      = path.resolve(__dirname, "..");
const BUILD_DIR = path.join(ROOT, "build");

// Walk récursif pour lister tous les fichiers buildés (relatifs à build/)
const walk = (dir, base = "") => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs, rel));
    else out.push(rel);
  }
  return out;
};

if (!fs.existsSync(BUILD_DIR)) {
  console.error("✗ asset-manifest : build/ introuvable, lance vite build d'abord.");
  process.exit(1);
}

const allFiles = walk(BUILD_DIR);

// Files map : chaque asset accessible via une URL absolue commençant par /
const files = {};
for (const rel of allFiles) {
  // On expose tout sauf le futur asset-manifest lui-même
  if (rel === "asset-manifest.json") continue;
  files[rel] = `/${rel}`;
}

// Entrypoints : le ou les fichiers JS d'entrée + leur CSS associé.
// Vite émet typiquement static/js/index-HASH.js et static/css/index-HASH.css.
const entrypoints = allFiles.filter(
  (f) => /^static\/(js|css)\/(index|main|entry)\.[\w-]+\.(js|css)$/.test(f)
);
// Si aucun entrypoint matched (renaming exotique), on retombe sur tous les
// JS/CSS de premier niveau pour ne pas livrer un manifest vide.
const entrypointsSafe = entrypoints.length > 0
  ? entrypoints
  : allFiles.filter((f) => /^static\/(js|css)\/[^/]+\.(js|css)$/.test(f));

const manifest = {
  files,
  entrypoints: entrypointsSafe,
};

const out = path.join(BUILD_DIR, "asset-manifest.json");
fs.writeFileSync(out, JSON.stringify(manifest, null, 2));
console.log(`✓ asset-manifest.json écrit (${Object.keys(files).length} fichiers, ${entrypointsSafe.length} entrypoints)`);
