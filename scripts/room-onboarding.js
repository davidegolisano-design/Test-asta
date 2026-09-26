/* First-room tour and team setup. Drafts contain team names only, never credentials. */
(function(){
  'use strict';
  const key=id=>'liveasta_room_onboarding_'+id;
  const hint='Puoi sempre aggiungere, rinominare o eliminare le squadre dal menu Gestione → Squadre.';
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const steps=[
    {target:'#auction-room-pill',title:'La tua stanza è pronta',text:'Sei già nella plancia banditore. Condividi nome e password della stanza con la tua lega per far entrare i partecipanti.'},
    {target:'.auction-list-toolbar',title:'Trova il prossimo calciatore',text:'Cerca per nome e usa il filtro per restringere la lista. Tocca un calciatore per preparare l’asta. Dado e busta sono le modalità Premium random e busta chiusa.'},
    {target:'#screen-auctioneer-board [onclick="openAllRosters()"]',title:'Controlla le rose',text:'Da Rose puoi consultare le squadre e i calciatori acquistati durante l’asta.'},
    {target:'#screen-auctioneer-board [onclick*="openRoomControl"]',title:'Personalizza la tua asta',text:'In Gestione trovi squadre, crediti, timer e modalità di asta. Ora prepariamo le squadre della tua lega.'}
  ];
  let active=null;
  const memory=new Map();
  function read(id){
    try{const value=JSON.parse(localStorage.getItem(key(id))||'null');if(value&&['tour','count','names'].includes(value.phase)&&Array.isArray(value.teams))return value;}catch(_){}
    return memory.get(String(id))||null;
  }
  function write(id,draft){memory.set(String(id),draft);try{localStorage.setItem(key(id),JSON.stringify(draft));}catch(_){} }
  function clear(id){memory.delete(String(id));try{localStorage.removeItem(key(id));}catch(_){} }
  function prepare(room){if(!read(room.id))write(room.id,{phase:'tour',step:0,count:8,teams:[]});}
  function open(room,adapter){
    if(active||!adapter.canEdit())return;
    const draft=read(room.id);if(!draft)return;
    const dialog=document.createElement('dialog');dialog.className='room-onboarding';dialog.setAttribute('aria-labelledby','onboarding-title');
    document.body.appendChild(dialog);active=dialog;
    let busy=false,observer;
    function persist(){write(room.id,draft);}
    function message(text){const el=dialog.querySelector('[role="alert"]');if(el)el.textContent=text;}
    function position(){
      const spot=dialog.querySelector('.onboarding-spotlight');if(!spot)return;
      const target=document.querySelector(steps[draft.step]?.target),rect=target?.getBoundingClientRect();
      if(!rect?.width||!rect?.height){spot.hidden=true;dialog.classList.add('no-spotlight');return;}
      dialog.classList.remove('no-spotlight');spot.hidden=false;
      Object.assign(spot.style,{left:Math.max(3,rect.left-4)+'px',top:Math.max(3,rect.top-4)+'px',width:Math.min(innerWidth-6,rect.width+8)+'px',height:rect.height+8+'px'});
    }
    function focusTitle(){dialog.querySelector('h2')?.focus({preventScroll:true});}
    function render(){
      const tour=draft.phase==='tour',done=draft.phase==='done';
      dialog.classList.toggle('is-tour',tour);
      let body='',buttons='';
      if(tour){
        draft.step=Math.max(0,Math.min(steps.length-1,Number(draft.step)||0));
        const step=steps[draft.step];
        body=`<p class="onboarding-step">GUIDA RAPIDA · ${draft.step+1} / ${steps.length}</p><h2 id="onboarding-title" tabindex="-1" autofocus>${step.title}</h2><p>${escape(step.text)}</p>`;
        buttons='<button type="button" class="btn btn-secondary" data-action="skip">Salta tutorial</button><button type="button" class="btn" data-action="next">'+(draft.step===steps.length-1?'Crea le squadre':'Avanti')+'</button>';
      }else if(draft.phase==='count'){
        body=`<p class="onboarding-step">CREA LE SQUADRE · 1 / 2</p><h2 id="onboarding-title" tabindex="-1" autofocus>Quante squadre partecipano?</h2><p>Stanza <strong>${escape(room.name)}</strong>. Puoi modificare il numero anche in seguito.</p><label for="onboarding-count">Numero di squadre</label><input id="onboarding-count" type="number" min="1" max="50" inputmode="numeric" value="${draft.count}" required><p class="onboarding-note">Ogni squadra parte con ${Math.max(1,parseInt(room.initial_credits)||500)} crediti, configurabili in Gestione.</p>`;
        buttons='<button type="button" class="btn btn-secondary" data-action="later">Più tardi</button><button type="submit" class="btn">Avanti</button>';
      }else if(draft.phase==='names'){
        body=`<p class="onboarding-step">CREA LE SQUADRE · 2 / 2</p><h2 id="onboarding-title" tabindex="-1" autofocus>Dai un nome alle squadre</h2><p>Personalizza i nomi prima di invitare i partecipanti.</p><div class="onboarding-names">${draft.teams.map((t,i)=>`<label for="onboarding-team-${i}">Squadra ${i+1}<input id="onboarding-team-${i}" data-team="${i}" type="text" maxlength="50" autocomplete="off" value="${escape(t.name)}" required></label>`).join('')}</div>`;
        buttons='<button type="button" class="btn btn-secondary" data-action="back">Indietro</button><button type="submit" class="btn">Crea squadre</button>';
      }else if(done){
        body=`<p class="onboarding-step">CONFIGURAZIONE COMPLETATA</p><h2 id="onboarding-title" tabindex="-1" autofocus>Le squadre sono pronte</h2><p>${draft.teams.length} squadre create nella stanza <strong>${escape(room.name)}</strong>.</p><p class="onboarding-reminder">${hint}</p>`;
        buttons='<button type="button" class="btn" data-action="finish">Vai all’asta</button>';
      }
      dialog.innerHTML=(tour?'<div class="onboarding-spotlight" aria-hidden="true"></div>':'')+`<form class="onboarding-card"><div class="onboarding-content">${body}<p class="onboarding-error" role="alert"></p></div><footer class="onboarding-actions">${buttons}</footer></form>`;
      position();focusTitle();
    }
    function startTeams(){draft.phase='count';persist();render();}
    function lock(value){busy=value;dialog.setAttribute('aria-busy',String(value));dialog.querySelectorAll('button,input').forEach(el=>el.disabled=value);}
    async function save(){
      if(busy)return;
      if(!adapter.canEdit()){message('La sessione banditore è terminata. Rientra nella stanza per continuare.');return;}
      const names=draft.teams.map(t=>t.name.trim());
      if(names.some(n=>!n)){message('Inserisci un nome per ogni squadra.');return;}
      if(new Set(names.map(n=>n.toLocaleLowerCase('it'))).size!==names.length){message('Ogni squadra deve avere un nome diverso.');return;}
      draft.teams.forEach((t,i)=>t.name=names[i]);persist();lock(true);message('Salvataggio delle squadre…');
      try{
        await saveTeams(room,draft.teams,adapter);
        clear(room.id);draft.phase='done';render();
        try{await adapter.onSaved();}catch(_){/* Teams are committed; the next room refresh will reconcile the UI. */}
      }catch(error){message(error.message||'Salvataggio non confermato. Riprova: i nomi sono conservati.');}
      finally{lock(false);}
    }
    dialog.addEventListener('input',event=>{if(event.target.dataset.team!==undefined){draft.teams[Number(event.target.dataset.team)].name=event.target.value;persist();}});
    dialog.addEventListener('submit',event=>{
      event.preventDefault();if(busy)return;
      if(draft.phase==='count'){
        const count=Number(dialog.querySelector('#onboarding-count').value);
        if(!Number.isInteger(count)||count<1||count>50){message('Scegli un numero da 1 a 50.');return;}
        draft.count=count;draft.teams=Array.from({length:count},(_,i)=>draft.teams[i]||{id:crypto.randomUUID(),name:'Squadra '+(i+1)});draft.phase='names';persist();render();
      }else if(draft.phase==='names')save();
    });
    dialog.addEventListener('click',event=>{
      if(busy)return;const action=event.target.closest('[data-action]')?.dataset.action;
      if(action==='next'){if(draft.step<steps.length-1){draft.step++;persist();render();}else startTeams();}
      if(action==='skip')startTeams();
      if(action==='back'){draft.phase='count';persist();render();}
      if(action==='later'||action==='finish')dialog.close();
    });
    dialog.addEventListener('cancel',event=>{event.preventDefault();if(!busy){if(draft.phase==='tour')startTeams();else dialog.close();}});
    dialog.addEventListener('close',()=>{observer?.disconnect();window.removeEventListener('resize',position);dialog.remove();active=null;},{once:true});
    observer=new MutationObserver(()=>{if(!adapter.canEdit())dialog.close();});
    observer.observe(document.getElementById('screen-auctioneer-board'),{attributes:true,attributeFilter:['class']});
    window.addEventListener('resize',position);render();document.activeElement?.blur?.();dialog.showModal();focusTitle();
  }
  async function saveTeams(room,teams,adapter){
    const client=adapter.getClient();
    const {data,error}=await client.from('fanta_teams').select('id,name').eq('room_id',room.id);
    if(error)throw new Error('Connessione non disponibile. Riprova: i nomi sono conservati.');
    if(!adapter.canEdit())throw new Error('Sessione banditore scaduta. Rientra nella stanza.');
    const existing=data||[],pending=teams.filter(team=>!existing.some(row=>String(row.id)===String(team.id)));
    for(const team of teams){const saved=existing.find(row=>String(row.id)===String(team.id));if(saved&&saved.name.trim()!==team.name.trim())throw new Error('La squadra '+saved.name+' è già stata salvata. Ripristina quel nome per completare; potrai cambiarlo in Gestione.');}
    for(const team of pending)if(existing.some(row=>row.name.trim().toLocaleLowerCase('it')===team.name.trim().toLocaleLowerCase('it')))throw new Error('Esiste già una squadra chiamata '+team.name+'. Scegli un altro nome.');
    if(!pending.length)return;
    const rows=pending.map(team=>({id:team.id,room_id:room.id,name:team.name.trim(),credits_remaining:Math.max(1,parseInt(room.initial_credits)||500)}));
    const result=await client.from('fanta_teams').insert(rows);
    if(result.error)throw new Error('Salvataggio non confermato. Riprova: i nomi sono conservati e le squadre già salvate non verranno duplicate.');
  }
  window.liveastaRoomOnboarding=Object.freeze({prepare,hasDraft:id=>!!read(id),open,saveTeams});
})();
