// LIVEASTA Classic / Mantra role domain helpers — v1.02
const MANTRA_ROLE_ORDER=['Por','Dc','B','Dd','Ds','E','M','C','W','T','A','Pc'];
const MANTRA_ROLE_FAMILY={
    Por:'P',
    Dc:'D',B:'D',Dd:'D',Ds:'D',E:'D',
    M:'C',C:'C',
    W:'T',T:'T',
    A:'A',Pc:'A'
};
const LIVEASTA_ROLE_BADGE_SELECTOR='.role-badge,#auction-player-role,#phone-player-role,#auctioneer-ready-player-role';

function roomGameMode(room=currentRoom){
    return String(room?.game_mode||'classic').toLowerCase()==='mantra'?'mantra':'classic';
}

function isMantraRoom(room=currentRoom){
    return roomGameMode(room)==='mantra';
}

function normalizeMantraRole(value){
    const raw=String(value??'').trim();
    if(!raw)return '';
    const parts=raw
        .replace(/\s+/g,'')
        .split(/[;,/|+-]+/)
        .filter(Boolean)
        .map(x=>{
            const low=x.toLowerCase();
            const map={por:'Por',p:'Por',dc:'Dc',b:'B',dd:'Dd',ds:'Ds',e:'E',m:'M',c:'C',w:'W',t:'T',a:'A',pc:'Pc'};
            return map[low]||x;
        });
    return [...new Set(parts)].join(';');
}

function mantraRoleTokens(value){
    return normalizeMantraRole(value).split(';').filter(Boolean);
}

function mantraRoleFromPlayer(player){
    if(!player)return '';
    return normalizeMantraRole(
        player.RM ??
        player.Rm ??
        player.rm ??
        player['R M'] ??
        player['Ruolo Mantra'] ??
        player['Ruolo mantra'] ??
        player.RuoloMantra ??
        player.Mantra ??
        ''
    );
}

function playerRole(player,room=currentRoom){
    if(!player)return '';
    if(roomGameMode(room)==='mantra')return mantraRoleFromPlayer(player);
    return String(player.R??player.Ruolo??'').trim().toUpperCase();
}

function playerIsGoalkeeper(playerOrRole,room=currentRoom){
    const role=typeof playerOrRole==='object'?playerRole(playerOrRole,room):String(playerOrRole||'');
    if(roomGameMode(room)==='mantra')return mantraRoleTokens(role).includes('Por');
    return role.toUpperCase()==='P';
}

function mantraRosterMax(room=currentRoom){
    return Math.max(23,Math.min(90,parseInt(room?.mantra_max_roster??30)||30));
}

function mantraRosterMin(room=currentRoom){
    return Math.max(23,Math.min(90,parseInt(room?.mantra_min_roster??23)||23));
}

function mantraMinGoalkeepers(room=currentRoom){
    return Math.max(2,Math.min(15,parseInt(room?.mantra_min_goalkeepers??2)||2));
}

function listoneHasMantraRoles(list=playersList){
    return Array.isArray(list) && list.some(p=>!!mantraRoleFromPlayer(p));
}

function activeRoleLabel(role){
    return isMantraRoom()?normalizeMantraRole(role):String(role||'').toUpperCase();
}

function mantraRoleMatches(player,role){
    if(!role || role==='ALL')return true;
    const wanted=normalizeMantraRole(role);
    return mantraRoleTokens(playerRole(player)).includes(wanted);
}

function mantraRoleFamily(role){
    const token=mantraRoleTokens(role)[0]||normalizeMantraRole(role);
    return MANTRA_ROLE_FAMILY[token]||'C';
}

function auctionRoleOptions(room=currentRoom){
    return roomGameMode(room)==='mantra'?[...MANTRA_ROLE_ORDER]:['P','D','C','A'];
}

function normalizeAuctionRole(role,room=currentRoom){
    if(roomGameMode(room)!=='mantra'){
        const classic=String(role||'').trim().toUpperCase();
        return ['P','D','C','A'].includes(classic)?classic:'';
    }
    const raw=String(role||'').trim();
    if(!raw)return '';
    return MANTRA_ROLE_ORDER.find(r=>r.toLowerCase()===raw.toLowerCase())||'';
}

function roleUiFamily(role,room=currentRoom){
    return roomGameMode(room)==='mantra'?mantraRoleFamily(role):String(role||'').trim().toUpperCase();
}

function syncRoleModeClass(){
    if(document.body)document.body.classList.toggle('liveasta-mantra',isMantraRoom());
}

function roleBadgeSourceFromElement(el){
    if(!el)return '';
    if(el.dataset?.mantraRoleSource && el.querySelector?.('.mantra-role-token'))return el.dataset.mantraRoleSource;
    return String(el.textContent||'').trim();
}

function clearMantraRoleBadgeState(el){
    if(!el)return;
    el.classList.remove('role-badge-mantra','role-badge-multi');
    delete el.dataset.mantraRoleSource;
}

function renderRoleBadgesInto(el,value,room=currentRoom){
    if(!el)return;
    syncRoleModeClass();
    const raw=String(value??'').trim();

    if(roomGameMode(room)!=='mantra'){
        if(el.classList.contains('role-badge-mantra')){
            clearMantraRoleBadgeState(el);
            el.textContent=raw||'-';
        }
        return;
    }

    const normalized=normalizeMantraRole(raw);
    const tokens=mantraRoleTokens(normalized);
    if(!tokens.length){
        clearMantraRoleBadgeState(el);
        if(el.textContent!==(raw||'-'))el.textContent=raw||'-';
        return;
    }

    if(el.dataset.mantraRoleSource===normalized && el.querySelectorAll('.mantra-role-token').length===tokens.length)return;

    el.textContent='';
    el.dataset.mantraRoleSource=normalized;
    el.classList.add('role-badge-mantra');
    el.classList.toggle('role-badge-multi',tokens.length>1);

    tokens.forEach(token=>{
        const badge=document.createElement('span');
        badge.className=`mantra-role-token mantra-role-family-${mantraRoleFamily(token)}`;
        badge.textContent=token;
        badge.setAttribute('aria-label',`Ruolo ${token}`);
        el.appendChild(badge);
    });
    el.setAttribute('aria-label',`Ruolo ${tokens.join(', ')}`);
}

function enhanceMantraRoleBadges(root=document){
    syncRoleModeClass();
    if(!isMantraRoom() || !root)return;
    const apply=el=>renderRoleBadgesInto(el,roleBadgeSourceFromElement(el));
    if(root.nodeType===1 && root.matches?.(LIVEASTA_ROLE_BADGE_SELECTOR))apply(root);
    root.querySelectorAll?.(LIVEASTA_ROLE_BADGE_SELECTOR).forEach(apply);
}

function installMantraRoleBadgeObserver(){
    if(window.__liveastaMantraRoleBadgeObserver || !document.body)return;
    enhanceMantraRoleBadges(document);

    const observer=new MutationObserver(mutations=>{
        syncRoleModeClass();
        if(!isMantraRoom())return;
        mutations.forEach(mutation=>{
            if(mutation.type==='characterData'){
                const host=mutation.target.parentElement?.closest?.(LIVEASTA_ROLE_BADGE_SELECTOR);
                if(host)renderRoleBadgesInto(host,roleBadgeSourceFromElement(host));
                return;
            }
            const target=mutation.target?.nodeType===1?mutation.target:null;
            if(target?.matches?.(LIVEASTA_ROLE_BADGE_SELECTOR))renderRoleBadgesInto(target,roleBadgeSourceFromElement(target));
            mutation.addedNodes.forEach(node=>{if(node.nodeType===1)enhanceMantraRoleBadges(node);});
        });
    });
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    window.__liveastaMantraRoleBadgeObserver=observer;
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installMantraRoleBadgeObserver,{once:true});
else installMantraRoleBadgeObserver();
