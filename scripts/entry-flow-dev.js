// LIVEASTA DEV - nuovo flusso ingresso/creazione stanza
(function(){
  if(window.__liveastaEntryFlowDevLoaded)return;
  window.__liveastaEntryFlowDevLoaded=true;

  let intent=null; // join | create
  let actor=null;  // player | auctioneer
  let originalSetDeviceMode=null;

  function screenActive(id){
    return document.getElementById(id)?.classList.contains('active')===true;
  }

  function ensureRoleScreen(){
    if(document.getElementById('screen-entry-role'))return;
    const screen=document.createElement('div');
    screen.id='screen-entry-role';
    screen.className='screen';
    screen.innerHTML=`
      <div class="setup-card liveasta-entry-card">
        <div class="liveasta-entry-eyebrow">ENTRA IN UNA STANZA</div>
        <h1>Come vuoi entrare?</h1>
        <p class="subtitle">Scegli il ruolo con cui parteciperai alla stanza esistente.</p>

        <div class="liveasta-entry-choice-grid">
          <button type="button" class="liveasta-entry-choice liveasta-entry-player" data-entry-role="player">
            <span class="liveasta-entry-icon">⚡</span>
            <span class="liveasta-entry-copy">
              <strong>GIOCATORE</strong>
              <small>Entra con la tua squadra e partecipa all'asta</small>
            </span>
            <span class="liveasta-entry-arrow">›</span>
          </button>

          <button type="button" class="liveasta-entry-choice liveasta-entry-auctioneer" data-entry-role="auctioneer">
            <span class="liveasta-entry-icon">🎙️</span>
            <span class="liveasta-entry-copy">
              <strong>BANDITORE</strong>
              <small>Apri la plancia di una stanza già creata</small>
            </span>
            <span class="liveasta-entry-arrow">›</span>
          </button>
        </div>

        <button type="button" class="btn btn-secondary liveasta-entry-back">Indietro</button>
      </div>`;
    document.body.appendChild(screen);

    screen.querySelector('[data-entry-role="player"]')?.addEventListener('click',()=>{
      actor='player';
      intent='join';
      openPlayerLobby();
    });

    screen.querySelector('[data-entry-role="auctioneer"]')?.addEventListener('click',()=>{
      actor='auctioneer';
      intent='join';
      prepareDeviceChoice();
      showScreen('screen-device-choice');
    });

    screen.querySelector('.liveasta-entry-back')?.addEventListener('click',()=>{
      actor=null;
      intent=null;
      showScreen('screen-role');
    });
  }

  function transformHome(){
    const home=document.getElementById('screen-role');
    if(!home)return;

    const enterBtn=home.querySelector('button[onclick*="openPlayerLobby"]');
    const createBtn=home.querySelector('button[onclick*="screen-device-choice"]');

    if(enterBtn && !enterBtn.dataset.entryFlowDev){
      enterBtn.dataset.entryFlowDev='1';
      enterBtn.classList.add('liveasta-home-entry-primary');
      enterBtn.innerHTML='<strong>ENTRA IN UNA STANZA</strong><small>Giocatore o banditore</small>';
      enterBtn.removeAttribute('onclick');
      enterBtn.addEventListener('click',()=>{
        intent='join';
        actor=null;
        ensureRoleScreen();
        showScreen('screen-entry-role');
      });
    }

    if(createBtn && !createBtn.dataset.entryFlowDev){
      createBtn.dataset.entryFlowDev='1';
      createBtn.classList.add('liveasta-home-entry-secondary');
      createBtn.innerHTML='<strong>CREA STANZA</strong><small>Configura una nuova asta</small>';
      createBtn.removeAttribute('onclick');
      createBtn.addEventListener('click',()=>{
        intent='create';
        actor='auctioneer';
        prepareDeviceChoice();
        showScreen('screen-device-choice');
      });
    }
  }

  function prepareDeviceChoice(){
    const screen=document.getElementById('screen-device-choice');
    if(!screen)return;
    const title=screen.querySelector('h1');
    const subtitle=screen.querySelector('.subtitle');
    const back=[...screen.querySelectorAll('button')].find(b=>/Indietro/i.test(b.textContent||''));

    if(title)title.textContent='Dispositivo banditore';
    if(subtitle){
      subtitle.textContent=intent==='create'
        ?'Scegli il dispositivo da cui configurerai e gestirai la nuova stanza'
        :'Scegli il dispositivo da cui gestirai la stanza';
    }

    if(back){
      back.removeAttribute('onclick');
      if(!back.dataset.entryFlowDev){
        back.dataset.entryFlowDev='1';
        back.addEventListener('click',()=>{
          resetAuctioneerRoomMode();
          if(intent==='join'){
            ensureRoleScreen();
            showScreen('screen-entry-role');
          }else{
            actor=null;
            intent=null;
            showScreen('screen-role');
          }
        });
      }
    }
  }

  function forceAuctioneerMode(){
    if(!screenActive('screen-auctioneer-setup'))return;
    if(intent!=='create' && intent!=='join')return;

    const choice=document.getElementById('auction-mode-choice');
    const selected=document.querySelector('#screen-auctioneer-setup .auction-mode-selected');
    const question=document.getElementById('auction-mode-question');
    const rootBack=document.querySelector('#screen-auctioneer-setup .auction-setup-root-back');

    if(choice)choice.style.display='none';
    if(selected)selected.style.display='none';
    if(question){
      question.textContent=intent==='create'
        ?'Crea e configura la nuova stanza'
        :'Accedi a una stanza esistente come banditore';
    }
    if(rootBack)rootBack.textContent='Indietro';
  }

  function wrapSetDeviceMode(){
    if(typeof setDeviceMode!=='function')return false;
    if(window.setDeviceMode.__entryFlowDevWrapped)return true;

    originalSetDeviceMode=setDeviceMode;
    const wrapped=async function(mode){
      await originalSetDeviceMode.call(this,mode);
      if(intent==='create' || (intent==='join' && actor==='auctioneer')){
        setAuctioneerRoomMode(intent);
        forceAuctioneerMode();
      }
    };
    wrapped.__entryFlowDevWrapped=true;
    window.setDeviceMode=wrapped;
    setDeviceMode=wrapped;
    return true;
  }

  function interceptBackNavigation(){
    document.addEventListener('click',event=>{
      const btn=event.target.closest?.('#player-wizard-back');
      if(!btn || intent!=='join' || actor!=='player' || !screenActive('screen-player-setup'))return;

      const first=document.getElementById('player-wizard-step-1');
      if(!first?.classList.contains('active'))return;

      event.preventDefault();
      event.stopImmediatePropagation();
      ensureRoleScreen();
      showScreen('screen-entry-role');
    },true);
  }

  function sync(){
    ensureRoleScreen();
    transformHome();
    prepareDeviceChoice();
    wrapSetDeviceMode();
    forceAuctioneerMode();
  }

  function boot(){
    // Le schermate principali esistono già quando questo modulo viene caricato.
    // Evitiamo un MutationObserver globale: osservare gli style mentre li modifichiamo
    // può generare un loop e bloccare i tap proprio nel flusso di ingresso.
    sync();
    interceptBackNavigation();
    window.addEventListener('pageshow',sync);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
