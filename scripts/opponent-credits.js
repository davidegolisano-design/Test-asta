// LIVEASTA v1.03 — per-room visibility of opponents' remaining credits.
(function(){
  if(window.__liveastaOpponentCreditsLoaded)return;
  window.__liveastaOpponentCreditsLoaded=true;

  let opponentCreditsVisible=true;
  let loadedForKey='';
  let activeRosterTeamId='';

  function settingKey(){
    return currentRoomId?`liveasta_opponent_credits_${currentRoomId}`:'';
  }

  function updateControlUI(){
    const button=document.getElementById('opponent-credits-toggle-btn');
    const status=document.getElementById('opponent-credits-status');
    if(button){
      button.checked=!opponentCreditsVisible;
    }
    if(status){
      status.textContent=opponentCreditsVisible
        ?'I giocatori vedono i crediti residui delle altre squadre nel menu Stanza.'
        :'I giocatori vedono i propri crediti, ma non quelli delle altre squadre.';
    }
  }

  function injectManagementControl(){
    if(document.getElementById('opponent-credits-control-card')){
      updateControlUI();
      return;
    }

    const anchor=document.querySelector('#screen-room-control .auctioneer-player-control-card');
    const host=anchor?.parentElement;
    if(!host)return;

    const card=document.createElement('article');
    card.id='opponent-credits-control-card';
    card.className='mg-card mg-setting-card opponent-credits-control-card';
    card.innerHTML=`
      <div class="mg-setting-head">
        <div>
          <h3>Nascondi crediti avversari</h3>
          <p>Se attivo, ogni giocatore vede solo i crediti della propria squadra.</p>
        </div>
        <label class="mg-switch-label" title="Nascondi crediti avversari">
          <input id="opponent-credits-toggle-btn" type="checkbox" aria-label="Nascondi crediti avversari">
          <span class="mg-switch-ui" aria-hidden="true"></span>
        </label>
      </div>
      <div id="opponent-credits-status" class="mg-status-text"></div>`;

    if(anchor.nextSibling)host.insertBefore(card,anchor.nextSibling);
    else host.appendChild(card);
    card.querySelector('#opponent-credits-toggle-btn')?.addEventListener('change',()=>window.toggleOpponentCreditsVisibility());
    updateControlUI();
  }

  async function loadOpponentCreditsVisibility(force=false){
    const key=settingKey();
    if(!key){
      opponentCreditsVisible=true;
      loadedForKey='';
      updateControlUI();
      return opponentCreditsVisible;
    }
    if(!force && loadedForKey===key)return opponentCreditsVisible;

    try{
      const {data,error}=await supabaseClient
        .from('fanta_app_data')
        .select('data')
        .eq('key',key)
        .maybeSingle();
      if(error)throw error;
      opponentCreditsVisible=typeof data?.data?.enabled==='boolean'
        ?!!data.data.enabled
        :true;
      loadedForKey=key;
    }catch(error){
      console.warn('Lettura impostazione crediti avversari non riuscita',error);
      opponentCreditsVisible=true;
    }

    updateControlUI();
    applyOpponentCreditsVisibility();
    return opponentCreditsVisible;
  }

  async function saveOpponentCreditsVisibility(){
    const key=settingKey();
    if(!key)return false;
    const stamp=new Date().toISOString();
    const {error}=await supabaseClient.from('fanta_app_data').upsert({
      key,
      data:{enabled:!!opponentCreditsVisible},
      file_name:'visibilita-crediti-avversari',
      updated_at:stamp
    },{onConflict:'key'});
    if(error){
      console.warn('Salvataggio crediti avversari non riuscito',error);
      return false;
    }
    loadedForKey=key;
    return true;
  }

  function applyOverviewRows(){
    document.querySelectorAll('#player-room-overview-list .player-room-team-row').forEach(row=>{
      const mine=row.classList.contains('mine');
      const hide=!opponentCreditsVisible&&!mine;
      const creditStat=row.querySelector('.player-room-team-stats > span:first-child');
      if(creditStat)creditStat.style.display=hide?'none':'';
      row.classList.toggle('opponent-credits-hidden',hide);
    });
  }

  function applyActiveRosterMeta(){
    if(!activeRosterTeamId)return;
    const team=teamsCache.find(t=>String(t.id)===String(activeRosterTeamId));
    const meta=document.getElementById('player-room-team-roster-meta');
    if(!team||!meta)return;

    const mine=String(team.id)===String(myTeamId);
    meta.textContent=!opponentCreditsVisible&&!mine
      ?playerRoomOverviewSlotsText(team)
      :`${parseInt(team.credits_remaining)||0} crediti · ${playerRoomOverviewSlotsText(team)}`;
  }

  function applyOpponentCreditsVisibility(){
    applyOverviewRows();
    applyActiveRosterMeta();
  }

  window.toggleOpponentCreditsVisibility=async function(){
    if(!currentRoomId)return;
    const previous=opponentCreditsVisible;
    opponentCreditsVisible=!opponentCreditsVisible;
    updateControlUI();
    applyOpponentCreditsVisibility();

    const saved=await saveOpponentCreditsVisibility();
    if(!saved){
      opponentCreditsVisible=previous;
      updateControlUI();
      applyOpponentCreditsVisibility();
      alert('Impossibile salvare la visibilità dei crediti avversari. Riprova.');
      return;
    }

    channel?.send({
      type:'broadcast',
      event:'opponent_credits_visibility',
      payload:{enabled:opponentCreditsVisible}
    }).catch(()=>{});
  };

  const originalConnectToRoom=connectToRoom;
  connectToRoom=async function(){
    const result=await originalConnectToRoom.apply(this,arguments);
    if(channel && !channel.__liveastaOpponentCreditsHandler){
      channel.__liveastaOpponentCreditsHandler=true;
      channel.on('broadcast',{event:'opponent_credits_visibility'},payload=>{
        const enabled=payload?.payload?.enabled;
        if(typeof enabled!=='boolean')return;
        opponentCreditsVisible=enabled;
        loadedForKey=settingKey();
        updateControlUI();
        applyOpponentCreditsVisibility();
      });
    }
    return result;
  };

  const originalRenderPlayerRoomOverview=renderPlayerRoomOverview;
  renderPlayerRoomOverview=function(){
    const result=originalRenderPlayerRoomOverview.apply(this,arguments);
    applyOverviewRows();
    return result;
  };

  const originalOpenPlayerRoomOverview=openPlayerRoomOverview;
  openPlayerRoomOverview=async function(){
    await loadOpponentCreditsVisibility(true);
    const result=await originalOpenPlayerRoomOverview.apply(this,arguments);
    applyOpponentCreditsVisibility();
    return result;
  };

  const originalOpenPlayerRoomTeamRoster=openPlayerRoomTeamRoster;
  openPlayerRoomTeamRoster=function(teamId){
    activeRosterTeamId=String(teamId||'');
    const result=originalOpenPlayerRoomTeamRoster.apply(this,arguments);
    applyActiveRosterMeta();
    return result;
  };

  const originalClosePlayerRoomTeamRoster=closePlayerRoomTeamRoster;
  closePlayerRoomTeamRoster=function(){
    const result=originalClosePlayerRoomTeamRoster.apply(this,arguments);
    activeRosterTeamId='';
    applyOverviewRows();
    return result;
  };

  if(typeof renderRoomControl==='function'){
    const originalRenderRoomControl=renderRoomControl;
    renderRoomControl=function(){
      const result=originalRenderRoomControl.apply(this,arguments);
      injectManagementControl();
      loadOpponentCreditsVisibility(false).catch(()=>{});
      return result;
    };
  }

  if(typeof openRoomControl==='function'){
    const originalOpenRoomControl=openRoomControl;
    openRoomControl=async function(){
      const result=await originalOpenRoomControl.apply(this,arguments);
      injectManagementControl();
      await loadOpponentCreditsVisibility(true);
      return result;
    };
  }

  window.loadOpponentCreditsVisibility=loadOpponentCreditsVisibility;
  window.applyOpponentCreditsVisibility=applyOpponentCreditsVisibility;
})();
