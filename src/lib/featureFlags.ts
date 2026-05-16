// Feature flags — interrupteurs pour activer / désactiver des features
// pas encore prêtes pour la prod sans avoir à supprimer le code.
//
// Convention : chaque flag est une `const` typée (pas un setter dynamique
// dans le code). Pour activer en prod : modifier la valeur ici, commit, push.
// Vercel redéploie et la feature devient active.
//
// Override de session pour tester localement sans flipper le flag :
// ajouter `?<flag-name>=preview` à l'URL → la feature est forcée à true
// pour cette session (lue à chaque appel, pas mémorisée).

const URL_PARAM_OVERRIDE: Record<string, string> = {
  AUTH_ENABLED: "auth",
  PSE_PREVIEW: "pse",
};

// Override de session « collant » : dès que `?auth=preview` est vu une
// fois, on le mémorise en sessionStorage. Sinon l'override serait perdu
// au premier popstate/pushState de l'app (App.jsx réécrit l'URL et fait
// sauter le query param) → isAuthEnabled() repasserait à false → AuthGate
// bypasserait l'auth et réafficherait l'app (ex. après logout on revenait
// sur l'app au lieu du login). Sticky pour toute la session d'onglet ;
// fermer l'onglet « sort » du mode preview. N'affecte jamais la prod
// (AUTH_ENABLED reste la source de vérité hors preview).
const STICKY_PREFIX = "mediurg-preview-";

const isPreviewing = (flagName: string): boolean => {
  if (typeof window === "undefined") return false;
  const param = URL_PARAM_OVERRIDE[flagName];
  if (!param) return false;
  const stickyKey = STICKY_PREFIX + param;
  try {
    const inUrl = new URLSearchParams(window.location.search).get(param) === "preview";
    if (inUrl) {
      try {
        window.sessionStorage.setItem(stickyKey, "1");
      } catch {
        /* sessionStorage indispo : on reste sur la lecture URL */
      }
      return true;
    }
    return window.sessionStorage.getItem(stickyKey) === "1";
  } catch {
    return false;
  }
};

// ── AUTH_ENABLED ─────────────────────────────────────────────
// Authentification + console admin (Supabase) — codée mais désactivée
// tant que l'admin n'a pas configuré le projet Supabase et créé la table
// `profiles`. Cf. docs/AUTH_SETUP.md pour le SQL et les variables d'env.
//
// Quand false : l'app fonctionne comme avant, sans login. AuthGate rend
// directement <App /> et aucun appel Supabase n'est effectué.
//
// Pour tester localement : http://localhost:5173/?auth=preview
// ────────────────────────────────────────────────────────────
const AUTH_ENABLED = false;

// Détecte un retour de lien de récupération (mot de passe oublié) :
// Supabase ajoute `#type=recovery&access_token=...` au hash. Si l'auth
// est désactivée (flag false ET pas de ?auth=preview), l'user resterait
// bloqué sur l'app sans jamais voir le ResetPasswordScreen. On force
// l'activation dans ce cas.
const isRecoveryReturn = (): boolean => {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash;
  return hash.includes("type=recovery") && hash.includes("access_token=");
};

export const isAuthEnabled = (): boolean =>
  AUTH_ENABLED || isPreviewing("AUTH_ENABLED") || isRecoveryReturn();

// ── PSE_PREVIEW ──────────────────────────────────────────────
// Permet de tester de nouveaux protocoles PSE (ou des corrections)
// sur la prod live SANS les exposer au public. Les entrées en attente
// vivent dans src/data/pse.preview.js (overlay fusionné par-dessus PSE
// uniquement quand ce mode est actif).
//
// Public (flag false, pas de ?pse=preview) : PSE inchangé.
// Preview : https://…/?pse=preview → PSE + pse.preview.js (collant sur
//           la session d'onglet, comme ?auth=preview).
//
// Promotion en prod d'un protocole validé : déplacer son entrée de
// pse.preview.js vers pse.js, puis commit/push (le flag reste false).
// ────────────────────────────────────────────────────────────
const PSE_PREVIEW = false;

export const isPsePreview = (): boolean => PSE_PREVIEW || isPreviewing("PSE_PREVIEW");
