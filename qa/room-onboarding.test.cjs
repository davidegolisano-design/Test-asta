const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {parseHTML}=require('linkedom');
const source=fs.readFileSync('scripts/room-onboarding.js','utf8');
function setup(){
 const {window}=parseHTML('<html><body><div id="screen-auctioneer-board"></div></body></html>'),values=new Map();
 const ctx=vm.createContext({window,document:window.document,MutationObserver:window.MutationObserver,crypto:require('node:crypto').webcrypto,innerWidth:390,
  localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}});
 window.HTMLElement.prototype.showModal=function(){this.open=true;};
 window.HTMLElement.prototype.close=function(){this.open=false;this.dispatchEvent(new window.Event('close'));};
 vm.runInContext(source,ctx);return {api:window.liveastaRoomOnboarding,window,document:window.document};
}
test('skipping the tour opens team setup and drafts survive closing',()=>{
 const {api,window,document}=setup(),room={id:'room',name:'Test',initial_credits:500};
 api.prepare(room);api.open(room,{canEdit:()=>true});
 assert.match(document.querySelector('h2').textContent,/stanza è pronta/);
 document.querySelector('[data-action="skip"]').click();
 assert.match(document.querySelector('h2').textContent,/Quante squadre/);
 document.querySelector('#onboarding-count').value='3';
 document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(document.querySelectorAll('[data-team]').length,3);
 document.querySelector('[data-team]').value='Squadra personalizzata';
 document.querySelector('[data-team]').dispatchEvent(new window.Event('input',{bubbles:true}));
 document.querySelector('dialog').close();api.open(room,{canEdit:()=>true});
 assert.equal(document.querySelector('[data-team]').value,'Squadra personalizzata');
});
test('a lost response can be retried without duplicating saved teams',async()=>{
 const {api}=setup(),rows=[],room={id:'room',initial_credits:600},teams=[{id:'one',name:'Uno'},{id:'two',name:'Due'}];let calls=0,owner=true;
 const client={from:()=>({select:()=>({eq:async()=>({data:rows,error:null})}),insert:async batch=>{calls++;rows.push(...batch);return {error:new Error('response lost')};}})};
 const adapter={getClient:()=>client,canEdit:()=>owner};
 await assert.rejects(api.saveTeams(room,teams,adapter));
 await api.saveTeams(room,teams,adapter);
 assert.equal(calls,1);assert.equal(rows.length,2);assert.equal(rows[0].credits_remaining,600);
 await assert.rejects(api.saveTeams(room,[{id:'three',name:'uno'}],adapter),/già una squadra/);
 owner=false;await assert.rejects(api.saveTeams(room,teams,adapter),/scaduta/);
});
test('new room joins as auctioneer before starting onboarding; occupied rooms stay blocked',async()=>{
 const app=fs.readFileSync('scripts/app.js','utf8');
 const fn=app.slice(app.indexOf('        async function joinAsAuctioneer()'),app.indexOf('        async function handleNominationSubmission'));
 const actions=[],element={value:'demo',innerText:'',style:{},classList:{add(){},remove(){},contains(){return true;}}};
 const room={id:'new-room',name:'Nuova',approved:true,timer_seconds:8};
 const ctx={document:{getElementById:()=>element,querySelector:()=>element},window:{liveastaRoomOnboarding:{prepare:()=>actions.push('prepare'),hasDraft:()=>true,open:()=>actions.push('open')}},
  auctioneerRoomMode:'create',LIVEASTA_TIMER_DEFAULTS:{auction:8},listoneHasMantraRoles:()=>true,createRoom:async()=>room,acquireAuctioneerRoomLock:async()=>true,
  connectToRoom:async r=>{ctx.currentRoom=r;ctx.currentRoomCode=r.name;actions.push('connect');},auctioneerPlayerMode:false,nominationState:{enabled:false},
  showScreen:id=>actions.push(id),restoreAuctioneerFromLiveState:async()=>false};
 for(const name of ['loadAuctionedPlayers','loadRoomState','loadAbsentTeams','loadAudioRoutingSettings','loadAuctioneerPlayerMode','loadNominationState','loadAuctionPrepSeconds','loadRoomAuctionExtraSettings','loadReadyMode','loadSealedTimerSeconds','loadSealedRevealSeconds','hideNominationStage','refreshPlayerLists','subscribeCommonRoomEvents'])ctx[name]=()=>{};
 vm.createContext(ctx);vm.runInContext(fn,ctx);await ctx.joinAsAuctioneer();
 assert.deepEqual(actions,['prepare','connect','screen-auctioneer-board','open']);
 actions.length=0;ctx.acquireAuctioneerRoomLock=async()=>false;await ctx.joinAsAuctioneer();assert.deepEqual(actions,['prepare']);
});
