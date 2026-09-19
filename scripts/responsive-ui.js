/* Viewport owns presentation. Resizing never re-enters a room or restarts a timer. */
(function(){
  'use strict';
  const compact=window.matchMedia('(max-width:760px)');
  function sync(){
    const before=document.documentElement.dataset.auctioneerUi;
    const mode=applyAuctioneerUiMode();
    if(before===mode)return;
    const view=document.getElementById('view-auction');
    const mobilePhase=[...view.classList].find(name=>name.startsWith('mobile-')&&name!=='mobile-ended')?.slice(7);
    if(mode==='desktop')[...view.classList].filter(name=>name.startsWith('mobile-')).forEach(name=>view.classList.remove(name));
    if(auctioneerLockToken){
      if(readyGateWaiting)showAuctioneerReadyStage();
      else if(nominationState.enabled && nominationReady && !isAuctionActive && !auctionPrepInterval)showNominationTurnStage();
      else if(sealedAuctionModeActive && view.classList.contains('sealed-collecting'))showSealedAuctionStage(view.classList.contains('sealed-opening')?'opening':'offers');
      else if(mode==='mobile'){
        const ranking=!!document.querySelector('#sealed-ranking-auctioneer .sealed-ranking-row');
        const phase=auctionPrepInterval?'preparing':isAuctionActive?'normal':ranking?'sealed-result':mobilePhase||'normal';
        setMobileBoardPhase(phase);
      }else{
        if(isAuctionActive && !sealedAuctionModeActive)document.getElementById('auction-title-display').textContent='MIGLIOR OFFERENTE';
      }
    }
    requestAnimationFrame(()=>{
      window.fitAuctionNames?.();
      window.fitMobileAuctionNumbers?.();
      window.refreshLiveAstaMobileBoardDev?.();
    });
  }
  compact.addEventListener('change',sync);
  window.addEventListener('pageshow',sync);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
})();
