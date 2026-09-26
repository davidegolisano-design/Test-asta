// Creazione stanza: dati e contatto registrati insieme sul server.
(function(){
  if(window.__liveastaRoomCreationContactLoaded)return;
  window.__liveastaRoomCreationContactLoaded=true;

  const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let createStep=0;
  let createUiReady=false;
  let lastCreateVisible=false;
  let creating=false;

  function isCreateVisible(){
    if(!document.getElementById('screen-auctioneer-setup')?.classList.contains('active'))return false;
    const box=document.getElementById('auction-create-box');
    if(!box)return false;
    const cs=getComputedStyle(box);
    return cs.display!=='none' && cs.visibility!=='hidden';
  }

  function escapeHtml(v){
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function buildCreateWizard(){
    const box=document.getElementById('auction-create-box');
    if(!box||createUiReady)return;

    box.innerHTML=`
      <div class="liveasta-create-step" data-create-step="0">
        <p class="subtitle">Scegli il nome della stanza</p>
        <input type="text" id="auction-new-room-name" class="minimal-input" placeholder="Nome stanza" maxlength="30" autocomplete="off">
      </div>

      <div class="liveasta-create-step" data-create-step="1" style="display:none;">
        <p class="subtitle">Scegli la password della stanza</p>
        <input type="text" id="auction-new-room-password" class="minimal-input liveasta-secret-input" placeholder="Password stanza" maxlength="40" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-form-type="other">
      </div>

      <div class="liveasta-create-step" data-create-step="2" style="display:none;">
        <p class="subtitle">Conferma la password</p>
        <input type="text" id="auction-new-room-password-confirm" class="minimal-input liveasta-secret-input" placeholder="Ripeti password stanza" maxlength="40" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-form-type="other">
      </div>

      <div class="liveasta-create-step" data-create-step="3" style="display:none;">
        <p class="subtitle">Email del responsabile</p>
        <input type="email" id="auction-new-room-email" class="minimal-input" placeholder="nome@email.it" maxlength="320" autocomplete="email" inputmode="email" spellcheck="false">
        <div class="setup-note">L’amministratore riceverà questo indirizzo insieme ai dati della stanza e alle eventuali richieste Premium.</div>
      </div>

      <div class="liveasta-create-step" data-create-step="4" style="display:none;">
        <p class="subtitle">Modalità Fantacalcio</p>
        <div class="room-mode-picker">
          <div class="room-mode-grid">
            <label class="room-mode-card">
              <input type="radio" name="auction-game-mode" value="classic" checked onchange="updateCreateRoomModeUI()">
              <span><b>CLASSIC</b><small>Rosa per reparti P / D / C / A</small></span>
            </label>
            <label class="room-mode-card">
              <input type="radio" name="auction-game-mode" value="mantra" onchange="updateCreateRoomModeUI()">
              <span><b>MANTRA</b><small>Ruoli specifici e rosa libera</small></span>
            </label>
          </div>
        </div>
        <div id="create-classic-info" class="setup-note">Default Classic: 3 P · 8 D · 8 C · 6 A. Potrai modificarli dalla Gestione.</div>
        <div id="create-mantra-info" class="mantra-create-settings" style="display:none;">
          <div class="mantra-rule-summary"><b>Regole Mantra asta</b><span>Minimo 23 giocatori · almeno 2 portieri · nessun limite per singolo ruolo di movimento.</span></div>
          <label><span class="field-label">Rosa massima per squadra</span><input id="auction-mantra-max-roster" type="number" class="minimal-input" min="23" max="90" value="30" inputmode="numeric"></label>
        </div>
        <div class="setup-note">Crediti e timer si configurano dalla Gestione asta dopo l’ingresso nella stanza.</div>
      </div>`;

    createUiReady=true;
    renderCreateStep();
  }

  function currentStepInput(){
    return [
      document.getElementById('auction-new-room-name'),
      document.getElementById('auction-new-room-password'),
      document.getElementById('auction-new-room-password-confirm'),
      document.getElementById('auction-new-room-email')
    ][createStep]||null;
  }

  function renderCreateStep(){
    if(!createUiReady)return;
    document.querySelectorAll('.liveasta-create-step').forEach((el,i)=>{
      el.style.display=i===createStep?'block':'none';
    });

    const head=document.getElementById('auction-access-wizard-head');
    const progress=head?.querySelector('.access-wizard-progress.auction');
    const label=document.getElementById('auction-wizard-step-label');
    const back=document.getElementById('auction-wizard-back');
    const next=document.getElementById('auction-wizard-next');
    const start=document.getElementById('btn-apri-plancia');

    if(head)head.style.display='block';
    if(progress){
      progress.innerHTML='<i></i><i></i><i></i><i></i><i></i>';
      [...progress.children].forEach((i,n)=>i.classList.toggle('active',n<=createStep));
    }
    const names=['NOME','PASSWORD','CONFERMA','EMAIL','MODALITÀ'];
    if(label)label.textContent=`${createStep+1} / 5 · ${names[createStep]}`;
    if(back){back.style.display='';back.textContent=createStep===0?'Indietro':'Indietro';}
    if(next){next.style.display='';next.textContent=createStep===4?'Crea stanza':'Avanti';}
    if(start)start.style.display='none';

    const err=document.getElementById('auction-room-error');
    if(err)err.textContent='';
    const focused=document.activeElement;
    if(focused?.matches('input,textarea') && focused.closest('#auction-create-box'))focused.blur();
  }

  function setCreateError(message){
    const err=document.getElementById('auction-room-error');
    if(err){err.textContent=message;err.style.color='';}
  }

  function validateCurrentStep(){
    const name=String(document.getElementById('auction-new-room-name')?.value||'').trim();
    const password=String(document.getElementById('auction-new-room-password')?.value||'');
    const confirm=String(document.getElementById('auction-new-room-password-confirm')?.value||'');
    const email=String(document.getElementById('auction-new-room-email')?.value||'').trim();

    if(createStep===0 && !name){setCreateError('Inserisci il nome della stanza.');return false;}
    if(createStep===1 && !password){setCreateError('Inserisci la password della stanza.');return false;}
    if(createStep===2){
      if(!confirm){setCreateError('Conferma la password della stanza.');return false;}
      if(password!==confirm){setCreateError('Le password non coincidono.');return false;}
    }
    if(createStep===3){
      if(!email){setCreateError('Inserisci l’indirizzo email.');return false;}
      if(!EMAIL_RE.test(email)){setCreateError('Inserisci un indirizzo email valido.');return false;}
    }
    return true;
  }

  async function createWizardNext(){
    if(creating||!validateCurrentStep())return;
    if(createStep<4){createStep++;renderCreateStep();return;}
    creating=true;
    const next=document.getElementById('auction-wizard-next');
    if(next)next.disabled=true;
    try{await window.joinAsAuctioneer();}
    finally{creating=false;if(next)next.disabled=false;}
  }

  function createWizardBack(){
    if(creating)return;
    if(createStep>0){createStep--;renderCreateStep();return;}
    window.leaveAuctioneerSetup();
  }

  function interceptWizardButtons(){
    document.addEventListener('click',event=>{
      if(!isCreateVisible())return;
      const target=event.target.closest?.('#auction-wizard-next,#auction-wizard-back');
      if(!target)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if(target.id==='auction-wizard-next')createWizardNext();
      else createWizardBack();
    },true);

    document.addEventListener('keydown',event=>{
      if(!isCreateVisible()||event.key!=='Enter')return;
      const active=event.target;
      if(active && document.getElementById('auction-create-box')?.contains(active)){
        event.preventDefault();
        createWizardNext();
      }
    },true);
  }

  function syncCreateVisibility(){
    buildCreateWizard();
    const visible=isCreateVisible();
    if(visible&&!lastCreateVisible){createStep=0;renderCreateStep();}
    lastCreateVisible=visible;
  }

  function boot(){
    buildCreateWizard();
    interceptWizardButtons();
    syncCreateVisibility();
    const root=document.getElementById('screen-auctioneer-login')||document.body;
    new MutationObserver(syncCreateVisibility).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
