(function(){
  if(window.__liveastaPwaInstallLoaded) return;
  window.__liveastaPwaInstallLoaded=true;

  const APP_VERSION='v1.06.2 DEV · Fluo';
  const IS_RAWGITHACK=/raw\.githack\.com$/i.test(location.hostname);

  function applyLiveAstaVersion(){
    document.title='LIVEASTA · '+APP_VERSION;
    document.querySelectorAll('.settings-version-badge,.admin-version-badge').forEach(el=>{
      el.textContent=APP_VERSION;
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

  loadCss('./styles/auctioneer-mobile-clean-dev.css?v=10418');
  loadCss('./styles/room-chat.css?v=10418');

  if(IS_RAWGITHACK && 'serviceWorker' in navigator){
    navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(reg=>reg.unregister())).catch(()=>{});
    if(window.caches)caches.keys().then(keys=>Promise.all(keys.map(key=>caches.delete(key)))).catch(()=>{});
  }else if('serviceWorker' in navigator){
    window.addEventListener('load',()=>{navigator.serviceWorker.register('./service-worker.js').catch(()=>{});},{once:true});
  }

  const button=document.createElement('button');
  button.id='liveasta-install-btn';button.type='button';button.textContent='Installa LIVEASTA';document.body.appendChild(button);
  let deferredPrompt=null;let installed=false;
  function isStandalone(){return window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: fullscreen)').matches||window.navigator.standalone===true;}
  function isHomeActive(){return document.getElementById('screen-role')?.classList.contains('active')===true;}
  function syncInstallButton(){installed=installed||isStandalone();const shouldShow=!!deferredPrompt&&!installed&&isHomeActive();button.classList.toggle('show',shouldShow);button.hidden=!shouldShow;}
  button.hidden=true;
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;syncInstallButton();});
  button.addEventListener('click',async()=>{if(!deferredPrompt||installed||!isHomeActive())return;deferredPrompt.prompt();try{await deferredPrompt.userChoice;}catch(_){}deferredPrompt=null;syncInstallButton();});
  window.addEventListener('appinstalled',()=>{installed=true;deferredPrompt=null;button.classList.remove('show');button.hidden=true;});
  const homeScreen=document.getElementById('screen-role');if(homeScreen)new MutationObserver(syncInstallButton).observe(homeScreen,{attributes:true,attributeFilter:['class']});
  window.matchMedia('(display-mode: standalone)').addEventListener?.('change',syncInstallButton);window.addEventListener('pageshow',syncInstallButton);document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncInstallButton();});syncInstallButton();

  const featureScripts=[
    './scripts/auctioneer-mobile-board-dev.js?v=10418',
    './scripts/opponent-credits.js?v=1062',
    './scripts/room-chat.js?v=1062',
    './scripts/room-chat-entry-sync.js?v=10418',
    './scripts/debug-v103.js?v=1032',
    './scripts/stability-core.js?v=1035',
    './scripts/session-resume.js?v=106-fluo1',
    './scripts/exact-bid-cooldown-exemption.js?v=10419',
    './scripts/player-room-status-leds.js?v=10420',
    './scripts/room-creation-success-guard.js?v=10418b',
    './scripts/room-creation-contact.js?v=106-fluo1'
  ];
  featureScripts.forEach(src=>{const script=document.createElement('script');script.src=src;script.async=false;document.head.appendChild(script);});
})();
