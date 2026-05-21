// scripts/audit-dead-css.cjs
// Audit one-shot : repère les sélecteurs de classe CSS définis dans
// src/styles/ qui n'apparaissent (apparemment) nulle part dans le code source.
//
// Heuristique : pour chaque `.foo` défini dans un fichier CSS, on cherche
// la chaîne `foo` ailleurs (TSX/JSX/TS/JS/HTML). Si elle n'est trouvée que
// dans des fichiers CSS, la classe est marquée orpheline.
//
// Limites connues (à reviewer à la main avant suppression) :
//  - Classes construites par template string (ex: `dot-${type}`) →
//    `dot-poso` paraîtra orphelin si seul `dot-${tab.type}` existe.
//  - Classes injectées dynamiquement (rares ici).
//  - Pseudo-classes, attributs (`[data-cat=…]`) ignorés.
//
// Usage : node scripts/audit-dead-css.cjs

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const STYLES_DIR = path.join(ROOT, "src/styles");
const SEARCH_DIRS = [path.join(ROOT, "src"), path.join(ROOT, "index.html")];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const stat = fs.statSync(dir);
  if (stat.isFile()) {
    out.push(dir);
    return out;
  }
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const s = fs.statSync(full);
    if (s.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const codeFiles = SEARCH_DIRS.flatMap((d) => walk(d)).filter((f) =>
  /\.(tsx|ts|jsx|js|html|cjs|mjs)$/.test(f)
);
const cssFiles = walk(STYLES_DIR).filter((f) => f.endsWith(".css"));

// Concat tout le code non-CSS dans un blob pour faire des includes rapides.
const codeBlob = codeFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");

// Extrait les noms de classes de chaque fichier CSS.
// Regex volontairement large : `.identifier` (chiffres et tirets autorisés).
const CLASS_RE = /\.([a-zA-Z_][\w-]*)/g;

const summary = [];
let totalClasses = 0;
let totalOrphans = 0;

for (const css of cssFiles) {
  const content = fs.readFileSync(css, "utf8");
  // ignore les classes définies à l'intérieur d'une string ou commentaire :
  // on bombarde le CSS hors block comment + hors string url(). Approximatif
  // mais suffisant pour un audit.
  const noComments = content.replace(/\/\*[\s\S]*?\*\//g, "");
  const classes = new Set();
  for (const m of noComments.matchAll(CLASS_RE)) {
    classes.add(m[1]);
  }
  totalClasses += classes.size;
  const orphans = [];
  for (const cls of classes) {
    // Recherche brute du nom de classe dans le code non-CSS.
    // Exige une frontière à gauche (pas alphanumeric ni `-`) pour ne pas
    // matcher `foo` à l'intérieur de `barfoo`.
    const escaped = cls.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const re = new RegExp(`(^|[^\\w-])${escaped}(?=$|[^\\w-])`);
    if (re.test(codeBlob)) continue;
    // Heuristique « template string » : pour cls = "ci-badge-abs", on
    // vérifie si l'un de ses préfixes (`ci-badge-`, `ci-`) apparaît en
    // construction `${`-injectée → la classe est probablement référencée
    // dynamiquement et n'est pas réellement morte.
    const parts = cls.split("-");
    let dynamic = false;
    for (let i = parts.length - 1; i >= 1; i--) {
      const prefix = parts.slice(0, i).join("-") + "-";
      const prefEsc = prefix.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      // patterns acceptés : `prefix${`, `prefix${x}` (ou guillemet juste après)
      const dynRe = new RegExp(`${prefEsc}\\$\\{`);
      if (dynRe.test(codeBlob)) {
        dynamic = true;
        break;
      }
    }
    if (!dynamic) orphans.push(cls);
  }
  if (orphans.length === 0) continue;
  totalOrphans += orphans.length;
  summary.push({ file: path.relative(ROOT, css), total: classes.size, orphans });
}

summary.sort((a, b) => b.orphans.length - a.orphans.length);

console.log("─────────────────────────────────────────────────────────");
console.log("Audit CSS — classes définies mais introuvables dans le code");
console.log("─────────────────────────────────────────────────────────");
for (const { file, total, orphans } of summary) {
  console.log(`\n${file}  (${orphans.length}/${total} orphelins)`);
  orphans.sort();
  for (const o of orphans) console.log(`  .${o}`);
}
console.log("\n─────────────────────────────────────────────────────────");
console.log(`Total : ${totalOrphans} classes apparemment orphelines sur ${totalClasses}`);
console.log("─────────────────────────────────────────────────────────");
console.log("\n⚠ Faux positifs possibles : classes construites par template");
console.log("  string (ex: `dot-${type}`). Reviewer à la main avant suppression.");
