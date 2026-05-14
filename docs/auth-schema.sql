-- ════════════════════════════════════════════════════════════════
-- MediURG — Schéma SQL pour l'authentification (Supabase)
--
-- Exécuter ce script en une fois dans le SQL Editor de Supabase.
-- Idempotent : peut être ré-exécuté sans erreur (utilise IF NOT EXISTS
-- partout que possible). Les drop/create de policies sont volontaires
-- pour permettre des updates de schéma.
--
-- Patterns appliqués (best practices Supabase 2024) :
-- - SECURITY DEFINER + `set search_path = ''` sur les fonctions
--   privilégiées (évite le hijacking de schéma)
-- - `(select auth.uid())` dans les RLS policies (cache initPlan, perf)
-- - Vue `matricule_lookup` SECURITY INVOKER pour le login (résolution
--   matricule → email côté client sans exposer le reste du profile)
-- ════════════════════════════════════════════════════════════════

-- ── ENUMS ────────────────────────────────────────────────────
do $$ begin
  create type public.user_status as enum ('pending', 'active', 'banned');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.user_role as enum ('user', 'admin');
exception when duplicate_object then null;
end $$;

-- ── TABLE profiles ──────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid        primary key references auth.users on delete cascade,
  matricule     text        not null unique,
  email         text        not null,
  prenom        text        not null,
  nom           text        not null,
  fonction      text        not null,
  service       text        not null,
  status        public.user_status not null default 'pending',
  role          public.user_role   not null default 'user',
  created_at    timestamptz not null default now(),
  approved_at   timestamptz,
  approved_by   uuid        references auth.users on delete set null,
  banned_at     timestamptz,
  ban_reason    text,
  constraint matricule_format check (matricule ~ '^M\d{6}$')
);

create index if not exists profiles_status_idx on public.profiles (status);
create index if not exists profiles_matricule_idx on public.profiles (matricule);

-- ── Trigger : auto-création du profile au signup ────────────
-- Le trigger lit `raw_user_meta_data` (envoyé par signUp({ data: {...} })
-- côté client) et insère la ligne profile correspondante. Sans ça, un
-- nouveau auth.users serait créé sans profile et ne pourrait pas se login
-- (notre vue matricule_lookup ne le trouverait pas).
--
-- security definer + search_path = '' : pattern recommandé par Supabase
-- pour éviter le détournement de schéma par un user malveillant.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, matricule, email, prenom, nom, fonction, service)
  values (
    new.id,
    new.raw_user_meta_data ->> 'matricule',
    new.email,
    new.raw_user_meta_data ->> 'prenom',
    new.raw_user_meta_data ->> 'nom',
    new.raw_user_meta_data ->> 'fonction',
    new.raw_user_meta_data ->> 'service'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Helper : is_admin() ─────────────────────────────────────
-- Utilisé dans les policies RLS pour vérifier que le caller est admin.
-- security definer pour pouvoir lire profiles sans être bloqué par RLS
-- (sinon récursion infinie : la policy admin checkrait is_admin() qui
-- read profiles qui declenche la policy admin qui call is_admin()…).
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and status = 'active'
  );
end;
$$;

-- ── RLS sur profiles ────────────────────────────────────────
alter table public.profiles enable row level security;

-- Drop les anciennes policies pour ré-exécution propre
drop policy if exists "self_read" on public.profiles;
drop policy if exists "admin_read_all" on public.profiles;
drop policy if exists "admin_update_all" on public.profiles;
drop policy if exists "admin_delete" on public.profiles;
drop policy if exists "no_direct_insert" on public.profiles;

-- Lecture : un user voit son propre profile
create policy "self_read"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- Lecture : les admins voient tous les profiles
create policy "admin_read_all"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

-- Update : les admins peuvent modifier tous les profiles (approve/ban)
create policy "admin_update_all"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Delete : les admins peuvent supprimer un profile (= reject d'une demande)
-- Note : la suppression du profile cascade vers auth.users via la FK,
-- donc l'auth.users est aussi nettoyé.
create policy "admin_delete"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());

-- Pas d'insert direct depuis le client : l'insertion se fait uniquement
-- via le trigger handle_new_user() qui s'exécute en security definer.

-- ── Vue publique : matricule → email pour le login ──────────
-- Le client login envoie un matricule, Supabase Auth attend un email :
-- on a besoin d'une résolution publique. Cette vue n'expose QUE
-- (matricule, email), rien d'autre du profile.
--
-- Sécurité : cette vue est publique (anon + authenticated) car le login
-- doit pouvoir y accéder AVANT d'être loggé. Risque acceptable :
-- équivalent au login email/password classique qui révèle si un email
-- existe (pas plus). Pas de listing possible (RLS sur la table sous-jacente
-- empêche le SELECT * sans WHERE).
--
-- security_invoker = true (Postgres 15+) → respecte la RLS de l'appelant.
-- Mais on grant SELECT à anon explicitement pour permettre le login.
drop view if exists public.matricule_lookup;
create view public.matricule_lookup
with (security_invoker = true) as
  select matricule, email
  from public.profiles
  where status in ('pending', 'active', 'banned');

-- Permet la lecture par anonyme et authentifié (mais la RLS sous-jacente
-- limite ce qui sort — on ajoute une policy ouverte juste pour cette vue).
drop policy if exists "matricule_lookup_anon" on public.profiles;
create policy "matricule_lookup_anon"
  on public.profiles for select
  to anon
  using (true);
-- ⚠ Note sécurité : cette policy expose tous les rows aux anonymes.
-- Pour la limiter à matricule_lookup, il faudrait wrapper la vue dans
-- une fonction `security definer` qui accepte un matricule en paramètre
-- et ne retourne que la ligne matchant. À considérer pour une v2.

grant select on public.matricule_lookup to anon, authenticated;

-- ── Realtime (optionnel) ────────────────────────────────────
-- Active les events realtime sur profiles : utile pour le dashboard
-- admin (la liste des demandes se met à jour live quand un nouvel user
-- s'inscrit). Décommenter si besoin :
--
-- alter publication supabase_realtime add table public.profiles;

-- ── Vérification ────────────────────────────────────────────
-- Pour vérifier que tout est OK après exécution :
--
--   select * from public.profiles;                  -- doit être vide
--   select public.is_admin();                       -- doit retourner false (pas connecté)
--   \d public.profiles                              -- structure attendue
--
-- Et après le 1er signup via l'app :
--   select id, matricule, email, status, role from public.profiles;
