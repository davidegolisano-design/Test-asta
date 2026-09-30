-- Automatic room configuration only. Existing room/access functions remain unchanged.
create table if not exists private.liveasta_demo_config (
 game_mode text primary key check(game_mode in ('classic','mantra')),
 config jsonb not null,
 revision integer not null default 1
);
alter table private.liveasta_demo_config enable row level security;
revoke all on private.liveasta_demo_config from public,anon,authenticated;
insert into private.liveasta_demo_config(game_mode,config)
select mode,jsonb_build_object('game_mode',mode,'name',case when mode='classic' then 'Lega del Martedì' else 'Mantra League' end,'enabled',true,'paused',false,'selection',case when mode='classic' then 'random' else 'turns' end,'auction_mode','mixed','seed',case when mode='classic' then 417 else 821 end,'anchor_ms',floor(extract(epoch from clock_timestamp())*1000),'elapsed_ms',0,'ready_seconds',6,'prep_seconds',3,'auction_seconds',8,'sealed_seconds',40,'reveal_seconds',3,'result_seconds',5)
from (values('classic'),('mantra')) m(mode) on conflict do nothing;

create or replace function public.liveasta_demo_read()
returns jsonb language sql stable security definer set search_path=''
as $$ select jsonb_build_object('server_ms',floor(extract(epoch from now())*1000),'configs',coalesce(jsonb_agg(config||jsonb_build_object('revision',revision) order by game_mode),'[]'::jsonb)) from private.liveasta_demo_config; $$;
revoke all on function public.liveasta_demo_read() from public;
grant execute on function public.liveasta_demo_read() to anon,authenticated;

create or replace function public.liveasta_demo_admin(p_password text,p_mode text default '',p_action text default 'list',p_config jsonb default '{}'::jsonb,p_revision integer default 0)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare row private.liveasta_demo_config; c jsonb; stamp bigint:=floor(extract(epoch from clock_timestamp())*1000); elapsed bigint; k text; v integer;
begin
 if not coalesce(public.liveasta_verify_superuser(p_password),false) then raise exception 'Autorizzazione richiesta' using errcode='42501'; end if;
 if p_action='list' then return public.liveasta_demo_read(); end if;
 select * into row from private.liveasta_demo_config where game_mode=p_mode for update;
 if not found then raise exception 'Modalità non valida'; end if;
 if row.revision<>p_revision then raise exception 'Configurazione aggiornata da un altro accesso. Ricarica.'; end if;
 c:=row.config;
 elapsed:=(c->>'elapsed_ms')::bigint+case when (c->>'paused')::boolean then 0 else greatest(0,stamp-(c->>'anchor_ms')::bigint) end;
 if p_action='pause' then c:=c||jsonb_build_object('paused',true,'elapsed_ms',elapsed,'anchor_ms',stamp);
 elsif p_action='resume' then c:=c||jsonb_build_object('paused',false,'anchor_ms',stamp);
 elsif p_action='reset' then c:=c||jsonb_build_object('elapsed_ms',0,'anchor_ms',stamp);
 elsif p_action='toggle' then c:=c||jsonb_build_object('enabled',not (c->>'enabled')::boolean);
 elsif p_action='save' then
  if coalesce(length(trim(p_config->>'name')),0) not between 2 and 40 then raise exception 'Nome: da 2 a 40 caratteri'; end if;
  if coalesce(p_config->>'selection','') not in ('random','turns') or coalesce(p_config->>'auction_mode','') not in ('normal','sealed','mixed') then raise exception 'Modalità non valida'; end if;
  c:=c||jsonb_build_object('name',trim(p_config->>'name'),'selection',p_config->>'selection','auction_mode',p_config->>'auction_mode','elapsed_ms',0,'anchor_ms',stamp);
  foreach k in array array['ready_seconds','prep_seconds','auction_seconds','sealed_seconds','reveal_seconds','result_seconds'] loop
   v:=(p_config->>k)::integer;
   if v is null or v < (case k when 'ready_seconds' then 3 when 'auction_seconds' then 3 when 'sealed_seconds' then 8 when 'result_seconds' then 3 else 1 end) or v > (case k when 'auction_seconds' then 60 when 'sealed_seconds' then 120 else 20 end) then raise exception 'Timer non valido'; end if;
   c:=jsonb_set(c,array[k],to_jsonb(v));
  end loop;
 else raise exception 'Comando non valido'; end if;
 update private.liveasta_demo_config set config=c,revision=revision+1 where game_mode=p_mode;
 return public.liveasta_demo_read();
end $$;
revoke all on function public.liveasta_demo_admin(text,text,text,jsonb,integer) from public;
grant execute on function public.liveasta_demo_admin(text,text,text,jsonb,integer) to anon,authenticated;

notify pgrst,'reload schema';
