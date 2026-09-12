from pathlib import Path

app_path=Path('dev/scripts/app.js')
boot_path=Path('dev/scripts/bootstrap.js')
idx_path=Path('dev/index.html')
pwa_path=Path('dev/scripts/pwa.js')

app=app_path.read_text(encoding='utf-8')
boot=boot_path.read_text(encoding='utf-8')

# app.js: canonical openPlayerLobby owns wizard reset after lobby preparation.
old="""        async function openPlayerLobby() {
            showScreen('screen-player-setup');
            document.getElementById('player-room-error').innerText = '';
            document.getElementById('player-room-password').value='';
            document.getElementById('player-room-name-input').value='';
            resetPlayerPinPanel();

            await loadShowRoomsSetting();

            if(showRoomsToUsers){
                await loadRooms();
            }else{
                applyPlayerRoomVisibilityUI();
                const sel=document.getElementById('player-team-select');
                if(sel){
                    sel.disabled=true;
                    sel.innerHTML='<option value=\"\">Inserisci nome stanza e password...</option>';
                }
            }
        }
"""
new=old[:-10]+"""            window.resetPlayerAccessWizard?.();
        }
"""
if old not in app: raise SystemExit('openPlayerLobby target not found')
app=app.replace(old,new,1)

# app.js: canonical room mode function prepares wizard state before work and renders once complete.
old="""        async function setAuctioneerRoomMode(mode) {
            if(mode!=='create' && mode!=='join') return;

            auctioneerRoomMode = mode;
"""
new="""        async function setAuctioneerRoomMode(mode) {
            if(mode!=='create' && mode!=='join') return;

            window.prepareAuctionAccessWizard?.();
            auctioneerRoomMode = mode;
"""
if old not in app: raise SystemExit('setAuctioneerRoomMode start not found')
app=app.replace(old,new,1)
old="""            if(mode==='join'){
                await loadShowRoomsSetting();
                applyAuctioneerRoomVisibilityUI();
                if(showRoomsToUsers) await loadRooms();
            }
        }
"""
new="""            if(mode==='join'){
                await loadShowRoomsSetting();
                applyAuctioneerRoomVisibilityUI();
                if(showRoomsToUsers) await loadRooms();
            }
            window.renderAuctionAccessWizard?.();
        }
"""
if old not in app: raise SystemExit('setAuctioneerRoomMode end not found')
app=app.replace(old,new,1)

# app.js: canonical reset stops retry, resets wizard state, then renders after DOM reset.
old="""        function resetAuctioneerRoomMode(){
            auctioneerRoomMode=null;
"""
new="""        function resetAuctioneerRoomMode(){
            window.stopAuctioneerOccupiedRetryCountdown?.();
            window.prepareAuctionAccessWizard?.();
            auctioneerRoomMode=null;
"""
if old not in app: raise SystemExit('resetAuctioneerRoomMode start not found')
app=app.replace(old,new,1)
old="""            if(err) err.innerText='';
        }

        async function createRoom(name, password, config = {}) {
"""
new="""            if(err) err.innerText='';
            window.renderAuctionAccessWizard?.();
        }

        async function createRoom(name, password, config = {}) {
"""
if old not in app: raise SystemExit('resetAuctioneerRoomMode end not found')
app=app.replace(old,new,1)
app_path.write_text(app,encoding='utf-8')

# bootstrap.js: expose small state/render hooks instead of wrapping app functions.
old="""  function resetPlayerWizard(){playerWizardStep=1;renderPlayerWizard();}

  function renderAuctionWizard(){
"""
new="""  function resetPlayerWizard(){playerWizardStep=1;renderPlayerWizard();}
  window.resetPlayerAccessWizard=resetPlayerWizard;

  function prepareAuctionWizard(){auctionWizardStep=1;}

  function renderAuctionWizard(){
"""
if old not in boot: raise SystemExit('wizard hook insertion target not found')
boot=boot.replace(old,new,1)

old="""  window.playerAccessWizardBack=function(){
    if(playerWizardStep<=1){
"""
new="""  window.playerAccessWizardBack=function(){
    window.stopPlayerOccupiedRetryCountdown?.();
    if(playerWizardStep<=1){
"""
if old not in boot: raise SystemExit('player back target not found')
boot=boot.replace(old,new,1)

old="""  window.auctionAccessWizardBack=function(){
    if(auctioneerRoomMode==='create'&&auctionWizardStep===2){auctionWizardStep=1;renderAuctionWizard();return;}
    resetAuctioneerRoomMode();renderAuctionWizard();
  };
"""
new="""  window.auctionAccessWizardBack=function(){
    window.stopAuctioneerOccupiedRetryCountdown?.();
    if(auctioneerRoomMode==='create'&&auctionWizardStep===2){auctionWizardStep=1;renderAuctionWizard();return;}
    resetAuctioneerRoomMode();
  };
"""
if old not in boot: raise SystemExit('auction back target not found')
boot=boot.replace(old,new,1)

old="""  const oldOpenPlayerLobby=window.openPlayerLobby;
  if(typeof oldOpenPlayerLobby==='function')window.openPlayerLobby=async function(){const r=await oldOpenPlayerLobby.apply(this,arguments);resetPlayerWizard();return r;};
  const oldSetAuctioneerRoomMode=window.setAuctioneerRoomMode;
  if(typeof oldSetAuctioneerRoomMode==='function')window.setAuctioneerRoomMode=async function(mode){auctionWizardStep=1;const r=await oldSetAuctioneerRoomMode.apply(this,arguments);renderAuctionWizard();return r;};
  const oldResetAuctioneerRoomMode=window.resetAuctioneerRoomMode;
  if(typeof oldResetAuctioneerRoomMode==='function')window.resetAuctioneerRoomMode=function(){auctionWizardStep=1;const r=oldResetAuctioneerRoomMode.apply(this,arguments);renderAuctionWizard();return r;};

"""
if old not in boot: raise SystemExit('v87 wrapper block not found')
boot=boot.replace(old,'',1)

# Export canonical wizard helpers after render function exists.
marker="""  window.auctionAccessWizardBack=function(){
"""
insert="""  window.prepareAuctionAccessWizard=prepareAuctionWizard;
  window.renderAuctionAccessWizard=renderAuctionWizard;

"""
pos=boot.find(marker)
if pos<0: raise SystemExit('auction wizard export marker not found')
boot=boot[:pos]+insert+boot[pos:]

old="""  const oldPlayerBack=window.playerAccessWizardBack;
  if(typeof oldPlayerBack==='function')window.playerAccessWizardBack=function(){window.stopPlayerOccupiedRetryCountdown();return oldPlayerBack.apply(this,arguments);};
  const oldAuctionBack=window.auctionAccessWizardBack;
  if(typeof oldAuctionBack==='function')window.auctionAccessWizardBack=function(){window.stopAuctioneerOccupiedRetryCountdown();return oldAuctionBack.apply(this,arguments);};
  const oldResetAuctionMode=window.resetAuctioneerRoomMode;
  if(typeof oldResetAuctionMode==='function')window.resetAuctioneerRoomMode=function(){window.stopAuctioneerOccupiedRetryCountdown();return oldResetAuctionMode.apply(this,arguments);};

"""
if old not in boot: raise SystemExit('v89 retry wrapper block not found')
boot=boot.replace(old,'',1)
boot_path.write_text(boot,encoding='utf-8')

# Cache-bust / DEV label.
html=idx_path.read_text(encoding='utf-8')
for oldtag in ['CLEAN-10','CLEAN-09','CLEAN-08','CLEAN-07']:
    html=html.replace(oldtag,'CLEAN-11')
for oldtoken in ['094-clean10a','094-clean09a','094-clean08a','094-clean07a']:
    html=html.replace(oldtoken,'094-clean11a')
idx_path.write_text(html,encoding='utf-8')

if pwa_path.exists():
    txt=pwa_path.read_text(encoding='utf-8')
    for oldtag in ['CLEAN-10','CLEAN-09','CLEAN-08','CLEAN-07','CLEAN-05']:
        txt=txt.replace(oldtag,'CLEAN-11')
    pwa_path.write_text(txt,encoding='utf-8')

report=Path('dev/CLEANUP_REPORT_CLEAN11.txt')
report.write_text('''LIVEASTA CLEAN-11 - ACCESS FLOW OWNERSHIP\n==========================================\nBehavior preserved; wrapper chains removed.\n\nCanonical ownership:\n- openPlayerLobby: app.js only; calls resetPlayerAccessWizard hook after lobby preparation\n- setAuctioneerRoomMode: app.js only; prepares wizard state then renders after room-mode setup\n- resetAuctioneerRoomMode: app.js only; stops retry, resets wizard state, resets DOM, renders wizard\n- playerAccessWizardBack: bootstrap.js only; stops player retry directly before existing back behavior\n- auctionAccessWizardBack: bootstrap.js only; stops auction retry directly before existing back behavior\n- player/auction wizard Next handlers remain bootstrap.js owners\n\nRemoved wrapper chains:\n- oldOpenPlayerLobby\n- oldSetAuctioneerRoomMode\n- oldResetAuctioneerRoomMode\n- oldPlayerBack\n- oldAuctionBack\n- oldResetAuctionMode\n''',encoding='utf-8')
