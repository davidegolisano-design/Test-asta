-- Additive setup. Uses the app's existing room-password / superuser-password model.
-- No changes to auction tables, policies, credentials, or auction decisions.
create schema if not exists liveasta_debug;
revoke all on schema liveasta_debug from public;
grant usage on schema liveasta_debug to anon, authenticated;

create table if not exists liveasta_debug.events (
    id bigint generated always as identity primary key,
    room_id uuid not null references public.fanta_rooms(id) on delete cascade,
    event_id uuid not null unique,
    received_at timestamptz not null default clock_timestamp(),
    client_at timestamptz not null,
    session_id uuid not null,
    sequence bigint not null check (sequence > 0),
    team_id uuid,
    actor text not null check (actor in ('player','auctioneer','observer')),
    version text not null,
    event text not null,
    level text not null check (level in ('info','warning','error')),
    details jsonb not null
);
alter table liveasta_debug.events enable row level security;
revoke all on liveasta_debug.events from public, anon, authenticated;
create index if not exists debug_events_room_id on liveasta_debug.events(room_id,id);
create index if not exists debug_events_room_time on liveasta_debug.events(room_id,received_at);
create index if not exists debug_events_received_at on liveasta_debug.events(received_at);
comment on table liveasta_debug.events is
    'Client-reported diagnostics, not an authoritative bid ledger. Server reception time is authoritative. Last 30 days / 50000 events per room; cleanup on append. Room deletion removes its logs.';

create or replace function liveasta_debug.append_events(p_room_id uuid, p_room_password text, p_events jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
    e jsonb; safe jsonb; n integer := 0; added integer; cutoff bigint;
begin
    -- This application does not use Supabase Auth sessions. Validate its existing
    -- room credential explicitly instead of trusting anon/authenticated or a client role.
    if not exists (select 1 from public.fanta_rooms r where r.id=p_room_id
                   and r.password=p_room_password and r.approved is true) then
        raise exception 'Accesso al registro negato' using errcode='42501';
    end if;
    if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)>40
       or octet_length(p_events::text)>200000 then
        raise exception 'Batch diagnostico non valido' using errcode='22023';
    end if;
    -- Only diagnostic writers contend on this lock; bids never take it.
    perform pg_advisory_xact_lock(hashtextextended(p_room_id::text,731201));
    if (select count(*) from liveasta_debug.events where room_id=p_room_id
        and received_at>clock_timestamp()-interval '1 minute') >= 3000 then
        raise exception 'Limite registro raggiunto; riprovare' using errcode='P0001';
    end if;
    for e in select value from jsonb_array_elements(p_events) loop
        if octet_length(e::text)>8000 or (e->>'room_id')::uuid is distinct from p_room_id
           or length(e->>'event') not between 1 and 80
           or e->>'event' !~ '^[a-z][a-z0-9_.]*$'
           or length(e->>'version')>40
           or jsonb_typeof(e->'details') is distinct from 'object' then
            raise exception 'Evento diagnostico non valido' using errcode='22023';
        end if;
        if nullif(e->>'team_id','') is not null and not exists (
            select 1 from public.fanta_teams t where t.id=(e->>'team_id')::uuid and t.room_id=p_room_id
        ) then raise exception 'Squadra non appartenente alla stanza' using errcode='42501'; end if;
        -- Never accept arbitrary request bodies or credentials. Only bounded, flat fields.
        select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into safe
        from jsonb_each(e->'details') where key = any(array[
            'phase','mode','player_id','team_id','bid_id','token','ready_token','choice','reason',
            'status','event','operation','code','name','line','column','source','value','amount','target',
            'seconds','deadline_at','cooldown_ms','self_raise_enabled','ready_count','total','waiting',
            'active','absent','duration_ms','sequence','dropped','required_ids','ready_required_ids',
            'ready_ids','skip_ids','winner','online','visibility','auction_active','ready_waiting',
            'pending','screen','transport','request_id','browser','platform','viewport'])
            and jsonb_typeof(value) in ('string','number','boolean','array')
            and octet_length(value::text)<=7000;
        if coalesce(safe->>'event','') ~* '(sealed|bust)' or e->>'event' ~* '(sealed|bust)' then
            safe := safe - 'amount' - 'target' - 'value';
        end if;
        insert into liveasta_debug.events(room_id,event_id,client_at,session_id,sequence,team_id,actor,version,event,level,details)
        values(p_room_id,(e->>'event_id')::uuid,(e->>'client_at')::timestamptz,(e->>'session_id')::uuid,
               (e->>'sequence')::bigint,nullif(e->>'team_id','')::uuid,e->>'actor',e->>'version',e->>'event',e->>'level',safe)
        on conflict(event_id) do nothing;
        get diagnostics added = row_count;
        n := n+added;
    end loop;
    -- Bounded maintenance; no cron extension or extra service required.
    delete from liveasta_debug.events where id in (
        select id from liveasta_debug.events where received_at<clock_timestamp()-interval '30 days'
        order by received_at limit 1000
    );
    select id into cutoff from liveasta_debug.events where room_id=p_room_id
        order by id desc offset 49999 limit 1;
    if cutoff is not null then delete from liveasta_debug.events where room_id=p_room_id and id<cutoff; end if;
    return n;
end; $$;

create or replace function liveasta_debug.export_events(p_room_id uuid,p_password text,p_after bigint,p_through bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare upper_id bigint; rows jsonb; last_id bigint; more boolean; earliest timestamptz;
begin
    -- Every page is authorized on the server; hiding the button is not authorization.
    if public.liveasta_verify_superuser(p_password) is not true then
        raise exception 'Autorizzazione superuser non valida' using errcode='42501';
    end if;
    if not exists(select 1 from public.fanta_rooms where id=p_room_id) then
        raise exception 'Stanza non trovata' using errcode='22023';
    end if;
    select coalesce(p_through,max(id),0),min(received_at) into upper_id,earliest
        from liveasta_debug.events where room_id=p_room_id and received_at>=now()-interval '30 days';
    select coalesce(jsonb_agg(to_jsonb(page) order by page.sort_id),'[]'::jsonb),max(page.sort_id)
        into rows,last_id from (
            select id as sort_id,id::text as id,event_id,received_at,client_at,session_id,sequence,
                   team_id,actor,version,event,level,details
            from liveasta_debug.events
            where room_id=p_room_id and id>greatest(coalesce(p_after,0),0) and id<=upper_id
                and received_at>=now()-interval '30 days'
            order by id limit 1000
        ) page;
    select exists(select 1 from liveasta_debug.events where room_id=p_room_id
        and id>coalesce(last_id,upper_id) and id<=upper_id and received_at>=now()-interval '30 days') into more;
    return jsonb_build_object('events',rows,'through',upper_id::text,'has_more',more,'earliest_available',earliest);
end; $$;

-- Public entrypoints are invokers. Privileged implementation stays outside the exposed schema.
create or replace function public.liveasta_debug_append(p_room_id uuid,p_room_password text,p_events jsonb)
returns integer language sql security invoker set search_path = '' as $$
    select liveasta_debug.append_events(p_room_id,p_room_password,p_events);
$$;
create or replace function public.liveasta_debug_export(p_room_id uuid,p_password text,p_after bigint default 0,p_through bigint default null)
returns jsonb language sql security invoker set search_path = '' as $$
    select liveasta_debug.export_events(p_room_id,p_password,p_after,p_through);
$$;
revoke all on function liveasta_debug.append_events(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function liveasta_debug.export_events(uuid,text,bigint,bigint) from public,anon,authenticated;
revoke all on function public.liveasta_debug_append(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.liveasta_debug_export(uuid,text,bigint,bigint) from public,anon,authenticated;
grant execute on function liveasta_debug.append_events(uuid,text,jsonb) to anon,authenticated;
grant execute on function liveasta_debug.export_events(uuid,text,bigint,bigint) to anon,authenticated;
grant execute on function public.liveasta_debug_append(uuid,text,jsonb) to anon,authenticated;
grant execute on function public.liveasta_debug_export(uuid,text,bigint,bigint) to anon,authenticated;
