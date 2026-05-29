-- Patch ciblé : MFA admin + RLS admin `aal2`
--
-- À utiliser si le schéma principal existe déjà.
-- Exécuter ce bloc dans le SQL Editor Supabase après le déploiement du code
-- qui ajoute la vérification MFA avant la console admin.

create or replace function public.is_admin_mfa()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select public.is_admin()
    and coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2';
$$;

revoke all on function public.is_admin_mfa() from public;
grant execute on function public.is_admin_mfa() to authenticated;

drop policy if exists "admin_read_all" on public.profiles;
drop policy if exists "admin_update_all" on public.profiles;
drop policy if exists "admin_delete" on public.profiles;
drop policy if exists "admin_audit_read" on public.admin_audit_events;
drop policy if exists "admin_audit_insert" on public.admin_audit_events;
drop policy if exists "push_self_insert_admin_only" on public.push_subscriptions;
drop policy if exists "push_self_update_admin_only" on public.push_subscriptions;

create policy "admin_read_all"
  on public.profiles for select
  to authenticated
  using (public.is_admin_mfa());

create policy "admin_update_all"
  on public.profiles for update
  to authenticated
  using (public.is_admin_mfa())
  with check (public.is_admin_mfa());

create policy "admin_delete"
  on public.profiles for delete
  to authenticated
  using (public.is_admin_mfa());

create policy "admin_audit_read"
  on public.admin_audit_events for select
  to authenticated
  using (public.is_admin_mfa());

create policy "admin_audit_insert"
  on public.admin_audit_events for insert
  to authenticated
  with check (public.is_admin_mfa() and actor_id = (select auth.uid()));

create policy "push_self_insert_admin_only"
  on public.push_subscriptions for insert
  to authenticated
  with check (public.is_admin_mfa() and user_id = (select auth.uid()));

create policy "push_self_update_admin_only"
  on public.push_subscriptions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (public.is_admin_mfa() and user_id = (select auth.uid()));

-- Vérification rapide attendue : les policies admin sensibles référencent
-- `is_admin_mfa()`.
select tablename, policyname, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'admin_audit_events', 'push_subscriptions')
order by tablename, policyname;
