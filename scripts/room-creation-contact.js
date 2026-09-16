// LIVEASTA DEV - wizard creazione stanza: nome > password > conferma > email
(function(){
  if(window.__liveastaRoomCreationContactLoaded)return;
  window.__liveastaRoomCreationContactLoaded=true;
  const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let wizard=null;

  function creatingNewRoom(){const mode=document.getElementById('auction-room-mode');return !mode||mode.value==='create';}
  function el(tag,attrs={}){const n=document.createElement(tag);Object.assign(n,attrs);return n;}
  function styleButton(b,primary=false){b.style.cssText=`width:100%;min-height:48px;border-radius:12px;border:1px solid rgba(255,255,255,.18);font-weight:800;font-size:16px;cursor:pointer;${primary?'background:#ffd54a;color:#111;':'background:rgba(255,255,255,.08);color:inherit;'}`;}
  function styleInput(i){i.style.cssText='width:100%;min-height:48px;box-sizing:border-box;border-radius:12px;padding:0 14px;font-size:16px;';}

  function ensureFields(){
    const password=document.getElementById('auction-new-room-password');
    if(!password)return;
    if(!document.getElementById('auction-new-room-password-confirm')){
      const confirm=el('input',{id:'auction-new-room-password-confirm',type:'password',placeholder:'Conferma password',autocomplete:'new-password'});
      password.insertAdjacentElement('afterend',confirm);
    }
    if(!document.getElementById('auction-new-room-email')){
      const email=el('input',{id:'auction-new-room-email',type:'email',placeholder:'Email responsabile stanza',autocomplete:'email',inputMode:'email',spellcheck:false});
      document.getElementById('auction-new-room-password-confirm').insertAdjacentElement('afterend',email);
    }
  }

  function closeWizard(){wizard?.remove();wizard=null;}
  function showWizard(){
    ensureFields(); if(wizard||!creatingNewRoom())return;
    const nameSrc=document.getElementById('auction-new-room-name'), passSrc=document.getElementById('auction-new-room-password');
    const confirmSrc=document.getElementById('auction-new-room-password-confirm'), emailSrc=document.getElementById('auction-new-room-email');
    if(!nameSrc||!passSrc||!confirmSrc||!emailSrc)return;
    wizard=el('div'); wizard.id='liveasta-room-wizard';
    wizard.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(4,8,18,.94);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:18px;color:#fff;';
    const card=el('div'); card.style.cssText='width:min(440px,100%);background:#101827;border:1px solid rgba(255,255,255,.16);border-radius:20px;padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.45);'; wizard.appendChild(card);
    let step=0; const values={name:nameSrc.value.trim(),password:'',confirm:'',email:''};
    const steps=[
      {title:'Nome stanza',placeholder:'Nome stanza',type:'text',key:'name'},
      {title:'Password stanza',placeholder:'Password',type:'password',key:'password'},
      {title:'Conferma password',placeholder:'Ripeti la password',type:'password',key:'confirm'},
      {title:'Email responsabile',placeholder:'nome@email.it',type:'email',key:'email'}
    ];
    function render(){
      const s=steps[step]; card.innerHTML='';
      const progress=el('div'); progress.textContent=`CREAZIONE STANZA · ${step+1}/${steps.length}`; progress.style.cssText='font-size:12px;opacity:.7;margin-bottom:8px;font-weight:800;';
      const title=el('div'); title.textContent=s.title; title.style.cssText='font-size:24px;font-weight:900;margin-bottom:16px;';
      const input=el('input',{type:s.type,placeholder:s.placeholder,value:values[s.key]||''}); styleInput(input); if(s.type==='email')input.inputMode='email';
      const error=el('div'); error.style.cssText='min-height:22px;color:#ff8a8a;font-size:13px;padding-top:6px;';
      const next=el('button',{type:'button',textContent:step===steps.length-1?'Crea stanza':'Continua'}); styleButton(next,true);
      const back=el('button',{type:'button',textContent:step?'Indietro':'Annulla'}); styleButton(back,false); back.style.marginTop='10px';
      card.append(progress,title,input,error,next,back); setTimeout(()=>input.focus(),0);
      async function advance(){
        const v=String(input.value||'').trim(); error.textContent='';
        if(!v){error.textContent='Campo obbligatorio.';return;}
        values[s.key]=v;
        if(s.key==='confirm'&&values.password!==v){error.textContent='Le password non coincidono.';return;}
        if(s.key==='email'&&!EMAIL_RE.test(v)){error.textContent='Inserisci un indirizzo email valido.';return;}
        if(step<steps.length-1){step++;render();return;}
        nameSrc.value=values.name; passSrc.value=values.password; confirmSrc.value=values.confirm; emailSrc.value=values.email.toLowerCase();
        closeWizard(); await window.joinAsAuctioneer();
      }
      next.onclick=advance; input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();advance();}};
      back.onclick=()=>{if(step){step--;render();}else closeWizard();};
    }
    document.body.appendChild(wizard); render();
  }

  function showSuccess(email){
    const old=document.getElementById('liveasta-room-success'); old?.remove();
    const overlay=el('div'); overlay.id='liveasta-room-success'; overlay.style.cssText='position:fixed;inset:0;z-index:100001;background:rgba(4,8,18,.82);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:18px;color:#fff;';
    const card=el('div'); card.style.cssText='width:min(460px,100%);background:#101827;border:1px solid rgba(255,255,255,.16);border-radius:20px;padding:26px;text-align:center;box-shadow:0 24px 70px rgba(0,0,0,.45);';
    const h=el('div',{textContent:'Stanza creata correttamente'}); h.style.cssText='font-size:25px;font-weight:900;margin-bottom:12px;';
    const p=el('div'); p.innerHTML=`La stanza è in attesa di approvazione.<br><br>Riceverai una mail a <b>${escapeHtml(email)}</b> quando la stanza sarà attiva.`; p.style.cssText='line-height:1.55;font-size:16px;';
    const ok=el('button',{type:'button',textContent:'OK'}); styleButton(ok,true); ok.style.marginTop='22px'; ok.onclick=()=>overlay.remove();
    card.append(h,p,ok); overlay.appendChild(card); document.body.appendChild(overlay);
  }
  function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  async function persistContact(name,password,email){
    if(!window.supabaseClient)return false;
    const cutoff=new Date(Date.now()-120000).toISOString();
    const {data,error}=await window.supabaseClient.from('fanta_rooms').select('id,created_at').eq('name',name).eq('password',password).gte('created_at',cutoff).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(error||!data?.id)throw error||new Error('Stanza appena creata non trovata');
    const {error:updateError}=await window.supabaseClient.from('fanta_rooms').update({contact_email:email}).eq('id',data.id);
    if(updateError)throw updateError; return true;
  }

  function installWrapper(){
    if(typeof window.joinAsAuctioneer!=='function'||window.joinAsAuctioneer.__roomContactWrapped)return;
    const original=window.joinAsAuctioneer;
    async function wrappedJoinAsAuctioneer(...args){
      if(!creatingNewRoom())return original.apply(this,args);
      ensureFields();
      const name=String(document.getElementById('auction-new-room-name')?.value||'').trim();
      const password=String(document.getElementById('auction-new-room-password')?.value||'');
      const confirm=String(document.getElementById('auction-new-room-password-confirm')?.value||'');
      const email=String(document.getElementById('auction-new-room-email')?.value||'').trim().toLowerCase();
      if(!wizard && (!name||!password||!confirm||!email)){showWizard();return;}
      if(password!==confirm){showWizard();return;}
      if(!EMAIL_RE.test(email)){showWizard();return;}
      const result=await original.apply(this,args);
      try{await persistContact(name,password,email);showSuccess(email);}catch(error){console.error('Salvataggio email responsabile stanza non riuscito',error);}
      return result;
    }
    wrappedJoinAsAuctioneer.__roomContactWrapped=true; window.joinAsAuctioneer=wrappedJoinAsAuctioneer;
  }

  function hideInlineExtras(){
    const c=document.getElementById('auction-new-room-password-confirm'),e=document.getElementById('auction-new-room-email');
    if(c)c.style.display='none'; if(e)e.style.display='none';
  }
  function boot(){ensureFields();hideInlineExtras();installWrapper();const root=document.getElementById('screen-auctioneer-login')||document.body;new MutationObserver(()=>{ensureFields();hideInlineExtras();installWrapper();}).observe(root,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
