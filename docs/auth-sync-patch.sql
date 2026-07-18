-- ════════════════════════════════════════════════════════════════
-- MediURG — Relais éphémère multi-appareils
--
-- À exécuter dans le SQL Editor Supabase après docs/auth-schema.sql.
-- Les payloads restent anonymes et éphémères : dossiers ACR scrubés côté
-- client, check-lists de kits sans identité patient.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.sync_items (
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('acr-session', 'kit-check')),
  item_id    text not null,
  payload    jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, item_id)
);

create index if not exists sync_items_user_kind_updated_idx
  on public.sync_items (user_id, kind, updated_at desc);

alter table public.sync_items enable row level security;

revoke all on table public.sync_items from anon;
revoke all on table public.sync_items from public;
grant select, insert, update, delete on table public.sync_items to authenticated;

drop policy if exists "sync_items_self_read" on public.sync_items;
drop policy if exists "sync_items_self_insert" on public.sync_items;
drop policy if exists "sync_items_self_update" on public.sync_items;
drop policy if exists "sync_items_self_delete" on public.sync_items;

create policy "sync_items_self_read"
  on public.sync_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "sync_items_self_insert"
  on public.sync_items for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "sync_items_self_update"
  on public.sync_items for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "sync_items_self_delete"
  on public.sync_items for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Canal Realtime privé ACR : un utilisateur ne peut lire et émettre que sur
-- `acr-live-{son UUID}`. Les messages Broadcast servent uniquement au relais
-- éphémère ; Supabase teste ces policies à la connexion sans stocker le dossier.
drop policy if exists "acr_live_self_receive" on realtime.messages;
drop policy if exists "acr_live_self_send" on realtime.messages;

create policy "acr_live_self_receive"
  on realtime.messages for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'acr-live-' || (select auth.uid())::text
  );

create policy "acr_live_self_send"
  on realtime.messages for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'acr-live-' || (select auth.uid())::text
  );

create or replace function public.purge_expired_sync_items(p_user_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.sync_items
  where user_id = p_user_id
    and (
      (kind = 'acr-session' and updated_at < now() - interval '48 hours')
      or
      (kind = 'kit-check' and updated_at < now() - interval '3 hours')
    );
$$;

create or replace function public.upsert_sync_item(
  p_kind text,
  p_item_id text,
  p_payload jsonb,
  p_updated_at timestamptz default now()
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;

  if p_kind not in ('acr-session', 'kit-check') then
    raise exception 'invalid_sync_kind' using errcode = '22023';
  end if;

  perform public.purge_expired_sync_items(v_user_id);

  insert into public.sync_items (user_id, kind, item_id, payload, updated_at)
  values (v_user_id, p_kind, p_item_id, p_payload, coalesce(p_updated_at, now()))
  on conflict (user_id, kind, item_id)
  do update
    set payload = excluded.payload,
        updated_at = excluded.updated_at
  where public.sync_items.updated_at <= excluded.updated_at;
end;
$$;

create or replace function public.list_sync_items(p_kind text)
returns table (
  item_id text,
  payload jsonb,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;

  if p_kind not in ('acr-session', 'kit-check') then
    raise exception 'invalid_sync_kind' using errcode = '22023';
  end if;

  perform public.purge_expired_sync_items(v_user_id);

  return query
    select s.item_id, s.payload, s.updated_at
    from public.sync_items s
    where s.user_id = v_user_id
      and s.kind = p_kind
    order by s.updated_at desc;
end;
$$;

revoke all on function public.purge_expired_sync_items(uuid) from public;
revoke all on function public.upsert_sync_item(text, text, jsonb, timestamptz) from public;
revoke all on function public.list_sync_items(text) from public;
grant execute on function public.purge_expired_sync_items(uuid) to authenticated;
grant execute on function public.upsert_sync_item(text, text, jsonb, timestamptz) to authenticated;
grant execute on function public.list_sync_items(text) to authenticated;
