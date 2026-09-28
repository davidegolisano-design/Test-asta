/* Screenshot fixture: real v1.07.17 presentation, fictional league, in-memory API only. */
window.addEventListener('DOMContentLoaded',async()=>{
 const demo=window.premiumDemoBackend,q=new URLSearchParams(location.search),phase=q.get('phase')||'active',view=q.get('view')||'host';
 const names=['FC IMPREVISTI','REAL BIRRETTA','ATLETICO DIVANO','GLI INTOCCABILI','MAI UNA GIOIA','ULTIMO RILANCIO','AC PICCHIA','DINAMO SPRITZ'];
 demo.room.name='LA LEGA DEGLI AMICI';
 demo.tables.fanta_teams=names.map((name,i)=>({id:'00000000-0000-4000-8000-'+String(201+i).padStart(12,'0'),room_id:demo.room.id,name,credits_remaining:[312,287,345,298,321,275,308,332][i]}));
 demo.players[1].FVM=38;
 const mantra=q.get('mode')==='mantra';demo.room.game_mode=mantra?'mantra':'classic';
 demo.setFeatures(['sealed','random','turns','ready','budget','chat','miniatures','roster_io']);
 roomsCache=[demo.room];playersList=demo.players;myTeamId=demo.teamId;myTeamName=names[0];
 await connectToRoom(demo.room);await fetchListone();await premium.refresh();await loadRoomState();
 teamsCache=demo.tables.fanta_teams;auctioneerRoomMode='desktop';
 currentAuctionPlayer=demo.players[1];
 const ids=teamsCache.map(t=>String(t.id));
 for(const t of teamsCache)onlinePlayers.set(String(t.id),{team_id:String(t.id),team_name:t.name,presence_at:Date.now(),last_seen:Date.now(),from_presence:true});
 auctioneerLockKey=`liveasta_auctioneer_lock_${demo.room.id}`;auctioneerLockToken='screenshot-only';
 await insertAuctioneerLock(auctioneerLockKey,auctioneerLockToken,demo.room);
 applyAuctioneerUiMode();
 document.querySelector('#auction-room-pill b').textContent=demo.room.name;
 const state={phase,mode:['sealed','sealed_reveal'].includes(phase)?'sealed':'normal',player:{id:currentAuctionPlayer.Id,nome:currentAuctionPlayer.Nome,role:mantra?currentAuctionPlayer.RM:currentAuctionPlayer.R,club:currentAuctionPlayer.Squadra,fvm:38},winner:names[1],value:42,seconds:phase==='sealed'?24:phase==='sealed_reveal'?3:8,ready_token:'photo-ready',ready_required_ids:ids,ready_ids:ids.slice(1,6),sealed_token:'photo-sealed',sealed_seconds:40,sealed_eligible_ids:ids,sealed_submitted_ids:ids.slice(1,6),normal_bid_ranking:[{team_id:ids[1],team_name:names[1],amount:42},{team_id:ids[0],team_name:names[0],amount:40},{team_id:ids[3],team_name:names[3],amount:38}]};
 liveAuctionState=state;currentAuctionValue=42;currentWinner=names[1];
 if(view==='player'){
  auctioneerLockKey=null;auctioneerLockToken=null;
  document.getElementById('display-team-name').textContent=myTeamName;
  document.getElementById('player-room-inline').textContent=demo.room.name;
  showScreen('screen-player-buzzer');
  await restorePlayerFromLiveState(state);
  stopPlayerSealedCountdown();
  document.getElementById('player-countdown').textContent=phase==='sealed'?'24':phase==='sealed_reveal'?'3':phase==='ready'?'--':phase==='ended'?'0':'8';
 }else{
  showScreen('screen-auctioneer-board');
  window.liveastaSpectatorView.render(state);
  renderOnlinePlayers();
 }
 if(q.get('theme')==='light')setLiveAstaTheme('light-neutral');
 window.fitAuctionNames?.();window.updateLiveAstaTeamCards?.();window.refreshLiveAstaMobileBoardDev?.();
 document.body.dataset.captureReady='true';
});
