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
  roomControlNavigationAuthorized=true;
  await openRoomControl(false);
  roomControlNavigationAuthorized=false;
  premium.decorate();
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
