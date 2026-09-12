/* LIVEASTA v0.92 — Gestione smartphone: flusso compatto, stato squadre, auth banditore-giocatore */
(function(){
  'use strict';

  const mq=window.matchMedia('(max-width:899px)');
  const MENU_STORAGE='liveasta:v092:management-menu:';
  let syncTimer=null;
  let mobileApplied=false;
  let passwordDialog=null;
  let passwordResolver=null;

  const refs={};

  function root(){return document.getElementById('screen-room-control');}
  function grid(){return root()?.querySelector('.control-grid')||null;}

  function getCard(cls){return root()?.querySelector('.'+cls)||null;}

  function rememberOriginal(card){
    if(!card || refs[card.className])return;
    if(!card.__v092Placeholder){
      const marker=document.createComment('v092:'+([...card.classList].find(c=>c.endsWith('-card'))||'card'));
      card.parentNode?.insertBefore(marker,card);
      card.__v092Placeholder=marker;
    }
  }

  function stripTopMenu(card,extraClass){
    if(!card)return;
    rememberOriginal(card);
    card.classList.remove('v090-menu-card','v090-collapsed');
    card.removeAttribute('data-v090-menu');
    card.classList.add(extraClass);
    card.querySelectorAll(':scope > .v090-menu-header > .v091-collapse-btn,:scope > .v090-menu-header > .v092-collapse-btn').forEach(b=>b.remove());

    const old=card.querySelector(':scope > .v090-menu-header');
    if(old){
      const fresh=document.createElement('div');
      fresh.className='v092-subheader';
      while(old.firstChild)fresh.appendChild(old.firstChild);
      old.replaceWith(fresh);
    }
  }

  function ensureTopHeader(card){
    if(!card)return null;
    let header=card.querySelector(':scope > .v090-menu-header');
    if(!header){
      const h3=[...card.children].find(el=>el.tagName==='H3')||card.querySelector('h3');
      if(!h3)return null;
      header=document.createElement('div');
      header.className='v090-menu-header';
      card.insertBefore(header,h3);
      header.appendChild(h3);
    }
    header.classList.add('v092-top-header');
    header.querySelectorAll('.v091-collapse-btn,.v092-collapse-btn').forEach(b=>b.remove());
    return header;
  }

  function setCollapsed(card,collapsed,key){
    if(!card)return;
    card.classList.toggle('v090-collapsed',collapsed);
    const header=card.querySelector(':scope > .v090-menu-header');
    if(header)header.setAttribute('aria-expanded',String(!collapsed));
    if(key){
      try{localStorage.setItem(MENU_STORAGE+key,collapsed?'1':'0');}catch(_){}
    }
  }

  function bindOwnCollapse(card,key){
    if(!card)return;
    const header=ensureTopHeader(card);
    if(!header || header.dataset.v092Bound==='1')return;
    header.dataset.v092Bound='1';
    header.setAttribute('role','button');
    header.setAttribute('tabindex','0');
    let collapsed=false;
    try{collapsed=localStorage.getItem(MENU_STORAGE+key)==='1';}catch(_){}
    setCollapsed(card,collapsed,key);
    const interactive=t=>!!t.closest('button,input,select,textarea,a,label,[role="switch"]');
    const toggle=e=>{
      if(interactive(e.target))return;
      setCollapsed(card,!card.classList.contains('v090-collapsed'),key);
    };
    header.addEventListener('click',toggle);
    header.addEventListener('keydown',e=>{
      if(e.key!=='Enter'&&e.key!==' ')return;
      if(interactive(e.target)&&e.target!==header)return;
      e.preventDefault();toggle(e);
    });
  }

  function addInfoButton(h3,title,paragraphs){
    if(!h3 || h3.querySelector('.v092-info'))return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='mg-help v092-info';
    btn.setAttribute('aria-label','Informazioni '+title);
    btn.innerHTML='<span aria-hidden="true">?</span>';
    btn.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      const dlg=document.getElementById('management-help');
      if(!dlg)return;
      const head=dlg.querySelector('h2');
      const body=dlg.querySelector('.mg-help-body');
      if(head)head.textContent=title;
      if(body){
        body.replaceChildren();
        paragraphs.forEach(text=>{const p=document.createElement('p');p.textContent=text;body.appendChild(p);});
      }
      dlg.showModal?.();
    });
    h3.appendChild(btn);
  }

  function buildGameModeCard(){
    let card=root()?.querySelector('.v092-game-mode-card');
    if(card)return card;
    card=document.createElement('div');
    card.className='control-card v090-menu-card v092-game-mode-card';
    card.dataset.v090Menu='modalita-gioco-v092';
    card.innerHTML='<div class="v090-menu-header v092-top-header"><h3 style="margin:0">Modalità di gioco</h3></div><div class="v092-game-mode-body"></div>';
    addInfoButton(card.querySelector('h3'),'Modalità di gioco',[
      'Qui scegli come vengono proposti i giocatori durante l’asta.',
      'Banditura giocatori a turni assegna la chiamata alle squadre secondo l’ordine al tavolo.',
      'Random automatico estrae automaticamente i giocatori dai ruoli selezionati. Le due modalità restano gestite con le regole già previste dall’app.'
    ]);
    bindOwnCollapse(card,'modalita-gioco');
    return card;
  }

  function reorganizeMobile(){
    if(!mq.matches || mobileApplied)return;
    const container=root(), g=grid();
    if(!container||!g)return;

    const roomCard=getCard('room-rules-card');
    const selfCard=getCard('self-raise-control-card');
    const readyCard=getCard('ready-control-card');
    const hybridCard=getCard('auctioneer-player-control-card');
    const onlineCard=getCard('online-players-card');
    const teamsCard=getCard('teams-card');
    const randomCard=getCard('auto-random-control-card');
    const nominationCard=getCard('nomination-control-card');
    const purchasesCard=getCard('purchases-card');
    if(!roomCard||!hybridCard||!teamsCard||!randomCard||!nominationCard||!purchasesCard)return;

    [roomCard,selfCard,readyCard,hybridCard,onlineCard,teamsCard,randomCard,nominationCard,purchasesCard].forEach(rememberOriginal);

    /* Regole stanza: i due controlli richiesti subito dopo i limiti P/D/C/A. */
    let inline=roomCard.querySelector(':scope > .v092-room-inline-settings');
    if(!inline){
      inline=document.createElement('div');
      inline.className='v092-room-inline-settings';
      const limits=roomCard.querySelector('#control-classic-limits');
      if(limits)limits.insertAdjacentElement('afterend',inline);
      else roomCard.appendChild(inline);
    }
    if(selfCard){stripTopMenu(selfCard,'v092-inline-setting');inline.appendChild(selfCard);}
    if(readyCard){stripTopMenu(readyCard,'v092-inline-setting');inline.appendChild(readyCard);}

    /* Giocatori online non è più un menu autonomo: i dati restano attivi ma la card è nascosta. */
    if(onlineCard){
      onlineCard.classList.add('v092-online-source');
      onlineCard.setAttribute('aria-hidden','true');
    }

    /* Modalità di gioco raggruppa Random e Banditura a turni. */
    const gameCard=buildGameModeCard();
    const gameBody=gameCard.querySelector('.v092-game-mode-body');
    stripTopMenu(nominationCard,'v092-game-option');
    stripTopMenu(randomCard,'v092-game-option');
    gameBody.appendChild(nominationCard);
    gameBody.appendChild(randomCard);

    /* I soli menu principali smartphone, nell’ordine richiesto. */
    const toolbar=g.querySelector(':scope > .control-title');
    const anchor=toolbar||g.firstElementChild;
    if(anchor){
      anchor.after(roomCard,hybridCard,teamsCard,gameCard,purchasesCard);
    }else{
      g.append(roomCard,hybridCard,teamsCard,gameCard,purchasesCard);
    }

    [roomCard,hybridCard,teamsCard].forEach(ensureTopHeader);
    container.classList.add('v092-mobile-management');
    mobileApplied=true;
    syncTeamStatuses();
  }

  function restoreDesktop(){
    if(!mobileApplied)return;
    const container=root();
    if(!container)return;
    container.classList.remove('v092-mobile-management');
    /* La pagina viene normalmente ricreata entrando in Gestione; al cambio live di breakpoint ricarichiamo la struttura originale senza duplicare ID. */
    location.reload();
  }

  function teamStatus(teamId){
    try{
      if(typeof audioRoutingStatusForTeam==='function'){
        const raw=String(audioRoutingStatusForTeam(teamId)||'').toUpperCase();
        if(raw.includes('BANDITORE'))return {state:'online',label:'ONLINE · BANDITORE'};
        if(raw.includes('ONLINE'))return {state:'online',label:'ONLINE'};
        if(raw.includes('ASSENTE'))return {state:'absent',label:'ASSENTE'};
        return {state:'offline',label:'OFFLINE'};
      }
    }catch(_){}
    try{
      if(typeof auctioneerPlayerMode!=='undefined' && auctioneerPlayerMode && String(auctioneerPlayerTeamId||'')===String(teamId))return {state:'online',label:'ONLINE · BANDITORE'};
      if(typeof absentTeamIds!=='undefined' && absentTeamIds.has(String(teamId)))return {state:'absent',label:'ASSENTE'};
      if(typeof onlinePlayers!=='undefined' && onlinePlayers.has(String(teamId)))return {state:'online',label:'ONLINE'};
    }catch(_){}
    return {state:'offline',label:'OFFLINE'};
  }

  function syncTeamStatuses(){
    if(!mq.matches)return;
    const body=document.getElementById('control-teams-body');
    if(!body)return;
    body.querySelectorAll(':scope > tr').forEach(row=>{
      const nameInput=row.querySelector('input[id^="ctl-team-name-"]');
      if(!nameInput)return;
      const id=nameInput.id.replace('ctl-team-name-','');
      const first=row.querySelector('td[data-label="Squadra"]')||row.cells?.[0];
      if(!first)return;
      let badge=first.querySelector('.v092-team-status');
      if(!badge){
        badge=document.createElement('span');
        badge.className='v092-team-status';
        first.appendChild(badge);
      }
      const s=teamStatus(id);
      badge.dataset.state=s.state;
      badge.textContent=s.label;
    });
  }

  function buildPasswordDialog(){
    if(passwordDialog)return passwordDialog;
    const dlg=document.createElement('dialog');
    dlg.id='v092-banditore-password';
    dlg.className='v092-password-dialog';
    dlg.innerHTML=`<form method="dialog" class="v092-password-card">
      <div class="v092-password-head"><h3>Autorizza Banditore giocatore</h3><button type="button" class="v092-password-close" aria-label="Chiudi">×</button></div>
      <p>Inserisci la password della stanza per autorizzare il banditore a partecipare come giocatore.</p>
      <input id="v092-banditore-password-input" type="password" inputmode="text" autocomplete="off" placeholder="Password stanza">
      <div id="v092-banditore-password-error" class="v092-password-error" aria-live="polite"></div>
      <div class="v092-password-actions"><button type="button" class="btn btn-secondary v092-password-cancel">Annulla</button><button type="submit" class="btn btn-green">Autorizza</button></div>
    </form>`;
    document.body.appendChild(dlg);
    passwordDialog=dlg;
    const input=dlg.querySelector('#v092-banditore-password-input');
    const err=dlg.querySelector('#v092-banditore-password-error');
    const finish=value=>{
      const resolver=passwordResolver;passwordResolver=null;
      if(dlg.open)dlg.close();
      if(resolver)resolver(value);
    };
    dlg.querySelector('.v092-password-close').addEventListener('click',()=>finish(false));
    dlg.querySelector('.v092-password-cancel').addEventListener('click',()=>finish(false));
    dlg.addEventListener('cancel',e=>{e.preventDefault();finish(false);});
    dlg.querySelector('form').addEventListener('submit',e=>{
      e.preventDefault();
      const entered=String(input.value||'');
      let expected='';
      try{expected=String(currentRoom?.password??document.getElementById('control-room-password')?.value??'');}catch(_){expected=String(document.getElementById('control-room-password')?.value||'');}
      if(!expected || entered!==expected){
        err.textContent='Password non corretta.';
        input.select();
        return;
      }
      finish(true);
    });
    return dlg;
  }

  function requestBanditorePassword(){
    const dlg=buildPasswordDialog();
    const input=dlg.querySelector('#v092-banditore-password-input');
    const err=dlg.querySelector('#v092-banditore-password-error');
    input.value='';err.textContent='';
    return new Promise(resolve=>{
      passwordResolver=resolve;
      dlg.showModal();
      setTimeout(()=>input.focus({preventScroll:true}),40);
    });
  }

  function protectBanditorePlayerMode(){
    if(window.__v092BanditorePlayerProtected)return;
    const original=window.toggleAuctioneerPlayerMode;
    if(typeof original!=='function')return;
    window.__v092BanditorePlayerProtected=true;
    window.__v092OriginalToggleAuctioneerPlayerMode=original;
    window.toggleAuctioneerPlayerMode=function(){
      let enabled=false;
      try{enabled=!!auctioneerPlayerMode;}catch(_){}
      if(enabled)return original.apply(this,arguments);
      requestBanditorePassword().then(ok=>{if(ok)original.call(window);});
    };
  }

  function sync(){
    protectBanditorePlayerMode();
    if(!mq.matches)return;
    reorganizeMobile();
    syncTeamStatuses();
    /* Nessuna card Giocatori online autonoma su smartphone. */
    const online=getCard('online-players-card');
    if(online)online.classList.add('v092-online-source');
  }

  function start(){
    sync();
    if(syncTimer)return;
    syncTimer=setInterval(()=>{
      const r=root();
      if(!r||!r.classList.contains('active'))return;
      sync();
    },500);
  }

  function onMedia(){
    if(mq.matches)start();
    else restoreDesktop();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  mq.addEventListener?.('change',onMedia);
})();
