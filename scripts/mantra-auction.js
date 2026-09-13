// LIVEASTA Mantra auction controls — v1.02
// Keeps Classic behaviour untouched while making Mantra role selectors truly 12-role aware.
(function(){
    const classicRoles=['P','D','C','A'];

    function roleOptions(){
        return typeof auctionRoleOptions==='function'?auctionRoleOptions():(isMantraRoom()?[...MANTRA_ROLE_ORDER]:[...classicRoles]);
    }

    function canonicalRole(role){
        if(typeof normalizeAuctionRole==='function')return normalizeAuctionRole(role);
        if(isMantraRoom())return MANTRA_ROLE_ORDER.find(r=>r.toLowerCase()===String(role||'').toLowerCase())||'';
        const r=String(role||'').toUpperCase();
        return classicRoles.includes(r)?r:'';
    }

    function roleFamily(role){
        return typeof roleUiFamily==='function'?roleUiFamily(role):(isMantraRoom()?mantraRoleFamily(role):String(role||'').toUpperCase());
    }

    function normalizeCurrentAutoRandomRoles(){
        const allowed=roleOptions();
        const normalized=[...autoRandomRoles].map(canonicalRole).filter(Boolean).filter((r,i,a)=>allowed.includes(r)&&a.indexOf(r)===i);
        autoRandomRoles=new Set(normalized.length?normalized:allowed);
    }

    const baseLoadRoomAuctionExtraSettings=loadRoomAuctionExtraSettings;
    loadRoomAuctionExtraSettings=async function(){
        await baseLoadRoomAuctionExtraSettings.apply(this,arguments);
        if(!isMantraRoom()){
            autoRandomRoles=new Set([...autoRandomRoles].map(r=>String(r).toUpperCase()).filter(r=>classicRoles.includes(r)));
            if(!autoRandomRoles.size)autoRandomRoles=new Set(classicRoles);
            return;
        }
        try{
            const key=roomAuctionExtraSettingsKey();
            if(key){
                const {data,error}=await supabaseClient.from('fanta_app_data').select('data').eq('key',key).maybeSingle();
                if(error)throw error;
                const stored=Array.isArray(data?.data?.auto_random_roles)?data.data.auto_random_roles:[];
                const valid=stored.map(canonicalRole).filter(Boolean).filter((r,i,a)=>roleOptions().includes(r)&&a.indexOf(r)===i);
                autoRandomRoles=new Set(valid.length?valid:roleOptions());
            }else{
                autoRandomRoles=new Set(roleOptions());
            }
        }catch(e){
            console.warn('Ripristino ruoli AUTO RANDOM Mantra non riuscito',e);
            normalizeCurrentAutoRandomRoles();
        }
        renderAutoRandomControlUI();
    };

    autoRandomSelectedRolesFromControl=function(){
        return roleOptions().filter(role=>document.getElementById('auto-random-role-btn-'+role)?.getAttribute('aria-pressed')==='true');
    };

    renderAutoRandomControlUI=function(){
        if(typeof syncRoleModeClass==='function')syncRoleModeClass();
        normalizeCurrentAutoRandomRoles();

        const master=document.getElementById('auto-random-enabled');
        if(master)master.checked=!!autoRandomEnabled;

        const host=document.querySelector('#screen-room-control .mg-role-choice[aria-label="Ruoli random automatico"]');
        const roles=roleOptions();
        if(host){
            const signature=(isMantraRoom()?'mantra:':'classic:')+roles.join('|');
            if(host.dataset.roleModeSignature!==signature){
                host.dataset.roleModeSignature=signature;
                host.classList.toggle('mantra-auto-random-role-grid',isMantraRoom());
                host.innerHTML=roles.map(role=>{
                    const family=roleFamily(role);
                    return `<button id="auto-random-role-btn-${role}" type="button" class="unified-role role-${family}" aria-pressed="false" onclick="toggleAutoRandomRoleButton('${role}')">${role}</button>`;
                }).join('');
            }
        }

        roles.forEach(role=>{
            const selected=autoRandomRoles.has(role);
            const btn=document.getElementById('auto-random-role-btn-'+role);
            if(btn){
                btn.classList.toggle('selected',selected);
                btn.setAttribute('aria-pressed',selected?'true':'false');
            }
        });

        const status=document.getElementById('auto-random-status');
        if(status){
            const rolesText=roles.filter(r=>autoRandomRoles.has(r)).join(' · ')||'nessun ruolo';
            status.innerHTML=autoRandomEnabled
                ? `ATTIVO · ruoli <b>${escapeHtml(rolesText)}</b> · la prossima asta parte automaticamente.`
                : `DISATTIVO · ruoli predisposti <b>${escapeHtml(rolesText)}</b>.`;
            status.classList.toggle('active',!!autoRandomEnabled);
        }
    };

    setAutoRandomEnabled=async function(enabled){
        const selected=autoRandomSelectedRolesFromControl();
        if(enabled && !selected.length){
            alert(isMantraRoom()?'Seleziona almeno un ruolo Mantra.':'Seleziona almeno un ruolo tra P, D, C e A.');
            const master=document.getElementById('auto-random-enabled');
            if(master)master.checked=false;
            autoRandomEnabled=false;
            return;
        }
        if(enabled && nominationState.enabled){
            alert('AUTO RANDOM non può essere usato insieme alla banditura a turni. Disattiva prima la banditura a turni.');
            const master=document.getElementById('auto-random-enabled');
            if(master)master.checked=false;
            autoRandomEnabled=false;
            return;
        }
        autoRandomRoles=new Set(selected.length?selected:[...autoRandomRoles]);
        autoRandomEnabled=!!enabled;
        await saveRoomAuctionExtraSettings();
        renderAutoRandomControlUI();
        if(autoRandomEnabled)scheduleAutoRandomAuction(180);
        else cancelAutoRandomLaunch();
    };

    toggleAutoRandomRoleButton=function(role){
        const r=canonicalRole(role);
        if(!r || !roleOptions().includes(r))return;
        setAutoRandomRole(r,!autoRandomRoles.has(r));
    };

    setAutoRandomRole=async function(role,checked){
        const r=canonicalRole(role);
        if(!r || !roleOptions().includes(r))return;
        if(checked)autoRandomRoles.add(r); else autoRandomRoles.delete(r);
        if(autoRandomEnabled && !autoRandomRoles.size){
            autoRandomEnabled=false;
            const master=document.getElementById('auto-random-enabled');
            if(master)master.checked=false;
            cancelAutoRandomLaunch();
            alert('AUTO RANDOM disattivato: deve rimanere selezionato almeno un ruolo.');
        }
        await saveRoomAuctionExtraSettings();
        renderAutoRandomControlUI();
        if(autoRandomEnabled && !isAuctionActive && !readyGateWaiting && !auctionPrepInterval)scheduleAutoRandomAuction(180);
    };

    autoRandomCandidates=function(){
        const allowed=new Set([...autoRandomRoles].map(canonicalRole).filter(Boolean));
        if(!allowed.size)return [];
        return getAvailablePlayers().filter(player=>{
            const tokens=isMantraRoom()?mantraRoleTokens(playerRole(player)):[String(playerRole(player)||'').toUpperCase()];
            return tokens.some(token=>{
                const role=canonicalRole(token);
                return allowed.has(role) && autoRandomHasBidderForRole(role);
            });
        });
    };

    const baseStartRandomPlayer=startRandomPlayer;
    startRandomPlayer=function(){
        baseStartRandomPlayer.apply(this,arguments);
        if(!isMantraRoom())return;
        const grid=document.getElementById('random-role-grid');
        if(!grid)return;
        grid.classList.add('mantra-random-grid');
        grid.querySelectorAll('.random-role-btn').forEach(btn=>{
            const label=String(btn.textContent||'').trim();
            if(label.toUpperCase()==='TUTTI')return;
            const role=canonicalRole(label);
            if(!role)return;
            btn.classList.add('role-'+roleFamily(role));
        });
    };

    document.addEventListener('DOMContentLoaded',()=>{
        if(typeof syncRoleModeClass==='function')syncRoleModeClass();
    },{once:true});
})();
