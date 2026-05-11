# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**MediURG** — offline-first PWA (Vite, React 19) for French emergency-medicine pharmacology (services SAUV / SMUR / SAU / REA). UI text and data are in French; keep that convention when editing or adding content.

## Commands

```bash
npm install        # install deps
npm start          # dev server (Vite) on http://localhost:5173
npm run build      # check-versions + vite build → build/ + post-build asset-manifest
npm test           # vitest run (jsdom) — tests under src/lib/*.test.js
```

Tests are under `src/lib/*.test.js` (calc, normalize, protocolText, data integrity). Globals (`describe`, `test`, `expect`) are auto-injected by vitest via `vite.config.js → test.globals`. JSX in `.js` files works thanks to esbuild loader config (CRA legacy).

`deployer.bat` (Windows-only) commits, pushes to `origin main`, and runs `vercel --prod`. Do not invoke it from Claude Code; it's an interactive helper for the user.

## Architecture

### Single-file state, two pages
`src/App.js` owns all top-level state (current page, search, filters, theme, font size, protocol sub-tab). There is no router and no global store — pages are conditionally rendered based on `page === "medicaments" | "protocoles"`. The "Protocoles" page itself has three sub-tabs (`PISU`, `incompatibilites`, `kits`) controlled by `protoCategory`.

When editing navigation, expect to touch `App.js` directly rather than adding routing infrastructure.

### Static data layer
All clinical content is hand-curated JS in `src/data/`:

- `drugs.js` — `DRUGS` array. Each entry has `id, nom, commercial, dci, classe, cat, svc[], couleur, icon, desc, indic[], ci[], ei[], cond[], poso{a, p}, prep`. The `prep` object drives the weight-based preparation calculator in `DrugCard` and supports several shapes (`dose_kg`, `phases[]`, `dose_threshold` for amp-count selection like Anexate, etc.) — match an existing drug's shape rather than inventing new fields.
- `pse.js` — `PSE` keyed by drug `id`. Drives the syringe-pump (Pousse-Seringue Électrique) flow-rate calculator. Units understood by `calcDebit` in `DrugCard`: `µg/kg/min`, `mg/kg/h`, `µg/kg/h`, `mg/h`, `UI/24h`, `UI/kg/h`. Conc is in µg/mL or mg/mL depending on unit family — see the comment header in `pse.js`.
- `protocols.js` — `PROTOCOLS` array. Each protocol has `sections[]` with `type` matching `SECTION_META` keys in `ProtocolCard.js` (`inclusion`, `exclusion`, `gravite`, `actions`, `surveillance`, `recueil`, `rythme_choquable`, `rythme_non_choquable`, `reprise`). Adult/Enfant filtering in `App.js` keys off `code.includes("ENF")` and `titre.includes("Adulte"/"Enfant")` — preserve those tokens in titles/codes.
- `prepKits.js` — `PREP_KITS` (e.g. ISR, ACR). Shape: `{materiel[], drogues[{nom, role, dose, prep, note}], sequence[], notes[]}`.
- `incompatibilities.js` — `INCOMPATIBILITIES` array of drug entries. `IncompatibilityList.buildMatrix()` mirrors each `items[]` entry (incompatibility) and each `compatibleWith[]` entry into a symmetric matrix; the table only renders the lower triangle. Names referenced in `with` and `compatibleWith` must exactly match another entry's `drug` field, otherwise the cell silently disappears.

### Cross-references between data files
- A drug's PSE flow calc requires its `id` to exist in `PSE` — adding a drug intended for syringe-pump use means editing both `drugs.js` and `pse.js`.
- `ProtocolCard.js` defines a hardcoded `DRUG_PATTERNS` list used to make drug names inside protocol prose clickable (clicking jumps to the Médicaments page pre-filled in the search). New drugs that should be cross-linked from protocols need to be added there too.
- Drug ID integers also key per-drug user notes in `localStorage` (`mediurg-note-{id}`) — never renumber existing IDs.

### LocalStorage keys
`mediurg-theme` (`dark`/`light`), `mediurg-bigfont` (`0`/`1`), `mediurg-note-{drugId}`. Theme/font apply via `data-theme` and `data-fontsize` attributes on `<html>`; the matching CSS variables live in `src/style.css`.

### Styling
A single global stylesheet `src/style.css` (~52 KB) drives everything. `DrugCard.css` is intentionally near-empty. Components use plain className strings — no CSS modules, no Tailwind, no styled-components. New visual styles belong in `style.css`.

### PWA / service worker
`public/service-worker.js` uses a cache name `mediurg-vN`. The install handler reads the CRA-emitted `asset-manifest.json` to precache hashed JS/CSS. **When shipping a release, bump `CACHE_NAME`** (e.g. `mediurg-v4` → `mediurg-v5`) — otherwise users see stale assets after deploy. Document strategy: cache-first for `/static/`, network-first with cache fallback for HTML documents, stale-while-revalidate for everything else.

### Calculators in `DrugCard.js`
`DrugCard.js` is the largest component (~700 lines) and contains three independent calculators driven by the same weight input: `calcDose` (regex-parses dose strings like `1-2,5 mg/kg` from `poso` text and applies `max X mg` caps), the preparation calculator (`prep` object → mL to draw / dilute), and `calcDebit` (PSE flow rate in mL/h). When changing dose-text formatting in `drugs.js`, verify the regex in `calcDose` still matches.

## Conventions

- French language throughout — UI labels, comments, commit messages, data content. Don't translate.
- Decimal commas (`1,5 mg/kg`) appear in clinical text; the `calcDose` and `calcDebit` regexes accept both `,` and `.`. Keep that flexibility if you touch them.
- Drug IDs are integers and load-bearing (PSE lookup, localStorage) — append, don't renumber.
- Existing data uses Unicode (µ, ², ®, em-dashes, NFD diacritics). The search normalizer in `App.js` strips combining marks; preserve that behavior when adjusting filtering.

## Reference docs in repo

`DEPLOY_PWA.md` and `QUICK_START_PWA.md` are user-facing deployment guides (Netlify/Vercel/manual). The "Fichiers importants" section in `DEPLOY_PWA.md` is partially out of date relative to the current `src/` layout — trust the actual tree.
