import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

// Génère toutes les icônes PWA (favicon, apple-touch, any/maskable 192/512)
// depuis une source unique : public/logo_urgences_mulhouse_HD_transparent.png.
// Plus besoin de maintenir 6 PNG à la main quand on retouche le logo.
//
// Usage : `npm run generate-pwa-assets` (CLI) OU automatique au build via
// l'option `pwaAssets` dans vite.config.ts.
export default defineConfig({
  preset: minimal2023Preset,
  images: ["public/logo_urgences_mulhouse_HD_transparent.png"],
});
