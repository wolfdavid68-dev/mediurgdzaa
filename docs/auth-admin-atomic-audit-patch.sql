-- Patch cible : audit admin atomique + deduplication durable Web Push.
--
-- A executer dans le SQL Editor Supabase si `auth-schema.sql` existe deja.
-- Objectifs :
-- - retirer les mutations directes `profiles` depuis le client ;
-- - forcer approve/reject/ban/unban via RPC avec audit dans la meme transaction ;
-- - stocker la deduplication des notifications de demande d'acces en base.

create table if not exists public.access_request_notifications (
  profile_id  uuid primary key references public.profiles(id) on delete cascade,
  notified_at timestamptz not null default now()
);

create index if not exists access_request_notifications_notified_idx
  on public.access_request_notifications (notified_at);

alter table public.access_request_notifications enable row level security;

revoke all on table public.access_request_notifications from anon;
revoke all on table public.access_request_notifications from authenticated;
revoke all on table public.access_request_notifications from public;
grant select, insert, update, delete on table public.access_request_notifications to service_role;

-- Le client lit les profils via RLS, mais les mutations admin passent par RPC.
revoke update, delete on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;

-- Le journal devient ecrit par les RPC, pas par le client.
revoke insert on table public.admin_audit_events from authenticated;
grant select on table public.admin_audit_events to authenticated;
revoke all on sequence public.admin_audit_events_id_seq from anon, public, authenticated;

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

-- Verification rapide.
select routine_name, security_type
from information_schema.routines
where specific_schema = 'public'
  and routine_name in (
    'admin_approve_profile',
    'admin_reject_profile',
    'admin_ban_profile',
    'admin_unban_profile'
  )
order by routine_name;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('profiles', 'admin_audit_events', 'access_request_notifications')
order by table_name, grantee, privilege_type;
