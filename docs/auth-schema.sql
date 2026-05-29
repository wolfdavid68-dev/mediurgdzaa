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
-- - Fonction `matricule_to_email` SECURITY DEFINER paramétrée pour le
--   login (résolution matricule → email sans exposer profiles aux anon)
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

-- Journal d'audit admin : trace les validations, refus, suspensions et
-- rétablissements. On garde un snapshot du compte cible (matricule/email/nom)
-- car un refus supprime ensuite la ligne `profiles`.
create table if not exists public.admin_audit_events (
  id                bigserial   primary key,
  created_at        timestamptz not null default now(),
  actor_id          uuid        not null references auth.users on delete restrict,
  target_profile_id uuid        not null,
  target_matricule  text        not null,
  target_email      text        not null,
  target_prenom     text        not null,
  target_nom        text        not null,
  action            text        not null check (action in ('approve', 'reject', 'ban', 'unban')),
  reason            text
);

create index if not exists admin_audit_events_created_idx
  on public.admin_audit_events (created_at desc);
create index if not exists admin_audit_events_actor_idx
  on public.admin_audit_events (actor_id);
create index if not exists admin_audit_events_target_idx
  on public.admin_audit_events (target_profile_id);

-- Abonnements Web Push PWA des admins. Un abonnement = un appareil/navigateur.
-- Les endpoints et clés de chiffrement sont des secrets techniques : un user
-- ne voit que ses propres abonnements ; l'envoi serveur utilise la service_role
-- côté Vercel pour joindre uniquement les admins actifs.
create table if not exists public.push_subscriptions (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  endpoint    text        not null unique,
  p256dh      text        not null,
  auth        text        not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

-- Deduplication durable des notifications de demande d'acces. La route
-- Vercel reserve une notification ici avant d'envoyer le Web Push, pour ne
-- pas dependre d'un cache memoire serverless.
create table if not exists public.access_request_notifications (
  profile_id  uuid primary key references public.profiles(id) on delete cascade,
  notified_at timestamptz not null default now()
);

create index if not exists access_request_notifications_notified_idx
  on public.access_request_notifications (notified_at);

-- ── Trigger : auto-création du profile au signup ────────────
-- Le trigger lit `raw_user_meta_data` (envoyé par signUp({ data: {...} })
-- côté client) et insère la ligne profile correspondante. Sans ça, un
-- nouveau auth.users serait créé sans profile et ne pourrait pas se login
-- (matricule_to_email ne le trouverait pas).
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

-- Helper : admin actif avec MFA valide sur la session courante.
-- Les actions d'administration exigent le claim JWT `aal = aal2`.
create or replace function public.is_admin_mfa()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select public.is_admin() and coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2';
$$;

-- ── RLS sur profiles ────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.admin_audit_events enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.access_request_notifications enable row level security;

-- Data API : ne jamais exposer `profiles` aux anonymes. La clé anon est
-- publique dans le bundle JS ; le login passe uniquement par la fonction
-- ciblée `matricule_to_email(text)`. Les users connectés gardent l'accès
-- requis, filtré ensuite par les policies RLS ci-dessous.
revoke all on table public.profiles from anon;
revoke all on table public.profiles from public;
revoke update, delete on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;

revoke all on table public.admin_audit_events from anon;
revoke all on table public.admin_audit_events from public;
revoke insert on table public.admin_audit_events from authenticated;
grant select on table public.admin_audit_events to authenticated;
revoke all on sequence public.admin_audit_events_id_seq from anon, public, authenticated;

revoke all on table public.push_subscriptions from anon;
revoke all on table public.push_subscriptions from public;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;

revoke all on table public.access_request_notifications from anon;
revoke all on table public.access_request_notifications from authenticated;
revoke all on table public.access_request_notifications from public;
grant select, insert, update, delete on table public.access_request_notifications to service_role;

-- Drop les anciennes policies pour ré-exécution propre
drop policy if exists "self_read" on public.profiles;
drop policy if exists "admin_read_all" on public.profiles;
drop policy if exists "admin_update_all" on public.profiles;
drop policy if exists "admin_delete" on public.profiles;
drop policy if exists "no_direct_insert" on public.profiles;
drop policy if exists "admin_audit_read" on public.admin_audit_events;
drop policy if exists "admin_audit_insert" on public.admin_audit_events;
drop policy if exists "push_self_read" on public.push_subscriptions;
drop policy if exists "push_self_insert_admin_only" on public.push_subscriptions;
drop policy if exists "push_self_update_admin_only" on public.push_subscriptions;
drop policy if exists "push_self_delete" on public.push_subscriptions;

-- Lecture : un user voit son propre profile
create policy "self_read"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- Lecture : les admins voient tous les profiles
create policy "admin_read_all"
  on public.profiles for select
  to authenticated
  using (public.is_admin_mfa());

-- Update : les admins peuvent modifier tous les profiles (approve/ban)
create policy "admin_update_all"
  on public.profiles for update
  to authenticated
  using (public.is_admin_mfa())
  with check (public.is_admin_mfa());

-- Delete : les admins peuvent supprimer un profile (= reject d'une demande)
-- Note : la suppression du profile cascade vers auth.users via la FK,
-- donc l'auth.users est aussi nettoyé.
create policy "admin_delete"
  on public.profiles for delete
  to authenticated
  using (public.is_admin_mfa());

-- Pas d'insert direct depuis le client : l'insertion se fait uniquement
-- via le trigger handle_new_user() qui s'exécute en security definer.

-- Audit admin : seuls les admins actifs peuvent lire/écrire le journal.
-- L'acteur doit être l'utilisateur connecté pour empêcher une usurpation
-- côté client.
create policy "admin_audit_read"
  on public.admin_audit_events for select
  to authenticated
  using (public.is_admin_mfa());

create policy "admin_audit_insert"
  on public.admin_audit_events for insert
  to authenticated
  with check (public.is_admin_mfa() and actor_id = (select auth.uid()));

-- Web Push : seuls les admins actifs peuvent enregistrer / maintenir leur
-- propre appareil. Personne ne liste les endpoints des autres côté client.
create policy "push_self_read"
  on public.push_subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "push_self_insert_admin_only"
  on public.push_subscriptions for insert
  to authenticated
  with check (public.is_admin_mfa() and user_id = (select auth.uid()));

create policy "push_self_update_admin_only"
  on public.push_subscriptions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (public.is_admin_mfa() and user_id = (select auth.uid()));

create policy "push_self_delete"
  on public.push_subscriptions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ── Résolution matricule → email pour le login ──────────────
-- Le client login envoie un matricule, Supabase Auth attend un email :
-- on a besoin d'une résolution accessible AVANT d'être loggé (anon).
--
-- Fonction SECURITY DEFINER paramétrée plutôt que vue + policy anon :
-- l'ancienne approche (vue security_invoker + policy `using (true)`
-- pour anon) ouvrait TOUTE la table profiles aux requêtes anonymes
-- (la clé anon est publique → fuite matricule/email/nom/rôle de tous
-- les users, RGPD). Ici la fonction ne retourne QUE l'email de la
-- ligne dont le matricule est passé en argument : aucun listing /
-- énumération possible, et profiles n'a aucune policy de lecture anon.
--
-- security definer + search_path = '' : lecture de profiles sans être
-- bloquée par la RLS, sans hijacking de schéma (pattern Supabase).
drop view   if exists public.matricule_lookup;
drop policy if exists "matricule_lookup_anon" on public.profiles;

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

-- Exécutable par anon (login avant connexion) + authenticated. On révoque
-- le grant PUBLIC implicite pour ne l'ouvrir qu'aux rôles voulus.
revoke all     on function public.matricule_to_email(text) from public;
grant  execute on function public.matricule_to_email(text) to anon, authenticated;

-- Actions admin atomiques avec audit obligatoire.
-- Le client n'a pas de droit direct UPDATE/DELETE sur profiles ni INSERT sur
-- admin_audit_events. Il appelle ces RPC ; chaque fonction verifie le MFA admin
-- puis modifie le profil et ecrit l'audit dans la meme transaction.
create or replace function public.admin_approve_profile(p_target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_target public.profiles%rowtype;
begin
  if v_actor is null or not public.is_admin_mfa() then
    raise exception 'admin_mfa_required' using errcode = '42501';
  end if;

  select * into v_target
  from public.profiles
  where id = p_target_profile_id
  for update;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  update public.profiles
  set status = 'active',
      approved_at = now(),
      approved_by = v_actor
  where id = p_target_profile_id;

  insert into public.admin_audit_events (
    actor_id, target_profile_id, target_matricule, target_email,
    target_prenom, target_nom, action, reason
  )
  values (
    v_actor, v_target.id, v_target.matricule, v_target.email,
    v_target.prenom, v_target.nom, 'approve', null
  );
end;
$$;

create or replace function public.admin_reject_profile(p_target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_target public.profiles%rowtype;
begin
  if v_actor is null or not public.is_admin_mfa() then
    raise exception 'admin_mfa_required' using errcode = '42501';
  end if;

  select * into v_target
  from public.profiles
  where id = p_target_profile_id
  for update;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  insert into public.admin_audit_events (
    actor_id, target_profile_id, target_matricule, target_email,
    target_prenom, target_nom, action, reason
  )
  values (
    v_actor, v_target.id, v_target.matricule, v_target.email,
    v_target.prenom, v_target.nom, 'reject', null
  );

  delete from public.profiles where id = p_target_profile_id;
end;
$$;

create or replace function public.admin_ban_profile(p_target_profile_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_target public.profiles%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_actor is null or not public.is_admin_mfa() then
    raise exception 'admin_mfa_required' using errcode = '42501';
  end if;

  select * into v_target
  from public.profiles
  where id = p_target_profile_id
  for update;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  update public.profiles
  set status = 'banned',
      banned_at = now(),
      ban_reason = v_reason
  where id = p_target_profile_id;

  insert into public.admin_audit_events (
    actor_id, target_profile_id, target_matricule, target_email,
    target_prenom, target_nom, action, reason
  )
  values (
    v_actor, v_target.id, v_target.matricule, v_target.email,
    v_target.prenom, v_target.nom, 'ban', v_reason
  );
end;
$$;

create or replace function public.admin_unban_profile(p_target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_target public.profiles%rowtype;
begin
  if v_actor is null or not public.is_admin_mfa() then
    raise exception 'admin_mfa_required' using errcode = '42501';
  end if;

  select * into v_target
  from public.profiles
  where id = p_target_profile_id
  for update;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  update public.profiles
  set status = 'active',
      banned_at = null,
      ban_reason = null
  where id = p_target_profile_id;

  insert into public.admin_audit_events (
    actor_id, target_profile_id, target_matricule, target_email,
    target_prenom, target_nom, action, reason
  )
  values (
    v_actor, v_target.id, v_target.matricule, v_target.email,
    v_target.prenom, v_target.nom, 'unban', null
  );
end;
$$;

revoke all on function public.admin_approve_profile(uuid) from public;
revoke all on function public.admin_reject_profile(uuid) from public;
revoke all on function public.admin_ban_profile(uuid, text) from public;
revoke all on function public.admin_unban_profile(uuid) from public;
grant execute on function public.admin_approve_profile(uuid) to authenticated;
grant execute on function public.admin_reject_profile(uuid) to authenticated;
grant execute on function public.admin_ban_profile(uuid, text) to authenticated;
grant execute on function public.admin_unban_profile(uuid) to authenticated;

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
