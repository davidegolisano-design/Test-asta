/* LIVEASTA DEV — Gestione visual normalization; application logic remains in app.js. */
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

  function addSection(root, cls, beforeSelector, title, copy){
    if(root.querySelector('.'+cls))return;
    const before=root.querySelector(beforeSelector);
    if(!before)return;
    const section=document.createElement('div');
    section.className='mg-section-label '+cls;
    section.innerHTML='<strong>'+title+'</strong><span>'+copy+'</span>';
    before.parentNode.insertBefore(section,before);
  }

  function normalizeSwitch(buttonId, cardSelector, label){
    const button=document.getElementById(buttonId);
    const card=document.querySelector(cardSelector);
    const head=card?.querySelector(':scope > .control-title');
    if(!button||!head)return;
    button.classList.add('mg-state-switch');
    button.setAttribute('role','switch');
    button.setAttribute('aria-label',label);
    if(!button.hasAttribute('aria-checked'))button.setAttribute('aria-checked','false');
    if(button.parentElement!==head)head.appendChild(button);
  }

  function normalizeManagementUI(){
    const root=document.getElementById('screen-room-control');
    if(!root)return;
    cleanupOldManagement();
    root.classList.add('mg-system');

    addSection(root,'mg-section-room','.room-rules-card','Impostazioni stanza','Parametri generali, timer e limiti rosa');
    addSection(root,'mg-section-auction','.ready-control-card','Modalità asta','Comportamenti e automatismi della sessione');
    addSection(root,'mg-section-data','.teams-card','Partecipanti e dati','Squadre, rose e operazioni amministrative');

    normalizeSwitch('self-raise-toggle','.self-raise-control-card','Autorilancio');
    normalizeSwitch('ready-toggle-btn','.ready-control-card','READY prima dell\'asta');
    normalizeSwitch('auctioneer-player-toggle-btn','.auctioneer-player-control-card','Banditore giocatore');
    normalizeSwitch('nomination-toggle-btn','.nomination-control-card','Banditura giocatori a turni');

    const randomMaster=root.querySelector('.auto-random-master-switch');
    if(randomMaster){
      randomMaster.classList.add('mg-state-switch-wrap');
      randomMaster.setAttribute('aria-label','Random automatico');
    }

    const autoBid=document.getElementById('nomination-auto-bid-one');
    if(autoBid)autoBid.setAttribute('aria-label','Offerta 1 banditore');

    root.querySelectorAll('.toolbar-row:empty').forEach(row=>row.hidden=true);
  }

  function init(){
    normalizeManagementUI();
    const root=document.getElementById('screen-room-control');
    if(root){
      const observer=new MutationObserver(()=>{
        cleanupOldManagement();
        root.querySelectorAll('.toolbar-row:empty').forEach(row=>row.hidden=true);
      });
      observer.observe(root,{childList:true,subtree:true});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
