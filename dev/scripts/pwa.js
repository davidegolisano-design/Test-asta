(function(){
  if(window.__liveastaPwaInstallLoaded) return;
  window.__liveastaPwaInstallLoaded=true;

  function cleanupMalformedLegacy(){
    const bad=document.getElementById('liveasta-v076-desktop-board');
    if(bad) bad.remove();
    try{
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
      const remove=[];
      while(walker.nextNode()){
        const n=walker.currentNode;
        const t=String(n.nodeValue||'').trim();
        if(t==='\\' || t==='\\n' || t==='\\n\\n') remove.push(n);
      }
      remove.forEach(n=>n.remove());
    }catch(_){}
  }

  function addDevMarker(){
    const home=document.querySelector('#screen-role .setup-card');
    if(!home || document.getElementById('liveasta-dev-marker')) return;

    const marker=document.createElement('div');
    marker.id='liveasta-dev-marker';
    marker.setAttribute('role','status');
    marker.innerHTML='<strong>⚠ AMBIENTE DEV · v0.94 CLEAN-02</strong><span>NON È LA VERSIONE PUBBLICA</span>';
    marker.style.cssText='width:100%;box-sizing:border-box;margin:0 0 14px;padding:10px 12px;border:2px solid #ffb300;border-radius:12px;background:#332400;color:#ffd54f;text-align:center;font-family:Inter,system-ui,sans-serif;font-weight:800;letter-spacing:.04em;line-height:1.25;box-shadow:0 0 0 2px rgba(255,179,0,.12) inset;';
    const sub=marker.querySelector('span');
    if(sub) sub.style.cssText='display:block;margin-top:4px;font-size:11px;letter-spacing:.09em;color:#fff3c4;';
    home.prepend(marker);
  }

  cleanupMalformedLegacy();
  addDevMarker();
  document.title='LIVEASTA DEV CLEAN';

  const button=document.createElement('button');
  button.id='liveasta-install-btn';
  button.type='button';
  button.textContent='Installa LIVEASTA';
  document.body.appendChild(button);

  let deferredPrompt=null;
  // DEV: service worker disabled to avoid stale assets.
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
})();
