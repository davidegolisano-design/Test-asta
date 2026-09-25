/* Internal QA fixture only. The app entrypoint does not load this file. */
window.addEventListener('load',async()=>{
  const demo=window.premiumDemoBackend;
  const preview=new URLSearchParams(location.search);
  if(preview.get('entry')==='home'){document.body.dataset.premiumDemoReady='true';return;}
  if(preview.get('miniatures')==='premium')demo.setFeatures(['miniatures']);
  adminSessionPassword='demo-premium';
  roomsCache=[demo.room]; playersList=demo.players;
  auctioneerLockKey='demo-lock';auctioneerRoomMode='desktop';
  await connectToRoom(demo.room);
  myTeamId=demo.teamId;myTeamName='FC DEMO';
  teamsCache=demo.tables.fanta_teams;
  document.querySelector('#auction-room-pill b').textContent=demo.room.name;
  document.getElementById('view-auction').classList.add('auction-view-hidden');
  document.getElementById('view-list').style.display='flex';
  roomControlNavigationAuthorized=true;
  await openRoomControl(false);
  roomControlNavigationAuthorized=false;
  premium.decorate();
  const scene=preview.get('scene');
  if(scene){
    if(preview.get('free')!=='1'){
      demo.setFeatures(['sealed','random','turns','ready','budget','chat','miniatures']);
      await premium.refresh();
    }
    if(preview.get('mantra')==='1'){demo.room.game_mode='mantra';currentRoom.game_mode='mantra';}
    // Let the real heartbeat read its lock from the in-memory demo backend.
    // This keeps long-running visual checks on the board without touching live data.
    auctioneerLockKey=`liveasta_auctioneer_lock_${demo.room.id}`;
    auctioneerLockToken='demo-lock';
    await insertAuctioneerLock(auctioneerLockKey,auctioneerLockToken,demo.room);
    applyAuctioneerUiMode();
    roomControlNavigationAuthorized=true;
    if(scene!=='management')showScreen('screen-auctioneer-board');
    roomControlNavigationAuthorized=false;
    if(scene==='hybrid-turn'){
      auctioneerPlayerMode=true;auctioneerPlayerTeamId=demo.teamId;
      hybridPreferredView='board';configureHybridPlayerIdentity();syncHybridViewButtons();
    }
    if(scene==='turn'||scene==='hybrid-turn'){
      nominationState={...nominationState,enabled:true,role:'P',turn_team_id:demo.teamId,order_team_ids:teamsCache.map(t=>t.id)};
      nominationReady=true;currentAuctionPlayer=null;showNominationTurnStage();
    }
    if(scene==='auction'||scene==='ready'){
      currentAuctionPlayer={...demo.players[0],Nome:'PORTIERE DEMO',Squadra:'Parma'};
      restoreAuctioneerVisualFromState({player:{id:currentAuctionPlayer.Id,name:currentAuctionPlayer.Nome,role:'P',club:'Parma'}});
      if(scene==='ready'){readyGateWaiting=true;showAuctioneerReadyStage();}
      else{setMobileBoardPhase('normal');document.getElementById('countdown-display').textContent='12';document.getElementById('current-value-display').textContent='85';document.getElementById('winner-display').textContent='FC DEMO';}
    }
    if(scene==='management'){document.getElementById('mg-tab-participants').click();}
    if(scene==='list')refreshPlayerLists();
    window.refreshLiveAstaMobileBoardDev?.();
  }
  if(preview.get('request')==='open')premium.offer();
  if(['keeper','outfield'].includes(preview.get('portrait'))){
    const player=demo.players[preview.get('portrait')==='keeper'?0:1];
    const purchase={id:'qa-miniature',room_id:demo.room.id,team_id:demo.teamId,
      player_id:player.Id,player_name:player.Nome,role:player.R,club:player.Squadra,price:1};
    demo.tables.fanta_purchases.push(purchase);
    await loadRoomState();
    openRoomRosterPlayerPreview(purchase.id);
  }
  document.body.dataset.premiumDemoReady='true';
});
