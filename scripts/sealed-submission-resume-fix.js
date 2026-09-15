// LIVEASTA QA fix — persist only the identities that already submitted a sealed bid.
// Bid amounts remain in the private banditore persistence and are never copied here.
(function(){
  if(window.__liveastaSealedSubmissionResumeFixLoaded)return;
  window.__liveastaSealedSubmissionResumeFixLoaded=true;

  let attempts=0;
  function install(){
    const original=window.receiveSealedBid;
    if(typeof original!=='function')return false;
    if(original.__liveastaSealedSubmissionResumeFixed)return true;

    const wrapped=async function(...args){
      let beforeSize=-1;
      let token='';
      try{
        beforeSize=sealedBids instanceof Map?sealedBids.size:-1;
        token=String(sealedAuctionToken||'');
      }catch(_){}

      const result=await original.apply(this,args);

      try{
        if(
          beforeSize>=0 &&
          sealedBids instanceof Map &&
          sealedBids.size>beforeSize &&
          liveAuctionState?.phase==='sealed' &&
          token && String(sealedAuctionToken||'')===token
        ){
          const submitted=[...sealedBids.keys()].map(String);
          await saveLiveAuctionState({sealed_submitted_ids:submitted});
          try{
            channel?.send({
              type:'broadcast',
              event:'live_state',
              payload:typeof liveStateForBroadcast==='function'?liveStateForBroadcast():liveAuctionState
            }).catch(()=>{});
          }catch(_){}
        }
      }catch(error){
        try{console.warn('Persistenza stato busta inviata non riuscita',error);}catch(_){}
      }
      return result;
    };

    wrapped.__liveastaSealedSubmissionResumeFixed=true;
    window.receiveSealedBid=wrapped;
    return true;
  }

  if(install())return;
  const timer=setInterval(()=>{
    if(install() || ++attempts>=150)clearInterval(timer);
  },20);
})();
