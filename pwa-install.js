(function(){
  if(window.__liveastaPwaInstallLoaded) return;
  window.__liveastaPwaInstallLoaded=true;

  const style=document.createElement('style');
  style.textContent=`
    #liveasta-install-btn{
      position:fixed;right:14px;bottom:14px;z-index:999999;
      display:none;align-items:center;justify-content:center;
      min-height:44px;padding:10px 16px;border-radius:12px;
      border:1px solid var(--theme-border,rgba(255,255,255,.18));
      background:var(--theme-primary,#6c5cff);color:#fff;
      font:800 14px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      box-shadow:0 8px 24px rgba(0,0,0,.22);cursor:pointer;
    }
    #liveasta-install-btn.show{display:flex}
    @media(display-mode:standalone){#liveasta-install-btn{display:none!important}}
  `;
  document.head.appendChild(style);

  const button=document.createElement('button');
  button.id='liveasta-install-btn';
  button.type='button';
  button.textContent='Installa LIVEASTA';
  document.body.appendChild(button);

  let deferredPrompt=null;

  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>{
      navigator.serviceWorker.register('./service-worker.js',{scope:'./'})
        .catch(err=>console.warn('Service worker non registrato:',err));
    });
  }

  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredPrompt=event;
    button.classList.add('show');
  });

  button.addEventListener('click',async()=>{
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    try{await deferredPrompt.userChoice;}catch(_){ }
    deferredPrompt=null;
    button.classList.remove('show');
  });

  window.addEventListener('appinstalled',()=>{
    deferredPrompt=null;
    button.classList.remove('show');
  });
})();
