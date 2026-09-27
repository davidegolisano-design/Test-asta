const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(process.env.LIVEASTA_TEST_APP || 'scripts/app.js','utf8');
const syncSource=fs.readFileSync('scripts/auction-state-sync.js','utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
const ids=Array.from({length:12},(_,i)=>`team-${i+1}`);
const flush=async()=>{for(let i=0;i<25;i++)await Promise.resolve();};

function functions(ctx,names){
  for(const name of names){
    const start=source.search(new RegExp(`        (?:async )?function ${name}\\(`));
    if(start<0)continue; // Allows the regression to run against the previous release.
    const end=source.indexOf('\n        }',start)+10;
    vm.runInContext(source.slice(start,end),ctx,{filename:`app.js:${name}`});
  }
}

function database(){
  const rows=new Map(),pending=[];
  const client={from:()=>({
    upsert(record){return new Promise(resolve=>pending.push({record:clone(record),resolve}));},
    select(){return this;},eq(_field,key){this.key=key;return this;},
    async maybeSingle(){return {data:rows.has(this.key)?{data:clone(rows.get(this.key))}:null,error:null};}
  })};
  async function drain(){
    // Complete newest requests first: reproduces real out-of-order HTTP completion.
    for(let i=0;i<1000;i++){
      await flush();
      if(!pending.length)return;
      const request=pending.pop();
      rows.set(request.record.key,request.record.data);
      request.resolve({error:null});
    }
    throw new Error('Snapshot queue did not settle');
  }
  return {rows,pending,client,drain};
}

function context(db){
  const nodes=new Map(),handlers=new Map(),broadcasts=[],timers=[];
  const node=id=>{
    if(!nodes.has(id)){
      const classes=new Set();
      nodes.set(id,{textContent:'',innerText:'',style:{setProperty(){},removeProperty(){}},dataset:{},
        setAttribute(){},classList:{add:(...v)=>v.forEach(x=>classes.add(x)),remove:(...v)=>v.forEach(x=>classes.delete(x)),
          contains:x=>classes.has(x),toggle(x,on){if(on)classes.add(x);else classes.delete(x);}}});
    }
    return nodes.get(id);
  };
  const ctx={console,Date,Promise,Set,Map,JSON,Math,Number,String,Array,
    currentRoomId:'room',myTeamId:ids[0],myTeamName:'Team 1',currentRoom:{timer_seconds:8},
    currentAuctionPlayer:{Id:'player',Nome:'Demo',R:'P',Squadra:'Club'},playersList:[{Id:'player',Nome:'Demo',R:'P',Squadra:'Club'}],
    readyGateWaiting:false,readyGateToken:null,readyPlayers:new Set(),readySkipPlayers:new Set(),readyOfflineExcludedIds:new Set(),
    playerReadyToken:null,playerReadySent:false,playerReadyChoice:null,playerReadyRequiredIds:[],playerReadyIds:[],playerReadyDismissedToken:null,
    playerAvailabilityMode:'online',absentTeamIds:new Set(),playerSkippedCurrentAuction:false,
    sealedAuctionModeActive:true,sealedAuctionToken:'sealed-round-1',sealedTimerSeconds:40,sealedRound:1,sealedEligibleIds:ids,
    sealedEnding:false,sealedDeadlineAt:0,sealedBids:new Map(),sealedTimerInterval:null,
    playerSealedMode:false,playerSealedToken:null,playerSealedStartedToken:null,playerSealedSubmitted:false,
    playerSealedRevealLocalEndAt:0,playerSealedRevealDeadlineAt:0,playerPendingSealedResult:null,
    playerPrepInterval:null,playerHasBidThisAuction:false,isAuctionActive:false,liveAuctionState:null,
    currentWinner:'',currentAuctionValue:0,nominationReady:false,nominationRequestPending:false,
    LIVEASTA_TIMER_DEFAULTS:{sealed:40,prep:3,auction:8},supabaseClient:db.client,
    document:{getElementById:node},setInterval:fn=>(timers.push(fn),timers.length),clearInterval(){},
    setTimeout:fn=>(timers.push(fn),timers.length),clearTimeout(){},
    roomDebug:{record(){}},readyRequiredIds:()=>ids,
    livePlayerSnapshot:()=>({id:'player',nome:'Demo',role:'P',club:'Club',fvm:20}),
    isAuctioneerPlayerIdentity:()=>false,isMyNominationTurn:()=>false,
    loadRoomState:async()=>{},loadNominationState:async()=>{},loadReadyMode:async()=>{},
    preparePlayerSealedControls:enabled=>{ctx.sealedControls=enabled;},
    setPlayerReadyChoiceControls:enabled=>{ctx.readyControls=enabled;},
    startPlayerSealedCountdownSeconds:seconds=>{ctx.countdown=seconds;ctx.countdownStarts++;},
    countdownStarts:0,playerRemainingFromLiveState:s=>s.seconds,safeSealedSeconds:n=>n,
    normalLiveRemainingSeconds:s=>s.seconds,
    setPlayerBidButtonsEnabled:enabled=>{ctx.normalControls=enabled;},
    endAuction:async()=>{ctx.ended=true;},startCountdown:()=>{ctx.normalStarted=true;},
    channel:{on(_type,filter,fn){handlers.set(filter.event,fn);return this;},subscribe(){return this;},
      send(message){broadcasts.push(clone(message));return Promise.resolve('ok');}}
  };
  for(const name of ['setPlayerImage','setPhonePlayerDisplayName','closeNominationPicker','updateNominationUI',
    'renderCurrentPlayerPriority','refreshPlayerListoneIfOpen','setPlayerAuctionVisualState','stopPlayerSealedCountdown',
    'updatePlayerTeamStatus','clearSealedBidRanking','playSound','renderPlayerReadySidePanel','showAuctioneerReadyStage',
    'showSealedAuctionStage','showAuctionPanels','applyLivePlayerBase','autoOpenNominationPicker',
    'clearPlayerNormalBidCooldown','hybridStartSealedRound','showScreen','broadcastNominationState'])ctx[name]=()=>{};
  vm.createContext(ctx);vm.runInContext(syncSource,ctx);
  ctx.playerStateGuard=ctx.LiveAstaAuctionSync.createPlayerStateGuard();
  ctx.saveAuctionSnapshot=ctx.LiveAstaAuctionSync.createSnapshotWriter(async record=>{
    const {error}=await db.client.from().upsert(record);if(error)throw error;
  });
  functions(ctx,['readyGateStateKey','readyGateSnapshot','saveReadyGateDedicated','loadReadyGateState','closeReadyGateDedicated',
    'beginReadyGate','persistReadyGateState','broadcastReadyState','updateReadyGateDisplay','evaluateReadyGate',
    'showPlayerReadyBanner','closePlayerReadyBanner','updatePlayerReadyProgress','confirmPlayerReady',
    'liveAuctionStateKey','saveLiveAuctionState','loadLiveAuctionState','restorePlayerReadyGateFirst','restorePlayerFromLiveState',
    'liveStateForBroadcast','startSealedAuctionTimer','subscribeCommonRoomEvents']);
  return {ctx,nodes,handlers,broadcasts,timers};
}

function player(db,id=ids[0]){
  const p=context(db);p.ctx.myTeamId=id;
  const start=source.indexOf("                channel.on('broadcast', { event: 'new_player' }");
  const end=source.indexOf('                playerChannel.subscribe(',start);
  vm.runInContext(source.slice(start,end),p.ctx);
  return p;
}

const ready=(token='ready-1')=>({phase:'ready',mode:'sealed',ready_token:token,ready_required_ids:ids,ready_ids:[],
  player:{id:'player',nome:'Demo',role:'P'},sealed_token:'sealed-round-1',updated_at:'2026-09-27T17:00:00.000Z'});
const sealed=()=>({...ready(),phase:'sealed',ready_token:null,completed_ready_token:'ready-1',sealed_eligible_ids:ids,
  sealed_submitted_ids:[],seconds:40,updated_at:'2026-09-27T17:00:01.000Z'});
const gate=()=>({...ready(),active:true,token:'ready-1',required_ids:ids});

test('12 simultaneous READY replies leave the gate closed and all players in sealed bidding, even with reordered writes',async()=>{
  const db=database(),host=context(db),players=ids.map(id=>player(db,id));
  host.ctx.subscribeCommonRoomEvents();host.ctx.beginReadyGate();
  for(const p of players){
    p.ctx.showPlayerReadyBanner({...ready(host.ctx.readyGateToken)});
    p.ctx.channel.send=async message=>host.handlers.get(message.event)?.({payload:message.payload});
  }
  for(const p of players)p.ctx.confirmPlayerReady();
  await db.drain();
  assert.equal(db.rows.get('ready_gate_room').active,false);
  assert.equal(db.rows.get('live_auction_room').phase,'sealed');
  assert.equal(host.broadcasts.filter(x=>x.event==='sealed_bid_start').length,1);
  const start=host.broadcasts.find(x=>x.event==='sealed_bid_start');
  for(const p of players){
    p.handlers.get('sealed_bid_start')({payload:start.payload});
    await p.ctx.restorePlayerFromLiveState();
    assert.equal(p.ctx.readyControls,false);
    assert.equal(p.ctx.sealedControls,true);
    assert.equal(p.nodes.get('player-auction-title').textContent,'BUSTA CHIUSA');
  }
});

test('a cold reconnect prefers the live sealed phase over a stale active READY row',async()=>{
  const db=database(),p=player(db);
  db.rows.set('ready_gate_room',gate());db.rows.set('live_auction_room',sealed());
  await p.ctx.restorePlayerFromLiveState();
  assert.equal(p.ctx.readyControls,false);assert.equal(p.ctx.sealedControls,true);
});

test('a delayed READY read cannot replace a sealed-start event already displayed',async()=>{
  const db=database(),p=player(db);
  p.ctx.showPlayerReadyBanner(ready());
  let release;
  p.ctx.loadReadyGateState=()=>new Promise(resolve=>{release=resolve;});
  const restoring=p.ctx.restorePlayerFromLiveState(ready());await flush();
  p.handlers.get('sealed_bid_start')({payload:{token:'sealed-round-1',ready_token:'ready-1',eligible_ids:ids,seconds:40}});
  release(gate());await restoring;
  assert.equal(p.ctx.readyControls,false);assert.equal(p.ctx.sealedControls,true);
  assert.equal(p.nodes.get('player-auction-title').textContent,'BUSTA CHIUSA');
});

test('late READY snapshots stay closed but a new tie-break READY token is accepted',async()=>{
  const db=database(),p=player(db);
  p.ctx.showPlayerReadyBanner(ready());
  p.handlers.get('sealed_bid_start')({payload:{token:'sealed-round-1',ready_token:'ready-1',eligible_ids:ids,seconds:40}});
  await p.ctx.restorePlayerFromLiveState(ready());
  p.ctx.showPlayerReadyBanner(ready());
  assert.equal(p.ctx.readyControls,false);
  await p.ctx.restorePlayerFromLiveState({...ready('ready-2'),sealed_token:'sealed-round-2'});
  assert.equal(p.ctx.readyControls,true);assert.equal(p.ctx.playerReadyToken,'ready-2');
});

test('the sealed-start retry and live snapshot preserve a submitted bid and do not restart its countdown',async()=>{
  const db=database(),p=player(db);
  const event={payload:{token:'sealed-round-1',ready_token:'ready-1',eligible_ids:ids,seconds:40}};
  p.handlers.get('sealed_bid_start')(event);
  p.ctx.playerSealedSubmitted=true;p.ctx.sealedControls=false;
  p.handlers.get('sealed_bid_start')(event);
  assert.equal(p.ctx.countdownStarts,1);assert.equal(p.ctx.playerSealedSubmitted,true);assert.equal(p.ctx.sealedControls,false);
  await p.ctx.restorePlayerFromLiveState(sealed());
  assert.equal(p.ctx.playerSealedSubmitted,true);assert.equal(p.ctx.sealedControls,false);
});

test('closing READY blocks delayed restores for normal bidding as well',async()=>{
  const db=database(),p=player(db);p.ctx.showPlayerReadyBanner(ready());
  p.handlers.get('ready_state')({payload:{token:'ready-1',waiting:false}});
  await p.ctx.restorePlayerFromLiveState(ready());
  assert.equal(p.ctx.readyControls,false);
  await p.ctx.restorePlayerFromLiveState({...sealed(),phase:'active',mode:'normal',value:1,winner:'Team',seconds:8});
  assert.equal(p.ctx.isAuctionActive,true);assert.equal(p.ctx.normalControls,true);
});

test('all SKIP remains unsold; one READY among 11 SKIP starts a sealed auction for all 12',async()=>{
  for(const allSkip of [true,false]){
    const db=database(),host=context(db);host.ctx.subscribeCommonRoomEvents();host.ctx.beginReadyGate();
    ids.forEach((id,i)=>host.handlers.get('player_ready')({payload:{token:host.ctx.readyGateToken,team_id:id,choice:allSkip||i?'skip':'ready'}}));
    await db.drain();
    assert.equal(db.rows.get('ready_gate_room').active,false);
    assert.equal(!!host.ctx.ended,allSkip);
    if(!allSkip){assert.equal(db.rows.get('live_auction_room').phase,'sealed');assert.equal(host.ctx.sealedEligibleIds.length,12);}
  }
});

test('snapshot failures are reported and do not block a later close or another room',async()=>{
  const ctx=vm.createContext({});vm.runInContext(syncSource,ctx);
  const writes=[];let fail;
  const save=ctx.LiveAstaAuctionSync.createSnapshotWriter(record=>{
    writes.push(record);
    if(writes.length===1)return new Promise((_resolve,reject)=>{fail=reject;});
    return Promise.resolve();
  });
  const first=save({key:'a',data:{active:true}}).catch(error=>error.message);
  const close=save({key:'a',data:{active:false}}),other=save({key:'b',data:{active:false}});
  await other;fail(new Error('network'));assert.equal(await first,'network');await close;
  assert.equal(writes.at(-1).data.active,false);
});

test('host reconnect replies use memory without writes and cannot replay a stale database READY gate',async()=>{
  const db=database(),host=context(db);host.ctx.subscribeCommonRoomEvents();
  db.rows.set('ready_gate_room',gate());host.ctx.liveAuctionState=sealed();
  await host.handlers.get('live_state_request')();
  assert.equal(db.pending.length,0);assert.equal(host.broadcasts.some(x=>x.event==='ready_gate_state'),false);
  assert.equal(host.broadcasts.find(x=>x.event==='live_state').payload.phase,'sealed');
});
