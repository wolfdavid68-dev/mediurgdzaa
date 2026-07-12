import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import RootErrorFallback from "./components/RootErrorFallback";

// Styles découpés par domaine (anciennement style.css monolithique).
// Ordre = ordre original du fichier monolithique → cascade préservée.
// La déclaration @layer reset, base, components, utilities, overrides
// vit dans base.css (premier import) et reste valide pour tous les suivants.
import "./styles/base.css";
import "./styles/header.css";
import "./styles/drug-card.css";
import "./styles/preparation-v25.css";
import "./styles/pse.css";
import "./styles/drug-related.css";
import "./styles/ktc-light-contrast.css";
import "./styles/ci-severity.css";
import "./styles/font-large.css";
import "./styles/urgence-button.css";
import "./styles/bottom-nav-safe-area.css";
// Sous-fichiers de l'ancien acr.css (2071 lignes) — découpés par sous-composant
// d'AcrTimer.parts.tsx. L'ordre suit la cascade originale.
// Styles isolés pour les écrans d'auth (login/register/admin/etc.) — palette
// dark + rouge GHR différente de la palette MediURG. Charge les tokens via
// .auth-stage / .admin-stage scopes pour ne pas polluer le reste de l'app.
// Police Geist (Sans + Mono) self-hostée via @fontsource — spécifiée par le
// design_handoff. Variable font (poids 100–900 en un fichier). Self-host =
// pas de CDN Google Fonts → fonctionne hors-ligne (PWA offline-first).
import "@fontsource-variable/geist/index.css";
import "@fontsource-variable/geist-mono/index.css";
import "./styles/auth.css";
// Design mobile dédié des écrans d'auth (hero plein écran, tab bar, bottom
// sheets) — recréation du design_handoff_sau_mulhouse/mobile. Activé sous
// 600px par useIsMobile() côté AuthGate. Classes préfixées .m-.
import "./styles/auth-mobile.css";
import App from "./App";
import AuthGate from "./components/auth/AuthGate";
import UpdatePrompt from "./components/UpdatePrompt";
import { safeGetSessionItem, safeSetSessionItem } from "./lib/safeStorage";
import { STORAGE_KEYS } from "./lib/storageKeys";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root introuvable dans index.html");
const root = createRoot(rootElement);

// Capture des erreurs qui ne remontent PAS par React (rejets de promesse non
// gérés, erreurs dans des handlers async). Elles ne démontent pas l'arbre mais
// on les loggue pour diagnostic — utile pour pister un crash hors-ligne.
window.addEventListener("unhandledrejection", (e) => {
  console.error("[mediurg] unhandledrejection", e.reason);
});
window.addEventListener("error", (e) => {
  console.error("[mediurg] window error", e.message, e.error);
});

// Vite émet `vite:preloadError` quand un chunk lazy échoue à charger — typique
// après un déploiement (le hash demandé n'existe plus / pas encore en cache).
// Si on est EN LIGNE : un reload récupère l'index.html + le SW à jour et tout
// se resynchronise. HORS-LIGNE : on laisse l'ErrorBoundary racine afficher
// l'écran de récupération (un reload ne servirait à rien sans réseau). Garde
//-fou anti-boucle : un seul reload auto par session d'onglet.
window.addEventListener("vite:preloadError", (e) => {
  const onLine = typeof navigator === "undefined" || navigator.onLine;
  const already = safeGetSessionItem(STORAGE_KEYS.preloadReloaded) === "1";
  if (onLine && !already) {
    e.preventDefault();
    safeSetSessionItem(STORAGE_KEYS.preloadReloaded, "1");
    window.location.reload();
  }
});

root.render(
  <StrictMode>
    {/* ErrorBoundary racine : filet ultime. Une erreur de rendu non rattrapée
        démonterait sinon tout React → écran noir. Ici on affiche un écran de
        récupération lisible (cf. RootErrorFallback) au lieu du néant. */}
    <ErrorBoundary
      FallbackComponent={RootErrorFallback}
      onError={(error, info) => console.error("[mediurg] root crash", error, info)}
    >
      {/* AuthGate : transparent quand AUTH_ENABLED=false (mode actuel par
          défaut), sinon affiche login/register/pending/banned/admin selon
          l'état de session Supabase. Cf. src/lib/featureFlags.ts. */}
      <>
        <AuthGate>
          <App />
        </AuthGate>
        <UpdatePrompt />
      </>
    </ErrorBoundary>
  </StrictMode>
);

// Signale au splash HTML (index.html) que l'app est montée pour qu'il puisse
// se retirer. Le splash attend aussi un délai minimum de 900 ms (cf. inline JS).
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event("mediurg:ready"));
  });
});
