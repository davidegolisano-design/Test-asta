const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
function fixture(){
 const element=()=>{const classes=new Set(),styles=new Map();return {textContent:'3',dataset:{},classList:{contains:x=>classes.has(x),add:(...xs)=>xs.forEach(x=>classes.add(x)),remove:(...xs)=>xs.forEach(x=>classes.delete(x)),toggle(x,on){on?classes.add(x):classes.delete(x);}},style:{setProperty:(x,v,p)=>styles.set(x,{v,p}),getPropertyValue:x=>styles.get(x)?.v||'',getPropertyPriority:x=>styles.get(x)?.p||'',removeProperty:x=>styles.delete(x)}};};
 const ids=Object.fromEntries(['view-auction','countdown-display','screen-auctioneer-board','player-countdown','player-auction-title'].map(id=>[id,element()]));
 let tick;const ctx={document:{readyState:'complete',getElementById:id=>ids[id]},isAuctionActive:true,setInterval:f=>{tick=f;return 1;},clearInterval(){},addEventListener(){}};ctx.window=ctx;
 vm.runInNewContext(fs.readFileSync('scripts/sealed-auction.js','utf8'),ctx);
 return {ids,ctx,tick:()=>tick()};
}
test('normal and sealed delivery stay red at 3, 2, 1 and reset outside final seconds',()=>{
 const f=fixture(),timer=f.ids['countdown-display'],view=f.ids['view-auction'];
 for(const sealed of [false,true]){f.ctx.isAuctionActive=!sealed;view.classList.toggle('sealed-collecting',sealed);
  for(const n of [3,2,1]){timer.textContent=String(n);f.tick();assert.equal(timer.style.getPropertyValue('color'),'#FF334F');assert.ok(timer.classList.contains('liveasta-last3'));}
  timer.textContent='4';f.tick();assert.equal(timer.style.getPropertyValue('color'),'');assert.ok(!timer.classList.contains('liveasta-last3'));
 }
});
test('preparation, opening and ended phases clear red; spectator uses the same phase rule',()=>{
 const f=fixture(),timer=f.ids['countdown-display'],view=f.ids['view-auction'];
 timer.classList.add('prep-countdown');f.tick();assert.equal(timer.style.getPropertyValue('color'),'');
 timer.classList.remove('prep-countdown');view.classList.add('sealed-collecting','sealed-opening');f.tick();assert.equal(timer.style.getPropertyValue('color'),'');
 view.classList.remove('sealed-collecting','sealed-opening');
 for(const phase of ['active','sealed_reveal','prep','ended']){f.ids['screen-auctioneer-board'].dataset.spectatorPhase=phase;f.tick();assert.equal(timer.classList.contains('liveasta-last3'),phase==='active');}
});
test('player normal and delivery warnings survive synchronization; opening stays themed',()=>{
 const f=fixture(),timer=f.ids['player-countdown'],title=f.ids['player-auction-title'];
 for(const label of ['MIGLIOR OFFERTA','BUSTA CHIUSA','SPAREGGIO BUSTA','APERTURA BUSTE']){title.textContent=label;f.tick();assert.equal(timer.classList.contains('liveasta-last3'),label!=='APERTURA BUSTE');}
});
