/* Deterministic browser simulation: no DOM, network or database writes. */
(function(root){
'use strict';
const NAMES=['Atletico Birra','Real Scarsenal','FC Ultimo Rilancio','Borgo United','Dinamo Spritz','Sporting Fantasia','Gli Intoccabili','Lokomotiv Gol'];
const LIMITS={P:3,D:8,C:8,A:6};
const clamp=(v,min,max,fallback)=>v!==undefined&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Math.round(Number(v)))):fallback;
function normalize(c={}){return {...c,game_mode:c.game_mode==='mantra'?'mantra':'classic',selection:c.selection==='turns'?'turns':'random',auction_mode:['normal','sealed','mixed'].includes(c.auction_mode)?c.auction_mode:'mixed',seed:clamp(c.seed,1,2147483647,1),ready_seconds:clamp(c.ready_seconds,3,20,6),prep_seconds:clamp(c.prep_seconds,1,20,3),auction_seconds:clamp(c.auction_seconds,3,60,8),sealed_seconds:clamp(c.sealed_seconds,8,120,40),reveal_seconds:clamp(c.reveal_seconds,1,20,3),result_seconds:clamp(c.result_seconds,3,20,5)};}
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function build(raw,list){
 const config=normalize(raw),rng=random(config.seed),teams=NAMES.map((name,i)=>({id:`auto-${config.game_mode}-${i}`,name,budget:500,slots:{P:0,D:0,C:0,A:0},strategy:.8+rng()*.45}));
 const pools=Object.fromEntries(Object.keys(LIMITS).map(role=>[role,list.filter(p=>p.R===role).map(p=>({...p})).sort((a,b)=>Number(b.FVM)-Number(a.FVM))]));
 for(const role of Object.keys(LIMITS))if(pools[role].length<LIMITS[role]*teams.length)throw Error('Listone incompleto per '+role);
 const steps=[],purchases=[];let cursor=0,turn=0,round=0;
 const add=(state,seconds)=>{const duration=Math.max(.2,seconds)*1000;steps.push({at:cursor,end:cursor+duration,state});cursor+=duration;};
 const slots=t=>Object.values(t.slots).reduce((a,b)=>a+b,0);
 const maxBid=t=>Math.max(1,t.budget-(25-slots(t)-1));
 while(purchases.length<25*teams.length){
  const openRoles=Object.keys(LIMITS).filter(role=>teams.some(t=>t.slots[role]<LIMITS[role]));
  const role=config.selection==='turns'?openRoles[0]:openRoles[Math.floor(rng()*openRoles.length)];
  const eligible=teams.filter(t=>t.slots[role]<LIMITS[role]);
  const pick=config.selection==='turns'?0:Math.min(pools[role].length-1,Math.floor(rng()*Math.min(12,pools[role].length)));
  const source=pools[role].splice(pick,1)[0];if(!source)throw Error('Giocatori esauriti');
  const player={id:String(source.Id),nome:source.Nome,role:config.game_mode==='mantra'?(source.RM||source.R):source.R,club:source.Squadra,fvm:source.FVM};
  const nominator=eligible[turn++%eligible.length];
  const valuations=eligible.map(t=>({team:t,amount:Math.min(maxBid(t),Math.max(1,Math.round(Number(source.FVM||8)*(.27+rng()*.48)*t.strategy))),interest:rng()>.2}));
  const interested=valuations.filter(x=>x.interest||x.team===nominator).sort((a,b)=>b.amount-a.amount);
  const base={player,round,nomination_team_id:nominator.id,ready_required_ids:eligible.map(t=>t.id),ready_ids:[],sealed_token:`auto-${config.seed}-${round}`,sealed_eligible_ids:interested.map(x=>x.team.id),purchases_count:purchases.length};
  if(config.selection==='turns')add({...base,phase:'idle'},1.5+rng()*2);
  if(config.selection==='random'&&eligible.length>1&&rng()<.045){
   add({...base,phase:'ready'},config.ready_seconds);
   add({...base,phase:'ended',winner:'',value:0,normal_bid_ranking:[]},config.result_seconds);
   pools[role].push(source);round++;continue;
  }
  let readyTime=0;const order=interested.map(x=>x.team.id);
  for(let i=order.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  for(let i=0;i<order.length;i++){const next=config.ready_seconds*(i+1)/order.length;add({...base,phase:'ready',ready_ids:order.slice(0,i+1)},next-readyTime);readyTime=next;}
  const sealed=config.auction_mode==='sealed'||(config.auction_mode==='mixed'&&round%3===1);
  let ranking=[],winner,value;
  const uncontested=config.selection==='turns'&&eligible.length===1;
  if(sealed&&!uncontested){
   let prev=0;
   for(let i=0;i<interested.length;i++){const next=config.sealed_seconds*(.15+.75*(i+1)/interested.length);add({...base,phase:'sealed',sealed_submitted_ids:interested.slice(0,i+1).map(x=>x.team.id)},next-prev);prev=next;}
   add({...base,phase:'sealed',sealed_submitted_ids:interested.map(x=>x.team.id)},config.sealed_seconds-prev);
   ranking=interested.map(x=>({team_id:x.team.id,team_name:x.team.name,amount:x.amount}));
   add({...base,phase:'sealed_reveal',sealed_submitted_ids:interested.map(x=>x.team.id)},config.reveal_seconds);
   const top=ranking[0].amount,tied=ranking.filter(x=>x.amount===top);winner=interested[0].team;value=top;
   if(tied.length>1){const contenders=tied.map(x=>teams.find(t=>t.id===x.team_id)).filter(t=>maxBid(t)>top);if(contenders.length){winner=contenders[Math.floor(rng()*contenders.length)];value=top+1;add({...base,phase:'active',mode:'sealed_tiebreak',winner:winner.name,value},config.auction_seconds);ranking=[{team_id:winner.id,team_name:winner.name,amount:value},...ranking.filter(x=>x.team_id!==winner.id)];}}
  }else{
   add({...base,phase:'prep'},config.prep_seconds);
   const target=uncontested?1:Math.min(interested[0].amount,interested[1]?interested[1].amount+1:1);let amount=0,last=null;
   while(amount<target){const contenders=interested.filter(x=>x.amount>amount&&x.team!==last);const bidder=amount===0?interested[interested.length-1]:contenders[Math.floor(rng()*contenders.length)];if(!bidder)break;
    amount=Math.min(target,bidder.amount,amount+([1,2,5][Math.floor(rng()*3)]));last=bidder.team;
    const previous=ranking.find(x=>x.team_id===last.id);if(previous)previous.amount=amount;else ranking.push({team_id:last.id,team_name:last.name,amount});
    add({...base,phase:'active',winner:last.name,value:amount,normal_bid_ranking:ranking.map(x=>({...x}))},amount<target?.65+rng()*2.3:config.auction_seconds);
   }
   winner=last||interested[0].team;value=Math.max(1,amount);ranking.sort((a,b)=>b.amount-a.amount);
  }
  const purchase={id:`auto-p-${round}`,player_id:String(source.Id),player_name:source.Nome,role:player.role,club:source.Squadra,team_id:winner.id,price:value,created_at:new Date(round*1000).toISOString()};
  winner.budget-=value;winner.slots[role]++;purchases.push(purchase);
  add({...base,phase:'ended',winner:winner.name,value,mode:sealed&&!uncontested?'sealed_result':'normal',sealed_ranking:sealed?ranking:[],normal_bid_ranking:ranking,purchases_count:purchases.length},config.result_seconds);round++;
 }
 add({phase:'idle',purchases_count:purchases.length,cycle_complete:true},8);
 return {config,steps,purchases,duration:cursor,teams:teams.map(t=>({id:t.id,name:t.name,credits_remaining:500,room_id:`auto-${config.game_mode}`})),players:list.map(p=>({...p,R:config.game_mode==='mantra'?(p.RM||p.R):p.R}))};
}
function elapsed(config,now){return Math.max(0,Number(config.elapsed_ms||0)+(config.paused?0:now-Number(config.anchor_ms??now)));}
function frame(plan,config,now){
 const total=elapsed(config,now),offset=total%plan.duration;let lo=0,hi=plan.steps.length-1;
 while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(plan.steps[mid].at<=offset)lo=mid;else hi=mid-1;}
 const step=plan.steps[lo],state={...step.state};
 if(['prep','active','sealed','sealed_reveal'].includes(state.phase)){let end=state.phase==='active'?step.at+plan.config.auction_seconds*1000:step.end;
  if(state.phase==='sealed'){let i=lo;while(i+1<plan.steps.length&&plan.steps[i+1].state.round===state.round&&plan.steps[i+1].state.phase==='sealed')end=plan.steps[++i].end;}
  state.deadline_at=now+(end-offset);state.seconds=Math.ceil((end-offset)/1000);
 }
 return {state,purchases:plan.purchases.slice(0,state.purchases_count||0),cycle:Math.floor(total/plan.duration),index:lo};
}
const api={normalize,build,frame,elapsed};root.LiveAstaDemoEngine=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
