// LIVEASTA DEV - conferma password + email responsabile stanza
(function(){
  if(window.__liveastaRoomCreationContactLoaded)return;
  window.__liveastaRoomCreationContactLoaded=true;
  const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function ensureFields(){
    const password=document.getElementById('auction-new-room-password');
    if(!password||document.getElementById('auction-new-room-password-confirm'))return;
    const confirm=document.createElement('input');
    confirm.id='auction-new-room-password-confirm'; confirm.type='password'; confirm.placeholder='Conferma password'; confirm.autocomplete='new-password';
    const email=document.createElement('input');
    email.id='auction-new-room-email'; email.type='email'; email.placeholder='Email responsabile stanza'; email.autocomplete='email'; email.inputMode='email'; email.spellcheck=false;
    password.insertAdjacentElement('afterend',confirm); confirm.insertAdjacentElement('afterend',email);
  }
  function creatingNewRoom(){const mode=document.getElementById('auction-room-mode');return !mode||mode.value==='create';}
  async function persistContact(name,password,email){
    if(!window.supabaseClient)return false;
    const cutoff=new Date(Date.now()-120000).toISOString();
    const {data,error}=await window.supabaseClient.from('fanta_rooms').select('id,created_at').eq('name',name).eq('password',password).gte('created_at',cutoff).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(error||!data?.id)throw error||new Error('Stanza appena creata non trovata');
    const {error:updateError}=await window.supabaseClient.from('fanta_rooms').update({contact_email:email}).eq('id',data.id);
    if(updateError)throw updateError;
    return true;
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
      if(password!==confirm){alert('Le password non coincidono.');document.getElementById('auction-new-room-password-confirm')?.focus();return;}
      if(!EMAIL_RE.test(email)){alert('Inserisci un indirizzo email valido.');document.getElementById('auction-new-room-email')?.focus();return;}
      const result=await original.apply(this,args);
      try{await persistContact(name,password,email);}catch(error){console.error('Salvataggio email responsabile stanza non riuscito',error);alert('Stanza creata, ma non è stato possibile associare l’email. Contatta l’amministratore prima dell’approvazione.');}
      return result;
    }
    wrappedJoinAsAuctioneer.__roomContactWrapped=true; window.joinAsAuctioneer=wrappedJoinAsAuctioneer;
  }
  function boot(){ensureFields();installWrapper();const root=document.getElementById('screen-auctioneer-login')||document.body;new MutationObserver(()=>{ensureFields();installWrapper();}).observe(root,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
