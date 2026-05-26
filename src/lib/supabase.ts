import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Client Supabase singleton.
//
// L'URL et la clé publique sont injectées au build via .env.local (Vercel les
// expose en prod via le dashboard). Si elles manquent, on retourne null —
// utile en CI ou en preview de feature pour ne pas crash l'app entière.
//
// Variables attendues dans .env.local (et dans Vercel) :
//   VITE_SUPABASE_URL=https://<project>.supabase.co
//   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
// Compatibilité legacy acceptée :
//   VITE_SUPABASE_ANON_KEY=eyJ...   (clé anon, pas la service_role !)
//
// La service_role ne doit JAMAIS être exposée côté client (elle bypass
// les RLS policies). Elle reste sur Supabase pour les fonctions edge
// si on en ajoute plus tard.

let _client: SupabaseClient | null = null;
let _initialized = false;

export const getSupabase = (): SupabaseClient | null => {
  if (_initialized) return _client;
  _initialized = true;

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const publishableKey =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

  if (!url || !publishableKey) {
    // Pas de credentials → on log seulement en dev pour aider au debug.
    if (import.meta.env.DEV) {
      console.warn(
        "[supabase] VITE_SUPABASE_URL ou clé publique Supabase manquante. Auth désactivée."
      );
    }
    return null;
  }

  try {
    _client = createClient(url, publishableKey, {
      auth: {
        // Persist la session dans localStorage (clé sb-<projectref>-auth-token).
        // Permet à l'user de rester loggé entre les ouvertures de l'app.
        persistSession: true,
        // Auto-refresh du token avant expiration → pas de logout surprise
        // pendant qu'un médecin consulte une fiche.
        autoRefreshToken: true,
        // Detect le retour depuis un magic link / email confirmation dans
        // l'URL (#access_token=...) et set la session automatiquement.
        detectSessionInUrl: true,
      },
    });
    return _client;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error("[supabase] Échec d'init du client :", err);
    }
    return null;
  }
};
