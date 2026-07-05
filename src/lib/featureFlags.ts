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

// Preview UNIFIÉE : un seul point d'entrée active les features internes
// encore non publiques (overlays PSE/drugs, etc.). Depuis
// l'ouverture officielle du login, l'auth n'est plus pilotée par ce mode :
// `?author=preview` reste l'URL de preview dédiée.
const URL_PARAM_OVERRIDE: Record<string, string[]> = {
  AUTH_ENABLED: ["author"],
};

// Override explicite : le mode preview n'est actif que si l'URL courante
// contient `?author=preview`. Pas de mémorisation en session : sans paramètre
// visible, l'utilisateur est en main.
const isPreviewing = (flagName: string): boolean => {
  if (typeof window === "undefined") return false;
  const params = URL_PARAM_OVERRIDE[flagName];
  if (!params || params.length === 0) return false;
  try {
    const search = new URLSearchParams(window.location.search);
    return params.some((p) => search.get(p) === "preview");
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
// Login ouvert officiellement : laisser true en prod.
// ────────────────────────────────────────────────────────────
const AUTH_ENABLED = true;

// Détecte un retour de lien de récupération (mot de passe oublié) :
// Supabase ajoute `#type=recovery&access_token=...` au hash. Si l'auth
// est désactivée (flag false), l'user resterait
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
// Activé par la preview unifiée : `?author=preview`. Public (flag false,
// pas de ?author=preview) : PSE strictement inchangé.
//
// Promotion en prod d'un protocole validé : déplacer son entrée de
// pse.preview.js vers pse.js, puis commit/push (le flag reste false).
// ────────────────────────────────────────────────────────────
const PSE_PREVIEW = false;

export const isPsePreview = (): boolean => PSE_PREVIEW || isPreviewing("AUTH_ENABLED");

// Preview unifiée générique : true uniquement avec `?author=preview`.
// Public hors preview → toujours false.
export const isPreview = (): boolean => isPreviewing("AUTH_ENABLED");
