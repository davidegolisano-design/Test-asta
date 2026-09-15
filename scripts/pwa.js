(function(){
  if(window.__liveastaPwaInstallLoaded) return;
  window.__liveastaPwaInstallLoaded=true;

  function applyLiveAstaVersion(){
    document.title='LIVEASTA · v1.03';
    document.querySelectorAll('.home-version-badge,.admin-version-badge').forEach(el=>{el.textContent='v1.03';});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyLiveAstaVersion,{once:true});else applyLiveAstaVersion();

  if('serviceWorker' in navigator)window.addEventListener('load',()=>{navigator.serviceWorker.register('./service-worker.js').catch(()=>{});},{once:true});

  const button=document.createElement('button');
  button.id='liveasta-install-btn';button.type='button';button.textContent='Installa LIVEASTA';document.body.appendChild(button);
  let deferredPrompt=null;
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;button.classList.add('show');});
  button.addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();try{await deferredPrompt.userChoice;}catch(_){}deferredPrompt=null;button.classList.remove('show');});
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;button.classList.remove('show');});

  if(typeof window.playerImageFallback!=='function'){
    const fallbackSvg="data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='48' fill='%23141820'/%3E%3Ccircle cx='256' cy='190' r='92' fill='%23343c49'/%3E%3Cpath d='M96 470c14-103 74-158 160-158s146 55 160 158' fill='%23343c49'/%3E%3C/svg%3E";
    window.playerImageFallback=function playerImageFallback(img){if(!img||img.dataset.liveastaFallbackBusy==='1')return;img.dataset.liveastaFallbackBusy='1';img.src=fallbackSvg;setTimeout(()=>{try{delete img.dataset.liveastaFallbackBusy;}catch(_){img.dataset.liveastaFallbackBusy='0';}},0);};
  }

  const featureScripts=[
    './scripts/opponent-credits.js?v=103',
    './scripts/debug-v103.js?v=1032',
    './scripts/image-fallback-fix.js?v=1031',
    './scripts/player-access-race-fix.js?v=1031',
    './scripts/ready-gate-cleanup-fix.js?v=1031',
    './scripts/sealed-submission-resume-fix.js?v=1032',
    './scripts/sealed-ui-race-fix.js?v=1031',
    './scripts/session-resume.js?v=103'
  ];
  featureScripts.forEach(src=>{const script=document.createElement('script');script.src=src;script.async=false;document.head.appendChild(script);});
})();
