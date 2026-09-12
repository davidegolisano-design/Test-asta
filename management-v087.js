/* LIVEASTA v0.87 — gestione: sezioni richiudibili senza cambiare logiche */
(function(){
  'use strict';

  const STORAGE_PREFIX='liveasta:v087:control-collapse:';

  function safeGet(key){
    try{return localStorage.getItem(STORAGE_PREFIX+key);}catch(_){return null;}
  }
  function safeSet(key,value){
    try{localStorage.setItem(STORAGE_PREFIX+key,value?'1':'0');}catch(_){}
  }

  function cardKey(card,index){
    const preferred=[
      'room-rules-card','self-raise-control-card','online-players-card',
      'auctioneer-player-control-card','ready-control-card','auto-random-control-card',
      'nomination-control-card','teams-card','audio-mixer-card','sealed-control-card'
    ];
    for(const cls of preferred){if(card.classList.contains(cls))return cls;}
    if(card.id)return card.id;
    const specific=[...card.classList].find(c=>c!=='control-card' && c!=='purchases-card');
    return specific||('card-'+index);
  }

  function setCardCollapsed(card,button,collapsed,key){
    card.classList.toggle('v087-collapsed',collapsed);
    button.setAttribute('aria-expanded',collapsed?'false':'true');
    button.setAttribute('aria-label',(collapsed?'Apri ':'Chiudi ')+(button.dataset.sectionTitle||'sezione'));
    safeSet(key,collapsed);
  }

  function createCollapseButton(title){
    const button=document.createElement('button');
    button.type='button';
    button.className='v087-collapse-btn';
    button.dataset.sectionTitle=title||'sezione';
    button.innerHTML='<span class="v087-chevron" aria-hidden="true">⌄</span>';
    return button;
  }

  function enhanceCards(root){
    const cards=[...root.querySelectorAll('.control-card')];
    cards.forEach((card,index)=>{
      if(card.classList.contains('purchases-card') || card.dataset.v087Collapsible==='1')return;

      let header=[...card.children].find(el=>el.classList?.contains('control-title'))||null;
      let titleNode=header?.querySelector('h3')||[...card.children].find(el=>el.tagName==='H3')||card.querySelector('h3');
      if(!titleNode)return;

      if(!header || header===titleNode){
        const directTitle=[...card.children].find(el=>el===titleNode);
        if(directTitle){
          const wrapper=document.createElement('div');
          wrapper.className='v087-card-title';
          card.insertBefore(wrapper,directTitle);
          wrapper.appendChild(directTitle);
          header=wrapper;
        }
      }
      if(!header)return;

      const title=(titleNode.childNodes?.[0]?.textContent||titleNode.textContent||'sezione').trim();
      const button=createCollapseButton(title);
      const key=cardKey(card,index);
      header.appendChild(button);
      card.dataset.v087Collapsible='1';

      const saved=safeGet(key);
      const collapsed=saved==='1';
      setCardCollapsed(card,button,collapsed,key);

      button.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        setCardCollapsed(card,button,!card.classList.contains('v087-collapsed'),key);
      });
    });
  }

  function enhanceNominationOrder(root){
    const box=root.querySelector('.nomination-order-box');
    const head=box?.querySelector('.nomination-order-head');
    const list=box?.querySelector('#nomination-order-list');
    if(!box||!head||!list||box.dataset.v087Collapsible==='1')return;

    const button=document.createElement('button');
    button.type='button';
    button.className='v087-list-collapse-btn';
    button.dataset.sectionTitle='Ordine al tavolo';
    button.innerHTML='<span class="v087-chevron" aria-hidden="true">⌄</span>';
    head.appendChild(button);
    box.dataset.v087Collapsible='1';

    const key='nomination-order-list';
    const apply=collapsed=>{
      box.classList.toggle('v087-list-collapsed',collapsed);
      button.setAttribute('aria-expanded',collapsed?'false':'true');
      button.setAttribute('aria-label',(collapsed?'Apri ':'Chiudi ')+'Ordine al tavolo');
      safeSet(key,collapsed);
    };
    apply(safeGet(key)==='1');
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      apply(!box.classList.contains('v087-list-collapsed'));
    });
  }

  function stopPurchasesAutofocus(root){
    const toggle=root.querySelector('#control-purchases-toggle');
    const search=root.querySelector('#control-purchases-search');
    if(!toggle||!search||toggle.dataset.v087NoFocus==='1')return;
    toggle.dataset.v087NoFocus='1';
    toggle.addEventListener('click',()=>{
      /* Salvaguardia aggiuntiva: la funzione nativa v0.87 non mette più il focus. */
      setTimeout(()=>{
        if(document.activeElement===search)search.blur();
      },120);
    },true);
  }

  function init(){
    const root=document.getElementById('screen-room-control');
    if(!root)return;
    enhanceCards(root);
    enhanceNominationOrder(root);
    stopPurchasesAutofocus(root);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
