import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

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
    react({
      // React Compiler (stable v1.0) : analyse les composants et insère
      // automatiquement la mémoïsation (useMemo/useCallback implicites)
      // partout où c'est sûr. Évite les re-renders inutiles lors du
      // filtrage drugs/protocols quand l'user tape dans la search bar.
      babel: {
        plugins: [["babel-plugin-react-compiler", { target: "19" }]],
      },
    }),
    VitePWA({
      // 'prompt' : le nouveau SW reste en waiting jusqu'à ce que l'user
      // clique sur le toast « Mettre à jour ». UX explicite — l'user
      // contrôle le moment de la mise à jour (pas en plein milieu d'une
      // réa). En v55 on avait 'autoUpdate' mais ça contournait le toast
      // (needRefresh ne fire que brièvement) → bouton invisible.
      registerType: "prompt",
      // Génération auto des icônes PWA depuis public/logo.svg via le preset
      // minimal-2023 (cf. pwa-assets.config.ts). overrideManifestIcons
      // remplace le bloc `icons:` du manifest ci-dessous par les entrées
      // générées (pwa-64x64, pwa-192x192, pwa-512x512, maskable-icon-512x512).
      // Plus de PNG à maintenir à la main — un seul logo.svg = source de vérité.
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
        background_color: "#0A0A0F",
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
          },
          {
            name: "Incompatibilités médicamenteuses",
            short_name: "Incompat",
            description: "Matrice de compatibilité entre drogues IV",
            url: "./?page=protocoles&tab=incompatibilites",
          },
          {
            name: "Kits de préparation",
            short_name: "Kits",
            description: "ISR, ACR — séquences et doses prêtes",
            url: "./?page=protocoles&tab=kits",
          },
          {
            name: "Protocoles PISU",
            short_name: "PISU",
            description: "Protocoles de soins d'urgence",
            url: "./?page=protocoles",
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
          if (id.includes("/src/data/drugs") || id.includes("/src/data/pse") || id.includes("/src/data/aliases")) {
            return "data-medic";
          }
        },
      },
    },
  },
  // @ts-expect-error — clé `test` ajoutée par vitest, pas dans le type de Vite
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{js,jsx,ts,tsx}"],
  },
});
