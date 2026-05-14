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
};

const isPreviewing = (flagName: string): boolean => {
  if (typeof window === "undefined") return false;
  const param = URL_PARAM_OVERRIDE[flagName];
  if (!param) return false;
  try {
    return new URLSearchParams(window.location.search).get(param) === "preview";
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
