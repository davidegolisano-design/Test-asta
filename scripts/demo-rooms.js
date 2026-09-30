/* Dev orchestration. Only configuration uses Supabase; all auction events are local. */
(function(){
'use strict';
const $=id=>document.getElementById(id),enabled=()=>window.LIVEASTA_CONFIG?.automatedRooms===true;
let hooks=null,configs=[],active=null,plan=null,clock=null,poll=null,playersPromise=null,offset=0,generation=0,request=null,lastPaint='',lastPurchases=-1,commandBusy=false;
const local=()=>window.LIVEASTA_CONFIG?.demoConfigBackend==='local-preview';
const LOCAL_KEY='liveasta-automated-rooms-dev-v1';
function localRead(){
 let value;try{value=JSON.parse(localStorage.getItem(LOCAL_KEY));}catch(_){}
 if(!Array.isArray(value)||value.length!==2){value=['classic','mantra'].map((game_mode,i)=>LiveAstaDemoEngine.normalize({game_mode,name:i?'Mantra League':'Lega del Martedì',enabled:true,paused:false,selection:i?'turns':'random',seed:i?821:417,anchor_ms:Date.now(),elapsed_ms:0,revision:1}));localStorage.setItem(LOCAL_KEY,JSON.stringify(value));}
 configs=value;offset=0;return configs;
}
function accept(data){offset=Number(data.server_ms)-Date.now();configs=data.configs||[];return configs;}
async function read(){
 if(!enabled())return [];
 if(local())return localRead();
 if(request)return request;
 request=(async()=>{const {data,error}=await hooks.getClient().rpc('liveasta_demo_read_dev');if(error)throw error;return accept(data);})().finally(()=>{request=null;});return request;
}
function rooms(){return configs.filter(c=>c.enabled).map(c=>({id:'auto-'+c.game_mode,name:c.name,game_mode:c.game_mode,online:!c.paused,players_online:c.paused?0:8,players_total:8,auto_demo:true,config:c}));}
function resolve(name){return rooms().find(r=>r.name.toLocaleLowerCase('it')===name.toLocaleLowerCase('it'));}
function players(){
 if(!playersPromise){let saved;try{saved=JSON.parse(localStorage.getItem('liveasta-demo-listone-dev'));}catch(_){}
 playersPromise=Array.isArray(saved)&&saved.length?Promise.resolve(saved):fetch('./scripts/demo-players.json?v=10720').then(r=>{if(!r.ok)throw Error('Listone automatico non disponibile');return r.json();}).catch(e=>{playersPromise=null;throw e;});}
 return playersPromise;
}
function tick(force=false){
 if(!active||!plan||document.hidden)return;
 const config=configs.find(c=>c.game_mode===active);
 if(!config?.enabled){stop();hooks.disabled();return;}
 const now=Date.now()+offset,frame=LiveAstaDemoEngine.frame(plan,config,now);
 // Translate the server clock to browser deadlines for the shared presentation.
 if(frame.state.deadline_at)frame.state.deadline_at-=offset;
 frame.state.paused=!!config.paused;
 if(config.paused)frame.state.deadline_at=0;
 const key=[frame.cycle,frame.index,config.revision].join(':');
 if(key!==lastPaint||force){hooks.paint(plan,config,frame,lastPurchases!==frame.purchases.length||force);lastPaint=key;lastPurchases=frame.purchases.length;}
}
async function start(room){
 const ticket=++generation;const list=await players();if(ticket!==generation)return;
 stop(false);active=room.game_mode;plan=LiveAstaDemoEngine.build(room.config,list);lastPaint='';lastPurchases=-1;
 hooks.enter(room,plan);tick(true);clock=setInterval(tick,250);
 poll=setInterval(async()=>{if(document.hidden||!active)return;try{const current=configs.find(c=>c.game_mode===active);await read();const next=configs.find(c=>c.game_mode===active);if(next?.revision!==current?.revision){plan=LiveAstaDemoEngine.build(next,list);tick(true);}}catch(e){console.warn('Configurazione automatica:',e.message);}},30000);
}
function stop(invalidate=true){if(invalidate)generation++;clearInterval(clock);clearInterval(poll);clock=poll=null;active=null;plan=null;lastPaint='';lastPurchases=-1;}
function field(label,type,value,min,max){const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement(type==='select'?'select':'input');input.className='minimal-input';if(type!=='select')input.type=type;if(min!==undefined)input.min=min;if(max!==undefined)input.max=max;input.value=value;wrap.append(input);return {wrap,input};}
const labels={ready_seconds:['READY',3,20],prep_seconds:['Pre-asta',1,20],auction_seconds:['Chiusura asta',3,60],sealed_seconds:['Consegna buste',8,120],reveal_seconds:['Apertura buste',1,20],result_seconds:['Esito',3,20]};
function renderAdmin(){
 const panel=$('admin-automated-rooms');if(!panel||!enabled())return;panel.hidden=false;panel.replaceChildren();
 const title=document.createElement('h2');title.textContent='Stanze automatiche';panel.append(title);
 const note=document.createElement('p');note.className='subtitle';note.textContent='Ambiente dev · 8 squadre, 500 crediti, ciclo completo e riavvio. Nessuna scrittura per le aste simulate. Salvare le impostazioni ricomincia il ciclo.'+(local()?' In questa anteprima i comandi valgono per questo browser.':'');panel.append(note);
 const update=document.createElement('button');update.className='btn btn-secondary btn-small';update.textContent='Aggiorna dal listone miniature';
 update.addEventListener('click',async()=>{
  if(!hooks.getPassword())return;update.disabled=true;
  try{const {data,error}=await hooks.getClient().from('fanta_app_data').select('data').eq('key','official_listone').maybeSingle();if(error)throw error;
   if(!Array.isArray(data?.data))throw Error('Carica prima il listone per il controllo miniature.');
   for(const game_mode of ['classic','mantra'])LiveAstaDemoEngine.build({game_mode},data.data);
   localStorage.setItem('liveasta-demo-listone-dev',JSON.stringify(data.data));playersPromise=Promise.resolve(data.data);
   $('automatic-room-status').textContent=`Listone aggiornato: ${data.data.length} calciatori. Sarà usato al prossimo ingresso.`;
  }catch(e){$('automatic-room-status').textContent=e.message;}finally{update.disabled=false;}
 });panel.append(update);
 for(const c of configs){
  const card=document.createElement('section');card.className='automatic-room-card';const head=document.createElement('h3');head.textContent=(c.game_mode==='mantra'?'Mantra':'Classic')+' · '+(!c.enabled?'Disattivata':c.paused?'In pausa':'In corso');card.append(head);
  const grid=document.createElement('div');grid.className='automatic-room-fields';const inputs={};
  const name=field('Nome stanza','text',c.name);name.input.maxLength=40;inputs.name=name.input;grid.append(name.wrap);
  for(const [key,title,options] of [['selection','Scelta calciatori',[['random','Random'],['turns','Banditura a turni']]],['auction_mode','Offerte',[['normal','Rilanci'],['sealed','Busta chiusa'],['mixed','Alterna rilanci e buste']]]]){
   const item=field(title,'select',c[key]);for(const [value,label] of options){const option=document.createElement('option');option.value=value;option.textContent=label;item.input.append(option);}item.input.value=c[key];inputs[key]=item.input;grid.append(item.wrap);
  }
  for(const [key,[label,min,max]] of Object.entries(labels)){const item=field(label+' (s)','number',c[key],min,max);inputs[key]=item.input;grid.append(item.wrap);}card.append(grid);
  const actions=document.createElement('div');actions.className='automatic-room-actions';
  for(const [action,label] of [['save','Salva e ricomincia'],['toggle',c.enabled?'Disattiva':'Attiva'],[c.paused?'resume':'pause',c.paused?'Riprendi':'Pausa'],['reset','Da zero']]){
   const button=document.createElement('button');button.type='button';button.className='btn btn-secondary btn-small';button.textContent=label;button.disabled=commandBusy;
   button.addEventListener('click',async()=>{if(commandBusy)return;const values=Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,k.endsWith('_seconds')?Number(v.value):v.value]));if(action==='save'&&Object.values(inputs).some(i=>!i.checkValidity())){Object.values(inputs).find(i=>!i.checkValidity()).reportValidity();return;}await command(c,action,values);});actions.append(button);
  }card.append(actions);panel.append(card);
 }
 const status=document.createElement('p');status.id='automatic-room-status';status.setAttribute('role','status');panel.append(status);
}
async function command(c,action,values){
 commandBusy=true;document.querySelectorAll('#admin-automated-rooms button').forEach(b=>b.disabled=true);
 try{
  if(local()){
   if(!hooks.getPassword())throw Error('Accedi al superuser.');
   localRead();const current=configs.find(x=>x.game_mode===c.game_mode);if(current.revision!==c.revision)throw Error('Configurazione cambiata: ricarica.');
   const elapsed=LiveAstaDemoEngine.elapsed(current,Date.now());let next={...current,revision:current.revision+1};
   if(action==='pause')next={...next,paused:true,elapsed_ms:elapsed,anchor_ms:Date.now()};
   if(action==='resume')next={...next,paused:false,anchor_ms:Date.now()};
   if(action==='toggle')next.enabled=!next.enabled;
   if(action==='reset')next={...next,elapsed_ms:0,anchor_ms:Date.now()};
   if(action==='save')next=LiveAstaDemoEngine.normalize({...next,...values,elapsed_ms:0,anchor_ms:Date.now()});
   configs=configs.map(x=>x.game_mode===c.game_mode?next:x);localStorage.setItem(LOCAL_KEY,JSON.stringify(configs));
  }else{const {data,error}=await hooks.getClient().rpc('liveasta_demo_admin_dev',{p_password:hooks.getPassword(),p_mode:c.game_mode,p_action:action,p_config:values,p_revision:c.revision});if(error)throw error;accept(data);}
  renderAdmin();$('automatic-room-status').textContent='Salvato.';window.liveastaSpectatorLobby?.refresh();
 }
 catch(e){$('automatic-room-status').textContent=e.message||'Salvataggio non riuscito.';}
 finally{commandBusy=false;document.querySelectorAll('#admin-automated-rooms button').forEach(b=>b.disabled=false);}
}
async function admin(){if(!enabled())return;try{await read();renderAdmin();}catch(e){const panel=$('admin-automated-rooms');panel.hidden=false;panel.textContent='Configurazione automatica non disponibile: '+e.message;}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick(true);});
window.liveastaDemoRooms={configure:value=>hooks=value,read,rooms,resolve,start,stop,admin,isActive:()=>!!active,isEnabled:enabled};
})();
