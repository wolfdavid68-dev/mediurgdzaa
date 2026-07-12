# Optimisations offline-first

Ce document garde la trace des optimisations de code qui touchent les donnees
cliniques statiques. Objectif : ameliorer la reactivite sans affaiblir le
fonctionnement hors-ligne de la PWA.

## Regles garde-fou

- Ne pas ajouter de `import()` dynamique pour les ecrans ou les donnees
  cliniques : le service worker doit pouvoir precacher un bundle coherent.
- Ne pas ajouter de `fetch` pour la recherche, les incompatibilites ou les
  calculateurs cliniques : ces chemins doivent rester disponibles sans reseau.
- Garder les donnees source dans `src/data/` comme reference editoriale ; les
  index ajoutes en TypeScript sont des vues de lecture, construites au chargement.
- Verifier avec `npm run typecheck`, `npm run lint`, `npm test` et
  `npm run build` apres une optimisation qui touche les flux principaux.

## Recherche medicaments

Module : `src/lib/drugSearch.ts`

La recherche ne trie plus et ne normalise plus tous les medicaments a chaque
frappe. Au chargement du module, elle construit :

- une liste de medicaments triee avec `Intl.Collator("fr")` ;
- les champs de recherche normalises (`nom`, `commercial`, `dci`, `classe`) ;
- les alias normalises ;
- une table `id -> medicament` pour reconstruire l'historique recent.

`App.tsx` garde l'etat UI (`search`, `cat`, `svc`, favoris) et appelle
`filterDrugs`. Le comportement de recherche reste le meme : accents ignores,
alias conserves, fuzzy matching via `fuzzyIncludes`.

Tests : `src/lib/drugSearch.test.ts`

## Incompatibilites

Module : `src/lib/incompatibilityIndex.ts`

Utilisateurs :

- `src/components/IncompatibilityList.tsx`
- `src/components/KtcLinePlanner.tsx`

Les vues d'incompatibilites utilisent des tables de lookup construites au
chargement :

- `byName` pour resoudre une entree par nom exact ;
- `searchTextByName` pour eviter de renormaliser les textes de recherche ;
- matrices symetriques `INCOMP` et `COMPAT` construites a partir de ces lookups.

Les listes filtrees et les relations de la fiche active sont memoisees parce
qu'elles parcourent toute la table d'incompatibilites et ne dependent que de
la recherche ou du medicament cible.

Tests :

- `src/lib/incompatibilityIndex.test.ts`
- `src/components/IncompatibilityList.test.tsx`

## Planificateur KTC

Composant : `src/components/KtcLinePlanner.tsx`

Le planificateur KTC reutilise les donnees d'incompatibilites pour proposer une
repartition par lumiere. Il s'appuie sur `src/lib/incompatibilityIndex.ts` pour
eviter de recalculer les memes relations a chaque recherche ou ajout de
medicament. Il garde en plus un score de conflit par medicament.

Les resultats de recherche et la proposition courante sont memoises cote
composant, car ils dependent uniquement de la recherche saisie ou de la liste
des medicaments selectionnes.

Tests : `src/components/KtcLinePlanner.test.tsx`

## Kits de preparation

Composant : `src/components/PrepKitCard.tsx`

Les liens `drugId -> medicament` utilisent une `Map` construite au chargement,
au lieu d'un `DRUGS.find(...)` pendant le rendu des drogues d'un kit.

## Decoupage de bundle

Fichier : `vite.config.ts`

Le build utilise `manualChunks` par domaine fonctionnel :

- `vendor-react` : React et scheduler ;
- `data-medic` : donnees medicaments / PSE / alias ;
- `data-preview` : donnees PSE internes encore en validation, chargees seulement
  en mode `?author=preview` mais toujours precachees pour rester offline ;
- `export-image` : moteur d'export PNG `html-to-image`, charge seulement au
  clic sur l'export du bilan ACR mais toujours precache pour rester offline ;
- `medicaments` : UI et logique de la page Medicaments ;
- `protocoles` : protocoles, incompatibilites, ECG, kits et assistant KTC ;
- `acr` : mode urgence ACR ;
- `auth` : ecrans et helpers d'authentification ;
- `auth-mobile` : ecrans d'authentification mobile ;
- `auth-admin` : consoles admin ;
- `vendor-supabase` : client Supabase et dependances associees ;
- `echelles` : page Echelles.
- `protocoles-pisu`, `protocoles-incompat`, `protocoles-kits`,
  `protocoles-ecg` : sous-domaines Protocoles separes pour eviter un chunk
  clinique unique trop gros.

Ce decoupage corrige l'avertissement Vite sur le gros chunk principal. Les
ecrans cliniques restent importes statiquement ; les ecrans auth/admin peuvent
vivre en chunks separes car Workbox precache tous les fichiers JS generes via
`globPatterns`, donc le fonctionnement hors-ligne est conserve apres build.

`src/lib/auth.ts` et `src/lib/pushNotifications.ts` chargent le client Supabase
au moment de l'action auth/admin, pas au chargement du module. Cela garde les
helpers auth plus legers tout en conservant le chunk `vendor-supabase` precache.

La cross-reference medicament -> protocoles (`src/lib/crossref.ts`) est chargee
au moment ou une fiche medicament s'ouvre. Cela evite de tirer les donnees PISU
dans le chemin principal Medicaments tout en conservant les chips "Utilisee dans"
hors-ligne, car le chunk `protocoles-pisu` reste precache.

## Stockage local securise

Module : `src/lib/safeStorage.ts`

Les lectures/ecritures `localStorage` critiques passent progressivement par un
helper commun :

- `safeGetItem` / `safeSetItem` / `safeRemoveItem` pour les chaines ;
- `safeGetJson` / `safeSetJson` pour les objets serialises.

Objectif : eviter de dupliquer les `try/catch` et garder l'app utilisable si
le stockage local est indisponible, plein, ou restreint par le navigateur.

Chemins deja migres :

- theme, taille de police, favoris et historique dans `App.tsx` ;
- poids patient dans `usePatientWeight.ts` ;
- notes medicament dans `DrugNote.tsx` ;
- cache profil auth offline dans `profileCache.ts`.
- accuse d'information et charte utilisateur dans `useAnnounceFlow.ts` et
  `useCharterFlow.ts` ;
- etat de checklist materiel dans `PrepKitCard.tsx`.
- etat de checklist interactive dans `KitChecklist.tsx` ;
- sauvegarde/restauration des notes dans `NotesBackup.tsx` ;
- stockage rattache au profil utilisateur dans `userStorage.ts` ;
- preference protocole ACR et mode coach ACR dans `AcrModeModal.tsx` /
  `AcrTimer.tsx` ;
- rechargement anti-erreur de chunk et preview sticky via les helpers
  `safeGetSessionItem` / `safeSetSessionItem`.

Tests : `src/lib/safeStorage.test.ts`

## Modales

Composant : `src/components/ModalDialog.tsx`

Les modales simples (`LegalModal`, `AnnounceModal`, `NotesBackupModal`,
`ChangelogModal`, `AcrModeModal`, `AcrSummary`) partagent maintenant le meme
wrapper `<dialog>`. Le composant centralise `showModal()`, `close()`, le clic
sur backdrop et la fermeture native par Escape. Les modales a comportement
special, comme la charte obligatoire, gardent leur logique dediee.

## Typage clinique

Module : `src/lib/calc.ts`

Les calculateurs PSE et preparation utilisent maintenant des types d'entree
explicites (`PseFormula`, `PrepFormula`, `PrepPhaseInput`,
`PedTableBandInput`) au lieu de `any` sur les chemins principaux. Les blocs
`PrepBlock` et `PseBlock` recoivent un `Drug` type et non plus un objet non
type.

Objectif : detecter plus tot les changements de shape dans les donnees
cliniques tout en gardant les tables `src/data/*.js` en JavaScript dense.

## Verification PWA offline

Script : `npm run verify:pwa-offline`

Script manifest : `npm run verify:pwa-manifest`

Script navigateur : `npm run verify:pwa-offline:browser`

Le script `scripts/verify-pwa-offline.cjs` s'execute apres un build et verifie :

- que les assets JS/CSS emis sont listés dans le precache Workbox ;
- que `index.html` et `manifest.webmanifest` sont precaches ;
- que le service worker importe toujours `push-handler.js` ;
- que les assets references par `index.html` existent ;
- qu'aucun chunk JS ne depasse 500 kB.

Le script `scripts/verify-pwa-manifest.cjs` controle le manifest genere :
metadonnees PWA, icones, icone maskable et raccourcis cliniques.

Ce n'est pas un remplacement d'un vrai test navigateur offline, mais c'est un
garde-fou automatisable sans dependance supplementaire.

Le script `scripts/verify-pwa-offline-browser.cjs` lance `vite preview`, ouvre
Chromium via Playwright, attend que le service worker controle la page, coupe le
reseau du contexte navigateur, puis recharge des routes cliniques (`Protocoles`,
`Kits`, `Medicaments`) et le raccourci `?mode=acr`. Il verifie donc le
comportement reel du service worker en navigation offline, en complement du
controle statique des assets.

Il genere aussi des captures offline dans `build/offline-screenshots/` pour
mobile, tablette et desktop sur ACR, Kits, Incompatibilites, Medicaments et
Login. Les donnees utilisees sont factices : aucune donnee patient ni note
utilisateur ne doit entrer dans ces captures.

Script comparaison captures : `npm run verify:offline-screenshots`

Ce controle compare les captures generees a
`docs/OFFLINE_SCREENSHOT_BASELINE.json` : fichiers attendus, largeur, hauteur
minimale et taille minimale. Il evite les faux positifs de diff pixel entre OS,
mais bloque les captures absentes, tronquees ou manifestement vides.

Script clavier : `npm run verify:a11y-keyboard`

Ce controle Playwright verifie que les vues ACR, Kits et Incompatibilites ont
des parcours clavier exploitables et qu'un changement de vue important
(`Comparer`) s'active avec Entrée.

Script E2E critique : `npm run verify:e2e-critical`

Ce parcours Playwright installe le service worker, bascule le contexte en
hors-ligne, puis vérifie un flux métier : recherche Adrénaline, calcul pondéral,
ouverture du Kit ACR, coche d'une check-list ISR et retour vers les
Incompatibilités.

Script performance runtime : `npm run verify:perf-runtime`

Ce controle mesure les temps de rendu des vues Médicaments, Kits,
Incompatibilités et la recherche Adrénaline. Il écrit
`build/reports/runtime-performance.json` et `.md` pour la revue CI.

## Donnees et cybersecurite

Script : `npm run report:data`

Script strict CI : `npm run report:data:strict`

Le script `scripts/report-clinical-data.mjs` genere
`docs/RAPPORT_DONNEES_CLINIQUES.md` avec les volumes par domaine, les liens
internes et les alertes structurelles. Ce rapport ne valide pas la justesse
clinique, mais donne une vue lisible pour revue.

Le mode strict echoue si le rapport detecte une alerte de coherence clinique
structurelle. Les points de vigilance restent informatifs pour permettre une
relecture humaine sans bloquer une release lorsqu'ils sont attendus.

Script : `npm run verify:pwa-offline`

La verification statique controle aussi les budgets gzip par chunk et scanne les
assets buildes pour des patrons evidents de secrets serveur (`service_role`,
cle privee Web Push, `DATABASE_URL`, `JWT_SECRET`, cle privee PEM, `sk-...`).
Les cles publiques prevues pour navigateur, comme la cle publishable Supabase,
restent autorisees.

Le budget bundle suivi par `npm run verify:bundle-budget` couvre les chunks JS
et CSS. Il ecrit aussi `build/reports/bundle-budget.json` et
`build/reports/bundle-budget.md`, uploades par la CI pour revue.

Voir aussi `docs/SECURITY_RUNBOOK.md` et `docs/DOSSIER_SECURITE_DPO_RSSI.md`.

## CSS

Script : `node scripts/audit-dead-css.cjs`

Dernier audit : 2 classes signalees dans `auth-mobile.css`, mais ce sont des
faux positifs lies a une URL SVG inline contenant `w3.org`. Rien a supprimer
sur cette passe.

## Impact offline

Ces optimisations ne changent pas le modele PWA : elles n'ajoutent ni reseau,
ni chunk charge a la demande, ni cache applicatif supplementaire. Elles deplacent
du calcul repete vers des index en memoire construits depuis les donnees deja
embarquees dans le bundle precache.
