/* This file is included only in the isolated, explicitly labelled demo page. */
window.addEventListener('load',async()=>{
  const demo=window.premiumDemoBackend;
  adminSessionPassword='demo-premium';
  roomsCache=[demo.room]; playersList=demo.players;
  auctioneerLockKey='demo-lock';auctioneerRoomMode='desktop';
  await connectToRoom(demo.room);
  myTeamId=demo.teamId;myTeamName='FC DEMO';
  teamsCache=demo.tables.fanta_teams;
  const bar=document.createElement('nav');bar.id='premium-demo-bar';bar.setAttribute('aria-label','Controlli della demo isolata');
  bar.innerHTML='<strong>DEMO ISOLATA · DATI FITTIZI</strong><div><button data-demo-scene="home">Home</button><button data-demo-scene="management">Gestione</button><button data-demo-scene="player">Giocatore</button><button data-demo-scene="admin">Superuser</button><button id="premium-demo-mode">Classic ⇄ Mantra</button></div>';
  document.body.append(bar);
  const style=document.createElement('style');style.textContent='#premium-demo-bar{position:fixed;bottom:0;left:0;right:0;z-index:190000;background:#ffcf32;color:#2c2100;padding:8px;text-align:center;font:700 10px/1.4 system-ui;box-shadow:0 -3px 15px #0003}#premium-demo-bar>div{display:flex;justify-content:center;gap:5px;flex-wrap:wrap;margin-top:5px}#premium-demo-bar button{border:1px solid #9e7800;background:#fff9d9;color:#2c2100;min-height:32px;padding:5px 9px;border-radius:5px;font:700 11px/1.3 system-ui}body{padding-bottom:90px!important}#screen-room-control{padding-bottom:90px!important}';document.head.append(style);
  async function scene(which){
    roomControlNavigationAuthorized=true;
    if(which==='home')showScreen('screen-role');
    if(which==='management')await openRoomControl(false);
    if(which==='player'){showScreen('screen-player-buzzer');updatePlayerTeamStatus();}
    if(which==='admin'){showScreen('screen-admin');renderAdminRooms();await premium.openAdmin(demo.room.id);}
    roomControlNavigationAuthorized=false;
    premium.decorate();
  }
  bar.querySelectorAll('[data-demo-scene]').forEach(btn=>btn.onclick=()=>scene(btn.dataset.demoScene));
  document.getElementById('premium-demo-mode').onclick=async()=>{
    demo.room.game_mode=demo.room.game_mode==='mantra'?'classic':'mantra';
    currentRoom=demo.room;await scene('management');
  };
  window.premiumDemoScene=scene;
  await scene('management');
  document.body.dataset.premiumDemoReady='true';
});
