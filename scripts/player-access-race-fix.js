// LIVEASTA — prevents a debounced room/team refresh from invalidating
// the explicit refresh performed when the player presses AVANTI.
(function(){
  if(window.__liveastaPlayerAccessRaceFixLoaded)return;
  window.__liveastaPlayerAccessRaceFixLoaded=true;

  let attempts=0;
  const install=()=>{
    const original=window.playerAccessWizardNext;
    if(typeof original!=='function')return false;
    if(original.__liveastaPlayerAccessRaceFixed)return true;

    const wrapped=async function(...args){
      try{
        clearTimeout(playerRoomRefreshTimer);
        playerRoomRefreshTimer=null;
      }catch(_){}
      return original.apply(this,args);
    };
    wrapped.__liveastaPlayerAccessRaceFixed=true;
    window.playerAccessWizardNext=wrapped;
    return true;
  };

  if(install())return;
  const timer=setInterval(()=>{
    if(install() || ++attempts>=150)clearInterval(timer);
  },20);
})();
