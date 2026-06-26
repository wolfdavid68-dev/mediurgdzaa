# CLAUDE.md

Ce fichier guide Claude Code (claude.ai/code) lorsqu'il travaille dans ce dépôt.

## Projet

**MediURG** — PWA offline-first (Vite, React 19, TypeScript strict pragmatique) pour la pharmacologie de médecine d'urgence en français (services SAUV / SMUR / SAU / REA). Les textes d'interface et les données sont en français ; conserver cette convention lors des ajouts ou modifications.

## Commandes

```bash
npm install        # installe les dépendances
npm start          # serveur de dev (Vite) sur http://localhost:5173
npm run build      # check-versions + vite build → build/
npm test           # vitest run — tests séparés entre projets node libs et React happy-dom
npm run lint       # ESLint 9 flat config (react, react-hooks, jsx-a11y, typescript-eslint)
npm run typecheck  # tsc --noEmit — vérifie les types sans émettre de JS
npm run verify     # typecheck + lint + knip + asset refs + CSS mort + tests
npm run release:check # chaîne complète avant mise en production
npm run report:data:strict # rapport données cliniques + garde-fous stricts
npm run format     # Prettier — formate src/, racine. Data files (drugs.js etc.) ignorés.
```

Les scripts de vérification spécialisés vivent dans `scripts/` : `verify:security`,
`verify:bundle-budget`, `verify:pwa-manifest`, `verify:pwa-offline`,
`verify:pwa-offline:browser`, `verify:offline-screenshots`,
`verify:a11y-keyboard`, `verify:e2e-critical`, `verify:perf-runtime`,
`verify:asset-refs` et `verify:dead-css`. Pour une release, suivre
`docs/PROCEDURE_RELEASE.md` plutôt que reconstruire une checklist à la main.

TypeScript en mode **strict pragmatique** : `tsconfig.json` avec `strict: true, allowJs: true`. Tous les composants en `.tsx`, les utilitaires `lib/` en `.ts`. Les data files (`src/data/*.js`) restent JS — ce sont des lookup tables denses, couvertes par des shims `.d.ts` et des tests d'intégrité. Les APIs non standardisées (CloseWatcher, webkitAudioContext, View Transitions API) sont déclarées dans `src/global.d.ts`.

**React Compiler** est actif (`babel-plugin-react-compiler` v1.0 stable, target 19) — il insère automatiquement la mémoïsation là où c'est sûr. Conséquences pour le code :

- **Nouveau code** : ne pas ajouter de `useMemo`/`useCallback` par réflexe — le compiler s'en charge. Les écrire seulement quand on a besoin de stabilité référentielle pour des deps de `useEffect` (l'escape hatch officiel).
- **Code existant** : NE PAS retirer les `useMemo`/`useCallback` en place — la doc officielle (oct. 2025) recommande de les laisser ou de tester très prudemment avant retrait, car ça change le compilation output.
- `eslint-plugin-react-compiler` tourne en `warn` à chaque `npm run lint` ; tout pattern incompatible (mutation d'état, etc.) est signalé.

Les tests sont dans `src/lib/**/*.test.{js,ts}`, `src/components/**/*.test.{ts,tsx}` et `src/pages/**/*.test.tsx`. Vitest utilise des projets dans `vite.config.ts` : les tests de logique pure tournent sous node, les tests React/composants sous happy-dom. Les globals (`describe`, `test`, `expect`) sont auto-injectés via `test.globals`.

`deployer.bat` (Windows uniquement) commit, pousse vers `origin main`, puis lance `vercel --prod`. Ne pas l'invoquer depuis Claude Code : c'est un assistant interactif pour l'utilisateur.

## Architecture

### State central + pages extraites

`src/App.tsx` possède l'état global (page courante, recherche, filtres Médicaments, thème, taille de police, sous-onglet protocoles, favoris/historique, poids patient) et la navigation (popstate, CloseWatcher, sentinelle). Pas de router, pas de store global — les pages sont rendues conditionnellement selon `page === "medicaments" | "protocoles" | "echelles"`.

Pages dans `src/pages/` :

- **`MedicamentsPage.tsx`** : page Médicaments rendue par App, avec search/filtres dans le header sticky.
- **`ProtocolesPage.tsx`** : page Protocoles importée statiquement pour garantir l'usage hors-ligne après mise à jour de service worker. Importe `PROTOCOLS`, `PREP_KITS`, `IncompatibilityList`, `PrepKitCard`, `EcgDiagnostic` et `EcgReader` en statique. Gère son propre `protoFilter` (Adulte/Enfant). Reçoit `protoCategory` + `onDrugSearch` d'App.
- **`EchellesPage.tsx`** : page Échelles cliniques.

La page Protocoles a quatre sous-onglets (`PISU`, `incompatibilites`, `ecg`, `kits`) contrôlés par `protoCategory` (état global pour rester dans l'historique navigateur).

### Auth, admin et API serveur

`src/components/auth/AuthGate.tsx` enveloppe l'application et choisit entre
login, inscription, reset mot de passe, écrans `pending`/`banned`, app clinique
et console admin. Les écrans auth/admin sont lazy-loadés ; garder les chemins
cliniques utilisables hors-ligne après appairage. La logique Supabase client est
dans `src/lib/auth*.ts`, `src/lib/access.ts`, `src/lib/profileCache.ts` et
`src/lib/supabase.ts`. La console admin desktop/mobile partage
`src/components/auth/hooks/useAdminProfiles.ts`.

Les endpoints Vercel sont dans `api/` :

- `generate-tutorat-token.ts` génère le JWT de passage MediURG → Tutorat ;
- `analyze-ecg.ts` appelle l'analyse ECG côté serveur ;
- `notify-access-request.ts`, `push-public-key.ts` et `test-push-notification.ts`
  gèrent les notifications Web Push admin.

Ne jamais exposer de secret côté client : seules les variables prévues pour le
navigateur peuvent être préfixées `VITE_`. Les clés service role, Web Push
privées, JWT et API IA restent côté Vercel/Supabase. Si l'auth, la CSP,
`vercel.json` ou les migrations SQL changent, relire `docs/AUTH_SETUP.md` et
`docs/SECURITY_RUNBOOK.md`.

### Couche de données statiques

Tout le contenu clinique est maintenu à la main en JS dans `src/data/` :

- `drugs.js` — **barrel** qui agrège `src/data/drugs/<categorie>.js` (un fichier par catégorie clinique : hypnotiques, analgesie, antibiotiques, etc.). Export public `DRUGS` inchangé. Pour ajouter/modifier un médicament, éditer le fichier de sa catégorie ; pour créer une nouvelle catégorie, créer le fichier puis l'ajouter au barrel. Chaque entrée a `id, nom, commercial, dci, classe, cat, svc[], couleur, icon, desc, indic[], ci[], ei[], cond[], poso{a, p}, prep`. L'objet `prep` pilote le calculateur de préparation pondérale dans `DrugCard` et supporte plusieurs formes (`dose_kg`, `phases[]`, `dose_threshold` pour la sélection d'ampoules type Anexate, etc.) — reprendre la forme d'un médicament existant plutôt que d'inventer de nouveaux champs.
- `pse.js` — `PSE` indexé par `id` de médicament. Pilote le calculateur de débit de Pousse-Seringue Électrique. Unités comprises par `calcDebit` dans `DrugCard` : `µg/kg/min`, `mg/kg/h`, `µg/kg/h`, `mg/h`, `UI/24h`, `UI/kg/h`, `mL/kg/min`. La concentration est en µg/mL ou mg/mL selon la famille d'unité — voir le commentaire d'en-tête dans `pse.js`. `mL/kg/min` est un cas spécial pour les produits sanguins (Octaplex) : prescription en débit-volume direct, `conc` ignorée, `maxMlH` optionnel applique un cap absolu, `tag` optionnel remplace l'affichage de concentration.
- `protocols.js` — tableau `PROTOCOLS`. Chaque protocole a `sections[]` avec un `type` correspondant aux clés `SECTION_META` dans `ProtocolCard.tsx` (`inclusion`, `exclusion`, `gravite`, `actions`, `surveillance`, `recueil`, `rythme_choquable`, `rythme_non_choquable`, `reprise`). Le filtrage Adulte/Enfant dans `ProtocolesPage.tsx` repose sur `code.includes("ENF")` et `titre.includes("Adulte"/"Enfant")` — préserver ces tokens dans les titres/codes.
- `prepKits.js` — `PREP_KITS` (e.g. ISR, ACR). Shape: `{materiel[], drogues[{nom, role, dose, prep, note}], sequence[], notes[]}`.
- `incompatibilities.js` — tableau `INCOMPATIBILITIES`. `IncompatibilityList.buildMatrix()` reflète chaque entrée `items[]` (incompatibilité) et chaque entrée `compatibleWith[]` dans une matrice symétrique ; le tableau ne rend que le triangle inférieur. Les noms référencés dans `with` et `compatibleWith` doivent correspondre exactement au champ `drug` d'une autre entrée, sinon la cellule disparaît silencieusement.

### Références croisées entre fichiers de données

- Le calcul PSE d'un médicament exige que son `id` existe dans `PSE` — ajouter un médicament destiné au pousse-seringue implique de modifier à la fois `drugs.js` et `pse.js`.
- `ProtocolCard.tsx` définit une liste codée en dur `DRUG_PATTERNS`, utilisée pour rendre cliquables les noms de médicaments dans les textes de protocoles (clic → page Médicaments avec recherche préremplie). Les nouveaux médicaments qui doivent être liés depuis les protocoles doivent aussi y être ajoutés.
- Les IDs entiers des médicaments servent aussi de clé aux notes utilisateur par médicament dans `localStorage` (`mediurg-note-{id}`) — ne jamais renuméroter les IDs existants.

### LocalStorage keys

`mediurg-theme` (`dark`/`light`), `mediurg-bigfont` (`0`/`1`), `mediurg-favorites`, `mediurg-history`, `mediurg-note-{drugId}`, `mediurg-kit-check-{kitId}` (JSON `{ts, items:{itemIndex:bool}}` — état persistant des check-lists matériel ; auto-expire 3 h après la dernière coche, voir `PrepKitCard.tsx`), `mediurg-kit-checklist-{kitId}` (JSON `{ts, values}`). Le thème et la taille de police s'appliquent via les attributs `data-theme` et `data-fontsize` sur `<html>` ; les variables CSS correspondantes vivent dans `src/styles/base.css` et les CSS de domaine.

Les clés centralisées sont dans `src/lib/storageKeys.ts`. En mode authentifié,
`src/lib/userStorage.ts` migre favoris, historique, notes et check-lists vers le
préfixe `mediurg-u{userId}-` sans supprimer les données anonymes. Le poids
patient (`mediurg-patient-weight`), la session ACR (`mediurg-acr-session-v1`) et
le cache profil offline (`mediurg-profile-cache-v1`) ont une sensibilité plus
forte : conserver l'expiration courte ou la purge explicite existante.

### Styling

Styles éclatés par domaine dans `src/styles/*.css` (ancien `style.css` monolithique découpé). Tous les fichiers sont importés dans `src/index.tsx` dans l'ordre de cascade originel. Les composants utilisent des chaînes `className` simples — pas de CSS modules, pas de Tailwind, pas de styled-components. Pour repérer le CSS mort (classes définies mais introuvables dans le code) : `node scripts/audit-dead-css.cjs`. Le script gère les classes construites par template string (`${prefix}-${type}`) pour limiter les faux positifs.

### PWA / service worker

Service worker généré par **vite-plugin-pwa** (Workbox sous le capot) — configuré dans `vite.config.ts`. À chaque build, Workbox produit `build/service-worker.js` avec un precache manifest contenant les hashes Vite de tous les assets ; l'invalidation cache est donc automatique, pas de `CACHE_NAME` à bumper. `registerType: 'prompt'` garde le nouveau SW en attente jusqu'au clic utilisateur sur le toast. La registration côté client est dans `src/components/UpdatePrompt.tsx` (via `virtual:pwa-register/react`) qui affiche « Nouvelle version disponible · Mettre à jour » quand un nouveau SW est prêt. Le manifest PWA est aussi défini dans `vite.config.ts` (clé `manifest`) et émis comme `manifest.webmanifest`.

Le domaine unifié Tutorat passe par les rewrites Vercel `/tutorat` et
`/tutorat/*`, puis par `src/lib/tutorat.ts` qui appelle
`/api/generate-tutorat-token` avant de naviguer. `workbox.navigateFallbackDenylist`
exclut `/tutorat` pour éviter que le service worker MediURG serve sa propre SPA
à la place de Tutorat. En cas de bug sur la pastille Tutorat, vérifier d'abord
la réponse et les logs de `/api/generate-tutorat-token`.

### Calculators in `src/lib/calc.ts`

Toutes les fonctions de calcul cliniques sont des fonctions pures dans `src/lib/calc.ts` (testées par `calc.test.ts`) : `calcDose` (regex-parse les chaînes de poso type `1-2,5 mg/kg` avec cap `max X mg`), `calcDebit` / `calcDoseFromRate` (débits PSE bidirectionnels), `calcPrepThreshold`, `calcPrepSufentaTable`, `calcPrepPhases`, `calcPrepDoseKg`, `calcPedTable`, `calcDoseLibre` (saisie mg → mL à prélever). Les composants (`DrugCard`, `PrepBlock`, `PseBlock`) ne font que rendre l'UI — toute modification d'algorithme doit passer par `calc.ts` + son test. Lors d'un changement de format de texte de dose dans `drugs.js`, vérifier que la regex de `calcDose` matche encore.

## Conventions

- Français partout — libellés UI, commentaires, messages de commit, contenu des données. Ne pas traduire l'app vers l'anglais.
- Les virgules décimales (`1,5 mg/kg`) apparaissent dans les textes cliniques ; les regex de `calcDose` et `calcDebit` acceptent `,` et `.`. Garder cette flexibilité si ces fonctions sont modifiées.
- Les IDs de médicaments sont des entiers structurants (lookup PSE, localStorage) — ajouter à la suite, ne pas renuméroter.
- Les données existantes utilisent Unicode (µ, ², ®, tirets longs, diacritiques NFD). Le normaliseur de recherche dans `src/lib/normalize.ts`, utilisé par `App.tsx`, retire les marques combinantes ; préserver ce comportement lors des ajustements de filtrage.

## Docs de référence dans le dépôt

`docs/README.md` indexe les documents du dossier. `DEPLOY_PWA.md` et
`QUICK_START_PWA.md` sont des guides de déploiement destinés à l'utilisateur
(Netlify/Vercel/manuel). En cas de doute, faire confiance à l'arborescence
réelle et aux scripts du `package.json`.
