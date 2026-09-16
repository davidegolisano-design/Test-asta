-- LIVEASTA Admin MVP
-- Applicare esclusivamente su un ambiente Supabase DEV prima della produzione.

begin;

alter table public.fanta_rooms
  add column if not exists approval_status text,
  add column if not exists approval_reviewed_at timestamptz,
  add column if not exists approval_reviewed_by uuid references auth.users(id) on delete set null;

update public.fanta_rooms
set approval_status = case when approved then 'approved' else 'pending' end
where approval_status is null;

alter table public.fanta_rooms
  alter column approval_status set default 'pending',
  alter column approval_status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'fanta_rooms_approval_status_check'
      and conrelid = 'public.fanta_rooms'::regclass
  ) then
    alter table public.fanta_rooms
      add constraint fanta_rooms_approval_status_check
      check (approval_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists fanta_rooms_approval_pending_idx
  on public.fanta_rooms (approval_status, created_at desc);

-- Protegge i campi di moderazione dagli update diretti del normale client.
-- Le funzioni SECURITY DEFINER esistenti e la service role dell'Edge Function
-- restano autorizzate.
create or replace function private.liveasta_guard_room_approval_fields()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.approved := false;
      new.approval_status := 'pending';
      new.approval_reviewed_at := null;
      new.approval_reviewed_by := null;
    elsif tg_op = 'UPDATE' then
      if new.approved is distinct from old.approved
         or new.approval_status is distinct from old.approval_status
         or new.approval_reviewed_at is distinct from old.approval_reviewed_at
         or new.approval_reviewed_by is distinct from old.approval_reviewed_by then
        raise exception 'approval fields cannot be changed directly';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_liveasta_guard_room_approval_fields on public.fanta_rooms;
create trigger trg_liveasta_guard_room_approval_fields
before insert or update on public.fanta_rooms
for each row execute function private.liveasta_guard_room_approval_fields();

-- Realtime Admin separato: la PWA non si sottoscrive direttamente a fanta_rooms,
-- così non riceve password o altri campi stanza non necessari.
create table if not exists public.liveasta_admin_room_events (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.fanta_rooms(id) on delete cascade,
  event_type text not null check (event_type in ('created', 'status_changed')),
  created_at timestamptz not null default now()
);

alter table public.liveasta_admin_room_events enable row level security;

revoke all on table public.liveasta_admin_room_events from anon, authenticated;
grant select on table public.liveasta_admin_room_events to authenticated;

drop policy if exists liveasta_admin_room_events_select on public.liveasta_admin_room_events;
create policy liveasta_admin_room_events_select
on public.liveasta_admin_room_events
for select
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'liveasta_admin');

create or replace function private.liveasta_emit_admin_room_event()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.liveasta_admin_room_events(room_id, event_type)
    values (new.id, 'created');
  elsif tg_op = 'UPDATE' and new.approval_status is distinct from old.approval_status then
    insert into public.liveasta_admin_room_events(room_id, event_type)
    values (new.id, 'status_changed');
  end if;
  return new;
end;
$$;

revoke execute on function private.liveasta_emit_admin_room_event() from public, anon, authenticated;

drop trigger if exists trg_liveasta_emit_admin_room_event on public.fanta_rooms;
create trigger trg_liveasta_emit_admin_room_event
after insert or update of approval_status on public.fanta_rooms
for each row execute function private.liveasta_emit_admin_room_event();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'liveasta_admin_room_events'
     ) then
    alter publication supabase_realtime add table public.liveasta_admin_room_events;
  end if;
end $$;

-- Mantiene compatibile il Superuser storico: APPROVA continua a funzionare;
-- una eventuale revoca legacy torna a PENDING, non a REJECTED.
create or replace function public.liveasta_set_room_approval(
  p_room_id uuid,
  p_approved boolean,
  p_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, private, extensions
as $$
begin
  if not public.liveasta_verify_superuser(p_password) then
    return false;
  end if;

  update public.fanta_rooms
  set approved = coalesce(p_approved, false),
      approval_status = case when coalesce(p_approved, false) then 'approved' else 'pending' end,
      approval_reviewed_at = case when coalesce(p_approved, false) then now() else null end,
      approval_reviewed_by = null,
      updated_at = now()
  where id = p_room_id;

  return found;
end;
$$;

commit;
