from pathlib import Path
import re


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing target: {label}')
    return text.replace(old, new, 1)


def regex_once(text, pattern, repl, label):
    out, n = re.subn(pattern, repl, text, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f'pattern {label}: expected 1, got {n}')
    return out

# ---------------- app.js ----------------
p=Path('scripts/app.js')
s=p.read_text()

# Management screen navigation lock: only closeRoomControl authorizes leaving Gestione.
s=replace_once(
    s,
    "        let roomControlReturnScreen = 'screen-auctioneer-board';",
    "        let roomControlReturnScreen = 'screen-auctioneer-board';\n        let roomControlNavigationAuthorized=false;",
    'management navigation state'
)

old_show="""        function showScreen(screenId) {
            syncHybridViewButtons();"""
new_show="""        function showScreen(screenId) {
            const managementActive=document.getElementById('screen-room-control')?.classList.contains('active');
            if(managementActive && screenId!=='screen-room-control' && !roomControlNavigationAuthorized){
                return false;
            }
            syncHybridViewButtons();"""
s=replace_once(s,old_show,new_show,'showScreen management guard')

# Only the explicit back action gets a short synchronous authorization window.
s=replace_once(
    s,
    "        function closeRoomControl(){\n            if(roomControlReturnScreen==='hybrid-context' && auctioneerPlayerMode){",
    "        function closeRoomControl(){\n            roomControlNavigationAuthorized=true;\n            setTimeout(()=>{roomControlNavigationAuthorized=false;},0);\n            if(roomControlReturnScreen==='hybrid-context' && auctioneerPlayerMode){",
    'closeRoomControl authorization'
)

# Classic automatic random: selected roles are an ordered sequence, not one mixed pool.
old_candidates="""        function autoRandomCandidates(){
            if(autoRandomIgnoreSequence){
                return getAvailablePlayers().filter(player=>{
                    const role=String(playerRole(player)||'').toUpperCase();
                    return autoRandomHasBidderForRole(role);
                });
            }
            const allowed=new Set([...autoRandomRoles].map(r=>String(r).toUpperCase()));
            if(!allowed.size)return [];
            return getAvailablePlayers().filter(player=>{
                const role=String(playerRole(player)||'').toUpperCase();
                return allowed.has(role) && autoRandomHasBidderForRole(role);
            });
        }"""
new_candidates="""        function autoRandomCandidates(){
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
s=replace_once(s,old_candidates,new_candidates,'classic auto random sequence')

# Make the status explicit about ordered behaviour.
s=replace_once(
    s,
    "                    const roles=[...autoRandomRoles].join(' · ')||'nessun ruolo';\n                    status.innerHTML=autoRandomEnabled\n                        ? `ATTIVO · ruoli <b>${escapeHtml(roles)}</b> · la prossima asta parte automaticamente.`\n                        : `DISATTIVO · ruoli predisposti <b>${escapeHtml(roles)}</b>.`;",
    "                    const roles=['P','D','C','A'].filter(role=>autoRandomRoles.has(role)).join(' → ')||'nessun ruolo';\n                    status.innerHTML=autoRandomEnabled\n                        ? `ATTIVO · sequenza <b>${escapeHtml(roles)}</b> · la prossima asta parte automaticamente.`\n                        : `DISATTIVO · sequenza predisposta <b>${escapeHtml(roles)}</b>.`;",
    'classic random sequence status'
)

# Starting an automatic auction must never close Gestione.
s=replace_once(
    s,
    "                // Se si parte da Gestione, riporta prima il banditore alla plancia.\n                if(document.getElementById('screen-room-control')?.classList.contains('active'))closeRoomControl();\n                selectAndStartPlayer(player.Id,true);",
    "                // L'asta può partire in background: Gestione resta aperta finché il banditore non usa ← Asta.\n                selectAndStartPlayer(player.Id,true);",
    'auto random management stay'
)

# Robustly restore the whole left player card after the empty previous-auction state.
old_restore="""        function restoreAuctionCardVisibility(){
            const img=document.getElementById('card-image');
            if(img) img.style.visibility='visible';
            document.getElementById('auction-player-name-top')?.classList.remove('nomination-waiting-team');
            document.getElementById('auction-player-role')?.classList.remove('nomination-waiting-role');
        }"""
new_restore="""        function restoreAuctionCardVisibility(){
            const playerCol=document.querySelector('#view-auction .col-player');
            const card=document.getElementById('auction-player-card');
            const meta=document.getElementById('auction-player-meta');
            const img=document.getElementById('card-image');
            const name=document.getElementById('auction-player-name-top');
            const role=document.getElementById('auction-player-role');
            const club=document.getElementById('auction-player-club');

            playerCol?.classList.remove('nomination-empty-previous');
            if(card){card.removeAttribute('aria-hidden');card.style.removeProperty('display');card.style.removeProperty('visibility');}
            if(meta){meta.hidden=false;meta.setAttribute('aria-hidden','false');meta.style.removeProperty('display');meta.style.removeProperty('visibility');}
            if(img){img.style.removeProperty('display');img.style.visibility='visible';}
            if(role){role.style.removeProperty('display');role.style.removeProperty('visibility');role.classList.remove('nomination-waiting-role');}
            if(club){club.style.removeProperty('display');club.style.removeProperty('visibility');}
            name?.classList.remove('nomination-waiting-team');

            if(currentAuctionPlayer){
                if(name)name.textContent=currentAuctionPlayer.Nome||'--';
                if(img)setPlayerImage(img,currentAuctionPlayer.Id,currentAuctionPlayer.R);
                if(role){
                    if(typeof renderRoleBadgesInto==='function')renderRoleBadgesInto(role,currentAuctionPlayer.R||'');
                    else role.textContent=currentAuctionPlayer.R||'-';
                }
                if(club)club.textContent=currentAuctionPlayer.Squadra||'-';
            }
        }"""
s=replace_once(s,old_restore,new_restore,'restore auction player card')

# Every normal auction phase explicitly restores the card if a real player exists.
s=replace_once(
    s,
    "        function showAuctionPanels(){\n            hideNominationStage();",
    "        function showAuctionPanels(){\n            hideNominationStage();\n            if(currentAuctionPlayer)restoreAuctionCardVisibility();",
    'showAuctionPanels restore card'
)

p.write_text(s)

# ---------------- mantra-auction.js ----------------
p=Path('scripts/mantra-auction.js')
s=p.read_text()

# The Mantra module must genuinely leave Classic automatic-random functions untouched.
s=replace_once(
    s,
    "    autoRandomSelectedRolesFromControl=function(){\n        return activeGroups().filter(role=>document.getElementById('auto-random-role-btn-'+role)?.getAttribute('aria-pressed')==='true');\n    };",
    "    const baseAutoRandomSelectedRolesFromControl=autoRandomSelectedRolesFromControl;\n    const baseRenderAutoRandomControlUI=renderAutoRandomControlUI;\n    const baseSetAutoRandomEnabled=setAutoRandomEnabled;\n    const baseToggleAutoRandomRoleButton=toggleAutoRandomRoleButton;\n    const baseSetAutoRandomRole=setAutoRandomRole;\n    const baseAutoRandomCandidates=autoRandomCandidates;\n\n    autoRandomSelectedRolesFromControl=function(){\n        if(!isMantraRoom())return baseAutoRandomSelectedRolesFromControl.apply(this,arguments);\n        return activeGroups().filter(role=>document.getElementById('auto-random-role-btn-'+role)?.getAttribute('aria-pressed')==='true');\n    };",
    'capture classic random functions'
)

s=replace_once(
    s,
    "    renderAutoRandomControlUI=function(){\n        const roles=activeGroups();",
    "    renderAutoRandomControlUI=function(){\n        if(!isMantraRoom())return baseRenderAutoRandomControlUI.apply(this,arguments);\n        const roles=activeGroups();",
    'delegate classic render'
)

s=replace_once(
    s,
    "    setAutoRandomEnabled=async function(enabled){\n        const selected=autoRandomSelectedRolesFromControl();",
    "    setAutoRandomEnabled=async function(enabled){\n        if(!isMantraRoom())return baseSetAutoRandomEnabled.apply(this,arguments);\n        const selected=autoRandomSelectedRolesFromControl();",
    'delegate classic set enabled'
)

s=replace_once(
    s,
    "    toggleAutoRandomRoleButton=function(role){\n        const r=String(role||'').toUpperCase();",
    "    toggleAutoRandomRoleButton=function(role){\n        if(!isMantraRoom())return baseToggleAutoRandomRoleButton.apply(this,arguments);\n        const r=String(role||'').toUpperCase();",
    'delegate classic role toggle'
)

s=replace_once(
    s,
    "    setAutoRandomRole=async function(role,checked){\n        const r=String(role||'').toUpperCase();",
    "    setAutoRandomRole=async function(role,checked){\n        if(!isMantraRoom())return baseSetAutoRandomRole.apply(this,arguments);\n        const r=String(role||'').toUpperCase();",
    'delegate classic set role'
)

s=replace_once(
    s,
    "    autoRandomCandidates=function(){\n        if(autoRandomIgnoreSequence){",
    "    autoRandomCandidates=function(){\n        if(!isMantraRoom())return baseAutoRandomCandidates.apply(this,arguments);\n        if(autoRandomIgnoreSequence){",
    'delegate classic candidates'
)

p.write_text(s)

# ---------------- index cache bust ----------------
p=Path('index.html')
s=p.read_text()
for name,version in [('app.js','114'),('mantra-auction.js','114')]:
    s,n=re.subn(rf'{re.escape(name)}\?v=\d+',f'{name}?v={version}',s,count=1)
    if n!=1: raise SystemExit(f'cache ref not found: {name}')
p.write_text(s)
