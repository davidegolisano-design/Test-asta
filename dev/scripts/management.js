/* LIVEASTA DEV — Gestione cleanup; player access authorization is owned by app.js */
(function(){
  'use strict';

  function cleanupOldManagement(){
    const root=document.getElementById('screen-room-control');
    if(!root)return;
    root.classList.remove('v092-mobile-management');
    root.querySelectorAll('.v087-collapsed,.v090-collapsed').forEach(el=>el.classList.remove('v087-collapsed','v090-collapsed'));
    root.querySelectorAll('.v087-collapse-btn,.v091-collapse-btn,.v092-collapse-btn').forEach(el=>el.remove());
    root.querySelectorAll('[data-v087-collapsible]').forEach(el=>el.removeAttribute('data-v087-collapsible'));
  }

  function init(){
    cleanupOldManagement();
    const root=document.getElementById('screen-room-control');
    if(root){
      const observer=new MutationObserver(cleanupOldManagement);
      observer.observe(root,{childList:true,subtree:false});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
