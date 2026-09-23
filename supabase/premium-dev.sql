-- Additive setup: Premium entitlements, isolated by environment.
-- The public app does not read this table. No existing room/state is changed.
create schema if not exists liveasta_premium_private;
revoke all on schema liveasta_premium_private from public;
grant usage on schema liveasta_premium_private to anon, authenticated;

create table public.liveasta_premium_entitlements (
  room_id uuid not null references public.fanta_rooms(id) on delete cascade,
  environment text not null check (environment in ('dev-premium', 'production')),
  features text[] not null default '{}'
    check (features <@ array['sealed','random','turns','ready','budget','chat','miniatures']::text[]),
  source text not null default 'manual' check (source in ('manual','payment')),
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  primary key (room_id, environment)
);
alter table public.liveasta_premium_entitlements enable row level security;
revoke all on public.liveasta_premium_entitlements from public, anon, authenticated;
grant select on public.liveasta_premium_entitlements to anon, authenticated;
create policy premium_read on public.liveasta_premium_entitlements
  for select to anon, authenticated using (true);

-- LIVEASTA currently authenticates administrators by server-verified password,
-- not Supabase Auth. Never trust a browser flag, room approval or user_metadata.
-- This is the sole client-accessible writer; payment webhooks will use a trusted
-- server identity to update the same entitlements, with source = 'payment'.
create function liveasta_premium_private.set_feature(
  p_room_id uuid, p_environment text, p_feature text, p_enabled boolean, p_password text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_features text[];
  v_row public.liveasta_premium_entitlements;
begin
  if not coalesce(public.liveasta_verify_superuser(p_password), false) then
    raise exception 'Autorizzazione superuser non valida' using errcode = '42501';
  end if;
  if p_environment is null or p_environment not in ('dev-premium','production')
     or p_feature is null or p_feature not in ('all','sealed','random','turns','ready','budget','chat','miniatures')
     or p_enabled is null then
    raise exception 'Abilitazione non valida' using errcode = '22023';
  end if;
  insert into public.liveasta_premium_entitlements(room_id, environment)
    values (p_room_id, p_environment) on conflict do nothing;
  select features into v_features from public.liveasta_premium_entitlements
    where room_id=p_room_id and environment=p_environment for update;
  if p_feature='all' then
    v_features := case when p_enabled then array['sealed','random','turns','ready','budget','chat','miniatures']::text[] else '{}'::text[] end;
  elsif p_enabled then
    if not (p_feature = any(v_features)) then v_features := array_append(v_features,p_feature); end if;
  else
    v_features := array_remove(v_features,p_feature);
  end if;
  update public.liveasta_premium_entitlements
    set features=v_features, source='manual', revision=revision+1, updated_at=now()
    where room_id=p_room_id and environment=p_environment returning * into v_row;
  return to_jsonb(v_row);
end $$;
revoke all on function liveasta_premium_private.set_feature(uuid,text,text,boolean,text) from public;
grant execute on function liveasta_premium_private.set_feature(uuid,text,text,boolean,text) to anon, authenticated;

create function public.liveasta_set_premium_feature(
  p_room_id uuid, p_environment text, p_feature text, p_enabled boolean, p_password text
) returns jsonb language sql security invoker set search_path = '' as $$
  select liveasta_premium_private.set_feature(p_room_id,p_environment,p_feature,p_enabled,p_password);
$$;
revoke all on function public.liveasta_set_premium_feature(uuid,text,text,boolean,text) from public;
grant execute on function public.liveasta_set_premium_feature(uuid,text,text,boolean,text) to anon, authenticated;

alter publication supabase_realtime add table public.liveasta_premium_entitlements;
