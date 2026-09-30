// Read-only adapter: uses the host's presentation components, never its auction controls.
window.liveastaSpectatorView=(()=>{
  let snapshot=null;
  let clock=null;
  let deliveryUpdate=null;
  let previousResult=null;
  let audioState=null,lastAudioTick='';
  const el=id=>document.getElementById(id);
  const write=(id,value)=>{const target=el(id);if(target&&target.textContent!==String(value))target.textContent=String(value);};
  const timed=phase=>['prep','active','sealed','sealed_reveal'].includes(phase);
  function audioTransition(state){
    const next={phase:state.phase,player:state.player?.id,token:state.sealed_token||'',value:Number(state.value)||0,winner:state.winner||'',paused:!!state.paused};
    const previous=audioState;audioState=next;
    const changed=!previous || previous.phase!==next.phase || previous.player!==next.player || previous.token!==next.token;
    if(changed)lastAudioTick='';
    // Joining, polling and reflow must not replay a historical offer/result.
    if(!previous || state.paused || document.hidden)return;
    if(changed){
      if(['active','sealed'].includes(next.phase))playSound('audio-start');
      if(next.phase==='ended')playSound('audio-end');
    }else if(next.phase==='active' && next.value>previous.value){
      playSound('audio-buzz');speakBidValue(next.value);
    }
  }
  function audioTick(phase,seconds){
    if(snapshot.paused || document.hidden || seconds<=0)return;
    const key=`${phase}:${seconds}`;if(key===lastAudioTick)return;
    lastAudioTick=key;
    if(['prep','sealed_reveal'].includes(phase))playSound('audio-prep');
    else if(['active','sealed'].includes(phase)&&seconds<=3)playAuctionFinalCountdown(seconds);
  }
  function subscribePresence(spectatorChannel){
    const active=()=>spectatorMode&&channel===spectatorChannel;
    const sync=()=>{if(active())syncOnlinePlayersFromPresence();};
    ['sync','join','leave'].forEach(event=>spectatorChannel.on('presence',{event},sync));
    spectatorChannel.on('broadcast',{event:'player_online_fallback'},({payload})=>{
      if(active())touchFallbackOnlinePlayer(payload||{});
    });
    spectatorChannel.on('broadcast',{event:'player_offline_now'},({payload})=>{
      if(!active())return;
      onlinePlayers.delete(String(payload?.team_id||''));
      renderOnlinePlayers();
    });
  }
  function remaining(state){
    const deadline=Number(state.deadline_at||state.sealed_deadline_at)||0;
    return deadline?Math.max(0,Math.ceil((deadline-Date.now())/1000)):Math.max(0,Number(state.seconds)||0);
  }
  function tick(){
    if(!snapshot)return;
    const phase=snapshot.phase;
    const seconds=remaining(snapshot);
    audioTick(phase,seconds);
    if(timed(phase))write('countdown-display',seconds);
    const display=el('countdown-display');
    const lastThree=['active','sealed'].includes(phase)&&seconds>0&&seconds<=3;
    display?.classList.toggle('liveasta-last3',lastThree);
    display?.classList.toggle('danger',lastThree);
    window.refreshLiveAstaMobileBoardDev?.();
  }
  function render(state){
    clearInterval(clock);clock=null;
    audioTransition(state||{phase:'idle'});
    snapshot=state||{phase:'idle'};
    if(deliveryUpdate&&snapshot.sealed_token===deliveryUpdate.token){
      snapshot={...snapshot,sealed_submitted_ids:[...new Set([...(snapshot.sealed_submitted_ids||[]),...deliveryUpdate.ids].map(String))]};
    }
    const phase=snapshot.phase||'idle';
    if(phase==='ended')previousResult=snapshot;
    const source=snapshot.player||(phase==='idle'&&nominationState.enabled?previousResult?.player:null);
    const player=source?{Id:source.id,Nome:source.nome,R:source.role,Squadra:source.club,FVM:source.fvm}:null;
    const board=el('screen-auctioneer-board');
    if(board)board.dataset.spectatorPhase=phase;
    showAuctionPanels();
    if(player)setMobileAuctionCard(player);
    else{
      write('auction-player-name-top','ASTA LIVE');
      write('auction-player-role','-');
      write('auction-player-club','IN ATTESA');
    }
    if(el('card-image'))el('card-image').style.visibility=player?'visible':'hidden';
    el('countdown-display')?.classList.remove('prep-countdown','liveasta-last3','danger');
    clearSealedBidRanking();
    if(phase==='ready'&&player){
      showAuctioneerReadyStage(snapshot);
    }else if((phase==='sealed'||phase==='sealed_reveal')&&player){
      const eligible=(snapshot.sealed_eligible_ids||[]).map(String);
      const submitted=new Set((snapshot.sealed_submitted_ids||[]).map(String));
      renderSealedAuctionStage({player,opening:phase==='sealed_reveal',remaining:remaining(snapshot),eligible,delivered:eligible.filter(id=>submitted.has(id))});
    }else{
      let title='IN ATTESA',winner='--',value=0;
      if(phase==='active'){title='MIGLIOR OFFERENTE';winner=snapshot.winner||'NESSUNO';value=snapshot.value||0;}
      if(phase==='ended'){title=snapshot.winner?'ASTA VINTA DA':'ESITO ASTA';winner=snapshot.winner||'INVENDUTO';value=snapshot.value||0;}
      write('auction-title-display',title);
      write('winner-display',winner);
      write('mobile-winner-display',winner);
      write('current-value-display',value);
      write('countdown-display',phase==='ended'?'0':'--');
      if(isAuctioneerMobileBoard()){
        if(phase==='ended')showMobileAuctionResult(snapshot.winner);
        else setMobileBoardPhase(phase==='prep'?'preparing':'normal');
      }
      if(phase==='ended')renderAuctioneerBidRanking(snapshot.mode==='sealed_result'?snapshot.sealed_ranking:snapshot.normal_bid_ranking,'CLASSIFICA OFFERTE');
      if(phase==='idle' && nominationState.enabled){
        renderAuctioneerBidRanking(previousResult?.mode==='sealed_result'?previousResult?.sealed_ranking:previousResult?.normal_bid_ranking,'CLASSIFICA OFFERTE');
        showNominationTurnStage(player);
      }
    }
    tick();
    if(timed(phase)&&!snapshot.paused)clock=setInterval(tick,250);
    window.fitAuctionNames?.();
    window.updateLiveAstaTeamCards?.();
    window.refreshLiveAstaMobileBoardDev?.();
  }
  function stop(){clearInterval(clock);clock=null;snapshot=null;deliveryUpdate=null;previousResult=null;audioState=null;lastAudioTick='';el('countdown-display')?.classList.remove('liveasta-last3','danger');delete el('screen-auctioneer-board')?.dataset.spectatorPhase;}
  return{render,stop,subscribePresence,updateDeliveries:payload=>{
    if(!payload?.token||!Array.isArray(payload.submitted_ids))return;
    deliveryUpdate={token:payload.token,ids:payload.submitted_ids};
    if(snapshot?.sealed_token===payload.token)render(snapshot);
  },reflow:()=>{if(snapshot)render(snapshot);}};
})();
