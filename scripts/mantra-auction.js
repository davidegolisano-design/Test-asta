// LIVEASTA Mantra category controls — v1.02
// Classic remains untouched. Mantra uses five operational categories while
// preserving the real player roles (Por, Dd, Dc, ... ) in badges and data.
(function(){
    const GROUPS=['P','D','C','T','A'];
    const LABELS={P:'Portieri',D:'Difensori',C:'Centrocampisti',T:'Trequartisti',A:'Attaccanti'};
    const SHORT_LABELS={P:'POR',D:'DIF',C:'CEN',T:'TRQ',A:'ATT'};

    function groupForToken(token){
        if(typeof mantraRoleFamily==='function')return mantraRoleFamily(token);
        const t=String(token||'').trim();
        if(t==='Por')return 'P';
        if(['Dd','Dc','Ds','B','E'].includes(t))return 'D';
        if(['M','C'].includes(t))return 'C';
        if(['W','T'].includes(t))return 'T';
        if(['A','Pc'].includes(t))return 'A';
        return '';
    }
    function groupsForRole(role){
        return [...new Set(mantraRoleTokens(role).map(groupForToken).filter(Boolean))];
    }
    function primaryGroupForRole(role){
        return groupsForRole(role)[0]||'';
    }
    function playerMatchesGroup(player,group){
        const g=String(group||'').toUpperCase();
        if(!g||g==='ALL')return true;
        return groupsForRole(playerRole(player)).includes(g);
    }
    function activeGroups(){return isMantraRoom()?[...GROUPS]:['P','D','C','A'];}
    function categoryLabel(role){return isMantraRoom()?(LABELS[role]||role):role;}
    function normalizeGroup(role){
        const r=String(role||'').trim().toUpperCase();
        if(GROUPS.includes(r))return r;
        const normalized=normalizeMantraRole(role);
        return primaryGroupForRole(normalized);
    }

    // ---------- Shared list filters ----------
    const baseListFilterRoles=listFilterRoles;
    listFilterRoles=function(){return isMantraRoom()?[...GROUPS]:baseListFilterRoles();};

    const baseRenderListFilters=renderListFilters;
    renderListFilters=function(view){
        if(isMantraRoom()){
            const state=listFilterState(view);
            state.roles=(state.roles||[]).map(normalizeGroup).filter((r,i,a)=>GROUPS.includes(r)&&a.indexOf(r)===i);
        }
        baseRenderListFilters(view);
        if(!isMantraRoom())return;
        if(typeof syncRoleModeClass==='function')syncRoleModeClass();
        const root=document.getElementById('list-filters-'+view);
        const row=root?.querySelector('.unified-role-row');
        if(!row)return;
        row.classList.add('mantra-role-filter-row');
        row.querySelectorAll('.unified-role').forEach(btn=>{
            const onclick=btn.getAttribute('onclick')||'';
            const match=onclick.match(/'role','([PDC TA])'/);
            const group=(match?.[1]||String(btn.textContent||'').trim()).replace(/\s+/g,'').toUpperCase();
            if(!GROUPS.includes(group))return;
            btn.textContent=LABELS[group];
            btn.classList.remove('role-P','role-D','role-C','role-T','role-A');
            btn.classList.add('role-'+group);
        });
    };

    const baseFilterAndSortPlayers=filterAndSortPlayers;
    filterAndSortPlayers=function(list,view){
        if(!isMantraRoom())return baseFilterAndSortPlayers(list,view);
        renderListFilters(view);
        const state=listFilterState(view);
        const search=document.querySelector('#list-filters-'+view+' .unified-search');
        const query=String(search?.value||'').trim().toLocaleLowerCase('it');
        const byId=new Map(playersList.map(p=>[String(p.Id),p]));
        const purchases=new Map(purchasesCache.map(p=>[String(p.player_id),p]));
        const rows=list.map(row=>{
            const purchased=row.player_id!==undefined;
            const id=String(purchased?row.player_id:row.Id);
            const player=purchased?(byId.get(id)||{Nome:row.player_name,Squadra:row.club,R:row.role}):row;
            const rawRole=purchased?(row.role||playerRole(player)):playerRole(player);
            const tokens=mantraRoleTokens(rawRole);
            const groups=groupsForRole(rawRole);
            const purchase=purchased?row:purchases.get(id);
            const priority=shortlistPriority(id)||null;
            return {row,id,tokens,groups,name:player.Nome||row.player_name||'',team:player.Squadra||row.club||'',
                role:Math.min(...groups.map(r=>{const i=GROUPS.indexOf(r);return i<0?99:i;}),99),
                value:playerListoneNumericValue(player),price:purchase?Number(purchase.price)||0:null,priority};
        }).filter(item=>{
            const matchesRole=item.groups.some(r=>state.roles.includes(r));
            const haystack=`${item.name} ${item.team} ${item.tokens.join(' ')} ${item.groups.map(g=>LABELS[g]).join(' ')}`.toLocaleLowerCase('it');
            return matchesRole&&(!query||haystack.includes(query)||view==='purchases');
        });
        const direction=state.direction==='asc'?1:-1;
        rows.sort((a,b)=>{
            const av=a[state.sort],bv=b[state.sort];
            if(av==null&&bv!=null)return 1;if(bv==null&&av!=null)return -1;
            const primary=av==null?0:typeof av==='string'?listFilterCollator.compare(av,bv):av-bv;
            return direction*primary||listFilterCollator.compare(a.name,b.name)||listFilterCollator.compare(a.id,b.id);
        });
        return rows.map(item=>item.row);
    };

    // Keep the existing exact-role helper useful, but accept category codes too.
    mantraRoleMatches=function(player,role){
        if(!role||role==='ALL')return true;
        const upper=String(role||'').toUpperCase();
        if(GROUPS.includes(upper))return playerMatchesGroup(player,upper);
        return mantraRoleTokens(playerRole(player)).includes(normalizeMantraRole(role));
    };

    // ---------- Single random ----------
    const baseStartRandomPlayer=startRandomPlayer;
    startRandomPlayer=function(){
        if(!isMantraRoom())return baseStartRandomPlayer.apply(this,arguments);
        if(blockHybridBanditoreOutOfTurnAction(true))return;
        const grid=document.getElementById('random-role-grid');
        if(grid){
            grid.classList.add('mantra-random-grid');
            grid.innerHTML=`<button class="random-role-btn all" onclick="pickRandomRole('ALL')">TUTTI</button>`+
                GROUPS.map(g=>`<button class="random-role-btn role-${g}" onclick="pickRandomRole('${g}')">${LABELS[g]}</button>`).join('');
        }
        const modal=document.getElementById('random-role-modal');
        if(modal)modal.style.display='flex';
    };

    // ---------- Automatic random ----------
    function normalizeStoredGroups(values){
        const out=[];
        (Array.isArray(values)?values:[]).forEach(value=>{
            const direct=String(value||'').toUpperCase();
            const group=GROUPS.includes(direct)?direct:normalizeGroup(value);
            if(group&&!out.includes(group))out.push(group);
        });
        return out;
    }

    const baseLoadRoomAuctionExtraSettings=loadRoomAuctionExtraSettings;
    loadRoomAuctionExtraSettings=async function(){
        await baseLoadRoomAuctionExtraSettings.apply(this,arguments);
        if(!isMantraRoom())return;
        try{
            const key=roomAuctionExtraSettingsKey();
            if(!key){autoRandomRoles=new Set(GROUPS);return;}
            const {data,error}=await supabaseClient.from('fanta_app_data').select('data').eq('key',key).maybeSingle();
            if(error)throw error;
            const stored=normalizeStoredGroups(data?.data?.auto_random_roles);
            autoRandomRoles=new Set(stored.length?stored:GROUPS);
        }catch(e){
            console.warn('Caricamento categorie AUTO RANDOM Mantra non riuscito',e);
            autoRandomRoles=new Set(GROUPS);
        }
        renderAutoRandomControlUI();
    };

    autoRandomSelectedRolesFromControl=function(){
        return activeGroups().filter(role=>document.getElementById('auto-random-role-btn-'+role)?.getAttribute('aria-pressed')==='true');
    };

    renderAutoRandomControlUI=function(){
        const roles=activeGroups();
        if(isMantraRoom()){
            const normalized=normalizeStoredGroups([...autoRandomRoles]);
            autoRandomRoles=new Set(normalized.length?normalized:GROUPS);
        }
        const master=document.getElementById('auto-random-enabled');
        if(master)master.checked=!!autoRandomEnabled;
        const host=document.querySelector('#screen-room-control .mg-role-choice[aria-label="Ruoli random automatico"]');
        if(host){
            const signature=(isMantraRoom()?'mantra-groups:':'classic:')+roles.join('|');
            if(host.dataset.roleModeSignature!==signature){
                host.dataset.roleModeSignature=signature;
                host.classList.toggle('mantra-auto-random-role-grid',isMantraRoom());
                host.innerHTML=roles.map(role=>`<button id="auto-random-role-btn-${role}" type="button" class="unified-role role-${role}" aria-pressed="false" aria-label="${categoryLabel(role)}" title="${categoryLabel(role)}" onclick="toggleAutoRandomRoleButton('${role}')">${isMantraRoom()?(SHORT_LABELS[role]||role):categoryLabel(role)}</button>`).join('');
            }
        }
        roles.forEach(role=>{
            const selected=autoRandomRoles.has(role);
            const btn=document.getElementById('auto-random-role-btn-'+role);
            if(btn){btn.classList.toggle('selected',selected);btn.setAttribute('aria-pressed',selected?'true':'false');}
        });
        const status=document.getElementById('auto-random-status');
        if(status){
            const text=roles.filter(r=>autoRandomRoles.has(r)).map(categoryLabel).join(' · ')||'nessuna categoria';
            status.innerHTML=autoRandomEnabled
                ?`ATTIVO · <b>${escapeHtml(text)}</b> · la prossima asta parte automaticamente.`
                :`DISATTIVO · categorie predisposte <b>${escapeHtml(text)}</b>.`;
            status.classList.toggle('active',!!autoRandomEnabled);
        }
    };

    setAutoRandomEnabled=async function(enabled){
        const selected=autoRandomSelectedRolesFromControl();
        if(enabled&&!selected.length){
            alert(isMantraRoom()?'Seleziona almeno una categoria.':'Seleziona almeno un ruolo tra P, D, C e A.');
            const master=document.getElementById('auto-random-enabled');if(master)master.checked=false;
            autoRandomEnabled=false;return;
        }
        if(enabled&&nominationState.enabled){
            alert('AUTO RANDOM non può essere usato insieme alla banditura a turni. Disattiva prima la banditura a turni.');
            const master=document.getElementById('auto-random-enabled');if(master)master.checked=false;
            autoRandomEnabled=false;return;
        }
        autoRandomRoles=new Set(selected.length?selected:[...autoRandomRoles]);
        autoRandomEnabled=!!enabled;
        await saveRoomAuctionExtraSettings();
        renderAutoRandomControlUI();
        if(autoRandomEnabled)scheduleAutoRandomAuction(180);else cancelAutoRandomLaunch();
    };

    toggleAutoRandomRoleButton=function(role){
        const r=String(role||'').toUpperCase();
        if(!activeGroups().includes(r))return;
        setAutoRandomRole(r,!autoRandomRoles.has(r));
    };
    setAutoRandomRole=async function(role,checked){
        const r=String(role||'').toUpperCase();
        if(!activeGroups().includes(r))return;
        if(checked)autoRandomRoles.add(r);else autoRandomRoles.delete(r);
        if(autoRandomEnabled&&!autoRandomRoles.size){
            autoRandomEnabled=false;
            const master=document.getElementById('auto-random-enabled');if(master)master.checked=false;
            cancelAutoRandomLaunch();
            alert('AUTO RANDOM disattivato: deve rimanere selezionata almeno una categoria.');
        }
        await saveRoomAuctionExtraSettings();
        renderAutoRandomControlUI();
        if(autoRandomEnabled&&!isAuctionActive&&!readyGateWaiting&&!auctionPrepInterval)scheduleAutoRandomAuction(180);
    };
    autoRandomCandidates=function(){
        const allowed=new Set([...autoRandomRoles].map(r=>String(r).toUpperCase()).filter(r=>activeGroups().includes(r)));
        if(!allowed.size)return [];
        return getAvailablePlayers().filter(player=>groupsForRole(playerRole(player)).some(group=>allowed.has(group)&&autoRandomHasBidderForRole(group)));
    };

    // ---------- Budget ----------
    // A multi-role player is counted once, against the family of its first listed
    // Mantra role. Filters/random can match all of its families; budget cannot
    // double-count the same purchase.
    const baseDefaultPlayerBudgetPlan=defaultPlayerBudgetPlan;
    const baseNormalizePlayerBudgetPlan=normalizePlayerBudgetPlan;
    const basePlayerBudgetSpentByRole=playerBudgetSpentByRole;
    const basePlayerBudgetRoleState=playerBudgetRoleState;
    const basePlayerBudgetHealth=playerBudgetHealth;
    const basePlayerBudgetOfferState=playerBudgetOfferState;
    const baseRedistributePlayerBudget=redistributePlayerBudget;
    const baseSetBudgetRoleAlert=setBudgetRoleAlert;
    const baseSetPlayerBudgetEnabled=setPlayerBudgetEnabled;
    const baseOpenPlayerBudgetManager=openPlayerBudgetManager;
    const baseRenderPlayerBudgetManager=renderPlayerBudgetManager;
    const baseToggleBudgetDonor=toggleBudgetDonor;
    const baseBudgetRebalancePlan=budgetRebalancePlan;
    const baseApplyBudgetRebalance=applyBudgetRebalance;
    const baseRenderBudgetRebalance=renderBudgetRebalance;
    const baseUpdatePlayerBudgetVisuals=updatePlayerBudgetVisuals;

    function mantraBudgetRoles(){return [...GROUPS];}
    function mantraBudgetPrimaryRole(role){return primaryGroupForRole(role);}
    function splitBudget(total,roles){
        const base=Math.floor(total/roles.length),remainder=total-base*roles.length;
        return Object.fromEntries(roles.map((r,i)=>[r,base+(i<remainder?1:0)]));
    }
    function ensureBudgetRows(){
        const box=document.getElementById('player-budget-rows');if(!box||!isMantraRoom())return;
        if(box.dataset.mode==='mantra-groups')return;
        box.dataset.mode='mantra-groups';
        box.innerHTML=GROUPS.map(role=>`<div class="budget-role-card player-budget-row" data-role="${role}">
            <div class="budget-role-heading"><b class="budget-role role-${role}">${role}</b><strong>${LABELS[role]}</strong></div>
            <label data-budget-unit="credits">Budget (crediti)<input id="budget-credit-${role}" type="number" min="0" inputmode="numeric" onchange="updateBudgetFromCredits('${role}',this.value)"></label>
            <label data-budget-unit="percent" hidden>Budget (%)<input id="budget-percent-${role}" type="number" min="0" max="100" step="0.1" inputmode="decimal" onchange="updateBudgetFromPercent('${role}',this.value)"></label>
            <label>Soglia (crediti)<input id="budget-alert-${role}" type="number" min="0" inputmode="numeric" onchange="setBudgetRoleAlert('${role}',this.value)"></label>
            <label>Residuo<output id="budget-left-${role}">0</output></label>
        </div>`).join('');
        const copy=document.querySelector('#player-budget-overlay .player-budget-toggle-row small');
        if(copy)copy.textContent='Colora crediti e offerte in base al piano Portieri / Difensori / Centrocampisti / Trequartisti / Attaccanti.';
        const note=document.querySelector('#player-budget-overlay .player-budget-note');
        if(note)note.textContent='In Mantra il budget è un piano di spesa per categorie: verde sotto soglia, arancione dalla soglia, rosso al raggiungimento del budget. I doppi ruoli vengono conteggiati una sola volta nella categoria del primo ruolo indicato.';
    }

    defaultPlayerBudgetPlan=function(){
        if(!isMantraRoom())return baseDefaultPlayerBudgetPlan();
        const values=splitBudget(playerBudgetTotalCredits(),GROUPS);
        return {schemaVersion:3,mode:'mantra-groups',enabled:false,alerts:{},initial:null,initialLocked:false,initialOrigin:null,...values};
    };
    normalizePlayerBudgetPlan=function(plan){
        if(!isMantraRoom())return baseNormalizePlayerBudgetPlan(plan);
        const total=playerBudgetTotalCredits(),roles=mantraBudgetRoles();
        let values=roles.map(r=>budgetCreditNumber(plan?.[r]));
        const hasMantraShape=plan?.mode==='mantra-groups'||Object.prototype.hasOwnProperty.call(plan||{},'T');
        if(!hasMantraShape)values=roles.map(r=>defaultPlayerBudgetPlan()[r]);
        const sum=values.reduce((a,b)=>a+b,0);
        let scaled;
        if(sum<=0){const d=defaultPlayerBudgetPlan();scaled=roles.map(r=>d[r]);}
        else{
            scaled=values.map(v=>Math.floor(v*total/sum));
            let missing=total-scaled.reduce((a,b)=>a+b,0);
            const fractions=values.map((v,i)=>({i,f:v*total/sum-Math.floor(v*total/sum)})).sort((a,b)=>b.f-a.f);
            for(let i=0;missing>0;i++,missing--)scaled[fractions[i%roles.length].i]++;
        }
        const hasInitial=plan?.initialLocked&&plan?.initial&&roles.every(r=>Number.isFinite(plan.initial[r])&&plan.initial[r]>=0);
        return {schemaVersion:3,mode:'mantra-groups',enabled:!!plan?.enabled,
            ...Object.fromEntries(roles.map((r,i)=>[r,scaled[i]])),
            alerts:Object.fromEntries(roles.map((r,i)=>[r,Math.min(scaled[i],budgetCreditNumber(plan?.alerts?.[r],budgetDefaultAlert(scaled[i])))])),
            initial:hasInitial?Object.fromEntries(roles.map(r=>[r,budgetCreditNumber(plan.initial[r])])):null,
            initialLocked:hasInitial&&!!plan.initialLocked,
            initialOrigin:hasInitial?(plan.initialOrigin==='during-auction'?'during-auction':'before-auction'):null};
    };
    playerBudgetSpentByRole=function(){
        if(!isMantraRoom())return basePlayerBudgetSpentByRole();
        const spent={P:0,D:0,C:0,T:0,A:0};
        if(!myTeamId)return spent;
        teamPurchases(myTeamId).forEach(p=>{
            const group=mantraBudgetPrimaryRole(p.role);
            if(spent[group]!==undefined)spent[group]+=Math.max(0,parseInt(p.price)||0);
        });
        return spent;
    };
    playerBudgetRoleState=function(role){
        if(!isMantraRoom())return basePlayerBudgetRoleState(role);
        const r=String(role||'').toUpperCase();
        if(!GROUPS.includes(r))return {ok:true};
        const spent=playerBudgetSpentByRole();
        const allocated=budgetCreditNumber(playerBudgetPlan[r]);
        const spentRole=spent[r]||0;
        return {ok:spentRole<=allocated,allocated,spent:spentRole,remainingBudget:allocated-spentRole,missingSlots:0};
    };
    playerBudgetHealth=function(){
        if(!isMantraRoom())return basePlayerBudgetHealth();
        if(!playerBudgetPlan.enabled)return 'off';
        const spent=playerBudgetSpentByRole();
        if(GROUPS.some(r=>(spent[r]||0)>=budgetCreditNumber(playerBudgetPlan[r])))return 'red';
        if(GROUPS.some(r=>(spent[r]||0)>=budgetAlertCredits(r)))return 'orange';
        return 'green';
    };
    playerBudgetOfferState=function(amount){
        if(!isMantraRoom())return basePlayerBudgetOfferState(amount);
        if(!playerBudgetPlan.enabled||!currentAuctionPlayer)return {tone:'off'};
        const role=mantraBudgetPrimaryRole(playerRole(currentAuctionPlayer));
        if(!GROUPS.includes(role))return {tone:'off'};
        const state=playerBudgetRoleState(role);
        const projected=state.spent+Math.max(0,Number(amount)||0);
        const limit=state.allocated;
        const tone=projected>=limit?'red':projected>=budgetAlertCredits(role)?'orange':'normal';
        return {tone,role,remaining:limit-projected};
    };
    redistributePlayerBudget=function(changedRole,newCredits){
        if(!isMantraRoom())return baseRedistributePlayerBudget(changedRole,newCredits);
        const roles=GROUPS,role=String(changedRole||'').toUpperCase();
        if(!roles.includes(role))return;
        const before={...playerBudgetPlan};
        const total=playerBudgetTotalCredits();
        const target=Math.max(0,Math.min(total,Math.round(Number(newCredits)||0)));
        const others=roles.filter(r=>r!==role),remainder=total-target;
        const current=others.map(r=>Math.max(0,parseInt(playerBudgetPlan[r])||0));
        const currentSum=current.reduce((a,b)=>a+b,0);
        let nextOthers;
        if(currentSum>0){
            nextOthers=current.map(v=>Math.floor(v*remainder/currentSum));
            let missing=remainder-nextOthers.reduce((a,b)=>a+b,0);
            const fractions=current.map((v,i)=>({i,f:v*remainder/currentSum-Math.floor(v*remainder/currentSum)})).sort((a,b)=>b.f-a.f);
            for(let k=0;missing>0;k++,missing--)nextOthers[fractions[k%fractions.length].i]++;
        }else{
            const base=Math.floor(remainder/others.length);nextOthers=others.map(()=>base);
            let missing=remainder-base*others.length;for(let i=0;i<others.length&&missing>0;i++,missing--)nextOthers[i]++;
        }
        playerBudgetPlan[role]=target;others.forEach((r,i)=>playerBudgetPlan[r]=nextOthers[i]);
        playerBudgetPlan.alerts=playerBudgetPlan.alerts||{};
        roles.forEach(r=>{if(before[r]!==playerBudgetPlan[r])playerBudgetPlan.alerts[r]=budgetDefaultAlert(playerBudgetPlan[r]);});
        renderPlayerBudgetManager();updatePlayerBudgetVisuals();schedulePlayerBudgetSave();
    };
    setBudgetRoleAlert=function(role,value){
        if(!isMantraRoom())return baseSetBudgetRoleAlert(role,value);
        const r=String(role||'').toUpperCase();if(!GROUPS.includes(r))return;
        playerBudgetPlan.alerts=playerBudgetPlan.alerts||{};
        playerBudgetPlan.alerts[r]=Math.min(budgetCreditNumber(playerBudgetPlan[r]),budgetCreditNumber(value,budgetDefaultAlert(playerBudgetPlan[r])));
        renderPlayerBudgetManager();updatePlayerBidBudgetVisuals();schedulePlayerBudgetSave();
    };
    setPlayerBudgetEnabled=function(enabled){
        if(!isMantraRoom())return baseSetPlayerBudgetEnabled(enabled);
        playerBudgetPlan.enabled=!!enabled;renderPlayerBudgetManager();updatePlayerBudgetVisuals();schedulePlayerBudgetSave();
    };
    openPlayerBudgetManager=async function(){
        if(!isMantraRoom())return baseOpenPlayerBudgetManager();
        if(!currentRoomId||!myTeamId)return;
        try{document.activeElement?.blur?.();}catch(_){}
        document.getElementById('player-budget-overlay')?.classList.add('open');
        ensureBudgetRows();renderPlayerBudgetManager();
        try{await loadPlayerBudgetPlan();renderPlayerBudgetManager();}catch(err){console.warn('Budget plan Mantra load failed',err);}
    };
    renderPlayerBudgetManager=function(){
        if(!isMantraRoom())return baseRenderPlayerBudgetManager();
        if(!document.getElementById('player-budget-overlay'))return;
        ensureBudgetRows();
        const total=playerBudgetTotalCredits(),spent=playerBudgetSpentByRole();
        const toggle=document.getElementById('player-budget-enabled');if(toggle)toggle.checked=!!playerBudgetPlan.enabled;
        const title=document.getElementById('player-budget-total-label');if(title)title.textContent=`Budget totale: ${total} crediti`;
        for(const unit of ['credits','percent']){
            document.getElementById(`budget-unit-${unit}`)?.setAttribute('aria-pressed',String(unit===budgetInputUnit));
            document.querySelectorAll(`[data-budget-unit="${unit}"]`).forEach(el=>el.hidden=unit!==budgetInputUnit);
        }
        GROUPS.forEach(role=>{
            const amount=budgetCreditNumber(playerBudgetPlan[role]);
            const ci=document.getElementById(`budget-credit-${role}`),pi=document.getElementById(`budget-percent-${role}`),alert=document.getElementById(`budget-alert-${role}`),left=document.getElementById(`budget-left-${role}`);
            if(ci){ci.value=amount;ci.max=total;}if(pi)pi.value=(100*amount/total).toFixed(1);
            if(alert){alert.value=budgetAlertCredits(role);alert.max=amount;}
            if(left){left.textContent=String(amount-(spent[role]||0));left.classList.toggle('over',amount<(spent[role]||0));}
        });
        const current=document.getElementById('budget-current-credits');
        const team=teamsCache.find(t=>String(t.id)===String(myTeamId));if(current)current.textContent=String(team?.credits_remaining||0);
        renderBudgetRebalance();
    };
    toggleBudgetDonor=function(target,donor){
        if(!isMantraRoom())return baseToggleBudgetDonor(target,donor);
        if(!GROUPS.includes(target)||!GROUPS.includes(donor)||target===donor)return;
        const key=budgetDonorKey(target),set=budgetDonorSelections.get(key)||new Set();
        set.has(donor)?set.delete(donor):set.add(donor);budgetDonorSelections.set(key,set);budgetDonorAmounts.delete(key);renderBudgetRebalance();
    };
    budgetRebalancePlan=function(target){
        if(!isMantraRoom())return baseBudgetRebalancePlan(target);
        const spent=playerBudgetSpentByRole();
        const deficit=Math.max(0,(spent[target]||0)-budgetCreditNumber(playerBudgetPlan[target]));
        const selected=budgetDonorSelections.get(budgetDonorKey(target))||new Set();
        const donors=GROUPS.filter(r=>r!==target).map(role=>({role,available:Math.max(0,budgetCreditNumber(playerBudgetPlan[role])-(spent[role]||0))}));
        const chosen=donors.filter(d=>selected.has(d.role)&&d.available>0),available=chosen.reduce((s,d)=>s+d.available,0);
        let valid=deficit>0&&available>=deficit;const transfers={};
        if(valid){
            chosen.forEach(d=>transfers[d.role]=Math.floor(deficit*d.available/available));
            let remaining=deficit-Object.values(transfers).reduce((a,b)=>a+b,0);
            for(const donor of [...chosen].sort((a,b)=>b.available-a.available)){if(remaining>0&&transfers[donor.role]<donor.available){transfers[donor.role]++;remaining--;}}
        }
        const custom=budgetDonorAmounts.get(budgetDonorKey(target));
        if(custom){
            Object.keys(transfers).forEach(r=>delete transfers[r]);
            donors.filter(d=>selected.has(d.role)).forEach(d=>transfers[d.role]=budgetCreditNumber(custom[d.role]));
            valid=deficit>0&&Object.values(transfers).reduce((a,b)=>a+b,0)===deficit&&donors.every(d=>(transfers[d.role]||0)<=d.available);
        }
        return {target,deficit,donors,selected,available,valid,transfers};
    };
    applyBudgetRebalance=function(target){
        if(!isMantraRoom())return baseApplyBudgetRebalance(target);
        if(!GROUPS.includes(target))return;
        const plan=budgetRebalancePlan(target);if(!plan.valid){renderBudgetRebalance();return;}
        Object.entries(plan.transfers).forEach(([role,amount])=>playerBudgetPlan[role]-=amount);
        playerBudgetPlan[target]+=plan.deficit;playerBudgetPlan.alerts=playerBudgetPlan.alerts||{};
        [target,...Object.keys(plan.transfers)].forEach(r=>playerBudgetPlan.alerts[r]=budgetDefaultAlert(playerBudgetPlan[r]));
        budgetDonorSelections.delete(budgetDonorKey(target));budgetDonorAmounts.delete(budgetDonorKey(target));
        renderPlayerBudgetManager();updatePlayerBudgetVisuals();schedulePlayerBudgetSave();
    };
    renderBudgetRebalance=function(){
        if(!isMantraRoom())return baseRenderBudgetRebalance();
        const box=document.getElementById('budget-rebalance');if(!box)return;
        const plans=GROUPS.map(budgetRebalancePlan).filter(p=>p.deficit>0);
        box.innerHTML=plans.length?plans.map(p=>`<section class="budget-rebalance-card">
            <strong>${LABELS[p.target]}: mancano ${p.deficit} crediti</strong><span>Scegli da quali categorie recuperarli:</span>
            <div class="budget-donor-buttons">${GROUPS.map(role=>{const donor=p.donors.find(d=>d.role===role),available=donor?.available||0;return `<button type="button" class="budget-donor role-${role}${p.selected.has(role)?' selected':''}" aria-pressed="${p.selected.has(role)}" ${available<=0?'disabled':''} onclick="toggleBudgetDonor('${p.target}','${role}')"><b>${LABELS[role]}</b><small>${available} liberi</small></button>`;}).join('')}</div>
            <div class="budget-transfer-amounts">${p.donors.filter(d=>p.selected.has(d.role)).map(d=>`<label>Da ${LABELS[d.role]} (max ${d.available})<input type="number" min="0" max="${d.available}" step="1" inputmode="numeric" value="${p.transfers[d.role]||0}" onchange="setBudgetDonorAmount('${p.target}','${d.role}',this.value)"></label>`).join('')}</div>
            <div class="budget-transfer-preview" aria-live="polite">${p.valid?Object.entries(p.transfers).map(([r,v])=>`${LABELS[r]}: −${v}`).join(' · ')+` → ${LABELS[p.target]}: +${p.deficit}`:`Da coprire: ${p.deficit}. Importi inseriti: ${Object.values(p.transfers).reduce((a,b)=>a+b,0)}.`}</div>
            <button type="button" class="btn btn-secondary" ${p.valid?'':'disabled'} onclick="applyBudgetRebalance('${p.target}')">Conferma copertura: ${p.deficit} crediti</button>
        </section>`).join(''):'<div class="budget-balanced-note">Nessuna categoria con residuo negativo.</div>';
    };
    updatePlayerBudgetVisuals=function(){
        if(!isMantraRoom())return baseUpdatePlayerBudgetVisuals();
        updatePlayerBidBudgetVisuals();
        const credits=document.getElementById('player-credits'),slots=document.getElementById('player-slots');
        if(!credits||!slots)return;
        credits.classList.remove('budget-health-green','budget-health-orange','budget-health-red');
        const active=!!playerBudgetPlan.enabled;
        slots.classList.toggle('budget-management-active',active);slots.classList.toggle('budget-management-inactive',!active);
        if(!active)return;
        const health=playerBudgetHealth();
        if(health==='green')credits.classList.add('budget-health-green');
        else if(health==='orange')credits.classList.add('budget-health-orange');
        else if(health==='red')credits.classList.add('budget-health-red');
    };

    document.addEventListener('DOMContentLoaded',()=>{if(typeof syncRoleModeClass==='function')syncRoleModeClass();},{once:true});
})();
