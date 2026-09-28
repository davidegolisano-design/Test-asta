/* Read-only player tour. Completion stays on this browser, per team. */
(function(){
  'use strict';
  const steps=[
    {target:'.player-identity-row',title:'La tua plancia giocatore',text:'Qui trovi stanza, squadra e stato di connessione. Tocca la squadra o lo stato per impostarti Assente; usa Online per rientrare nelle banditure successive.'},
    {target:'#normal-bid-controls',title:'Rilancia durante l’asta',text:'I pulsanti +1, +2, +5 e +10 aumentano l’offerta corrente. Controlla tempo, miglior offerta e squadra in vantaggio nella scheda del calciatore. I comandi si attivano quando puoi offrire.'},
    {target:'#exact-bid-knob',title:'Scegli un’offerta precisa',text:'Tieni premuto il pulsante centrale, poi scorri verticalmente per scegliere l’importo. Rilascia per confermare: controlla sempre il valore prima di lasciare il dito.'},
    {target:'#player-listone-btn',title:'Listone, rosa e avversari',text:'Da Listone cerca i calciatori e prepara le tue scelte. Da Rosa consulta i tuoi acquisti. Tocca Stanza per vedere crediti, slot e rose dei partecipanti.'},
    {target:'.budget-slot-trigger',title:'Budget per reparto',premium:true,text:'Da Slot · Budget distribuisci i crediti tra i reparti e imposta le soglie di allerta. I colori delle offerte ti aiutano a controllare la spesa; le soglie di budget sono avvisi, non blocchi automatici.'},
    {target:'#player-ready-choice-controls',title:'Ready e Skip',premium:true,text:'Quando il banditore attiva questa modalità, scegli Ready per partecipare oppure Skip per saltare la banditura. Rispondi prima dell’avvio; se tutti scelgono Skip, il calciatore resta invenduto.'},
    {target:'#sealed-bid-controls',title:'Offerte in busta chiusa',premium:true,text:'Inserisci i crediti e premi OFFRI entro il tempo indicato. Le offerte restano segrete fino all’apertura. In caso di parità può partire uno spareggio tra le squadre a pari merito.'},
    {target:'#player-nominate-btn',title:'Turni e calciatori casuali',premium:true,text:'Con la banditura a turni, quando tocca a te compare il comando per scegliere il calciatore. Con Random è il sistema a estrarlo. Queste modalità sono gestite dal banditore.'},
    {title:'Chat e miniature',premium:true,text:'La chat permette di scrivere ai partecipanti quando è abilitata nella stanza. Il pacchetto miniature aggiunge le immagini personalizzate dei calciatori; quelle generiche restano disponibili gratuitamente.'},
    {target:'#player-roster-btn',title:'Sei pronto per l’asta',text:'Le funzioni Premium richiedono l’attivazione nella stanza e sono riconoscibili dal contorno oro. Anche l’importazione e l’esportazione delle rose sono Premium: le gestisce il banditore dal menu Gestione.'}
  ];
  const memory=new Map();
  let active=null;
  const key=id=>'liveasta_player_tour_v1_'+id;
  function read(id){try{return JSON.parse(localStorage.getItem(key(id))||'null')||memory.get(id)||{};}catch(_){return memory.get(id)||{};}}
  function write(id,value){memory.set(id,value);try{localStorage.setItem(key(id),JSON.stringify(value));}catch(_){} }
  function enter(adapter){
    if(active){if(!adapter.isPlayer()||String(adapter.teamId)!==active.id)active.close();return;}
    if(!adapter.teamId||!adapter.isPlayer()||adapter.isBusy())return;
    const id=String(adapter.teamId),saved=read(id);if(saved.done)return;
    if(document.querySelector('dialog[open]'))return;
    const dialog=document.createElement('dialog');
    dialog.className='room-onboarding player-onboarding is-tour';
    dialog.setAttribute('aria-labelledby','player-tour-title');
    document.body.append(dialog);
    let step=Math.min(steps.length-1,Math.max(0,Number(saved.step)||0)),timer;
    const previousFocus=document.activeElement;
    function close(){dialog.close();}
    active={id,close};
    function position(){
      const target=steps[step].target&&document.querySelector(steps[step].target);
      const rect=target?.getBoundingClientRect(),spot=dialog.querySelector('.onboarding-spotlight');
      const style=target&&getComputedStyle(target);
      const visible=rect?.width>0&&rect?.height>0&&style.visibility!=='hidden'&&rect.bottom>0&&rect.top<innerHeight;
      spot.hidden=!visible;dialog.classList.toggle('no-spotlight',!visible);
      dialog.classList.toggle('tour-card-top',visible&&rect.top>innerHeight/2);
      if(visible)Object.assign(spot.style,{left:Math.max(3,rect.left-4)+'px',top:Math.max(3,rect.top-4)+'px',width:Math.min(innerWidth-6,rect.width+8)+'px',height:Math.min(innerHeight-6,rect.height+8)+'px'});
    }
    function render(){
      const item=steps[step];
      dialog.innerHTML=`<div class="onboarding-spotlight" aria-hidden="true"></div><section class="onboarding-card"><div class="onboarding-content"><p class="onboarding-step">GUIDA GIOCATORE · ${step+1} / ${steps.length}</p>${item.premium?'<span class="player-tour-premium">PREMIUM · attivazione nella stanza</span>':''}<h2 id="player-tour-title" tabindex="-1">${item.title}</h2><p>${item.text}</p></div><footer class="onboarding-actions"><button type="button" class="btn btn-secondary" data-tour="skip">Salta</button>${step?'<button type="button" class="btn btn-secondary" data-tour="back">Indietro</button>':''}<button type="button" class="btn" data-tour="next">${step===steps.length-1?'Inizia':'Avanti'}</button></footer></section>`;
      position();dialog.querySelector('h2').focus({preventScroll:true});
    }
    function finish(){write(id,{done:true});close();}
    dialog.addEventListener('click',event=>{
      const action=event.target.closest('[data-tour]')?.dataset.tour;
      if(action==='skip'||action==='next'&&step===steps.length-1){finish();return;}
      if(action==='next'||action==='back'){step+=action==='next'?1:-1;write(id,{step});render();}
    });
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});
    dialog.addEventListener('close',()=>{
      clearInterval(timer);window.removeEventListener('resize',position);dialog.remove();active=null;
      if(adapter.isPlayer()&&previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
    },{once:true});
    write(id,{step});render();dialog.showModal();dialog.querySelector('h2').focus({preventScroll:true});
    window.addEventListener('resize',position);
    timer=setInterval(()=>{if(!adapter.isPlayer()||adapter.isBusy()){close();return;}position();},250);
  }
  window.liveastaPlayerOnboarding=Object.freeze({enter});
})();
