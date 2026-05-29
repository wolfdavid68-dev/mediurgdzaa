#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const vercelPath = path.join(root, "vercel.json");
const sourceDirs = ["api", "src", "scripts"].map((dir) => path.join(root, dir));
const publicDirs = ["public", "build"].map((dir) => path.join(root, dir));
const envFiles = [
  ".env.example",
  ".env",
  ".env.local",
  ".env.production",
  ".env.production.local",
]
  .map((file) => path.join(root, file))
  .filter((file) => fs.existsSync(file));

const allowedClientEnv = new Set([
  "VITE_ADMIN_EMAILS",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_URL",
  "VITE_TUTORAT_URL",
  "VITE_WEB_PUSH_PUBLIC_KEY",
]);
const secretPatterns = [
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+/i,
  /WEB_PUSH_PRIVATE_KEY\s*=\s*\S+/i,
  /DATABASE_URL\s*=\s*\S+/i,
  /JWT_SECRET\s*=\s*\S+/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bsk-[A-Za-z0-9_-]{20,}/,
];

const errors = [];
const ok = (message) => console.log(`OK - ${message}`);
const fail = (message) => errors.push(message);

const walk = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
};

const activeEnvNames = (file) =>
  fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("=", 1)[0])
    .filter(Boolean);

if (!fs.existsSync(vercelPath)) {
  fail("vercel.json introuvable");
} else {
  const config = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
  const globalHeaders = config.headers?.find((entry) => entry.source === "/(.*)")?.headers ?? [];
  const headerMap = new Map(
    globalHeaders.map((header) => [header.key.toLowerCase(), header.value])
  );
  const requiredHeaders = [
    "content-security-policy",
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy",
    "strict-transport-security",
    "x-frame-options",
  ];
  requiredHeaders.forEach((header) => {
    if (!headerMap.has(header)) fail(`header global manquant: ${header}`);
  });

  const csp = headerMap.get("content-security-policy") ?? "";
  const requiredCsp = [
    "default-src 'self'",
    "script-src 'self'",
    "script-src-attr 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];
  requiredCsp.forEach((directive) => {
    if (!csp.includes(directive)) fail(`directive CSP manquante: ${directive}`);
  });
  if (!/connect-src[^;]+https:\/\/\*\.supabase\.co[^;]+wss:\/\/\*\.supabase\.co/.test(csp)) {
    fail("CSP connect-src doit autoriser Supabase HTTPS + WSS explicitement");
  }

  const permissions = headerMap.get("permissions-policy") ?? "";
  ["microphone=()", "geolocation=()", "payment=()", "usb=()", "serial=()", "bluetooth=()"].forEach(
    (policy) => {
      if (!permissions.includes(policy)) fail(`Permissions-Policy incomplete: ${policy}`);
    }
  );

  const bySource = new Map(
    (config.headers ?? []).map((entry) => [entry.source, entry.headers ?? []])
  );
  const cacheHeader = (source) =>
    bySource.get(source)?.find((header) => header.key.toLowerCase() === "cache-control")?.value ??
    "";
  if (!/no-cache|no-store/.test(cacheHeader("/service-worker.js"))) {
    fail("service-worker.js doit rester en no-cache/no-store");
  }
  if (
    !/max-age=31536000/.test(cacheHeader("/static/(.*)")) ||
    !/immutable/.test(cacheHeader("/static/(.*)"))
  ) {
    fail("assets /static doivent rester en cache long immutable");
  }

  ok("headers Vercel et CSP controles");
}

const dangerousViteNames = [
  /^VITE_[A-Z0-9_]*(?:SERVICE_ROLE|PRIVATE|SECRET|DATABASE|JWT|WEB_PUSH_PRIVATE)[A-Z0-9_]*$/i,
];
const viteTokenPattern = /\bVITE_[A-Z0-9_]+\b/gi;

const sourceFiles = sourceDirs
  .flatMap(walk)
  .filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file))
  .filter((file) => path.resolve(file) !== __filename);

sourceFiles.forEach((file) => {
  const text = fs.readFileSync(file, "utf8");
  const viteTokens = new Set(text.match(viteTokenPattern) ?? []);
  viteTokens.forEach((token) => {
    if (dangerousViteNames.some((pattern) => pattern.test(token))) {
      fail(`${path.relative(root, file)} reference une variable VITE_ dangereuse (${token})`);
    }
    if (!allowedClientEnv.has(token)) {
      fail(`${path.relative(root, file)} reference une variable VITE_ non declaree: ${token}`);
    }
  });
});
ok("references VITE_ sensibles absentes du code source");

envFiles.forEach((file) => {
  activeEnvNames(file).forEach((name) => {
    if (!name.startsWith("VITE_")) return;
    if (!allowedClientEnv.has(name)) {
      fail(`${path.basename(file)} expose une variable client non autorisee: ${name}`);
    }
    dangerousViteNames.forEach((pattern) => {
      if (pattern.test(name)) {
        fail(`${path.basename(file)} contient une variable client dangereuse: ${name}`);
      }
    });
  });
});
if (envFiles.length > 0) ok("fichiers .env locaux et exemple scannes pour VITE_ dangereux");

const publicFiles = publicDirs
  .flatMap(walk)
  .filter((file) => /\.(html|js|css|json|webmanifest|svg|txt|xml)$/.test(file));
publicFiles.forEach((file) => {
  const text = fs.readFileSync(file, "utf8");
  secretPatterns.forEach((pattern) => {
    if (pattern.test(text)) {
      fail(`${path.relative(root, file)} contient un indice de secret public (${pattern.source})`);
    }
  });
});
ok("public/ et build/ scannes pour indices de secrets serveur");

if (errors.length > 0) {
  errors.forEach((message) => console.error(`ERREUR - ${message}`));
  process.exit(1);
}
