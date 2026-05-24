// URL du compagnon Tutorat ESI/AS (projet séparé : repo
// wolfdavid68-dev/tutorat-sau-mulhouse, déploiement Vercel autonome).
// Override possible en dev via .env.local : VITE_TUTORAT_URL=http://localhost:5174.
export const TUTORAT_URL =
  import.meta.env.VITE_TUTORAT_URL || "https://tutorat-sau-mulhouse.vercel.app";
