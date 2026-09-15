// LIVEASTA v1.03 — validated runtime stability layer.
// Keeps access, READY cleanup and sealed-bid acknowledgement deterministic
// without exposing sealed amounts to player/public state.
(function(){
  if(window.__liveastaStabilityCoreLoaded)return;
  window.__liveastaStabilityCoreLoaded=true;

  let installAttempts=0;
  let localSealedToken='';
  let localSealedGuardUntil=0;

  const sealedToken=()=>{try{return String(playerSealedToken||'');}catch(_){return '';}};
  const teamId=()=>{try{return String(myTeamId||'');}catch(_){return '';}};
  const rejected=()=>{
    try{
      const el=document.getElementById('sealed-bid-status');
      const text=String(el?.textContent||'').toLowerCase();
      return !!el?.classList?.contains('error') || /rifiutat|non valid|scadut|riprova|non riuscit/.test(text);
    }catch(_){return false;}
  };

  function forceSealedSubmitted(token){
    try{
      if(!token || token!==sealedToken() || !playerSealedMode || rejected())return false;
      playerSealedSubmitted=true;
      if(typeof preparePlayerSealedControls==='function')preparePlayerSealedControls(false);
      return true;
    }catch(_){return false;}
  }

  function acknowledgeSealed(payload){
    try{
      const token=String(payload?.token||payload?.sealed_token||'');
      if(!token || token!==sealedToken())return false;
      const ids=(payload?.submitted_ids||payload?.sealed_submitted_ids||[]).map(String);
      if(!ids.includes(teamId()))return false;
      localSealedToken=token;
      localSealedGuardUntil=Number.MAX_SAFE_INTEGER;
      return forceSealedSubmitted(token);
    }catch(_){return false;}
  }

  async function persistSealedSubmittedIds(token){
    try{
      if(!token || String(sealedAuctionToken||'')!==token || !(sealedBids instanceof Map))return;
      if(typeof saveLiveAuctionState!=='function')return;
      const ids=[...sealedBids.keys()].map(String);
      await saveLiveAuctionState({sealed_submitted_ids:ids});
      try{
        channel?.send({type:'broadcast',event:'live_state',payload:typeof liveStateForBroadcast==='function'?liveStateForBroadcast():liveAuctionState}).catch(()=>{});
      }catch(_){}
    }catch(error){
      try{console.warn('Persistenza stato buste non riuscita',error);}catch(_){}
    }
  }

  function installChannelAck(){
    try{
      if(!channel || channel.__liveastaSealedAckInstalled)return;
      channel.__liveastaSealedAckInstalled=true;
      channel.on('broadcast',{event:'sealed_bid_count'},({payload})=>acknowledgeSealed(payload||{}));
      channel.on('broadcast',{event:'live_state'},({payload})=>acknowledgeSealed(payload||{}));
      channel.on('broadcast',{event:'sealed_bid_rejected'},({payload})=>{
        const d=payload||{};
        if(String(d.token||'')===sealedToken() && String(d.team_id||'')===teamId()){
          localSealedToken='';localSealedGuardUntil=0;
        }
      });
    }catch(_){}
  }

  function install(){
    let installedSomething=false;

    const next=window.playerAccessWizardNext;
    if(typeof next==='function' && !next.__liveastaStableAccess){
      const wrapped=async function(...args){
        try{clearTimeout(playerRoomRefreshTimer);playerRoomRefreshTimer=null;}catch(_){}
        return next.apply(this,args);
      };
      wrapped.__liveastaStableAccess=true;
      window.playerAccessWizardNext=wrapped;
      installedSomething=true;
    }

    const end=window.endAuction;
    if(typeof end==='function' && !end.__liveastaStableReadyCleanup){
      const wrapped=async function(...args){
        const result=await end.apply(this,args);
        try{if(typeof closeReadyGateDedicated==='function')await closeReadyGateDedicated();}catch(error){try{console.warn('Chiusura READY gate non riuscita',error);}catch(_){}}
        return result;
      };
      wrapped.__liveastaStableReadyCleanup=true;
      window.endAuction=wrapped;
      installedSomething=true;
    }

    const receive=window.receiveSealedBid;
    if(typeof receive==='function' && !receive.__liveastaStableSealedPersist){
      const wrapped=async function(...args){
        let before=-1,token='';
        try{before=sealedBids instanceof Map?sealedBids.size:-1;token=String(sealedAuctionToken||'');}catch(_){}
        const result=await receive.apply(this,args);
        try{if(before>=0 && sealedBids instanceof Map && sealedBids.size>before && token===String(sealedAuctionToken||''))await persistSealedSubmittedIds(token);}catch(_){}
        return result;
      };
      wrapped.__liveastaStableSealedPersist=true;
      window.receiveSealedBid=wrapped;
      installedSomething=true;
    }

    const submit=window.submitSealedBid;
    if(typeof submit==='function' && !submit.__liveastaStableSealedSubmit){
      const wrapped=async function(...args){
        const token=sealedToken();
        const result=await submit.apply(this,args);
        try{
          if(token && token===sealedToken() && playerSealedMode && playerSealedSubmitted && !rejected()){
            localSealedToken=token;
            localSealedGuardUntil=Date.now()+15000;
            forceSealedSubmitted(token);
          }
        }catch(_){}
        return result;
      };
      wrapped.__liveastaStableSealedSubmit=true;
      window.submitSealedBid=wrapped;
      installedSomething=true;
    }

    const restore=window.restorePlayerFromLiveState;
    if(typeof restore==='function' && !restore.__liveastaStableSealedRestore){
      const wrapped=async function(stateOverride=null){
        let priorToken='',priorSubmitted=false;
        try{priorToken=sealedToken();priorSubmitted=!!playerSealedMode&&!!playerSealedSubmitted&&!rejected();}catch(_){}
        const result=await restore.apply(this,arguments);
        try{
          const state=stateOverride||liveAuctionState||null;
          const incomingToken=String(state?.sealed_token||'');
          const sameRound=state?.phase==='sealed' && incomingToken && (!priorToken||incomingToken===priorToken);
          const persisted=(state?.sealed_submitted_ids||[]).map(String).includes(teamId());
          const guarded=localSealedToken===incomingToken && Date.now()<localSealedGuardUntil;
          if(sameRound && (priorSubmitted||persisted||guarded)){
            localSealedToken=incomingToken;
            if(persisted)localSealedGuardUntil=Number.MAX_SAFE_INTEGER;
            forceSealedSubmitted(incomingToken);
          }else if(state?.phase!=='sealed' || (priorToken&&incomingToken&&incomingToken!==priorToken)){
            localSealedToken='';localSealedGuardUntil=0;
          }
        }catch(_){}
        return result;
      };
      wrapped.__liveastaStableSealedRestore=true;
      window.restorePlayerFromLiveState=wrapped;
      installedSomething=true;
    }

    const connect=window.connectToRoom;
    if(typeof connect==='function' && !connect.__liveastaStableSealedAck){
      const wrapped=async function(...args){const result=await connect.apply(this,args);installChannelAck();return result;};
      wrapped.__liveastaStableSealedAck=true;
      window.connectToRoom=wrapped;
      installedSomething=true;
    }

    installChannelAck();
    return installedSomething;
  }

  install();
  const installer=setInterval(()=>{
    install();
    if(++installAttempts>=150)clearInterval(installer);
  },20);

  // A short local guard only covers the realtime acknowledgement window.
  setInterval(()=>{
    try{
      const token=sealedToken();
      if(!playerSealedMode || !token){localSealedToken='';localSealedGuardUntil=0;return;}
      if(localSealedToken===token && Date.now()<localSealedGuardUntil)forceSealedSubmitted(token);
    }catch(_){}
  },100);
})();
