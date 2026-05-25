-- ════════════════════════════════════════════════════════════════
-- MediURG — Correctif sécurité : résolution matricule → email
--
-- À EXÉCUTER une fois dans le SQL Editor de Supabase (projet en cours).
-- Idempotent : ré-exécutable sans erreur.
--
-- PROBLÈME CORRIGÉ
-- L'ancien schéma exposait TOUTE la table `profiles` aux requêtes
-- anonymes via la policy `matricule_lookup_anon ... using (true)`
-- (cf. auth-schema.sql, note sécurité ligne 171). La clé anon étant
-- publique (embarquée dans le bundle JS), n'importe qui pouvait lire
-- matricule / email / nom / fonction / service / rôle / statut de tous
-- les utilisateurs → fuite de données personnelles (RGPD).
--
-- CORRECTIF
-- On supprime la vue + la policy anon ouverte et on les remplace par
-- une fonction SECURITY DEFINER paramétrée : elle ne retourne QUE
-- l'email de la ligne dont le matricule est passé en argument. Pas de
-- listing / énumération possible. `profiles` n'a plus aucune policy
-- de lecture anonyme.
--
-- ⚠ À déployer AVEC la version du code qui appelle
-- `supabase.rpc('matricule_to_email', …)` (cf. src/lib/auth.ts).
-- L'app actuelle en preview lit encore la vue : exécuter ce script
-- puis relancer `npm start` avec le code à jour.
-- ════════════════════════════════════════════════════════════════

-- 1. Supprimer l'ancienne vue et la policy trop ouverte
drop view   if exists public.matricule_lookup;
drop policy if exists "matricule_lookup_anon" on public.profiles;

-- 1bis. Durcir l'accès Data API à `profiles` : aucune lecture anonyme de
-- la table complète, même si une ancienne policy anon subsiste ou si les
-- grants par défaut du projet exposaient public.*. Les utilisateurs
-- connectés gardent l'accès nécessaire, toujours filtré par RLS.
alter table public.profiles enable row level security;
revoke all on table public.profiles from anon;
revoke all on table public.profiles from public;
grant select, update, delete on table public.profiles to authenticated;

-- 2. Fonction de résolution : matricule → email (ou null si inconnu).
--    security definer + search_path = '' : pattern Supabase recommandé
--    (lecture de profiles sans être bloquée par la RLS, sans hijacking
--    de schéma). Paramétrée → ne peut renvoyer qu'UNE ligne ciblée,
--    pas de SELECT * possible côté client.
create or replace function public.matricule_to_email(p_matricule text)
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select email
  from public.profiles
  where matricule = p_matricule
  limit 1;
$$;

-- 3. Droits d'exécution : anon (login AVANT d'être connecté) + authenticated.
--    On révoque d'abord le grant PUBLIC implicite (create function le
--    donne par défaut) pour ne l'ouvrir qu'aux rôles voulus.
revoke all     on function public.matricule_to_email(text) from public;
grant  execute on function public.matricule_to_email(text) to anon, authenticated;

-- ── Vérification ────────────────────────────────────────────
-- En anon (clé anon, non connecté) :
--   select * from public.profiles;                       -- doit être VIDE
--   select public.matricule_to_email('M402100');         -- doit renvoyer l'email
--   select public.matricule_to_email('M000000');         -- doit renvoyer null
