/* LIVEASTA v0.89 — busta chiusa: cue finali senza MutationObserver globale */
(function(){
  'use strict';

  let lastAuctioneerCue=null;
  let lastPlayerCue=null;
  let timerId=null;

  function playFinalCue(n){
    if(![1,2,3].includes(n))return;
    try{
      if(typeof window.playAuctionFinalCountdown==='function'){
        window.playAuctionFinalCountdown(n);
      }else if(typeof window.playSound==='function'){
        window.playSound('audio-prep');
      }
    }catch(_){}
  }

  function syncAuctioneer(){
    const view=document.getElementById('view-auction');
    const timer=document.getElementById('countdown-display');
    if(!view||!timer)return;

    const delivery=view.classList.contains('sealed-collecting') && !view.classList.contains('sealed-opening');
    const n=Math.max(0,parseInt(timer.textContent,10)||0);
    const final3=delivery && n>0 && n<=3;

    if(timer.classList.contains('danger')!==final3)timer.classList.toggle('danger',final3);
    if(timer.classList.contains('liveasta-last3')!==final3)timer.classList.toggle('liveasta-last3',final3);

    if(final3 && n!==lastAuctioneerCue){
      lastAuctioneerCue=n;
      playFinalCue(n);
    }else if(!delivery || n>3){
      lastAuctioneerCue=null;
    }
  }

  function syncPlayer(){
    const title=document.getElementById('player-auction-title');
    const timer=document.getElementById('player-countdown');
    if(!title||!timer)return;

    const label=(title.textContent||'').trim().toUpperCase();
    const delivery=label==='BUSTA CHIUSA' || label==='SPAREGGIO BUSTA';
    const n=Math.max(0,parseInt(timer.textContent,10)||0);
    const final3=delivery && n>0 && n<=3;

    if(delivery){
      if(timer.classList.contains('danger')!==final3)timer.classList.toggle('danger',final3);
      if(timer.classList.contains('liveasta-last3')!==final3)timer.classList.toggle('liveasta-last3',final3);
    }

    if(final3 && n!==lastPlayerCue){
      lastPlayerCue=n;
      playFinalCue(n);
    }else if(!delivery || n>3){
      lastPlayerCue=null;
    }
  }

  function sync(){
    syncAuctioneer();
    syncPlayer();
  }

  function init(){
    sync();
    timerId=setInterval(sync,180);
    window.addEventListener('pagehide',()=>{if(timerId)clearInterval(timerId);},{once:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
