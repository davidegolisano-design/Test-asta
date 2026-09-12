/* LIVEASTA v0.90 — gestione: 8 menu principali, chiusura pulita e UI coerente */
(function(){
  'use strict';

  const STORAGE_PREFIX='liveasta:v090:management-menu:';
  const MENU_DEFS=[
    ['room-rules-card','regole-stanza'],
    ['self-raise-control-card','autorilancio'],
    ['online-players-card','giocatori-online'],
    ['auctioneer-player-control-card','banditore-giocatore'],
    ['ready-control-card','ready-prima-asta'],
    ['auto-random-control-card','random-automatico'],
    ['nomination-control-card','banditura-turni'],
    ['teams-card','squadre']
  ];

  function readState(key){
    try{return localStorage.getItem(STORAGE_PREFIX+key)==='1';}catch(_){return false;}
  }
  function saveState(key,value){
    try{localStorage.setItem(STORAGE_PREFIX+key,value?'1':'0');}catch(_){}
  }

  function cleanupLegacy(root){
    root.querySelectorAll('.v087-collapse-btn').forEach(btn=>btn.remove());
    root.querySelectorAll('.control-card.v087-collapsed').forEach(card=>card.classList.remove('v087-collapsed'));
    root.querySelectorAll('.control-card[data-v087-collapsible="1"]').forEach(card=>card.removeAttribute('data-v087-collapsible'));
  }

  function getHeader(card){
    let header=[...card.children].find(el=>el.classList?.contains('control-title')||el.classList?.contains('v087-card-title'))||null;
    let title=header?.querySelector('h3')||[...card.children].find(el=>el.tagName==='H3')||card.querySelector('h3');
    if(!title)return null;

    if(!header){
      header=document.createElement('div');
      header.className='v090-menu-header';
      card.insertBefore(header,title);
      header.appendChild(title);
    }else{
      header.classList.add('v090-menu-header');
    }

    const titleParent=title.parentElement;
    if(titleParent && titleParent!==header)titleParent.classList.add('v090-title-wrap');
    return {header,title};
  }

  function setCollapsed(card,header,key,collapsed){
    card.classList.toggle('v090-collapsed',collapsed);
    header.setAttribute('aria-expanded',collapsed?'false':'true');
    header.setAttribute('title',collapsed?'Apri sezione':'Chiudi sezione');
    saveState(key,collapsed);
  }

  function bindMenu(card,key){
    const parts=getHeader(card);
    if(!parts)return;
    const {header,title}=parts;
    card.classList.add('v090-menu-card');
    card.dataset.v090Menu=key;
    header.setAttribute('role','button');
    header.setAttribute('tabindex','0');
    header.setAttribute('aria-label',(title.childNodes?.[0]?.textContent||title.textContent||key).trim());

    setCollapsed(card,header,key,readState(key));

    const isInteractiveTarget=target=>!!target.closest('button,input,select,textarea,a,label,[role="switch"]');
    header.addEventListener('click',event=>{
      if(isInteractiveTarget(event.target))return;
      setCollapsed(card,header,key,!card.classList.contains('v090-collapsed'));
    });
    header.addEventListener('keydown',event=>{
      if(event.key!=='Enter' && event.key!==' ')return;
      if(isInteractiveTarget(event.target) && event.target!==header)return;
      event.preventDefault();
      setCollapsed(card,header,key,!card.classList.contains('v090-collapsed'));
    });
  }

  function setupTeamCount(root){
    const card=root.querySelector('.teams-card');
    const title=card?.querySelector('.v090-menu-header h3');
    const source=document.getElementById('control-team-count');
    const body=document.getElementById('control-teams-body');
    if(!card||!title)return;

    let inline=title.querySelector('.v090-team-count-inline');
    if(!inline){
      inline=document.createElement('span');
      inline.className='v090-team-count-inline';
      const help=title.querySelector('.mg-help');
      if(help)title.insertBefore(inline,help); else title.appendChild(inline);
    }

    const update=()=>{
      let n=0;
      const text=(source?.textContent||'').trim();
      const match=text.match(/\d+/);
      if(match)n=parseInt(match[0],10)||0;
      else if(body)n=body.querySelectorAll(':scope > tr').length;
      inline.textContent=` · ${n}`;
      inline.setAttribute('aria-label',`${n} squadre`);
    };
    update();
    if(source)new MutationObserver(update).observe(source,{childList:true,characterData:true,subtree:true});
    if(body)new MutationObserver(update).observe(body,{childList:true});
  }

  function markSubsections(root){
    root.querySelectorAll('.room-rules-card .setup-grid,.room-rules-card .setup-grid-4,.self-raise-control-row,.online-player-list,.auctioneer-player-control-row,.auto-random-role-grid,.nomination-auto-bid-one-option,.nomination-order-box,.nomination-control-actions,.nomination-turn-nav,.team-create-row,.control-table-wrap').forEach(el=>el.classList.add('v090-subsection'));

    const purchases=root.querySelector('.purchases-card');
    if(purchases)purchases.classList.add('v090-utility-card');
  }

  function init(){
    const root=document.getElementById('screen-room-control');
    if(!root)return;

    cleanupLegacy(root);
    MENU_DEFS.forEach(([cls,key])=>{
      const card=root.querySelector('.'+cls);
      if(card)bindMenu(card,key);
    });
    setupTeamCount(root);
    markSubsections(root);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
