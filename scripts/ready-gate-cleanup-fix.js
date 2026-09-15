// LIVEASTA QA fix — never leave a persisted READY gate active after an auction ends.
// Kept separate from the auction core until the stress suite validates it.
(function(){
  if(window.__liveastaReadyGateCleanupFixLoaded)return;
  window.__liveastaReadyGateCleanupFixLoaded=true;

  let attempts=0;
  function install(){
    const original=window.endAuction;
    if(typeof original!=='function')return false;
    if(original.__liveastaReadyGateCleanupFixed)return true;

    const wrapped=async function(...args){
      const result=await original.apply(this,args);
      try{
        if(typeof window.closeReadyGateDedicated==='function'){
          await window.closeReadyGateDedicated();
        }else if(typeof closeReadyGateDedicated==='function'){
          await closeReadyGateDedicated();
        }
      }catch(error){
        try{console.warn('READY gate cleanup after auction end failed',error);}catch(_){}
      }
      return result;
    };
    wrapped.__liveastaReadyGateCleanupFixed=true;
    window.endAuction=wrapped;
    return true;
  }

  if(install())return;
  const timer=setInterval(()=>{
    if(install() || ++attempts>=150)clearInterval(timer);
  },20);
})();
