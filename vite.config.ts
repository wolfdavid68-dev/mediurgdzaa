import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { VitePWA } from "vite-plugin-pwa";
import checker from "vite-plugin-checker";

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
        globPatterns: ["**/*.{js,css,html,png,svg,ico,webmanifest}"],
        cleanupOutdatedCaches: true,
        // SPA : toute nav non-précachée renvoie index.html pour que React
        // route côté client.
        navigateFallback: "index.html",
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
  ],
  base: "./",
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
  // @ts-expect-error — clé `test` ajoutée par vitest, pas dans le type de Vite
  test: {
    // happy-dom au lieu de jsdom : implémentation DOM en TS (vs jsdom en JS),
    // ~2-3× plus rapide pour les tests React. Compatible avec tout ce dont on
    // a besoin (matchers jest-dom, user-event, fireEvent, etc.). Si on touchait
    // à des APIs très bordées (XMLHttpRequest avancé, fetch streams), il faudrait
    // re-vérifier — pour MediURG on est sur du DOM standard, no-op.
    environment: "happy-dom",
    globals: true,
    include: ["src/**/*.test.{js,jsx,ts,tsx}"],
    // setupFiles est exécuté avant chaque suite : importe les matchers
    // @testing-library/jest-dom (toBeInTheDocument, toHaveClass, etc.).
    setupFiles: ["src/test-setup.ts"],
  },
});
