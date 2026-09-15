// === liveasta-mobile-board-fix ===
(function(){
  const mq=window.matchMedia('(max-width:760px)');

  function relocateNextArrow(){
    const btn=document.getElementById('btn-next');
    const player=document.querySelector('#screen-auctioneer-board #auction-dashboard.mode-mobile #view-auction .col-player');
    const timer=document.querySelector('#screen-auctioneer-board #auction-dashboard #view-auction .col-timer');
    if(!btn||!player||!timer)return;

    if(mq.matches){
      if(btn.parentElement!==player)player.appendChild(btn);
    }else{
      if(btn.parentElement!==timer){
        const turn=document.getElementById('auctioneer-turn-center');
        if(turn&&turn.parentElement===timer)timer.insertBefore(btn,turn);
        else timer.appendChild(btn);
      }
    }
  }

  function fitMobileAuctionNumbers(){
    if(!mq.matches)return;
    const timer=document.getElementById('countdown-display');
    const value=document.getElementById('current-value-display');

    if(timer){
      const n=String(timer.textContent||'').trim().length;
      timer.classList.toggle('digits-3',n>=3);
    }
    if(value){
      const n=String(value.textContent||'').trim().length;
      value.classList.toggle('digits-3',n===3);
      value.classList.toggle('digits-4',n>=4);
    }
  }

  function cleanMobileNoOffer(){
    if(!mq.matches)return;
    const winner=document.getElementById('winner-display');
    if(winner && /nessuna offerta/i.test(winner.textContent||'')) winner.textContent='';
  }

  function refresh(){
    relocateNextArrow();
    cleanMobileNoOffer();
    fitMobileAuctionNumbers();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',refresh,{once:true});
  }else{
    refresh();
  }

  mq.addEventListener?.('change',refresh);
  window.addEventListener('resize',refresh);

  const obs=new MutationObserver(refresh);
  const startObserver=()=>{
    ['countdown-display','current-value-display','winner-display','btn-next'].forEach(id=>{
      const el=document.getElementById(id);
      if(el)obs.observe(el,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style','class']});
    });
  };
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',startObserver,{once:true});
  }else{
    startObserver();
  }

  window.fitMobileAuctionNumbers=fitMobileAuctionNumbers;
})();

// === liveasta-confirm-modal ===
(function(){
  let activeResolve=null;
  let previousFocus=null;

  function isDangerMessage(message){
    return /(elimin|rimuov|annull|reset|riprist|cancell|uscire|rimbors|definitiv)/i.test(String(message||''));
  }

  function closeConfirm(result){
    const overlay=document.getElementById('liveasta-confirm-overlay');
    if(!overlay)return;

    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('liveasta-confirm-open');

    const resolve=activeResolve;
    activeResolve=null;

    if(previousFocus && typeof previousFocus.focus==='function'){
      try{ previousFocus.focus({preventScroll:true}); }catch(_){}
    }
    previousFocus=null;

    if(resolve)resolve(!!result);
  }

  window.appConfirm=function(message,options={}){
    return new Promise(resolve=>{
      const overlay=document.getElementById('liveasta-confirm-overlay');
      const title=document.getElementById('liveasta-confirm-title');
      const text=document.getElementById('liveasta-confirm-message');
      const cancel=document.getElementById('liveasta-confirm-cancel');
      const ok=document.getElementById('liveasta-confirm-ok');

      if(!overlay||!title||!text||!cancel||!ok){
        resolve(false);
        return;
      }

      /* Se per errore arrivassero due richieste insieme, chiude la precedente
         senza eseguire l'azione. */
      if(activeResolve){
        const old=activeResolve;
        activeResolve=null;
        old(false);
      }

      activeResolve=resolve;
      previousFocus=document.activeElement;

      const formatted=window.formatLiveAstaPopupText?window.formatLiveAstaPopupText(message):String(message??'');
      const danger=options.danger ?? isDangerMessage(formatted);
      overlay.classList.toggle('danger',!!danger);

      title.textContent=options.title || (danger?'Conferma operazione':'Conferma');
      text.textContent=formatted;
      cancel.textContent=options.cancelText || 'ANNULLA';
      ok.textContent=options.confirmText || 'CONFERMA';

      cancel.onclick=()=>closeConfirm(false);
      ok.onclick=()=>closeConfirm(true);

      overlay.onclick=(event)=>{
        if(event.target===overlay)closeConfirm(false);
      };

      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden','false');
      document.body.classList.add('liveasta-confirm-open');

      requestAnimationFrame(()=>{
        try{ ok.focus({preventScroll:true}); }catch(_){}
      });
    });
  };

  document.addEventListener('keydown',event=>{
    const overlay=document.getElementById('liveasta-confirm-overlay');
    if(!overlay?.classList.contains('open'))return;

    if(event.key==='Escape'){
      event.preventDefault();
      closeConfirm(false);
    }else if(event.key==='Enter'){
      const active=document.activeElement;
      if(active?.id==='liveasta-confirm-cancel')return;
      event.preventDefault();
      closeConfirm(true);
    }
  });
})();

// === liveasta-alert-modal-and-mobile-quads ===
(function(){
  /* ---------------------------
     ALERT INTERNO LIVEASTA
     --------------------------- */
  const alertQueue=[];
  let alertOpen=false;
  let alertPrevFocus=null;

  function showNextAlert(){
    if(alertOpen || !alertQueue.length)return;

    const overlay=document.getElementById('liveasta-alert-overlay');
    const msg=document.getElementById('liveasta-alert-message');
    const ok=document.getElementById('liveasta-alert-ok');
    if(!overlay||!msg||!ok)return;

    const item=alertQueue.shift();
    alertOpen=true;
    alertPrevFocus=document.activeElement;

    msg.textContent=String(item.message??'');
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden','false');
    document.body.classList.add('liveasta-alert-open');

    const close=()=>{
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden','true');
      document.body.classList.remove('liveasta-alert-open');
      alertOpen=false;

      if(alertPrevFocus && typeof alertPrevFocus.focus==='function'){
        try{alertPrevFocus.focus({preventScroll:true});}catch(_){}
      }
      alertPrevFocus=null;

      item.resolve?.();
      requestAnimationFrame(showNextAlert);
    };

    ok.onclick=close;
    overlay.onclick=(ev)=>{
      if(ev.target===overlay)close();
    };

    requestAnimationFrame(()=>{
      try{ok.focus({preventScroll:true});}catch(_){}
    });
  }

  window.appAlert=function(message){
    return new Promise(resolve=>{
      const formatted=window.formatLiveAstaPopupText?window.formatLiveAstaPopupText(message):String(message??'');
      alertQueue.push({message:formatted,resolve});
      showNextAlert();
    });
  };

  /* Intercetta TUTTI gli alert() esistenti senza dover riscrivere le funzioni. */
  window.alert=function(message){
    window.appAlert(message);
  };

  document.addEventListener('keydown',ev=>{
    const overlay=document.getElementById('liveasta-alert-overlay');
    if(!overlay?.classList.contains('open'))return;
    if(ev.key==='Enter' || ev.key==='Escape'){
      ev.preventDefault();
      document.getElementById('liveasta-alert-ok')?.click();
    }
  });

  /* ---------------------------
     QUADRANTI BANDITORE MOBILE
     --------------------------- */
  const mq=window.matchMedia('(max-width:760px)');

  function cleanMobileWinnerText(){
    if(!mq.matches)return;
    const w=document.getElementById('winner-display');
    if(!w)return;
    const txt=String(w.textContent||'').trim();
    if(/^(nessuno|nessuna offerta|nessuno offerente)$/i.test(txt)){
      w.textContent='';
    }
  }

  function fitMobileQuadNumbers(){
    if(!mq.matches)return;

    const timer=document.getElementById('countdown-display');
    const offer=document.getElementById('current-value-display');

    if(timer){
      const t=String(timer.textContent||'').trim();
      const n=t.replace(/\D/g,'').length || t.length;
      timer.classList.toggle('quad-digits-3',n>=3);
      timer.classList.toggle('quad-digits-4',n>=4);
    }

    if(offer){
      const t=String(offer.textContent||'').trim();
      const n=t.replace(/\D/g,'').length || t.length;
      offer.classList.toggle('quad-digits-3',n===3);
      offer.classList.toggle('quad-digits-4',n>=4);
    }
  }

  function refreshMobileQuads(){
    cleanMobileWinnerText();
    fitMobileQuadNumbers();
  }

  function observeMobileQuads(){
    ['winner-display','countdown-display','current-value-display'].forEach(id=>{
      const el=document.getElementById(id);
      if(!el)return;
      new MutationObserver(refreshMobileQuads).observe(el,{
        subtree:true,childList:true,characterData:true
      });
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{
      refreshMobileQuads();
      observeMobileQuads();
    },{once:true});
  }else{
    refreshMobileQuads();
    observeMobileQuads();
  }

  mq.addEventListener?.('change',refreshMobileQuads);
})();

// === liveasta-mobile-offer-cleaner ===
(function(){
  const mq=window.matchMedia('(max-width:760px)');
  function clean(){
    if(!mq.matches)return;
    const w=document.getElementById('winner-display');
    if(!w)return;
    const t=String(w.textContent||'').trim();
    if(/^(nessuno|nessuna offerta|nessuno offerente|--|-)$|^$/i.test(t)){
      w.textContent='';
    }
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',clean,{once:true});
  }else clean();

  const start=()=>{
    const w=document.getElementById('winner-display');
    if(w)new MutationObserver(clean).observe(w,{subtree:true,childList:true,characterData:true});
  };
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else start();
})();

// === liveasta-mobile-winner-sync ===
(function(){
  const mq=window.matchMedia('(max-width:760px)');

  function normalizeWinnerText(value){
    const t=String(value||'').trim();
    if(/^(nessuno|nessuna offerta|nessuno offerente|--|-)?$/i.test(t))return '';
    return t;
  }

  function syncMobileWinner(){
    const source=document.getElementById('winner-display');
    const target=document.getElementById('mobile-winner-display');
    if(!source||!target)return;

    if(!mq.matches){
      target.textContent='';
      return;
    }

    target.textContent=normalizeWinnerText(source.textContent);

    /* Copia solo un eventuale colore esplicito dello stato, non la geometria. */
    const inlineColor=source.style.color;
    target.style.color=inlineColor||'';
  }

  function start(){
    syncMobileWinner();
    const source=document.getElementById('winner-display');
    if(source){
      new MutationObserver(syncMobileWinner).observe(source,{
        subtree:true,
        childList:true,
        characterData:true,
        attributes:true,
        attributeFilter:['style']
      });
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else start();

  mq.addEventListener?.('change',syncMobileWinner);
})();

// === liveasta-popup-text-cleaner ===
(function(){
  window.formatLiveAstaPopupText=function(value){
    let text;
    if(value instanceof Error) text=value.message||'Operazione non riuscita.';
    else if(value && typeof value==='object'){
      text=value.message || value.error_description || value.details || value.hint || '';
      if(!text){
        try{text=JSON.stringify(value);}catch(_){text='Operazione non riuscita.';}
      }
    }else text=String(value??'');

    return text
      .replace(/\\n/g,'\n')
      .replace(/\r\n?/g,'\n')
      .replace(/\[object Object\]/gi,'Operazione non riuscita.')
      .replace(/\b(PostgrestError|AuthApiError|AuthRetryableFetchError|Error)\s*:\s*/gi,'')
      .replace(/[ \t]+\n/g,'\n')
      .replace(/\n{3,}/g,'\n\n')
      .trim();
  };

})();

// === liveasta-room-access-visibility-v1.03 ===
/*
 * ui.css contiene ancora una regola legacy v0.93 che forza
 * #auction-room-select a display:block!important. La logica applicativa usa
 * invece lo style inline per scegliere tra select stanza e input nome stanza.
 * Qui facciamo rispettare lo stato applicativo senza toccare la logica di accesso.
 */
(function(){
  const ids=[
    'auction-room-select',
    'auction-room-name-input',
    'player-room-select',
    'player-room-name-input'
  ];

  function enforceHiddenPriority(el){
    if(!el)return;
    const display=String(el.style.getPropertyValue('display')||'').trim().toLowerCase();
    const priority=el.style.getPropertyPriority('display');
    if(display==='none' && priority!=='important'){
      el.style.setProperty('display','none','important');
    }
  }

  function refreshRoomAccessVisibility(){
    ids.forEach(id=>enforceHiddenPriority(document.getElementById(id)));
  }

  function start(){
    refreshRoomAccessVisibility();
    ids.forEach(id=>{
      const el=document.getElementById(id);
      if(!el)return;
      new MutationObserver(()=>enforceHiddenPriority(el)).observe(el,{
        attributes:true,
        attributeFilter:['style']
      });
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }

  window.refreshRoomAccessVisibility=refreshRoomAccessVisibility;
})();
