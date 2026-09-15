// QA-only: keep an accepted local sealed submission monotonic while the same round is active.
// A stale live_state must never visually reopen an already submitted envelope.
(function(){
  if(window.__liveastaSealedUiRaceFix)return;
  window.__liveastaSealedUiRaceFix=true;

  let tries=0;
  let localAcceptedToken='';
  let guardUntil=0;

  function tokenNow(){
    try{return String(playerSealedToken||'');}catch(_){return '';}
  }

  function rejectionVisible(){
    try{
      const status=document.getElementById('sealed-bid-status');
      const text=String(status?.textContent||'').toLowerCase();
      return !!status?.classList?.contains('error') || /rifiutat|non valid|scadut|riprova|non riuscit/.test(text);
    }catch(_){return false;}
  }

  function forceSubmitted(token){
    try{
      if(!token || token!==tokenNow() || !playerSealedMode || rejectionVisible())return false;
      playerSealedSubmitted=true;
      if(typeof preparePlayerSealedControls==='function')preparePlayerSealedControls(false);
      return true;
    }catch(_){return false;}
  }

  function install(){
    const submit=window.submitSealedBid;
    const restore=window.restorePlayerFromLiveState;
    if(typeof submit!=='function' || typeof restore!=='function')return false;

    if(!submit.__liveastaUiRaceFixed){
      const wrappedSubmit=async function(...args){
        const roundToken=tokenNow();
        const result=await submit.apply(this,args);
        try{
          if(roundToken && roundToken===tokenNow() && playerSealedMode && playerSealedSubmitted && !rejectionVisible()){
            localAcceptedToken=roundToken;
            guardUntil=Date.now()+15000;
            forceSubmitted(roundToken);
          }
        }catch(_){}
        return result;
      };
      wrappedSubmit.__liveastaUiRaceFixed=true;
      window.submitSealedBid=wrappedSubmit;
    }

    if(!restore.__liveastaUiRaceRestoreFixed){
      const wrappedRestore=async function(stateOverride=null){
        let preserve=false;
        let preserveToken='';
        try{
          const incoming=stateOverride||null;
          const incomingToken=String(incoming?.sealed_token||'');
          const current=tokenNow();
          preserveToken=current||incomingToken;
          preserve=!!(
            preserveToken &&
            playerSealedMode &&
            playerSealedSubmitted &&
            !rejectionVisible() &&
            (!incomingToken || incomingToken===preserveToken)
          );
        }catch(_){}

        const result=await restore.apply(this,arguments);

        try{
          const incoming=stateOverride||liveAuctionState||null;
          const incomingToken=String(incoming?.sealed_token||'');
          const sameRound=incoming?.phase==='sealed' && incomingToken && incomingToken===preserveToken;
          const explicitlyPersisted=(incoming?.sealed_submitted_ids||[]).map(String).includes(String(myTeamId||''));
          const localGuard=localAcceptedToken===incomingToken && Date.now()<guardUntil;
          if(sameRound && !rejectionVisible() && (preserve || explicitlyPersisted || localGuard)){
            localAcceptedToken=incomingToken;
            guardUntil=Math.max(guardUntil,Date.now()+3000);
            forceSubmitted(incomingToken);
          }
          if(incoming?.phase!=='sealed' || (incomingToken && preserveToken && incomingToken!==preserveToken)){
            if(incomingToken!==localAcceptedToken){localAcceptedToken='';guardUntil=0;}
          }
        }catch(_){}
        return result;
      };
      wrappedRestore.__liveastaUiRaceRestoreFixed=true;
      window.restorePlayerFromLiveState=wrappedRestore;
    }

    // Last-resort guard for state updates that finish between UI frames.
    setInterval(()=>{
      try{
        const token=tokenNow();
        if(!token || !playerSealedMode || rejectionVisible()){
          if(!playerSealedMode){localAcceptedToken='';guardUntil=0;}
          return;
        }
        if(localAcceptedToken===token && Date.now()<guardUntil)forceSubmitted(token);
      }catch(_){}
    },25);

    return true;
  }

  if(install())return;
  const wait=setInterval(()=>{
    if(install()||++tries>200)clearInterval(wait);
  },20);
})();
