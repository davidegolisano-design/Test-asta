// LIVEASTA v1.03 — short-lived session resume after accidental close/reload.
(function(){
  if(window.__liveastaSessionResumeLoaded)return;
  window.__liveastaSessionResumeLoaded=true;

  const STORAGE_KEY='liveasta_resume_session_v1';
  const SESSION_TTL_MS=30*60*1000;
  const HEARTBEAT_MS=20*1000;
  const PLAYER_RETRY_MS=2500;
  const PLAYER_RETRY_WINDOW_MS=25000;

  let resumeInProgress=false;

  function now(){return Date.now();}

  function readSession(){
    try{
      const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      if(!raw || !['player','auctioneer'].includes(raw.role))return null;
      const expires=Number(raw.expires_at)||0;
      if(!expires || expires<=now()){
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return raw;
    }catch(_){
      return null;
    }
  }

  function writeSession(session){
    if(!session)return;
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(session));}catch(_){}
  }

  function clearSession(){
    try{localStorage.removeItem(STORAGE_KEY);}catch(_){}
  }

  function currentScreenId(){
    return document.querySelector('.screen.active')?.id||'';
  }

  function buildSessionBase(role){
    const stamp=now();
    return {
      version:1,
      role,
      room_id:String(currentRoomId||''),
      room_name:String(currentRoomCode||currentRoom?.name||''),
      last_active:stamp,
      expires_at:stamp+SESSION_TTL_MS,
      screen:currentScreenId()
    };
  }

  function savePlayerSession(roomPassword,pin){
    if(!currentRoomId||!myTeamId)return;
    writeSession({
      ...buildSessionBase('player'),
      room_password:String(roomPassword||''),
      team_id:String(myTeamId),
      team_name:String(myTeamName||''),
      pin:String(pin||'')
    });
  }

  function saveAuctioneerSession(roomPassword){
    if(!currentRoomId||!auctioneerLockKey||!auctioneerLockToken)return;
    let deviceMode='desktop';
    try{
      deviceMode=document.documentElement.dataset.auctioneerUi||localStorage.getItem('liveasta_auctioneer_ui')||'desktop';
    }catch(_){}
    writeSession({
      ...buildSessionBase('auctioneer'),
      room_password:String(roomPassword||''),
      lock_key:String(auctioneerLockKey||''),
      lock_token:String(auctioneerLockToken||''),
      device_mode:deviceMode==='mobile'?'mobile':'desktop'
    });
  }

  function touchSession(force=false){
    const session=readSession();
    if(!session||!currentRoomId)return;
    if(String(session.room_id)!==String(currentRoomId))return;
    if(!force && document.visibilityState==='hidden')return;

    const stamp=now();
    session.last_active=stamp;
    session.expires_at=stamp+SESSION_TTL_MS;
    session.room_name=String(currentRoomCode||currentRoom?.name||session.room_name||'');
    session.screen=currentScreenId()||session.screen||'';

    if(session.role==='player'){
      if(myTeamId)session.team_id=String(myTeamId);
      if(myTeamName)session.team_name=String(myTeamName);
    }else if(session.role==='auctioneer'){
      if(auctioneerLockKey)session.lock_key=String(auctioneerLockKey);
      if(auctioneerLockToken)session.lock_token=String(auctioneerLockToken);
      try{
        const mode=document.documentElement.dataset.auctioneerUi||localStorage.getItem('liveasta_auctioneer_ui');
        if(mode)session.device_mode=mode==='mobile'?'mobile':'desktop';
      }catch(_){}
    }
    writeSession(session);
  }

  function ensureSelectOption(select,room){
    if(!select||!room)return;
    const id=String(room.id);
    if(!Array.from(select.options||[]).some(option=>String(option.value)===id)){
      select.add(new Option(String(room.name||id),id));
    }
    select.value=id;
  }

  async function prepareCommonRoomFields(room,password,kind){
    await loadShowRoomsSetting();
    if(showRoomsToUsers){
      try{await loadRooms();}catch(_){}
      const select=document.getElementById(kind==='player'?'player-room-select':'auction-room-select');
      ensureSelectOption(select,room);
    }else{
      const input=document.getElementById(kind==='player'?'player-room-name-input':'auction-room-name-input');
      if(input)input.value=String(room.name||'');
    }
    const passwordInput=document.getElementById(kind==='player'?'player-room-password':'auction-room-password');
    if(passwordInput)passwordInput.value=String(password||'');
  }

  async function validateStoredRoom(session){
    const room=await getRoomById(session.room_id);
    if(!room)throw Object.assign(new Error('Stanza non disponibile.'),{invalidateResume:true});
    if(room.approved!==true)throw Object.assign(new Error('Stanza non approvata.'),{invalidateResume:true});
    if(String(room.password||'')!==String(session.room_password||'')){
      throw Object.assign(new Error('Password stanza modificata.'),{invalidateResume:true});
    }
    return room;
  }

  async function preparePlayerFields(session,room){
    await prepareCommonRoomFields(room,session.room_password,'player');

    const teamSelect=document.getElementById('player-team-select');
    if(teamSelect){
      teamSelect.innerHTML='';
      teamSelect.add(new Option(String(session.team_name||'Squadra'),String(session.team_id||'')));
      teamSelect.value=String(session.team_id||'');
      teamSelect.disabled=false;
    }

    playerPinMode='verify';
    playerPinTeamId=String(session.team_id||'');
    playerPinRoomId=String(room.id);

    const panel=document.getElementById('player-pin-panel');
    const pin=document.getElementById('player-pin');
    const confirm=document.getElementById('player-pin-confirm');
    if(panel)panel.style.display='block';
    if(pin)pin.value=String(session.pin||'');
    if(confirm){confirm.value='';confirm.style.display='none';}
  }

  function playerResumeFailedBecausePin(){
    const text=String(document.getElementById('player-pin-error')?.textContent||'').toLowerCase();
    return text.includes('pin errato') || text.includes('pin non riuscita') || text.includes('impostato da un altro');
  }

  async function resumePlayer(session,originalJoinPlayer){
    if(!/^\d{6}$/.test(String(session.pin||'')) || !session.team_id){
      throw Object.assign(new Error('Credenziali di rientro incomplete.'),{invalidateResume:true});
    }

    const room=await validateStoredRoom(session);
    try{await fetchListone();}catch(_){}

    const deadline=now()+PLAYER_RETRY_WINDOW_MS;
    let first=true;
    do{
      if(!first)await new Promise(resolve=>setTimeout(resolve,PLAYER_RETRY_MS));
      first=false;

      await preparePlayerFields(session,room);
      await originalJoinPlayer();

      if(String(currentRoomId||'')===String(room.id) && String(myTeamId||'')===String(session.team_id)){
        savePlayerSession(session.room_password,session.pin);
        touchSession(true);
        return true;
      }

      if(playerResumeFailedBecausePin()){
        throw Object.assign(new Error('PIN non più valido.'),{invalidateResume:true});
      }
    }while(now()<deadline);

    throw new Error('Squadra ancora occupata o connessione non disponibile.');
  }

  async function resumeAuctioneer(session,originalJoinAuctioneer){
    if(!session.lock_token)throw Object.assign(new Error('Sessione banditore incompleta.'),{invalidateResume:true});

    const room=await validateStoredRoom(session);
    try{await fetchListone();}catch(_){}

    applyAuctioneerUiMode();
    auctioneerRoomMode='join';
    await prepareCommonRoomFields(room,session.room_password,'auctioneer');

    const originalAcquire=acquireAuctioneerRoomLock;
    acquireAuctioneerRoomLock=async function(roomToAcquire){
      const key=`liveasta_auctioneer_lock_${roomToAcquire.id}`;
      try{
        const row=await readAuctioneerLock(key);
        if(row && String(row?.data?.token||'')===String(session.lock_token||'')){
          auctioneerLockKey=key;
          auctioneerLockToken=String(session.lock_token);
          auctioneerLockLostHandled=false;
          startAuctioneerLockHeartbeat();
          return true;
        }
      }catch(_){}
      return await originalAcquire(roomToAcquire);
    };

    try{
      await originalJoinAuctioneer();
    }finally{
      acquireAuctioneerRoomLock=originalAcquire;
    }

    if(String(currentRoomId||'')!==String(room.id) || !auctioneerLockKey){
      throw new Error('Rientro banditore non disponibile.');
    }

    saveAuctioneerSession(session.room_password);
    touchSession(true);

    // Ripristina anche la pagina principale in cui si trovava il banditore.
    if(session.screen==='screen-room-control' && typeof openRoomControl==='function'){
      try{await openRoomControl(false);}catch(_){}
    }else if(session.screen==='screen-all-rosters' && typeof openAllRosters==='function'){
      try{await openAllRosters();}catch(_){}
    }
    return true;
  }

  const originalJoinPlayer=joinAsPlayer;
  joinAsPlayer=async function(){
    const password=String(document.getElementById('player-room-password')?.value||'');
    const pin=String(document.getElementById('player-pin')?.value||'');
    const expectedTeam=String(document.getElementById('player-team-select')?.value||'');
    const result=await originalJoinPlayer.apply(this,arguments);
    if(currentRoomId && myTeamId && String(myTeamId)===expectedTeam){
      savePlayerSession(password,pin);
    }
    return result;
  };

  const originalJoinAuctioneer=joinAsAuctioneer;
  joinAsAuctioneer=async function(){
    const password=String(document.getElementById(auctioneerRoomMode==='create'?'auction-new-room-password':'auction-room-password')?.value||'');
    const result=await originalJoinAuctioneer.apply(this,arguments);
    if(currentRoomId && auctioneerLockKey && auctioneerLockToken){
      saveAuctioneerSession(password);
    }
    return result;
  };

  const originalLeaveCurrentSession=leaveCurrentSession;
  leaveCurrentSession=async function(){
    const hadRoom=!!currentRoomId;
    const result=await originalLeaveCurrentSession.apply(this,arguments);
    if(hadRoom && !currentRoomId)clearSession();
    return result;
  };

  if(typeof forceAuctioneerExitAfterLockLoss==='function'){
    const originalForceAuctioneerExit=forceAuctioneerExitAfterLockLoss;
    forceAuctioneerExitAfterLockLoss=async function(){
      clearSession();
      return await originalForceAuctioneerExit.apply(this,arguments);
    };
  }

  async function attemptResume(){
    if(resumeInProgress||currentRoomId)return;
    const session=readSession();
    if(!session)return;

    resumeInProgress=true;
    try{
      if(session.role==='player')await resumePlayer(session,originalJoinPlayer);
      else await resumeAuctioneer(session,originalJoinAuctioneer);
    }catch(error){
      console.warn('Ripristino sessione LIVEASTA non riuscito',error);
      if(error?.invalidateResume)clearSession();
      try{
        if(!currentRoomId)showScreen('screen-role');
      }catch(_){}
    }finally{
      resumeInProgress=false;
    }
  }

  setInterval(()=>touchSession(false),HEARTBEAT_MS);
  window.addEventListener('pagehide',()=>touchSession(true));
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')touchSession(false);
  });

  window.liveastaClearResumeSession=clearSession;
  window.liveastaResumeSessionNow=attemptResume;
  window.liveastaSessionResumeMinutes=SESSION_TTL_MS/60000;

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(attemptResume,120),{once:true});
  }else{
    setTimeout(attemptResume,120);
  }
})();
