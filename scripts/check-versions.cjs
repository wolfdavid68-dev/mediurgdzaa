// Vérifie que APP_VERSION et CHANGELOG[0].version (dans src/data/changelog.js)
// sont alignés sur la même version (ex: "v49"). Échoue le build si mismatch.
// Évite qu'un push bump l'un sans l'autre, ce qui fait afficher un mauvais
// numéro de version dans la nav (cf. incident du 2026-05-10 entre v24 et v28).
//
// Depuis v49 (passage à vite-plugin-pwa + Workbox), il n'y a plus de
// CACHE_NAME à maintenir manuellement dans le service worker : Workbox
// génère son propre precache-manifest avec les hashes Vite à chaque build,
// l'invalidation cache est automatique. Le check ne porte donc plus que
// sur l'APP_VERSION visible côté UI.

const fs   = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const fail = (msg) => {
  console.error("\n\x1b[31m✗ Versions désalignées :\x1b[0m");
  console.error(msg);
  console.error("\nCorrige les 2 endroits puis relance le build.\n");
  process.exit(1);
};

const changelog = read("src/data/changelog.js");

const appMatch = changelog.match(/APP_VERSION\s*=\s*['"](v\d+)['"]/);
if (!appMatch) fail("Impossible de lire APP_VERSION dans src/data/changelog.js");
const appVersion = appMatch[1];

const firstEntryMatch = changelog.match(/version:\s*['"](v\d+)['"]/);
if (!firstEntryMatch) fail("Impossible de lire la 1re entrée CHANGELOG dans src/data/changelog.js");
const changelogVersion = firstEntryMatch[1];

if (appVersion !== changelogVersion) {
  fail(
    `Les deux doivent être identiques :\n` +
    `  - APP_VERSION             = ${appVersion}\n` +
    `  - CHANGELOG[0].version    = ${changelogVersion}`
  );
}

console.log(`✓ Versions alignées sur ${appVersion} (APP_VERSION + CHANGELOG)`);
