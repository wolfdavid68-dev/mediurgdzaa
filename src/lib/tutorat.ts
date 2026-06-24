// Compagnon Tutorat ESI/AS (repo wolfdavid68-dev/tutorat-sau-mulhouse).
// Origine unifiée : Tutorat est servi sous le sous-chemin /tutorat/ du MÊME
// host que MediURG (via un rewrite Vercel qui proxifie /tutorat/* vers le
// déploiement Tutorat). Naviguer en relatif garde la PWA « interne » → pas de
// barre d'adresse Custom Tab sur mobile au passage MediURG → Tutorat.
// Override possible en dev via .env.local : VITE_TUTORAT_URL=http://localhost:5174.
export const TUTORAT_URL = import.meta.env.VITE_TUTORAT_URL || "/tutorat/";
