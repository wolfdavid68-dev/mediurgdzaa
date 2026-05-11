import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Migration CRA → Vite. Conserve le layout de sortie attendu par le
// service worker (build/static/{js,css}/main.HASH.{js,css} + asset-manifest.json)
// pour ne rien casser côté offline cache.
export default defineConfig({
  plugins: [
    react({
      // CRA tolère JSX dans .js. Vite passe les .js par esbuild qui par
      // défaut ne parse pas JSX. Le plugin React l'active si on lui dit
      // explicitement ; sinon il faudrait renommer tous les fichiers en .jsx.
      include: /\.(js|jsx)$/,
    }),
  ],
  // base "./" reproduit le comportement de CRA homepage "." : URLs relatives
  // pour que l'app marche aussi servie depuis un sous-dossier ou file://.
  base: "./",
  // CRA dépose son output dans build/, le service worker s'attend à cette
  // structure ainsi que le script check-versions et le generate-asset-manifest
  // post-build. On garde build/ plutôt que le dist/ par défaut de Vite.
  build: {
    outDir: "build",
    emptyOutDir: true,
    // Reproduit le layout CRA : static/js/main.HASH.js + static/css/main.HASH.css
    rollupOptions: {
      output: {
        entryFileNames: "static/js/[name].[hash].js",
        chunkFileNames: "static/js/[name].[hash].js",
        assetFileNames: ({ name }) => {
          if (name && /\.css$/.test(name)) return "static/css/[name].[hash][extname]";
          if (name && /\.(png|jpg|jpeg|gif|svg|ico|webp)$/.test(name)) return "static/media/[name].[hash][extname]";
          return "static/media/[name].[hash][extname]";
        },
      },
    },
  },
  esbuild: {
    // Indispensable pour parser le JSX présent dans des fichiers .js (héritage CRA)
    loader: "jsx",
    include: /src\/.*\.js$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { ".js": "jsx" },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{js,jsx}"],
  },
});
