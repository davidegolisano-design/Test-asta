(function(){
  if(window.__liveastaPwaInstallLoaded) return;
  window.__liveastaPwaInstallLoaded=true;

  const DEV_VERSION='v1.04.15';
  const IS_RAWGITHACK=/raw\.githack\.com$/i.test(location.hostname);

  function applyLiveAstaVersion(){
    document.title='LIVEASTA · DEV MOBILE '+DEV_VERSION;
    document.querySelectorAll('.home-version-badge,.admin-version-badge').forEach(el=>{
      el.textContent='DEV MOBILE · '+DEV_VERSION;
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',applyLiveAstaVersion,{once:true});
  }else{
    applyLiveAstaVersion();
  }

  function loadCss(href){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    document.head.appendChild(link);
  }

  /* DEV layers loaded after refinements.css. */
  loadCss('./styles/auctioneer-mobile-clean-dev.css?v=10415');
  loadCss('./styles/game-glow-dev.css?v=10415');
  loadCss('./styles/room-chat.css?v=10415');

  /* Branch preview must not be polluted by an old installed service worker/cache. */
  if(IS_RAWGITHACK && 'serviceWorker' in navigator){
    navigator.serviceWorker.getRegistrations()
      .then(regs=>regs.forEach(reg=>reg.unregister()))
      .catch(()=>{});
    if(window.caches){
      caches.keys()
        .then(keys=>Promise.all(keys.map(key=>caches.delete(key))))
        .catch(()=>{});
    }
  }else if('serviceWorker' in navigator){
    window.addEventListener('load',()=>{
      navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
    },{once:true});
  }

  const button=document.createElement('button');
  button.id='liveasta-install-btn';
  button.type='button';
  button.textContent='Installa LIVEASTA';
  document.body.appendChild(button);

  let deferredPrompt=null;
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredPrompt=event;
    button.classList.add('show');
  });

  button.addEventListener('click',async()=>{
    if(!deferredPrompt)return;
    deferredPrompt.prompt();
    try{await deferredPrompt.userChoice;}catch(_){}
    deferredPrompt=null;
    button.classList.remove('show');
  });

  window.addEventListener('appinstalled',()=>{
    deferredPrompt=null;
    button.classList.remove('show');
  });

  const featureScripts=[
    './scripts/theme-glow-dev.js?v=10415',
    './scripts/auctioneer-mobile-board-dev.js?v=10415',
    './scripts/opponent-credits.js?v=103',
    './scripts/room-chat.js?v=10415',
    './scripts/room-chat-entry-sync.js?v=10415',
    './scripts/debug-v103.js?v=1032',
    './scripts/stability-core.js?v=1035',
    './scripts/session-resume.js?v=103'
  ];

  featureScripts.forEach(src=>{
    const script=document.createElement('script');
    script.src=src;
    script.async=false;
    document.head.appendChild(script);
  });
})();
