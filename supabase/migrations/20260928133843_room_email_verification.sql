-- Staged verified creation API. Legacy creation privileges are closed at public cutover.
create table private.liveasta_email_challenges (
 id uuid primary key, request_id uuid not null, environment text not null,
 email text not null, ip_hash text not null, payload jsonb not null,
 code_hash text not null, created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '10 minutes',
 attempts integer not null default 0, invalidated boolean not null default false,
 room_id uuid references public.fanta_rooms(id) on delete set null,
 check(environment in ('dev-premium','production')),check(attempts between 0 and 5)
);
create index on private.liveasta_email_challenges(email,created_at);
create index on private.liveasta_email_challenges(ip_hash,created_at);
create index on private.liveasta_email_challenges(request_id,environment);
alter table private.liveasta_email_challenges enable row level security;
revoke all on private.liveasta_email_challenges from public,anon,authenticated;

create function public.liveasta_email_challenge_start(p_id uuid,p_hash text,p_ip_hash text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_email text:=lower(trim(p_payload->>'p_email')); v_request uuid:=(p_payload->>'p_request_id')::uuid; v_env text:=p_payload->>'p_environment';
begin
 if (select auth.jwt()->>'role') is distinct from 'service_role' then raise exception 'Forbidden'; end if;
 if v_request is null or v_env not in ('dev-premium','production') or v_env is null or
 length(coalesce(v_email,'')) not between 5 and 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or
 length(coalesce(p_payload->>'p_name','')) not between 1 and 30 or
 length(coalesce(p_payload->>'p_room_password','')) not between 1 and 40 or
 coalesce(p_payload->'p_config'->>'game_mode','') not in ('classic','mantra') or
 length(coalesce(p_hash,''))<>64 or length(coalesce(p_ip_hash,''))<>64 then return jsonb_build_object('error','invalid'); end if;
 perform pg_advisory_xact_lock(hashtextextended('email:'||v_email,0));
 perform pg_advisory_xact_lock(hashtextextended('ip:'||p_ip_hash,0));
 if exists(select 1 from private.liveasta_email_challenges where email=v_email and created_at>now()-interval '60 seconds') then
 return jsonb_build_object('error','cooldown','retry_after',60); end if;
 if (select count(*) from private.liveasta_email_challenges where email=v_email and created_at>now()-interval '1 hour')>=5
 or (select count(*) from private.liveasta_email_challenges where ip_hash=p_ip_hash and created_at>now()-interval '1 hour')>=20 then
 return jsonb_build_object('error','rate_limit'); end if;
 if exists(select 1 from public.fanta_rooms where lower(name)=lower(trim(p_payload->>'p_name'))) then return jsonb_build_object('error','room_exists'); end if;
 delete from private.liveasta_email_challenges where created_at<now()-interval '24 hours';
 update private.liveasta_email_challenges set invalidated=true where request_id=v_request and environment=v_env;
 insert into private.liveasta_email_challenges(id,request_id,environment,email,ip_hash,payload,code_hash)
 values(p_id,v_request,v_env,v_email,p_ip_hash,p_payload,p_hash);
 return jsonb_build_object('challenge_id',p_id,'expires_in',600,'retry_after',60);
end $$;

create function public.liveasta_email_challenge_confirm(p_id uuid,p_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c private.liveasta_email_challenges; r jsonb;
begin
 if (select auth.jwt()->>'role') is distinct from 'service_role' then raise exception 'Forbidden'; end if;
 select * into c from private.liveasta_email_challenges where id=p_id for update;
 if not found or c.invalidated then return jsonb_build_object('error','invalid_code'); end if;
 if c.attempts>=5 then return jsonb_build_object('error','attempts'); end if;
 if c.expires_at<=now() then return jsonb_build_object('error','expired'); end if;
 if c.code_hash is distinct from p_hash then
 update private.liveasta_email_challenges set attempts=attempts+1 where id=p_id;
 return jsonb_build_object('error',case when c.attempts>=4 then 'attempts' else 'invalid_code' end,'remaining',4-c.attempts);
 end if;
 if c.room_id is not null then
 select to_jsonb(t) into r from public.fanta_rooms t where id=c.room_id;
 return jsonb_build_object('room',r);
 end if;
 begin
 r:=liveasta_premium_private.create_room(c.payload->>'p_name',c.payload->>'p_room_password',c.email,
 c.payload->'p_config',c.request_id,c.environment);
 exception when unique_violation then return jsonb_build_object('error','room_exists');
 end;
 update private.liveasta_email_challenges set room_id=(r->>'id')::uuid where id=p_id;
 return jsonb_build_object('room',r);
end $$;
revoke all on function public.liveasta_email_challenge_start(uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.liveasta_email_challenge_confirm(uuid,text) from public,anon,authenticated;
grant execute on function public.liveasta_email_challenge_start(uuid,text,text,jsonb) to service_role;
grant execute on function public.liveasta_email_challenge_confirm(uuid,text) to service_role;
notify pgrst,'reload schema';
