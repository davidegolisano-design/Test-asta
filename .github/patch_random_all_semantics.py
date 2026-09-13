from pathlib import Path
import re


def once(s, old, new, label):
    if old not in s:
        raise SystemExit(f'missing target: {label}')
    return s.replace(old, new, 1)

# Random automatico: ALL e' una modalita autonoma, non la somma delle categorie.
p=Path('scripts/mantra-auction.js')
s=p.read_text()

s=once(s,"""    function normalizeStoredGroups(values){
        const out=[];
        (Array.isArray(values)?values:[]).forEach(value=>{
            const direct=String(value||'').toUpperCase();
            const group=GROUPS.includes(direct)?direct:normalizeGroup(value);
            if(group&&!out.includes(group))out.push(group);
        });
        return out;
    }
""","""    function normalizeStoredGroups(values){
        const raw=(Array.isArray(values)?values:[]).map(value=>String(value||'').toUpperCase());
        if(raw.includes('ALL'))return ['ALL'];
        const out=[];
        raw.forEach(value=>{
            const group=GROUPS.includes(value)?value:normalizeGroup(value);
            if(group&&!out.includes(group))out.push(group);
        });
        return out;
    }
""",'normalizeStoredGroups')

s=once(s,"""    autoRandomSelectedRolesFromControl=function(){
        return activeGroups().filter(role=>document.getElementById('auto-random-role-btn-'+role)?.getAttribute('aria-pressed')==='true');
    };
""","""    autoRandomSelectedRolesFromControl=function(){
        if(document.getElementById('auto-random-role-btn-ALL')?.getAttribute('aria-pressed')==='true')return ['ALL'];
        return activeGroups().filter(role=>document.getElementById('auto-random-role-btn-'+role)?.getAttribute('aria-pressed')==='true');
    };
""",'selected controls')

s=once(s,"""        if(isMantraRoom()){
            const normalized=normalizeStoredGroups([...autoRandomRoles]);
            autoRandomRoles=new Set(normalized.length?normalized:GROUPS);
        }
""","""        const allMode=autoRandomRoles.has('ALL');
        if(isMantraRoom()&&!allMode){
            const normalized=normalizeStoredGroups([...autoRandomRoles]);
            autoRandomRoles=new Set(normalized.length?normalized:GROUPS);
        }
""",'render normalize')

s=once(s,"""        roles.forEach(role=>{
            const selected=autoRandomRoles.has(role);
            const btn=document.getElementById('auto-random-role-btn-'+role);
            if(btn){btn.classList.toggle('selected',selected);btn.setAttribute('aria-pressed',selected?'true':'false');}
        });
        const allSelected=roles.length>0&&roles.every(role=>autoRandomRoles.has(role));
        const allBtn=document.getElementById('auto-random-role-btn-ALL');
        if(allBtn){allBtn.classList.toggle('selected',allSelected);allBtn.setAttribute('aria-pressed',allSelected?'true':'false');}
        const status=document.getElementById('auto-random-status');
        if(status){
            const text=roles.filter(r=>autoRandomRoles.has(r)).map(categoryLabel).join(' · ')||'nessuna categoria';
            status.innerHTML=autoRandomEnabled
                ?`ATTIVO · <b>${escapeHtml(text)}</b> · la prossima asta parte automaticamente.`
                :`DISATTIVO · categorie predisposte <b>${escapeHtml(text)}</b>.`;
""","""        roles.forEach(role=>{
            const selected=!allMode&&autoRandomRoles.has(role);
            const btn=document.getElementById('auto-random-role-btn-'+role);
            if(btn){btn.classList.toggle('selected',selected);btn.setAttribute('aria-pressed',selected?'true':'false');}
        });
        const allBtn=document.getElementById('auto-random-role-btn-ALL');
        if(allBtn){allBtn.classList.toggle('selected',allMode);allBtn.setAttribute('aria-pressed',allMode?'true':'false');}
        const status=document.getElementById('auto-random-status');
        if(status){
            const text=allMode?'TUTTI I DISPONIBILI':(roles.filter(r=>autoRandomRoles.has(r)).map(categoryLabel).join(' · ')||'nessuna categoria');
            status.innerHTML=autoRandomEnabled
                ?`ATTIVO · <b>${escapeHtml(text)}</b> · la prossima asta parte automaticamente.`
                :`DISATTIVO · selezione predisposta <b>${escapeHtml(text)}</b>.`;
""",'render all state')

s=once(s,"""    toggleAutoRandomAllRoles=async function(){
        const roles=activeGroups();
        const allSelected=roles.length>0&&roles.every(role=>autoRandomRoles.has(role));
        autoRandomRoles=new Set(allSelected?[]:roles);
""","""    toggleAutoRandomAllRoles=async function(){
        const allMode=autoRandomRoles.has('ALL');
        autoRandomRoles=new Set(allMode?[]:['ALL']);
""",'toggle all')

s=once(s,"""    toggleAutoRandomRoleButton=function(role){
        const r=String(role||'').toUpperCase();
        if(!activeGroups().includes(r))return;
        setAutoRandomRole(r,!autoRandomRoles.has(r));
    };
""","""    toggleAutoRandomRoleButton=function(role){
        const r=String(role||'').toUpperCase();
        if(!activeGroups().includes(r))return;
        const selected=!autoRandomRoles.has('ALL')&&autoRandomRoles.has(r);
        setAutoRandomRole(r,!selected);
    };
""",'toggle single')

s=once(s,"""        if(checked)autoRandomRoles.add(r);else autoRandomRoles.delete(r);
""","""        if(checked){
            autoRandomRoles.delete('ALL');
            autoRandomRoles.add(r);
        }else{
            autoRandomRoles.delete('ALL');
            autoRandomRoles.delete(r);
        }
""",'set single')

s=once(s,"""    autoRandomCandidates=function(){
        const allowed=new Set([...autoRandomRoles].map(r=>String(r).toUpperCase()).filter(r=>activeGroups().includes(r)));
        if(!allowed.size)return [];
        return getAvailablePlayers().filter(player=>groupsForRole(playerRole(player)).some(group=>allowed.has(group)&&autoRandomHasBidderForRole(group)));
    };
""","""    autoRandomCandidates=function(){
        const allMode=autoRandomRoles.has('ALL');
        if(allMode){
            return getAvailablePlayers().filter(player=>{
                if(isMantraRoom())return groupsForRole(playerRole(player)).some(group=>autoRandomHasBidderForRole(group));
                const role=String(playerRole(player)||'').toUpperCase();
                return autoRandomHasBidderForRole(role);
            });
        }
        const allowed=new Set([...autoRandomRoles].map(r=>String(r).toUpperCase()).filter(r=>activeGroups().includes(r)));
        if(!allowed.size)return [];
        return getAvailablePlayers().filter(player=>groupsForRole(playerRole(player)).some(group=>allowed.has(group)&&autoRandomHasBidderForRole(group)));
    };
""",'candidate pool')

p.write_text(s)

# Banditura Classic: la modalita ALL viene presentata come turno libero.
p=Path('scripts/app.js')
s=p.read_text()
s=s.replace("allMode?'TUTTI I RUOLI':order.join(' → ')","allMode?'TURNO LIBERO':order.join(' → ')")
s=s.replace('<span>TUTTI I RUOLI</span><small>Ogni squadra può bandire un giocatore di qualsiasi reparto ancora libero.</small>','<span>TURNO LIBERO</span><small>Al proprio turno ogni squadra può nominare qualsiasi giocatore ancora disponibile compatibile con gli slot liberi.</small>')
s=s.replace("nominationState.role==='ALL'?'TUTTI I RUOLI · qualsiasi ruolo'","nominationState.role==='ALL'?'TURNO LIBERO · qualsiasi ruolo'")
s=s.replace("allClassic?'TUTTI I RUOLI · banditura libera'","allClassic?'TURNO LIBERO · qualsiasi giocatore disponibile'")
p.write_text(s)

# Cache busting, home version remains v1.0.
p=Path('index.html')
s=p.read_text()
s=re.sub(r'./scripts/app\.js\?v=\d+', './scripts/app.js?v=111', s)
s=re.sub(r'./scripts/mantra-auction\.js\?v=\d+', './scripts/mantra-auction.js?v=111', s)
p.write_text(s)
