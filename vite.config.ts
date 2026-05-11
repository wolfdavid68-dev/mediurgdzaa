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
        icons: [
          { src: "favicon-32x32.png", sizes: "32x32", type: "image/png" },
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "apple-touch-icon.png", sizes: "180x180", type: "image/png" },
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
