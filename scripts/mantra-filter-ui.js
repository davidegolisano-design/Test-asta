// LIVEASTA Mantra category filter UX — v1.03
// Tap = toggle the whole category. Long press = edit the real Mantra roles inside it.
(function(){
    const GROUP_ORDER=['P','D','C','T','A'];
    const GROUPS={
        P:{short:'POR',label:'Portieri',tokens:['Por']},
        D:{short:'DIF',label:'Difensori',tokens:['Dd','Dc','Ds','B','E']},
        C:{short:'CEN',label:'Centrocampisti',tokens:['M','C']},
        T:{short:'TRQ',label:'Trequartisti',tokens:['W','T']},
        A:{short:'ATT',label:'Attaccanti',tokens:['A','Pc']}
    };
    const ALL_TOKENS=GROUP_ORDER.flatMap(group=>GROUPS[group].tokens);
    const tokenCache=new Map();
    const HOLD_MS=450;

    function cacheKey(view){
        let storage='';
        try{storage=listFilterStorageKey?.()||'';}catch(_e){}
        return `${storage}|${view}`;
    }

    function initialTokens(view){
        try{
            const key=listFilterStorageKey?.();
            const prefs=key?(safeReadLocalJson(key)||{}):{};
            const stored=prefs?.mantra_subfilters?.[view];
            if(Array.isArray(stored)){
                return [...new Set(stored.map(normalizeMantraRole).filter(token=>ALL_TOKENS.includes(token)))];
            }
        }catch(_e){}

        try{
            const groups=listFilterState(view)?.roles||GROUP_ORDER;
            const selected=GROUP_ORDER
                .filter(group=>groups.includes(group))
                .flatMap(group=>GROUPS[group].tokens);
            return [...new Set(selected.length?selected:ALL_TOKENS)];
        }catch(_e){
            return [...ALL_TOKENS];
        }
    }

    function selectedTokens(view){
        const key=cacheKey(view);
        if(!tokenCache.has(key))tokenCache.set(key,new Set(initialTokens(view)));
        return tokenCache.get(key);
    }

    function persistTokens(view){
        try{
            const key=listFilterStorageKey?.();
            if(!key)return;
            const prefs=safeReadLocalJson(key)||{};
            prefs.mantra_subfilters={...(prefs.mantra_subfilters||{}),[view]:[...selectedTokens(view)]};
            safeWriteLocalJson(key,prefs);
        }catch(_e){}
    }

    function refreshView(view){
        persistTokens(view);
        const refresh=listFilterViews?.[view]?.refresh;
        if(typeof refresh==='function')refresh();
    }

    function groupState(view,group){
        const selected=selectedTokens(view);
        const tokens=GROUPS[group].tokens;
        const active=tokens.filter(token=>selected.has(token));
        return {active,all:active.length===tokens.length,none:active.length===0};
    }

    function toggleWholeGroup(view,group){
        const selected=selectedTokens(view);
        const state=groupState(view,group);
        GROUPS[group].tokens.forEach(token=>state.all?selected.delete(token):selected.add(token));
        refreshView(view);
    }

    function toggleToken(view,group,token){
        const selected=selectedTokens(view);
        selected.has(token)?selected.delete(token):selected.add(token);
        persistTokens(view);
        updateFilterControls(view);
        const refresh=listFilterViews?.[view]?.refresh;
        if(typeof refresh==='function')refresh();
    }

    function closeSubfilterPanel(root){
        root?.querySelector('.mantra-subfilter-panel')?.remove();
    }

    function openSubfilterPanel(view,group,root){
        if(!root||!GROUPS[group])return;
        let panel=root.querySelector('.mantra-subfilter-panel');
        if(!panel){
            panel=document.createElement('div');
            panel.className='mantra-subfilter-panel';
            root.querySelector('.unified-role-row')?.insertAdjacentElement('afterend',panel);
        }
        panel.dataset.group=group;
        const state=groupState(view,group);
        panel.innerHTML=`
            <div class="mantra-subfilter-head">
                <div><b>${GROUPS[group].label}</b><small>Seleziona i ruoli specifici</small></div>
                <button type="button" class="mantra-subfilter-close" aria-label="Chiudi sottofiltri">×</button>
            </div>
            <div class="mantra-subfilter-grid">
                ${GROUPS[group].tokens.map(token=>`<button type="button" class="mantra-subfilter-token role-${group}${state.active.includes(token)?' selected':''}" aria-pressed="${state.active.includes(token)}" data-token="${token}">${token}</button>`).join('')}
            </div>`;
        panel.querySelector('.mantra-subfilter-close')?.addEventListener('click',()=>panel.remove());
        panel.querySelectorAll('.mantra-subfilter-token').forEach(btn=>{
            btn.addEventListener('click',event=>{
                event.preventDefault();
                toggleToken(view,group,btn.dataset.token);
            });
        });
        try{navigator.vibrate?.(18);}catch(_e){}
    }

    function buttonCaption(view,group){
        const state=groupState(view,group);
        let detail='Off';
        if(state.all)detail='Tutti';
        else if(state.active.length)detail=state.active.join(' · ');
        return `<span>${GROUPS[group].short}</span><small>${detail}</small>`;
    }

    function bindCategoryButton(btn,view,group,root){
        if(btn.dataset.mantraLongpressBound==='1')return;
        btn.dataset.mantraLongpressBound='1';
        btn.removeAttribute('onclick');
        let timer=null;
        let held=false;
        let startX=0;
        let startY=0;

        const clear=()=>{if(timer){clearTimeout(timer);timer=null;}};
        btn.addEventListener('pointerdown',event=>{
            if(event.pointerType==='mouse'&&event.button!==0)return;
            held=false;
            startX=event.clientX;startY=event.clientY;
            clear();
            timer=setTimeout(()=>{
                timer=null;
                held=true;
                openSubfilterPanel(view,group,root);
            },HOLD_MS);
        });
        btn.addEventListener('pointermove',event=>{
            if(Math.hypot(event.clientX-startX,event.clientY-startY)>10)clear();
        });
        btn.addEventListener('pointerup',event=>{
            if(event.pointerType==='mouse'&&event.button!==0)return;
            const wasHeld=held;
            if(timer){clear();event.preventDefault();toggleWholeGroup(view,group);}
            else if(wasHeld){event.preventDefault();}
            held=false;
        });
        btn.addEventListener('pointercancel',()=>{clear();held=false;});
        btn.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse')clear();});
        btn.addEventListener('contextmenu',event=>{
            event.preventDefault();
            clear();
            openSubfilterPanel(view,group,root);
        });
        btn.addEventListener('click',event=>event.preventDefault());
        btn.addEventListener('keydown',event=>{
            if(event.key==='Enter'||event.key===' '){
                event.preventDefault();
                toggleWholeGroup(view,group);
            }else if(event.key==='ArrowDown'){
                event.preventDefault();
                openSubfilterPanel(view,group,root);
            }
        });
    }

    function bindAllButton(btn,view,root){
        if(!btn||btn.dataset.mantraLongpressBound==='1')return;
        btn.dataset.mantraLongpressBound='1';
        btn.removeAttribute('onclick');
        btn.addEventListener('click',event=>{
            event.preventDefault();
            tokenCache.set(cacheKey(view),new Set(ALL_TOKENS));
            closeSubfilterPanel(root);
            refreshView(view);
        });
    }

    function updateFilterControls(view){
        if(!isMantraRoom())return;
        const root=document.getElementById('list-filters-'+view);
        const row=root?.querySelector('.unified-role-row');
        if(!root||!row)return;
        row.classList.add('mantra-role-filter-row','mantra-category-row');

        const all=row.querySelector('.unified-role-all');
        bindAllButton(all,view,root);
        if(all){
            all.textContent='TUTTI';
            all.classList.toggle('selected',selectedTokens(view).size===ALL_TOKENS.length);
            all.setAttribute('aria-pressed',String(selectedTokens(view).size===ALL_TOKENS.length));
        }

        const buttons=[...row.querySelectorAll('.unified-role')];
        buttons.forEach(btn=>{
            let group='';
            for(const candidate of GROUP_ORDER){
                if(btn.classList.contains('role-'+candidate)){group=candidate;break;}
            }
            if(!group)return;
            const state=groupState(view,group);
            btn.innerHTML=buttonCaption(view,group);
            btn.classList.toggle('selected',state.all);
            btn.classList.toggle('partial',!state.all&&!state.none);
            btn.classList.toggle('off',state.none);
            btn.setAttribute('aria-pressed',state.all?'true':(!state.none?'mixed':'false'));
            btn.setAttribute('aria-label',`${GROUPS[group].label}: ${state.all?'tutti i ruoli':state.none?'nessun ruolo':state.active.join(', ')}. Tocca per attivare o disattivare la categoria. Tieni premuto per i sottofiltri.`);
            bindCategoryButton(btn,view,group,root);
        });

        const panel=root.querySelector('.mantra-subfilter-panel');
        if(panel?.dataset.group&&GROUPS[panel.dataset.group])openSubfilterPanel(view,panel.dataset.group,root);
    }

    const baseRenderListFilters=renderListFilters;
    renderListFilters=function(view){
        baseRenderListFilters(view);
        if(isMantraRoom())updateFilterControls(view);
    };

    const baseFilterAndSortPlayers=filterAndSortPlayers;
    filterAndSortPlayers=function(list,view){
        if(!isMantraRoom())return baseFilterAndSortPlayers(list,view);
        renderListFilters(view);
        const selected=selectedTokens(view);
        const search=document.querySelector('#list-filters-'+view+' .unified-search');
        const query=String(search?.value||'').trim().toLocaleLowerCase('it');
        const byId=new Map(playersList.map(player=>[String(player.Id),player]));
        const purchases=new Map(purchasesCache.map(purchase=>[String(purchase.player_id),purchase]));

        const rows=list.map(row=>{
            const purchased=row.player_id!==undefined;
            const id=String(purchased?row.player_id:row.Id);
            const player=purchased?(byId.get(id)||{Nome:row.player_name,Squadra:row.club,R:row.role}):row;
            const rawRole=purchased?(row.role||playerRole(player)):playerRole(player);
            const tokens=mantraRoleTokens(rawRole);
            const purchase=purchased?row:purchases.get(id);
            const priority=shortlistPriority(id)||null;
            const roleIndex=Math.min(...tokens.map(token=>{
                const index=MANTRA_ROLE_ORDER.indexOf(token);
                return index<0?99:index;
            }),99);
            const categoryLabels=[...new Set(tokens.map(token=>{
                const group=GROUP_ORDER.find(id=>GROUPS[id].tokens.includes(token));
                return group?GROUPS[group].label:'';
            }).filter(Boolean))];
            return {row,id,tokens,name:player.Nome||row.player_name||'',team:player.Squadra||row.club||'',role:roleIndex,value:playerListoneNumericValue(player),price:purchase?Number(purchase.price)||0:null,priority,categoryLabels};
        }).filter(item=>{
            const matchesRole=item.tokens.some(token=>selected.has(token));
            const haystack=`${item.name} ${item.team} ${item.tokens.join(' ')} ${item.categoryLabels.join(' ')}`.toLocaleLowerCase('it');
            return matchesRole&&(!query||haystack.includes(query)||view==='purchases');
        });

        const state=listFilterState(view);
        const direction=state.direction==='asc'?1:-1;
        rows.sort((a,b)=>{
            const av=a[state.sort],bv=b[state.sort];
            if(av==null&&bv!=null)return 1;
            if(bv==null&&av!=null)return -1;
            const primary=av==null?0:typeof av==='string'?listFilterCollator.compare(av,bv):av-bv;
            return direction*primary||listFilterCollator.compare(a.name,b.name)||listFilterCollator.compare(a.id,b.id);
        });
        return rows.map(item=>item.row);
    };

    window.liveastaMantraFilterUI={
        selectedTokens,
        openSubfilterPanel,
        reset(view){tokenCache.delete(cacheKey(view));updateFilterControls(view);}
    };
})();
