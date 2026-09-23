/* Internal QA fixture only. The app entrypoint does not load this file. */
window.addEventListener('load',async()=>{
  const demo=window.premiumDemoBackend;
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
  document.body.dataset.premiumDemoReady='true';
});
