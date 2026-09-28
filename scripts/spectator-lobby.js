/* Public directory contains no room passwords or host lock tokens. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  let mode='public',pending=null;
  const visible=()=>!document.hidden&&['screen-role','screen-entry-role','screen-spectator-setup'].some(id=>$(id)?.classList.contains('active'));
  function counts(rows){
    for(const kind of ['classic','mantra']){
      const el=$('spectator-count-'+kind);
      if(el)el.textContent=rows?String(rows.filter(r=>r.online&&r.game_mode===kind).length):'–';
    }
    document.querySelector('.spectator-led')?.classList.toggle('is-online',!!rows?.some(r=>r.online));
  }
  function render(rows){
    const select=$('spectator-room-select');if(!select)return;
    const selected=select.value;select.replaceChildren();
    const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=rows.length?'Seleziona una stanza pubblica…':'Nessuna stanza pubblica disponibile';select.append(placeholder);
    for(const room of [...rows].sort((a,b)=>Number(b.online)-Number(a.online)||a.name.localeCompare(b.name,'it'))){
      const option=document.createElement('option');option.value=room.id;
      option.textContent=`${room.name} · ${room.game_mode==='mantra'?'Mantra':'Classic'} · ${room.online?'Online':'Banditore offline'}`;
      select.append(option);
    }
    if(rows.some(r=>r.id===selected))select.value=selected;
  }
  async function refresh(){
    if(pending)return pending;
    pending=(async()=>{
      try{
        const {data,error}=await supabaseClient.rpc('liveasta_spectator_directory');
        if(error)throw error;
        counts(data||[]);render(data||[]);
        if(mode==='public')$('spectator-room-error').textContent='';
      }catch(_){
        counts(null);render([]);
        if(mode==='public')$('spectator-room-error').textContent='Elenco non disponibile. Riprova tra qualche secondo.';
      }finally{pending=null;}
    })();return pending;
  }
  function setMode(value){
    mode=value==='private'?'private':'public';const privateRoom=mode==='private';
    $('spectator-access-mode').value=mode;
    $('spectator-room-select').style.display=privateRoom?'none':'';
    $('spectator-room-name-input').style.display=privateRoom?'':'none';
    $('spectator-room-password').style.display=privateRoom?'':'none';
    $('spectator-room-password').value='';
    $('spectator-room-error').textContent='';
    $('spectator-access-help').textContent=privateRoom?'Inserisci nome e password comunicati dal banditore.':'Scegli una stanza pubblica. Non serve la password.';
  }
  async function resolveRoom(){
    const isPublic=mode==='public';
    const roomId=isPublic?$('spectator-room-select').value:null;
    const name=isPublic?'':$('spectator-room-name-input').value.trim();
    const password=isPublic?'':$('spectator-room-password').value;
    if(isPublic&&!roomId)throw Error('Seleziona una stanza pubblica.');
    if(!isPublic&&(!name||!password))throw Error('Inserisci nome stanza e password.');
    const {data,error}=await supabaseClient.rpc('liveasta_spectator_enter',{p_room_id:roomId,p_name:name,p_password:password,p_public:isPublic});
    if(error)throw Error('Accesso non disponibile. Riprova tra qualche secondo.');
    if(!data)throw Error(isPublic?'La stanza non è più pubblica o disponibile. Aggiorna l’elenco.':'Stanza non disponibile o password errata.');
    return data;
  }
  window.liveastaSpectatorLobby=Object.freeze({refresh,setMode,resolveRoom,open:async()=>{setMode('public');await refresh();},onScreen:id=>{
    if(['screen-role','screen-entry-role','screen-spectator-setup'].includes(id))refresh();
  }});
  window.addEventListener('DOMContentLoaded',()=>{if(visible())refresh();});
  document.addEventListener('visibilitychange',()=>{if(visible())refresh();});
  setInterval(()=>{if(visible())refresh();},15000);
})();
