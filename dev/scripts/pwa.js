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

  cleanupMalformedLegacy();
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
