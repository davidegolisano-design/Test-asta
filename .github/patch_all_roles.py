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


# app.js — Classic turn mode gets optional ALL roles. Mantra turn mode is untouched.
p = Path('scripts/app.js')
s = p.read_text()
s = replace_once(
    s,
    "let nominationState={enabled:false,role:null,turn_team_id:null,order_team_ids:[],role_order:['P','D','C','A']};",
    "let nominationState={enabled:false,role:null,turn_team_id:null,order_team_ids:[],role_order:['P','D','C','A'],all_roles:false};",
    'nomination state default'
)

role_ui = '''        function renderNominationRoleOrder(){
            const card=document.getElementById('nomination-role-order-card');
            const list=document.getElementById('nomination-role-order-list');
            const summary=document.getElementById('nomination-role-order-summary');
            if(card)card.hidden=isMantraRoom();
            if(isMantraRoom()||!list)return;
            const order=ensureNominationRoleOrder();
            const allMode=!!nominationState.all_roles;
            if(summary)summary.textContent=allMode?'TUTTI I RUOLI':order.join(' → ');
            const labels={P:'Portieri',D:'Difensori',C:'Centrocampisti',A:'Attaccanti'};
            list.classList.toggle('all-roles-active',allMode);
            list.innerHTML=`<button id="nomination-all-roles-mode" class="btn btn-secondary mg-role-all-mode${allMode?' selected':''}" type="button" aria-pressed="${allMode}" onclick="toggleNominationAllRoles()"><span>TUTTI I RUOLI</span><small>Ogni squadra può bandire un giocatore di qualsiasi reparto ancora libero.</small></button>`+
                order.map((role,i)=>`<div class="mg-role-order-row">
                <span class="unified-role role-${role} selected" aria-hidden="true">${role}</span>
                <span class="mg-role-order-name">${labels[role]}</span>
                <button class="btn btn-secondary mg-role-order-move" type="button" ${allMode||i===0?'disabled':''} onclick="moveNominationRole('${role}',-1)" aria-label="Sposta ${labels[role]} su">↑</button>
                <button class="btn btn-secondary mg-role-order-move" type="button" ${allMode||i===order.length-1?'disabled':''} onclick="moveNominationRole('${role}',1)" aria-label="Sposta ${labels[role]} giù">↓</button>
            </div>`).join('');
        }

        async function toggleNominationAllRoles(){
            if(isMantraRoom())return;
            if(isAuctionActive){alert('Non puoi cambiare la modalità ruoli mentre è in corso un’asta.');return;}
            nominationState.all_roles=!nominationState.all_roles;
            nominationState.role=nominationState.enabled?firstIncompleteRole():null;
            nominationState.turn_team_id=null;
            if(nominationState.enabled)nominationReady=true;
            await saveNominationState(nominationReady);
            renderRoomControl();
            if(nominationState.enabled)showNominationWaitingBoard();
        }

        async function moveNominationRole'''
s = regex_once(
    s,
    r"        function renderNominationRoleOrder\(\)\{.*?\n        \}\n\n        async function moveNominationRole",
    role_ui,
    'render nomination role order'
)

role_logic = '''        function classicTeamHasFreeNominationRole(team){
            if(!team)return false;
            const counts=teamCounts(team.id), limits=roomLimits();
            return ['P','D','C','A'].some(role=>(counts[role]||0)<(limits[role]||0));
        }
        function firstIncompleteRole(){
            if(isMantraRoom()){
                return teamsCache.some(t=>teamCounts(t.id).total<mantraRosterMax())?'ALL':null;
            }
            if(nominationState.all_roles){
                return teamsCache.some(classicTeamHasFreeNominationRole)?'ALL':null;
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
            if(r==='ALL')return teamsCache.filter(classicTeamHasFreeNominationRole);
            const l=roomLimits();
            return teamsCache.filter(t=>(teamCounts(t.id)[r]||0)<(l[r]||0));
        }
        function normalizeNominationState'''
s = regex_once(
    s,
    r"        function firstIncompleteRole\(\)\{.*?\n        \}\n        function eligibleNominationTeams\(r=nominationState\.role\)\{.*?\n        \}\n        function normalizeNominationState",
    role_logic,
    'classic all roles helpers'
)

s = replace_once(
    s,
    "            let r=nominationState.role, l=roomLimits();\n            if(isMantraRoom()){",
    "            let r=nominationState.role, l=roomLimits();\n            if(!isMantraRoom()&&nominationState.all_roles)r='ALL';\n            if(isMantraRoom()){",
    'normalize all role state'
)

s = replace_once(
    s,
    "            const r=document.getElementById('player-nominate-role');if(r)r.textContent=nominationState.role?(isMantraRoom()?'MANTRA · qualsiasi ruolo':`Ruolo ${nominationState.role} · ${nominationRoleName(nominationState.role)}`):'Rosa completata';",
    "            const r=document.getElementById('player-nominate-role');if(r)r.textContent=nominationState.role?(isMantraRoom()?'MANTRA · qualsiasi ruolo':nominationState.role==='ALL'?'TUTTI I RUOLI · qualsiasi ruolo':`Ruolo ${nominationState.role} · ${nominationRoleName(nominationState.role)}`):'Rosa completata';",
    'player nomination role label'
)

s = replace_once(
    s,
    "            const st=document.getElementById('nomination-control-status');if(st)st.innerHTML=!nominationState.enabled?'Modalità disattivata.':!nominationState.role?'Tutte le rose sono complete.':(isMantraRoom()?`Banditura libera MANTRA · turno <b style=\"color:var(--lime)\">${escapeHtml(currentNominationTeam()?.name||'--')}</b>`:`Ruolo <b>${nominationState.role}</b> · turno <b style=\"color:var(--lime)\">${escapeHtml(currentNominationTeam()?.name||'--')}</b>`);",
    "            const st=document.getElementById('nomination-control-status');if(st)st.innerHTML=!nominationState.enabled?'Modalità disattivata.':!nominationState.role?'Tutte le rose sono complete.':(isMantraRoom()?`Banditura libera MANTRA · turno <b style=\"color:var(--lime)\">${escapeHtml(currentNominationTeam()?.name||'--')}</b>`:nominationState.role==='ALL'?`Tutti i ruoli · turno <b style=\"color:var(--lime)\">${escapeHtml(currentNominationTeam()?.name||'--')}</b>`:`Ruolo <b>${nominationState.role}</b> · turno <b style=\"color:var(--lime)\">${escapeHtml(currentNominationTeam()?.name||'--')}</b>`);",
    'nomination status label'
)

s = replace_once(
    s,
    "                if(roleEl)roleEl.textContent=role\n                    ? (isMantraRoom()?'Può bandire qualsiasi giocatore disponibile':`Sceglie un ${nominationRoleName(role)} · Ruolo ${role}`)\n                    : 'Tutte le rose sono complete';",
    "                if(roleEl)roleEl.textContent=role\n                    ? ((isMantraRoom()||role==='ALL')?'Può bandire qualsiasi giocatore disponibile':`Sceglie un ${nominationRoleName(role)} · Ruolo ${role}`)\n                    : 'Tutte le rose sono complete';",
    'turn board all role text'
)

s = replace_once(
    s,
    "            document.getElementById('nomination-picker-title').textContent=isMantraRoom()?'Scegli un giocatore da bandire':`Scegli un ${nominationRoleName(nominationState.role)}`;\n            document.getElementById('nomination-picker-subtitle').textContent=isMantraRoom()?'MANTRA · banditura libera, qualsiasi ruolo':`Solo ruolo ${nominationState.role}`;",
    "            const allClassic=!isMantraRoom()&&nominationState.role==='ALL';\n            document.getElementById('nomination-picker-title').textContent=(isMantraRoom()||allClassic)?'Scegli un giocatore da bandire':`Scegli un ${nominationRoleName(nominationState.role)}`;\n            document.getElementById('nomination-picker-subtitle').textContent=isMantraRoom()?'MANTRA · banditura libera, qualsiasi ruolo':allClassic?'TUTTI I RUOLI · banditura libera':`Solo ruolo ${nominationState.role}`;",
    'nomination picker all roles copy'
)

old_candidates = '''            const eligible=playersList
                .filter(p=>isMantraRoom() || String(playerRole(p)).toUpperCase()===String(nominationState.role))
                .filter(p=>!auctionedPlayerIds.has(String(p.Id)));'''
new_candidates = '''            const turnTeam=currentNominationTeam();
            const turnCounts=turnTeam?teamCounts(turnTeam.id):null;
            const turnLimits=roomLimits();
            const allClassic=!isMantraRoom()&&nominationState.role==='ALL';
            const eligible=playersList
                .filter(p=>{
                    if(isMantraRoom())return true;
                    const role=String(playerRole(p)||'').toUpperCase();
                    if(allClassic)return !!turnCounts&&(turnCounts[role]||0)<(turnLimits[role]||0);
                    return role===String(nominationState.role).toUpperCase();
                })
                .filter(p=>!auctionedPlayerIds.has(String(p.Id)));'''
s = replace_once(s, old_candidates, new_candidates, 'nomination candidates all roles')

old_validation = '''            const invalidClassic=
                !isMantraRoom() &&
                p &&
                String(playerRole(p))!==String(nominationState.role);

            const invalidCapacity=
                isMantraRoom()
                    ?(!c || c.total>=mantraRosterMax())
                    :(!c || (c[nominationState.role]||0)>=(l[nominationState.role]||0));'''
new_validation = '''            const selectedClassicRole=p?String(playerRole(p)||'').toUpperCase():'';
            const allClassic=!isMantraRoom()&&nominationState.role==='ALL';
            const invalidClassic=
                !isMantraRoom() &&
                p &&
                !allClassic &&
                selectedClassicRole!==String(nominationState.role);

            const capacityRole=allClassic?selectedClassicRole:nominationState.role;
            const invalidCapacity=
                isMantraRoom()
                    ?(!c || c.total>=mantraRosterMax())
                    :(!c || !p || !['P','D','C','A'].includes(String(capacityRole||'')) || (c[capacityRole]||0)>=(l[capacityRole]||0));'''
s = replace_once(s, old_validation, new_validation, 'nomination host validation')
p.write_text(s)


# mantra-auction.js — TUTTI for automatic random in both Classic and Mantra.
p = Path('scripts/mantra-auction.js')
s = p.read_text()
s = replace_once(
    s,
    "                host.innerHTML=roles.map(role=>`<button id=\"auto-random-role-btn-${role}\" type=\"button\" class=\"unified-role role-${role}\" aria-pressed=\"false\" aria-label=\"${categoryLabel(role)}\" title=\"${categoryLabel(role)}\" onclick=\"toggleAutoRandomRoleButton('${role}')\">${isMantraRoom()?(SHORT_LABELS[role]||role):categoryLabel(role)}</button>`).join('');",
    "                host.innerHTML=`<button id=\"auto-random-role-btn-ALL\" type=\"button\" class=\"unified-role unified-role-all\" aria-pressed=\"false\" aria-label=\"Tutti i ruoli\" title=\"Tutti i ruoli\" onclick=\"toggleAutoRandomAllRoles()\">TUTTI</button>`+roles.map(role=>`<button id=\"auto-random-role-btn-${role}\" type=\"button\" class=\"unified-role role-${role}\" aria-pressed=\"false\" aria-label=\"${categoryLabel(role)}\" title=\"${categoryLabel(role)}\" onclick=\"toggleAutoRandomRoleButton('${role}')\">${isMantraRoom()?(SHORT_LABELS[role]||role):categoryLabel(role)}</button>`).join('');",
    'auto random all button markup'
)
s = replace_once(
    s,
    "        const status=document.getElementById('auto-random-status');",
    "        const allSelected=roles.length>0&&roles.every(role=>autoRandomRoles.has(role));\n        const allBtn=document.getElementById('auto-random-role-btn-ALL');\n        if(allBtn){allBtn.classList.toggle('selected',allSelected);allBtn.setAttribute('aria-pressed',allSelected?'true':'false');}\n        const status=document.getElementById('auto-random-status');",
    'auto random all state'
)
s = replace_once(
    s,
    "    toggleAutoRandomRoleButton=function(role){",
    "    toggleAutoRandomAllRoles=async function(){\n        const roles=activeGroups();\n        const allSelected=roles.length>0&&roles.every(role=>autoRandomRoles.has(role));\n        autoRandomRoles=new Set(allSelected?[]:roles);\n        if(autoRandomEnabled&&!autoRandomRoles.size){\n            autoRandomEnabled=false;\n            const master=document.getElementById('auto-random-enabled');if(master)master.checked=false;\n            cancelAutoRandomLaunch();\n        }\n        await saveRoomAuctionExtraSettings();\n        renderAutoRandomControlUI();\n        if(autoRandomEnabled&&!isAuctionActive&&!readyGateWaiting&&!auctionPrepInterval)scheduleAutoRandomAuction(180);\n    };\n\n    toggleAutoRandomRoleButton=function(role){",
    'auto random all handler'
)
p.write_text(s)


# management.css
p = Path('styles/management.css')
s = p.read_text()
marker = '/* === ALL ROLE OPTIONS v1 === */'
if marker not in s:
    s += '''

/* === ALL ROLE OPTIONS v1 === */
#screen-room-control .mg-role-choice{grid-template-columns:repeat(5,minmax(0,1fr));}
html body.liveasta-mantra #screen-room-control .mg-role-choice.mantra-auto-random-role-grid{grid-template-columns:repeat(6,minmax(0,1fr));}
#screen-room-control .mg-role-choice .unified-role-all{
  background:var(--mg-hover);color:var(--mg-text);border-color:var(--mg-border);opacity:.55;font-size:11px;padding:0 4px;
}
#screen-room-control .mg-role-choice .unified-role-all.selected,
#screen-room-control .mg-role-choice .unified-role-all[aria-pressed="true"]{
  background:var(--mg-primary);color:var(--mg-primary-ink);border-color:var(--mg-primary);opacity:1;
}
#screen-room-control .mg-role-all-mode{
  width:100%;min-height:48px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:2px;text-align:left;
}
#screen-room-control .mg-role-all-mode span{font-size:13px;font-weight:900;}
#screen-room-control .mg-role-all-mode small{font-size:10px;font-weight:600;color:var(--mg-muted);}
#screen-room-control .mg-role-all-mode.selected{
  background:var(--mg-primary);color:var(--mg-primary-ink);border-color:var(--mg-primary);
}
#screen-room-control .mg-role-all-mode.selected small{color:var(--mg-primary-ink);opacity:.82;}
#screen-room-control .mg-role-order-list.all-roles-active .mg-role-order-row{opacity:.55;}
@media(max-width:760px){
  #screen-room-control .mg-role-choice,
  html body.liveasta-mantra #screen-room-control .mg-role-choice.mantra-auto-random-role-grid{gap:4px;}
  #screen-room-control .mg-role-choice .unified-role{min-width:0;padding:0 3px;font-size:11px;}
  #screen-room-control .mg-role-choice .unified-role-all{font-size:9px;}
}
'''
p.write_text(s)


# Cache bust only; visible Home version remains v1.0.
p = Path('index.html')
s = p.read_text()
s = re.sub(r'./styles/management\.css\?v=\d+', './styles/management.css?v=102', s, count=1)
s = re.sub(r'./scripts/app\.js\?v=\d+', './scripts/app.js?v=102', s, count=1)
s = re.sub(r'./scripts/mantra-auction\.js\?v=\d+', './scripts/mantra-auction.js?v=110', s, count=1)
p.write_text(s)
