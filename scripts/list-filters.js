// LIVEASTA shared list filters and sorting — v1.03
const listFilterViews={
    player:{search:'player-listone-search',fields:['role','name','team','value','price','priority'],refresh:()=>renderPlayerListone({preserveScroll:false})},
    board:{search:'player-search',fields:['role','name','team','value'],refresh:()=>refreshPlayerLists()},
    nomination:{search:'nomination-search',fields:['role','name','team','value','priority'],refresh:()=>renderNominationCandidates()},
    mine:{fields:['role','name','team','value','price','priority'],refresh:()=>updatePlayerTeamStatus()},
    rosters:{fields:['role','name','team','value','price'],refresh:()=>renderAllRosters()},
    team:{fields:['role','name','team','value','price'],refresh:()=>openPlayerRoomTeamRoster(listFilterTeamId)},
    purchases:{search:'control-purchases-search',fields:['role','name','team','value','price'],refresh:()=>renderControlPurchases()},
    sealed:{search:'sealed-player-search',fields:['role','name','team','value'],refresh:()=>renderSealedPlayerOptions()},
    manual:{search:'manual-player-search',fields:['role','name','team','value'],refresh:()=>renderManualPlayerOptions()}
};

const listFilterLabels={role:'Ruolo',name:'Nome',team:'Squadra',value:'Valutazione',price:'Prezzo acquisto',priority:'Preferenza'};
const listFilterCache=new Map();
const listFilterCollator=new Intl.Collator('it',{sensitivity:'base',numeric:true});
let listFilterTeamId=null;

function listFilterRoles(){
    if(typeof syncRoleModeClass==='function')syncRoleModeClass();
    return typeof auctionRoleOptions==='function'?auctionRoleOptions():(isMantraRoom()?[...MANTRA_ROLE_ORDER]:['P','D','C','A']);
}

function listFilterStorageKey(){return myTeamId?playerUiPrefsKey():banditoreUiPrefsKey();}

function listFilterState(view){
    const key=listFilterStorageKey();
    const cacheKey=JSON.stringify([key,view,isMantraRoom()]);
    if(!listFilterCache.has(cacheKey)){
        const prefs=key?(safeReadLocalJson(key)||{}):{};
        const old=prefs.unified_filters?.[view];
        let sort='role',direction='asc',roles=listFilterRoles();
        if(view==='player'){
            sort=prefs.list_sort||'role';direction=sort==='value'?'desc':'asc';
            if(!isMantraRoom()&&Array.isArray(prefs.list_roles))roles=prefs.list_roles;
        }else if(view==='nomination'){
            const parts=String(prefs.nomination_sort||'name-asc').split('-');sort=parts[0];direction=parts[1];
        }else if(view==='board'){
            sort=({R:'role',Nome:'name',Squadra:'team',Val:'value'})[prefs.list_sort_col]||'role';direction=prefs.list_sort_asc===false?'desc':'asc';
        }else if(['mine','rosters','team'].includes(view)){
            sort=prefs.roster_sort||'role';direction=sort==='price'?'desc':'asc';
        }
        if(old){sort=old.sort;direction=old.direction;if(old.mode===(isMantraRoom()?'mantra':'classic')&&Array.isArray(old.roles))roles=old.roles;}
        listFilterCache.set(cacheKey,{
            sort:listFilterViews[view].fields.includes(sort)?sort:'role',direction:direction==='desc'?'desc':'asc',
            roles:roles.filter(r=>listFilterRoles().includes(r))
        });
    }
    return listFilterCache.get(cacheKey);
}

function changeListFilter(view,field,value){
    const state=listFilterState(view);
    if(field==='role')state.roles=state.roles.includes(value)?state.roles.filter(r=>r!==value):[...state.roles,value];
    if(field==='all'){
        const all=listFilterRoles();
        const allSelected=all.length>0&&all.every(role=>state.roles.includes(role));
        state.roles=allSelected?[]:[...all];
    }
    if(field==='sort'&&listFilterViews[view].fields.includes(value))state.sort=value;
    if(field==='direction')state.direction=state.direction==='asc'?'desc':'asc';
    const key=listFilterStorageKey();
    if(key){
        const prefs=safeReadLocalJson(key)||{};
        prefs.unified_filters={...(prefs.unified_filters||{}),[view]:{...state,mode:isMantraRoom()?'mantra':'classic'}};
        safeWriteLocalJson(key,prefs);
    }
    listFilterViews[view].refresh();
}

// One disclosure component for every list. Search is always visible and retains its node/value.
function closeAllListFilters(except){
    document.querySelectorAll('.unified-list-filters[data-filters-open="true"]').forEach(root=>{
        if(root===except)return;
        root.dataset.filtersOpen='false';
        root.querySelector('.unified-filter-toggle')?.setAttribute('aria-expanded','false');
        const controls=root.querySelector('.unified-filter-controls');
        if(controls)controls.hidden=true;
    });
}
window.closeAllListFilters=closeAllListFilters;

function syncListFilterIndicator(view){
    const root=document.getElementById('list-filters-'+view),state=listFilterState(view);
    const button=root?.querySelector('.unified-filter-toggle');
    if(!button)return;
    const all=root.querySelector('.unified-role-all');
    const narrowed=all?.getAttribute('aria-pressed')==='false';
    const changed=narrowed||state.sort!=='role'||state.direction!=='asc';
    button.classList.toggle('has-filters',changed);
    button.setAttribute('aria-label',changed?'Filtri e ordinamento · filtri attivi':'Filtri e ordinamento');
    button.title=changed?'Filtri attivi · apri per modificarli':'Filtri e ordinamento';
}
window.syncListFilterIndicator=syncListFilterIndicator;

function ensureListFilterShell(view,root,search){
    let bar=root.querySelector('.unified-searchbar');
    if(!bar){
        bar=document.createElement('div');bar.className='unified-searchbar';root.prepend(bar);
        const button=document.createElement('button');
        button.type='button';button.className='unified-filter-toggle';
        button.setAttribute('aria-label','Filtri e ordinamento');
        button.setAttribute('aria-expanded','false');
        button.setAttribute('aria-controls','list-filter-panel-'+view);
        button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg><span class="filter-active-dot" aria-hidden="true"></span>';
        button.addEventListener('click',()=>{
            const open=root.dataset.filtersOpen!=='true';
            closeAllListFilters(root);
            root.dataset.filtersOpen=String(open);button.setAttribute('aria-expanded',String(open));
            root.querySelector('.unified-filter-controls').hidden=!open;
        });
        bar.append(button);
        root.dataset.filtersOpen='false';
        root.addEventListener('keydown',event=>{
            if(event.key==='Escape'&&root.dataset.filtersOpen==='true'){
                event.preventDefault();event.stopPropagation();closeAllListFilters();button.focus({preventScroll:true});
            }
        });
    }
    if(search&&search.parentElement!==bar)bar.prepend(search);
    if(view==='board'){
        const toolbar=document.querySelector('.auction-list-toolbar');
        if(toolbar&&root.parentElement!==toolbar)toolbar.prepend(root);
    }
    return bar;
}

document.addEventListener('pointerdown',event=>{
    const root=event.target.closest?.('.unified-list-filters');
    closeAllListFilters(root);
});

function renderListFilters(view){
    const root=document.getElementById('list-filters-'+view);if(!root)return;
    const config=listFilterViews[view],state=listFilterState(view);
    const configuredSearch=config.search ? document.getElementById(config.search) : null;
    let generatedSearch=root.querySelector('.unified-search');

    if(configuredSearch){
        configuredSearch.classList.add('unified-search');
        configuredSearch.type='search';
        configuredSearch.autocomplete='off';
        configuredSearch.placeholder=view==='board'?'Cerca…':'Cerca giocatore o squadra…';
        configuredSearch.setAttribute('aria-label','Cerca giocatore o squadra');
    }else if(!generatedSearch){
        const search=document.createElement('input');
        search.classList.add('unified-search');
        search.type='search';
        search.autocomplete='off';
        search.placeholder='Cerca giocatore o squadra…';
        search.setAttribute('aria-label','Cerca giocatore o squadra');
        search.addEventListener('input',()=>config.refresh());
        search.id='list-search-'+view;
        root.prepend(search);
        generatedSearch=search;
    }

    ensureListFilterShell(view,root,configuredSearch||generatedSearch);
    let controls=root.querySelector('.unified-filter-controls');
    if(!controls){controls=document.createElement('div');controls.className='unified-filter-controls';controls.id='list-filter-panel-'+view;controls.hidden=root.dataset.filtersOpen!=='true';controls.setAttribute('role','region');controls.setAttribute('aria-label','Filtri e ordinamento');root.append(controls);}
    const locked=view==='nomination'&&!isMantraRoom()&&!nominationState.ignore_sequence?String(nominationState.role):'';
    const allRoles=listFilterRoles();
    const allSelected=!locked&&allRoles.length>0&&allRoles.every(role=>state.roles.includes(role));
    const signature=JSON.stringify([state,allRoles,locked,allSelected]);
    if(controls.dataset.signature===signature){syncListFilterIndicator(view);return;}
    controls.dataset.signature=signature;
    controls.innerHTML=`<div class="unified-role-row${isMantraRoom()?' mantra-role-filter-row':''}" aria-label="Filtra per ruolo">
        <button type="button" class="unified-role-all${allSelected?' selected':''}" aria-pressed="${allSelected}" onclick="changeListFilter('${view}','all')" ${locked?'disabled':''}>Tutti</button>
        ${allRoles.map(role=>{
            const selected=locked?role===locked:state.roles.includes(role);
            const family=typeof roleUiFamily==='function'?roleUiFamily(role):role;
            return `<button type="button" class="unified-role role-${family}${selected?' selected':''}" aria-pressed="${selected}" ${locked?'disabled':''} onclick="changeListFilter('${view}','role','${role}')">${role}</button>`;
        }).join('')}
    </div><div class="unified-sort-row"><label for="list-sort-${view}">Ordina per</label>
        <select id="list-sort-${view}" onchange="changeListFilter('${view}','sort',this.value)">
            ${config.fields.map(field=>`<option value="${field}" ${state.sort===field?'selected':''}>${listFilterLabels[field]}</option>`).join('')}
        </select><button type="button" class="unified-direction" onclick="changeListFilter('${view}','direction')" aria-label="Ordine ${state.direction==='asc'?'crescente':'decrescente'}. Inverti ordine" title="${state.direction==='asc'?'Crescente':'Decrescente'}">${state.direction==='asc'?'↑':'↓'}</button></div>`;
    syncListFilterIndicator(view);
}

function filterAndSortPlayers(list,view){
    renderListFilters(view);
    const state=listFilterState(view);
    const search=listFilterViews?.[view]?.search ? document.getElementById(listFilterViews[view].search) : document.querySelector('#list-filters-'+view+' .unified-search');
    const query=String(search?.value||'').trim().toLocaleLowerCase('it');
    const byId=new Map(playersList.map(p=>[String(p.Id),p]));
    const purchases=new Map(purchasesCache.map(p=>[String(p.player_id),p]));
    const roles=listFilterRoles();
    const rows=list.map(row=>{
        const purchased=row.player_id!==undefined;
        const id=String(purchased?row.player_id:row.Id);
        const player=purchased?(byId.get(id)||{Nome:row.player_name,Squadra:row.club,R:row.role}):row;
        const role=purchased?(row.role||playerRole(player)):playerRole(player);
        const tokens=isMantraRoom()?mantraRoleTokens(role):[String(role||'').toUpperCase()];
        const purchase=purchased?row:purchases.get(id);
        const priority=shortlistPriority(id)||null;
        return {row,id,tokens,name:player.Nome||row.player_name||'',team:player.Squadra||row.club||'',
            role:Math.min(...tokens.map(r=>{const index=roles.indexOf(r);return index<0?99:index;}),99),
            value:playerListoneNumericValue(player),price:purchase?Number(purchase.price)||0:null,priority};
    }).filter(item=>{
        const nominationLocked=view==='nomination'&&!isMantraRoom()&&!nominationState.ignore_sequence;
        const matchesRole=nominationLocked?item.tokens.includes(String(nominationState.role)):item.tokens.some(r=>state.roles.includes(r));
        return matchesRole&&(!query||`${item.name} ${item.team} ${item.tokens.join(' ')}`.toLocaleLowerCase('it').includes(query)||view==='purchases');
    });
    const direction=state.direction==='asc'?1:-1;
    rows.sort((a,b)=>{
        const av=a[state.sort],bv=b[state.sort];
        if(av==null&&bv!=null)return 1;if(bv==null&&av!=null)return -1;
        const primary=av==null?0:typeof av==='string'?listFilterCollator.compare(av,bv):av-bv;
        return direction*primary||listFilterCollator.compare(a.name,b.name)||listFilterCollator.compare(a.id,b.id);
    });
    return rows.map(item=>item.row);
}
