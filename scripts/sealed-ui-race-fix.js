// QA-only: keep a confirmed local sealed submission monotonic while the round is active.
(function(){
  if(window.__liveastaSealedUiRaceFix)return;
  window.__liveastaSealedUiRaceFix=true;
  let tries=0;
  function install(){
    if(typeof window.submitSealedBid!=='function')return false;
    if(window.submitSealedBid.__liveastaUiRaceFixed)return true;
    const original=window.submitSealedBid;
    const wrapped=async function(...args){
      const result=await original.apply(this,args);
      let until=Date.now()+12000;
      const timer=setInterval(()=>{
        try{
          const status=document.getElementById('sealed-bid-status');
          if(status?.classList?.contains('error') || !playerSealedMode || Date.now()>=until){clearInterval(timer);return;}
          playerSealedSubmitted=true;
          if(typeof preparePlayerSealedControls==='function')preparePlayerSealedControls(true);
        }catch(_){clearInterval(timer);}
      },40);
      return result;
    };
    wrapped.__liveastaUiRaceFixed=true;
    window.submitSealedBid=wrapped;
    return true;
  }
  if(install())return;
  const wait=setInterval(()=>{if(install()||++tries>150)clearInterval(wait);},20);
})();
