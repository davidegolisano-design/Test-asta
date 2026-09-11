-- LIVEASTA v0.74 - schema Supabase per Test-asta
-- Esegui questo file nel SQL Editor del nuovo progetto.
-- Poi esegui 02_set_superuser_password.sql.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create table if not exists public.fanta_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  password text not null default '',
  initial_credits integer not null default 500 check (initial_credits > 0),
  limit_p integer not null default 3 check (limit_p >= 0),
  limit_d integer not null default 8 check (limit_d >= 0),
  limit_c integer not null default 8 check (limit_c >= 0),
  limit_a integer not null default 6 check (limit_a >= 0),
  timer_seconds integer not null default 5 check (timer_seconds > 0),
  prep_seconds integer not null default 5 check (prep_seconds > 0),
  sealed_timer_seconds integer not null default 30 check (sealed_timer_seconds > 0),
  sealed_reveal_seconds integer not null default 5 check (sealed_reveal_seconds > 0),
  auctioned_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved boolean not null default false,
  game_mode text not null default 'classic' check (game_mode in ('classic','mantra')),
  mantra_min_roster integer not null default 23 check (mantra_min_roster between 23 and 90),
  mantra_max_roster integer not null default 30 check (mantra_max_roster between 23 and 90),
  mantra_min_goalkeepers integer not null default 2 check (mantra_min_goalkeepers between 2 and 15),
  constraint fanta_rooms_mantra_range_check check (mantra_max_roster >= mantra_min_roster),
  constraint fanta_rooms_mantra_goalkeeper_roster_check check (mantra_min_goalkeepers <= mantra_min_roster)
);

create table if not exists public.fanta_teams (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.fanta_rooms(id) on delete cascade,
  name text not null,
  credits_remaining integer not null default 500 check (credits_remaining >= 0),
  created_at timestamptz not null default now(),
  unique(room_id,name)
);

create table if not exists public.fanta_purchases (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.fanta_rooms(id) on delete cascade,
  team_id uuid not null references public.fanta_teams(id) on delete cascade,
  player_id text not null,
  player_name text not null default '',
  role text not null default '',
  club text not null default '',
  price integer not null check (price > 0),
  created_at timestamptz not null default now(),
  unique(room_id,player_id)
);

create table if not exists public.fanta_app_data (
  key text primary key,
  data jsonb,
  file_name text,
  updated_at timestamptz not null default now()
);

create table if not exists private.liveasta_secrets (
  key text primary key,
  secret_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists private.liveasta_team_pins (
  team_id uuid primary key references public.fanta_teams(id) on delete cascade,
  pin_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.fanta_rooms enable row level security;
alter table public.fanta_teams enable row level security;
alter table public.fanta_purchases enable row level security;
alter table public.fanta_app_data enable row level security;

drop policy if exists liveasta_rooms_all on public.fanta_rooms;
create policy liveasta_rooms_all on public.fanta_rooms for all to anon using (true) with check (true);
drop policy if exists liveasta_teams_all on public.fanta_teams;
create policy liveasta_teams_all on public.fanta_teams for all to anon using (true) with check (true);
drop policy if exists liveasta_purchases_all on public.fanta_purchases;
create policy liveasta_purchases_all on public.fanta_purchases for all to anon using (true) with check (true);
drop policy if exists liveasta_app_data_all on public.fanta_app_data;
create policy liveasta_app_data_all on public.fanta_app_data for all to anon using (true) with check (true);

create or replace function public.fanta_assign_player(
  p_room_id uuid, p_team_id uuid, p_player_id text, p_player_name text,
  p_role text, p_club text, p_price integer
) returns void language plpgsql security definer set search_path to public as $$
declare v_credits integer;
begin
  if p_price is null or p_price <= 0 then raise exception 'Prezzo non valido'; end if;
  select credits_remaining into v_credits
  from public.fanta_teams
  where id=p_team_id and room_id=p_room_id
  for update;
  if v_credits is null then raise exception 'Squadra non trovata'; end if;
  if v_credits < p_price then raise exception 'Crediti insufficienti'; end if;
  if exists(select 1 from public.fanta_purchases where room_id=p_room_id and player_id=p_player_id)
    then raise exception 'Giocatore già assegnato'; end if;
  insert into public.fanta_purchases(room_id,team_id,player_id,player_name,role,club,price)
  values(p_room_id,p_team_id,p_player_id,coalesce(p_player_name,''),coalesce(p_role,''),coalesce(p_club,''),p_price);
  update public.fanta_teams set credits_remaining=credits_remaining-p_price where id=p_team_id;
end $$;

create or replace function public.fanta_remove_purchase(p_purchase_id uuid)
returns void language plpgsql security definer set search_path to public as $$
declare v_team uuid; v_price integer;
begin
  select team_id,price into v_team,v_price from public.fanta_purchases where id=p_purchase_id for update;
  if v_team is null then return; end if;
  delete from public.fanta_purchases where id=p_purchase_id;
  update public.fanta_teams set credits_remaining=credits_remaining+v_price where id=v_team;
end $$;

create or replace function public.liveasta_verify_superuser(p_password text)
returns boolean language sql security definer set search_path to public,private,extensions as $$
  select coalesce(exists(
    select 1 from private.liveasta_secrets s
    where s.key='superuser_password' and crypt(p_password,s.secret_hash)=s.secret_hash
  ),false);
$$;

create or replace function public.liveasta_team_pin_status(p_team_id uuid,p_room_id uuid)
returns boolean language sql security definer set search_path to public,private,extensions as $$
  select coalesce(exists(
    select 1 from public.fanta_teams t
    join private.liveasta_team_pins p on p.team_id=t.id
    where t.id=p_team_id and t.room_id=p_room_id
  ),false);
$$;

create or replace function public.liveasta_room_team_pin_status(p_room_id uuid)
returns table(team_id uuid,pin_set boolean)
language sql security definer set search_path to public,private,extensions as $$
  select t.id,(p.team_id is not null)
  from public.fanta_teams t
  left join private.liveasta_team_pins p on p.team_id=t.id
  where t.room_id=p_room_id
  order by t.created_at;
$$;

create or replace function public.liveasta_set_initial_team_pin(
  p_team_id uuid,p_room_id uuid,p_room_password text,p_pin text
) returns boolean language plpgsql security definer set search_path to public,private,extensions as $$
declare v_room_password text;
begin
  if p_pin is null or p_pin !~ '^[0-9]{6}$' then raise exception 'Il PIN deve contenere esattamente 6 numeri'; end if;
  select r.password into v_room_password
  from public.fanta_teams t join public.fanta_rooms r on r.id=t.room_id
  where t.id=p_team_id and t.room_id=p_room_id
  for update of t;
  if v_room_password is null then raise exception 'Squadra non trovata'; end if;
  if v_room_password <> coalesce(p_room_password,'') then raise exception 'Password stanza errata'; end if;
  if exists(select 1 from private.liveasta_team_pins p where p.team_id=p_team_id)
    then raise exception 'PIN già impostato'; end if;
  insert into private.liveasta_team_pins(team_id,pin_hash,updated_at)
  values(p_team_id,crypt(p_pin,gen_salt('bf',10)),now());
  return true;
end $$;

create or replace function public.liveasta_verify_team_pin(
  p_team_id uuid,p_room_id uuid,p_room_password text,p_pin text
) returns boolean language sql security definer set search_path to public,private,extensions as $$
  select coalesce(exists(
    select 1
    from public.fanta_teams t
    join public.fanta_rooms r on r.id=t.room_id
    join private.liveasta_team_pins p on p.team_id=t.id
    where t.id=p_team_id
      and t.room_id=p_room_id
      and r.password=coalesce(p_room_password,'')
      and p.pin_hash=crypt(coalesce(p_pin,''),p.pin_hash)
  ),false);
$$;

create or replace function public.liveasta_reset_team_pin(p_team_id uuid,p_password text)
returns boolean language plpgsql security definer set search_path to public,private,extensions as $$
begin
  if not public.liveasta_verify_superuser(p_password) then raise exception 'Autorizzazione superuser non valida'; end if;
  delete from private.liveasta_team_pins where team_id=p_team_id;
  return true;
end $$;

create or replace function public.liveasta_admin_team_pin_overview(p_room_id uuid,p_password text)
returns table(team_id uuid,team_name text,pin_set boolean)
language plpgsql security definer set search_path to public,private,extensions as $$
begin
  if not public.liveasta_verify_superuser(p_password) then raise exception 'Autorizzazione superuser non valida'; end if;
  return query
  select t.id,t.name,(p.team_id is not null)
  from public.fanta_teams t
  left join private.liveasta_team_pins p on p.team_id=t.id
  where t.room_id=p_room_id
  order by t.created_at;
end $$;

create or replace function public.liveasta_set_room_approval(
  p_room_id uuid,p_approved boolean,p_password text
) returns boolean language plpgsql security definer set search_path to public,private,extensions as $$
begin
  if not public.liveasta_verify_superuser(p_password) then return false; end if;
  update public.fanta_rooms
  set approved=coalesce(p_approved,false),updated_at=now()
  where id=p_room_id;
  return found;
end $$;

grant usage on schema public to anon;
grant select,insert,update,delete on public.fanta_rooms,public.fanta_teams,public.fanta_purchases,public.fanta_app_data to anon;

grant execute on function public.fanta_assign_player(uuid,uuid,text,text,text,text,integer) to anon;
grant execute on function public.fanta_remove_purchase(uuid) to anon;
grant execute on function public.liveasta_verify_superuser(text) to anon;
grant execute on function public.liveasta_team_pin_status(uuid,uuid) to anon;
grant execute on function public.liveasta_room_team_pin_status(uuid) to anon;
grant execute on function public.liveasta_set_initial_team_pin(uuid,uuid,text,text) to anon;
grant execute on function public.liveasta_verify_team_pin(uuid,uuid,text,text) to anon;
grant execute on function public.liveasta_reset_team_pin(uuid,text) to anon;
grant execute on function public.liveasta_admin_team_pin_overview(uuid,text) to anon;
grant execute on function public.liveasta_set_room_approval(uuid,boolean,text) to anon;
