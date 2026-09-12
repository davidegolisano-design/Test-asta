// === liveasta-v73-runtime ===
(function(){
  const TEAM_COLORS={
    'ATALANTA':['#111111','#1E71B8'],
    'BOLOGNA':['#C8102E','#163A70'],
    'CAGLIARI':['#C8102E','#163A70'],
    'COMO':['#3D8FC4','#F2EEE5'],
    'FIORENTINA':['#5B2C83'],
    'FROSINONE':['#F2C400','#1669A8'],
    'GENOA':['#C8102E','#17365D'],
    'INTER':['#111111','#0057B8'],
    'JUVENTUS':['#F5F5F5','#111111'],
    'LAZIO':['#F7F7F7','#76C5E8'],
    'LECCE':['#FFD21E','#D71920'],
    'MILAN':['#C8102E','#111111'],
    'MONZA':['#F5F5F5','#D71920'],
    'NAPOLI':['#43B4E8'],
    'PARMA':['#F2C400','#204E8A'],
    'ROMA':['#F0BC00','#8E1B2F'],
    'SASSUOLO':['#111111','#1C9B50'],
    'TORINO':['#7A263A'],
    'UDINESE':['#F5F5F5','#111111'],
    'VENEZIA':['#F28C28','#111111','#007A3D']
  };

  const NAME_SELECTORS=[
    '#phone-player-name-text',
    '#auction-player-name-top',
    '#nomination-stage-player-name',
    '#ready-player-name'
  ];

  function norm(v){
    return String(v||'').trim().toUpperCase().replace(/\s+/g,' ');
  }

  function colorsFor(v){
    const n=norm(v);
    if(TEAM_COLORS[n]) return TEAM_COLORS[n];
    for(const k in TEAM_COLORS){
      if(n.includes(k)||k.includes(n)) return TEAM_COLORS[k];
    }
    return null;
  }

  function teamBackground(colors){
    if(!colors||!colors.length){
      return 'linear-gradient(180deg,#171E28 0%,#111821 100%)';
    }
    if(colors.length===1){
      return `linear-gradient(180deg,${colors[0]} 0%,${colors[0]} 100%)`;
    }
    if(colors.length===2){
      return `linear-gradient(90deg,${colors[0]} 0%,${colors[0]} 50%,${colors[1]} 50%,${colors[1]} 100%)`;
    }
    return `linear-gradient(90deg,
      ${colors[0]} 0%,${colors[0]} 33.333%,
      ${colors[1]} 33.333%,${colors[1]} 66.666%,
      ${colors[2]} 66.666%,${colors[2]} 100%)`;
  }

  // V73: disponibile anche alla preview fullscreen aperta dalle rose.
  window.liveastaTeamBackgroundForClub=function(club){
    return teamBackground(colorsFor(club));
  };

  function applyTeamCards(){
    const mobileClub=document.getElementById('phone-player-club');
    const mobileCard=document.querySelector('#screen-player-buzzer .player-card-side');
    if(mobileCard){
      mobileCard.style.setProperty(
        '--team-card-bg',
        teamBackground(colorsFor(mobileClub?.textContent))
      );
    }

    const auctionClub=document.getElementById('auction-player-club');
    const auctionCard=document.querySelector('#screen-auctioneer-board .col-player');
    if(auctionCard){
      auctionCard.style.setProperty(
        '--team-card-bg',
        teamBackground(colorsFor(auctionClub?.textContent))
      );
      /* Un solo metodo di applicazione: niente doppio background inline */
      auctionCard.style.removeProperty('background');
    }
  }

  function installConnectionDot(){
    const teamBox=document.querySelector('#screen-player-buzzer .identity-pill.team');
    const oldPill=document.getElementById('player-connection-pill');
    if(!teamBox||!oldPill) return;

    let dot=document.getElementById('team-inline-status-dot');
    if(!dot){
      dot=document.createElement('span');
      dot.id='team-inline-status-dot';
      dot.className='team-inline-status-dot';
      const label=teamBox.querySelector('span');
      if(label) teamBox.insertBefore(dot,label);
      else teamBox.prepend(dot);
    }

    const sync=()=>{
      dot.classList.remove('online','connecting','offline','absent');
      const status=['offline','connecting','absent','online'].find(s=>oldPill.classList.contains(s))||'offline';
      dot.classList.add(status);
      dot.title={offline:'Offline',connecting:'Connessione',absent:'Assente',online:'Online'}[status];
    };
    sync();
    new MutationObserver(sync).observe(
      oldPill,
      {attributes:true,attributeFilter:['class']}
    );
  }

  function updateCountdown(el){
    if(!el) return;
    const value=Number(String(el.textContent||'').trim().replace(',','.'));
    el.classList.toggle(
      'liveasta-last3',
      Number.isFinite(value) && value>=0 && value<=3
    );
    /* Mai sfondo/bordo sul countdown */
    if(el.style.getPropertyValue('background')!=='transparent' || el.style.getPropertyPriority('background')!=='important'){
      el.style.setProperty('background','transparent','important');
    }
    if(el.style.getPropertyValue('border')!=='0px' || el.style.getPropertyPriority('border')!=='important'){
      el.style.setProperty('border','0','important');
    }
    if(el.style.getPropertyValue('box-shadow')!=='none' || el.style.getPropertyPriority('box-shadow')!=='important'){
      el.style.setProperty('box-shadow','none','important');
    }
  }

  function watchCountdown(id){
    const el=document.getElementById(id);
    if(!el) return;
    updateCountdown(el);
    new MutationObserver(()=>updateCountdown(el)).observe(
      el,
      {
        attributes:true,
        childList:true,
        subtree:true,
        characterData:true,
        attributeFilter:['class','style']
      }
    );
  }

  function fitOneLine(el){
    if(!el||!el.isConnected) return;
    const text=String(el.textContent||'').trim();
    if(!text||text==='--') return;

    el.style.removeProperty('font-size');
    el.style.setProperty('white-space','nowrap','important');
    el.style.setProperty('overflow','visible','important');
    el.style.setProperty('text-overflow','clip','important');

    const parent=el.parentElement;
    const available=Math.max(
      1,
      Math.min(el.clientWidth||Infinity,parent?.clientWidth||Infinity)
    );
    if(!Number.isFinite(available)||available<=1) return;

    let size=parseFloat(getComputedStyle(el).fontSize)||24;
    const minSize=8;
    let safety=80;

    while(el.scrollWidth>available && size>minSize && safety--){
      size-=0.5;
      el.style.setProperty('font-size',size+'px','important');
    }

    if(el.scrollWidth>available){
      const ratio=Math.max(.72,available/el.scrollWidth);
      el.style.setProperty('transform-origin','center center','important');
      el.style.setProperty('transform',`scaleX(${ratio})`,'important');
    }else{
      el.style.removeProperty('transform');
    }
  }

  let namesFitFrame=0;
  function fitAllNames(){
    if(namesFitFrame) return;
    namesFitFrame=requestAnimationFrame(()=>{
      namesFitFrame=0;
      NAME_SELECTORS.forEach(sel=>{
        document.querySelectorAll(sel).forEach(fitOneLine);
      });
    });
  }

  function applyBrand(){
    document.querySelectorAll('.logo-text').forEach(el=>{
      const a=el.querySelector('.rosa');
      const b=el.querySelector('.rush');
      if(a) a.textContent='LIVE';
      if(b) b.textContent='ASTA';
    });
  }

  function observeText(el,callback){
    if(!el) return;
    new MutationObserver(callback).observe(
      el,
      {childList:true,subtree:true,characterData:true}
    );
  }

  function boot(){
    applyBrand();
    installConnectionDot();
    applyTeamCards();
    watchCountdown('player-countdown');
    watchCountdown('countdown-display');
    fitAllNames();

    const mobileClub=document.getElementById('phone-player-club');
    const auctionClub=document.getElementById('auction-player-club');

    observeText(mobileClub,()=>{
      applyTeamCards();
      fitAllNames();
    });
    observeText(auctionClub,()=>{
      applyTeamCards();
      fitAllNames();
    });

    NAME_SELECTORS.forEach(sel=>{
      document.querySelectorAll(sel).forEach(el=>{
        observeText(el,fitAllNames);
      });
    });

    window.addEventListener('resize',fitAllNames,{passive:true});
    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden){
        applyTeamCards();
        fitAllNames();
      }
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }

  window.LIVEASTA_TEAM_COLORS=TEAM_COLORS;
  window.updateLiveAstaTeamCards=applyTeamCards;
})();

// === liveasta-v73-home-qr ===
(function(){
  function publicLiveAstaUrl(){
    const u=new URL(window.location.href);
    u.hash='';
    u.search='';

    // Se la pagina è aperta direttamente come /index.html,
    // il QR punta alla cartella pubblica più pulita.
    if(/\/index\.html$/i.test(u.pathname)){
      u.pathname=u.pathname.replace(/index\.html$/i,'');
    }

    return u.href;
  }

  function renderHomeQR(){
    const target=document.getElementById('home-site-qr');
    const urlLabel=document.getElementById('home-site-url');
    if(!target)return;

    const url=publicLiveAstaUrl();
    if(urlLabel)urlLabel.textContent=url.replace(/^https?:\/\//i,'');

    target.innerHTML='';

    if(typeof QRCode==='undefined'){
      target.innerHTML='<div class="home-qr-fallback">QR non disponibile</div>';
      return;
    }

    const large=window.matchMedia('(min-width: 1000px)').matches;
    const size=large?176:132;

    new QRCode(target,{
      text:url,
      width:size,
      height:size,
      colorDark:'#000000',
      colorLight:'#FFFFFF',
      correctLevel:QRCode.CorrectLevel.H
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',renderHomeQR,{once:true});
  }else{
    renderHomeQR();
  }

  // Se viene aperta la home dopo un resize/rotazione, rigenera alla misura corretta.
  let qrResizeTimer=null;
  window.addEventListener('resize',()=>{
    clearTimeout(qrResizeTimer);
    qrResizeTimer=setTimeout(renderHomeQR,180);
  });

  window.renderHomeQR=renderHomeQR;
})();

// === liveasta-v19-portrait-lock ===
(function(){
  async function lockPortrait(){
    try{
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;

      if(!standalone) return;
      if(screen.orientation && typeof screen.orientation.lock === 'function'){
        await screen.orientation.lock('portrait-primary');
      }
    }catch(e){
      /* Il manifest orientation resta il fallback principale. */
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',lockPortrait,{once:true});
  }else{
    lockPortrait();
  }

  window.addEventListener('pageshow',lockPortrait);
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden) lockPortrait();
  });
})();

// === liveasta-v28-auctioneer-lock-lifecycle ===
(function(){
  // Non interrompere manualmente l'heartbeat su pagehide/background.
  // Se la pagina viene davvero chiusa il JS termina da solo.
  // Se invece il browser la sospende temporaneamente, il primo banditore
  // non deve perdere il lock solo perché ha cambiato app per un momento.

  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden){
      try{
        if(auctioneerLockKey && auctioneerLockToken){
          startAuctioneerLockHeartbeat();
        }
      }catch(e){}
    }
  });

  window.addEventListener('pageshow',()=>{
    try{
      if(auctioneerLockKey && auctioneerLockToken){
        startAuctioneerLockHeartbeat();
      }
    }catch(e){}
  });
})();

// === liveasta-v85-fit-auction-text ===
(function(){
  function px(v){
    const n=parseFloat(v);
    return Number.isFinite(n)?n:0;
  }

  function visible(el){
    if(!el) return false;
    const cs=getComputedStyle(el);
    return cs.display!=='none' && cs.visibility!=='hidden' && el.getBoundingClientRect().width>0;
  }

  function resetFit(el){
    if(!el) return;
    el.style.removeProperty('font-size');
    el.style.removeProperty('transform');
    el.style.setProperty('white-space','nowrap','important');
    el.style.setProperty('overflow','visible','important');
    el.style.setProperty('text-overflow','clip','important');
  }

  function fitWithin(el, available, minPx, minScale){
    if(!el || !visible(el) || !Number.isFinite(available) || available<=2) return;
    resetFit(el);

    let size=px(getComputedStyle(el).fontSize)||20;
    const floor=Math.min(size, minPx||10);
    let guard=120;
    while(el.scrollWidth>available && size>floor && guard--){
      size=Math.max(floor,size-.5);
      el.style.setProperty('font-size',size+'px','important');
    }

    if(el.scrollWidth>available){
      const ratio=Math.max(minScale||.80, available/Math.max(1,el.scrollWidth));
      el.style.setProperty('transform-origin','center center','important');
      el.style.setProperty('transform','scaleX('+ratio+')','important');
    }
  }

  function innerWidth(el){
    if(!el) return 0;
    const cs=getComputedStyle(el);
    return Math.max(0, el.clientWidth-px(cs.paddingLeft)-px(cs.paddingRight));
  }

  function flexAvailable(container, target, fixedEls){
    if(!container || !target) return 0;
    const cs=getComputedStyle(container);
    let available=innerWidth(container);
    let count=1; // target itself
    (fixedEls||[]).forEach(el=>{
      if(visible(el)){
        available-=el.getBoundingClientRect().width;
        count++;
      }
    });
    const gap=px(cs.columnGap)||px(cs.gap);
    if(count>1) available-=gap*(count-1);
    return Math.max(1,available);
  }

  function fitPlayerName(){
    const wrap=document.getElementById('phone-player-name');
    const text=document.getElementById('phone-player-name-text');
    const badge=document.getElementById('phone-player-priority-badge');
    if(!wrap||!text) return;
    const available=flexAvailable(wrap,text,[badge]);
    fitWithin(text,available,13,.82);
  }

  function fitPlayerMeta(){
    const meta=document.querySelector('#screen-player-buzzer .phone-player-meta');
    const club=document.getElementById('phone-player-club');
    const role=document.getElementById('phone-player-role');
    const dot=meta?.querySelector('.phone-meta-dot');
    if(!meta||!club) return;
    const available=flexAvailable(meta,club,[role,dot]);
    fitWithin(club,available,12,.84);
  }

  function fitAuctioneerName(){
    const el=document.getElementById('auction-player-name-top');
    if(!el) return;
    // V94: stessa presenza visiva del nome usato nel READY.
    // Parte grande (64px) e si riduce solo se il nome non entra.
    if(typeof fitTextToBox==='function'){
      fitTextToBox(el,64,18,true);
      return;
    }
    fitWithin(el,innerWidth(el),18,.82);
  }

  function fitAuctioneerMeta(){
    const meta=document.getElementById('auction-player-meta');
    const club=document.getElementById('auction-player-club');
    const role=document.getElementById('auction-player-role');
    const dot=meta?.querySelector('.meta-dot');
    if(!meta||!club) return;
    const available=flexAvailable(meta,club,[role,dot]);
    fitWithin(club,available,12,.84);
  }

  let raf=0;
  function fitAll(){
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{
      fitPlayerName();
      fitPlayerMeta();
      fitAuctioneerName();
      fitAuctioneerMeta();
    });
  }

  function watch(id){
    const el=document.getElementById(id);
    if(!el) return;
    new MutationObserver(fitAll).observe(el,{childList:true,subtree:true,characterData:true});
  }

  function boot(){
    ['phone-player-name-text','phone-player-priority-badge','phone-player-role','phone-player-club',
     'auction-player-name-top','auction-player-role','auction-player-club'].forEach(watch);
    window.addEventListener('resize',fitAll,{passive:true});
    window.addEventListener('orientationchange',fitAll,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)fitAll();});
    if(document.fonts?.ready) document.fonts.ready.then(fitAll).catch(()=>{});
    fitAll();
    setTimeout(fitAll,80);
    setTimeout(fitAll,350);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.fitLiveAstaAuctionTypography=fitAll;
})();

// === liveasta-v87-access-wizard-script ===
(function(){
  'use strict';
  let playerWizardStep=1;
  let auctionWizardStep=1;

  function markProgress(selector,step,total){
    const bars=[...document.querySelectorAll(selector+' i')];
    bars.forEach((bar,i)=>{
      bar.classList.toggle('done',i+1<step);
      bar.classList.toggle('active',i+1===step || (step>=total && i+1===total));
    });
  }

  function renderPlayerWizard(){
    for(let i=1;i<=3;i++)document.getElementById('player-wizard-step-'+i)?.classList.toggle('active',i===playerWizardStep);
    const labels=['STANZA','SQUADRA','PIN'];
    const label=document.getElementById('player-wizard-step-label');
    if(label)label.textContent=`${playerWizardStep} / 3 · ${labels[playerWizardStep-1]}`;
    markProgress('#screen-player-setup .access-wizard-progress',playerWizardStep,3);
    const back=document.getElementById('player-wizard-back');
    const next=document.getElementById('player-wizard-next');
    if(back)back.textContent=playerWizardStep===1?'ESCI':'INDIETRO';
    if(next)next.textContent=playerWizardStep===3?'ENTRA':'AVANTI';
    const err=document.getElementById('player-room-error');
    if(err && playerWizardStep!==3)err.textContent='';
  }

  async function playerStepOneValid(){
    const err=document.getElementById('player-room-error');
    if(err)err.textContent='';
    const room=await getPlayerSetupRoom();
    if(!room){if(err)err.textContent=showRoomsToUsers?'Seleziona una stanza.':'Stanza non trovata. Controlla il nome.';return false;}
    if(room.approved!==true){if(err)err.textContent='Questa stanza non è ancora approvata.';return false;}
    const password=document.getElementById('player-room-password')?.value||'';
    if(password!==String(room.password||'')){if(err)err.textContent='Password stanza errata.';return false;}
    await refreshPlayerTeamChoices();
    const select=document.getElementById('player-team-select');
    if(!select || select.disabled){if(err)err.textContent=document.getElementById('player-team-help')?.textContent||'Nessuna squadra disponibile.';return false;}
    return true;
  }

  window.playerAccessWizardNext=async function(){
    const next=document.getElementById('player-wizard-next');
    if(next)next.disabled=true;
    try{
      if(playerWizardStep===1){
        if(!(await playerStepOneValid()))return;
        playerWizardStep=2;renderPlayerWizard();return;
      }
      if(playerWizardStep===2){
        const teamId=document.getElementById('player-team-select')?.value||'';
        const err=document.getElementById('player-room-error');
        if(!teamId){if(err)err.textContent='Seleziona la tua squadra.';return;}
        await handlePlayerTeamSelection();
        playerWizardStep=3;renderPlayerWizard();
        setTimeout(()=>document.getElementById('player-pin')?.focus({preventScroll:true}),80);
        return;
      }
      await joinAsPlayer();
    }finally{if(next)next.disabled=false;}
  };

  window.playerAccessWizardBack=function(){
    window.stopPlayerOccupiedRetryCountdown?.();
    if(playerWizardStep<=1){
      if(typeof closePlayerSetupChannel==='function')closePlayerSetupChannel();
      showScreen('screen-role');return;
    }
    playerWizardStep--;
    if(playerWizardStep<3)resetPlayerPinPanel();
    renderPlayerWizard();
  };

  function resetPlayerWizard(){playerWizardStep=1;renderPlayerWizard();}
  window.resetPlayerAccessWizard=resetPlayerWizard;

  function prepareAuctionWizard(){auctionWizardStep=1;}

  function renderAuctionWizard(){
    const screen=document.getElementById('screen-auctioneer-setup');
    const head=document.getElementById('auction-access-wizard-head');
    const fields=document.getElementById('auction-mode-fields');
    const active=!!auctioneerRoomMode && fields?.style.display!=='none';
    screen?.classList.toggle('wizard-mode-active',active);
    if(head)head.style.display=active?'flex':'none';
    const total=auctioneerRoomMode==='create'?2:1;
    if(auctionWizardStep>total)auctionWizardStep=total;
    document.getElementById('auction-create-step-1')?.classList.toggle('active',auctioneerRoomMode==='create'&&auctionWizardStep===1);
    document.getElementById('auction-create-step-2')?.classList.toggle('active',auctioneerRoomMode==='create'&&auctionWizardStep===2);
    const label=document.getElementById('auction-wizard-step-label');
    if(label)label.textContent=auctioneerRoomMode==='create'?`${auctionWizardStep} / 2 · ${auctionWizardStep===1?'STANZA':'MODALITÀ'}`:'1 / 1 · ACCESSO';
    markProgress('#screen-auctioneer-setup .access-wizard-progress.auction',auctionWizardStep,total);
    const next=document.getElementById('auction-wizard-next');
    if(next)next.textContent=(auctioneerRoomMode==='create'&&auctionWizardStep===1)?'AVANTI':(auctioneerRoomMode==='create'?'CREA STANZA':'ENTRA');
  }

  window.prepareAuctionAccessWizard=prepareAuctionWizard;
  window.renderAuctionAccessWizard=renderAuctionWizard;

  window.auctionAccessWizardBack=function(){
    window.stopAuctioneerOccupiedRetryCountdown?.();
    if(auctioneerRoomMode==='create'&&auctionWizardStep===2){auctionWizardStep=1;renderAuctionWizard();return;}
    resetAuctioneerRoomMode();
  };

  window.auctionAccessWizardNext=async function(){
    const err=document.getElementById('auction-room-error');if(err)err.textContent='';
    if(auctioneerRoomMode==='create'&&auctionWizardStep===1){
      const name=(document.getElementById('auction-new-room-name')?.value||'').trim();
      const password=document.getElementById('auction-new-room-password')?.value||'';
      if(!name){if(err)err.textContent='Inserisci il nome della stanza.';return;}
      if(!password){if(err)err.textContent='Inserisci la password della stanza.';return;}
      auctionWizardStep=2;renderAuctionWizard();return;
    }
    const listoneGate=document.getElementById('btn-apri-plancia');
    if(listoneGate?.disabled){if(err)err.textContent='Attendi il caricamento del listone ufficiale.';return;}
    await joinAsAuctioneer();
  };

  function hardenInputs(root=document){
    root.querySelectorAll?.('form').forEach(f=>f.setAttribute('autocomplete','off'));
    root.querySelectorAll?.('input').forEach((el,i)=>{
      if(el.type==='password'){el.type='text';el.classList.add('liveasta-secret-input');}
      el.setAttribute('autocomplete','off');el.setAttribute('data-lpignore','true');el.setAttribute('data-1p-ignore','true');el.setAttribute('data-bwignore','true');el.setAttribute('data-form-type','other');
      if(!el.name)el.name='liveasta-field-'+i;
    });
  }

  function boot(){
    hardenInputs();resetPlayerWizard();renderAuctionWizard();
    new MutationObserver(records=>{for(const rec of records)for(const node of rec.addedNodes)if(node?.nodeType===1)hardenInputs(node);}).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

// === liveasta-v89-access-enter-retry-script ===
(function(){
  'use strict';

  const PLAYER_RETRY_MS=22000; // coerente con heartbeat fallback/cleanup giocatori
  const RETRY_TICK_MS=250;
  const RETRY_CHECK_MS=2500;

  let playerRetryTimer=null;
  let playerRetryDeadline=0;
  let playerRetryRoom=null;
  let playerRetryTeamId='';
  let playerRetryChecking=false;
  let playerRetryLastCheck=0;
  let playerRetryOriginalButton='';

  let auctionRetryTimer=null;
  let auctionRetryDeadline=0;
  let auctionRetryRoom=null;
  let auctionRetryChecking=false;
  let auctionRetryLastCheck=0;
  let auctionRetryOriginalButton='';

  function screenActive(id){return !!document.getElementById(id)?.classList.contains('active');}
  function secondsLeft(deadline){return Math.max(0,Math.ceil((deadline-Date.now())/1000));}

  function markRetryButton(id,blocked,seconds,original){
    const btn=document.getElementById(id);if(!btn)return;
    btn.classList.toggle('liveasta-access-retry-blocked',!!blocked);
    if(blocked){
      btn.setAttribute('aria-disabled','true');
      btn.textContent=`ATTENDI ${Math.max(0,seconds)}s`;
    }else{
      btn.removeAttribute('aria-disabled');
      if(original)btn.textContent=original;
    }
  }

  function setRetryMessage(id,message,isFree=false){
    const el=document.getElementById(id);if(!el)return;
    el.classList.add('liveasta-access-retry');
    el.classList.toggle('liveasta-access-free',!!isFree);
    el.textContent=message;
  }

  function clearRetryMessage(id){
    const el=document.getElementById(id);if(!el)return;
    el.classList.remove('liveasta-access-retry','liveasta-access-free');
  }

  window.stopPlayerOccupiedRetryCountdown=function(clearMessage=true){
    if(playerRetryTimer){clearInterval(playerRetryTimer);playerRetryTimer=null;}
    playerRetryDeadline=0;playerRetryRoom=null;playerRetryTeamId='';playerRetryChecking=false;playerRetryLastCheck=0;
    markRetryButton('player-wizard-next',false,0,playerRetryOriginalButton);
    playerRetryOriginalButton='';
    if(clearMessage)clearRetryMessage('player-room-error');
  };

  async function resolvePlayerRetryRoom(room){
    if(room?.id)return room;
    try{return await getPlayerSetupRoom();}catch(e){return null;}
  }

  async function playerPlaceIsFree(){
    if(playerRetryChecking||!playerRetryRoom?.id)return false;
    playerRetryChecking=true;
    playerRetryLastCheck=Date.now();
    try{
      const occupied=await fetchOccupiedTeamIds(playerRetryRoom,700);
      if(playerRetryTeamId){
        return !occupied.has(String(playerRetryTeamId));
      }
      const {data,error}=await supabaseClient
        .from('fanta_teams').select('id').eq('room_id',playerRetryRoom.id);
      if(error)return false;
      return (data||[]).some(t=>!occupied.has(String(t.id)));
    }catch(e){
      return false;
    }finally{playerRetryChecking=false;}
  }

  async function finishPlayerRetryFree(){
    const generic=!playerRetryTeamId;
    const err=document.getElementById('player-room-error');
    const original=playerRetryOriginalButton;
    window.stopPlayerOccupiedRetryCountdown(false);
    if(generic){
      try{await refreshPlayerTeamChoices();}catch(e){}
      setRetryMessage('player-room-error','Posto disponibile. Puoi continuare ora.',true);
    }else{
      setRetryMessage('player-room-error','Posto libero. Premi ENTRA per riprovare.',true);
    }
    const btn=document.getElementById('player-wizard-next');
    if(btn && original)btn.textContent=original;
    setTimeout(()=>{if(err?.classList.contains('liveasta-access-free'))clearRetryMessage('player-room-error');},5000);
  }

  async function tickPlayerRetry(forceCheck=false){
    if(!screenActive('screen-player-setup')){window.stopPlayerOccupiedRetryCountdown();return;}
    const left=secondsLeft(playerRetryDeadline);
    const label=playerRetryTeamId?'Questa squadra è già occupata.':'Tutti i posti risultano occupati.';
    setRetryMessage('player-room-error',`${label}\nRIPROVA TRA ${left} s`);
    markRetryButton('player-wizard-next',true,left,playerRetryOriginalButton);

    const due=forceCheck || Date.now()-playerRetryLastCheck>=RETRY_CHECK_MS || left<=0;
    if(!due||playerRetryChecking)return;
    const free=await playerPlaceIsFree();
    if(free){await finishPlayerRetryFree();return;}
    if(left<=0)playerRetryDeadline=Date.now()+PLAYER_RETRY_MS;
  }

  window.startPlayerOccupiedRetryCountdown=async function(room,teamId=''){
    const resolved=await resolvePlayerRetryRoom(room);
    if(!resolved?.id)return;
    const same=playerRetryTimer && String(playerRetryRoom?.id)===String(resolved.id) && String(playerRetryTeamId||'')===String(teamId||'');
    playerRetryRoom=resolved;
    playerRetryTeamId=String(teamId||'');
    if(!same)playerRetryDeadline=Date.now()+PLAYER_RETRY_MS;
    const btn=document.getElementById('player-wizard-next');
    if(!playerRetryOriginalButton)playerRetryOriginalButton=btn?.textContent||'AVANTI';
    if(!playerRetryTimer)playerRetryTimer=setInterval(()=>tickPlayerRetry(false),RETRY_TICK_MS);
    await tickPlayerRetry(true);
  };

  window.stopAuctioneerOccupiedRetryCountdown=function(clearMessage=true){
    if(auctionRetryTimer){clearInterval(auctionRetryTimer);auctionRetryTimer=null;}
    auctionRetryDeadline=0;auctionRetryRoom=null;auctionRetryChecking=false;auctionRetryLastCheck=0;
    markRetryButton('auction-wizard-next',false,0,auctionRetryOriginalButton);
    auctionRetryOriginalButton='';
    if(clearMessage)clearRetryMessage('auction-room-error');
  };

  async function readAuctionRetryLock(){
    if(!auctionRetryRoom?.id)return null;
    try{return await readAuctioneerLock(`liveasta_auctioneer_lock_${auctionRetryRoom.id}`);}catch(e){return null;}
  }

  async function auctionLockIsFree(){
    if(auctionRetryChecking)return false;
    auctionRetryChecking=true;auctionRetryLastCheck=Date.now();
    try{
      const row=await readAuctionRetryLock();
      return !row || !isAuctioneerLockFresh(row);
    }catch(e){return false;}finally{auctionRetryChecking=false;}
  }

  async function refreshAuctionRetryDeadline(){
    const row=await readAuctionRetryLock();
    if(!row || !isAuctioneerLockFresh(row))return true;
    const last=auctioneerLockLastSeen(row)||Date.now();
    auctionRetryDeadline=Math.max(Date.now()+1000,last+AUCTIONEER_LOCK_STALE_MS);
    return false;
  }

  async function finishAuctionRetryFree(){
    const original=auctionRetryOriginalButton;
    window.stopAuctioneerOccupiedRetryCountdown(false);
    setRetryMessage('auction-room-error','Banditore libero. Puoi riprovare ora.',true);
    const btn=document.getElementById('auction-wizard-next');if(btn&&original)btn.textContent=original;
    setTimeout(()=>clearRetryMessage('auction-room-error'),5000);
  }

  async function tickAuctionRetry(forceCheck=false){
    if(!screenActive('screen-auctioneer-setup')){window.stopAuctioneerOccupiedRetryCountdown();return;}
    let left=secondsLeft(auctionRetryDeadline);
    setRetryMessage('auction-room-error',`Accesso bloccato: c'è già un banditore attivo.\nRIPROVA TRA ${left} s`);
    markRetryButton('auction-wizard-next',true,left,auctionRetryOriginalButton);

    const due=forceCheck || Date.now()-auctionRetryLastCheck>=RETRY_CHECK_MS || left<=0;
    if(!due||auctionRetryChecking)return;
    const free=await auctionLockIsFree();
    if(free){await finishAuctionRetryFree();return;}
    if(left<=0){
      const becameFree=await refreshAuctionRetryDeadline();
      if(becameFree){await finishAuctionRetryFree();return;}
      left=secondsLeft(auctionRetryDeadline);
    }
  }

  window.startAuctioneerOccupiedRetryCountdown=async function(room){
    if(!room?.id)return;
    window.stopAuctioneerOccupiedRetryCountdown(false);
    auctionRetryRoom=room;
    const btn=document.getElementById('auction-wizard-next');
    auctionRetryOriginalButton=btn?.textContent||'ENTRA';
    const row=await readAuctionRetryLock();
    const last=auctioneerLockLastSeen(row)||Date.now();
    auctionRetryDeadline=Math.max(Date.now()+1000,last+AUCTIONEER_LOCK_STALE_MS);
    auctionRetryTimer=setInterval(()=>tickAuctionRetry(false),RETRY_TICK_MS);
    await tickAuctionRetry(false);
  };

  function visible(el){return !!el && getComputedStyle(el).display!=='none' && !el.disabled;}
  function focusNext(id){const el=document.getElementById(id);if(el){el.focus({preventScroll:true});return true;}return false;}

  function updateEnterHints(){
    const hints={
      'player-room-name-input':'next','player-room-password':'next','player-pin':'next','player-pin-confirm':'go',
      'auction-new-room-name':'next','auction-new-room-password':'next','auction-room-name-input':'next','auction-room-password':'go',
      'auction-mantra-max-roster':'go','admin-pin':'go','sealed-bid-input':'go'
    };
    Object.entries(hints).forEach(([id,h])=>document.getElementById(id)?.setAttribute('enterkeyhint',h));
    const pinConfirm=document.getElementById('player-pin-confirm');
    const pin=document.getElementById('player-pin');
    if(pin)pin.setAttribute('enterkeyhint',visible(pinConfirm)?'next':'go');
  }

  document.addEventListener('keydown',function(e){
    if(e.key!=='Enter' || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey)return;
    const t=e.target;if(!t || !['INPUT','SELECT'].includes(t.tagName))return;
    const id=t.id||'';

    if(screenActive('screen-player-setup')){
      if(playerRetryTimer){e.preventDefault();return;}
      if(id==='player-room-name-input'){e.preventDefault();focusNext('player-room-password');return;}
      if(id==='player-room-password'){e.preventDefault();window.playerAccessWizardNext?.();return;}
      if(id==='player-pin'){
        e.preventDefault();
        const c=document.getElementById('player-pin-confirm');
        if(visible(c))focusNext('player-pin-confirm');else window.playerAccessWizardNext?.();
        return;
      }
      if(id==='player-pin-confirm'){e.preventDefault();window.playerAccessWizardNext?.();return;}
    }

    if(screenActive('screen-auctioneer-setup')){
      if(auctionRetryTimer){e.preventDefault();return;}
      if(id==='auction-new-room-name'){e.preventDefault();focusNext('auction-new-room-password');return;}
      if(id==='auction-new-room-password'){e.preventDefault();window.auctionAccessWizardNext?.();return;}
      if(id==='auction-room-name-input'){e.preventDefault();focusNext('auction-room-password');return;}
      if(id==='auction-room-password'||id==='auction-mantra-max-roster'){e.preventDefault();window.auctionAccessWizardNext?.();return;}
    }

    if(screenActive('screen-admin-login')&&id==='admin-pin'){e.preventDefault();adminLogin();return;}
    if(screenActive('screen-player-buzzer')&&id==='sealed-bid-input'){e.preventDefault();submitSealedBid();return;}
  },true);

  document.addEventListener('focusin',updateEnterHints,true);

  function boot(){updateEnterHints();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

// === liveasta-v97-role-badge-sync ===
(function(){
  const ids=['phone-player-role','auction-player-role','auctioneer-ready-player-role','room-roster-player-preview-role'];
  const roleClasses=['role-P','role-D','role-C','role-A'];

  function classicRoleFromLabel(value){
    const raw=String(value||'').trim();
    if(!raw || raw==='-') return '';
    const up=raw.toUpperCase();
    if(['P','D','C','A'].includes(up)) return up;
    const tokens=raw.split(/[;,/|+\-\s]+/).filter(Boolean).map(x=>x.toLowerCase());
    if(tokens.some(x=>x==='por'||x==='p')) return 'P';
    if(tokens.some(x=>['dc','dd','ds','b','d'].includes(x))) return 'D';
    if(tokens.some(x=>['e','m','c','w','t'].includes(x))) return 'C';
    if(tokens.some(x=>['a','pc'].includes(x))) return 'A';
    return '';
  }

  function syncRoleBadge(el){
    if(!el) return;
    const role=classicRoleFromLabel(el.textContent);
    roleClasses.forEach(c=>el.classList.remove(c));
    if(role) el.classList.add('role-'+role);
  }

  function attach(id){
    const el=document.getElementById(id);
    if(!el || el.dataset.roleColorObserver==='1') return;
    el.dataset.roleColorObserver='1';
    syncRoleBadge(el);
    new MutationObserver(()=>syncRoleBadge(el)).observe(el,{childList:true,characterData:true,subtree:true});
  }

  function init(){ ids.forEach(attach); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();

// === management-design-init ===
// Management presentation only: existing controls retain their handlers and IDs.
(function initManagementDesign(){
 const root=document.getElementById('screen-room-control');if(!root)return;
 const help=document.createElement('dialog');help.id='management-help';help.setAttribute('aria-labelledby','management-help-title');
 help.innerHTML='<header><h2 id="management-help-title"></h2><button type="button" autofocus>← Gestione</button></header><div class="mg-help-body"></div>';
 document.body.append(help);
 help.querySelector('button').onclick=()=>help.close();
 help.addEventListener('click',e=>{if(e.target===help){const r=help.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)help.close();}});
 function guide(target,title,paragraphs){
  if(!target)return;const b=document.createElement('button');b.type='button';b.className='mg-help';b.setAttribute('aria-label','Guida: '+title);b.innerHTML='<span aria-hidden="true">?</span>';
  b.onclick=e=>{e.preventDefault();e.stopPropagation();help.querySelector('h2').textContent=title;const body=help.querySelector('.mg-help-body');body.replaceChildren();paragraphs.forEach(t=>{const p=document.createElement('p');p.textContent=typeof t==='function'?t():t;body.append(p);});help.showModal();};target.append(b);
 }
 const guides={
 'room-rules-card':['Modifica nome, password, tempi e composizione delle rose, poi premi Salva impostazioni. I tempi sono espressi in secondi.','Timer asta: durata delle offerte. Blocco rilanci: intervallo minimo fra rilanci. Countdown pre-asta: preparazione prima di iniziare.','Timer busta chiusa: tempo per consegnare le offerte. Timer apertura buste: attesa prima di mostrare il risultato.','In Classic imposta i posti per P, D, C e A. In Mantra la rosa è libera, con minimo 23 giocatori e 2 portieri; puoi impostare il massimo.'],
 'self-raise-control-card':['Attiva il toggle per consentire alla squadra che ha la migliore offerta di rilanciare ancora su se stessa.','Se lo disattivi, quella squadra potrà offrire nuovamente dopo il rilancio di un avversario. I pulsanti di offerta mantengono i loro colori.'],
 'online-players-card':['Mostra le squadre attualmente collegate. Il contatore si aggiorna durante la sessione; dopo una chiusura improvvisa può servire qualche secondo.','Una squadra offline può ancora essere richiesta dalla fase Ready. Prima di proseguire, verifica che rientri nella stanza.'],
 'auctioneer-player-control-card':['Scegli una squadra libera e attiva il toggle per partecipare anche come giocatore. La squadra selezionata viene riservata al banditore.','Usa il pulsante Banditore / Giocatore della plancia per passare fra le due viste. Durante le fasi di asta la vista giocatore consente di rispondere e offrire.','Disattiva la modalità per tornare a svolgere soltanto il ruolo di banditore.'],
 'ready-control-card':['Attiva il toggle per chiedere READY o SKIP prima di iniziare. Devono rispondere tutte le squadre abilitate, comprese quelle offline.','Se almeno una squadra sceglie READY, l’asta parte per tutte le squadre abilitate, anche quelle che hanno scelto SKIP. Se tutte scelgono SKIP, il calciatore va invenduto.','Con Ready disattivato, il countdown parte dopo la scelta del calciatore.'],
 'auto-random-control-card':['Seleziona con i toggle i ruoli da includere, poi attiva Random automatico. I calciatori vengono scelti casualmente fra i ruoli selezionati.','È consigliato attivare Ready per lasciare alle squadre il tempo di prepararsi. Disattiva Random automatico per interrompere la selezione automatica.'],
 'nomination-control-card':['Attiva il toggle per far scegliere i calciatori alle squadre a turno. In Classic si completa un ruolo alla volta e chi ha completato il reparto viene saltato. In Mantra la banditura è libera.','In Ordine al tavolo disponi le squadre nella sequenza desiderata. Ripristina riporta l’ordine iniziale.','Usa Turno precedente e Turno successivo per spostarti nella sequenza; Ricalcola turno aggiorna il turno in base alla situazione corrente.','Offerta 1 banditore: nelle aste normali assegna l’offerta iniziale di un credito alla squadra che ha chiamato il calciatore.'],
 'teams-card':['Inserisci il nome e premi Aggiungi squadra. Nella tabella puoi gestire crediti, PIN e azioni disponibili per ogni squadra.','I contatori dei ruoli mostrano la composizione della rosa. Controlla la squadra selezionata prima di assegnare giocatori o eliminarla.'],
 'audio-mixer-card':['Regola i volumi con i cursori e ascolta un’anteprima con ▶. Puoi scegliere la velocità della voce e il suono degli ultimi tre secondi.','Voce offerte attiva o disattiva gli annunci. Le impostazioni audio vengono salvate quando le modifichi.','Nei dispositivi, il toggle Leva audio acceso indica che quel dispositivo è silenziato. Audio a tutti riabilita tutti i dispositivi.']
 };
 Object.entries(guides).forEach(([cls,copy])=>guide(root.querySelector('.'+cls+' h3'),root.querySelector('.'+cls+' h3')?.textContent.trim(),copy));
 const notes='.self-raise-control-note,.online-players-note,.auctioneer-player-note,.ready-control-note,.auto-random-note,.nomination-control-note,.audio-mixer-subtitle,.audio-routing-help,.audio-mode-note';
 root.querySelectorAll(notes).forEach(n=>n.classList.add('mg-description'));
 ['self-raise-control-status','self-raise-control-badge','ready-control-status','ready-control-badge','auctioneer-player-badge','nomination-control-badge'].forEach(id=>document.getElementById(id)?.classList.add('mg-description'));
 [['self-raise-toggle','Autorilancio',true],['ready-toggle-btn','Ready prima dell’asta',false],['auctioneer-player-toggle-btn','Banditore giocatore',false],['nomination-toggle-btn','Banditura a turni',false]].forEach(([id,label,initial])=>{
 const b=document.getElementById(id);b.classList.add('mg-switch');b.setAttribute('role','switch');b.setAttribute('aria-label',label);if(!b.hasAttribute('aria-checked'))b.setAttribute('aria-checked',String(initial));b.closest('.control-card').querySelector('.control-title').append(b);
 });
 root.querySelectorAll('input[type=checkbox]:not(#self-raise-enabled)').forEach(input=>{input.setAttribute('role','switch');if(input.id==='auto-random-enabled')input.setAttribute('aria-label','Random automatico');if(input.id.startsWith('auto-random-role-'))input.setAttribute('aria-label','Includi ruolo '+input.id.split('-').pop());});
 const fieldHelp={
 'control-room-timer':['Timer asta','Imposta la durata del timer delle offerte, da 1 a 60 secondi. Premi Salva impostazioni per applicare la modifica.'],
 'control-bid-cooldown':['Blocco rilanci','Imposta l’intervallo minimo fra i rilanci, da 0,1 a 5 secondi. Premi Salva impostazioni.'],
 'control-room-prep':['Countdown pre-asta','Tempo di preparazione prima delle offerte, da 1 a 15 secondi. Se Ready è attivo, la preparazione segue le risposte delle squadre. Premi Salva impostazioni.'],
 'control-sealed-timer':['Timer busta chiusa','Tempo disponibile per consegnare le buste, da 5 a 180 secondi. Quando tutte le offerte sono state consegnate, si passa alla fase di apertura. Premi Salva impostazioni.'],
 'control-sealed-reveal-timer':['Apertura buste','Attesa prima della rivelazione delle offerte, da 1 a 30 secondi. Premi Salva impostazioni.']
 };
 Object.entries(fieldHelp).forEach(([id,[title,copy]])=>guide(document.getElementById(id)?.parentElement.querySelector('.field-label'),title,[copy]));
 guide(root.querySelector('.nomination-auto-bid-one-copy b'),'Offerta iniziale di 1 credito',['Se attiva, nell’asta normale il calciatore chiamato parte da un credito offerto dalla squadra che ha bandito. Questa opzione non è un’offerta in busta chiusa.']);
 guide(root.querySelector('.nomination-order-head b'),'Ordine al tavolo',guides['nomination-control-card'].slice(1,3));
 guide(root.querySelector('.purchases-card .control-title-actions'),'Acquisti e rose',['Apri la sezione per cercare e gestire gli acquisti. Le azioni di annullamento o ripristino modificano la cronologia: verifica sempre la selezione e le conferme prima di proseguire.']);
 root.querySelectorAll('.field-label').forEach(label=>{const input=label.parentElement.querySelector('input,select');if(input?.id)input.setAttribute('aria-label',label.childNodes[0].textContent.trim());});
})();
