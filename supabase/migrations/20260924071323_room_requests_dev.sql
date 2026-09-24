-- Prerequisite: premium-dev.sql. Additive dev-only endpoints; no existing room
-- approval is changed and the production creation/email flow remains untouched.
alter table public.liveasta_premium_entitlements
  add column requested_at timestamptz,
  add column request_cycle integer not null default 0 check (request_cycle >= 0);

create table liveasta_premium_private.creation_keys (
  request_id uuid primary key,
  room_id uuid not null unique references public.fanta_rooms(id) on delete cascade
);
create table liveasta_premium_private.notifications (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.fanta_rooms(id) on delete cascade,
  environment text not null check(environment='dev-premium'),
  kind text not null check(kind in ('room_created','premium_requested')),
  cycle integer not null default 0,
  payload jsonb not null,
  delivery_token uuid not null default gen_random_uuid(),
  claim_token uuid,
  state text not null default 'pending' check(state in ('pending','sending','sent','failed','uncertain')),
  attempts integer not null default 0,
  claimed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  error_code text,
  unique(room_id,environment,kind,cycle)
);
alter table liveasta_premium_private.creation_keys enable row level security;
alter table liveasta_premium_private.notifications enable row level security;
revoke all on liveasta_premium_private.creation_keys,liveasta_premium_private.notifications from public,anon,authenticated;

create function liveasta_premium_private.queue_notification(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_job liveasta_premium_private.notifications;
begin
  select * into v_job from liveasta_premium_private.notifications where id=p_id;
  if v_job.state not in ('pending','failed') then return; end if;
  perform net.http_post(
    url:='https://qvkembahfeecfpsshepv.supabase.co/functions/v1/liveasta-dev-notification',
    headers:='{"Content-Type":"application/json"}'::jsonb,
    body:=jsonb_build_object('id',v_job.id,'token',v_job.delivery_token),
    timeout_milliseconds:=5000);
exception when others then
  update liveasta_premium_private.notifications set state='failed',error_code='QUEUE_UNAVAILABLE'
    where id=p_id and state in ('pending','failed');
end $$;
revoke all on function liveasta_premium_private.queue_notification(uuid) from public,anon,authenticated;

create function liveasta_premium_private.create_room(
  p_name text,p_room_password text,p_email text,p_config jsonb,p_request_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_name text:=regexp_replace(btrim(coalesce(p_name,'')),'[[:space:]]+',' ','g');
  v_email text:=lower(btrim(coalesce(p_email,'')));
  v_mode text:=coalesce(p_config->>'game_mode','classic');
  v_max integer:=coalesce((p_config->>'mantra_max_roster')::integer,30);
  v_room public.fanta_rooms;
  v_job uuid;
begin
  if p_request_id is null or length(v_name) not between 1 and 30
     or length(coalesce(p_room_password,'')) not between 1 and 40
     or length(v_email) not between 5 and 320
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or v_mode not in ('classic','mantra') or v_max not between 23 and 90 then
    raise exception 'Controlla nome, password, email e modalità della stanza.' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select r.* into v_room from liveasta_premium_private.creation_keys k
    join public.fanta_rooms r on r.id=k.room_id where k.request_id=p_request_id;
  if found then
    if v_room.name<>v_name or v_room.password<>p_room_password or not exists(
      select 1 from private.liveasta_room_contacts where room_id=v_room.id and email=v_email
    ) then raise exception 'Richiesta non valida' using errcode='42501'; end if;
    return to_jsonb(v_room);
  end if;
  insert into public.fanta_rooms(name,password,approved,game_mode,mantra_max_roster)
    values(v_name,p_room_password,true,v_mode,v_max) returning * into v_room;
  insert into private.liveasta_room_contacts(room_id,email) values(v_room.id,v_email);
  insert into liveasta_premium_private.creation_keys values(p_request_id,v_room.id);
  insert into liveasta_premium_private.notifications(room_id,environment,kind,payload)
    values(v_room.id,'dev-premium','room_created',jsonb_build_object(
      'name',v_room.name,'password',v_room.password,'email',v_email,
      'mode',v_room.game_mode,'created_at',v_room.created_at)) returning id into v_job;
  perform liveasta_premium_private.queue_notification(v_job);
  return to_jsonb(v_room);
end $$;
revoke all on function liveasta_premium_private.create_room(text,text,text,jsonb,uuid) from public;
grant execute on function liveasta_premium_private.create_room(text,text,text,jsonb,uuid) to anon,authenticated;
create function public.liveasta_create_room_dev(p_name text,p_room_password text,p_email text,p_config jsonb,p_request_id uuid)
returns jsonb language sql security invoker set search_path='' as $$
  select liveasta_premium_private.create_room(p_name,p_room_password,p_email,p_config,p_request_id);
$$;
revoke all on function public.liveasta_create_room_dev(text,text,text,jsonb,uuid) from public;
grant execute on function public.liveasta_create_room_dev(text,text,text,jsonb,uuid) to anon,authenticated;

-- Reopen only when the last enabled feature is removed. Disabling an already
-- Free room or a single feature while others remain must not reopen a request.
create function liveasta_premium_private.reset_request_after_revocation()
returns trigger language plpgsql set search_path='' as $$
begin
  if cardinality(old.features)>0 and cardinality(new.features)=0 then
    new.requested_at:=null;
    new.request_cycle:=old.request_cycle+1;
  end if;
  return new;
end $$;
revoke all on function liveasta_premium_private.reset_request_after_revocation() from public,anon,authenticated;
create trigger premium_request_revoked before update on public.liveasta_premium_entitlements
for each row execute function liveasta_premium_private.reset_request_after_revocation();

create function liveasta_premium_private.request_premium(p_room_id uuid,p_room_password text,p_email text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_room public.fanta_rooms; v_ent public.liveasta_premium_entitlements; v_email text; v_job uuid;
begin
  select * into v_room from public.fanta_rooms where id=p_room_id and password=p_room_password and approved=true for share;
  if not found then raise exception 'Accesso stanza non valido' using errcode='42501'; end if;
  insert into public.liveasta_premium_entitlements(room_id,environment)
    values(p_room_id,'dev-premium') on conflict do nothing;
  select * into v_ent from public.liveasta_premium_entitlements
    where room_id=p_room_id and environment='dev-premium' for update;
  if v_ent.requested_at is not null then
    return jsonb_build_object('status','already_requested','entitlement',to_jsonb(v_ent));
  end if;
  if cardinality(v_ent.features)=7 then
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
    where room_id=p_room_id and environment='dev-premium' returning * into v_ent;
  insert into liveasta_premium_private.notifications(room_id,environment,kind,cycle,payload)
    values(p_room_id,'dev-premium','premium_requested',v_ent.request_cycle,jsonb_build_object(
      'name',v_room.name,'email',v_email,'requested_at',v_ent.requested_at)) returning id into v_job;
  perform liveasta_premium_private.queue_notification(v_job);
  return jsonb_build_object('status','requested','entitlement',to_jsonb(v_ent));
end $$;
revoke all on function liveasta_premium_private.request_premium(uuid,text,text) from public;
grant execute on function liveasta_premium_private.request_premium(uuid,text,text) to anon,authenticated;
create function public.liveasta_request_premium_dev(p_room_id uuid,p_room_password text,p_email text default null)
returns jsonb language sql security invoker set search_path='' as $$
  select liveasta_premium_private.request_premium(p_room_id,p_room_password,p_email);
$$;
revoke all on function public.liveasta_request_premium_dev(uuid,text,text) from public;
grant execute on function public.liveasta_request_premium_dev(uuid,text,text) to anon,authenticated;

-- Only the server can claim a queued event and see its contact/password data.
-- Concurrent delivery attempts cannot send twice. SMTP outcomes which cannot be
-- established are kept for manual review, never silently retried.
create function liveasta_premium_private.claim_notification(p_id uuid,p_token uuid,p_claim uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_job liveasta_premium_private.notifications;
begin
  update liveasta_premium_private.notifications set state='sending',claim_token=p_claim,
    claimed_at=now(),attempts=attempts+1,error_code=null
    where id=p_id and delivery_token=p_token and state in ('pending','failed')
    returning * into v_job;
  if not found then return null; end if;
  return jsonb_build_object('id',v_job.id,'room_id',v_job.room_id,'kind',v_job.kind,
    'cycle',v_job.cycle,'payload',v_job.payload);
end $$;
create function public.liveasta_claim_dev_notification(p_id uuid,p_token uuid,p_claim uuid)
returns jsonb language sql security invoker set search_path='' as $$
  select liveasta_premium_private.claim_notification(p_id,p_token,p_claim);
$$;
create function liveasta_premium_private.finish_notification(p_id uuid,p_claim uuid,p_state text,p_error text default null)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if p_state not in ('sent','failed','uncertain') then raise exception 'Invalid notification state'; end if;
  update liveasta_premium_private.notifications set state=p_state,
    sent_at=case when p_state='sent' then now() else null end,
    payload=case when p_state='sent' then '{}'::jsonb else payload end,
    error_code=left(p_error,64)
    where id=p_id and claim_token=p_claim and state='sending';
  return found;
end $$;
create function public.liveasta_finish_dev_notification(p_id uuid,p_claim uuid,p_state text,p_error text default null)
returns boolean language sql security invoker set search_path='' as $$
  select liveasta_premium_private.finish_notification(p_id,p_claim,p_state,p_error);
$$;
revoke all on function liveasta_premium_private.claim_notification(uuid,uuid,uuid),public.liveasta_claim_dev_notification(uuid,uuid,uuid),
 liveasta_premium_private.finish_notification(uuid,uuid,text,text),public.liveasta_finish_dev_notification(uuid,uuid,text,text)
 from public,anon,authenticated;
grant usage on schema liveasta_premium_private to service_role;
grant execute on function liveasta_premium_private.claim_notification(uuid,uuid,uuid),public.liveasta_claim_dev_notification(uuid,uuid,uuid),
 liveasta_premium_private.finish_notification(uuid,uuid,text,text),public.liveasta_finish_dev_notification(uuid,uuid,text,text) to service_role;

create function liveasta_premium_private.admin_notifications(p_room_id uuid,p_password text,p_retry boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_job uuid; v_result jsonb;
begin
  if not coalesce(public.liveasta_verify_superuser(p_password),false) then
    raise exception 'Autorizzazione superuser non valida' using errcode='42501';
  end if;
  update liveasta_premium_private.notifications set state='uncertain',error_code='WORKER_INTERRUPTED'
    where room_id=p_room_id and state='sending' and claimed_at<now()-interval '2 minutes';
  if p_retry then
    for v_job in select id from liveasta_premium_private.notifications
      where room_id=p_room_id and state in ('pending','failed') loop
      perform liveasta_premium_private.queue_notification(v_job);
    end loop;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('kind',n.kind,'state',n.state,'created_at',n.created_at,'sent_at',n.sent_at)
    order by n.created_at desc),'[]'::jsonb) into v_result
    from liveasta_premium_private.notifications n where n.room_id=p_room_id;
  return v_result;
end $$;
revoke all on function liveasta_premium_private.admin_notifications(uuid,text,boolean) from public;
grant execute on function liveasta_premium_private.admin_notifications(uuid,text,boolean) to anon,authenticated;
create function public.liveasta_admin_premium_notifications(p_room_id uuid,p_password text,p_retry boolean default false)
returns jsonb language sql security invoker set search_path='' as $$
  select liveasta_premium_private.admin_notifications(p_room_id,p_password,p_retry);
$$;
revoke all on function public.liveasta_admin_premium_notifications(uuid,text,boolean) from public;
grant execute on function public.liveasta_admin_premium_notifications(uuid,text,boolean) to anon,authenticated;
