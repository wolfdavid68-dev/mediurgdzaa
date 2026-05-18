# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**MediURG** — offline-first PWA (Vite, React 19, TypeScript loose) for French emergency-medicine pharmacology (services SAUV / SMUR / SAU / REA). UI text and data are in French; keep that convention when editing or adding content.

## Commands

```bash
npm install        # install deps
npm start          # dev server (Vite) on http://localhost:5173
npm run build      # check-versions + vite build → build/
npm test           # vitest run (jsdom) — tests under src/lib/*.test.js
npm run lint       # ESLint 9 flat config (react, react-hooks, jsx-a11y, typescript-eslint)
npm run typecheck  # tsc --noEmit — vérifie les types sans émettre de JS
npm run format     # Prettier — formate src/, racine. Data files (drugs.js etc.) ignorés.
```

TypeScript en mode **loose pragmatique** : `tsconfig.json` avec `strict: false, allowJs: true`. Tous les composants en `.tsx`, les utilitaires `lib/` en `.ts`. Les data files (`src/data/*.js`) restent JS — ce sont des lookup tables denses. Les APIs non standardisées (CloseWatcher, webkitAudioContext) sont déclarées dans `src/global.d.ts`.

**React Compiler** est actif (`babel-plugin-react-compiler` v1.0 stable, target 19) — il insère automatiquement la mémoïsation là où c'est sûr. Conséquences pour le code :
- **Nouveau code** : ne pas ajouter de `useMemo`/`useCallback` par réflexe — le compiler s'en charge. Les écrire seulement quand on a besoin de stabilité référentielle pour des deps de `useEffect` (l'escape hatch officiel).
- **Code existant** : NE PAS retirer les `useMemo`/`useCallback` en place — la doc officielle (oct. 2025) recommande de les laisser ou de tester très prudemment avant retrait, car ça change le compilation output.
- `eslint-plugin-react-compiler` tourne en `warn` à chaque `npm run lint` ; tout pattern incompatible (mutation d'état, etc.) est signalé.

Tests are under `src/lib/*.test.js` (calc, normalize, protocolText, data integrity). Globals (`describe`, `test`, `expect`) are auto-injected by vitest via `vite.config.ts → test.globals`.

`deployer.bat` (Windows-only) commits, pushes to `origin main`, and runs `vercel --prod`. Do not invoke it from Claude Code; it's an interactive helper for the user.

## Architecture

### State central + pages extraites
`src/App.jsx` owns le state global (current page, search, filters Médicaments, theme, font size, protocol sub-tab) et la navigation (popstate, CloseWatcher, sentinelle). Pas de router, pas de store global — les pages sont rendues conditionnellement selon `page === "medicaments" | "protocoles"`.

Pages dans `src/pages/` :
- **Médicaments** : rendu inline dans App.jsx (search bar dans le header sticky).
- **`ProtocolesPage.jsx`** : extrait, lazy-loadé via `React.lazy`. Importe `PROTOCOLS`, `PREP_KITS` en interne → ces ~100 kB sortent du bundle initial. Gère son propre `protoFilter` (Adulte/Enfant). Reçoit `protoCategory` + `onDrugSearch` d'App.

La page Protocoles a trois sous-onglets (`PISU`, `incompatibilites`, `kits`) contrôlés par `protoCategory` (état global pour rester dans l'historique navigateur).

### Static data layer
All clinical content is hand-curated JS in `src/data/`:

- `drugs.js` — `DRUGS` array. Each entry has `id, nom, commercial, dci, classe, cat, svc[], couleur, icon, desc, indic[], ci[], ei[], cond[], poso{a, p}, prep`. The `prep` object drives the weight-based preparation calculator in `DrugCard` and supports several shapes (`dose_kg`, `phases[]`, `dose_threshold` for amp-count selection like Anexate, etc.) — match an existing drug's shape rather than inventing new fields.
- `pse.js` — `PSE` keyed by drug `id`. Drives the syringe-pump (Pousse-Seringue Électrique) flow-rate calculator. Units understood by `calcDebit` in `DrugCard`: `µg/kg/min`, `mg/kg/h`, `µg/kg/h`, `mg/h`, `UI/24h`, `UI/kg/h`, `mL/kg/min`. Conc is in µg/mL or mg/mL depending on unit family — see the comment header in `pse.js`. `mL/kg/min` est un cas spécial pour les produits sanguins (Octaplex) : prescription en débit-volume direct, `conc` ignorée, optional `maxMlH` applique un cap absolu, optional `tag` remplace l'affichage de concentration.
- `protocols.js` — `PROTOCOLS` array. Each protocol has `sections[]` with `type` matching `SECTION_META` keys in `ProtocolCard.js` (`inclusion`, `exclusion`, `gravite`, `actions`, `surveillance`, `recueil`, `rythme_choquable`, `rythme_non_choquable`, `reprise`). Adult/Enfant filtering in `App.js` keys off `code.includes("ENF")` and `titre.includes("Adulte"/"Enfant")` — preserve those tokens in titles/codes.
- `prepKits.js` — `PREP_KITS` (e.g. ISR, ACR). Shape: `{materiel[], drogues[{nom, role, dose, prep, note}], sequence[], notes[]}`.
- `incompatibilities.js` — `INCOMPATIBILITIES` array of drug entries. `IncompatibilityList.buildMatrix()` mirrors each `items[]` entry (incompatibility) and each `compatibleWith[]` entry into a symmetric matrix; the table only renders the lower triangle. Names referenced in `with` and `compatibleWith` must exactly match another entry's `drug` field, otherwise the cell silently disappears.

### Cross-references between data files
- A drug's PSE flow calc requires its `id` to exist in `PSE` — adding a drug intended for syringe-pump use means editing both `drugs.js` and `pse.js`.
- `ProtocolCard.js` defines a hardcoded `DRUG_PATTERNS` list used to make drug names inside protocol prose clickable (clicking jumps to the Médicaments page pre-filled in the search). New drugs that should be cross-linked from protocols need to be added there too.
- Drug ID integers also key per-drug user notes in `localStorage` (`mediurg-note-{id}`) — never renumber existing IDs.

### LocalStorage keys
`mediurg-theme` (`dark`/`light`), `mediurg-bigfont` (`0`/`1`), `mediurg-note-{drugId}`, `mediurg-kit-check-{kitId}` (JSON `{ts, items:{itemIndex:bool}}` — état persistant des check-lists matériel des kits drain-thoracique/pa/ktc ; auto-expire 3 h après la dernière coche, voir `PrepKitCard.tsx`). Theme/font apply via `data-theme` and `data-fontsize` attributes on `<html>`; the matching CSS variables live in `src/style.css`.

### Styling
A single global stylesheet `src/style.css` (~52 KB) drives everything. `DrugCard.css` is intentionally near-empty. Components use plain className strings — no CSS modules, no Tailwind, no styled-components. New visual styles belong in `style.css`.

### PWA / service worker
Service worker généré par **vite-plugin-pwa** (Workbox sous le capot) — configuré dans `vite.config.js`. À chaque build, Workbox produit `build/service-worker.js` avec un precache manifest contenant les hashes Vite de tous les assets ; l'invalidation cache est donc automatique, pas de `CACHE_NAME` à bumper. `registerType: 'autoUpdate'` skip waiting + claim. La registration côté client est dans `src/components/UpdatePrompt.jsx` (via `virtual:pwa-register/react`) qui affiche un toast « Nouvelle version disponible · Mettre à jour » quand un nouveau SW est prêt. Le manifest PWA est aussi défini dans `vite.config.js` (clé `manifest`) et émis comme `manifest.webmanifest`.

### Calculators in `DrugCard.jsx`
`DrugCard.jsx` is the largest component (~700 lines) and contains three independent calculators driven by the same weight input: `calcDose` (regex-parses dose strings like `1-2,5 mg/kg` from `poso` text and applies `max X mg` caps), the preparation calculator (`prep` object → mL to draw / dilute), and `calcDebit` (PSE flow rate in mL/h). When changing dose-text formatting in `drugs.js`, verify the regex in `calcDose` still matches.

## Conventions

- French language throughout — UI labels, comments, commit messages, data content. Don't translate.
- Decimal commas (`1,5 mg/kg`) appear in clinical text; the `calcDose` and `calcDebit` regexes accept both `,` and `.`. Keep that flexibility if you touch them.
- Drug IDs are integers and load-bearing (PSE lookup, localStorage) — append, don't renumber.
- Existing data uses Unicode (µ, ², ®, em-dashes, NFD diacritics). The search normalizer in `App.js` strips combining marks; preserve that behavior when adjusting filtering.

## Reference docs in repo

`DEPLOY_PWA.md` and `QUICK_START_PWA.md` are user-facing deployment guides (Netlify/Vercel/manual). The "Fichiers importants" section in `DEPLOY_PWA.md` is partially out of date relative to the current `src/` layout — trust the actual tree.
