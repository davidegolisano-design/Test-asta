/* Isolated preview only. Loaded instead of supabase-js by premium-preview.html.
 * No real API client is created. CSP connect-src 'none' prevents network writes.
 */
(function(){
  'use strict';
  const ROOM='00000000-0000-4000-8000-000000000101';
  const TEAM='00000000-0000-4000-8000-000000000201';
  const players=[
    {Id:'133',Nome:'Skorupski',Squadra:'Bologna',R:'P',RM:'Por',FVM:28},
    {Id:'152',Nome:'Zielinski',Squadra:'Inter',R:'C',RM:'C',FVM:18},
    {Id:'demo-3',Nome:'TERZINO DEMO',Squadra:'Milan',R:'D',RM:'Dd;E',FVM:24},
    {Id:'demo-4',Nome:'REGISTA DEMO',Squadra:'Roma',R:'C',RM:'M;C',FVM:39},
    {Id:'demo-5',Nome:'FANTASISTA DEMO',Squadra:'Napoli',R:'C',RM:'T',FVM:65},
    {Id:'demo-6',Nome:'PUNTA DEMO',Squadra:'Juventus',R:'A',RM:'Pc',FVM:120}
  ];
  const room={id:ROOM,name:'PREMIUM DEMO',password:'demo',approved:true,initial_credits:500,limit_p:3,limit_d:8,limit_c:8,limit_a:6,timer_seconds:5,prep_seconds:5,sealed_timer_seconds:30,sealed_reveal_seconds:5,auctioned_ids:[],game_mode:'classic',mantra_min_roster:23,mantra_max_roster:30,mantra_min_goalkeepers:2,created_at:new Date().toISOString()};
  const tables={
    fanta_rooms:[room],
    fanta_teams:[{id:TEAM,room_id:ROOM,name:'FC DEMO',credits_remaining:500},{id:'00000000-0000-4000-8000-000000000202',room_id:ROOM,name:'FC RIVALI',credits_remaining:500}],
    fanta_purchases:[],
    fanta_app_data:[{key:'official_listone',data:players,updated_at:new Date().toISOString(),file_name:'Listone dimostrativo'}],
    liveasta_premium_entitlements:[]
  };
  const contacts=new Map([[ROOM,"responsabile@example.invalid"]]),creationKeys=new Map(),notifications=[];
  const clone=value=>structuredClone(value), channels=new Set();
  let failReads=false,failWrites=false;
  class Query {
    constructor(table){this.table=table;this.filters=[];this.op='read';this.one=false;}
    select(){return this;}
    eq(key,value){this.filters.push(r=>String(r[key])===String(value));return this;}
    neq(key,value){this.filters.push(r=>String(r[key])!==String(value));return this;}
    in(key,values){this.filters.push(r=>values.map(String).includes(String(r[key])));return this;}
    order(){return this;} limit(value){this.max=value;return this;} abortSignal(){return this;}
    maybeSingle(){this.one=true;return this;} single(){this.one=true;return this;}
    upsert(value){this.op='upsert';this.value=value;return this;}
    insert(value){this.op='insert';this.value=value;return this;}
    update(value){this.op='update';this.value=value;return this;}
    delete(){this.op='delete';return this;}
    then(resolve,reject){return Promise.resolve().then(()=>this.run()).then(resolve,reject);}
    run(){
      if(this.table==='liveasta_premium_entitlements' && this.op!=='read')return {data:null,error:{code:'42501',message:'Scrittura diretta vietata'}};
      if(this.table==='liveasta_premium_entitlements' && failReads)return {data:null,error:{message:'Connessione simulata non disponibile'}};
      const all=tables[this.table]||(tables[this.table]=[]),match=r=>this.filters.every(fn=>fn(r));
      let rows=all.filter(match);
      if(this.op==='delete'){tables[this.table]=all.filter(r=>!match(r));rows=[];}
      if(this.op==='update')rows.forEach(r=>Object.assign(r,clone(this.value)));
      if(this.op==='upsert'||this.op==='insert'){
        rows=(Array.isArray(this.value)?this.value:[this.value]).map(input=>{
          const row=clone(input),existing=this.op==='upsert'?all.find(r=>row.key?r.key===row.key:row.id&&r.id===row.id):null;
          if(existing){Object.assign(existing,row);return existing;}
          if(!row.key&&!row.id)row.id=crypto.randomUUID();all.push(row);return row;
        });
      }
      if(this.max)rows=rows.slice(0,this.max);
      return {data:clone(this.one?(rows[0]||null):rows),error:null};
    }
  }
  function emitPremium(row){
    for(const c of channels)for(const h of c.handlers){
      if(h.type==='postgres_changes'&&h.filter.table==='liveasta_premium_entitlements')queueMicrotask(()=>h.fn({eventType:'UPDATE',new:clone(row)}));
    }
  }
  function setFeatures(features,id=ROOM){
    let row=tables.liveasta_premium_entitlements.find(r=>r.room_id===id);
    if(!row){row={room_id:id,environment:'dev-premium',features:[],revision:0,requested_at:null,request_cycle:0};tables.liveasta_premium_entitlements.push(row);}
    if(row.features.length&&!features.length){row.requested_at=null;row.request_cycle++;}
    row.features=[...features];row.revision++;emitPremium(row);return clone(row);
  }
  const client={
    from:table=>new Query(table),
    async rpc(name,args={}){
      if(name==='liveasta_create_room_dev'){
        const previous=creationKeys.get(args.p_request_id);
        if(previous)return {data:clone(previous),error:null};
        if(tables.fanta_rooms.some(r=>r.name===args.p_name))return {data:null,error:{code:'23505'}};
        const created={...room,...args.p_config,id:crypto.randomUUID(),name:args.p_name,password:args.p_room_password,approved:true};
        tables.fanta_rooms.push(created);creationKeys.set(args.p_request_id,created);contacts.set(created.id,args.p_email);
        notifications.push({room_id:created.id,kind:'room_created',state:'sent'});
        return {data:clone(created),error:null};
      }
      if(name==='liveasta_request_premium_dev'){
        if(failWrites)return {data:null,error:{message:'Errore simulato'}};
        const target=tables.fanta_rooms.find(r=>r.id===args.p_room_id&&r.password===args.p_room_password&&r.approved);
        if(!target)return {data:null,error:{code:'42501'}};
        let ent=tables.liveasta_premium_entitlements.find(r=>r.room_id===target.id);
        if(!ent){setFeatures([],target.id);ent=tables.liveasta_premium_entitlements.find(r=>r.room_id===target.id);}
        let status=ent.requested_at?'already_requested':ent.features.length===7?'active':'requested';
        if(status==='requested'){
          if(!contacts.has(target.id)&&!args.p_email)return {data:{needs_email:true},error:null};
          if(!contacts.has(target.id))contacts.set(target.id,args.p_email);
          ent.requested_at=new Date().toISOString();ent.revision++;
          notifications.push({room_id:target.id,kind:'premium_requested',state:'sent'});emitPremium(ent);
        }
        return {data:{status,entitlement:clone(ent)},error:null};
      }
      if(name==='liveasta_admin_premium_notifications'){
        if(args.p_password!=='demo-premium')return {data:null,error:{code:'42501'}};
        return {data:clone(notifications.filter(n=>n.room_id===args.p_room_id)),error:null};
      }
      if(name==='liveasta_set_room_approval'){
        if(args.p_password!=='demo-premium')return {data:false,error:null};
        const target=tables.fanta_rooms.find(r=>r.id===args.p_room_id);
        if(target)target.approved=args.p_approved;
        return {data:!!target,error:null};
      }
      if(name==='liveasta_set_premium_feature'){
        if(args.p_password!=='demo-premium')return {data:null,error:{code:'42501',message:'Password errata'}};
        if(failWrites)return {data:null,error:{message:'Errore simulato di salvataggio'}};
        const all=['sealed','random','turns','ready','budget','chat','miniatures'];
        let features=tables.liveasta_premium_entitlements.find(r=>r.room_id===args.p_room_id)?.features||[];
        if(args.p_feature==='all')features=args.p_enabled?all:[];
        else features=args.p_enabled?[...new Set([...features,args.p_feature])]:features.filter(f=>f!==args.p_feature);
        return {data:setFeatures(features,args.p_room_id),error:null};
      }
      if(name==='liveasta_verify_superuser')return {data:args.p_password==='demo-premium',error:null};
      if(name.includes('pin_status')||name.includes('pin_overview'))return {data:[],error:null};
      if(name==='fanta_assign_player'){
        const team=tables.fanta_teams.find(t=>t.id===args.p_team_id);
        if(!team||team.credits_remaining<args.p_price)return {data:null,error:{message:'Crediti insufficienti'}};
        team.credits_remaining-=args.p_price;
        tables.fanta_purchases.push({id:crypto.randomUUID(),room_id:ROOM,team_id:team.id,player_id:args.p_player_id,player_name:args.p_player_name,role:args.p_role,club:args.p_club,price:args.p_price});
      }
      return {data:true,error:null};
    },
    channel(name){
      const c={name,handlers:[],state:'joined',on(type,filter,fn){this.handlers.push({type,filter,fn});return this;},subscribe(fn){if(fn)queueMicrotask(()=>fn('SUBSCRIBED'));return this;},async send(){return 'ok';},async track(){return 'ok';},async untrack(){return 'ok';},async unsubscribe(){channels.delete(this);return 'ok';},presenceState(){return {};}};
      channels.add(c);return c;
    },
    async removeChannel(c){channels.delete(c);return 'ok';},
    functions:{async invoke(){return {data:{demo:true},error:null};}}
  };
  window.supabase={createClient:()=>client};
  window.premiumDemoBackend={room,teamId:TEAM,players,tables,client,setFeatures,
    failReads(value){failReads=value;},failWrites(value){failWrites=value;}};
})();
