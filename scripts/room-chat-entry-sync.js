// LIVEASTA room chat — DEV v1.04.15
// Ensures the chat FAB is refreshed as soon as player/auctioneer identity becomes active.
(function(){
  if(window.__liveastaRoomChatEntrySyncLoaded)return;
  window.__liveastaRoomChatEntrySyncLoaded=true;

  let lastSignature='';
  let timer=null;

  function signature(){
    try{
      const room=String(currentRoomId||'');
      const actor=auctioneerLockKey?'auctioneer':(myTeamId?`team:${String(myTeamId)}`:'');
      const connected=channel?'1':'0';
      return room&&actor?`${room}|${actor}|${connected}`:'';
    }catch(_){
      return '';
    }
  }

  function sync(force=false){
    const sig=signature();
    if(!sig){
      lastSignature='';
      return;
    }
    if(!force&&sig===lastSignature)return;
    lastSignature=sig;

    // room-chat.js may already have loaded the persisted room setting while
    // the player/team identity was not assigned yet. Refreshing here makes
    // the FAB visible immediately without requiring the auctioneer to toggle chat.
    try{window.refreshRoomChat?.();}catch(_){}

    // Run a couple of short follow-up passes because joinAsPlayer/joinAsAuctioneer
    // complete identity, presence and screen activation in separate async steps.
    setTimeout(()=>{try{window.refreshRoomChat?.();}catch(_){}},80);
    setTimeout(()=>{try{window.refreshRoomChat?.();}catch(_){}},260);
  }

  function boot(){
    sync(true);

    const player=document.getElementById('screen-player-buzzer');
    const board=document.getElementById('screen-auctioneer-board');
    [player,board].filter(Boolean).forEach(el=>{
      new MutationObserver(()=>sync(true)).observe(el,{attributes:true,attributeFilter:['class']});
    });

    // Lightweight fallback for identity variables, which are JS state and do not
    // necessarily produce a DOM mutation when they become available.
    timer=setInterval(()=>sync(false),350);

    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden)sync(true);
    });
    window.addEventListener('pageshow',()=>sync(true));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
