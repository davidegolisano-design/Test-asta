-- Spectator visibility is independent of player/auctioneer access and room-list settings.
alter table public.fanta_rooms add column if not exists spectator_public boolean not null default false;

create or replace function public.liveasta_spectator_directory()
returns table(id uuid,name text,game_mode text,online boolean)
language sql stable security invoker set search_path = ''
as $$
  select r.id,r.name,r.game_mode,
    coalesce(l.updated_at > now()-interval '45 seconds' and l.updated_at <= now()+interval '10 seconds',false)
  from public.fanta_rooms r
  left join public.fanta_app_data l on l.key='liveasta_auctioneer_lock_'||r.id::text
  where r.approved=true and r.spectator_public=true
  order by r.name;
$$;

create or replace function public.liveasta_spectator_enter(
  p_room_id uuid default null,p_name text default '',p_password text default '',p_public boolean default false)
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select to_jsonb(r)-'password'-'admin_notified_at'
  from public.fanta_rooms r
  where r.approved=true and (
    (p_public=true and r.spectator_public=true and r.id=p_room_id)
    or
    (p_public=false and lower(r.name)=lower(trim(p_name))
      and length(p_password)>0 and r.password=p_password)
  ) limit 1;
$$;

revoke all on function public.liveasta_spectator_directory() from public;
revoke all on function public.liveasta_spectator_enter(uuid,text,text,boolean) from public;
grant execute on function public.liveasta_spectator_directory() to anon;
grant execute on function public.liveasta_spectator_enter(uuid,text,text,boolean) to anon;
notify pgrst,'reload schema';
