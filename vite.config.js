import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Migration CRA → Vite. Conserve le layout de sortie attendu par le
// service worker (build/static/{js,css}/main.HASH.{js,css} + asset-manifest.json)
// pour ne rien casser côté offline cache.
export default defineConfig({
  plugins: [react()],
  // base "./" reproduit le comportement de CRA homepage "." : URLs relatives
  // pour que l'app marche aussi servie depuis un sous-dossier ou file://.
  base: "./",
  // Output dans build/ (au lieu du dist/ par défaut de Vite) avec layout
  // static/js + static/css identique à CRA, pour ne pas casser le service
  // worker qui précache via /static/.
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
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{js,jsx}"],
  },
});
