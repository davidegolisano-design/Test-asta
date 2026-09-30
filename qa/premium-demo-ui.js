/* Internal QA fixture only. The app entrypoint does not load this file. */
window.addEventListener('load',async()=>{
  const demo=window.premiumDemoBackend;
  const preview=new URLSearchParams(location.search);
  if(preview.get('scene')==='entry'){showScreen('screen-entry-role');document.body.dataset.premiumDemoReady='true';return;}
  if(preview.get('entry')==='home'){document.body.dataset.premiumDemoReady='true';return;}
  if(preview.get('miniatures')==='premium')demo.setFeatures(['miniatures']);
  if(preview.get('scene')==='onboarding')demo.tables.fanta_teams=[];
  if(preview.get('scene')==='sealed-ready-12'){
    const team=demo.tables.fanta_teams[0];
    demo.tables.fanta_teams=Array.from({length:12},(_,i)=>({...team,id:i?`qa-team-${i+1}`:team.id,name:`SQUADRA ${i+1}`}));
  }
  adminSessionPassword='demo-premium';
  roomsCache=[demo.room]; playersList=demo.players;
  auctioneerLockKey='demo-lock';auctioneerRoomMode='desktop';
  if(preview.get('scene')==='room-empty')demo.tables.fanta_app_data=demo.tables.fanta_app_data.filter(row=>row.key!==`room_listone_${demo.room.id}`);
  await connectToRoom(demo.room);
  await fetchListone();
  if(preview.get('scene')==='room-isolation'){
    const second={...demo.room,id:'00000000-0000-4000-8000-000000000102',name:'STANZA B'};
    demo.tables.fanta_rooms.push(second);
    demo.tables.fanta_app_data.push({key:`room_listone_${second.id}`,data:[{Id:'room-b-only',Nome:'CALCIATORE B',R:'D',Squadra:'Demo'}],file_name:'B.xlsx',updated_at:new Date().toISOString()});
    await connectToRoom(second);
    await fetchListone();
    const distinct=playersList.length===1&&playersList[0].Id==='room-b-only';
    await connectToRoom(demo.room);
    await fetchListone();
    document.body.dataset.roomListoneIsolation=distinct&&playersList[0]?.Id===demo.players[0].Id?'passed':'failed';
  }
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
      demo.setFeatures(['sealed','random','turns','ready','budget','chat','miniatures','roster_io']);
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
    if(scene==='hybrid-turn'||scene==='sealed-ready-12'){
      auctioneerPlayerMode=true;auctioneerPlayerTeamId=demo.teamId;
      hybridPreferredView='board';configureHybridPlayerIdentity();syncHybridViewButtons();
    }
    if(scene==='spectator'){
      auctioneerLockKey=null;auctioneerLockToken=null;
      const phase=preview.get('phase')||'active';
      const ids=teamsCache.map(t=>String(t.id));
      const state={phase,mode:['sealed','sealed_reveal'].includes(phase)?'sealed':'normal',
        player:{id:demo.players[0].Id,nome:demo.players[0].Nome,role:preview.get('mantra')==='1'?'Por':'P',club:'Bologna',fvm:28},
        winner:'FC DEMO',value:85,seconds:120,deadline_at:Date.now()+120000,
        ready_required_ids:ids,ready_ids:ids.slice(0,1),sealed_eligible_ids:ids,sealed_submitted_ids:ids.slice(0,1),
        normal_bid_ranking:[{team_id:ids[0],team_name:'FC DEMO',amount:85}]};
      demo.tables.fanta_app_data.push({key:`live_auction_${demo.room.id}`,data:state});
      myTeamId=null;myTeamName='';spectatorMode=true;
      document.getElementById('screen-auctioneer-board').classList.add('spectator-mode');
      applyAuctioneerUiMode();showScreen('screen-auctioneer-board');
      window.liveastaSpectatorView.render(state);
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
    if(scene==='sealed-ready-12'){
      readyModeEnabled=true;
      currentAuctionPlayer=demo.players[0];
      sealedAuctionModeActive=true;sealedAuctionToken='qa-sealed-12';sealedTimerSeconds=180;
      sealedEligibleIds=teamsCache.map(team=>String(team.id));
      beginReadyGate();
      readyPlayers=new Set(sealedEligibleIds.filter(id=>id!==String(myTeamId)));
      persistReadyGateState();
      hybridPreferredView='player';
      showScreen('screen-player-buzzer');
      showHybridPlayerForCurrentAuction();
      showHybridReadyIfNeeded();
    }
    if(scene==='my-roster'){
      auctioneerLockKey=null;auctioneerLockToken=null;
      document.getElementById('display-team-name').textContent=myTeamName;
      document.getElementById('player-room-inline').textContent=currentRoomCode;
      showScreen('screen-player-buzzer');
      togglePlayerRoster(true);
    }
    if(scene==='management'){document.getElementById('mg-tab-participants').click();}
    if(scene==='room-upload'){
      const book=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet([{Id:'qa-new',Nome:'NUOVO CALCIATORE',R:'P',Squadra:'Demo'}]),'Listone');
      const file=new File([XLSX.write(book,{bookType:'xlsx',type:'array'})],'stanza-demo.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      await uploadRoomListone(file);
      const row=demo.tables.fanta_app_data.find(r=>r.key===`room_listone_${demo.room.id}`);
      document.body.dataset.roomListoneUpload=row?.data?.[0]?.Id==='qa-new'&&playersList[0]?.Id==='qa-new'?'passed':'failed';
    }
    if(scene==='list'||scene==='onboarding'||scene==='room-empty')refreshPlayerLists();
    if(scene==='onboarding'){
      window.liveastaRoomOnboarding.prepare(demo.room);
      window.liveastaRoomOnboarding.open(demo.room,{
        getClient:()=>supabaseClient,canEdit:()=>!!auctioneerLockToken&&!!currentRoomId,
        onSaved:async()=>{await loadRoomState();renderOnlinePlayers();refreshPlayerLists();}
      });
    }
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
