import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Styles découpés par domaine (anciennement style.css monolithique).
// Ordre = ordre original du fichier monolithique → cascade préservée.
// La déclaration @layer reset, base, components, utilities, overrides
// vit dans base.css (premier import) et reste valide pour tous les suivants.
import "./styles/base.css";
import "./styles/header.css";
import "./styles/drug-card.css";
import "./styles/pse.css";
import "./styles/protocols.css";
import "./styles/drug-related.css";
import "./styles/echelles.css";
import "./styles/kits.css";
import "./styles/incompatibilites.css";
import "./styles/ci-severity.css";
import "./styles/font-large.css";
import "./styles/changelog.css";
import "./styles/urgence-button.css";
// Sous-fichiers de l'ancien acr.css (2071 lignes) — découpés par sous-composant
// d'AcrTimer.parts.tsx. L'ordre suit la cascade originale.
import "./styles/acr-base.css";
import "./styles/acr-doses.css";
import "./styles/acr-metro.css";
import "./styles/acr-step.css";
import "./styles/acr-tally.css";
import "./styles/acr-history.css";
import "./styles/acr-controls.css";
import "./styles/acr-zoom.css";
import "./styles/acr-prep.css";
import "./styles/acr-postrosc.css";
import "./styles/acr-ht.css";
import "./styles/acr-summary.css";
import "./styles/ecg.css";
// Styles isolés pour les écrans d'auth (login/register/admin/etc.) — palette
// dark + rouge GHR différente de la palette MediURG. Charge les tokens via
// .auth-stage / .admin-stage scopes pour ne pas polluer le reste de l'app.
import "./styles/auth.css";
// Design mobile dédié des écrans d'auth (hero plein écran, tab bar, bottom
// sheets) — recréation du design_handoff_sau_mulhouse/mobile. Activé sous
// 600px par useIsMobile() côté AuthGate. Classes préfixées .m-.
import "./styles/auth-mobile.css";
import App from "./App";
import AuthGate from "./components/auth/AuthGate";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root introuvable dans index.html");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    {/* AuthGate : transparent quand AUTH_ENABLED=false (mode actuel par
        défaut), sinon affiche login/register/pending/banned/admin selon
        l'état de session Supabase. Cf. src/lib/featureFlags.ts. */}
    <AuthGate>
      <App />
    </AuthGate>
  </StrictMode>
);

// Signale au splash HTML (index.html) que l'app est montée pour qu'il puisse
// se retirer. Le splash attend aussi un délai minimum de 900 ms (cf. inline JS).
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event("mediurg:ready"));
  });
});
