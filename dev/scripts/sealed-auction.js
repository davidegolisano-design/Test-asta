/* LIVEASTA v0.90 — busta chiusa: 3-2-1 rosso affidabile + cue audio */
(function(){
  'use strict';

  let lastAuctioneerCue=null;
  let lastPlayerCue=null;
  let timerId=null;

  function playFinalCue(n){
    if(![1,2,3].includes(n))return;
    try{
      if(typeof window.playAuctionFinalCountdown==='function')window.playAuctionFinalCountdown(n);
      else if(typeof window.playSound==='function')window.playSound('audio-prep');
    }catch(_){}
  }

  function forceFinal3(timer,on){
    if(!timer)return;
    timer.classList.toggle('danger',!!on);
    timer.classList.toggle('liveasta-last3',!!on);
    if(on){
      timer.classList.remove('prep-countdown');
      timer.dataset.v090Final3='1';
      timer.style.setProperty('color','#FF334F','important');
      timer.style.setProperty('-webkit-text-fill-color','#FF334F','important');
    }else if(timer.dataset.v090Final3==='1'){
      const current=(timer.style.getPropertyValue('color')||'').trim().toUpperCase();
      const priority=timer.style.getPropertyPriority('color');
      if(priority==='important' && (current==='#FF334F' || current==='RGB(255, 51, 79)')){
        timer.style.removeProperty('color');
        timer.style.removeProperty('-webkit-text-fill-color');
      }
      delete timer.dataset.v090Final3;
    }
  }

  function syncAuctioneer(){
    const view=document.getElementById('view-auction');
    const timer=document.getElementById('countdown-display');
    if(!view||!timer)return;

    const delivery=view.classList.contains('sealed-collecting') && !view.classList.contains('sealed-opening');
    const n=Math.max(0,parseInt(timer.textContent,10)||0);
    const final3=delivery && n>0 && n<=3;

    if(delivery)timer.classList.remove('prep-countdown');
    forceFinal3(timer,final3);

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

    if(delivery)timer.classList.remove('prep-countdown');
    forceFinal3(timer,final3);

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
    timerId=setInterval(sync,140);
    window.addEventListener('pagehide',()=>{if(timerId)clearInterval(timerId);},{once:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
