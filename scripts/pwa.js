(function(){
  if(window.__liveastaPwaInstallLoaded) return;
  window.__liveastaPwaInstallLoaded=true;

  const DEV_VERSION='v1.04.05';
  const IS_RAWGITHACK=/raw\.githack\.com$/i.test(location.hostname);

  function applyLiveAstaVersion(){
    document.title='LIVEASTA · DEV MOBILE '+DEV_VERSION;
    document.querySelectorAll('.home-version-badge,.admin-version-badge').forEach(el=>{el.textContent='DEV MOBILE · '+DEV_VERSION;});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyLiveAstaVersion,{once:true});else applyLiveAstaVersion();

  /* DEV: CSS inline nello stesso script che aggiorna la versione.
     Se compare v1.04.05, queste regole sono necessariamente state eseguite. */
  const mobileDevStyle=document.createElement('style');
  mobileDevStyle.id='liveasta-mobile-dev-inline';
  mobileDevStyle.textContent=`
@media (max-width:760px){
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction .col-player{
    grid-template-rows:clamp(30px,5.2dvh,38px) minmax(0,1fr) 38px!important;
    padding:6px 8px 8px!important;
    gap:2px!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction #auction-player-name-top{
    height:auto!important;min-height:0!important;max-width:100%!important;
    font-size:clamp(25px,7vw,38px)!important;line-height:1!important;
    white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction #auction-player-meta{
    width:100%!important;height:38px!important;min-height:38px!important;
    margin:0!important;padding:2px 8px!important;box-sizing:border-box!important;
    display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;
    align-items:center!important;justify-content:center!important;gap:6px!important;overflow:hidden!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction #auction-player-meta .meta-dot{
    display:none!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction #auction-player-role{
    flex:0 0 auto!important;width:auto!important;height:auto!important;min-width:0!important;
    margin:0!important;padding:0!important;display:flex!important;align-items:center!important;justify-content:center!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction #auction-player-club{
    flex:0 1 auto!important;width:auto!important;min-width:0!important;max-width:48%!important;
    margin:0!important;padding:0!important;font-size:clamp(14px,3.8vw,18px)!important;line-height:1!important;
    text-align:left!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;
  }
}`;
  document.head.appendChild(mobileDevStyle);

  /* Preview DEV: niente Service Worker/cache applicativa. */
  if(IS_RAWGITHACK && 'serviceWorker' in navigator){
    navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(reg=>reg.unregister())).catch(()=>{});
    if(window.caches)caches.keys().then(keys=>Promise.all(keys.map(key=>caches.delete(key)))).catch(()=>{});
  }else if('serviceWorker' in navigator){
    window.addEventListener('load',()=>{navigator.serviceWorker.register('./service-worker.js').catch(()=>{});},{once:true});
  }

  const button=document.createElement('button');
  button.id='liveasta-install-btn';button.type='button';button.textContent='Installa LIVEASTA';document.body.appendChild(button);
  let deferredPrompt=null;
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;button.classList.add('show');});
  button.addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();try{await deferredPrompt.userChoice;}catch(_){}deferredPrompt=null;button.classList.remove('show');});
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;button.classList.remove('show');});

  const featureScripts=[
    './scripts/opponent-credits.js?v=103',
    './scripts/debug-v103.js?v=1032',
    './scripts/stability-core.js?v=1035',
    './scripts/session-resume.js?v=103'
  ];
  featureScripts.forEach(src=>{const script=document.createElement('script');script.src=src;script.async=false;document.head.appendChild(script);});
})();
