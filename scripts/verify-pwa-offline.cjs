#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const root = process.cwd();
const buildDir = path.join(root, "build");
const swPath = path.join(buildDir, "service-worker.js");
const indexPath = path.join(buildDir, "index.html");
const staticDir = path.join(buildDir, "static");
const maxChunkBytes = 500 * 1024;
const DEFAULT_GZIP_LIMIT_KB = 70;
const SECRET_PATTERNS = [
  /SUPABASE_SERVICE_ROLE/i,
  /SERVICE_ROLE_KEY/i,
  /WEB_PUSH_PRIVATE_KEY/i,
  /DATABASE_URL/i,
  /JWT_SECRET/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bsk-[A-Za-z0-9_-]{20,}/,
];
const CHUNK_GZIP_LIMITS_KB = {
  "vendor-react": 65,
  "vendor-supabase": 60,
  auth: 55,
  // Console admin : inclut les contrôles MFA/journalisation. Le budget
  // régressif précis reste suivi par verify:bundle-budget ; ici on garde un
  // plafond statique plus large pour éviter les faux positifs CI.
  "auth-admin": 18,
  "auth-mobile": 15,
  index: 45,
  acr: 30,
  medicaments: 22,
  "protocoles-pisu": 24,
  "protocoles-incompat": 28,
  "protocoles-kits": 25,
  "protocoles-ecg": 22,
  protocoles: 10,
  echelles: 8,
  "data-preview": 8,
  "data-medic": 37,
  "export-image": 8,
};

const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
};

const ok = (message) => {
  console.log(`✓ ${message}`);
};

if (!fs.existsSync(swPath) || !fs.existsSync(indexPath)) {
  fail("build/ doit exister avant la vérification PWA (lancer npm run build)");
  process.exit();
}

const sw = fs.readFileSync(swPath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

const staticAssets = fs.existsSync(staticDir)
  ? walk(staticDir).map((file) => path.relative(buildDir, file).replace(/\\/g, "/"))
  : [];
const emittedRuntimeAssets = staticAssets.filter((asset) => /\.(js|css)$/.test(asset));
const missingFromPrecache = emittedRuntimeAssets.filter((asset) => !sw.includes(`"${asset}"`));

if (missingFromPrecache.length > 0) {
  fail(`assets JS/CSS absents du précache: ${missingFromPrecache.join(", ")}`);
} else {
  ok(`${emittedRuntimeAssets.length} assets JS/CSS présents dans le précache Workbox`);
}

if (!sw.includes('"index.html"')) fail("index.html absent du précache");
else ok("index.html présent dans le précache");

if (!sw.includes('"manifest.webmanifest"')) fail("manifest.webmanifest absent du précache");
else ok("manifest.webmanifest présent dans le précache");

if (!sw.includes('importScripts("/push-handler.js")')) {
  fail("push-handler.js n'est pas importé par le service worker généré");
} else {
  ok("push-handler.js importé par le service worker généré");
}

const entryAssets = Array.from(index.matchAll(/(?:src|href)="\/([^"]+\.(?:js|css))"/g)).map(
  (match) => match[1]
);
const missingEntryAssets = entryAssets.filter(
  (asset) => !fs.existsSync(path.join(buildDir, asset))
);
if (missingEntryAssets.length > 0) {
  fail(`assets référencés par index.html introuvables: ${missingEntryAssets.join(", ")}`);
} else {
  ok(`${entryAssets.length} assets référencés par index.html existent sur disque`);
}

const securityScanAssets = [
  ...staticAssets.filter((asset) => /\.(js|css|html)$/.test(asset)),
  "index.html",
  "service-worker.js",
  "manifest.webmanifest",
].filter((asset, index, arr) => arr.indexOf(asset) === index);

const leakedSecretHints = securityScanAssets.flatMap((asset) => {
  const filePath = path.join(buildDir, asset);
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf8");
  return SECRET_PATTERNS.filter((pattern) => pattern.test(content)).map((pattern) => ({
    asset,
    pattern: pattern.source,
  }));
});

if (leakedSecretHints.length > 0) {
  fail(
    `indices de secret dans le build: ${leakedSecretHints
      .map(({ asset, pattern }) => `${asset} (${pattern})`)
      .join(", ")}`
  );
} else {
  ok("aucun indice de secret serveur dans les assets buildes");
}

const oversizedChunks = staticAssets
  .filter((asset) => asset.endsWith(".js"))
  .map((asset) => ({ asset, bytes: fs.statSync(path.join(buildDir, asset)).size }))
  .filter(({ bytes }) => bytes > maxChunkBytes);

const chunkBaseName = (asset) => path.basename(asset, ".js").replace(/\.[A-Za-z0-9_-]+$/, "");

const gzipBudgetFailures = staticAssets
  .filter((asset) => asset.endsWith(".js"))
  .map((asset) => {
    const filePath = path.join(buildDir, asset);
    const gzipBytes = zlib.gzipSync(fs.readFileSync(filePath)).length;
    const name = chunkBaseName(asset);
    const limitKb = CHUNK_GZIP_LIMITS_KB[name] ?? DEFAULT_GZIP_LIMIT_KB;
    return { asset, gzipBytes, limitKb };
  })
  .filter(({ gzipBytes, limitKb }) => gzipBytes > limitKb * 1024);

if (gzipBudgetFailures.length > 0) {
  fail(
    `chunks JS gzip hors budget: ${gzipBudgetFailures
      .map(
        ({ asset, gzipBytes, limitKb }) =>
          `${asset} (${(gzipBytes / 1024).toFixed(1)} kB gzip > ${limitKb} kB)`
      )
      .join(", ")}`
  );
} else {
  ok("budgets gzip par chunk respectes");
}

if (oversizedChunks.length > 0) {
  fail(
    `chunks JS > 500 kB: ${oversizedChunks
      .map(({ asset, bytes }) => `${asset} (${Math.round(bytes / 1024)} kB)`)
      .join(", ")}`
  );
} else {
  ok("aucun chunk JS ne dépasse 500 kB");
}
