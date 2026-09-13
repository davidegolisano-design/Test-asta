from pathlib import Path
import re


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing target: {label}')
    return text.replace(old, new, 1)

# ---------------- app.js ----------------
p=Path('scripts/app.js')
s=p.read_text()

# Random status must reflect the actual configured role order.
s=replace_once(
    s,
    "                    const roles=['P','D','C','A'].filter(role=>autoRandomRoles.has(role)).join(' → ')||'nessun ruolo';",
    "                    const roles=autoRandomClassicSequenceOrder().join(' → ')||'nessun ruolo';",
    'random sequence status order'
)

old_block="""        function autoRandomCandidates(){
            const available=getAvailablePlayers();
            if(autoRandomIgnoreSequence){
                return available.filter(player=>{
                    const role=String(playerRole(player)||'').toUpperCase();
                    return ['P','D','C','A'].includes(role) && autoRandomHasBidderForRole(role);
                });
            }

            // Sequenza Classic: completa il primo reparto selezionato ancora bandibile
            // prima di passare al successivo. I ruoli non selezionati vengono saltati.
            for(const role of ['P','D','C','A']){
                if(!autoRandomRoles.has(role) || !autoRandomHasBidderForRole(role))continue;
                const roleCandidates=available.filter(player=>
                    String(playerRole(player)||'').toUpperCase()===role
                );
                if(roleCandidates.length)return roleCandidates;
            }
            return [];
        }"""
new_block="""        function autoRandomClassicSequenceOrder(){
            const configured=(typeof ensureNominationRoleOrder==='function')
                ? ensureNominationRoleOrder()
                : ['P','D','C','A'];
            return configured.filter(role=>autoRandomRoles.has(role));
        }

        function autoRandomClassicRoleComplete(role){
            const r=String(role||'').toUpperCase();
            const limits=roomLimits();
            const limit=Math.max(0,parseInt(limits?.[r])||0);
            if(limit<=0)return true;
            if(!teamsCache.length)return false;
            return teamsCache.every(team=>(teamCounts(team.id)[r]||0)>=limit);
        }

        function autoRandomClassicCurrentSequenceRole(){
            for(const role of autoRandomClassicSequenceOrder()){
                if(!autoRandomClassicRoleComplete(role))return role;
            }
            return null;
        }

        function autoRandomCandidates(){
            const available=getAvailablePlayers();
            if(autoRandomIgnoreSequence){
                return available.filter(player=>{
                    const role=String(playerRole(player)||'').toUpperCase();
                    return ['P','D','C','A'].includes(role) && autoRandomHasBidderForRole(role);
                });
            }

            // Sequenza Classic rigorosa: non si passa al reparto seguente finché
            // TUTTE le squadre non hanno completato gli slot del reparto corrente.
            const role=autoRandomClassicCurrentSequenceRole();
            if(!role)return [];
            return available.filter(player=>
                String(playerRole(player)||'').toUpperCase()===role &&
                autoRandomHasBidderForRole(role)
            );
        }"""
s=replace_once(s,old_block,new_block,'strict classic auto random sequence')

# Never launch a new automatic auction while management is open.
s=replace_once(
    s,
    "        async function startAutoRandomAuctionNow(){\n            if(!autoRandomEnabled || autoRandomStarting || !currentRoomId)return false;\n            if(nominationState.enabled)return false;",
    "        async function startAutoRandomAuctionNow(){\n            if(!autoRandomEnabled || autoRandomStarting || !currentRoomId)return false;\n            if(document.getElementById('screen-room-control')?.classList.contains('active')){\n                cancelAutoRandomLaunch();\n                return false;\n            }\n            if(nominationState.enabled)return false;",
    'block auto random while management open'
)

old_empty="""            if(!candidates.length){
                autoRandomEnabled=false;
                cancelAutoRandomLaunch();
                await saveRoomAuctionExtraSettings();
                renderAutoRandomControlUI();
                alert('AUTO RANDOM terminato: non ci sono più giocatori disponibili nei ruoli selezionati con almeno una squadra abilitata a offrire.');
                return false;
            }"""
new_empty="""            if(!candidates.length){
                const blockedRole=!autoRandomIgnoreSequence?autoRandomClassicCurrentSequenceRole():null;
                autoRandomEnabled=false;
                cancelAutoRandomLaunch();
                await saveRoomAuctionExtraSettings();
                renderAutoRandomControlUI();
                if(blockedRole && !autoRandomClassicRoleComplete(blockedRole)){
                    alert(`AUTO RANDOM fermato sul ruolo ${blockedRole}: il reparto non è ancora completo per tutte le squadre, ma non ci sono giocatori disponibili/offerte possibili per continuare. Non verrà saltato automaticamente.`);
                }else{
                    alert('AUTO RANDOM terminato: non ci sono più giocatori disponibili nei ruoli selezionati con almeno una squadra abilitata a offrire.');
                }
                return false;
            }"""
s=replace_once(s,old_empty,new_empty,'stop instead of skipping incomplete role')

# Await full player start; this also prevents races with management navigation.
s=replace_once(
    s,
    "                selectAndStartPlayer(player.Id,true);\n                return true;",
    "                await selectAndStartPlayer(player.Id,true);\n                return true;",
    'await automatic player start'
)

# Enabling/configuring auto-random from management only arms it; it starts after explicit Back.
s=replace_once(
    s,
    "            if(autoRandomEnabled)scheduleAutoRandomAuction(180);\n            else cancelAutoRandomLaunch();",
    "            if(autoRandomEnabled && !document.getElementById('screen-room-control')?.classList.contains('active'))scheduleAutoRandomAuction(180);\n            else cancelAutoRandomLaunch();",
    'do not launch on enable in management'
)

s=replace_once(
    s,
    "            if(autoRandomEnabled && !isAuctionActive && !readyGateWaiting && !auctionPrepInterval){\n                scheduleAutoRandomAuction(180);\n            }",
    "            if(autoRandomEnabled && !document.getElementById('screen-room-control')?.classList.contains('active') && !isAuctionActive && !readyGateWaiting && !auctionPrepInterval){\n                scheduleAutoRandomAuction(180);\n            }",
    'do not launch on ignore toggle in management'
)

s=replace_once(
    s,
    "            if(autoRandomEnabled && !isAuctionActive && !readyGateWaiting && !auctionPrepInterval)scheduleAutoRandomAuction(180);",
    "            if(autoRandomEnabled && !document.getElementById('screen-room-control')?.classList.contains('active') && !isAuctionActive && !readyGateWaiting && !auctionPrepInterval)scheduleAutoRandomAuction(180);",
    'do not launch on role toggle in management'
)

# Explicit Back is the only point that arms the first automatic launch after settings.
s=replace_once(
    s,
    "        function closeRoomControl(){\n            roomControlNavigationAuthorized=true;\n            setTimeout(()=>{roomControlNavigationAuthorized=false;},0);",
    "        function closeRoomControl(){\n            roomControlNavigationAuthorized=true;\n            setTimeout(()=>{roomControlNavigationAuthorized=false;},0);\n            setTimeout(()=>{\n                const managementStillOpen=document.getElementById('screen-room-control')?.classList.contains('active');\n                if(autoRandomEnabled && !managementStillOpen && !nominationState.enabled && !isAuctionActive && !readyGateWaiting && !auctionPrepInterval && !sealedAuctionModeActive){\n                    scheduleAutoRandomAuction(180);\n                }\n            },80);",
    'launch auto random only after explicit management back'
)

# Strong player-card restoration after the empty previous-auction state.
s=replace_once(
    s,
    "            if(card){card.removeAttribute('aria-hidden');card.style.removeProperty('display');card.style.removeProperty('visibility');}\n            if(meta){meta.hidden=false;meta.setAttribute('aria-hidden','false');meta.style.removeProperty('display');meta.style.removeProperty('visibility');}\n            if(img){img.style.removeProperty('display');img.style.visibility='visible';}",
    "            if(card){card.removeAttribute('aria-hidden');card.style.setProperty('display','flex','important');card.style.setProperty('visibility','visible','important');}\n            if(meta){meta.hidden=false;meta.setAttribute('aria-hidden','false');meta.style.setProperty('display','flex','important');meta.style.setProperty('visibility','visible','important');}\n            if(img){img.style.setProperty('display','block','important');img.style.setProperty('visibility','visible','important');}",
    'strong auction card restore'
)

p.write_text(s)

# ---------------- index.html ----------------
p=Path('index.html')
s=p.read_text()
s=replace_once(
    s,
    '<button class="btn btn-secondary btn-compact" onclick="closeNominationPicker()">Chiudi</button>',
    '<button type="button" class="btn btn-secondary btn-compact nomination-close-btn" onclick="closeNominationPicker()">CHIUDI</button>',
    'nomination close button class'
)
for name,version in [('ui.css','115'),('app.js','115')]:
    s,n=re.subn(rf'{re.escape(name)}\?v=\d+',f'{name}?v={version}',s,count=1)
    if n!=1: raise SystemExit(f'cache ref missing: {name}')
p.write_text(s)

# ---------------- ui.css ----------------
p=Path('styles/ui.css')
s=p.read_text()
s += r'''

/* v1.0.115 — nomination picker mobile close control */
html[data-live-theme] #nomination-picker-overlay .nomination-head{
  display:grid!important;
  grid-template-columns:minmax(0,1fr) auto!important;
  align-items:start!important;
  gap:10px!important;
  width:100%!important;
  box-sizing:border-box!important;
}
html[data-live-theme] #nomination-picker-overlay .nomination-head > div:first-child{
  min-width:0!important;
}
html[data-live-theme] #nomination-picker-overlay .nomination-close-btn{
  width:auto!important;
  min-width:76px!important;
  max-width:none!important;
  height:42px!important;
  min-height:42px!important;
  padding:0 12px!important;
  margin:0!important;
  white-space:nowrap!important;
  overflow:visible!important;
  flex:none!important;
  font-size:12px!important;
  line-height:1!important;
}
@media(max-width:420px){
  html[data-live-theme] #nomination-picker-overlay .nomination-head{
    gap:7px!important;
  }
  html[data-live-theme] #nomination-picker-overlay .nomination-close-btn{
    min-width:68px!important;
    height:40px!important;
    min-height:40px!important;
    padding:0 8px!important;
    font-size:11px!important;
  }
}
'''
p.write_text(s)
