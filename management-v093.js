/* LIVEASTA v0.93 — Gestione senza minimizzazioni + auth Banditore/Giocatore con PIN giocatore */
(function(){
  'use strict';

  let dialog=null;
  let resolver=null;

  function cleanupOldManagement(){
    const root=document.getElementById('screen-room-control');
    if(!root)return;
    root.classList.remove('v092-mobile-management');
    root.querySelectorAll('.v087-collapsed,.v090-collapsed').forEach(el=>el.classList.remove('v087-collapsed','v090-collapsed'));
    root.querySelectorAll('.v087-collapse-btn,.v091-collapse-btn,.v092-collapse-btn').forEach(el=>el.remove());
    root.querySelectorAll('[data-v087-collapsible]').forEach(el=>el.removeAttribute('data-v087-collapsible'));
  }

  function selectedTeamId(){
    const sel=document.getElementById('auctioneer-player-team-select');
    const v=String(sel?.value||'').trim();
    if(v)return v;
    try{return String(auctioneerPlayerTeamId||'').trim();}catch(_){return '';}
  }

  function selectedTeamName(teamId){
    const sel=document.getElementById('auctioneer-player-team-select');
    const opt=sel?.selectedOptions?.[0];
    if(opt?.textContent)return opt.textContent.trim();
    try{return teamsCache?.find(t=>String(t.id)===String(teamId))?.name||'squadra selezionata';}catch(_){return 'squadra selezionata';}
  }

  function buildDialog(){
    if(dialog)return dialog;
    const dlg=document.createElement('dialog');
    dlg.className='v093-player-pin-dialog';
    dlg.innerHTML=`<form method="dialog" class="v093-player-pin-card">
      <div class="v093-player-pin-head"><h3>Autorizza Banditore giocatore</h3><button type="button" class="v093-player-pin-close" aria-label="Chiudi">×</button></div>
      <p id="v093-player-pin-copy">Inserisci il PIN personale del giocatore associato alla squadra selezionata.</p>
      <input id="v093-player-pin-input" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" placeholder="PIN giocatore · 6 cifre">
      <div id="v093-player-pin-error" class="v093-player-pin-error" aria-live="polite"></div>
      <div class="v093-player-pin-actions"><button type="button" class="btn btn-secondary v093-player-pin-cancel">Annulla</button><button type="submit" class="btn btn-green">Autorizza</button></div>
    </form>`;
    document.body.appendChild(dlg);
    dialog=dlg;

    const finish=value=>{
      const r=resolver;resolver=null;
      if(dlg.open)dlg.close();
      if(r)r(value);
    };
    dlg.querySelector('.v093-player-pin-close').addEventListener('click',()=>finish(false));
    dlg.querySelector('.v093-player-pin-cancel').addEventListener('click',()=>finish(false));
    dlg.addEventListener('cancel',e=>{e.preventDefault();finish(false);});
    return dlg;
  }

  async function verifySelectedPlayerPin(){
    const teamId=selectedTeamId();
    if(!teamId){
      try{if(typeof appAlert==='function')await appAlert('Seleziona prima una squadra libera.');else alert('Seleziona prima una squadra libera.');}catch(_){alert('Seleziona prima una squadra libera.');}
      return false;
    }

    const dlg=buildDialog();
    const input=dlg.querySelector('#v093-player-pin-input');
    const error=dlg.querySelector('#v093-player-pin-error');
    const copy=dlg.querySelector('#v093-player-pin-copy');
    const teamName=selectedTeamName(teamId);
    copy.textContent=`Inserisci il PIN personale del giocatore di ${teamName}.`;
    input.value='';error.textContent='';

    return new Promise(resolve=>{
      resolver=resolve;
      const form=dlg.querySelector('form');
      const submit=async e=>{
        e.preventDefault();
        const pin=String(input.value||'').replace(/\D/g,'').slice(0,6);
        if(!/^\d{6}$/.test(pin)){
          error.textContent='Inserisci il PIN giocatore di 6 cifre.';
          input.focus();
          return;
        }
        try{
          const roomId=currentRoom?.id||currentRoomId;
          const roomPassword=String(currentRoom?.password||'');
          if(!roomId)throw new Error('Stanza non disponibile.');

          const status=await supabaseClient.rpc('liveasta_team_pin_status',{p_team_id:teamId,p_room_id:roomId});
          if(status.error)throw status.error;
          if(status.data!==true){
            error.textContent='Questa squadra non ha ancora un PIN giocatore impostato.';
            return;
          }

          const check=await supabaseClient.rpc('liveasta_verify_team_pin',{
            p_team_id:teamId,
            p_room_id:roomId,
            p_room_password:roomPassword,
            p_pin:pin
          });
          if(check.error)throw check.error;
          if(check.data!==true){
            error.textContent='PIN giocatore non corretto.';
            input.select();
            return;
          }

          form.removeEventListener('submit',submit);
          const r=resolver;resolver=null;
          if(dlg.open)dlg.close();
          if(r)r(true);
        }catch(err){
          console.warn('Verifica PIN banditore giocatore',err);
          error.textContent='Impossibile verificare il PIN. Riprova.';
        }
      };
      form.addEventListener('submit',submit);
      dlg.showModal();
      setTimeout(()=>input.focus({preventScroll:true}),40);
    });
  }

  function protectBanditorePlayerMode(){
    if(window.__v093BanditorePlayerProtected)return;
    const original=window.toggleAuctioneerPlayerMode;
    if(typeof original!=='function')return;
    window.__v093BanditorePlayerProtected=true;
    window.toggleAuctioneerPlayerMode=function(){
      let enabled=false;
      try{enabled=!!auctioneerPlayerMode;}catch(_){}
      if(enabled)return original.apply(this,arguments);
      verifySelectedPlayerPin().then(ok=>{if(ok)original.call(window);});
    };
  }

  function init(){
    cleanupOldManagement();
    protectBanditorePlayerMode();
    const root=document.getElementById('screen-room-control');
    if(root){
      const observer=new MutationObserver(()=>{
        cleanupOldManagement();
        protectBanditorePlayerMode();
      });
      observer.observe(root,{childList:true,subtree:false});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
