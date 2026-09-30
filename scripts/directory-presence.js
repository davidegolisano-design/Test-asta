/* Presence-only public directory reader. Never tracks users or emits auction events. */
(function(){
'use strict';
let client=null,channels=new Map(),rows=[],generation=0,totals=new Map();
function paint(room){
 const list=document.getElementById('spectator-public-rooms');if(!list)return;
 const button=[...list.querySelectorAll('.spectator-public-room')].find(b=>b.querySelector('strong')?.textContent===room.name);if(!button)return;
 const chip=button.querySelector('.spectator-room-presence');if(!chip)return;
 chip.querySelector('b').textContent=`ONLINE ${room.players_online??'–'} / ${room.players_total??'–'}`;
 chip.querySelector('i').classList.toggle('is-online',Number(room.players_online)>0);
 chip.setAttribute('aria-label',`${room.players_online??'–'} giocatori online su ${room.players_total??'–'} squadre`);
}
async function observe(next){
 const ticket=generation;rows=next;client=window.supabaseClient;
 if(!client||!document.getElementById('screen-spectator-setup')?.classList.contains('active'))return;
 const ids=next.map(r=>r.id);
 for(const [id,record] of channels)if(!ids.includes(id)){client.removeChannel(record.channel).catch(()=>{});channels.delete(id);totals.delete(id);}
 const missing=ids.filter(id=>!totals.has(id));
 if(missing.length){const {data,error}=await client.from('fanta_teams').select('room_id').in('room_id',missing);if(ticket!==generation)return;if(!error){missing.forEach(id=>totals.set(id,0));for(const t of data||[])totals.set(t.room_id,(totals.get(t.room_id)||0)+1);}}
 for(const room of next){
  room.players_total=totals.get(room.id)??null;
  const existing=channels.get(room.id);if(existing){room.players_online=existing.count;continue;}
  const channel=client.channel(`fanta-room-${room.id}`),record={channel,count:null};channels.set(room.id,record);
  const sync=()=>{if(ticket!==generation)return;const teams=new Set();Object.values(channel.presenceState()||{}).flat().forEach(p=>{if(p.type==='player'&&p.team_id)teams.add(String(p.team_id));});record.count=teams.size;const current=rows.find(r=>r.id===room.id);if(current){current.players_online=record.count;paint(current);}};
  channel.on('presence',{event:'sync'},sync).subscribe(status=>{if(status==='SUBSCRIBED')sync();});room.players_online=null;
 }
}
async function stop(){generation++;const pending=[...channels.values()].map(({channel})=>client?.removeChannel(channel).catch(()=>{}));channels.clear();rows=[];totals.clear();await Promise.all(pending);}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.liveastaDirectoryPresence={observe,stop};
})();
