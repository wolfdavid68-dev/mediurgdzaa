// Vérifie que CACHE_NAME (service-worker.js), APP_VERSION (changelog.js)
// et CHANGELOG[0].version sont alignés sur la même version (ex: "v29").
// Échoue le build si désalignement — évite de pousser un SW à v29 avec un
// badge UI qui ment encore à v24 (cf. incident du 2026-05-10).

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const fail = (msg) => {
  console.error('\n\x1b[31m✗ Versions désalignées :\x1b[0m');
  console.error(msg);
  console.error('\nCorrige les 3 endroits puis relance le build.\n');
  process.exit(1);
};

const sw = read('public/service-worker.js');
const swMatch = sw.match(/CACHE_NAME\s*=\s*['"]mediurg-(v\d+)['"]/);
if (!swMatch) fail('Impossible de lire CACHE_NAME dans public/service-worker.js');
const swVersion = swMatch[1];

const changelog = read('src/data/changelog.js');
const appMatch = changelog.match(/APP_VERSION\s*=\s*['"](v\d+)['"]/);
if (!appMatch) fail('Impossible de lire APP_VERSION dans src/data/changelog.js');
const appVersion = appMatch[1];

const firstEntryMatch = changelog.match(/version:\s*['"](v\d+)['"]/);
if (!firstEntryMatch) fail('Impossible de lire la 1re entrée CHANGELOG dans src/data/changelog.js');
const changelogVersion = firstEntryMatch[1];

const versions = {
  'CACHE_NAME (service-worker.js)':    swVersion,
  'APP_VERSION (changelog.js)':         appVersion,
  'CHANGELOG[0].version (changelog.js)': changelogVersion,
};

const distinct = new Set(Object.values(versions));
if (distinct.size !== 1) {
  const lines = Object.entries(versions)
    .map(([k, v]) => `  - ${k.padEnd(40)} = ${v}`)
    .join('\n');
  fail(`Les trois doivent être identiques :\n${lines}`);
}

console.log(`✓ Versions alignées sur ${swVersion} (SW + APP_VERSION + CHANGELOG)`);
