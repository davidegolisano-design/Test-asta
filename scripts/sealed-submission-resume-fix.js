// LIVEASTA QA fix — sealed bid identity persistence + monotonic player acknowledgement.
// Bid amounts remain only in the private banditore persistence.
(function(){
  if(window.__liveastaSealedSubmissionResumeFixLoaded)return;
  window.__liveastaSealedSubmissionResumeFixLoaded=true;

  let attempts=0;
  let pendingPlayerToken='';
  let confirmedPlayerToken='';
  let pendingGuardUntil=0;
  let guardTimer=null;

  function currentToken(){try{return String(playerSealedToken||'');}catch(_){return '';}}
  function currentTeam(){try{return String(myTeamId||'');}catch(_){return '';}}
  function forcePlayerSubmitted(token){
    try{
      if(!token || token!==currentToken() || !playerSealedMode)return;
      playerSealedSubmitted=true;
      if(typeof preparePlayerSealedControls==='function')preparePlayerSealedControls(false);
    }catch(_){}
  }
  function clearPending(token=''){
    if(!token || pendingPlayerToken===token){pendingPlayerToken='';pendingGuardUntil=0;}
    if(!token || confirmedPlayerToken===token)confirmedPlayerToken='';
  }
  function ensureGuardTimer(){
    if(guardTimer)return;
    guardTimer=setInterval(()=>{
      const token=currentToken();
      if(!token){clearPending();return;}
      try{
        const st=document.getElementById('sealed-bid-status');
        const text=String(st?.textContent||'').toLowerCase();
        const rejected=st?.classList?.contains('error') || /rifiutat|non valid|scadut|riprova|non riuscit/.test(text);
        if(rejected){clearPending(token);return;}
      }catch(_){}
      if(confirmedPlayerToken===token){forcePlayerSubmitted(token);return;}
      if(pendingPlayerToken===token && Date.now()<pendingGuardUntil){forcePlayerSubmitted(token);return;}
      if(pendingPlayerToken===token)pendingPlayerToken='';
    },40);
  }

  function submittedIdsFromState(state){
    return Array.isArray(state?.sealed_submitted_ids)?state.sealed_submitted_ids.map(String):[];
  }
  function markConfirmedFromPayload(payload){
    try{
      const token=String(payload?.token||payload?.sealed_token||'');
      if(!token || token!==currentToken())return;
      const ids=(payload?.submitted_ids||payload?.sealed_submitted_ids||[]).map(String);
      if(!ids.includes(currentTeam()))return;
      confirmedPlayerToken=token;pendingPlayerToken='';pendingGuardUntil=0;forcePlayerSubmitted(token);
    }catch(_){}
  }

  async function persistSubmittedIds(token){
    try{
      if(!token || !(sealedBids instanceof Map) || String(sealedAuctionToken||'')!==token)return;
      const submitted=[...sealedBids.keys()].map(String);
      const key=`liveasta_live_${currentRoomId}`;
      const now=new Date().toISOString();
      const {data,error}=await supabaseClient.from('fanta_app_data').select('data').eq('key',key).maybeSingle();
      if(error)throw error;
      const base=(data?.data&&typeof data.data==='object')?data.data:{};
      if(base.phase!=='sealed' || String(base.sealed_token||'')!==token)return;
      const merged=[...new Set([...submittedIdsFromState(base),...submitted])];
      const next={...base,sealed_submitted_ids:merged,updated_at:now};
      const {error:writeError}=await supabaseClient.from('fanta_app_data').upsert({key,data:next,file_name:'live-auction-state',updated_at:now},{onConflict:'key'});
      if(writeError)throw writeError;
      if(liveAuctionState?.phase==='sealed' && String(liveAuctionState?.sealed_token||'')===token){
        liveAuctionState={...liveAuctionState,sealed_submitted_ids:merged,updated_at:now};
      }
      try{channel?.send({type:'broadcast',event:'live_state',payload:typeof liveStateForBroadcast==='function'?liveStateForBroadcast():liveAuctionState}).catch(()=>{});}catch(_){}
    }catch(error){try{console.warn('Persistenza identità buste non riuscita',error);}catch(_){}}
  }

  function installChannelGuard(){
    try{
      if(!channel || channel.__liveastaSealedPlayerAckGuard)return;
      channel.__liveastaSealedPlayerAckGuard=true;
      channel.on('broadcast',{event:'sealed_bid_count'},({payload})=>markConfirmedFromPayload(payload||{}));
      channel.on('broadcast',{event:'live_state'},({payload})=>{
        const state=payload||{};const token=String(state.sealed_token||state.token||'');
        if(state.phase!=='sealed' || !token || token!==currentToken())return;
        markConfirmedFromPayload(state);if(confirmedPlayerToken===token)forcePlayerSubmitted(token);
      });
      channel.on('broadcast',{event:'sealed_bid_rejected'},({payload})=>{
        const d=payload||{};const token=String(d.token||'');
        if(token===currentToken() && String(d.team_id||'')===currentTeam())clearPending(token);
      });
    }catch(_){}
  }

  function install(){
    const originalReceive=window.receiveSealedBid;
    const originalConnect=window.connectToRoom;
    const originalSubmit=window.submitPlayerSealedBid;
    if(typeof originalReceive!=='function' || typeof originalConnect!=='function' || typeof originalSubmit!=='function')return false;

    if(!originalReceive.__liveastaSealedSubmissionResumeFixed){
      const wrappedReceive=async function(...args){
        let beforeSize=-1,token='';
        try{beforeSize=sealedBids instanceof Map?sealedBids.size:-1;token=String(sealedAuctionToken||'');}catch(_){}
        const result=await originalReceive.apply(this,args);
        try{
          if(beforeSize>=0 && sealedBids instanceof Map && sealedBids.size>beforeSize && liveAuctionState?.phase==='sealed' && token && String(sealedAuctionToken||'')===token){
            await persistSubmittedIds(token);
          }
        }catch(_){}
        return result;
      };
      wrappedReceive.__liveastaSealedSubmissionResumeFixed=true;window.receiveSealedBid=wrappedReceive;
    }
    if(!originalConnect.__liveastaSealedPlayerAckGuardWrapped){
      const wrappedConnect=async function(...args){const result=await originalConnect.apply(this,args);installChannelGuard();return result;};
      wrappedConnect.__liveastaSealedPlayerAckGuardWrapped=true;window.connectToRoom=wrappedConnect;
    }
    if(!originalSubmit.__liveastaSealedPlayerSubmitGuardWrapped){
      const wrappedSubmit=async function(...args){
        const token=currentToken();const result=await originalSubmit.apply(this,args);
        try{if(token && token===currentToken() && playerSealedSubmitted){pendingPlayerToken=token;pendingGuardUntil=Date.now()+3500;ensureGuardTimer();forcePlayerSubmitted(token);}}catch(_){}
        return result;
      };
      wrappedSubmit.__liveastaSealedPlayerSubmitGuardWrapped=true;window.submitPlayerSealedBid=wrappedSubmit;
    }
    installChannelGuard();ensureGuardTimer();return true;
  }

  if(install())return;
  const timer=setInterval(()=>{if(install() || ++attempts>=150)clearInterval(timer);},20);
})();
