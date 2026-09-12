/* LIVEASTA DEV — Gestione compatibility cleanup only. UI structure is owned by index.html + management.css. */
(function(){
  'use strict';
  function cleanupOldManagement(){
    const root=document.getElementById('screen-room-control');
    if(!root)return;
    root.classList.remove('v092-mobile-management','mg-system');
    root.querySelectorAll('.v087-collapsed,.v090-collapsed').forEach(el=>el.classList.remove('v087-collapsed','v090-collapsed'));
    root.querySelectorAll('.v087-collapse-btn,.v091-collapse-btn,.v092-collapse-btn,.mg-section-label').forEach(el=>el.remove());
    root.querySelectorAll('[data-v087-collapsible]').forEach(el=>el.removeAttribute('data-v087-collapsible'));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cleanupOldManagement,{once:true});
  else cleanupOldManagement();
})();
