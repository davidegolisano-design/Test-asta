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

function renderListFilters(view){
    const root=document.getElementById('list-filters-'+view);if(!root)return;
    const config=listFilterViews[view],state=listFilterState(view);
    const configuredSearch=config.search ? document.getElementById(config.search) : null;
    const generatedSearch=root.querySelector('.unified-search');

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
        root.prepend(search);
    }

    let controls=root.querySelector('.unified-filter-controls');
    if(!controls){controls=document.createElement('div');controls.className='unified-filter-controls';root.append(controls);}
    const locked=view==='nomination'&&!isMantraRoom()&&String(nominationState.role)!=='ALL'?String(nominationState.role):'';
    const allRoles=listFilterRoles();
    const allSelected=!locked&&allRoles.length>0&&allRoles.every(role=>state.roles.includes(role));
    const signature=JSON.stringify([state,allRoles,locked,allSelected]);
    if(controls.dataset.signature===signature)return;
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
}

function filterAndSortPlayers(list,view){
    renderListFilters(view);
    const state=listFilterState(view);
    const search=document.querySelector('#list-filters-'+view+' .unified-search');
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
        const nominationLocked=view==='nomination'&&!isMantraRoom()&&String(nominationState.role)!=='ALL';
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
