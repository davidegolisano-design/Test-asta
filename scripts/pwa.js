(function(){
  if(window.__liveastaPwaInstallLoaded) return;
  window.__liveastaPwaInstallLoaded=true;

  const APP_VERSION=window.LIVEASTA_CONFIG?.version || 'v1.07.4';

  function applyLiveAstaVersion(){
    document.title='LIVEASTA';
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

  loadCss('./styles/auctioneer-mobile-clean.css?v=1067');
  loadCss('./styles/room-chat.css?v=10418');

  if('serviceWorker' in navigator && window.LIVEASTA_CONFIG?.serviceWorker === true && !window.premiumDemoBackend){
    window.addEventListener('load',async()=>{
      try{
        const reg=await navigator.serviceWorker.register('/service-worker.js?v='+encodeURIComponent(APP_VERSION),{scope:'/',updateViaCache:'none'});
        await reg.update().catch(()=>{});
      }catch(error){console.error('[LIVEASTA PWA] Service worker',error);}
    },{once:true});
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
    './scripts/auctioneer-mobile-board.js?v=1067',
    './scripts/opponent-credits.js?v=1062',
    './scripts/room-chat.js?v=107-premium1',
    './scripts/room-chat-entry-sync.js?v=10418',
    './scripts/debug-v103.js?v=1032',
    './scripts/stability-core.js?v=1035',
    './scripts/session-resume.js?v=106-fluo1',
    './scripts/exact-bid-cooldown-exemption.js?v=10419',
    './scripts/player-room-status-leds.js?v=10420',
    './scripts/room-creation-contact.js?v=1073'
  ];
  featureScripts.forEach(src=>{const script=document.createElement('script');script.src=src;script.async=false;document.head.appendChild(script);});
})();
