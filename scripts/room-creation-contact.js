// LIVEASTA DEV - creazione stanza guidata + contatto email
(function(){
  if(window.__liveastaRoomCreationContactLoaded)return;
  window.__liveastaRoomCreationContactLoaded=true;

  const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let createStep=0;
  let createUiReady=false;
  let lastCreateVisible=false;

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
        <div class="setup-note">Useremo questo indirizzo solo per avvisarti quando la stanza sarà attiva.</div>
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
    if(!validateCurrentStep())return;
    if(createStep<4){createStep++;renderCreateStep();return;}
    const next=document.getElementById('auction-wizard-next');
    if(next)next.disabled=true;
    try{await window.joinAsAuctioneer();}
    finally{if(next)next.disabled=false;}
  }

  function createWizardBack(){
    if(createStep>0){createStep--;renderCreateStep();return;}
    window.leaveAuctioneerSetup();
  }

  async function persistContact(name,password,email){
    if(!window.supabaseClient)throw new Error('Database non disponibile');
    const cutoff=new Date(Date.now()-5*60*1000).toISOString();
    const {data,error}=await window.supabaseClient
      .from('fanta_rooms')
      .select('id,created_at')
      .eq('name',name)
      .eq('password',password)
      .gte('created_at',cutoff)
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if(error||!data?.id)throw error||new Error('Stanza appena creata non trovata');

    const {data:ok,error:rpcError}=await window.supabaseClient.rpc('liveasta_register_room_contact',{
      p_room_id:data.id,
      p_room_password:password,
      p_email:email
    });
    if(rpcError)throw rpcError;
    if(ok!==true)throw new Error('Registrazione email non riuscita');
    return data.id;
  }

  function showSuccess(email){
    document.getElementById('liveasta-room-success')?.remove();
    const overlay=document.createElement('div');
    overlay.id='liveasta-room-success';
    overlay.style.cssText='position:fixed;inset:0;z-index:100001;background:rgba(4,8,18,.82);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:18px;color:#fff;';
    overlay.innerHTML=`<div style="width:min(460px,100%);background:#101827;border:1px solid rgba(255,255,255,.16);border-radius:20px;padding:26px;text-align:center;box-shadow:0 24px 70px rgba(0,0,0,.45)">
      <div style="font-size:25px;font-weight:900;margin-bottom:12px">Stanza creata correttamente</div>
      <div style="line-height:1.55;font-size:16px">La stanza è in attesa di approvazione.<br><br>Riceverai una mail a <b>${escapeHtml(email)}</b> quando la stanza sarà attiva.</div>
      <button id="liveasta-room-success-ok" type="button" class="btn" style="margin-top:22px">OK</button>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#liveasta-room-success-ok')?.addEventListener('click',()=>{
      overlay.remove();
      window.resetAuctioneerRoomMode?.();
      window.showScreen?.('screen-role');
    });
  }

  function installWrapper(){
    if(typeof window.joinAsAuctioneer!=='function'||window.joinAsAuctioneer.__roomContactWrapped)return;
    const original=window.joinAsAuctioneer;
    async function wrappedJoinAsAuctioneer(...args){
      if(!isCreateVisible())return original.apply(this,args);

      const name=String(document.getElementById('auction-new-room-name')?.value||'').trim();
      const password=String(document.getElementById('auction-new-room-password')?.value||'');
      const confirm=String(document.getElementById('auction-new-room-password-confirm')?.value||'');
      const email=String(document.getElementById('auction-new-room-email')?.value||'').trim().toLowerCase();

      if(!name||!password||password!==confirm||!EMAIL_RE.test(email)){
        setCreateError('Controlla i dati inseriti prima di creare la stanza.');
        return;
      }

      const result=await original.apply(this,args);
      try{
        await persistContact(name,password,email);
        const err=document.getElementById('auction-room-error');
        if(err)err.textContent='';
        showSuccess(email);
      }catch(error){
        console.error('Registrazione email stanza non riuscita',error);
        const err=document.getElementById('auction-room-error');
        if(err)err.textContent='';
        await window.appAlert?.('La stanza è stata creata, ma non è stato possibile associare l’email. Contatta l’amministratore.');
      }
      return result;
    }
    wrappedJoinAsAuctioneer.__roomContactWrapped=true;
    window.joinAsAuctioneer=wrappedJoinAsAuctioneer;
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
    installWrapper();
    const visible=isCreateVisible();
    if(visible&&!lastCreateVisible){createStep=0;renderCreateStep();}
    lastCreateVisible=visible;
  }

  function boot(){
    buildCreateWizard();
    installWrapper();
    interceptWizardButtons();
    syncCreateVisibility();
    const root=document.getElementById('screen-auctioneer-login')||document.body;
    new MutationObserver(syncCreateVisibility).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
