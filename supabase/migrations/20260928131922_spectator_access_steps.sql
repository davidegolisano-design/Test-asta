-- Aggregate all approved live rooms without disclosing private room names.
create or replace function public.liveasta_spectator_online_counts()
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'classic',count(*) filter(where r.game_mode='classic'),
    'mantra',count(*) filter(where r.game_mode='mantra'))
  from public.fanta_rooms r
  join public.fanta_app_data l on l.key='liveasta_auctioneer_lock_'||r.id::text
  where r.approved=true
    and l.updated_at>now()-interval '45 seconds'
    and l.updated_at<=now()+interval '10 seconds';
$$;

-- Resolve only an exact supplied room name. No private ID or password is returned.
create or replace function public.liveasta_spectator_resolve(p_name text)
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object('is_public',r.spectator_public,
    'room_id',case when r.spectator_public then r.id else null end)
  from public.fanta_rooms r
  where r.approved=true and length(trim(p_name))>0
    and lower(r.name)=lower(trim(p_name))
  limit 1;
$$;
revoke all on function public.liveasta_spectator_online_counts() from public;
revoke all on function public.liveasta_spectator_resolve(text) from public;
grant execute on function public.liveasta_spectator_online_counts() to anon;
grant execute on function public.liveasta_spectator_resolve(text) to anon;
notify pgrst,'reload schema';
