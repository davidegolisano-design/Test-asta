from pathlib import Path
import re

BASE='0ae5ccf49db65488a09c1aed3c516c61fde52ab1'


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing target: {label}')
    return text.replace(old, new, 1)


def regex_once(text, pattern, repl, label):
    out, n = re.subn(pattern, repl, text, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f'pattern {label}: expected 1, got {n}')
    return out

# ---------------- index.html ----------------
p=Path('index.html')
s=p.read_text()

s=replace_once(s,
'''                        </div>
                        <div id="auto-random-status" class="mg-status-text auto-random-status">DISATTIVO</div>''',
'''                        </div>
                        <div class="mg-inline-setting sequence-ignore-option auto-random-ignore-sequence-option">
                            <span class="nomination-auto-bid-one-copy"><b>Ignora sequenza</b><small>Pesca casualmente tra tutti i ruoli disponibili, ignorando i ruoli selezionati.</small></span>
                            <label class="mg-switch-label" for="auto-random-ignore-sequence">
                                <input id="auto-random-ignore-sequence" type="checkbox" onchange="setAutoRandomIgnoreSequence(this.checked)">
                                <span class="mg-switch-ui" aria-hidden="true"></span>
                            </label>
                        </div>
                        <div id="auto-random-status" class="mg-status-text auto-random-status">DISATTIVO</div>''',
'auto random ignore toggle')

s=replace_once(s,
'''                        <div class="mg-nomination-details">
                            <div id="nomination-role-order-card" class="mg-role-order-card">''',
'''                        <div class="mg-nomination-details">
                            <div id="nomination-ignore-sequence-option" class="mg-inline-setting sequence-ignore-option nomination-ignore-sequence-option">
                                <span class="nomination-auto-bid-one-copy"><b>Ignora sequenza</b><small>Mantiene i turni, ma chi è di turno può bandire un giocatore di qualsiasi ruolo con slot ancora disponibile.</small></span>
                                <label class="mg-switch-label" for="nomination-ignore-sequence">
                                    <input id="nomination-ignore-sequence" type="checkbox" onchange="setNominationIgnoreSequence(this.checked)">
                                    <span class="mg-switch-ui" aria-hidden="true"></span>
                                </label>
                            </div>
                            <div id="nomination-role-order-card" class="mg-role-order-card">''',
'nomination ignore toggle')

for name,version in [('management.css','113'),('list-filters.js','113'),('app.js','113'),('mantra-auction.js','113')]:
    s,n=re.subn(rf'{re.escape(name)}\?v=\d+', f'{name}?v={version}', s, count=1)
    if n!=1: raise SystemExit(f'cache ref not found: {name}')
p.write_text(s)

# ---------------- scripts/app.js ----------------
p=Path('scripts/app.js')
s=p.read_text()

s=replace_once(s,
"let nominationState={enabled:false,role:null,turn_team_id:null,order_team_ids:[],role_order:['P','D','C','A']};",
"let nominationState={enabled:false,role:null,turn_team_id:null,order_team_ids:[],role_order:['P','D','C','A'],ignore_sequence:false};",
'nomination state default')
s=replace_once(s,
"        let autoRandomEnabled=false;\n        let autoRandomRoles=new Set(['P','D','C','A']);",
"        let autoRandomEnabled=false;\n        let autoRandomIgnoreSequence=false;\n        let autoRandomRoles=new Set(['P','D','C','A']);",
'auto random state default')

s=replace_once(s,
"            autoRandomEnabled=false;\n            autoRandomRoles=new Set(['P','D','C','A']);",
"            autoRandomEnabled=false;\n            autoRandomIgnoreSequence=false;\n            autoRandomRoles=new Set(['P','D','C','A']);",
'load defaults')
s=replace_once(s,
"                autoRandomEnabled=!!cfg.auto_random_enabled;\n                const storedRoles=Array.isArray(cfg.auto_random_roles)?cfg.auto_random_roles:[];",
"                autoRandomEnabled=!!cfg.auto_random_enabled;\n                autoRandomIgnoreSequence=!!cfg.auto_random_ignore_sequence;\n                const storedRoles=Array.isArray(cfg.auto_random_roles)?cfg.auto_random_roles:[];",
'load ignore sequence')
s=replace_once(s,
"                        auto_random_enabled:!!autoRandomEnabled,\n                        auto_random_roles:[...autoRandomRoles]",
"                        auto_random_enabled:!!autoRandomEnabled,\n                        auto_random_ignore_sequence:!!autoRandomIgnoreSequence,\n                        auto_random_roles:[...autoRandomRoles]",
'save ignore sequence')

new_auto_render='''        function renderAutoRandomControlUI(){
            const master=document.getElementById('auto-random-enabled');
            if(master)master.checked=!!autoRandomEnabled;
            const ignoreToggle=document.getElementById('auto-random-ignore-sequence');
            if(ignoreToggle)ignoreToggle.checked=!!autoRandomIgnoreSequence;
            const roleHost=document.querySelector('#screen-room-control .mg-role-choice[aria-label="Ruoli random automatico"]');
            if(roleHost)roleHost.classList.toggle('sequence-ignored',!!autoRandomIgnoreSequence);
            ['P','D','C','A'].forEach(role=>{
                const selected=autoRandomRoles.has(role);
                const btn=document.getElementById('auto-random-role-btn-'+role);
                if(btn){
                    btn.classList.toggle('selected',selected);
                    btn.setAttribute('aria-pressed',selected?'true':'false');
                    btn.disabled=!!autoRandomIgnoreSequence;
                }
            });
            const status=document.getElementById('auto-random-status');
            if(status){
                if(autoRandomIgnoreSequence){
                    status.innerHTML=autoRandomEnabled
                        ? 'ATTIVO · <b>IGNORA SEQUENZA</b> · pesca tra tutti i ruoli disponibili.'
                        : 'DISATTIVO · <b>IGNORA SEQUENZA</b> predisposto.';
                }else{
                    const roles=[...autoRandomRoles].join(' · ')||'nessun ruolo';
                    status.innerHTML=autoRandomEnabled
                        ? `ATTIVO · ruoli <b>${escapeHtml(roles)}</b> · la prossima asta parte automaticamente.`
                        : `DISATTIVO · ruoli predisposti <b>${escapeHtml(roles)}</b>.`;
                }
                status.classList.toggle('active',!!autoRandomEnabled);
            }
        }

        async function setAutoRandomIgnoreSequence(enabled){
            autoRandomIgnoreSequence=!!enabled;
            await saveRoomAuctionExtraSettings();
            renderAutoRandomControlUI();
            if(autoRandomEnabled && !isAuctionActive && !readyGateWaiting && !auctionPrepInterval){
                scheduleAutoRandomAuction(180);
            }
        }

        function autoRandomHasBidderForRole'''
s=regex_once(s,
    r"        function renderAutoRandomControlUI\(\)\{.*?\n        \}\n\n        function autoRandomHasBidderForRole",
    new_auto_render,
    'render auto random')

s=replace_once(s,
"            if(enabled && !selected.length){",
"            if(enabled && !autoRandomIgnoreSequence && !selected.length){",
'auto random enable validation')

# only the core setAutoRandomRole condition after its declaration
s=s.replace("            if(autoRandomEnabled && !autoRandomRoles.size){\n                autoRandomEnabled=false;", "            if(autoRandomEnabled && !autoRandomIgnoreSequence && !autoRandomRoles.size){\n                autoRandomEnabled=false;", 1)

new_candidates='''        function autoRandomCandidates(){
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
        }'''
s=regex_once(s,r"        function autoRandomCandidates\(\)\{.*?\n        \}",new_candidates,'auto random candidates')

# Nomination order renderer + ignore toggle setter.
new_role_order='''        function renderNominationRoleOrder(){
            const card=document.getElementById('nomination-role-order-card');
            const list=document.getElementById('nomination-role-order-list');
            const summary=document.getElementById('nomination-role-order-summary');
            const ignoreOption=document.getElementById('nomination-ignore-sequence-option');
            const ignoreToggle=document.getElementById('nomination-ignore-sequence');
            if(ignoreOption)ignoreOption.hidden=isMantraRoom();
            if(ignoreToggle)ignoreToggle.checked=!!nominationState.ignore_sequence;
            if(card)card.hidden=isMantraRoom();
            if(isMantraRoom()||!list)return;
            const order=ensureNominationRoleOrder();
            const ignore=!!nominationState.ignore_sequence;
            if(summary)summary.textContent=ignore?`IGNORATA · ${order.join(' → ')}`:order.join(' → ');
            list.classList.toggle('sequence-ignored',ignore);
            const labels={P:'Portieri',D:'Difensori',C:'Centrocampisti',A:'Attaccanti'};
            list.innerHTML=order.map((role,i)=>`<div class="mg-role-order-row">
                <span class="unified-role role-${role} selected" aria-hidden="true">${role}</span>
                <span class="mg-role-order-name">${labels[role]}</span>
                <button class="btn btn-secondary mg-role-order-move" type="button" ${ignore||i===0?'disabled':''} onclick="moveNominationRole('${role}',-1)" aria-label="Sposta ${labels[role]} su">↑</button>
                <button class="btn btn-secondary mg-role-order-move" type="button" ${ignore||i===order.length-1?'disabled':''} onclick="moveNominationRole('${role}',1)" aria-label="Sposta ${labels[role]} giù">↓</button>
            </div>`).join('');
        }

        async function setNominationIgnoreSequence(enabled){
            if(isMantraRoom())return;
            if(isAuctionActive){
                const toggle=document.getElementById('nomination-ignore-sequence');
                if(toggle)toggle.checked=!!nominationState.ignore_sequence;
                alert('Non puoi cambiare Ignora sequenza mentre è in corso un’asta.');
                return;
            }
            nominationState.ignore_sequence=!!enabled;
            if(nominationState.enabled){
                await loadRoomState();
                nominationState.role=firstIncompleteRole();
                nominationState.turn_team_id=null;
                normalizeNominationState();
                nominationReady=true;
            }
            await saveNominationState(nominationReady);
            renderRoomControl();
            if(nominationState.enabled)showNominationWaitingBoard();
        }

        async function moveNominationRole'''
s=regex_once(s,
    r"        function renderNominationRoleOrder\(\)\{.*?\n        \}\n\n        async function moveNominationRole",
    new_role_order,
    'nomination role order')

s=replace_once(s,
"        async function moveNominationRole(role,delta){\n            if(isMantraRoom())return;",
"        async function moveNominationRole(role,delta){\n            if(isMantraRoom()||nominationState.ignore_sequence)return;",
'move role blocked while ignored')

s=replace_once(s,
'''        function firstIncompleteRole(){
            if(isMantraRoom()){
                return teamsCache.some(t=>teamCounts(t.id).total<mantraRosterMax())?'ALL':null;
            }
            const l=roomLimits();
            for(const r of ensureNominationRoleOrder()) if((l[r]||0)>0 && teamsCache.some(t=>(teamCounts(t.id)[r]||0)<l[r])) return r;
            return null;
        }
        function eligibleNominationTeams(r=nominationState.role){
            if(!r)return [];
            if(isMantraRoom()){
                return teamsCache.filter(t=>teamCounts(t.id).total<mantraRosterMax());
            }
            const l=roomLimits();
            return teamsCache.filter(t=>(teamCounts(t.id)[r]||0)<(l[r]||0));
        }''',
'''        function classicTeamHasAnyNominationSlot(team){
            if(!team)return false;
            const counts=teamCounts(team.id),limits=roomLimits();
            return ['P','D','C','A'].some(role=>(counts[role]||0)<(limits[role]||0));
        }
        function firstIncompleteRole(){
            if(isMantraRoom()){
                return teamsCache.some(t=>teamCounts(t.id).total<mantraRosterMax())?'ALL':null;
            }
            const l=roomLimits();
            for(const r of ensureNominationRoleOrder()) if((l[r]||0)>0 && teamsCache.some(t=>(teamCounts(t.id)[r]||0)<l[r])) return r;
            return null;
        }
        function eligibleNominationTeams(r=nominationState.role){
            if(!r)return [];
            if(isMantraRoom()){
                return teamsCache.filter(t=>teamCounts(t.id).total<mantraRosterMax());
            }
            if(nominationState.ignore_sequence)return teamsCache.filter(classicTeamHasAnyNominationSlot);
            const l=roomLimits();
            return teamsCache.filter(t=>(teamCounts(t.id)[r]||0)<(l[r]||0));
        }''',
'nomination eligibility')

s=replace_once(s,
"            const r=document.getElementById('player-nominate-role');if(r)r.textContent=nominationState.role?(isMantraRoom()?'MANTRA · qualsiasi ruolo':`Ruolo ${nominationState.role} · ${nominationRoleName(nominationState.role)}`):'Rosa completata';",
"            const r=document.getElementById('player-nominate-role');if(r)r.textContent=nominationState.role?(isMantraRoom()?'MANTRA · qualsiasi ruolo':nominationState.ignore_sequence?'IGNORA SEQUENZA · qualsiasi ruolo':`Ruolo ${nominationState.role} · ${nominationRoleName(nominationState.role)}`):'Rosa completata';",
'nomination player label')

s=replace_once(s,
"            const st=document.getElementById('nomination-control-status');if(st)st.innerHTML=!nominationState.enabled?'Modalità disattivata.':!nominationState.role?'Tutte le rose sono complete.':(isMantraRoom()?`Banditura libera MANTRA · turno <b style=\"color:var(--lime)\">${escapeHtml(currentNominationTeam()?.name||'--')}</b>`:`Ruolo <b>${nominationState.role}</b> · turno <b style=\"color:var(--lime)\">${escapeHtml(currentNominationTeam()?.name||'--')}</b>`);",
"            const st=document.getElementById('nomination-control-status');if(st)st.innerHTML=!nominationState.enabled?'Modalità disattivata.':!nominationState.role?'Tutte le rose sono complete.':(isMantraRoom()?`Banditura libera MANTRA · turno <b style=\"color:var(--lime)\">${escapeHtml(currentNominationTeam()?.name||'--')}</b>`:nominationState.ignore_sequence?`Ignora sequenza · qualsiasi ruolo · turno <b style=\"color:var(--lime)\">${escapeHtml(currentNominationTeam()?.name||'--')}</b>`:`Ruolo <b>${nominationState.role}</b> · turno <b style=\"color:var(--lime)\">${escapeHtml(currentNominationTeam()?.name||'--')}</b>`);",
'nomination status')

s=replace_once(s,
"                if(roleEl)roleEl.textContent=role\n                    ? (isMantraRoom()?'Può bandire qualsiasi giocatore disponibile':`Sceglie un ${nominationRoleName(role)} · Ruolo ${role}`)\n                    : 'Tutte le rose sono complete';",
"                if(roleEl)roleEl.textContent=role\n                    ? ((isMantraRoom()||nominationState.ignore_sequence)?'Può bandire qualsiasi giocatore disponibile':`Sceglie un ${nominationRoleName(role)} · Ruolo ${role}`)\n                    : 'Tutte le rose sono complete';",
'turn board free label')

s=replace_once(s,
'''            document.getElementById('nomination-picker-title').textContent=isMantraRoom()?'Scegli un giocatore da bandire':`Scegli un ${nominationRoleName(nominationState.role)}`;
            document.getElementById('nomination-picker-subtitle').textContent=isMantraRoom()?'MANTRA · banditura libera, qualsiasi ruolo':`Solo ruolo ${nominationState.role}`;
            renderNominationCandidates();''',
'''            const ignoreSequence=!isMantraRoom()&&!!nominationState.ignore_sequence;
            if(ignoreSequence && typeof listFilterState==='function' && typeof listFilterRoles==='function'){
                try{listFilterState('nomination').roles=[...listFilterRoles()];}catch(_e){}
            }
            document.getElementById('nomination-picker-title').textContent=(isMantraRoom()||ignoreSequence)?'Scegli un giocatore da bandire':`Scegli un ${nominationRoleName(nominationState.role)}`;
            document.getElementById('nomination-picker-subtitle').textContent=isMantraRoom()?'MANTRA · banditura libera, qualsiasi ruolo':ignoreSequence?'IGNORA SEQUENZA · qualsiasi ruolo disponibile':`Solo ruolo ${nominationState.role}`;
            renderNominationCandidates();''',
'open nomination picker')

s=replace_once(s,
'''            const eligible=playersList
                .filter(p=>isMantraRoom() || String(playerRole(p)).toUpperCase()===String(nominationState.role))
                .filter(p=>!auctionedPlayerIds.has(String(p.Id)));''',
'''            const turnTeam=currentNominationTeam();
            const turnCounts=turnTeam?teamCounts(turnTeam.id):null;
            const turnLimits=roomLimits();
            const ignoreSequence=!isMantraRoom()&&!!nominationState.ignore_sequence;
            const eligible=playersList
                .filter(p=>{
                    if(isMantraRoom())return true;
                    const role=String(playerRole(p)||'').toUpperCase();
                    if(ignoreSequence){
                        return !!turnCounts && ['P','D','C','A'].includes(role) && (turnCounts[role]||0)<(turnLimits[role]||0);
                    }
                    return role===String(nominationState.role).toUpperCase();
                })
                .filter(p=>!auctionedPlayerIds.has(String(p.Id)));''',
'nomination candidate filter')

s=replace_once(s,
'''            const invalidClassic=
                !isMantraRoom() &&
                p &&
                String(playerRole(p))!==String(nominationState.role);

            const invalidCapacity=
                isMantraRoom()
                    ?(!c || c.total>=mantraRosterMax())
                    :(!c || (c[nominationState.role]||0)>=(l[nominationState.role]||0));''',
'''            const ignoreSequence=!isMantraRoom()&&!!nominationState.ignore_sequence;
            const selectedClassicRole=p?String(playerRole(p)||'').toUpperCase():'';
            const invalidClassic=
                !isMantraRoom() &&
                p &&
                !ignoreSequence &&
                selectedClassicRole!==String(nominationState.role);

            const capacityRole=ignoreSequence?selectedClassicRole:nominationState.role;
            const invalidCapacity=
                isMantraRoom()
                    ?(!c || c.total>=mantraRosterMax())
                    :(!c || !p || !['P','D','C','A'].includes(String(capacityRole||'')) || (c[capacityRole]||0)>=(l[capacityRole]||0));''',
'nomination host validation')

p.write_text(s)

# ---------------- scripts/list-filters.js ----------------
p=Path('scripts/list-filters.js')
s=p.read_text()
s=replace_once(s,
"const locked=view==='nomination'&&!isMantraRoom()?String(nominationState.role):'';",
"const locked=view==='nomination'&&!isMantraRoom()&&!nominationState.ignore_sequence?String(nominationState.role):'';",
'nomination list lock')
s=replace_once(s,
"const matchesRole=view==='nomination'&&!isMantraRoom()?item.tokens.includes(String(nominationState.role)):item.tokens.some(r=>state.roles.includes(r));",
"const nominationLocked=view==='nomination'&&!isMantraRoom()&&!nominationState.ignore_sequence;\n        const matchesRole=nominationLocked?item.tokens.includes(String(nominationState.role)):item.tokens.some(r=>state.roles.includes(r));",
'nomination list matching')
p.write_text(s)

# ---------------- scripts/mantra-auction.js ----------------
p=Path('scripts/mantra-auction.js')
s=p.read_text()

new_mantra_render='''    renderAutoRandomControlUI=function(){
        const roles=activeGroups();
        if(isMantraRoom()){
            const normalized=normalizeStoredGroups([...autoRandomRoles]);
            autoRandomRoles=new Set(normalized.length?normalized:GROUPS);
        }
        const master=document.getElementById('auto-random-enabled');
        if(master)master.checked=!!autoRandomEnabled;
        const ignoreToggle=document.getElementById('auto-random-ignore-sequence');
        if(ignoreToggle)ignoreToggle.checked=!!autoRandomIgnoreSequence;
        const host=document.querySelector('#screen-room-control .mg-role-choice[aria-label="Ruoli random automatico"]');
        if(host){
            const signature=(isMantraRoom()?'mantra-groups:':'classic:')+roles.join('|');
            if(host.dataset.roleModeSignature!==signature){
                host.dataset.roleModeSignature=signature;
                host.classList.toggle('mantra-auto-random-role-grid',isMantraRoom());
                host.innerHTML=roles.map(role=>`<button id="auto-random-role-btn-${role}" type="button" class="unified-role role-${role}" aria-pressed="false" aria-label="${categoryLabel(role)}" title="${categoryLabel(role)}" onclick="toggleAutoRandomRoleButton('${role}')">${isMantraRoom()?(SHORT_LABELS[role]||role):categoryLabel(role)}</button>`).join('');
            }
            host.classList.toggle('sequence-ignored',!!autoRandomIgnoreSequence);
        }
        roles.forEach(role=>{
            const selected=autoRandomRoles.has(role);
            const btn=document.getElementById('auto-random-role-btn-'+role);
            if(btn){
                btn.classList.toggle('selected',selected);
                btn.setAttribute('aria-pressed',selected?'true':'false');
                btn.disabled=!!autoRandomIgnoreSequence;
            }
        });
        const status=document.getElementById('auto-random-status');
        if(status){
            if(autoRandomIgnoreSequence){
                status.innerHTML=autoRandomEnabled
                    ? 'ATTIVO · <b>IGNORA SEQUENZA</b> · pesca tra tutti i ruoli disponibili.'
                    : 'DISATTIVO · <b>IGNORA SEQUENZA</b> predisposto.';
            }else{
                const text=roles.filter(r=>autoRandomRoles.has(r)).map(categoryLabel).join(' · ')||'nessuna categoria';
                status.innerHTML=autoRandomEnabled
                    ?`ATTIVO · <b>${escapeHtml(text)}</b> · la prossima asta parte automaticamente.`
                    :`DISATTIVO · categorie predisposte <b>${escapeHtml(text)}</b>.`;
            }
            status.classList.toggle('active',!!autoRandomEnabled);
        }
    };'''
s=regex_once(s,r"    renderAutoRandomControlUI=function\(\)\{.*?\n    \};",new_mantra_render,'mantra render auto random')

s=replace_once(s,
"        if(enabled&&!selected.length){",
"        if(enabled&&!autoRandomIgnoreSequence&&!selected.length){",
'mantra enable validation')
s=s.replace("        if(autoRandomEnabled&&!autoRandomRoles.size){\n            autoRandomEnabled=false;", "        if(autoRandomEnabled&&!autoRandomIgnoreSequence&&!autoRandomRoles.size){\n            autoRandomEnabled=false;", 1)

s=replace_once(s,
'''    autoRandomCandidates=function(){
        const allowed=new Set([...autoRandomRoles].map(r=>String(r).toUpperCase()).filter(r=>activeGroups().includes(r)));
        if(!allowed.size)return [];
        return getAvailablePlayers().filter(player=>groupsForRole(playerRole(player)).some(group=>allowed.has(group)&&autoRandomHasBidderForRole(group)));
    };''',
'''    autoRandomCandidates=function(){
        if(autoRandomIgnoreSequence){
            return getAvailablePlayers().filter(player=>
                groupsForRole(playerRole(player)).some(group=>autoRandomHasBidderForRole(group))
            );
        }
        const allowed=new Set([...autoRandomRoles].map(r=>String(r).toUpperCase()).filter(r=>activeGroups().includes(r)));
        if(!allowed.size)return [];
        return getAvailablePlayers().filter(player=>groupsForRole(playerRole(player)).some(group=>allowed.has(group)&&autoRandomHasBidderForRole(group)));
    };''',
'mantra candidates ignore sequence')
p.write_text(s)

# ---------------- styles/management.css ----------------
p=Path('styles/management.css')
s=p.read_text()
marker='/* === IGNORA SEQUENZA === */'
if marker not in s:
    s += '''\n\n/* === IGNORA SEQUENZA === */
#screen-room-control .sequence-ignore-option{margin-top:10px;}
#screen-room-control .mg-role-choice.sequence-ignored,
#screen-room-control .mg-role-order-list.sequence-ignored{opacity:.48;}
#screen-room-control .mg-role-choice .unified-role:disabled{cursor:not-allowed;filter:saturate(.65);}
html body.liveasta-mantra #nomination-ignore-sequence-option{display:none!important;}
'''
p.write_text(s)
