// LIVEASTA DEV - evita che il messaggio legacy di creazione riuscita appaia come errore rosso.
(function(){
  if(window.__liveastaRoomSuccessGuardLoaded)return;
  window.__liveastaRoomSuccessGuardLoaded=true;

  function cleanLegacySuccess(){
    const el=document.getElementById('auction-room-error');
    if(!el)return;
    const text=String(el.textContent||'').trim().toLowerCase();
    if(text.includes('stanza creata correttamente') || text.includes('deve essere approvata')){
      el.textContent='';
      el.style.display='none';
    }else if(text){
      el.style.display='';
    }
  }

  function boot(){
    const el=document.getElementById('auction-room-error');
    if(el)new MutationObserver(cleanLegacySuccess).observe(el,{childList:true,subtree:true,characterData:true});
    document.addEventListener('click',e=>{
      if(e.target.closest?.('#auction-wizard-next')){
        const err=document.getElementById('auction-room-error');
        if(err){err.textContent='';err.style.display='';}
      }
    },true);
    cleanLegacySuccess();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
