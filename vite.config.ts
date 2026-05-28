import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { VitePWA } from "vite-plugin-pwa";
import checker from "vite-plugin-checker";
import { visualizer } from "rollup-plugin-visualizer";

// (defineConfig de vite ne connaît pas la clé `test` que vitest étend. On
// pourrait passer par `vitest/config` mais ça crée un conflit de versions
// Vite imbriquées. Le simplest : cast la config en `any` à la fin.)

// Migration v46 : CRA → Vite + React 19.
// Phase B (v49) : SW artisanal → Workbox via vite-plugin-pwa.
// Le manifest PWA et la liste de précache sont désormais générés depuis
// cette config — plus de public/manifest.json ni de service-worker.js
// à maintenir à la main.
export default defineConfig({
  plugins: [
    // vite-plugin-checker : remonte les erreurs tsc + oxlint dans l'overlay
    // Vite en dev (le rond rouge en bas à droite). Plus besoin de garder un
    // terminal séparé sur `npm run typecheck` ou `npm run lint:fast` — les
    // erreurs apparaissent en live au-dessus du browser pendant qu'on code.
    // Le checker tourne en worker thread, n'impacte pas le HMR.
    // ESLint full type-aware reste sur le run manuel + pre-commit ; oxlint
    // (12 ms) suffit largement pour l'overlay dev.
    checker({
      typescript: true,
      oxlint: { lintCommand: "oxlint src" },
    }),
    react(),
    // React Compiler (stable v1.0) : analyse les composants et insère
    // automatiquement la mémoïsation (useMemo/useCallback implicites)
    // partout où c'est sûr. Évite les re-renders inutiles lors du
    // filtrage drugs/protocols quand l'user tape dans la search bar.
    //
    // Vite 8 / plugin-react 6 : Babel n'est plus embarqué (React Refresh
    // utilise Oxc maintenant). Le React Compiler passe par un plugin Babel
    // dédié + le helper reactCompilerPreset qui filtre intelligemment :
    // ne transforme que les fichiers contenant une fonction commençant par
    // une majuscule (composant) ou « use » (hook) — au lieu de tout babelifier.
    babel({ presets: [reactCompilerPreset({ target: "19" })] }),
    VitePWA({
      // 'prompt' : le nouveau SW reste en waiting jusqu'à ce que l'user
      // clique sur le toast « Mettre à jour ». UX explicite — l'user
      // contrôle le moment de la mise à jour (pas en plein milieu d'une
      // réa). En v55 on avait 'autoUpdate' mais ça contournait le toast
      // (needRefresh ne fire que brièvement) → bouton invisible.
      registerType: "prompt",
      // Génération auto des icônes PWA depuis public/logo_urgences_mulhouse_HD_transparent.png
      // via le preset minimal-2023 (cf. pwa-assets.config.ts). overrideManifestIcons
      // remplace le bloc `icons:` du manifest ci-dessous par les entrées
      // générées (pwa-64x64, pwa-192x192, pwa-512x512, maskable-icon-512x512).
      pwaAssets: {
        config: true,
        overrideManifestIcons: true,
      },
      // Conserve le filename `service-worker.js` pour que les utilisateurs
      // déjà sur v48 (SW artisanal) trouvent le nouveau SW au même URL
      // quand leur browser fait sa check d'update périodique.
      filename: "service-worker.js",
      // Précache tous les assets émis (JS, CSS, HTML, icônes, manifest).
      // Workbox génère le precache-manifest avec les hashes Vite → invalide
      // automatiquement à chaque build.
      workbox: {
        // clientsClaim : dès que le SW s'active, il prend le contrôle de la
        // page courante (pas seulement des navigations futures). Sans ça, la
        // TOUTE PREMIÈRE session reste non-contrôlée → si l'user coupe le
        // réseau ou recharge avant d'avoir rouvert l'app, rien n'est servi
        // depuis le cache → page d'erreur « Vous êtes hors connexion ».
        // On NE touche PAS à skipWaiting (toujours géré par le toast « Mettre
        // à jour ») : clientsClaim n'impacte que la prise de contrôle, pas le
        // moment d'activation d'une nouvelle version. Combo sûr avec 'prompt'.
        clientsClaim: true,
        // woff2 inclus : la police Geist (@fontsource) doit être précachée
        // pour rester dispo hors-ligne (sinon fallback système en offline).
        // PAS de `webmanifest` ici : vite-plugin-pwa ajoute déjà
        // manifest.webmanifest au précache avec sa propre révision. Si on le
        // re-matche via le glob, il se retrouve listé 2× avec 2 révisions
        // différentes → Workbox lève « add-to-cache-list-conflicting-entries »
        // à l'installation → précache KO → écran figé au reload hors-ligne.
        globPatterns: ["**/*.{js,css,html,png,jpg,jpeg,svg,ico,woff2}"],
        // stats.html (visualizer) jamais précaché. Subsets de police non
        // utilisés exclus du precache : MediURG est FR only → seul le
        // subset « latin » sert (les accents FR é è à ç ù sont en
        // Latin-1, couverts par latin). cyrillic / latin-ext restent
        // servis à la demande mais n'alourdissent pas l'install offline
        // (~60 % de poids police en moins dans le precache).
        globIgnores: [
          "**/stats.html",
          // Icônes de raccourcis : déjà ajoutées au précache via le manifest
          // PWA (shortcuts[].icons). Les exclure du glob évite la double
          // inscription (même URL listée 2× dans precacheAndRoute).
          "**/shortcuts/*.svg",
          "**/geist-cyrillic-*.woff2",
          "**/geist-latin-ext-*.woff2",
          "**/geist-mono-cyrillic-*.woff2",
          "**/geist-mono-latin-ext-*.woff2",
        ],
        cleanupOutdatedCaches: true,
        // SPA : toute nav non-précachée renvoie index.html pour que React
        // route côté client.
        navigateFallback: "index.html",
        // Workbox skip silencieusement les fichiers > 2 MB par défaut. On
        // monte à 5 MB pour couvrir les futurs assets lourds (image hi-res
        // ECG, PDF protocole) sans risquer un asset hors cache → 404 offline.
        // Aujourd'hui le plus gros est vendor-react ≈ 191 kB, large marge.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Ajoute les handlers Web Push natifs au SW généré par Workbox.
        // Le fichier reste très petit et séparé du bundle React.
        importScripts: ["/push-handler.js"],
      },
      // (Pas d'`includeAssets` : les .png/.webmanifest sont déjà capturés
      // par workbox.globPatterns plus haut. Listing redondant créait des
      // doublons dans le precache manifest.)
      // Manifest PWA — une seule source de vérité maintenant, plus de
      // public/manifest.json. Le plugin émet `manifest.webmanifest` et
      // injecte le <link rel="manifest"> dans index.html automatiquement.
      manifest: {
        lang: "fr",
        name: "MediURG - Pharmacologie d'Urgence",
        short_name: "MediURG",
        description:
          "Livret pharmacologique hors ligne pour médecins urgentistes, ambulanciers et paramédicaux. Accès rapide à 73+ médicaments d'urgence avec indications, contre-indications, posologies et conduite.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait-primary",
        theme_color: "#FF3B30",
        background_color: "#ffffff",
        categories: ["medical", "productivity"],
        // icons[] injectées au build par pwaAssets.overrideManifestIcons
        // (cf. pwa-assets.config.ts). Ne pas ré-ajouter ici.
        // Raccourcis : long-press de l'icône MediURG sur Android (≥ Chrome 84)
        // affiche un menu avec ces entrées. Cas SMUR : pendant qu'on court vers
        // le patient, on long-press l'icône → URGENCE ACR ouvre direct le mode
        // chronométrage compressions. App.tsx lit ?mode et ?tab au mount.
        shortcuts: [
          {
            name: "Mode URGENCE ACR",
            short_name: "URGENCE",
            description: "Ouvre directement le chrono ACR avec drogues + cycles",
            url: "./?mode=acr",
            icons: [{ src: "shortcuts/urgence.svg", sizes: "96x96", type: "image/svg+xml" }],
          },
          {
            name: "Incompatibilités médicamenteuses",
            short_name: "Incompat",
            description: "Matrice de compatibilité entre drogues IV",
            url: "./?page=protocoles&tab=incompatibilites",
            icons: [{ src: "shortcuts/incompat.svg", sizes: "96x96", type: "image/svg+xml" }],
          },
          {
            name: "Kits de préparation",
            short_name: "Kits",
            description: "ISR, ACR — séquences et doses prêtes",
            url: "./?page=protocoles&tab=kits",
            icons: [{ src: "shortcuts/kits.svg", sizes: "96x96", type: "image/svg+xml" }],
          },
          {
            name: "Protocoles PISU",
            short_name: "PISU",
            description: "Protocoles de soins d'urgence",
            url: "./?page=protocoles",
            icons: [{ src: "shortcuts/pisu.svg", sizes: "96x96", type: "image/svg+xml" }],
          },
        ],
      },
      injectRegister: false, // on garde notre propre registration pour piloter le toast d'update
    }),
    // Analyseur de bundle — produit build/stats.html avec un treemap des
    // chunks. Activé uniquement via `npm run analyze` (env ANALYZE=true) pour
    // ne pas ralentir les builds normaux. Ouvre build/stats.html pour voir
    // ce qui pèse dans index.js / vendor-react / data-medic.
    process.env.ANALYZE === "true" &&
      visualizer({
        filename: "build/stats.html",
        gzipSize: true,
        brotliSize: true,
        template: "treemap",
      }),
  ],
  // base "/" (et NON "./") : déploiement à la racine du domaine (Vercel).
  // Un base relatif casse le navigateFallback de Workbox au rechargement
  // hors-ligne — la coquille (index.html) n'est pas re-servie → React ne
  // monte pas → écran noir. En ligne ça passe (le réseau sert), d'où un bug
  // visible uniquement offline au refresh. Avec "/", precache + fallback
  // utilisent des URLs absolues cohérentes → reload offline OK.
  base: "/",
  build: {
    outDir: "build",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "static/js/[name].[hash].js",
        chunkFileNames: "static/js/[name].[hash].js",
        assetFileNames: ({ name }) => {
          if (name && /\.css$/.test(name)) return "static/css/[name].[hash][extname]";
          return "static/media/[name].[hash][extname]";
        },
        // Split chunks pour que les data files (drugs/pse/aliases — ~150 kB,
        // contenu clinique modifié à chaque release) soient cacheables
        // indépendamment du code app (React + composants). Quand on bump
        // une poso sans toucher au code, le navigateur ne ré-télécharge
        // que `data-medic.[hash].js` au lieu du bundle principal entier.
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) {
            return "vendor-react";
          }
          if (
            id.includes("/src/data/drugs") ||
            id.includes("/src/data/pse") ||
            id.includes("/src/data/aliases")
          ) {
            return "data-medic";
          }
        },
      },
    },
  },
  // ── Flake « Test Files failed / process won't exit » (Node ≥ 25) ──
  // Node 25 active Web Storage par DÉFAUT : `localStorage` devient un
  // objet natif même en environnement node (projet "libs"). Le code
  // garde-fou (`typeof localStorage !== 'undefined'`) passe alors et
  // touche le store natif Node → handle persistant → vitest affiche
  // « something prevents the main process from exiting » → sous
  // pre-push/CI les workers sont tués → fichiers reportés en échec
  // (flaky non déterministe). Fix RACINE : `NODE_OPTIONS=
  // --no-experimental-webstorage` dans les scripts test* du package.json
  // → `localStorage` undefined en node (comportement pré-Node-25 pour
  // lequel le projet "libs" est conçu). happy-dom (projet "dom") fournit
  // son propre localStorage, non affecté. NE PAS retirer ce flag.
  // @ts-expect-error — clé `test` ajoutée par vitest, pas dans le type de Vite
  test: {
    // Projects : sépare les tests purs (logique métier, reducers) du test DOM.
    // - "libs" tourne en environnement node pur → ~2× plus rapide qu'en happy-dom,
    //   et garantit qu'aucun code testé n'a de dépendance DOM cachée.
    // - "dom" tourne en happy-dom (~2-3× plus rapide que jsdom) pour les
    //   composants React qui ont besoin de render/fireEvent/userEvent.
    // Globals + setupFiles sont hérités via `extends: true`.
    globals: true,
    // setupFiles n'est PAS défini ici : jest-dom (`@testing-library/jest-dom`)
    // étend `expect` avec des matchers DOM (toBeInTheDocument, …). Hérité par
    // les DEUX projets via `extends: true`, il s'exécutait aussi dans le projet
    // "libs" (environnement node, sans DOM) ; quand les deux projets
    // s'entrelaçaient dans le pool de workers partagé, l'extension d'`expect`
    // n'était parfois pas appliquée avant qu'un test "dom" tourne → échecs
    // flaky « Invalid Chai property: toBeInTheDocument ». On scope donc le
    // setup au seul projet "dom" qui en a besoin (cf. doc Vitest projects :
    // setupFiles par projet plutôt qu'hérité globalement).
    // Coverage v8 (provider natif Node) — `npm run test:coverage` produit un
    // rapport HTML dans coverage/ et un récap dans la console. Pas de
    // thresholds bloquants pour l'instant (à ajouter plus tard quand on
    // aura un baseline stable).
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{js,ts,tsx}",
        "src/test-setup.ts",
        "src/global.d.ts",
        "src/index.tsx", // bootstrap pur
        "src/data/**", // lookup tables JS, pas de logique
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: { label: "libs", color: "blue" },
          // Tests purs : libs/ + le reducer ACR (pure function malgré son
          // emplacement dans components/).
          include: ["src/lib/**/*.test.{js,ts}", "src/components/AcrTimer.reducer.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: { label: "dom", color: "green" },
          include: ["src/components/**/*.test.{js,ts,tsx}", "src/pages/**/*.test.{js,ts,tsx}"],
          // Le reducer pur tourne dans le projet "libs" pour la vitesse.
          exclude: ["src/components/AcrTimer.reducer.test.ts"],
          environment: "happy-dom",
          // jest-dom scopé ici uniquement (seul ce projet rend du DOM).
          // L'extension d'`expect` est faite explicitement dans le
          // setup (expect.extend(matchers)), pas via le side-effect
          // bare — cf. commentaire en tête de src/test-setup.ts.
          setupFiles: ["src/test-setup.ts"],
          // ── Anti-flaky « Invalid Chai property: toBeInTheDocument » ──
          // Cause racine : sous charge, le side-effect bare
          // `import "@testing-library/jest-dom/vitest"` du setup n'était
          // pas garanti d'avoir étendu `expect` avant l'évaluation d'un
          // fichier → ~89/210 tests KO non déterministe (pre-push/CI).
          //
          // Fix en DEUX volets :
          //  1. setup canonique : expect.extend(matchers) explicite +
          //     cleanup() (cf. src/test-setup.ts) → enregistrement
          //     déterministe des matchers, rejoué proprement par fichier.
          //  2. fileParallelism:false → fichiers dom en SÉQUENTIEL :
          //     plus aucune course de setup entre workers (combo prouvé
          //     propre, équivalent à --no-file-parallelism : 210/210).
          //     PAS de singleFork (process unique long = instable sous
          //     charge avec Node 25). PAS de isolate:false (partage le
          //     document happy-dom → « Found multiple elements » en CI) :
          //     l'isolation par fichier RESTE active.
          //  3. sequence.groupOrder distinct : Vitest 4 refuse deux
          //     projets de maxWorkers différents (dom sérialisé vs libs
          //     parallèle) dans le même groupe.
          // libs (node pur) reste parallèle/rapide ; seul dom (~210
          // tests) passe en séquentiel — coût accepté pour un pre-push
          // /CI déterministe (mémoire ACR : pas de régression en réa).
          fileParallelism: false,
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
});
