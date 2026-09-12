from pathlib import Path

app_path=Path('dev/scripts/app.js')
app=app_path.read_text(encoding='utf-8')

start=app.find('        function changeAuctioneerPlayerTeam(){')
end=app.find('        let hybridPreferredView=null;', start)
if start < 0 or end < 0:
    raise SystemExit('Target auctioneer-player block not found')

new_block = r"""        let playerPinAccessDialog=null;

        function buildPlayerPinAccessDialog(){
            if(playerPinAccessDialog)return playerPinAccessDialog;
            const dlg=document.createElement('dialog');
            dlg.className='v093-player-pin-dialog';
            dlg.innerHTML=`<form method="dialog" class="v093-player-pin-card">
              <div class="v093-player-pin-head"><h3>Autorizza accesso giocatore</h3><button type="button" class="v093-player-pin-close" aria-label="Chiudi">×</button></div>
              <p id="v093-player-pin-copy">Inserisci il PIN personale del giocatore.</p>
              <input id="v093-player-pin-input" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" placeholder="PIN giocatore · 6 cifre">
              <div id="v093-player-pin-error" class="v093-player-pin-error" aria-live="polite"></div>
              <div class="v093-player-pin-actions"><button type="button" class="btn btn-secondary v093-player-pin-cancel">Annulla</button><button type="submit" class="btn btn-green">Autorizza</button></div>
            </form>`;
            document.body.appendChild(dlg);
            playerPinAccessDialog=dlg;
            return dlg;
        }

        async function verifyPlayerPinAccess(teamId,teamName){
            teamId=String(teamId||'').trim();
            if(!teamId){
                try{if(typeof appAlert==='function')await appAlert('Seleziona prima una squadra libera.');else alert('Seleziona prima una squadra libera.');}catch(_){alert('Seleziona prima una squadra libera.');}
                return false;
            }

            const dlg=buildPlayerPinAccessDialog();
            const form=dlg.querySelector('form');
            const input=dlg.querySelector('#v093-player-pin-input');
            const error=dlg.querySelector('#v093-player-pin-error');
            const copy=dlg.querySelector('#v093-player-pin-copy');
            const closeBtn=dlg.querySelector('.v093-player-pin-close');
            const cancelBtn=dlg.querySelector('.v093-player-pin-cancel');
            copy.textContent=`Inserisci il PIN personale del giocatore di ${teamName||'questa squadra'}.`;
            input.value='';
            error.textContent='';

            return new Promise(resolve=>{
                let settled=false;
                const finish=value=>{
                    if(settled)return;
                    settled=true;
                    form.removeEventListener('submit',onSubmit);
                    closeBtn.removeEventListener('click',onClose);
                    cancelBtn.removeEventListener('click',onClose);
                    dlg.removeEventListener('cancel',onCancel);
                    if(dlg.open)dlg.close();
                    resolve(value);
                };
                const onClose=()=>finish(false);
                const onCancel=e=>{e.preventDefault();finish(false);};
                const onSubmit=async e=>{
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
                        finish(true);
                    }catch(err){
                        console.warn('Verifica PIN accesso giocatore',err);
                        error.textContent='Impossibile verificare il PIN. Riprova.';
                    }
                };

                form.addEventListener('submit',onSubmit);
                closeBtn.addEventListener('click',onClose);
                cancelBtn.addEventListener('click',onClose);
                dlg.addEventListener('cancel',onCancel);
                dlg.showModal();
                setTimeout(()=>input.focus({preventScroll:true}),40);
            });
        }

        async function changeAuctioneerPlayerTeam(){
            const select=document.getElementById('auctioneer-player-team-select');
            const id=String(select?.value||'')||null;
            const previousId=String(auctioneerPlayerTeamId||'')||null;

            if(auctioneerPlayerMode&&id&&onlinePlayers.has(String(id))){
                alert('Questa squadra è già collegata da un altro telefono.');
                if(select)select.value=previousId||'';
                return;
            }

            if(auctioneerPlayerMode&&id&&String(id)!==String(previousId||'')){
                const nextTeam=teamsCache.find(t=>String(t.id)===String(id));
                const authorized=await verifyPlayerPinAccess(id,nextTeam?.name||'questa squadra');
                if(!authorized){
                    if(select)select.value=previousId||'';
                    return;
                }
                if(onlinePlayers.has(String(id))){
                    alert('Questa squadra non è più libera: è già collegata da un altro telefono.');
                    if(select)select.value=previousId||'';
                    return;
                }
            }

            auctioneerPlayerTeamId=id;
            const team=currentAuctioneerPlayerTeam();
            if(auctioneerPlayerMode&&team){
                myTeamId=team.id;
                myTeamName=team.name;
            }

            saveAuctioneerPlayerModeLocal();
            renderAuctioneerPlayerControl();
        }

        async function toggleAuctioneerPlayerMode(){
            if(auctioneerPlayerMode){
                auctioneerPlayerMode=false;
                myTeamId=null;
                myTeamName='';
                saveAuctioneerPlayerModeLocal();
                renderAuctioneerPlayerControl();
                renderOnlinePlayers();
                return;
            }

            const select=document.getElementById('auctioneer-player-team-select');
            auctioneerPlayerTeamId=String(select?.value||auctioneerPlayerTeamId||'')||null;
            const team=currentAuctioneerPlayerTeam();

            if(!team){
                alert('Seleziona prima la squadra del banditore.');
                return;
            }
            if(onlinePlayers.has(String(team.id))){
                alert('Questa squadra non è più libera: è già collegata da un altro telefono.');
                renderAuctioneerPlayerControl();
                return;
            }

            const authorized=await verifyPlayerPinAccess(team.id,team.name);
            if(!authorized)return;
            if(onlinePlayers.has(String(team.id))){
                alert('Questa squadra non è più libera: è già collegata da un altro telefono.');
                renderAuctioneerPlayerControl();
                return;
            }

            auctioneerPlayerMode=true;
            myTeamId=team.id;
            myTeamName=team.name;
            saveAuctioneerPlayerModeLocal();
            renderAuctioneerPlayerControl();
            renderOnlinePlayers();
        }

"""
app=app[:start]+new_block+app[end:]
app_path.write_text(app,encoding='utf-8')

mg_path=Path('dev/scripts/management.js')
mg=r"""/* LIVEASTA DEV — Gestione cleanup; player access authorization is owned by app.js */
(function(){
  'use strict';

  function cleanupOldManagement(){
    const root=document.getElementById('screen-room-control');
    if(!root)return;
    root.classList.remove('v092-mobile-management');
    root.querySelectorAll('.v087-collapsed,.v090-collapsed').forEach(el=>el.classList.remove('v087-collapsed','v090-collapsed'));
    root.querySelectorAll('.v087-collapse-btn,.v091-collapse-btn,.v092-collapse-btn').forEach(el=>el.remove());
    root.querySelectorAll('[data-v087-collapsible]').forEach(el=>el.removeAttribute('data-v087-collapsible'));
  }

  function init(){
    cleanupOldManagement();
    const root=document.getElementById('screen-room-control');
    if(root){
      const observer=new MutationObserver(cleanupOldManagement);
      observer.observe(root,{childList:true,subtree:false});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
"""
mg_path.write_text(mg,encoding='utf-8')

idx=Path('dev/index.html')
html=idx.read_text(encoding='utf-8')
for old in ['CLEAN-08','CLEAN-07','CLEAN-05']:
    html=html.replace(old,'CLEAN-09')
for old in ['094-clean08a','094-clean07a','094-clean05a']:
    html=html.replace(old,'094-clean09a')
idx.write_text(html,encoding='utf-8')

pwa=Path('dev/scripts/pwa.js')
if pwa.exists():
    txt=pwa.read_text(encoding='utf-8')
    for old in ['CLEAN-08','CLEAN-07','CLEAN-05']:
        txt=txt.replace(old,'CLEAN-09')
    pwa.write_text(txt,encoding='utf-8')

Path('dev/CLEANUP_REPORT_CLEAN09.txt').write_text("""LIVEASTA CLEAN-09 - CANONICAL PLAYER PIN ACCESS
================================================
Player PIN protects access to a player identity and its personal settings.

Canonical behavior:
- normal player access: existing PIN flow remains mandatory
- enabling Auctioneer + Player: PIN required for selected team
- switching team while Auctioneer + Player is active: PIN required for the new team
- selecting a team while Auctioneer + Player is disabled: no PIN until access is activated
- disabling Auctioneer + Player: no PIN required
- switching between auctioneer/player views for the same already-authorized team does not ask again

Implementation:
- PIN dialog and RPC verification moved into app.js
- toggleAuctioneerPlayerMode is now the single owner of activation authorization
- changeAuctioneerPlayerTeam authorizes a new team before changing active player identity
- management.js wrapper/protectBanditorePlayerMode removed
- online status is rechecked after PIN verification before identity activation/switch
""",encoding='utf-8')