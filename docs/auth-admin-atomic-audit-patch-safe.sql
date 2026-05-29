-- Patch cible SAFE COPY-PASTE : audit admin atomique + deduplication durable Web Push.
--
-- Cette variante utilise des tags dollar-quotes nommes pour eviter les
-- collisions avec les blocs anonymes ou les collages partiels.

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

revoke update, delete on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;

revoke insert on table public.admin_audit_events from authenticated;
grant select on table public.admin_audit_events to authenticated;
revoke all on sequence public.admin_audit_events_id_seq from anon, public, authenticated;

create or replace function public.admin_approve_profile(p_target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $admin_rpc$
begin
  if (select auth.uid()) is null or not public.is_admin_mfa() then
    raise exception 'admin_mfa_required' using errcode = '42501';
  end if;

  with updated as (
    update public.profiles
    set status = 'active',
        approved_at = now(),
        approved_by = (select auth.uid())
    where id = p_target_profile_id
    returning id, matricule, email, prenom, nom
  )
  insert into public.admin_audit_events (
    actor_id, target_profile_id, target_matricule, target_email,
    target_prenom, target_nom, action, reason
  )
  select
    (select auth.uid()), id, matricule, email,
    prenom, nom, 'approve', null
  from updated;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
end;
$admin_rpc$;

create or replace function public.admin_reject_profile(p_target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $admin_rpc$
begin
  if (select auth.uid()) is null or not public.is_admin_mfa() then
    raise exception 'admin_mfa_required' using errcode = '42501';
  end if;

  with deleted as (
    delete from public.profiles
    where id = p_target_profile_id
    returning id, matricule, email, prenom, nom
  )
  insert into public.admin_audit_events (
    actor_id, target_profile_id, target_matricule, target_email,
    target_prenom, target_nom, action, reason
  )
  select
    (select auth.uid()), id, matricule, email,
    prenom, nom, 'reject', null
  from deleted;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
end;
$admin_rpc$;

create or replace function public.admin_ban_profile(p_target_profile_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $admin_rpc$
begin
  if (select auth.uid()) is null or not public.is_admin_mfa() then
    raise exception 'admin_mfa_required' using errcode = '42501';
  end if;

  with updated as (
    update public.profiles
    set status = 'banned',
        banned_at = now(),
        ban_reason = nullif(btrim(coalesce(p_reason, '')), '')
    where id = p_target_profile_id
    returning id, matricule, email, prenom, nom
  )
  insert into public.admin_audit_events (
    actor_id, target_profile_id, target_matricule, target_email,
    target_prenom, target_nom, action, reason
  )
  select
    (select auth.uid()), id, matricule, email,
    prenom, nom, 'ban', nullif(btrim(coalesce(p_reason, '')), '')
  from updated;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
end;
$admin_rpc$;

create or replace function public.admin_unban_profile(p_target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $admin_rpc$
begin
  if (select auth.uid()) is null or not public.is_admin_mfa() then
    raise exception 'admin_mfa_required' using errcode = '42501';
  end if;

  with updated as (
    update public.profiles
    set status = 'active',
        banned_at = null,
        ban_reason = null
    where id = p_target_profile_id
    returning id, matricule, email, prenom, nom
  )
  insert into public.admin_audit_events (
    actor_id, target_profile_id, target_matricule, target_email,
    target_prenom, target_nom, action, reason
  )
  select
    (select auth.uid()), id, matricule, email,
    prenom, nom, 'unban', null
  from updated;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
end;
$admin_rpc$;

revoke all on function public.admin_approve_profile(uuid) from public;
revoke all on function public.admin_reject_profile(uuid) from public;
revoke all on function public.admin_ban_profile(uuid, text) from public;
revoke all on function public.admin_unban_profile(uuid) from public;
grant execute on function public.admin_approve_profile(uuid) to authenticated;
grant execute on function public.admin_reject_profile(uuid) to authenticated;
grant execute on function public.admin_ban_profile(uuid, text) to authenticated;
grant execute on function public.admin_unban_profile(uuid) to authenticated;

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
