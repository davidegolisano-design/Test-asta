-- LIVEASTA v1.07.7: new-room defaults and Premium roster transfer.
alter table public.fanta_rooms
  alter column timer_seconds set default 8,
  alter column prep_seconds set default 3,
  alter column sealed_timer_seconds set default 40,
  alter column sealed_reveal_seconds set default 3;

alter table public.liveasta_premium_entitlements
  drop constraint liveasta_premium_entitlements_features_check,
  add constraint liveasta_premium_entitlements_features_check
    check (features <@ array['sealed','random','turns','ready','budget','chat','miniatures','roster_io']::text[]);

CREATE OR REPLACE FUNCTION liveasta_premium_private.set_feature(p_room_id uuid, p_environment text, p_feature text, p_enabled boolean, p_password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_features text[];
  v_row public.liveasta_premium_entitlements;
begin
  if not coalesce(public.liveasta_verify_superuser(p_password), false) then
    raise exception 'Autorizzazione superuser non valida' using errcode = '42501';
  end if;
  if p_environment is null or p_environment not in ('dev-premium','production')
     or p_feature is null or p_feature not in ('all','sealed','random','turns','ready','budget','chat','miniatures','roster_io')
     or p_enabled is null then
    raise exception 'Abilitazione non valida' using errcode = '22023';
  end if;
  insert into public.liveasta_premium_entitlements(room_id, environment)
    values (p_room_id, p_environment) on conflict do nothing;
  select features into v_features from public.liveasta_premium_entitlements
    where room_id=p_room_id and environment=p_environment for update;
  if p_feature='all' then
    v_features := case when p_enabled then array['sealed','random','turns','ready','budget','chat','miniatures','roster_io']::text[] else '{}'::text[] end;
  elsif p_enabled then
    if not (p_feature = any(v_features)) then v_features := array_append(v_features,p_feature); end if;
  else
    v_features := array_remove(v_features,p_feature);
  end if;
  update public.liveasta_premium_entitlements
    set features=v_features, source='manual', revision=revision+1, updated_at=now()
    where room_id=p_room_id and environment=p_environment returning * into v_row;
  return to_jsonb(v_row);
end $function$

CREATE OR REPLACE FUNCTION liveasta_premium_private.request_premium(p_room_id uuid, p_environment text, p_room_password text, p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_room public.fanta_rooms; v_ent public.liveasta_premium_entitlements; v_email text; v_job uuid;
begin
  if p_environment is null or p_environment not in ('dev-premium','production') then
    raise exception 'Ambiente non valido' using errcode='22023';
  end if;
  select * into v_room from public.fanta_rooms where id=p_room_id and password=p_room_password and approved=true for share;
  if not found then raise exception 'Accesso stanza non valido' using errcode='42501'; end if;
  insert into public.liveasta_premium_entitlements(room_id,environment)
    values(p_room_id,p_environment) on conflict do nothing;
  select * into v_ent from public.liveasta_premium_entitlements
    where room_id=p_room_id and environment=p_environment for update;
  if v_ent.requested_at is not null then
    return jsonb_build_object('status','already_requested','entitlement',to_jsonb(v_ent));
  end if;
  if v_ent.features @> array['sealed','random','turns','ready','budget','chat','miniatures','roster_io']::text[] then
    return jsonb_build_object('status','active','entitlement',to_jsonb(v_ent));
  end if;
  select email into v_email from private.liveasta_room_contacts where room_id=p_room_id;
  if v_email is null then
    v_email:=lower(btrim(coalesce(p_email,'')));
    if v_email='' then return jsonb_build_object('needs_email',true); end if;
    if length(v_email) not between 5 and 320 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception 'Email non valida' using errcode='22023';
    end if;
    insert into private.liveasta_room_contacts(room_id,email) values(p_room_id,v_email)
      on conflict do nothing;
    select email into v_email from private.liveasta_room_contacts where room_id=p_room_id;
  end if;
  update public.liveasta_premium_entitlements set requested_at=now(),revision=revision+1,updated_at=now()
    where room_id=p_room_id and environment=p_environment returning * into v_ent;
  insert into liveasta_premium_private.notifications(room_id,environment,kind,cycle,payload)
    values(p_room_id,p_environment,'premium_requested',v_ent.request_cycle,jsonb_build_object(
      'name',v_room.name,'email',v_email,'requested_at',v_ent.requested_at)) returning id into v_job;
  perform liveasta_premium_private.queue_notification(v_job);
  return jsonb_build_object('status','requested','entitlement',to_jsonb(v_ent));
end $function$

-- Rooms with the complete package retain the complete package.
update public.liveasta_premium_entitlements
set features=array_append(features,'roster_io'), revision=revision+1, updated_at=now()
where features @> array['sealed','random','turns','ready','budget','chat','miniatures']::text[]
  and not ('roster_io'=any(features));

