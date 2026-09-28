-- Apply atomically with the verified frontend's public release, NOT before it.
-- Existing rooms, joins and auctions are unaffected; old clients cannot create new rooms.
begin;
revoke execute on function public.liveasta_create_room(text,text,text,jsonb,uuid,text) from public,anon,authenticated;
revoke execute on function liveasta_premium_private.create_room(text,text,text,jsonb,uuid,text) from public,anon,authenticated;
revoke insert on public.fanta_rooms from public,anon,authenticated;
commit;
