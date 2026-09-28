/* Public names and aggregate counts are separate: private names are never listed. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  let step=1,roomName='',pending=null,generation=0;
  const visible=()=>!document.hidden&&['screen-role','screen-entry-role','screen-spectator-setup'].some(id=>$(id)?.classList.contains('active'));
  function counts(value){
    for(const kind of ['classic','mantra'])$('spectator-count-'+kind).textContent=value?String(Number(value[kind])||0):'–';
    document.querySelector('.spectator-led')?.classList.toggle('is-online',!!value&&(Number(value.classic)+Number(value.mantra)>0));
  }
  function render(rows){
    const list=$('spectator-public-rooms');list.replaceChildren();
    for(const room of [...rows].sort((a,b)=>Number(b.online)-Number(a.online)||a.name.localeCompare(b.name,'it'))){
      const button=document.createElement('button');button.type='button';button.className='spectator-public-room';
      const name=document.createElement('strong');name.textContent=room.name;
      const detail=document.createElement('span');detail.textContent=`${room.game_mode==='mantra'?'Mantra':'Classic'} · ${room.online?'Online':'Banditore offline'}`;
      button.append(name,detail);button.addEventListener('click',()=>{$('spectator-room-name-input').value=room.name;$('spectator-room-error').textContent='';});list.append(button);
    }
  }
  async function refresh(){
    if(pending)return pending;
    pending=(async()=>{
      const results=await Promise.allSettled([
        supabaseClient.rpc('liveasta_spectator_directory'),supabaseClient.rpc('liveasta_spectator_online_counts')
      ]);
      const directory=results[0],totals=results[1];
      if(directory.status==='fulfilled'&&!directory.value.error){
        const rows=directory.value.data||[];render(rows);
        $('spectator-directory-status').textContent=rows.length?'':'Nessuna stanza pubblica disponibile.';
      }else{render([]);$('spectator-directory-status').textContent='Elenco non disponibile. Puoi inserire il nome della stanza.';}
      counts(totals.status==='fulfilled'&&!totals.value.error?totals.value.data:null);
    })().finally(()=>{pending=null;});return pending;
  }
  function showStep(value){
    step=value;$('spectator-room-step').hidden=step!==1;$('spectator-password-step').hidden=step!==2;
    $('spectator-step-label').textContent=step===1?'1 · STANZA':'2 · PASSWORD';
    $('spectator-enter-btn').textContent=step===1?'Avanti':'Entra';
    $('spectator-selected-name').textContent=roomName;
    $('spectator-room-error').textContent='';$('spectator-room-password').value='';
  }
  function back(){
    generation++;
    if(step===2){roomName='';showStep(1);}else showScreen('screen-entry-role');
  }
  async function resolveRoom(){
    const ticket=generation;
    const name=step===1?$('spectator-room-name-input').value.trim():roomName;
    if(!name)throw Error('Inserisci il nome della stanza o scegline una dall’elenco.');
    const {data:access,error:lookupError}=await supabaseClient.rpc('liveasta_spectator_resolve',{p_name:name});
    if(ticket!==generation)return null;
    if(lookupError)throw Error('Accesso non disponibile. Riprova tra qualche secondo.');
    if(!access)throw Error('Stanza non trovata o non disponibile. Controlla il nome.');
    if(!access.is_public&&step===1){roomName=name;showStep(2);return null;}
    const password=access.is_public?'':$('spectator-room-password').value;
    if(!access.is_public&&!password)throw Error('Inserisci la password della stanza.');
    const {data,error}=await supabaseClient.rpc('liveasta_spectator_enter',{
      p_room_id:access.is_public?access.room_id:null,p_name:access.is_public?'':name,p_password:password,p_public:access.is_public
    });
    if(ticket!==generation)return null;
    if(error)throw Error('Accesso non disponibile. Riprova tra qualche secondo.');
    if(!data)throw Error(access.is_public?'L’accesso alla stanza è cambiato. Premi di nuovo Avanti.':'Password errata o stanza non disponibile.');
    return data;
  }
  window.liveastaSpectatorLobby=Object.freeze({refresh,resolveRoom,back,open:async()=>{
    generation++;roomName='';$('spectator-room-name-input').value='';showStep(1);await refresh();
  },onScreen:id=>{
    if(id!=='screen-spectator-setup')generation++;
    if(['screen-role','screen-entry-role','screen-spectator-setup'].includes(id))refresh();
  }});
  window.addEventListener('DOMContentLoaded',()=>{
    for(const id of ['spectator-room-name-input','spectator-room-password'])$(id).addEventListener('keydown',event=>{
      if(event.key==='Enter'){event.preventDefault();$('spectator-enter-btn').click();}
    });
    if(visible())refresh();
  });
  document.addEventListener('visibilitychange',()=>{if(visible())refresh();});
  setInterval(()=>{if(visible())refresh();},15000);
})();
