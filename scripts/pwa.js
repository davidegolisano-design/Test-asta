(function(){
  if(window.__liveastaPwaInstallLoaded) return;
  window.__liveastaPwaInstallLoaded=true;

  const DEV_VERSION='v1.04.10';
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

  /*
    DEV MOBILE presentation layer.
    Loaded after refinements.css so smartphone fixes have one clear owner.
    No auction/realtime logic is changed here.
  */
  const mobileDevCss=document.createElement('link');
  mobileDevCss.rel='stylesheet';
  mobileDevCss.href='./styles/auctioneer-mobile-dev.css?v=10410';
  document.head.appendChild(mobileDevCss);

  /* Keep the semantic mobile label synchronized with the existing phase class. */
  function syncMobilePhaseLabels(){
    const board=document.getElementById('screen-auctioneer-board');
    const view=document.getElementById('view-auction');
    if(!board?.classList.contains('auctioneer-ui-mobile')||!view)return;

    const left=document.getElementById('mobile-left-label');
    if(!left)return;

    if(view.classList.contains('mobile-preparing')) left.textContent='PREPARAZIONE';
    else if(view.classList.contains('mobile-normal')) left.textContent='TIMER';
    else if(view.classList.contains('mobile-sealed-opening')) left.textContent='APERTURA';
    else if(view.classList.contains('mobile-sealed-collecting')) left.textContent='TIMER BUSTE';
    else if(view.classList.contains('mobile-ready')) left.textContent='FVM';
  }

  function installMobilePhaseObserver(){
    const view=document.getElementById('view-auction');
    if(!view)return;
    syncMobilePhaseLabels();
    new MutationObserver(syncMobilePhaseLabels)
      .observe(view,{attributes:true,attributeFilter:['class']});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',installMobilePhaseObserver,{once:true});
  }else{
    installMobilePhaseObserver();
  }

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
    './scripts/opponent-credits.js?v=103',
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
