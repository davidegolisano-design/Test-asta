// Shared search/filter UI. Only roles, sort and direction are persisted.
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
        function listFilterRoles(){return isMantraRoom()?[...MANTRA_ROLE_ORDER]:['P','D','C','A'];}
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
            if(field==='all')state.roles=listFilterRoles();
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
                // Il campo esiste già nel markup: non spostarlo mai nel DOM.
                // Su Android spostare un input focalizzato chiude la tastiera.
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
            const locked=view==='nomination'&&!isMantraRoom()?String(nominationState.role):'';
            const signature=JSON.stringify([state,listFilterRoles(),locked]);
            if(controls.dataset.signature===signature)return;
            controls.dataset.signature=signature;
            controls.innerHTML=`<div class="unified-role-row" aria-label="Filtra per ruolo">
                <button type="button" class="unified-role-all" onclick="changeListFilter('${view}','all')" ${locked?'disabled':''}>Tutti</button>
                ${listFilterRoles().map(role=>{
                    const selected=locked?role===locked:state.roles.includes(role);
                    const classic=({Por:'P',Dc:'D',B:'D',Dd:'D',Ds:'D',E:'C',M:'C',W:'C',T:'C',Pc:'A'})[role]||role;
                    return `<button type="button" class="unified-role role-${classic}${selected?' selected':''}" aria-pressed="${selected}" ${locked?'disabled':''} onclick="changeListFilter('${view}','role','${role}')">${role}</button>`;
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
                const matchesRole=view==='nomination'&&!isMantraRoom()?item.tokens.includes(String(nominationState.role)):item.tokens.some(r=>state.roles.includes(r));
                return matchesRole&&(!query||`${item.name} ${item.team} ${item.tokens.join(' ')}`.toLocaleLowerCase('it').includes(query)||view==='purchases');
            });
            const direction=state.direction==='asc'?1:-1;
            rows.sort((a,b)=>{
                const av=a[state.sort],bv=b[state.sort];
                // Unassigned prices and unmarked preferences remain at the end in both directions.
                if(av==null&&bv!=null)return 1;if(bv==null&&av!=null)return -1;
                const primary=av==null?0:typeof av==='string'?listFilterCollator.compare(av,bv):av-bv;
                return direction*primary||listFilterCollator.compare(a.name,b.name)||listFilterCollator.compare(a.id,b.id);
            });
            return rows.map(item=>item.row);
        }

        function updateCreateRoomModeUI(){
            const mode=document.querySelector('input[name="auction-game-mode"]:checked')?.value||'classic';
            const classic=document.getElementById('create-classic-info');
            const mantra=document.getElementById('create-mantra-info');
            if(classic)classic.style.display=mode==='classic'?'block':'none';
            if(mantra)mantra.style.display=mode==='mantra'?'block':'none';
        }

        const SUPABASE_URL = 'https://qvkembahfeecfpsshepv.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2a2VtYmFoZmVlY2Zwc3NoZXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNTExNzksImV4cCI6MjEwNDcyNzE3OX0.NlICbHV5kcVlnizC-oc6pvIJYWYO3Ggddn8gGN_0ImU';

        let supabaseClient;
        let channel = null;
        let currentRoomCode = "";
        let currentRoomId = "";
        let currentRoom = null;
        let roomsCache = [];
        let auctioneerRoomMode = null;

        // lock esclusivo del banditore per stanza.
        // Il lock vive in fanta_app_data ed è protetto dalla PK `key`,
        // quindi due banditori non possono acquisirlo contemporaneamente.
        let auctioneerLockKey = null;
        let auctioneerLockToken = null;
        let auctioneerLockHeartbeatTimer = null;
        let auctioneerLockLostHandled = false;
        const AUCTIONEER_LOCK_HEARTBEAT_MS = 5000;
        const AUCTIONEER_LOCK_STALE_MS = 45000;

        let myTeamName = "";
        let auctionTimeLimit = 5;
        let auctionPrepSeconds = 5;
        let currentTimer = 0;
        let timerInterval = null;
        let auctionPrepInterval = null;
        let isAuctionActive = false;
        let currentWinner = "";
        let currentAuctionValue = 0;

        // anti-doppio rilancio configurabile.
        // Default 0,5 secondi; il banditore resta l'autorità definitiva.
        const DEFAULT_NORMAL_BID_COOLDOWN_MS = 500;
        let normalBidCooldownMs = DEFAULT_NORMAL_BID_COOLDOWN_MS;
        // Se false, una squadra che è già miglior offerente non può rilanciare su se stessa.
        // Default true per mantenere il comportamento storico delle stanze esistenti.
        let selfRaiseEnabled = true;
        let normalBidCooldownUntil = 0;
        let playerNormalBidCooldownUntil = 0;
        let playerNormalBidCooldownTimer = null;
        let recentNormalBidIds = new Map();

        let playersList = [];
        let playerShortlist = new Map();
        let playerShortlistLoadedFor = '';
        let playerShortlistSaveTimer = null;

        let playerBudgetPlan = {enabled:false,P:0,D:0,C:0,A:0};
        let playerBudgetLoadedFor = '';
        let playerBudgetSaveTimer = null;

        let miniatureAuditResult = null;
        let adminSessionPassword='';
        let auctionedPlayerIds = new Set();
        let currentAuctionPlayer = null;
        let playerHasBidThisAuction = false;
        let playerPrepInterval = null;
        let playerSealedCountdownInterval = null;
        let playerSealedRevealLocalEndAt = 0;
        let normalBidMaxima = new Map();
        let teamsCache = [];
        let purchasesCache = [];
        let myTeamId = null;
        let auctioneerPlayerMode=false;
        let auctioneerPlayerTeamId=null;
        let hybridReturnTimer=null;
        let roomControlReturnScreen = 'screen-auctioneer-board';
        let nominationState={enabled:false,role:null,turn_team_id:null,order_team_ids:[]};
        let nominationAutoBidOneEnabled=false;
        // modalità AUTO RANDOM: nomina automatica continua sui ruoli scelti.
        let autoRandomEnabled=false;
        let autoRandomRoles=new Set(['P','D','C','A']);
        let autoRandomLaunchTimer=null;
        let autoRandomStarting=false;
        let nominationReady=false;
        let nominationRequestPending=false;

        // Presenza giocatori online
        let onlinePlayers = new Map();
        let absentTeamIds = new Set();
        let playerAvailabilityMode = 'online';
        let presenceClientKey = null;
        let presenceTracked = false;
        let fallbackOnlineHeartbeat = null;
        let fallbackOnlineCleanup = null;
        let playerRealtimeOnline = false;
        let realtimeConnectionGeneration = 0;
        let playerSetupChannel=null;
        let playerSetupRoomId=null;
        let playerSetupOccupiedIds=new Set();
        let playerSetupRefreshToken=0;
        let manualAssignTeamId=null;
        let controlPurchasesExpanded=false;
        let controlPurchasesSearch='';
        let csvRosterImportPlan=null;
        let csvRosterImportBusy=false;
        let playerPinMode='unknown'; // unknown | create | verify
        let playerPinTeamId='';
        let playerPinRoomId='';
        let roomTeamPinStatusMap=new Map();
        let adminPinManagerRoomId=null;
        let banditoreUiPrefsLoadedFor='';
        let playerUiPrefsLoadedFor='';


        function banditoreUiPrefsKey(){
            return currentRoomId?`liveasta_ui_banditore_${currentRoomId}`:'';
        }

        function playerUiPrefsKey(){
            return currentRoomId&&myTeamId
                ?`liveasta_ui_player_${currentRoomId}_${String(myTeamId)}`
                :'';
        }

        function saveBanditoreUiPrefs(){
            const key=banditoreUiPrefsKey();if(!key)return;
            const prefs=safeReadLocalJson(key)||{};
            delete prefs.list_search;delete prefs.nomination_search;
            safeWriteLocalJson(key,{...prefs,updated_at:Date.now()});
        }

        function loadBanditoreUiPrefs(force=false){
            const key=banditoreUiPrefsKey();if(!key)return;
            if(!force && banditoreUiPrefsLoadedFor===key)return;
            banditoreUiPrefsLoadedFor=key;
            ['player-search'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
        }

        function savePlayerUiPrefs(){
            const key=playerUiPrefsKey();if(!key)return;
            const prefs=safeReadLocalJson(key)||{};
            delete prefs.list_search;delete prefs.nomination_search;
            safeWriteLocalJson(key,{...prefs,updated_at:Date.now()});
        }

        function loadPlayerUiPrefs(force=false){
            const key=playerUiPrefsKey();if(!key)return;
            if(!force && playerUiPrefsLoadedFor===key)return;
            playerUiPrefsLoadedFor=key;
            ['player-listone-search', 'nomination-search'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
        }

        function saveCurrentActorUiPrefs(){
            if(myTeamId)savePlayerUiPrefs();
            else if(auctioneerLockKey)saveBanditoreUiPrefs();
        }

        // Busta chiusa
        let sealedTimerSeconds=30;
        let sealedRevealSeconds=5;
        let sealedRevealInterval=null;
        let sealedRevealDeadlineAt=0;
        let playerSealedRevealDeadlineAt=0;
        let playerPendingSealedResult=null;
        let sealedListonePickMode=false;
        let sealedAuctionModeActive=false;
        let sealedEnding=false;
        let sealedAuctionToken=null;
        let sealedBids=new Map();
        let sealedEligibleIds=[];
        let sealedTimerInterval=null;
        let sealedDeadlineAt=0;
        let sealedRound=1;
        let playerSealedMode=false;
        let playerSealedToken=null;
        let playerSealedSubmitted=false;
        let readyModeEnabled=false;
        let readyGateWaiting=false;
        let readyGateToken=null;
        let readyPlayers=new Set();
        let readySkipPlayers=new Set();
        let readyOfflineExcludedIds=new Set();
        let readyPresenceReconcileTimer=null;
        let playerReadyToken=null;
        let playerReadySent=false;
        let playerReadyChoice=null;
        let playerReadyRequiredIds=[];
        let playerReadyIds=[];
        let playerSkippedCurrentAuction=false;
        let playerReadyDismissedToken=null;
        let liveAuctionState=null;
        let showRoomsToUsers=true;
        let playerRoomRefreshTimer=null;

        try {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            window.supabaseClient = supabaseClient;
        } catch (e) {
            alert("Errore critico nell'avvio del database.");
        }


        function auctioneerPlayerStorageKey(){
            return currentRoomId?`liveasta_auctioneer_player_${currentRoomId}`:'liveasta_auctioneer_player';
        }

        function currentAuctioneerPlayerTeam(){
            return auctioneerPlayerTeamId
                ? teamsCache.find(t=>String(t.id)===String(auctioneerPlayerTeamId))
                : null;
        }

        function isAuctioneerPlayerIdentity(){
            return !!(
                auctioneerPlayerMode &&
                auctioneerPlayerTeamId &&
                myTeamId &&
                String(auctioneerPlayerTeamId)===String(myTeamId) &&
                auctioneerLockKey
            );
        }

        function saveAuctioneerPlayerModeLocal(){
            if(!currentRoomId)return;
            try{
                localStorage.setItem(auctioneerPlayerStorageKey(),JSON.stringify({
                    enabled:!!auctioneerPlayerMode,
                    team_id:auctioneerPlayerTeamId?String(auctioneerPlayerTeamId):null
                }));
            }catch(e){}
        }

        function loadAuctioneerPlayerMode(){
            auctioneerPlayerMode=false;
            auctioneerPlayerTeamId=null;
            try{
                const raw=JSON.parse(localStorage.getItem(auctioneerPlayerStorageKey())||'null');
                if(raw?.team_id && teamsCache.some(t=>String(t.id)===String(raw.team_id))){
                    auctioneerPlayerTeamId=String(raw.team_id);
                    auctioneerPlayerMode=!!raw.enabled;
                }
            }catch(e){}

            const team=currentAuctioneerPlayerTeam();
            if(auctioneerPlayerMode&&team){
                myTeamId=team.id;
                myTeamName=team.name;
                playerAvailabilityMode=absentTeamIds.has(String(team.id))?'absent':'online';
            }else{
                myTeamId=null;
                myTeamName='';
                playerAvailabilityMode='online';
            }
            renderAuctioneerPlayerControl();
        }

        function renderAuctioneerPlayerControl(){
            syncHybridViewButtons();
            const select=document.getElementById('auctioneer-player-team-select');
            const badge=document.getElementById('auctioneer-player-badge');
            const btn=document.getElementById('auctioneer-player-toggle-btn');
            const status=document.getElementById('auctioneer-player-status');

            if(select){
                const selected=auctioneerPlayerTeamId?String(auctioneerPlayerTeamId):'';

                // Come un giocatore normale: il banditore può scegliere soltanto
                // una squadra libera. La propria selezione resta visibile per
                // permettere di disattivare/cambiare modalità senza sparire.
                const freeTeams=teamsCache.filter(t=>
                    String(t.id)===selected ||
                    !onlinePlayers.has(String(t.id))
                );

                select.innerHTML='<option value="">Seleziona squadra libera</option>'+
                    freeTeams.map(t=>`<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`).join('');

                select.value=freeTeams.some(t=>String(t.id)===selected)?selected:'';
            }

            const team=currentAuctioneerPlayerTeam();
            const active=!!(auctioneerPlayerMode&&team);

            if(badge){
                badge.textContent=active?'ATTIVO':'DISATTIVO';
                badge.classList.toggle('active',active);
            }
            if(btn){
                btn.textContent=active?'Disattiva banditore giocatore':'Attiva banditore giocatore';
                btn.setAttribute('aria-checked',String(active));
                btn.classList.toggle('active',active);
            }
            if(status){
                status.textContent=active
                    ?`Giocherai come ${team.name}. La squadra è riservata al banditore.`
                    :'Scegli una squadra e attiva la modalità.';
            }
        }

        let playerPinAccessDialog=null;

        function buildPlayerPinAccessDialog(){
            if(playerPinAccessDialog)return playerPinAccessDialog;
            const dlg=document.createElement('dialog');
            dlg.className='v093-player-pin-dialog';
            dlg.innerHTML=`<form method="dialog" class="v093-player-pin-card">
              <div class="v093-player-pin-head"><h3>Autorizza accesso giocatore</h3><button type="button" class="v093-player-pin-close" aria-label="Chiudi">×</button></div>
              <p id="v093-player-pin-copy">Inserisci il PIN personale del giocatore.</p>
              <input id="v093-player-pin-input" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" placeholder="PIN giocatore · 6 cifre">
              <div id="v093-player-pin-error" class="v093-player-pin-error" aria-live="polite"></div>
              <div class="v093-player-pin-actions"><button type="button" class="btn btn-secondary v093-player-pin-cancel">Annulla</button><button type="submit" class="btn btn-green">Autorizza</button></div>
            </form>`;
            document.body.appendChild(dlg);
            playerPinAccessDialog=dlg;
            return dlg;
        }

        async function verifyPlayerPinAccess(teamId,teamName){
            teamId=String(teamId||'').trim();
            if(!teamId){
                try{if(typeof appAlert==='function')await appAlert('Seleziona prima una squadra libera.');else alert('Seleziona prima una squadra libera.');}catch(_){alert('Seleziona prima una squadra libera.');}
                return false;
            }

            const dlg=buildPlayerPinAccessDialog();
            const form=dlg.querySelector('form');
            const input=dlg.querySelector('#v093-player-pin-input');
            const error=dlg.querySelector('#v093-player-pin-error');
            const copy=dlg.querySelector('#v093-player-pin-copy');
            const closeBtn=dlg.querySelector('.v093-player-pin-close');
            const cancelBtn=dlg.querySelector('.v093-player-pin-cancel');
            copy.textContent=`Inserisci il PIN personale del giocatore di ${teamName||'questa squadra'}.`;
            input.value='';
            error.textContent='';

            return new Promise(resolve=>{
                let settled=false;
                const finish=value=>{
                    if(settled)return;
                    settled=true;
                    form.removeEventListener('submit',onSubmit);
                    closeBtn.removeEventListener('click',onClose);
                    cancelBtn.removeEventListener('click',onClose);
                    dlg.removeEventListener('cancel',onCancel);
                    if(dlg.open)dlg.close();
                    resolve(value);
                };
                const onClose=()=>finish(false);
                const onCancel=e=>{e.preventDefault();finish(false);};
                const onSubmit=async e=>{
                    e.preventDefault();
                    const pin=String(input.value||'').replace(/\D/g,'').slice(0,6);
                    if(!/^\d{6}$/.test(pin)){
                        error.textContent='Inserisci il PIN giocatore di 6 cifre.';
                        input.focus();
                        return;
                    }
                    try{
                        const roomId=currentRoom?.id||currentRoomId;
                        const roomPassword=String(currentRoom?.password||'');
                        if(!roomId)throw new Error('Stanza non disponibile.');

                        const status=await supabaseClient.rpc('liveasta_team_pin_status',{p_team_id:teamId,p_room_id:roomId});
                        if(status.error)throw status.error;
                        if(status.data!==true){
                            error.textContent='Questa squadra non ha ancora un PIN giocatore impostato.';
                            return;
                        }

                        const check=await supabaseClient.rpc('liveasta_verify_team_pin',{
                            p_team_id:teamId,
                            p_room_id:roomId,
                            p_room_password:roomPassword,
                            p_pin:pin
                        });
                        if(check.error)throw check.error;
                        if(check.data!==true){
                            error.textContent='PIN giocatore non corretto.';
                            input.select();
                            return;
                        }
                        finish(true);
                    }catch(err){
                        console.warn('Verifica PIN accesso giocatore',err);
                        error.textContent='Impossibile verificare il PIN. Riprova.';
                    }
                };

                form.addEventListener('submit',onSubmit);
                closeBtn.addEventListener('click',onClose);
                cancelBtn.addEventListener('click',onClose);
                dlg.addEventListener('cancel',onCancel);
                dlg.showModal();
                setTimeout(()=>input.focus({preventScroll:true}),40);
            });
        }

        async function changeAuctioneerPlayerTeam(){
            const select=document.getElementById('auctioneer-player-team-select');
            const id=String(select?.value||'')||null;
            const previousId=String(auctioneerPlayerTeamId||'')||null;

            if(auctioneerPlayerMode&&id&&onlinePlayers.has(String(id))){
                alert('Questa squadra è già collegata da un altro telefono.');
                if(select)select.value=previousId||'';
                return;
            }

            if(auctioneerPlayerMode&&id&&String(id)!==String(previousId||'')){
                const nextTeam=teamsCache.find(t=>String(t.id)===String(id));
                const authorized=await verifyPlayerPinAccess(id,nextTeam?.name||'questa squadra');
                if(!authorized){
                    if(select)select.value=previousId||'';
                    return;
                }
                if(onlinePlayers.has(String(id))){
                    alert('Questa squadra non è più libera: è già collegata da un altro telefono.');
                    if(select)select.value=previousId||'';
                    return;
                }
            }

            auctioneerPlayerTeamId=id;
            const team=currentAuctioneerPlayerTeam();
            if(auctioneerPlayerMode&&team){
                myTeamId=team.id;
                myTeamName=team.name;
            }

            saveAuctioneerPlayerModeLocal();
            renderAuctioneerPlayerControl();
        }

        async function toggleAuctioneerPlayerMode(){
            if(auctioneerPlayerMode){
                auctioneerPlayerMode=false;
                myTeamId=null;
                myTeamName='';
                saveAuctioneerPlayerModeLocal();
                renderAuctioneerPlayerControl();
                renderOnlinePlayers();
                return;
            }

            const select=document.getElementById('auctioneer-player-team-select');
            auctioneerPlayerTeamId=String(select?.value||auctioneerPlayerTeamId||'')||null;
            const team=currentAuctioneerPlayerTeam();

            if(!team){
                alert('Seleziona prima la squadra del banditore.');
                return;
            }
            if(onlinePlayers.has(String(team.id))){
                alert('Questa squadra non è più libera: è già collegata da un altro telefono.');
                renderAuctioneerPlayerControl();
                return;
            }

            const authorized=await verifyPlayerPinAccess(team.id,team.name);
            if(!authorized)return;
            if(onlinePlayers.has(String(team.id))){
                alert('Questa squadra non è più libera: è già collegata da un altro telefono.');
                renderAuctioneerPlayerControl();
                return;
            }

            auctioneerPlayerMode=true;
            myTeamId=team.id;
            myTeamName=team.name;
            saveAuctioneerPlayerModeLocal();
            renderAuctioneerPlayerControl();
            renderOnlinePlayers();
        }

        let hybridPreferredView=null;
        let hybridPreferredViewKey='';
        function syncHybridViewButtons(){
            const active=isAuctioneerPlayerIdentity();
            const key=active?`${currentRoomId}:${myTeamId}`:'';
            if(key!==hybridPreferredViewKey){hybridPreferredViewKey=key;hybridPreferredView=null;}
            for(const id of ['hybrid-view-to-board','hybrid-view-to-player']){
                const btn=document.getElementById(id);
                if(btn){btn.hidden=!active;btn.style.display=active?'':'none';}
            }
            const title=document.getElementById('auctioneer-session-title');if(title)title.hidden=active;
        }

        function switchHybridView(view){
            if(!['player','board'].includes(view)||!isAuctioneerPlayerIdentity())return;
            syncHybridViewButtons();
            hybridPreferredView=view;
            exactBidSliderCancel(false);
            if(view==='player'){
                if(!configureHybridPlayerIdentity())return;
                if(currentAuctionPlayer){
                    setPlayerImage(document.getElementById('phone-card-image'),currentAuctionPlayer.Id,currentAuctionPlayer.R);
                    setPhonePlayerDisplayName(currentAuctionPlayer.Nome||'--',currentAuctionPlayer.Id);
                    const role=document.getElementById('phone-player-role');if(role)role.textContent=currentAuctionPlayer.R||'-';
                    const club=document.getElementById('phone-player-club');if(club)club.textContent=currentAuctionPlayer.Squadra||'-';
                }
                // Existing hybrid callbacks keep this screen up to date even while hidden.
                // Do not reinitialize the auction, timers, ready state or sealed offer here.
                showScreen('screen-player-buzzer');
                if(readyGateWaiting)showHybridReadyIfNeeded();
                updatePlayerBudgetVisuals();
            }else{
                showScreen('screen-auctioneer-board');
            }
            syncHybridViewButtons();
        }

        function syncSealedBidAreaHeight(){
            const grid=document.getElementById('normal-bid-controls');
            if(!grid)return;
            const ready=grid.classList.contains('ready-choice-active');
            if(ready)grid.classList.remove('ready-choice-active');
            const temporary=[...grid.querySelectorAll('#sealed-bid-controls,#player-ready-choice-controls')].map(el=>({el,style:el.getAttribute('style')}));
            temporary.forEach(({el})=>el.style.setProperty('display','none','important'));
            const sealed=grid.classList.contains('sealed-active');
            // Measure the normal four-button layout synchronously, without rendering an intermediate frame.
            if(sealed)grid.classList.remove('sealed-active');
            try{
                const rect=grid.getBoundingClientRect();
                const style=getComputedStyle(grid);
                const button=grid.querySelector('.buzzer-btn');
                const buttonHeight=button?parseFloat(getComputedStyle(button).height)||0:0;
                const extra=['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth'].reduce((n,k)=>n+(parseFloat(style[k])||0),0);
                const height=rect.height||buttonHeight*2+(parseFloat(style.rowGap)||0)+extra;
                if(height>0)grid.style.setProperty('--regular-bid-area-height',`${Math.ceil(height)}px`);
            }finally{
                if(sealed)grid.classList.add('sealed-active');
                if(ready)grid.classList.add('ready-choice-active');
                temporary.forEach(({el,style})=>{if(style===null)el.removeAttribute('style');else el.setAttribute('style',style);});
            }
        }
        window.addEventListener('resize',()=>requestAnimationFrame(syncSealedBidAreaHeight),{passive:true});

        function configureHybridPlayerIdentity(){
            if(!auctioneerPlayerMode)return false;
            const team=currentAuctioneerPlayerTeam();
            if(!team)return false;

            myTeamId=team.id;
            myTeamName=team.name;

            const room=document.getElementById('player-room-inline');
            const teamName=document.getElementById('display-team-name');
            const title=document.getElementById('player-session-title');
            const exitBtn=document.getElementById('player-exit-btn');
            const manageBtn=document.getElementById('hybrid-view-to-board');

            if(room)room.textContent=currentRoomCode||currentRoom?.name||'--';
            if(teamName)teamName.textContent=team.name;
            if(title)title.textContent='Asta Live';
            if(exitBtn)exitBtn.style.display='none';
            if(manageBtn)manageBtn.style.display='';

            document.getElementById('screen-player-buzzer')?.classList.add('hybrid-auctioneer-player');
            setPlayerConnectionStatus('online');
            updatePlayerTeamStatus();
            return true;
        }

        function restoreHybridPlayerNav(){
            const title=document.getElementById('player-session-title');
            const exitBtn=document.getElementById('player-exit-btn');
            const manageBtn=document.getElementById('hybrid-view-to-board');
            if(title)title.textContent='Asta Live';
            if(exitBtn)exitBtn.style.display='';
            if(manageBtn)manageBtn.style.display='none';
            document.getElementById('screen-player-buzzer')?.classList.remove('hybrid-auctioneer-player');
        }

        function showHybridPlayerForCurrentAuction(){
            if(!configureHybridPlayerIdentity()||!currentAuctionPlayer)return false;

            if(hybridReturnTimer){
                clearTimeout(hybridReturnTimer);
                hybridReturnTimer=null;
            }

            const card=document.getElementById('phone-card-container');
            if(card)card.style.visibility='visible';

            setPlayerImage(document.getElementById('phone-card-image'),currentAuctionPlayer.Id,currentAuctionPlayer.R);
            setPhonePlayerDisplayName(currentAuctionPlayer.Nome||'--',currentAuctionPlayer.Id);
            document.getElementById('phone-player-role').textContent=currentAuctionPlayer.R||'-';
            document.getElementById('phone-player-club').textContent=currentAuctionPlayer.Squadra||'-';

            playerHasBidThisAuction=false;
            currentAuctionValue=0;
            currentWinner='';
            playerSealedSubmitted=false;
            setPlayerAuctionVisualState('neutral');
            setPlayerBidButtonsEnabled(false);
            preparePlayerSealedControls(false);
            closePlayerReadyBanner();

            document.getElementById('player-auction-title').textContent='IN ATTESA';
            const winner=document.getElementById('player-current-winner');
            winner.textContent='Preparazione';
            winner.style.color='var(--text-muted)';
            document.getElementById('player-current-value').textContent='0';
            document.getElementById('player-countdown').textContent='--';

            updatePlayerTeamStatus();
            showScreen('screen-player-buzzer');
            try{window.updateLiveAstaTeamCards?.()}catch(e){}
            return true;
        }

        function showHybridReadyIfNeeded(){
            if(!isAuctioneerPlayerIdentity()||!readyGateWaiting)return;
            const required=readyRequiredIds();

            document.getElementById('player-auction-title').textContent='ATTESA READY';
            document.getElementById('player-current-value').textContent='0';
            document.getElementById('player-countdown').textContent='--';

            const winner=document.getElementById('player-current-winner');
            winner.textContent=required.includes(String(myTeamId))?'Conferma READY':'In attesa degli altri';
            winner.style.color='var(--text-muted)';

            if(required.includes(String(myTeamId))){
                showPlayerReadyBanner({
                    ready_token:readyGateToken,
                    ready_required_ids:required,
                    ready_ids:[...readyPlayers],
                    skip_ids:[...readySkipPlayers],
                    nome:currentAuctionPlayer?.Nome,
                    role:currentAuctionPlayer?.R,
                    club:currentAuctionPlayer?.Squadra
                });
            }else{
                closePlayerReadyBanner();
            }
        }

        function hybridStartNormalPrep(seconds){
            if(!isAuctioneerPlayerIdentity())return;
            playerSealedMode=false;
            playerSealedToken=null;
            preparePlayerSealedControls(false);
            closePlayerReadyBanner();
            startLocalPlayerPreparation(seconds);
        }

        function hybridStartNormalAuction(seconds){
            if(!isAuctioneerPlayerIdentity())return;
            if(playerPrepInterval){
                clearInterval(playerPrepInterval);
                playerPrepInterval=null;
            }

            playerSealedMode=false;
            playerSealedToken=null;
            preparePlayerSealedControls(false);
            closePlayerReadyBanner();

            isAuctionActive=true;
            currentAuctionValue=Math.max(0,parseInt(currentAuctionValue)||0);
            currentWinner=String(currentWinner||'');
            playerHasBidThisAuction=!!currentWinner && currentWinner===myTeamName;

            const timer=document.getElementById('player-countdown');
            timer.textContent=String(seconds);
            timer.classList.remove('prep-countdown','danger','liveasta-last3');

            document.getElementById('player-auction-title').textContent='MIGLIOR OFFERTA';
            const winner=document.getElementById('player-current-winner');
            winner.textContent=currentWinner||'Nessuno';
            winner.style.color=currentWinner?(playerHasBidThisAuction?'var(--accent-green)':'var(--accent-red)'):'var(--text-muted)';
            document.getElementById('player-current-value').textContent=String(currentAuctionValue||0);

            setPlayerAuctionVisualState(playerHasBidThisAuction?'winning':'neutral');
            setPlayerBidButtonsEnabled(true);
            updatePlayerTeamStatus();
        }

        function hybridNormalTick(seconds){
            if(!isAuctioneerPlayerIdentity())return;

            if(
                isAuctionActive &&
                !playerSealedMode &&
                playerNormalBidCooldownUntil>0 &&
                Date.now()>=playerNormalBidCooldownUntil
            ){
                clearPlayerNormalBidCooldown();
                refreshPlayerBidButtons();
            }

            const n=Math.max(0,parseInt(seconds)||0);
            const timer=document.getElementById('player-countdown');
            timer.textContent=String(n);
            timer.classList.toggle('danger',n>0&&n<=3);
            timer.classList.toggle('liveasta-last3',n>0&&n<=3);
        }

        function hybridNormalBidUpdate(){
            if(!isAuctioneerPlayerIdentity())return;

            const winner=document.getElementById('player-current-winner');
            winner.textContent=currentWinner||'Nessuno';

            if(currentWinner===myTeamName){
                playerHasBidThisAuction=true;
                winner.style.color='var(--accent-green)';
                setPlayerAuctionVisualState('winning');
            }else{
                winner.style.color=currentWinner?'var(--accent-red)':'var(--text-muted)';
                setPlayerAuctionVisualState(playerHasBidThisAuction&&currentWinner?'losing':'neutral');
            }

            document.getElementById('player-current-value').textContent=String(currentAuctionValue||0);
            updatePlayerTeamStatus();
            refreshPlayerBidButtons();
        }

        function hybridStartSealedRound(){
            if(!isAuctioneerPlayerIdentity())return;

            closePlayerReadyBanner();
            playerSealedMode=true;
            playerSealedToken=String(sealedAuctionToken||'');
            playerSealedSubmitted=false;
            isAuctionActive=false;
            setPlayerBidButtonsEnabled(false);

            const allowed=sealedEligibleIds.map(String).includes(String(myTeamId));
            preparePlayerSealedControls(allowed);

            document.getElementById('player-auction-title').textContent=sealedRound>1?'SPAREGGIO BUSTA':'BUSTA CHIUSA';

            const winner=document.getElementById('player-current-winner');
            winner.textContent=allowed
                ?(sealedRound>1?'Nuova offerta richiesta':'Inserisci la tua offerta')
                :(sealedRound>1?'Spareggio in corso':'Non puoi partecipare');
            winner.style.color=allowed?'var(--text-main)':'var(--text-muted)';

            document.getElementById('player-current-value').textContent='?';
            startPlayerSealedCountdownSeconds(sealedTimerSeconds,5);
        }

        function hybridStartSealedReveal(seconds){
            if(!isAuctioneerPlayerIdentity())return;

            playerSealedMode=true;
            preparePlayerSealedControls(false);
            document.getElementById('player-auction-title').textContent='APERTURA BUSTE';

            const winner=document.getElementById('player-current-winner');
            winner.textContent='ATTENDI';
            winner.style.color='var(--text-muted)';

            document.getElementById('player-current-value').textContent='?';
            playerSealedRevealLocalEndAt=Date.now()+Math.max(1,parseInt(seconds)||5)*1000;
            startPlayerSealedCountdownSeconds(seconds,2,true);
        }

        function scheduleHybridReturnToBanditore(delay=2400){
            if(!isAuctioneerPlayerIdentity())return;
            if(hybridReturnTimer)clearTimeout(hybridReturnTimer);

            hybridReturnTimer=setTimeout(()=>{
                hybridReturnTimer=null;
                stopPlayerSealedCountdown();
                closePlayerReadyBanner();
                restoreHybridPlayerNav();
                showScreen('screen-auctioneer-board');
                backToList();
            },Math.max(800,parseInt(delay)||2400));
        }

        async function hybridRenderNormalEnd(){
            if(!isAuctioneerPlayerIdentity())return;

            isAuctionActive=false;
            setPlayerBidButtonsEnabled(false);
            await loadRoomState();
            updatePlayerTeamStatus();

            document.getElementById('player-auction-title').textContent=currentWinner?'AGGIUDICATO A':'NESSUNA OFFERTA';

            const winner=document.getElementById('player-current-winner');
            winner.textContent=currentWinner||'INVENDUTO';

            if(currentWinner===myTeamName){
                winner.style.color='var(--accent-green)';
                setPlayerAuctionVisualState('winning');
            }else{
                winner.style.color=currentWinner?'var(--accent-red)':'var(--text-muted)';
                setPlayerAuctionVisualState(playerHasBidThisAuction&&currentWinner?'losing':'neutral');
            }

            document.getElementById('player-current-value').textContent=String(currentAuctionValue||0);
            document.getElementById('player-countdown').textContent='0';
            scheduleHybridReturnToBanditore();
        }

        async function hybridRenderSealedEnd(winnerName,value,noBids=false){
            if(!isAuctioneerPlayerIdentity())return;

            stopPlayerSealedCountdown();
            playerSealedMode=false;
            playerSealedToken=null;
            playerSealedSubmitted=false;
            preparePlayerSealedControls(false);

            await loadRoomState();
            updatePlayerTeamStatus();

            document.getElementById('player-auction-title').textContent='BUSTE APERTE';

            const winner=document.getElementById('player-current-winner');
            winner.textContent=noBids?'INVENDUTO':(winnerName||'--');

            if(noBids){
                winner.style.color='var(--text-muted)';
                setPlayerAuctionVisualState('neutral');
            }else if(String(winnerName||'')===String(myTeamName||'')){
                winner.style.color='var(--accent-green)';
                setPlayerAuctionVisualState('winning');
            }else{
                winner.style.color='var(--accent-red)';
                setPlayerAuctionVisualState('losing');
            }

            document.getElementById('player-current-value').textContent=noBids?'0':String(parseInt(value)||0);
            document.getElementById('player-countdown').textContent='0';
            scheduleHybridReturnToBanditore();
        }


        

        

        

        async function loadRoomState() {
            if (!currentRoomId) return;
            const [{data:teams,error:te},{data:purchases,error:pe},{data:room,error:re}] = await Promise.all([
                supabaseClient.from('fanta_teams').select('*').eq('room_id', currentRoomId).order('created_at'),
                supabaseClient.from('fanta_purchases').select('*').eq('room_id', currentRoomId).order('created_at'),
                supabaseClient.from('fanta_rooms').select('*').eq('id', currentRoomId).single()
            ]);
            if (!te) teamsCache = teams || [];
            if (!pe) purchasesCache = purchases || [];
            if (!re && room) {
                currentRoom = room;
                currentRoomCode = room.name;
                const roomAuctioned = Array.isArray(room.auctioned_ids) ? room.auctioned_ids.map(String) : [];
                const purchasedIds = (purchasesCache || [])
                    .map(x => String(x?.player_id ?? ''))
                    .filter(Boolean);
                auctionedPlayerIds = new Set([...roomAuctioned, ...purchasedIds]);
            }
            refreshPlayerLists();
            updatePlayerTeamStatus();
            updateNominationUI();
            renderOnlinePlayers();
            refreshPlayerListoneIfOpen();
        }


        

        

        


        

        

        

        

        

        

        function roomAuctionExtraSettingsKey(){
            return currentRoomId ? `auction_extra_settings_${currentRoomId}` : '';
        }

        async function loadRoomAuctionExtraSettings(){
            normalBidCooldownMs=DEFAULT_NORMAL_BID_COOLDOWN_MS;
            selfRaiseEnabled=true;
            nominationAutoBidOneEnabled=false;
            autoRandomEnabled=false;
            autoRandomRoles=new Set(['P','D','C','A']);
            const key=roomAuctionExtraSettingsKey();
            if(!key)return;
            try{
                const {data,error}=await supabaseClient.from('fanta_app_data')
                    .select('data').eq('key',key).maybeSingle();
                if(error)throw error;
                const cfg=data?.data||{};
                const ms=parseInt(cfg.normal_bid_cooldown_ms);
                if(Number.isFinite(ms))normalBidCooldownMs=Math.max(100,Math.min(5000,ms));
                selfRaiseEnabled=cfg.self_raise_enabled!==false;
                nominationAutoBidOneEnabled=!!cfg.nomination_auto_bid_one;
                autoRandomEnabled=!!cfg.auto_random_enabled;
                const storedRoles=Array.isArray(cfg.auto_random_roles)?cfg.auto_random_roles:[];
                const validRoles=storedRoles.map(r=>String(r||'').toUpperCase()).filter(r=>['P','D','C','A'].includes(r));
                autoRandomRoles=new Set(validRoles.length?validRoles:['P','D','C','A']);
            }catch(e){
                console.warn('Caricamento impostazioni extra asta non riuscito',e);
            }
        }

        async function saveRoomAuctionExtraSettings(){
            const key=roomAuctionExtraSettingsKey();
            if(!key)return false;
            normalBidCooldownMs=Math.max(100,Math.min(5000,parseInt(normalBidCooldownMs)||DEFAULT_NORMAL_BID_COOLDOWN_MS));
            try{
                const {error}=await supabaseClient.from('fanta_app_data').upsert({
                    key,
                    data:{
                        normal_bid_cooldown_ms:normalBidCooldownMs,
                        self_raise_enabled:!!selfRaiseEnabled,
                        nomination_auto_bid_one:!!nominationAutoBidOneEnabled,
                        auto_random_enabled:!!autoRandomEnabled,
                        auto_random_roles:[...autoRandomRoles]
                    },
                    file_name:'impostazioni-extra-asta',
                    updated_at:new Date().toISOString()
                },{onConflict:'key'});
                if(error)throw error;
                return true;
            }catch(e){
                console.warn('Salvataggio impostazioni extra asta non riuscito',e);
                return false;
            }
        }

        function updateSelfRaiseControlUI(){
            const input=document.getElementById('self-raise-enabled');
            const badge=document.getElementById('self-raise-control-badge');
            const status=document.getElementById('self-raise-control-status');
            if(input)input.checked=!!selfRaiseEnabled;
            const toggle=document.getElementById('self-raise-toggle');
            if(toggle)toggle.setAttribute('aria-checked',selfRaiseEnabled?'true':'false');
            if(badge){
                badge.textContent=selfRaiseEnabled?'ATTIVO':'DISATTIVO';
                badge.classList.toggle('badge-warn',!selfRaiseEnabled);
                badge.classList.toggle('badge-ok',selfRaiseEnabled);
            }
            if(status)status.textContent=selfRaiseEnabled
                ?'Autorilancio consentito: il miglior offerente può rilanciare ancora su se stesso.'
                :'Autorilancio bloccato: il miglior offerente deve attendere il rilancio di un’altra squadra.';
        }

        function toggleSelfRaiseFromUI(event){
            if(event){
                event.preventDefault();
                event.stopPropagation();
            }
            const y=window.scrollY;
            setSelfRaiseEnabled(!selfRaiseEnabled);
            // Su alcuni browser Android il focus di controlli custom può provare a ricentrare la viewport.
            // Manteniamo esplicitamente la posizione corrente della pagina.
            requestAnimationFrame(()=>{
                if(Math.abs(window.scrollY-y)>1)window.scrollTo(0,y);
            });
        }

        async function setSelfRaiseEnabled(enabled){
            selfRaiseEnabled=!!enabled;
            updateSelfRaiseControlUI();
            refreshPlayerBidButtons();
            const saved=await saveRoomAuctionExtraSettings();
            if(!saved){
                console.warn('Impostazione autorilancio non salvata.');
                return;
            }
            // Aggiorna gli eventuali giocatori collegati senza attendere una nuova asta.
            if(channel)channel.send({
                type:'broadcast',
                event:'self_raise_setting',
                payload:{enabled:selfRaiseEnabled}
            }).catch(()=>{});
        }

        async function setNominationAutoBidOne(enabled){
            nominationAutoBidOneEnabled=!!enabled;
            const input=document.getElementById('nomination-auto-bid-one');
            if(input)input.checked=nominationAutoBidOneEnabled;
            await saveRoomAuctionExtraSettings();
        }

        function nominationAutoBidTeam(){
            if(!nominationState.enabled || !nominationAutoBidOneEnabled || sealedAuctionModeActive || !currentAuctionPlayer)return null;
            const team=currentNominationTeam();
            if(!team)return null;
            const max=maxBidForTeam(team,currentAuctionPlayer.R);
            return max>=1?team:null;
        }

        function autoRandomSelectedRolesFromControl(){
            return ['P','D','C','A'].filter(role=>document.getElementById('auto-random-role-'+role)?.checked);
        }

        function renderAutoRandomControlUI(){
            const master=document.getElementById('auto-random-enabled');
            if(master)master.checked=!!autoRandomEnabled;
            ['P','D','C','A'].forEach(role=>{
                const el=document.getElementById('auto-random-role-'+role);
                if(el)el.checked=autoRandomRoles.has(role);
            });
            const status=document.getElementById('auto-random-status');
            if(status){
                const roles=[...autoRandomRoles].join(' · ')||'nessun ruolo';
                status.innerHTML=autoRandomEnabled
                    ? `ATTIVO · ruoli <b>${escapeHtml(roles)}</b> · la prossima asta parte automaticamente.`
                    : `DISATTIVO · ruoli predisposti <b>${escapeHtml(roles)}</b>.`;
                status.classList.toggle('active',!!autoRandomEnabled);
            }
        }

        function autoRandomHasBidderForRole(role){
            const r=String(role||'').toUpperCase();
            if(!r)return false;
            if(isMantraRoom())return teamsCache.some(team=>maxBidForTeam(team,r)>=1);
            const limits=roomLimits();
            if(limits[r]===undefined || (limits[r]||0)<=0)return false;
            return teamsCache.some(team=>{
                const counts=teamCounts(team.id);
                return counts.total<totalRoomSlots() && (counts[r]||0)<(limits[r]||0) && maxBidForTeam(team,r)>=1;
            });
        }

        function autoRandomCandidates(){
            const allowed=new Set([...autoRandomRoles].map(r=>String(r).toUpperCase()));
            if(!allowed.size)return [];
            return getAvailablePlayers().filter(player=>{
                const role=String(playerRole(player)||'').toUpperCase();
                return allowed.has(role) && autoRandomHasBidderForRole(role);
            });
        }

        function cancelAutoRandomLaunch(){
            if(autoRandomLaunchTimer){clearTimeout(autoRandomLaunchTimer);autoRandomLaunchTimer=null;}
            autoRandomStarting=false;
        }

        function scheduleAutoRandomAuction(delay=250){
            cancelAutoRandomLaunch();
            if(!autoRandomEnabled)return;
            autoRandomLaunchTimer=setTimeout(()=>{
                autoRandomLaunchTimer=null;
                startAutoRandomAuctionNow();
            },Math.max(0,parseInt(delay)||0));
        }

        async function startAutoRandomAuctionNow(){
            if(!autoRandomEnabled || autoRandomStarting || !currentRoomId)return false;
            if(nominationState.enabled)return false;
            if(isAuctionActive || readyGateWaiting || auctionPrepInterval || sealedAuctionModeActive)return false;

            const candidates=autoRandomCandidates();
            if(!candidates.length){
                autoRandomEnabled=false;
                cancelAutoRandomLaunch();
                await saveRoomAuctionExtraSettings();
                renderAutoRandomControlUI();
                alert('AUTO RANDOM terminato: non ci sono più giocatori disponibili nei ruoli selezionati con almeno una squadra abilitata a offrire.');
                return false;
            }

            autoRandomStarting=true;
            try{
                const player=candidates[Math.floor(Math.random()*candidates.length)];
                // Se si parte da Gestione, riporta prima il banditore alla plancia.
                if(document.getElementById('screen-room-control')?.classList.contains('active'))closeRoomControl();
                selectAndStartPlayer(player.Id,true);
                return true;
            }finally{
                setTimeout(()=>{autoRandomStarting=false;},120);
            }
        }

        async function setAutoRandomEnabled(enabled){
            const selected=autoRandomSelectedRolesFromControl();
            if(enabled && !selected.length){
                alert('Seleziona almeno un ruolo tra P, D, C e A.');
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
        }

        async function setAutoRandomRole(role,checked){
            const r=String(role||'').toUpperCase();
            if(!['P','D','C','A'].includes(r))return;
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
        }

        function sealedBidsStateKey(token=sealedAuctionToken){
            return currentRoomId && token ? `sealed_bids_${currentRoomId}_${token}` : '';
        }

        async function persistSealedBids(){
            const key=sealedBidsStateKey();
            if(!key)return;
            const bids=[...sealedBids.values()].map(x=>({
                team_id:String(x.team_id),
                team_name:String(x.team_name||''),
                amount:parseInt(x.amount)||0,
                at:Number(x.at)||Date.now()
            }));
            try{
                await supabaseClient.from('fanta_app_data').upsert({
                    key,
                    data:{
                        token:sealedAuctionToken,
                        player_id:String(currentAuctionPlayer?.Id||''),
                        bids,
                        updated_at:new Date().toISOString()
                    },
                    file_name:'buste-asta',
                    updated_at:new Date().toISOString()
                },{onConflict:'key'});
            }catch(e){console.warn('Persistenza buste non riuscita',e);}
        }

        async function clearPersistedSealedBids(token=sealedAuctionToken){
            const key=sealedBidsStateKey(token);
            if(!key)return;
            try{
                await supabaseClient.from('fanta_app_data').upsert({
                    key,
                    data:{token,player_id:null,bids:[],closed:true,updated_at:new Date().toISOString()},
                    file_name:'buste-asta-chiuse',
                    updated_at:new Date().toISOString()
                },{onConflict:'key'});
            }catch(e){}
        }

        function readyModeStateKey(){ return currentRoomId ? `auction_ready_${currentRoomId}` : ''; }

        function readyModeLocalKey(){
            return currentRoomId ? `fanta_ready_mode_${currentRoomId}` : '';
        }

        async function loadReadyMode(){
            if(!currentRoomId){updateReadyControlUI();return readyModeEnabled;}

            // Non azzerare mai il valore solo perché una lettura fallisce o torna vuota.
            // Usa anche un backup locale sul dispositivo del banditore.
            try{
                const local=localStorage.getItem(readyModeLocalKey());
                if(local==='1') readyModeEnabled=true;
                else if(local==='0') readyModeEnabled=false;
            }catch(e){}

            try{
                const {data,error}=await supabaseClient
                    .from('fanta_app_data')
                    .select('data')
                    .eq('key',readyModeStateKey())
                    .maybeSingle();

                if(error) throw error;

                if(typeof data?.data?.enabled==='boolean'){
                    readyModeEnabled=data.data.enabled;
                    try{localStorage.setItem(readyModeLocalKey(),readyModeEnabled?'1':'0');}catch(e){}
                }
            }catch(e){
                console.warn('Lettura modalità READY non riuscita: mantengo il valore precedente.',e);
            }

            // Se c'è già un gate READY aperto, la funzione è per definizione attiva.
            const gate=await loadReadyGateState();
            if(gate?.active){
                readyModeEnabled=true;
            }

            updateReadyControlUI();
            return readyModeEnabled;
        }

        async function saveReadyMode(){
            if(!currentRoomId)return false;
            try{localStorage.setItem(readyModeLocalKey(),readyModeEnabled?'1':'0');}catch(e){}

            const {error}=await supabaseClient.from('fanta_app_data').upsert({
                key:readyModeStateKey(),
                data:{enabled:!!readyModeEnabled},
                file_name:'ready-pre-asta',
                updated_at:new Date().toISOString()
            },{onConflict:'key'});

            if(error){
                console.warn('Salvataggio modalità READY non riuscito',error);
                return false;
            }
            return true;
        }

        async function toggleReadyMode(){
            const gate=await loadReadyGateState();

            if(readyModeEnabled && gate?.active){
                if(!await appConfirm('C’è una richiesta READY in corso. Disattivando la funzione verrà annullata questa attesa. Continuare?')){
                    return;
                }
                await closeReadyGateDedicated();
                readyGateWaiting=false;
                readyGateToken=null;
                readyPlayers=new Set();
                readyOfflineExcludedIds=new Set();
            }

            readyModeEnabled=!readyModeEnabled;
            await saveReadyMode();
            updateReadyControlUI();
            renderRoomControl();
        }

        function updateReadyControlUI(){
            const badge=document.getElementById('ready-control-badge');
            const btn=document.getElementById('ready-toggle-btn');
            const st=document.getElementById('ready-control-status');
            if(badge){badge.textContent=readyModeEnabled?'ATTIVO':'DISATTIVO';badge.classList.toggle('active',readyModeEnabled);}
            if(btn){btn.textContent=readyModeEnabled?'Disattiva READY':'Attiva READY';btn.setAttribute('aria-checked',String(readyModeEnabled));}
            if(st)st.textContent=readyModeEnabled?'Il countdown parte quando tutte le squadre abilitate hanno risposto. Se almeno uno sceglie READY, partecipano tutti; se fanno tutti SKIP il giocatore è subito invenduto.':'Il countdown parte subito dopo la scelta del calciatore.';
        }


        function readyGateStateKey(){
            return currentRoomId ? `ready_gate_${currentRoomId}` : '';
        }

        async function saveReadyGateDedicated(active=true){
            if(!currentRoomId)return;

            const payload={
                active:!!active,
                token:active?readyGateToken:null,
                player:active?livePlayerSnapshot():null,
                required_ids:active?readyRequiredIds():[],
                ready_ids:active?[...readyPlayers]:[],
                skip_ids:active?[...readySkipPlayers]:[],
                offline_excluded_ids:active?[...readyOfflineExcludedIds]:[],
                mode:active&&sealedAuctionModeActive?'sealed':'normal',
                sealed_token:active&&sealedAuctionModeActive?sealedAuctionToken:null,
                sealed_seconds:active&&sealedAuctionModeActive?sealedTimerSeconds:null,
                sealed_round:active&&sealedAuctionModeActive?sealedRound:1,
                sealed_eligible_ids:active&&sealedAuctionModeActive?sealedEligibleIds:[],
                updated_at:new Date().toISOString()
            };

            try{
                const {error}=await supabaseClient.from('fanta_app_data').upsert({
                    key:readyGateStateKey(),
                    data:payload,
                    file_name:'ready-gate',
                    updated_at:new Date().toISOString()
                },{onConflict:'key'});
                if(error)throw error;
            }catch(e){
                console.warn('Salvataggio READY gate non riuscito',e);
            }
        }

        async function loadReadyGateState(){
            if(!currentRoomId)return null;
            try{
                const {data,error}=await supabaseClient
                    .from('fanta_app_data')
                    .select('data')
                    .eq('key',readyGateStateKey())
                    .maybeSingle();
                if(error)throw error;
                return data?.data||null;
            }catch(e){
                console.warn('Lettura READY gate non riuscita',e);
                return null;
            }
        }

        async function closeReadyGateDedicated(){
            await saveReadyGateDedicated(false);
        }

        async function restorePlayerReadyGateFirst(){
            const gate=await loadReadyGateState();
            if(!gate?.active)return false;

            // Il gate READY ha priorità assoluta su prep/asta/turno.
            const required=Array.isArray(gate.required_ids)?gate.required_ids.map(String):[];
            const already=Array.isArray(gate.ready_ids)?gate.ready_ids.map(String):[];
            const skipped=Array.isArray(gate.skip_ids)?gate.skip_ids.map(String):[];

            if(!required.includes(String(myTeamId))){
                closePlayerReadyBanner();
                return false;
            }

            const p=gate.player||{};
            playerSealedMode=gate.mode==='sealed';
            playerSealedToken=playerSealedMode?String(gate.sealed_token||''):null;
            playerSealedSubmitted=false;
            currentAuctionPlayer=playersList.find(x=>String(x.Id)===String(p.id))||{
                Id:p.id,Nome:p.nome,R:p.role,Squadra:p.club,FVM:p.fvm
            };

            if(p.url){
                const img=document.getElementById('phone-card-image');
                if(img)img.src=p.url;
            }
            const card=document.getElementById('phone-card-container');
            if(card)card.style.visibility='visible';
            const name=document.getElementById('phone-player-name');
            const role=document.getElementById('phone-player-role');
            const club=document.getElementById('phone-player-club');
            if(name)setPhonePlayerDisplayName(p.nome||'--',p.id);
            if(role)role.textContent=p.role||'-';
            if(club)club.textContent=p.club||'-';

            isAuctionActive=false;
            setPlayerBidButtonsEnabled(false);
            closeNominationPicker();

            document.getElementById('player-auction-title').textContent='ATTESA READY';
            document.getElementById('player-current-winner').textContent='In attesa';
            document.getElementById('player-current-value').textContent='0';
            document.getElementById('player-countdown').textContent='--';

            preparePlayerSealedControls(false);
            showPlayerReadyBanner({
                ready_token:gate.token,
                ready_required_ids:required,
                ready_ids:already,
                skip_ids:skipped,
                nome:p.nome,
                role:p.role,
                club:p.club
            });

            return true;
        }

        async function restoreAuctioneerReadyGateFirst(){
            const gate=await loadReadyGateState();
            if(!gate?.active)return false;

            const p=gate.player||{};
            sealedAuctionModeActive=gate.mode==='sealed';
            sealedAuctionToken=sealedAuctionModeActive?String(gate.sealed_token||''):null;
            sealedTimerSeconds=sealedAuctionModeActive?Math.max(5,parseInt(gate.sealed_seconds)||sealedTimerSeconds):sealedTimerSeconds;
            sealedRound=sealedAuctionModeActive?Math.max(1,parseInt(gate.sealed_round)||1):1;
            sealedEligibleIds=sealedAuctionModeActive?(gate.sealed_eligible_ids||[]).map(String):[];
            currentAuctionPlayer=playersList.find(x=>String(x.Id)===String(p.id))||{
                Id:p.id,Nome:p.nome,R:p.role,Squadra:p.club,FVM:p.fvm
            };

            readyGateWaiting=true;
            readyGateToken=String(gate.token||'');
            readyPlayers=new Set((gate.ready_ids||[]).map(String));
            readySkipPlayers=new Set((gate.skip_ids||[]).map(String));
            readyOfflineExcludedIds=new Set(); // offline non esclude dal READY

            // Mostra il giocatore corretto e la fase READY.
            restoreAuctioneerVisualFromState({player:p});
            updateReadyGateDisplay();
            return true;
        }

        function readyRequiredTeams(includeAbsent=false){
            const role=String(currentAuctionPlayer?.R||'');
            const limits=roomLimits();

            let eligible;
            if(isMantraRoom()){
                if(!role)return [];
                eligible=teamsCache.filter(team=>maxBidForTeam(team,role)>=1);
            }else{
                const classicRole=role.toUpperCase();
                if(!classicRole || limits[classicRole]===undefined) return [];
                eligible=teamsCache.filter(team=>{
                    const counts=teamCounts(team.id);
                    const totalComplete=counts.total>=totalRoomSlots();
                    const roleComplete=(counts[classicRole]||0)>=(limits[classicRole]||0);
                    return !totalComplete && !roleComplete;
                });
            }

            // Modalità ASSENTE:
            // il READY non deve MAI aspettare una squadra assente.
            // Questo vale anche con banditura a turni attiva.
            // L'assenza NON modifica però l'ordine dei turni di banditura:
            // quando arriva il suo turno, quella squadra deve comunque bandire.
            if(!includeAbsent && absentTeamIds.size){
                eligible=eligible.filter(team=>!absentTeamIds.has(String(team.id)));
            }

            // OFFLINE NON ESCLUDE DAL READY.
            // Se un giocatore perde connessione resta nella lista e continua a essere
            // obbligatorio. Le sole esclusioni valide sono ASSENTE volontario e slot/reparto completato.

            // In busta chiusa il READY riguarda solo chi può partecipare
            // a QUEL round. Nel round 2+ sono quindi soltanto i pari merito.
            if(sealedAuctionModeActive && Array.isArray(sealedEligibleIds) && sealedEligibleIds.length){
                const allowed=new Set(sealedEligibleIds.map(String));
                return eligible.filter(team=>allowed.has(String(team.id)));
            }

            return eligible;
        }


        function readyMarkTeamOffline(teamId){
            // la disconnessione non modifica mai i partecipanti obbligati al READY.
            // Manteniamo la funzione come no-op per compatibilità con gli eventi realtime esistenti.
            return;
        }

        function readyMarkTeamOnline(teamId){
            // Nessun reinserimento necessario: gli offline non vengono più esclusi.
            return;
        }

        function presenceTeamIdsFromPayload(payload,field){
            const source=payload?.[field];
            if(!Array.isArray(source))return [];
            return source.map(p=>String(p?.team_id||'')).filter(Boolean);
        }

        function handleReadyPresenceLeave(payload){
            // offline = ancora obbligatorio. Nessuna modifica al gate READY.
            return;
        }

        function handleReadyPresenceJoin(payload){
            // Il giocatore era già presente nel gate anche mentre offline.
            return;
        }

        function readyVisibleTeamIds(required){
            const named=new Set(teamsCache.filter(t=>t.id!=null&&String(t.name||'').trim()).map(t=>String(t.id)));
            const absent=readyRequiredTeams(true).map(t=>String(t.id)).filter(id=>absentTeamIds.has(id));
            return [...new Set([...required,...absent].map(String))].filter(id=>named.has(id));
        }

        function readyRequiredIds(){
            return readyRequiredTeams().map(t=>String(t.id));
        }

        function readyTeamName(id){
            return teamsCache.find(t=>String(t.id)===String(id))?.name||'Squadra';
        }

        function beginReadyGate(){
            readyGateWaiting=true;
            readyPlayers=new Set();
            readySkipPlayers=new Set();
            readyOfflineExcludedIds=new Set();
            readyGateToken=`${currentRoomId}_${currentAuctionPlayer?.Id}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
            persistReadyGateState();
            saveReadyGateDedicated(true);
        }


        function persistReadyGateState(){
            if(!readyGateWaiting)return;
            const req=readyRequiredIds();
            const snapshot={
                phase:'ready',
                player:livePlayerSnapshot(),
                ready_token:readyGateToken,
                ready_required_ids:req,
                ready_ids:[...readyPlayers],
                skip_ids:[...readySkipPlayers],
                offline_excluded_ids:[...readyOfflineExcludedIds],
                winner:'',
                value:0,
                seconds:0,
                deadline_at:null,
                mode:sealedAuctionModeActive?'sealed':'normal',
                sealed_token:sealedAuctionModeActive?sealedAuctionToken:null,
                sealed_seconds:sealedAuctionModeActive?sealedTimerSeconds:null,
                sealed_round:sealedAuctionModeActive?sealedRound:1,
                sealed_eligible_ids:sealedAuctionModeActive?sealedEligibleIds:[]
            };
            liveAuctionState={...(liveAuctionState||{}),...snapshot,updated_at:new Date().toISOString()};
            saveLiveAuctionState(snapshot);
            saveReadyGateDedicated(true);
        }

        function broadcastReadyState(){
            if(!channel||!readyGateToken)return;
            const req=readyRequiredIds();
            const count=req.filter(id=>readyPlayers.has(String(id))).length;
            channel.send({type:'broadcast',event:'ready_state',payload:{
                token:readyGateToken,
                ready_count:count,
                total:req.length,
                waiting:readyGateWaiting,
                required_ids:req,
                ready_ids:[...readyPlayers],
                skip_ids:[...readySkipPlayers],
                offline_excluded_ids:[...readyOfflineExcludedIds]
            }}).catch(()=>{});
        }

        function updateReadyGateDisplay(){
            if(!readyGateWaiting)return;
            showAuctioneerReadyStage();
        }

        function evaluateReadyGate(){
            if(!readyGateWaiting)return;

            const req=readyRequiredIds();
            updateReadyGateDisplay();
            broadcastReadyState();

            // OFFLINE continua a essere obbligatorio.
            // Solo la modalità ASSENTE esplicita toglie una squadra dal READY.
            // La banditura a turni resta comunque obbligatoria nel suo turno.
            const allAnswered=req.length===0 || req.every(id=>readyPlayers.has(String(id)));
            if(!allAnswered){
                persistReadyGateState();
                return;
            }

            const allSkipped=req.length>0 && req.every(id=>readySkipPlayers.has(String(id)));
            readyGateWaiting=false;
            broadcastReadyState();
            closeReadyGateDedicated();

            // nuova semantica READY/SKIP:
            // - se TUTTI scelgono SKIP => invenduto immediato a 0;
            // - se anche UNA sola squadra sceglie READY => l'asta parte e TUTTE
            //   le squadre abilitate possono partecipare, comprese quelle che avevano SKIP.
            if(allSkipped){
                sealedAuctionModeActive=false;
                sealedAuctionToken=null;
                sealedEligibleIds=[];
                currentWinner='';
                currentAuctionValue=0;
                playerSkippedCurrentAuction=false;
                showAuctionPanels();
                endAuction(true);
                return;
            }

            // Da questo momento SKIP non è più un vincolo individuale: serviva solo
            // a capire se la risposta era unanime. Ripuliamo lo stato prima dell'asta
            // così reconnect, busta chiusa e offerte normali vedono tutti come abilitati.
            readySkipPlayers=new Set();
            playerSkippedCurrentAuction=false;

            if(sealedAuctionModeActive){
                startSealedAuctionTimer();
            }else{
                startCountdown();
            }
        }

        function syncPlayerReadyReopenButton(){
            const reopen=document.getElementById('player-ready-reopen-btn');
            if(!reopen)return;

            const overlayOpen=!!document.getElementById('player-ready-overlay')?.classList.contains('open');
            const hasReady=!!playerReadyToken;

            // Il pulsante serve solo quando l'utente ha chiuso volontariamente
            // la schermata READY mentre quel READY è ancora valido.
            const dismissed=hasReady && String(playerReadyDismissedToken||'')===String(playerReadyToken);

            reopen.style.display=(dismissed && !overlayOpen)?'block':'none';
            reopen.classList.toggle('done',!!playerReadySent);

            const title=reopen.querySelector('span');
            const strong=reopen.querySelector('strong');
            if(title)title.textContent=playerReadySent?'READY GIÀ INVIATO':'READY IN ATTESA';
            if(strong)strong.textContent=playerReadySent?'VEDI ATTESA READY':'RIAPRI READY';
        }

        function playerReadyFvmValue(){
            const player=currentAuctionPlayer;
            if(!player)return '--';
            const value=playerListoneNumericValue(player);
            return Number.isFinite(value)?String(value):'--';
        }

        function playerReadyNominatorId(){
            return nominationState.enabled && nominationState.turn_team_id
                ? String(nominationState.turn_team_id)
                : '';
        }

        function renderPlayerReadySidePanel(){
            const side=document.getElementById('player-live-side');
            const panel=document.getElementById('player-ready-side-panel');
            const list=document.getElementById('player-ready-team-list');
            const fvm=document.getElementById('player-ready-fvm-value');
            if(!side||!panel||!list)return;

            const required=(playerReadyRequiredIds||[]).map(String);
            const readySet=new Set((playerReadyIds||[]).map(String));
            const nominatorId=playerReadyNominatorId();

            if(fvm)fvm.textContent=playerReadyFvmValue();

            const rows=readyVisibleTeamIds(required)
                .map(id=>teamsCache.find(t=>String(t.id)===String(id)))
                .filter(Boolean)
                .sort((a,b)=>{
                    const aNom=String(a.id)===nominatorId?0:1;
                    const bNom=String(b.id)===nominatorId?0:1;
                    return aNom-bNom || String(a.name||'').localeCompare(String(b.name||''),'it',{sensitivity:'base'});
                });

            list.innerHTML=rows.length?rows.map(team=>{
                const id=String(team.id);
                const absent=absentTeamIds.has(id);
                const done=readySet.has(id);
                const nominated=nominatorId && id===nominatorId;
                return `<div class="player-ready-team-row${absent?' absent':''}${done?' ready':''}${nominated?' nominator':''}">
                    <div class="player-ready-team-copy">
                        <strong>${escapeHtml(team.name||'Squadra')}</strong>
                        ${nominated?'<small>HA BANDITO</small>':''}
                    </div>
                    <span class="player-ready-team-status">${absent?'ASSENTE':done?'PRONTO':'IN ATTESA'}</span>
                    <span class="player-ready-team-dot"></span>
                </div>`;
            }).join(''):'<div class="player-ready-team-empty">Nessuna squadra abilitata</div>';

            side.classList.add('ready-phase');
            panel.setAttribute('aria-hidden','false');
        }

        function setPlayerReadyChoiceControls(show,eligible=true){
            const normal=document.getElementById('normal-bid-controls');
            const box=document.getElementById('player-ready-choice-controls');
            const readyBtn=document.getElementById('player-ready-choice-ready');
            const skipBtn=document.getElementById('player-ready-choice-skip');
            if(!normal||!box)return;

            if(show)syncSealedBidAreaHeight();
            normal.classList.toggle('ready-choice-active',!!show);
            box.classList.toggle('visible',!!show);
            box.setAttribute('aria-hidden',show?'false':'true');

            if(!show)return;

            const sent=!!playerReadySent;
            const choice=String(playerReadyChoice||'');
            if(readyBtn){
                readyBtn.disabled=!eligible||sent;
                readyBtn.classList.toggle('selected',sent&&choice==='ready');
                readyBtn.textContent=sent&&choice==='ready'?'PRONTO ✓':'READY';
            }
            if(skipBtn){
                skipBtn.disabled=!eligible||sent;
                skipBtn.classList.toggle('selected',sent&&choice==='skip');
                skipBtn.textContent=sent&&choice==='skip'?'SKIP ✓':'SKIP';
            }
        }

        function showPlayerReadyBanner(data,forceOpen=false){
            stopPlayerSealedCountdown();
            playerSealedRevealLocalEndAt=0;

            const required=Array.isArray(data?.ready_required_ids)
                ? data.ready_required_ids.map(String)
                : [];
            const already=Array.isArray(data?.ready_ids)
                ? data.ready_ids.map(String)
                : [];
            const skipped=Array.isArray(data?.skip_ids)
                ? data.skip_ids.map(String)
                : [];

            playerReadyRequiredIds=required;
            playerReadyIds=already;

            const incomingToken=String(data?.ready_token||'');
            const tokenChanged=String(playerReadyToken||'')!==incomingToken;
            if(tokenChanged){
                playerReadyChoice=null;
                playerSkippedCurrentAuction=false;
            }
            playerReadyToken=incomingToken;

            const eligible=required.includes(String(myTeamId)) && playerAvailabilityMode!=='absent' && !absentTeamIds.has(String(myTeamId));
            const alreadyReady=already.includes(String(myTeamId));
            playerReadySent=alreadyReady;

            if(alreadyReady && skipped.includes(String(myTeamId))){
                playerReadyChoice='skip';
                playerSkippedCurrentAuction=true;
            }else if(alreadyReady && !playerReadyChoice){
                playerReadyChoice='ready';
            }

            // il READY non usa più un banner sovrapposto.
            document.getElementById('player-ready-overlay')?.classList.remove('open');
            const reopen=document.getElementById('player-ready-reopen-btn');
            if(reopen)reopen.style.display='none';

            renderPlayerReadySidePanel();
            setPlayerReadyChoiceControls(eligible,eligible);

            // Le squadre non abilitate vedono comunque FVM e lista partecipanti,
            // ma non ricevono i pulsanti READY/SKIP.
            if(!eligible){
                setPlayerReadyChoiceControls(false,false);
            }
        }

        function hidePlayerReadyBanner(){
            // Compatibilità con vecchi richiami: non c'è più un banner da chiudere.
            document.getElementById('player-ready-overlay')?.classList.remove('open');
        }

        function reopenPlayerReadyBanner(){
            // Compatibilità il READY ora è integrato nella schermata asta.
            if(playerReadyToken)renderPlayerReadySidePanel();
        }

        function closePlayerReadyBanner(){
            document.getElementById('player-ready-overlay')?.classList.remove('open');
            document.getElementById('player-live-side')?.classList.remove('ready-phase');
            document.getElementById('player-ready-side-panel')?.setAttribute('aria-hidden','true');
            setPlayerReadyChoiceControls(false,false);
            playerReadyToken=null;
            playerReadySent=false;
            playerReadyChoice=null;
            playerReadyRequiredIds=[];
            playerReadyIds=[];
            playerReadyDismissedToken=null;
            const reopen=document.getElementById('player-ready-reopen-btn');
            if(reopen)reopen.style.display='none';
        }

        function confirmPlayerReady(choice='ready'){
            if(playerAvailabilityMode==='absent'||absentTeamIds.has(String(myTeamId)))return;
            const selected=choice==='skip'?'skip':'ready';
            if(!playerReadyToken||playerReadySent||!myTeamId)return;
            if(!isAuctioneerPlayerIdentity()&&!channel)return;

            playerReadySent=true;
            playerReadyChoice=selected;
            playerSkippedCurrentAuction=selected==='skip';
            if(!playerReadyIds.includes(String(myTeamId)))playerReadyIds.push(String(myTeamId));
            renderPlayerReadySidePanel();
            setPlayerReadyChoiceControls(true,true);

            if(isAuctioneerPlayerIdentity()){
                if(readyGateWaiting && String(playerReadyToken)===String(readyGateToken)){
                    readyPlayers.add(String(myTeamId));
                    if(selected==='skip')readySkipPlayers.add(String(myTeamId));
                    else readySkipPlayers.delete(String(myTeamId));
                    persistReadyGateState();
                    evaluateReadyGate();
                }
                return;
            }

            channel.send({type:'broadcast',event:'player_ready',payload:{
                token:playerReadyToken,team_id:myTeamId,team_name:myTeamName,choice:selected
            }}).catch(()=>{});
        }

        function updatePlayerReadyProgress(data){
            if(!playerReadyToken||String(data?.token)!==String(playerReadyToken))return;

            if(data?.waiting===false){
                playerSkippedCurrentAuction=false;
                closePlayerReadyBanner();
                return;
            }

            if(Array.isArray(data?.required_ids))playerReadyRequiredIds=data.required_ids.map(String);
            if(Array.isArray(data?.ready_ids))playerReadyIds=data.ready_ids.map(String);
            const skipped=Array.isArray(data?.skip_ids)?data.skip_ids.map(String):[];
            if(playerReadyIds.includes(String(myTeamId))){
                playerReadySent=true;
                if(skipped.includes(String(myTeamId))){
                    playerReadyChoice='skip';
                    playerSkippedCurrentAuction=true;
                }else if(!playerReadyChoice){
                    playerReadyChoice='ready';
                }
            }
            renderPlayerReadySidePanel();
            setPlayerReadyChoiceControls(playerReadyRequiredIds.includes(String(myTeamId)),playerReadyRequiredIds.includes(String(myTeamId)));
        }

        function liveAuctionStateKey(){
            return currentRoomId ? `live_auction_${currentRoomId}` : '';
        }

        function livePlayerSnapshot(){
            if(!currentAuctionPlayer) return null;
            return {
                id:String(currentAuctionPlayer.Id??''),
                nome:String(currentAuctionPlayer.Nome||''),
                role:String(currentAuctionPlayer.R||''),
                club:String(currentAuctionPlayer.Squadra||''),
                fvm:playerListoneNumericValue(currentAuctionPlayer),
                url:playerImageUrl(currentAuctionPlayer.Id,currentAuctionPlayer.R)
            };
        }

        function liveStateForBroadcast(){
            if(!liveAuctionState)return null;
            const state={...liveAuctionState};

            if(state.phase==='sealed'){
                const remaining=Math.max(0,Math.ceil((Number(sealedDeadlineAt||state.sealed_deadline_at||state.deadline_at)-Date.now())/1000));
                state.client_countdown_seconds=Math.min(
                    Math.max(5,parseInt(state.sealed_seconds)||parseInt(sealedTimerSeconds)||30),
                    remaining
                );
            }else if(state.phase==='sealed_reveal'){
                const remaining=Math.max(0,Math.ceil((Number(sealedRevealDeadlineAt||state.deadline_at)-Date.now())/1000));
                state.client_countdown_seconds=Math.min(
                    Math.max(1,parseInt(state.sealed_seconds)||parseInt(sealedRevealSeconds)||5),
                    remaining
                );
            }

            return state;
        }

        async function saveLiveAuctionState(patch={}){
            if(!currentRoomId)return;

            // Una nuova fase non deve ereditare la classifica della busta precedente.
            if(
                ['idle','ready','prep','active','sealed','sealed_reveal'].includes(String(patch?.phase||'')) &&
                !Object.prototype.hasOwnProperty.call(patch,'sealed_ranking')
            ){
                patch={sealed_ranking:[],...patch};
            }

            liveAuctionState={...(liveAuctionState||{}),...patch,updated_at:new Date().toISOString()};
            try{
                await supabaseClient.from('fanta_app_data').upsert({
                    key:liveAuctionStateKey(),
                    data:liveAuctionState,
                    file_name:'stato-live-asta',
                    updated_at:new Date().toISOString()
                },{onConflict:'key'});
            }catch(e){console.warn('Salvataggio stato live non riuscito',e);}
        }

        async function loadLiveAuctionState(){
            liveAuctionState=null;
            if(!currentRoomId)return null;
            try{
                const {data,error}=await supabaseClient.from('fanta_app_data')
                    .select('data').eq('key',liveAuctionStateKey()).maybeSingle();
                if(error)throw error;
                liveAuctionState=data?.data||null;
            }catch(e){console.warn('Caricamento stato live non riuscito',e);}
            return liveAuctionState;
        }

        function liveRemainingSeconds(state){
            const deadline=Number(state?.deadline_at)||0;
            if(deadline)return Math.max(0,Math.ceil((deadline-Date.now())/1000));
            return Math.max(0,parseInt(state?.seconds)||0);
        }

        function normalAuctionConfiguredSeconds(){
            const n=parseInt(currentRoom?.timer_seconds ?? auctionTimeLimit);
            return Math.max(1,Math.min(60,Number.isFinite(n)?n:5));
        }

        function clampNormalAuctionSeconds(value){
            const n=Math.max(0,parseInt(value)||0);
            return Math.min(normalAuctionConfiguredSeconds(),n);
        }

        function normalLiveRemainingSeconds(state){
            return clampNormalAuctionSeconds(liveRemainingSeconds(state));
        }

        function applyLivePlayerBase(state){
            const p=state?.player;
            if(!p)return false;
            currentAuctionPlayer=playersList.find(x=>String(x.Id)===String(p.id))||{
                Id:p.id,Nome:p.nome,R:p.role,Squadra:p.club,FVM:p.fvm
            };
            const img=document.getElementById('phone-card-image');
            if(img)setPlayerImage(img,p.id,p.role);
            const card=document.getElementById('phone-card-container');
            if(card)card.style.visibility='visible';
            const name=document.getElementById('phone-player-name');
            const role=document.getElementById('phone-player-role');
            const club=document.getElementById('phone-player-club');
            if(name)setPhonePlayerDisplayName(p.nome||'--',p.id);
            if(role)role.textContent=p.role||'-';
            if(club)club.textContent=p.club||'-';
            return true;
        }

        async function restorePlayerFromLiveState(stateOverride=null){
            await loadRoomState();
            await loadNominationState();
            await loadReadyMode();

            // Prima di qualsiasi altro stato, verifica se esiste un READY ancora aperto.
            if(await restorePlayerReadyGateFirst()){
                return;
            }

            const state=stateOverride || await loadLiveAuctionState();
            if(stateOverride) liveAuctionState=stateOverride;

            if(!state||!state.phase||state.phase==='idle'){
                closePlayerReadyBanner();
                playerSkippedCurrentAuction=false;
                isAuctionActive=false;
                setPlayerBidButtonsEnabled(false);
                updateNominationUI();
                if(isMyNominationTurn())autoOpenNominationPicker();
                else closeNominationPicker();
                return;
            }

            nominationRequestPending=false;
            closeNominationPicker();
            applyLivePlayerBase(state);
            playerHasBidThisAuction=false;
            playerSkippedCurrentAuction=(Array.isArray(state.skip_ids)?state.skip_ids.map(String):[]).includes(String(myTeamId));

            if(state.phase==='ready'){
                playerSealedMode=state.mode==='sealed';
                playerSealedToken=playerSealedMode?String(state.sealed_token||''):null;
                playerSealedSubmitted=false;
                preparePlayerSealedControls(false);
                isAuctionActive=false;
                setPlayerBidButtonsEnabled(false);
                setPlayerAuctionVisualState('neutral');
                document.getElementById('player-auction-title').textContent='ATTESA READY';
                document.getElementById('player-current-winner').textContent='In attesa';
                document.getElementById('player-current-value').textContent=String(state.value||0);
                document.getElementById('player-countdown').textContent='--';

                const payload={
                    ready_token:state.ready_token,
                    ready_required_ids:Array.isArray(state.ready_required_ids)?state.ready_required_ids:[],
                    ready_ids:Array.isArray(state.ready_ids)?state.ready_ids:[],
                    skip_ids:Array.isArray(state.skip_ids)?state.skip_ids:[],
                    nome:state.player?.nome,
                    role:state.player?.role,
                    club:state.player?.club
                };
                const required=payload.ready_required_ids.map(String);

                // Lo stato live READY è autoritativo:
                // anche se il telefono era chiuso e ha perso i broadcast,
                // al rientro deve mostrare nuovamente la richiesta.
                showPlayerReadyBanner(payload);
                return;
            }

            if(state.phase==='sealed'){
                closePlayerReadyBanner();
                playerSealedMode=true;
                playerSealedToken=String(state.sealed_token||'');
                playerSealedSubmitted=(state.sealed_submitted_ids||[]).map(String).includes(String(myTeamId));
                currentAuctionPlayer=playersList.find(x=>String(x.Id)===String(state.player?.id))||currentAuctionPlayer;
                const eligible=(state.sealed_eligible_ids||[]).map(String);
                const allowed=eligible.includes(String(myTeamId))&&!playerSealedSubmitted;
                preparePlayerSealedControls(allowed);
                isAuctionActive=false;
                setPlayerBidButtonsEnabled(false);
                document.getElementById('player-auction-title').textContent='BUSTA CHIUSA';
                document.getElementById('player-current-winner').textContent=playerSealedSubmitted?'Offerta inviata':'Inserisci la tua offerta';
                document.getElementById('player-current-value').textContent='?';
                const round=Math.max(1,parseInt(state.sealed_round)||1);
                document.getElementById('player-auction-title').textContent=round>1?'SPAREGGIO BUSTA':'BUSTA CHIUSA';
                const remaining=playerRemainingFromLiveState(state,'sealed');
                startPlayerSealedCountdownSeconds(remaining,5);
                return;
            }

            if(state.phase==='sealed_reveal'){
                closePlayerReadyBanner();
                playerSealedMode=true;
                playerSealedToken=String(state.sealed_token||'');
                playerSealedSubmitted=true;
                preparePlayerSealedControls(false);
                isAuctionActive=false;
                setPlayerBidButtonsEnabled(false);
                document.getElementById('player-auction-title').textContent='APERTURA BUSTE';
                document.getElementById('player-current-winner').textContent='ATTENDI';
                document.getElementById('player-current-winner').style.color='var(--text-muted)';
                document.getElementById('player-current-value').textContent='?';
                const remaining=playerRemainingFromLiveState(state,'reveal');
                playerSealedRevealDeadlineAt=Number(state.deadline_at)||0;
                playerSealedRevealLocalEndAt=startPlayerSealedCountdownSeconds(remaining,2,true);
                return;
            }

            if(state.phase==='prep'){
                closePlayerReadyBanner();
                const remaining=liveRemainingSeconds(state);
                isAuctionActive=false;
                setPlayerBidButtonsEnabled(false);
                setPlayerAuctionVisualState('preparing');
                const prepEl=document.getElementById('player-countdown');
                if(prepEl){
                    prepEl.classList.remove('danger','liveasta-last3');
                    prepEl.classList.add('prep-countdown');
                }
                if(remaining>0)startLocalPlayerPreparation(remaining);
                else{
                    document.getElementById('player-auction-title').textContent='AVVIO ASTA…';
                    document.getElementById('player-countdown').textContent='0';
                }
                return;
            }

            if(state.phase==='active'){
                closePlayerReadyBanner();
                if(playerPrepInterval){clearInterval(playerPrepInterval);playerPrepInterval=null;}
                isAuctionActive=true;
                currentAuctionValue=parseInt(state.value)||0;
                currentWinner=String(state.winner||'');
                if(typeof state.self_raise_enabled==='boolean')selfRaiseEnabled=state.self_raise_enabled;
                setPlayerBidButtonsEnabled(true);

                const winnerEl=document.getElementById('player-current-winner');
                document.getElementById('player-auction-title').textContent='MIGLIOR OFFERTA';
                document.getElementById('player-current-value').textContent=String(currentAuctionValue);
                document.getElementById('player-countdown').textContent=String(normalLiveRemainingSeconds(state));

                if(winnerEl){
                    winnerEl.textContent=currentWinner||'Nessuno';
                    if(currentWinner===myTeamName){
                        playerHasBidThisAuction=true;
                        winnerEl.style.color='var(--accent-green)';
                        setPlayerAuctionVisualState('winning');
                    }else{
                        winnerEl.style.color=currentWinner?'var(--accent-red)':'var(--text-muted)';
                        setPlayerAuctionVisualState('neutral');
                    }
                }
                updatePlayerTeamStatus();
                return;
            }

            if(state.phase==='ended'){
                closePlayerReadyBanner();
                playerSealedMode=false;
                playerSealedToken=null;
                playerSealedSubmitted=false;
                preparePlayerSealedControls(false);
                isAuctionActive=false;
                setPlayerBidButtonsEnabled(false);
                currentAuctionValue=parseInt(state.value)||0;
                currentWinner=String(state.winner||'');
                const winnerEl=document.getElementById('player-current-winner');
                document.getElementById('player-auction-title').textContent=currentWinner?'AGGIUDICATO A':'NESSUNA OFFERTA';
                document.getElementById('player-current-value').textContent=String(currentAuctionValue);
                document.getElementById('player-countdown').textContent='0';
                if(winnerEl){
                    winnerEl.textContent=currentWinner||'INVENDUTO';
                    winnerEl.style.color=currentWinner===myTeamName?'var(--accent-green)':(currentWinner?'var(--accent-red)':'var(--text-muted)');
                }
            }
        }

        function restoreAuctioneerVisualFromState(state){
            if(!state?.player)return;
            const p=state.player;
            currentAuctionPlayer=playersList.find(x=>String(x.Id)===String(p.id))||{
                Id:p.id,Nome:p.nome,R:p.role,Squadra:p.club,FVM:p.fvm
            };
            restoreAuctionCardVisibility();
            const name=document.getElementById('auction-player-name-top');
            const role=document.getElementById('auction-player-role');
            const club=document.getElementById('auction-player-club');
            const img=document.getElementById('card-image');
            if(name)setPhonePlayerDisplayName(p.nome||'--',p.id);
            if(role)role.textContent=p.role||'-';
            if(club)club.textContent=p.club||'-';
            if(img){setPlayerImage(img,p.id,p.role);img.style.visibility='visible';}
            const lv=document.getElementById('view-list');
            const av=document.getElementById('view-auction');
            if(lv)lv.style.display='none';
            if(av){av.classList.remove('auction-view-hidden');av.style.display='flex';}
            fitAuctionNames();
        }

        async function restoreAuctioneerFromLiveState(){
            // Un READY aperto ha priorità su qualunque altro stato live.
            if(await restoreAuctioneerReadyGateFirst()){
                readyModeEnabled=true;
                updateReadyControlUI();
                return true;
            }

            const state=await loadLiveAuctionState();
            if(!state||!state.phase||state.phase==='idle')return false;

            restoreAuctioneerVisualFromState(state);
            currentWinner=String(state.winner||'');
            currentAuctionValue=parseInt(state.value)||0;
            readySkipPlayers=new Set((Array.isArray(state.skip_ids)?state.skip_ids:[]).map(String));

            if(state.phase==='ready'){
                sealedAuctionModeActive=state.mode==='sealed';
                sealedAuctionToken=sealedAuctionModeActive?String(state.sealed_token||''):null;
                sealedTimerSeconds=sealedAuctionModeActive?Math.max(5,parseInt(state.sealed_seconds)||sealedTimerSeconds):sealedTimerSeconds;
                sealedEligibleIds=sealedAuctionModeActive?(state.sealed_eligible_ids||[]).map(String):[];
                readyGateWaiting=true;
                readyGateToken=String(state.ready_token||'');
                readyPlayers=new Set((state.ready_ids||[]).map(String));
                readySkipPlayers=new Set((state.skip_ids||[]).map(String));
                updateReadyGateDisplay();
                return true;
            }

            if(state.phase==='sealed'){
                sealedAuctionModeActive=true;
                sealedAuctionToken=String(state.sealed_token||'');
                sealedRound=Math.max(1,parseInt(state.sealed_round)||1);
                sealedEligibleIds=(state.sealed_eligible_ids||[]).map(String);
                sealedDeadlineAt=Number(state.sealed_deadline_at||state.deadline_at)||0;
                sealedBids=new Map();

                // Recupera le buste persistite solo sul banditore.
                try{
                    const key=sealedBidsStateKey(sealedAuctionToken);
                    const {data}=await supabaseClient.from('fanta_app_data').select('data').eq('key',key).maybeSingle();
                    (data?.data?.bids||[]).forEach(b=>sealedBids.set(String(b.team_id),b));
                }catch(e){}

                if(Date.now()>=sealedDeadlineAt){
                    endSealedAuction();
                    return true;
                }

                showSealedAuctionStage();
            hybridStartSealedRound();
                if(sealedTimerInterval)clearInterval(sealedTimerInterval);
                sealedTimerInterval=setInterval(()=>{
                    showSealedAuctionStage();
                    if(Date.now()>=sealedDeadlineAt){
                        clearInterval(sealedTimerInterval);sealedTimerInterval=null;endSealedAuction();
                    }
                },250);
                return true;
            }

            if(state.phase==='prep'){
                showAuctionPanels();
                let remaining=liveRemainingSeconds(state);
                if(remaining<=0){startAuction();return true;}
                isAuctionActive=false;
                document.getElementById('auction-title-display').textContent=isAuctioneerMobileBoard()?'':'IN ATTESA';
                document.getElementById('winner-display').textContent=isAuctioneerMobileBoard()?'':'--';
                document.getElementById('current-value-display').textContent='0';
                if(isAuctioneerMobileBoard())setMobileBoardPhase('preparing');
                document.getElementById('countdown-display').textContent=remaining;
                const deadline=Number(state.deadline_at)||Date.now()+remaining*1000;
                if(auctionPrepInterval)clearInterval(auctionPrepInterval);
                auctionPrepInterval=setInterval(()=>{
                    remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));
                    document.getElementById('countdown-display').textContent=remaining;
                    if(channel)channel.send({type:'broadcast',event:'prep_tick',payload:{seconds:remaining,player_id:currentAuctionPlayer?.Id}}).catch(()=>{});
                    if(remaining<=0){
                        clearInterval(auctionPrepInterval);
                        auctionPrepInterval=null;
                        startAuction();
                    }
                },500);
                return true;
            }

            if(state.phase==='active'){
                showAuctionPanels();
                if(isAuctioneerMobileBoard())setMobileBoardPhase('normal');
                isAuctionActive=true;
                normalBidMaxima=new Map(
                    (Array.isArray(state.normal_bid_ranking)?state.normal_bid_ranking:[])
                        .map(b=>[String(b.team_id),b])
                );
                currentTimer=normalLiveRemainingSeconds(state);
                document.getElementById('auction-title-display').textContent=isAuctioneerMobileBoard()?'':'MIGLIOR OFFERENTE';
                document.getElementById('winner-display').textContent=currentWinner||(isAuctioneerMobileBoard()?'':'NESSUNO');
                document.getElementById('current-value-display').textContent=String(currentAuctionValue);
                document.getElementById('countdown-display').textContent=String(currentTimer);
                if(currentTimer<=0){endAuction();return true;}

                // Non riutilizziamo un deadline anomalo/stale: ripartiamo dal residuo
                // già limitato al timer configurato della stanza.
                const deadline=Date.now()+currentTimer*1000;
                clearInterval(timerInterval);
                timerInterval=setInterval(()=>{
                    currentTimer=clampNormalAuctionSeconds(Math.ceil((deadline-Date.now())/1000));
                    document.getElementById('countdown-display').textContent=currentTimer;
                    if(channel)channel.send({type:'broadcast',event:'timer_tick',payload:{seconds:currentTimer}}).catch(()=>{});
                    if(currentTimer<=0)endAuction();
                },500);
                return true;
            }

            if(state.phase==='sealed_reveal'){
                sealedAuctionModeActive=true;
                sealedEnding=true;
                sealedAuctionToken=String(state.sealed_token||'');
                sealedRound=Math.max(1,parseInt(state.sealed_round)||1);
                sealedEligibleIds=(state.sealed_eligible_ids||[]).map(String);
                sealedBids=new Map();
                try{
                    const key=sealedBidsStateKey(sealedAuctionToken);
                    const {data}=await supabaseClient.from('fanta_app_data').select('data').eq('key',key).maybeSingle();
                    (data?.data?.bids||[]).forEach(b=>sealedBids.set(String(b.team_id),b));
                    if(!sealedEligibleIds.length)sealedEligibleIds=[...sealedBids.keys()];
                }catch(e){}
                showAuctionPanels();
                isAuctionActive=false;
                document.getElementById('auction-title-display').textContent='APERTURA BUSTE';
                document.getElementById('winner-display').textContent='ATTENDI';
                document.getElementById('winner-display').style.color='var(--text-muted)';
                document.getElementById('current-value-display').textContent='?';
                const deadline=Number(state.deadline_at)||0;
                sealedRevealDeadlineAt=deadline;
                showSealedAuctionStage('opening');
                const nextButton=document.getElementById('btn-next');
                if(nextButton)nextButton.style.display='none';
                let lastRestoreRevealSoundSecond=null;
                const tick=()=>{
                    const rem=Math.max(0,Math.ceil((deadline-Date.now())/1000));
                    document.getElementById('countdown-display').textContent=String(rem);

                    if(!isAuctioneerPlayerIdentity() && rem>0 && rem!==lastRestoreRevealSoundSecond){
                        lastRestoreRevealSoundSecond=rem;
                        playSound('audio-prep');
                    }

                    if(rem<=0){
                        if(sealedRevealInterval){clearInterval(sealedRevealInterval);sealedRevealInterval=null;}
                        finalizeSealedAuctionResult();
                    }
                };
                tick();
                if(deadline>Date.now()){if(sealedRevealInterval)clearInterval(sealedRevealInterval);sealedRevealInterval=setInterval(tick,250);}
                return true;
            }

            if(state.phase==='ended'){
                showAuctionPanels();
                isAuctionActive=false;
                document.getElementById('auction-title-display').textContent=currentWinner?'ASTA VINTA DA':'ESITO ASTA';
                document.getElementById('winner-display').textContent=currentWinner||'INVENDUTO';
                document.getElementById('current-value-display').textContent=String(currentAuctionValue);
                document.getElementById('countdown-display').textContent='0';

                const restoredNextButton=document.getElementById('btn-next');
                if(restoredNextButton && !nominationState.enabled && !autoRandomEnabled){
                    restoredNextButton.style.display='flex';
                }

                if(state.mode==='sealed_result' && Array.isArray(state.sealed_ranking)){
                    renderSealedBidRanking(state.sealed_ranking);
                }else if(Array.isArray(state.normal_bid_ranking) && state.normal_bid_ranking.length){
                    renderAuctioneerBidRanking(state.normal_bid_ranking,'CLASSIFICA OFFERTE · MASSIMO PER SQUADRA');
                }else{
                    clearSealedBidRanking();
                }
                return true;
            }
            return false;
        }

        function nominationStateKey(){return `nomination_turn_${currentRoomId}`;}
        function nominationRoleName(r){
            if(isMantraRoom())return r==='ALL'?'giocatore':'giocatore';
            return ({P:'Portiere',D:'Difensore',C:'Centrocampista',A:'Attaccante'})[r]||'Giocatore';
        }

        function ensureNominationOrder(){
            const currentIds=teamsCache.map(t=>String(t.id));
            const stored=Array.isArray(nominationState.order_team_ids)
                ? nominationState.order_team_ids.map(String).filter(id=>currentIds.includes(id))
                : [];
            const missing=currentIds.filter(id=>!stored.includes(id));
            nominationState.order_team_ids=[...stored,...missing];
            return nominationState.order_team_ids;
        }

        function nominationOrderedTeams(){
            const order=ensureNominationOrder();
            const map=new Map(teamsCache.map(t=>[String(t.id),t]));
            return order.map(id=>map.get(String(id))).filter(Boolean);
        }

        function renderNominationOrder(){
            const box=document.getElementById('nomination-order-list');
            if(!box) return;
            const ordered=nominationOrderedTeams();

            if(!ordered.length){
                box.innerHTML='<div class="online-empty">Nessuna squadra presente</div>';
                return;
            }

            box.innerHTML=ordered.map((t,i)=>{
                const current=String(t.id)===String(nominationState.turn_team_id);
                return `<div class="nomination-order-row ${current?'current':''}">
                    <span class="nomination-order-pos">${i+1}</span>
                    <span class="nomination-order-name">${escapeHtml(t.name||'Squadra')}</span>
                    <button class="btn btn-secondary nomination-order-move" ${i===0?'disabled':''} onclick="moveNominationOrder('${t.id}',-1)">↑</button>
                    <button class="btn btn-secondary nomination-order-move" ${i===ordered.length-1?'disabled':''} onclick="moveNominationOrder('${t.id}',1)">↓</button>
                </div>`;
            }).join('');
        }

        async function moveNominationOrder(teamId,delta){
            ensureNominationOrder();
            const arr=[...nominationState.order_team_ids];
            const i=arr.findIndex(id=>String(id)===String(teamId));
            const j=i+Number(delta);
            if(i<0||j<0||j>=arr.length) return;
            [arr[i],arr[j]]=[arr[j],arr[i]];
            nominationState.order_team_ids=arr;
            await saveNominationState(nominationReady);
            renderNominationOrder();
            renderRoomControl();
        }

        async function resetNominationOrder(){
            nominationState.order_team_ids=teamsCache.map(t=>String(t.id));
            await saveNominationState(nominationReady);
            renderNominationOrder();
            renderRoomControl();
        }

        async function moveNominationTurn(direction){
            if(!nominationState.enabled){
                alert('Attiva prima la banditura a turni.');
                return;
            }
            if(isAuctionActive){
                alert('Non puoi cambiare turno mentre è in corso un’asta.');
                return;
            }

            await loadRoomState();
            ensureNominationOrder();

            const role=nominationState.role || firstIncompleteRole();
            if(!role) return;

            const eligible=eligibleNominationTeams(role);
            const ordered=nominationOrderedTeams();
            if(!eligible.length||!ordered.length) return;

            let start=ordered.findIndex(t=>String(t.id)===String(nominationState.turn_team_id));
            if(start<0) start=0;

            let chosen=null;
            const step=direction<0?-1:1;
            for(let n=1;n<=ordered.length;n++){
                const idx=(start+(step*n)+ordered.length*10)%ordered.length;
                const candidate=ordered[idx];
                if(candidate&&eligible.some(e=>String(e.id)===String(candidate.id))){
                    chosen=candidate;
                    break;
                }
            }

            if(!chosen) return;

            nominationState.role=role;
            nominationState.turn_team_id=chosen.id;
            nominationReady=true;
            await saveNominationState(true);
            renderRoomControl();
            showNominationWaitingBoard();
        }

        function firstIncompleteRole(){
            if(isMantraRoom()){
                return teamsCache.some(t=>teamCounts(t.id).total<mantraRosterMax())?'ALL':null;
            }
            const l=roomLimits();
            for(const r of ['P','D','C','A']) if((l[r]||0)>0 && teamsCache.some(t=>(teamCounts(t.id)[r]||0)<l[r])) return r;
            return null;
        }
        function eligibleNominationTeams(r=nominationState.role){
            if(!r)return [];
            if(isMantraRoom()){
                return teamsCache.filter(t=>teamCounts(t.id).total<mantraRosterMax());
            }
            const l=roomLimits();
            return teamsCache.filter(t=>(teamCounts(t.id)[r]||0)<(l[r]||0));
        }
        function normalizeNominationState(afterId=null){
            if(!nominationState.enabled){ensureNominationOrder();nominationState={...nominationState,enabled:false,role:null,turn_team_id:null};return;}
            let r=nominationState.role, l=roomLimits();
            if(isMantraRoom()){
                r='ALL';
                if(!teamsCache.some(t=>teamCounts(t.id).total<mantraRosterMax()))r=null;
            }else if(!r || !teamsCache.some(t=>(teamCounts(t.id)[r]||0)<(l[r]||0))){
                r=firstIncompleteRole();
            }
            if(!r){nominationState={...nominationState,enabled:true,role:null,turn_team_id:null};return;}
            ensureNominationOrder();
            const eligible=eligibleNominationTeams(r), all=nominationOrderedTeams();
            let chosen=!afterId?eligible.find(t=>String(t.id)===String(nominationState.turn_team_id)):null;
            if(!chosen){
                let start=all.findIndex(t=>String(t.id)===String(afterId||nominationState.turn_team_id));
                for(let i=1;i<=all.length;i++){const c=all[(start+i+all.length)%all.length];if(c&&eligible.some(e=>String(e.id)===String(c.id))){chosen=c;break;}}
                chosen=chosen||eligible[0];
            }
            nominationState={...nominationState,enabled:true,role:r,turn_team_id:chosen?.id||null};
        }
        async function loadNominationState(){
            if(!currentRoomId)return;
            try{const {data}=await supabaseClient.from('fanta_app_data').select('data').eq('key',nominationStateKey()).maybeSingle();if(data?.data)nominationState={...nominationState,...data.data};ensureNominationOrder();normalizeNominationState();}catch(e){}
            updateNominationUI();
        }
        async function saveNominationState(ready=nominationReady){
            normalizeNominationState();
            await supabaseClient.from('fanta_app_data').upsert({key:nominationStateKey(),data:nominationState,file_name:'banditura-turni',updated_at:new Date().toISOString()},{onConflict:'key'});
            broadcastNominationState(ready);updateNominationUI();
        }
        function broadcastNominationState(ready=nominationReady){channel?.send({type:'broadcast',event:'nomination_state',payload:{state:nominationState,ready}}).catch(()=>{});}
        function currentNominationTeam(){return teamsCache.find(t=>String(t.id)===String(nominationState.turn_team_id));}
        async function toggleNominationMode(){
            await loadRoomState();
            await loadNominationState();
            if(!nominationState.enabled && autoRandomEnabled){
                alert('Disattiva prima AUTO RANDOM: non può essere usato insieme alla banditura a turni.');
                return;
            }
            nominationState.enabled=!nominationState.enabled;
            if(nominationState.enabled){
                nominationState.role=firstIncompleteRole();
                nominationState.turn_team_id=null;
                normalizeNominationState();
                nominationReady=true;
            }else{
                nominationState.role=null;
                nominationState.turn_team_id=null;
                nominationReady=false;
            }
            await saveNominationState(nominationReady);
            renderRoomControl();
            if(nominationState.enabled){
                showNominationWaitingBoard();
            }else{
                hideNominationStage();
                const av=document.getElementById('view-auction');
                const lv=document.getElementById('view-list');
                if(av){av.classList.add('auction-view-hidden');av.style.display='none';}
                if(lv)lv.style.display='flex';
            }
        }
        async function recalculateNominationTurn(){
            if(!nominationState.enabled)return alert('Attiva prima la banditura a turni.');
            await loadRoomState();
            nominationState.role=firstIncompleteRole();
            nominationState.turn_team_id=null;
            normalizeNominationState();
            nominationReady=true;
            await saveNominationState(true);
            renderRoomControl();
            showNominationWaitingBoard();
        }
        async function advanceNominationTurn(){if(!nominationState.enabled)return;const old=nominationState.turn_team_id;await loadRoomState();normalizeNominationState(old);nominationReady=false;await saveNominationState(false);}
        function updateNominationUI(){
            const mine=
                nominationState.enabled &&
                nominationReady &&
                nominationState.role &&
                !nominationRequestPending &&
                !isAuctionActive &&
                String(nominationState.turn_team_id)===String(myTeamId);

            const b=document.getElementById('player-nominate-btn');
            if(b){
                b.style.display=mine?'flex':'none';
                b.disabled=!mine;
                b.classList.toggle('nomination-turn-active',!!mine);
            }
            const r=document.getElementById('player-nominate-role');if(r)r.textContent=nominationState.role?(isMantraRoom()?'MANTRA · qualsiasi ruolo':`Ruolo ${nominationState.role} · ${nominationRoleName(nominationState.role)}`):'Rosa completata';
            const badge=document.getElementById('nomination-control-badge');if(badge){badge.textContent=nominationState.enabled?'ATTIVA':'DISATTIVA';badge.classList.toggle('active',!!nominationState.enabled);}
            const t=document.getElementById('nomination-toggle-btn');if(t){t.textContent=nominationState.enabled?'Disattiva banditura a turni':'Attiva banditura a turni';t.setAttribute('aria-checked',String(!!nominationState.enabled));}
            const st=document.getElementById('nomination-control-status');if(st)st.innerHTML=!nominationState.enabled?'Modalità disattivata.':!nominationState.role?'Tutte le rose sono complete.':(isMantraRoom()?`Banditura libera MANTRA · turno <b style="color:var(--lime)">${escapeHtml(currentNominationTeam()?.name||'--')}</b>`:`Ruolo <b>${nominationState.role}</b> · turno <b style="color:var(--lime)">${escapeHtml(currentNominationTeam()?.name||'--')}</b>`);
            renderNominationOrder();
        }

        function isMyNominationTurn(){
            return !!nominationState.enabled &&
                   !!nominationReady &&
                   !!nominationState.role &&
                   String(nominationState.turn_team_id)===String(myTeamId);
        }

        function hideNominationStage(){
            const nominationStage=document.getElementById('nomination-stage');
            nominationStage?.classList.remove('open');
            nominationStage?.classList.remove('auction-completed-fullscreen');
            const readyDesktop=document.getElementById('auctioneer-ready-desktop');
            if(readyDesktop){
                readyDesktop.classList.remove('open');
                readyDesktop.setAttribute('aria-hidden','true');
            }
        }

        function showNominationTurnStage(){
            if(!nominationState.enabled)return;
            const team=currentNominationTeam();
            const role=nominationState.role;
            const dashboard=document.getElementById('auction-dashboard');
            const desktopTurn=!!dashboard?.classList.contains('mode-pc');
            const lv=document.getElementById('view-list');
            const av=document.getElementById('view-auction');
            const stage=document.getElementById('nomination-stage');

            /* fine asta: quando non esiste più alcun ruolo/turno disponibile,
               la plancia banditore diventa una schermata terminale a pieno schermo. */
            if(!role){
                const readyDesktop=document.getElementById('auctioneer-ready-desktop');
                if(readyDesktop){
                    readyDesktop.classList.remove('open');
                    readyDesktop.setAttribute('aria-hidden','true');
                }
                if(lv)lv.style.display='none';
                if(av){
                    av.classList.add('auction-view-hidden');
                    av.classList.remove('nomination-turn-desktop');
                    av.style.display='none';
                }
                const kicker=document.getElementById('nomination-stage-kicker');
                const title=document.getElementById('nomination-stage-title');
                const teamNode=document.getElementById('nomination-stage-team');
                const roleNode=document.getElementById('nomination-stage-role');
                const playerBox=document.getElementById('nomination-stage-player');
                const readyBox=document.getElementById('nomination-stage-ready');
                if(kicker)kicker.textContent='';
                if(title)title.textContent='ASTA COMPLETATA';
                if(teamNode)teamNode.textContent='';
                if(roleNode)roleNode.textContent='';
                if(playerBox)playerBox.style.display='none';
                if(readyBox)readyBox.style.display='none';
                stage?.classList.add('auction-completed-fullscreen','open');
                return;
            }
            stage?.classList.remove('auction-completed-fullscreen');

            /* BANDITORE PC: niente più pagina full-screen per il turno.
               Manteniamo i tre quadranti della banditura:
               sinistra = ultimo giocatore bandito, centro = turno,
               destra = classifica dell'ultima asta. */
            if(desktopTurn){
                document.getElementById('nomination-stage')?.classList.remove('open');
                const readyDesktop=document.getElementById('auctioneer-ready-desktop');
                if(readyDesktop){
                    readyDesktop.classList.remove('open');
                    readyDesktop.setAttribute('aria-hidden','true');
                }
                if(lv)lv.style.display='none';
                if(av){
                    av.classList.remove('auction-view-hidden');
                    av.classList.add('nomination-turn-desktop');
                    av.style.display='flex';
                }

                const center=document.getElementById('auctioneer-turn-center');
                const teamEl=document.getElementById('auctioneer-turn-team');
                const roleEl=document.getElementById('auctioneer-turn-role');
                if(center)center.setAttribute('aria-hidden','false');
                if(teamEl)teamEl.textContent=team?.name || (role?'SQUADRA NON DISPONIBILE':'ASTE COMPLETATE');
                if(roleEl)roleEl.textContent=role
                    ? (isMantraRoom()?'Può bandire qualsiasi giocatore disponibile':`Sceglie un ${nominationRoleName(role)} · Ruolo ${role}`)
                    : 'Tutte le rose sono complete';

                // Se è la prima banditura della sessione non esiste ancora un giocatore precedente.
                // In tutti gli altri casi lasciamo intatta la colonna sinistra appena conclusa.
                const rankingEl=document.getElementById('sealed-ranking-auctioneer');
                const rankingEmpty=document.getElementById('auctioneer-turn-ranking-empty');
                const hasPreviousRanking=!!rankingEl?.querySelector('.sealed-ranking-row');
                if(rankingEmpty){
                    rankingEmpty.classList.toggle('show',!hasPreviousRanking);
                    rankingEmpty.setAttribute('aria-hidden',hasPreviousRanking?'true':'false');
                }

                if(!currentAuctionPlayer){
                    clearSealedBidRanking();
                    const name=document.getElementById('auction-player-name-top');
                    const img=document.getElementById('card-image');
                    const roleNode=document.getElementById('auction-player-role');
                    const clubNode=document.getElementById('auction-player-club');
                    if(name)name.textContent='NESSUNA ASTA PRECEDENTE';
                    if(img){img.removeAttribute('src');img.style.visibility='hidden';}
                    if(roleNode)roleNode.textContent='-';
                    if(clubNode)clubNode.textContent='-';
                }else{
                    restoreAuctionCardVisibility();
                }

                requestAnimationFrame(()=>{
                    fitAuctionNames();
                    if(teamEl)fitTextToBox(teamEl,86,24,true);
                });
                return;
            }

            /* v0.93 Smartphone: turno a sinistra, stato/classifica a destra. */
            if(lv)lv.style.display='none';
            if(av){av.classList.remove('auction-view-hidden','nomination-turn-desktop');av.style.display='flex';}
            showMobileTurnBoard(team);
            const rankingEl=document.getElementById('sealed-ranking-auctioneer');
            const rankingEmpty=document.getElementById('auctioneer-turn-ranking-empty');
            const hasRanking=!!rankingEl?.querySelector('.sealed-ranking-row');
            if(rankingEmpty){
                rankingEmpty.classList.toggle('show',!hasRanking);
                rankingEmpty.setAttribute('aria-hidden',hasRanking?'true':'false');
            }
        }

        function showAuctioneerReadyStage(){
            if(!readyGateWaiting || !currentAuctionPlayer)return;

            const req=readyRequiredIds();
            const ready=req.filter(id=>readyPlayers.has(String(id)));
            const missing=req.filter(id=>!readyPlayers.has(String(id)));
            const nominatingTeam=nominationState.enabled ? currentNominationTeam() : null;
            const dashboard=document.getElementById('auction-dashboard');
            const desktopReady=!!dashboard?.classList.contains('mode-pc');

            const lv=document.getElementById('view-list');
            const av=document.getElementById('view-auction');
            if(lv)lv.style.display='none';
            if(av){av.classList.add('auction-view-hidden');av.classList.remove('nomination-turn-desktop');av.style.display='none';}
            document.getElementById('auctioneer-turn-center')?.setAttribute('aria-hidden','true');

            /* sul PC del banditore il READY non usa più la pagina full-screen.
               Smartphone banditore resta esattamente con la visualizzazione storica. */
            if(desktopReady){
                document.getElementById('nomination-stage')?.classList.remove('open');

                const panel=document.getElementById('auctioneer-ready-desktop');
                const name=document.getElementById('auctioneer-ready-player-name');
                const img=document.getElementById('auctioneer-ready-player-img');
                const role=document.getElementById('auctioneer-ready-player-role');
                const club=document.getElementById('auctioneer-ready-player-club');
                const fvm=document.getElementById('auctioneer-ready-fvm-value');
                const count=document.getElementById('auctioneer-ready-count');
                const list=document.getElementById('auctioneer-ready-team-list');

                if(name)name.textContent=currentAuctionPlayer.Nome||'--';
                if(img)setPlayerImage(img,currentAuctionPlayer.Id,currentAuctionPlayer.R);
                if(role){
                    const shownRole=String(currentAuctionPlayer.R||'-').trim()||'-';
                    role.textContent=shownRole;
                    role.classList.remove('role-P','role-D','role-C','role-A');
                    const classicRole=shownRole.toUpperCase();
                    if(['P','D','C','A'].includes(classicRole))role.classList.add(`role-${classicRole}`);
                }
                if(club)club.textContent=currentAuctionPlayer.Squadra||'-';
                const readyPlayerCard=panel?.querySelector('.ard-player');
                if(readyPlayerCard){
                    const bg=window.liveastaTeamBackgroundForClub?.(currentAuctionPlayer.Squadra||'');
                    if(bg)readyPlayerCard.style.setProperty('--team-card-bg',bg);
                }
                if(fvm)fvm.textContent=String(playerListoneNumericValue(currentAuctionPlayer));
                if(count)count.textContent=`${ready.length} / ${req.length}`;

                if(list){
                    const nominatorId=nominatingTeam?.id!=null?String(nominatingTeam.id):'';
                    const ordered=readyVisibleTeamIds(req).sort((a,b)=>{
                        const aa=String(a)===nominatorId?0:1;
                        const bb=String(b)===nominatorId?0:1;
                        if(aa!==bb)return aa-bb;
                        return readyTeamName(a).localeCompare(readyTeamName(b),'it',{sensitivity:'base'});
                    });

                    list.innerHTML=ordered.length?ordered.map(id=>{
                        const sid=String(id);
                        const absent=absentTeamIds.has(sid);
                        const isReady=readyPlayers.has(sid);
                        const isNominator=!!nominatorId && sid===nominatorId;
                        return `<div class="ard-team-row${absent?' absent':''}${isReady?' ready':''}${isNominator?' nominator':''}">
                            <div class="ard-team-name">${escapeHtml(readyTeamName(sid))}${isNominator?'<small>HA BANDITO</small>':''}</div>
                            <div class="ard-team-status">${absent?'ASSENTE':isReady?'PRONTO':'IN ATTESA'}</div>
                            <span class="ard-team-dot" aria-hidden="true"></span>
                        </div>`;
                    }).join(''):'<div class="ard-empty">Nessuna squadra deve confermare.</div>';
                }

                if(panel){
                    panel.classList.add('open');
                    panel.setAttribute('aria-hidden','false');
                }
                requestAnimationFrame(()=>{
                    fitTextToBox(name,64,18,true);
                });
                return;
            }

            /* v0.93 Smartphone: stessa logica READY desktop, informazioni ridotte. */
            const readyDesktop=document.getElementById('auctioneer-ready-desktop');
            if(readyDesktop){readyDesktop.classList.remove('open');readyDesktop.setAttribute('aria-hidden','true');}
            showMobileReadyBoard(ready.length,req.length);
        }

        function showAuctionPanels(){
            hideNominationStage();
            const caption=document.querySelector('#view-auction .timer-caption');if(caption)caption.textContent='TEMPO RESIDUO';
            const lv=document.getElementById('view-list');
            const av=document.getElementById('view-auction');
            if(lv)lv.style.display='none';
            if(av){
                av.classList.remove('auction-view-hidden','nomination-turn-desktop','sealed-collecting','sealed-opening');
                [...av.classList].filter(c=>c.startsWith('mobile-')).forEach(c=>av.classList.remove(c));
                av.style.display='flex';
            }
            document.getElementById('auctioneer-turn-center')?.setAttribute('aria-hidden','true');
            const rankingEmpty=document.getElementById('auctioneer-turn-ranking-empty');
            if(rankingEmpty){
                rankingEmpty.classList.remove('show');
                rankingEmpty.setAttribute('aria-hidden','true');
            }
        }

        function showHybridBanditoreWaitingList(){
            hideNominationStage();

            const consultNote=document.getElementById('hybrid-consultation-note');
            if(consultNote){
                const turnTeam=currentNominationTeam();
                consultNote.textContent=turnTeam
                    ? `LISTONE IN CONSULTAZIONE · TURNO DI ${String(turnTeam.name||'').toUpperCase()}`
                    : 'LISTONE IN CONSULTAZIONE';
                consultNote.style.display='flex';
            }

            const av=document.getElementById('view-auction');
            const lv=document.getElementById('view-list');
            const nextBtn=document.getElementById('btn-next');

            if(av){
                av.classList.add('auction-view-hidden');
                av.style.display='none';
            }
            if(lv)lv.style.display='flex';
            if(nextBtn)nextBtn.style.display='none';

            showScreen('screen-auctioneer-board');
            refreshPlayerLists();
        }

        function showNominationWaitingBoard(){
            if(!nominationState.enabled)return;
            const nextBtn=document.getElementById('btn-next');
            if(nextBtn)nextBtn.style.display='none';

            // a rose complete la schermata finale ha precedenza anche in modalità banditore+giocatore.
            if(!nominationState.role){
                showScreen('screen-auctioneer-board');
                showNominationTurnStage();
                return;
            }

            // BANDITORE + GIOCATORE:
            // - se è il suo turno -> telecomando + listone per bandire;
            // - se tocca a un altro -> normale plancia/listone banditore,
            //   senza la schermata passiva "È IL TURNO DI...".
            if(auctioneerPlayerMode){
                if(isMyNominationTurn()){
                    configureHybridPlayerIdentity();
                    showScreen('screen-player-buzzer');
                    updateNominationUI();
                    autoOpenNominationPicker();
                    return;
                }

                showHybridBanditoreWaitingList();
                return;
            }

            showScreen('screen-auctioneer-board');
            showNominationTurnStage();
        }

        function restoreAuctionCardVisibility(){
            const img=document.getElementById('card-image');
            if(img) img.style.visibility='visible';
            document.getElementById('auction-player-name-top')?.classList.remove('nomination-waiting-team');
            document.getElementById('auction-player-role')?.classList.remove('nomination-waiting-role');
        }

        function autoOpenNominationPicker(){
            if(!isMyNominationTurn()) return;
            setTimeout(()=>{
                if(isMyNominationTurn()&&!isAuctionActive) openNominationPicker();
            },250);
        }

        async function openNominationPicker(){
            if(!(nominationState.enabled&&nominationReady&&String(nominationState.turn_team_id)===String(myTeamId)))return;
            if(!playersList.length){const {data}=await supabaseClient.from('fanta_app_data').select('data').eq('key','official_listone').maybeSingle();if(Array.isArray(data?.data))playersList=data.data;}
            loadPlayerUiPrefs();
            const search=document.getElementById('nomination-search');
            if(search)search.value='';
            document.getElementById('nomination-picker-title').textContent=isMantraRoom()?'Scegli un giocatore da bandire':`Scegli un ${nominationRoleName(nominationState.role)}`;
            document.getElementById('nomination-picker-subtitle').textContent=isMantraRoom()?'MANTRA · banditura libera, qualsiasi ruolo':`Solo ruolo ${nominationState.role}`;
            renderNominationCandidates();
            document.getElementById('nomination-picker-overlay').classList.add('open');
        }
        function closeNominationPicker(){
            document.getElementById('nomination-picker-overlay')?.classList.remove('open');
            // Se è ancora il tuo turno, non serve alcun reset: il pulsante
            // APRI LISTONE PER BANDIRE resta disponibile nella schermata giocatore.
            updateNominationUI();
        }
        function nominationPlayerValue(player){
            const raw=isMantraRoom()
                ?(player?.['FVM M']??player?.FVM??player?.['Qt.A M']??player?.['Qt.A']??0)
                :(player?.FVM??player?.['Qt.A']??0);
            const n=parseFloat(String(raw).replace(',','.'));
            return Number.isFinite(n)?n:0;
        }


        function renderNominationCandidates(){
            const box=document.getElementById('nomination-candidates');
            if(!box)return;


            const eligible=playersList
                .filter(p=>isMantraRoom() || String(playerRole(p)).toUpperCase()===String(nominationState.role))
                .filter(p=>!auctionedPlayerIds.has(String(p.Id)));
            const list=filterAndSortPlayers(eligible,'nomination').slice(0,150);

            box.innerHTML=list.length?list.map(p=>{
                const r=playerRole(p)||'-';
                const priority=shortlistPriority(p.Id);
                return `<button class="nomination-player-row${priority?` priority-${priority}`:''}" onclick="submitNomination('${p.Id}')">
                    <span class="nomination-priority-slot">${priorityBadgeHtml(priority)}</span>
                    <span class="role-badge role-${escapeHtml(String(r||'').toUpperCase())}">${escapeHtml(r)}</span>
                    <span class="nomination-player-main"><b>${escapeHtml(p.Nome)}</b><small>${escapeHtml(p.Squadra)}</small></span>
                    <span class="nomination-player-fvm">${escapeHtml(String(nominationPlayerValue(p)||''))}</span>
                </button>`;
            }).join(''):'<div class="nomination-empty">Nessun giocatore disponibile.</div>';
        }

        async function submitNomination(id){
            if(nominationRequestPending)return;

            const p=playersList.find(x=>String(x.Id)===String(id));
            if(!p || !await appConfirm(`Bandire ${p.Nome}?`))return;

            nominationRequestPending=true;
            updateNominationUI();
            closeNominationPicker();

            const payload={
                team_id:myTeamId,
                player_id:p.Id
            };

            // Sullo stesso dispositivo banditore+giocatore il broadcast
            // potrebbe non tornare al mittente. Gestiamo quindi la scelta
            // direttamente nel flusso host.
            if(isAuctioneerPlayerIdentity()){
                await handleNominationSubmission(payload);
                return;
            }

            nominationReady=false;
            channel?.send({
                type:'broadcast',
                event:'nominate_player',
                payload
            }).catch(()=>{
                nominationRequestPending=false;
                nominationReady=true;
                updateNominationUI();
            });
        }

        async function closePlayerSetupChannel(){
            const ch=playerSetupChannel;
            playerSetupChannel=null;
            playerSetupRoomId=null;
            playerSetupOccupiedIds=new Set();
            if(ch){
                try{await supabaseClient.removeChannel(ch);}catch(e){}
            }
        }

        function renderPlayerTeamChoices(teams=[],occupiedIds=new Set(),selectedId=''){
            const sel=document.getElementById('player-team-select');
            const help=document.getElementById('player-team-help');
            if(!sel)return;

            const free=teams.filter(t=>!occupiedIds.has(String(t.id)));
            sel.disabled=false;

            if(!teams.length){
                sel.innerHTML='<option value="">Nessuna squadra creata dal banditore</option>';
                sel.disabled=true;
                if(help)help.textContent='Il banditore deve prima creare le squadre da Gestione asta.';
                return;
            }

            if(!free.length){
                sel.innerHTML='<option value="">Tutte le squadre risultano già collegate</option>';
                sel.disabled=true;
                if(help)help.textContent='Non ci sono squadre disponibili in questo momento.';
                if(typeof startPlayerOccupiedRetryCountdown==='function'){
                    setTimeout(()=>startPlayerOccupiedRetryCountdown(null,''),0);
                }
                return;
            }

            sel.innerHTML='<option value="">Seleziona la tua squadra...</option>'+
                free.map(t=>`<option value="${escapeHtml(String(t.id))}">${escapeHtml(t.name)}</option>`).join('');

            if(selectedId && free.some(t=>String(t.id)===String(selectedId))){
                sel.value=String(selectedId);
            }

            if(help){
                const occupiedCount=teams.length-free.length;
                help.textContent=occupiedCount
                    ? `${occupiedCount} squadra${occupiedCount===1?'':'e'} già collegata${occupiedCount===1?'':'e'} e nascosta${occupiedCount===1?'':'e'}.`
                    : 'Tutte le squadre sono disponibili.';
            }
        }

        async function fetchOccupiedTeamIds(room,requestTimeout=900){
            if(!room?.id)return new Set();

            await closePlayerSetupChannel();

            const requestId=`avail_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
            const occupied=new Set();

            const ch=supabaseClient.channel(`fanta-room-${room.id}`,{
                config:{presence:{key:`chooser_${Date.now()}_${Math.random().toString(36).slice(2,8)}`}}
            });
            playerSetupChannel=ch;
            playerSetupRoomId=room.id;

            return await new Promise(resolve=>{
                let done=false;
                const finish=()=>{
                    if(done)return;
                    done=true;

                    // Fallback Presence: raccogli anche eventuali player visibili direttamente.
                    try{
                        const state=ch.presenceState?.()||{};
                        Object.values(state).forEach(entries=>{
                            (Array.isArray(entries)?entries:[]).forEach(entry=>{
                                if(String(entry?.type||'')==='player' && entry?.team_id){
                                    occupied.add(String(entry.team_id));
                                }
                            });
                        });
                    }catch(e){}

                    playerSetupOccupiedIds=new Set(occupied);
                    resolve(new Set(occupied));
                };

                ch.on('broadcast',{event:'team_availability_state'},payload=>{
                    const d=payload.payload||{};
                    if(String(d.request_id)!==requestId)return;
                    (Array.isArray(d.occupied_ids)?d.occupied_ids:[]).forEach(id=>occupied.add(String(id)));
                    finish();
                });

                ch.on('presence',{event:'sync'},()=>{});

                ch.subscribe(status=>{
                    if(status==='SUBSCRIBED'){
                        ch.send({
                            type:'broadcast',
                            event:'team_availability_request',
                            payload:{request_id:requestId}
                        }).catch(()=>{});
                    }
                });

                setTimeout(finish,requestTimeout);
            });
        }


        const SHOW_ROOMS_SETTING_KEY='liveasta_show_rooms';

        async function loadShowRoomsSetting(){
            try{
                const {data,error}=await supabaseClient
                    .from('fanta_app_data')
                    .select('data')
                    .eq('key',SHOW_ROOMS_SETTING_KEY)
                    .maybeSingle();

                if(error)throw error;
                if(typeof data?.data?.enabled==='boolean'){
                    showRoomsToUsers=!!data.data.enabled;
                }else{
                    showRoomsToUsers=true;
                }
            }catch(e){
                console.warn('Lettura impostazione mostra stanze non riuscita',e);
                showRoomsToUsers=true;
            }

            updateShowRoomsAdminUI();
            applyPlayerRoomVisibilityUI();
            applyAuctioneerRoomVisibilityUI();
            return showRoomsToUsers;
        }

        async function saveShowRoomsSetting(){
            const {error}=await supabaseClient
                .from('fanta_app_data')
                .upsert({
                    key:SHOW_ROOMS_SETTING_KEY,
                    data:{enabled:!!showRoomsToUsers},
                    file_name:'impostazioni-accesso-stanze',
                    updated_at:new Date().toISOString()
                },{onConflict:'key'});

            if(error){
                console.warn('Salvataggio mostra stanze non riuscito',error);
                return false;
            }
            return true;
        }

        function updateShowRoomsAdminUI(){
            const btn=document.getElementById('admin-show-rooms-toggle');
            if(!btn)return;
            btn.textContent=showRoomsToUsers?'MOSTRA STANZE: ON':'MOSTRA STANZE: OFF';
            btn.classList.toggle('enabled',showRoomsToUsers);
            btn.classList.toggle('disabled',!showRoomsToUsers);
        }

        async function toggleShowRoomsSetting(){
            const previous=showRoomsToUsers;
            showRoomsToUsers=!showRoomsToUsers;
            updateShowRoomsAdminUI();
            applyPlayerRoomVisibilityUI();
            applyAuctioneerRoomVisibilityUI();

            const ok=await saveShowRoomsSetting();
            if(!ok){
                showRoomsToUsers=previous;
                updateShowRoomsAdminUI();
                applyPlayerRoomVisibilityUI();
                applyAuctioneerRoomVisibilityUI();
                alert('Impossibile salvare questa impostazione.');
            }
        }

        function applyPlayerRoomVisibilityUI(){
            const select=document.getElementById('player-room-select');
            const input=document.getElementById('player-room-name-input');
            const help=document.getElementById('player-room-mode-help');

            if(select)select.style.display=showRoomsToUsers?'block':'none';
            if(input)input.style.display=showRoomsToUsers?'none':'block';

            if(help){
                help.textContent=showRoomsToUsers
                    ?'Scegli la stanza creata dal banditore'
                    :'Digita il nome esatto della stanza';
            }
        }

        function applyAuctioneerRoomVisibilityUI(){
            const select=document.getElementById('auction-room-select');
            const input=document.getElementById('auction-room-name-input');
            const help=document.getElementById('auction-room-mode-help');

            if(select)select.style.display=showRoomsToUsers?'block':'none';
            if(input)input.style.display=showRoomsToUsers?'none':'block';

            if(help){
                help.textContent=showRoomsToUsers
                    ?'Scegli la stanza esistente'
                    :'Digita il nome esatto della stanza';
            }
        }

        function schedulePlayerTeamChoicesRefresh(){
            clearTimeout(playerRoomRefreshTimer);
            playerRoomRefreshTimer=setTimeout(()=>refreshPlayerTeamChoices(),220);
        }

        async function getRoomByExactName(name){
            const clean=normalizeRoomCode(name);
            if(!clean)return null;

            const cached=roomsCache.find(r=>
                String(r.name||'').toLocaleLowerCase('it')===clean.toLocaleLowerCase('it')
            );
            if(cached)return cached;

            const {data,error}=await supabaseClient
                .from('fanta_rooms')
                .select('*')
                .ilike('name',clean)
                .maybeSingle();

            if(error||!data)return null;
            return data;
        }

        async function getPlayerSetupRoom(){
            if(showRoomsToUsers){
                const roomId=document.getElementById('player-room-select')?.value||'';
                if(!roomId)return null;
                return await getRoomById(roomId);
            }

            const roomName=document.getElementById('player-room-name-input')?.value||'';
            return await getRoomByExactName(roomName);
        }


        function clearPlayerPinError(){
            const el=document.getElementById('player-pin-error');
            if(el)el.textContent='';
        }

        function resetPlayerPinPanel(){
            playerPinMode='unknown';
            playerPinTeamId='';
            playerPinRoomId='';
            const panel=document.getElementById('player-pin-panel');
            const pin=document.getElementById('player-pin');
            const confirmPin=document.getElementById('player-pin-confirm');
            const help=document.getElementById('player-pin-help');
            const title=document.getElementById('player-pin-title');
            if(panel)panel.style.display='none';
            if(pin)pin.value='';
            if(confirmPin){confirmPin.value='';confirmPin.style.display='none';}
            if(help)help.textContent='';
            if(title)title.textContent='PIN giocatore';
            clearPlayerPinError();
        }

        async function preparePlayerPinPanel(room,teamId){
            if(!room || !teamId){
                resetPlayerPinPanel();
                return;
            }

            const panel=document.getElementById('player-pin-panel');
            const pin=document.getElementById('player-pin');
            const confirmPin=document.getElementById('player-pin-confirm');
            const help=document.getElementById('player-pin-help');
            const title=document.getElementById('player-pin-title');

            if(panel)panel.style.display='block';
            clearPlayerPinError();

            try{
                const {data,error}=await supabaseClient.rpc('liveasta_team_pin_status',{
                    p_team_id:teamId,
                    p_room_id:room.id
                });
                if(error)throw error;

                playerPinTeamId=String(teamId);
                playerPinRoomId=String(room.id);
                playerPinMode=data===true?'verify':'create';

                if(pin)pin.value='';
                if(confirmPin)confirmPin.value='';

                if(playerPinMode==='create'){
                    if(title)title.textContent='Crea il tuo PIN';
                    if(help)help.textContent='Primo accesso: scegli un PIN personale di 6 cifre e ripetilo per conferma.';
                    if(confirmPin)confirmPin.style.display='block';
                    if(pin)pin.placeholder='Scegli PIN 6 cifre';
                }else{
                    if(title)title.textContent='PIN giocatore';
                    if(help)help.textContent='Inserisci il PIN personale associato a questa squadra.';
                    if(confirmPin)confirmPin.style.display='none';
                    if(pin)pin.placeholder='PIN 6 cifre';
                }
            }catch(e){
                playerPinMode='unknown';
                if(panel)panel.style.display='block';
                if(title)title.textContent='PIN giocatore';
                if(help)help.textContent='Impossibile verificare lo stato del PIN.';
                const er=document.getElementById('player-pin-error');
                if(er)er.textContent='Riprova tra qualche secondo.';
            }
        }

        async function ensurePlayerPinAccess(room,teamId,roomPassword){
            const pin=(document.getElementById('player-pin')?.value||'').trim();
            const confirmPin=(document.getElementById('player-pin-confirm')?.value||'').trim();
            const er=document.getElementById('player-pin-error');
            if(er)er.textContent='';

            if(!/^\d{6}$/.test(pin)){
                if(er)er.textContent='Inserisci un PIN di 6 cifre.';
                return false;
            }

            if(playerPinMode==='create'){
                if(pin!==confirmPin){
                    if(er)er.textContent='I due PIN non coincidono.';
                    return false;
                }

                const {data,error}=await supabaseClient.rpc('liveasta_set_initial_team_pin',{
                    p_team_id:teamId,
                    p_room_id:room.id,
                    p_room_password:roomPassword,
                    p_pin:pin
                });

                if(error){
                    const msg=String(error.message||'');
                    if(/gia impostato|già impostato/i.test(msg)){
                        playerPinMode='verify';
                        if(document.getElementById('player-pin-confirm'))document.getElementById('player-pin-confirm').style.display='none';
                        if(er)er.textContent='Il PIN è stato impostato da un altro accesso. Inserisci il PIN corretto.';
                    }else{
                        if(er)er.textContent=msg||'Impostazione PIN non riuscita.';
                    }
                    return false;
                }
                return data===true;
            }

            if(playerPinMode!=='verify'){
                await preparePlayerPinPanel(room,teamId);
                return false;
            }

            const {data,error}=await supabaseClient.rpc('liveasta_verify_team_pin',{
                p_team_id:teamId,
                p_room_id:room.id,
                p_room_password:roomPassword,
                p_pin:pin
            });

            if(error){
                if(er)er.textContent='Verifica PIN non riuscita.';
                return false;
            }
            if(data!==true){
                if(er)er.textContent='PIN errato.';
                return false;
            }
            return true;
        }

        async function refreshRoomTeamPinStatuses(){
            roomTeamPinStatusMap=new Map();
            if(!currentRoomId)return;
            try{
                const {data,error}=await supabaseClient.rpc('liveasta_room_team_pin_status',{
                    p_room_id:currentRoomId
                });
                if(error)throw error;
                (data||[]).forEach(row=>roomTeamPinStatusMap.set(String(row.team_id),row.pin_set===true));
            }catch(e){
                console.warn('Stato PIN squadre non disponibile',e);
            }
        }

        function teamPinStatusHtml(teamId){
            const set=roomTeamPinStatusMap.get(String(teamId));
            if(set===true)return '<span class="team-pin-status set">🔒 PIN impostato</span>';
            if(set===false)return '<span class="team-pin-status unset">○ PIN non impostato</span>';
            return '<span class="team-pin-status unknown">PIN --</span>';
        }

        async function openAdminTeamPinManager(roomId){
            if(!adminSessionPassword){
                alert('Sessione superuser scaduta. Accedi di nuovo.');
                openAdminLogin();
                return;
            }
            adminPinManagerRoomId=roomId;
            const room=roomsCache.find(r=>String(r.id)===String(roomId));
            const label=document.getElementById('admin-team-pin-room');
            const list=document.getElementById('admin-team-pin-list');
            if(label)label.textContent=room?.name||'Stanza';
            if(list)list.innerHTML='<div class="admin-team-pin-loading">Caricamento giocatori…</div>';

            document.getElementById('admin-team-pin-overlay')?.classList.add('open');

            try{
                const {data,error}=await supabaseClient.rpc('liveasta_admin_team_pin_overview',{
                    p_room_id:roomId,
                    p_password:adminSessionPassword
                });
                if(error)throw error;

                if(!list)return;
                if(!(data||[]).length){
                    list.innerHTML='<div class="admin-team-pin-empty">Nessun giocatore/squadra in questa stanza.</div>';
                    return;
                }

                list.innerHTML=(data||[]).map(row=>`
                    <div class="admin-team-pin-row">
                        <div class="admin-team-pin-player">
                            <strong>${escapeHtml(row.team_name||'Squadra')}</strong>
                            <span class="team-pin-status ${row.pin_set?'set':'unset'}">${row.pin_set?'🔒 PIN impostato':'○ PIN non impostato'}</span>
                        </div>
                        <button class="btn btn-danger btn-small"
                                type="button"
                                ${row.pin_set?'':'disabled'}
                                onclick="adminResetTeamPin('${row.team_id}','${String(row.team_name||'').replace(/'/g,"\\'")}')">
                            Reset PWD
                        </button>
                    </div>
                `).join('');
            }catch(e){
                if(list)list.innerHTML='<div class="form-error">Impossibile caricare i PIN giocatori.</div>';
            }
        }

        function closeAdminTeamPinManager(){
            adminPinManagerRoomId=null;
            document.getElementById('admin-team-pin-overlay')?.classList.remove('open');
        }

        async function adminResetTeamPin(teamId,teamName){
            if(!adminSessionPassword)return;
            if(!await appConfirm(`Azzerare il PIN di "${teamName}"?\nAl prossimo accesso il giocatore dovrà crearne uno nuovo.`))return;

            try{
                const {data,error}=await supabaseClient.rpc('liveasta_reset_team_pin',{
                    p_team_id:teamId,
                    p_password:adminSessionPassword
                });
                if(error)throw error;
                if(data!==true)throw new Error('Reset non riuscito.');
                await openAdminTeamPinManager(adminPinManagerRoomId);
                if(String(currentRoomId||'')===String(adminPinManagerRoomId||'')){
                    await refreshRoomTeamPinStatuses();
                    renderRoomControl();
                }
            }catch(e){
                alert('Reset PIN non riuscito: '+(e.message||e));
            }
        }

        async function refreshPlayerTeamChoices(){
            const token=++playerSetupRefreshToken;
            const password=document.getElementById('player-room-password')?.value||'';
            const sel=document.getElementById('player-team-select');
            const help=document.getElementById('player-team-help');
            const previous=sel?.value||'';

            const room=await getPlayerSetupRoom();
            if(token!==playerSetupRefreshToken)return;

            if(!room){
                if(sel){
                    sel.disabled=true;
                    sel.innerHTML=showRoomsToUsers
                        ?'<option value="">Seleziona prima una stanza...</option>'
                        :'<option value="">Inserisci nome stanza e password...</option>';
                }
                if(help){
                    help.textContent=showRoomsToUsers
                        ?'Le squadre già collegate non vengono mostrate.'
                        :'Digita il nome esatto della stanza e poi la password.';
                }
                await closePlayerSetupChannel();
                return;
            }

            if(room && room.approved!==true){
                if(sel){sel.disabled=true;sel.innerHTML='<option value="">Stanza in attesa di approvazione...</option>';}
                if(help)help.textContent="Il superuser deve approvare la stanza prima dell'accesso.";
                await closePlayerSetupChannel();
                return;
            }

            if(!room || password!==String(room.password||'')){
                if(sel){sel.disabled=true;sel.innerHTML='<option value="">Inserisci la password corretta...</option>';}
                if(help)help.textContent='Dopo la password compariranno le squadre disponibili.';
                await closePlayerSetupChannel();
                return;
            }

            if(sel){sel.disabled=true;sel.innerHTML='<option value="">Controllo squadre disponibili...</option>';}
            if(help)help.textContent='Verifico chi è già collegato alla stanza…';

            const {data:teams,error}=await supabaseClient
                .from('fanta_teams')
                .select('*')
                .eq('room_id',room.id)
                .order('created_at');

            if(token!==playerSetupRefreshToken)return;

            if(error){
                if(sel){sel.disabled=true;sel.innerHTML='<option value="">Errore caricamento squadre</option>';}
                if(help)help.textContent='Impossibile leggere le squadre della stanza.';
                return;
            }

            const occupied=await fetchOccupiedTeamIds(room,1000);
            if(token!==playerSetupRefreshToken)return;

            let remembered='';
            try{remembered=localStorage.getItem(`fanta-last-team-${room.id}`)||'';}catch(e){}
            renderPlayerTeamChoices(teams||[],occupied,previous||remembered);

            const chosen=sel?.value||'';
            if(chosen)await preparePlayerPinPanel(room,chosen);
            else resetPlayerPinPanel();
        }


        async function handlePlayerTeamSelection(){
            const teamId=document.getElementById('player-team-select')?.value||'';
            const room=await getPlayerSetupRoom();
            const roomPassword=document.getElementById('player-room-password')?.value||'';

            if(!teamId || !room || roomPassword!==String(room.password||'')){
                resetPlayerPinPanel();
                return;
            }
            await preparePlayerPinPanel(room,teamId);
        }

        async function selectExistingTeam(teamId){
            await loadRoomState();
            const team=teamsCache.find(t=>String(t.id)===String(teamId));
            if(!team)throw new Error('Squadra non trovata. Aggiorna l’elenco e riprova.');

            myTeamId=team.id;
            myTeamName=team.name;

            try{localStorage.setItem(`fanta-last-team-${currentRoomId}`,String(team.id));}catch(e){}
            return team;
        }

        


        function playerBudgetStateKey(){
            return currentRoomId && myTeamId
                ? `liveasta_budget_${currentRoomId}_${String(myTeamId)}`
                : '';
        }

        function playerBudgetTotalCredits(){
            return Math.max(1,parseInt(currentRoom?.initial_credits??500)||500);
        }

        const BUDGET_ROLES=['P','D','C','A'];
        const budgetDonorSelections=new Map();
        const budgetDonorAmounts=new Map();
        let budgetInputUnit='credits';
        const budgetSaveTimers=new Map();
        let budgetPlanReadyFor='';

        function budgetCreditNumber(value,fallback=0){
            if(value===null||value===undefined||String(value).trim()==='')return fallback;
            const n=Number(String(value).replace(',','.'));
            return Number.isFinite(n)?Math.max(0,Math.round(n)):fallback;
        }

        function budgetDefaultAlert(credits){return Math.floor(Math.max(0,credits)*.8);}

        function budgetAlertCredits(role){
            const limit=budgetCreditNumber(playerBudgetPlan[role]);
            return Math.min(limit,budgetCreditNumber(playerBudgetPlan.alerts?.[role],budgetDefaultAlert(limit)));
        }

        function setBudgetRoleAlert(role,value){
            if(!BUDGET_ROLES.includes(role))return;
            playerBudgetPlan.alerts=playerBudgetPlan.alerts||{};
            playerBudgetPlan.alerts[role]=Math.min(budgetCreditNumber(playerBudgetPlan[role]),budgetCreditNumber(value,budgetDefaultAlert(playerBudgetPlan[role])));
            renderPlayerBudgetManager();updatePlayerBidBudgetVisuals();schedulePlayerBudgetSave();
        }

        function setBudgetInputUnit(unit){
            if(!['credits','percent'].includes(unit))return;
            budgetInputUnit=unit;renderPlayerBudgetManager();
        }

        function setBudgetDonorAmount(target,role,value){
            const plan=budgetRebalancePlan(target);
            if(!plan.selected.has(role))return;
            const amounts={...plan.transfers,[role]:budgetCreditNumber(value)};
            budgetDonorAmounts.set(budgetDonorKey(target),amounts);
            renderBudgetRebalance();
        }

        function budgetDonorKey(target){return playerBudgetStateKey()+':'+target;}
        function toggleBudgetDonor(target,donor){
            if(!BUDGET_ROLES.includes(target)||!BUDGET_ROLES.includes(donor)||target===donor)return;
            const key=budgetDonorKey(target),set=budgetDonorSelections.get(key)||new Set();
            set.has(donor)?set.delete(donor):set.add(donor);budgetDonorSelections.set(key,set);
            budgetDonorAmounts.delete(key);
            renderBudgetRebalance();
        }

        function budgetRebalancePlan(target){
            const spent=playerBudgetSpentByRole();
            const deficit=Math.max(0,(spent[target]||0)-budgetCreditNumber(playerBudgetPlan[target]));
            const selected=budgetDonorSelections.get(budgetDonorKey(target))||new Set();
            const donors=BUDGET_ROLES.filter(r=>r!==target).map(role=>({role,available:Math.max(0,budgetCreditNumber(playerBudgetPlan[role])-(spent[role]||0))}));
            const chosen=donors.filter(d=>selected.has(d.role)&&d.available>0);
            const available=chosen.reduce((sum,d)=>sum+d.available,0);
            let valid=deficit>0&&available>=deficit;
            const transfers={};
            if(valid){
                chosen.forEach(d=>transfers[d.role]=Math.floor(deficit*d.available/available));
                let remaining=deficit-Object.values(transfers).reduce((a,b)=>a+b,0);
                const ordered=[...chosen].sort((a,b)=>(deficit*b.available/available-Math.floor(deficit*b.available/available))-(deficit*a.available/available-Math.floor(deficit*a.available/available)));
                for(const donor of ordered){if(remaining>0 && transfers[donor.role]<donor.available){transfers[donor.role]++;remaining--;}}
            }
            const custom=budgetDonorAmounts.get(budgetDonorKey(target));
            if(custom){
                for(const role of Object.keys(transfers))delete transfers[role];
                donors.filter(d=>selected.has(d.role)).forEach(d=>transfers[d.role]=budgetCreditNumber(custom[d.role]));
                valid=deficit>0 && Object.values(transfers).reduce((a,b)=>a+b,0)===deficit
                    && donors.every(d=>(transfers[d.role]||0)<=d.available);
            }
            return {target,deficit,donors,selected,available,valid,transfers};
        }

        function applyBudgetRebalance(target){
            if(!BUDGET_ROLES.includes(target))return;
            const plan=budgetRebalancePlan(target); // Recompute against current purchases before applying.
            if(!plan.valid){renderBudgetRebalance();return;}
            for(const [role,amount] of Object.entries(plan.transfers))playerBudgetPlan[role]-=amount;
            playerBudgetPlan[target]+=plan.deficit;
            playerBudgetPlan.alerts=playerBudgetPlan.alerts||{};
            [target,...Object.keys(plan.transfers)].forEach(r=>playerBudgetPlan.alerts[r]=budgetDefaultAlert(playerBudgetPlan[r]));
            budgetDonorSelections.delete(budgetDonorKey(target));
            budgetDonorAmounts.delete(budgetDonorKey(target));
            renderPlayerBudgetManager();updatePlayerBudgetVisuals();schedulePlayerBudgetSave();
        }

        function renderBudgetRebalance(){
            const box=document.getElementById('budget-rebalance');if(!box)return;
            const plans=BUDGET_ROLES.map(budgetRebalancePlan).filter(p=>p.deficit>0);
            box.innerHTML=plans.length?plans.map(p=>`<section class="budget-rebalance-card">
                <strong>Ruolo ${p.target}: mancano ${p.deficit} crediti</strong>
                <span>Scegli da quali ruoli recuperarli:</span>
                <div class="budget-donor-buttons">${BUDGET_ROLES.map(role=>{
                    const donor=p.donors.find(d=>d.role===role),available=donor?.available||0;
                    return `<button type="button" class="budget-donor role-${role}${p.selected.has(role)?' selected':''}" aria-pressed="${p.selected.has(role)}" ${available<=0?'disabled':''} onclick="toggleBudgetDonor('${p.target}','${role}')"><b>${role}</b><small>${available} liberi</small></button>`;
                }).join('')}</div>
                <div class="budget-transfer-amounts">${p.donors.filter(d=>p.selected.has(d.role)).map(d=>`<label>Da ${d.role} (max ${d.available})<input type="number" min="0" max="${d.available}" step="1" inputmode="numeric" value="${p.transfers[d.role]||0}" onchange="setBudgetDonorAmount('${p.target}','${d.role}',this.value)"></label>`).join('')}</div>
                <div class="budget-transfer-preview" aria-live="polite">${p.valid?Object.entries(p.transfers).map(([r,v])=>`${r}: −${v}`).join(' · ')+` → ${p.target}: +${p.deficit}`:`Da coprire: ${p.deficit}. Importi inseriti: ${Object.values(p.transfers).reduce((a,b)=>a+b,0)}. Rispetta il residuo dei ruoli scelti.`}</div>
                <button type="button" class="btn btn-secondary" ${p.valid?'':'disabled'} onclick="applyBudgetRebalance('${p.target}')">Conferma copertura: ${p.deficit} crediti</button>
            </section>`).join(''):'<div class="budget-balanced-note">Nessun reparto con residuo negativo.</div>';
        }


        function playerBudgetOfferState(amount){
            const role=String(currentAuctionPlayer?.R||'').toUpperCase();
            if(!playerBudgetPlan.enabled || isMantraRoom() || !['P','D','C','A'].includes(role))return {tone:'off'};
            const state=playerBudgetRoleState(role);
            const projected=state.spent+Math.max(0,Number(amount)||0);
            const limit=state.allocated;
            const tone=projected>=limit?'red':projected>=budgetAlertCredits(role)?'orange':'normal';
            return {tone,role,remaining:limit-projected};
        }

        function updatePlayerBidBudgetVisuals(){
            const controls=document.getElementById('normal-bid-controls');
            const input=document.getElementById('sealed-bid-input');
            const amount=playerSealedMode?(Number(input?.value)||0):(Number(currentAuctionValue)||0);
            const state=isAuctionActive||playerSealedMode?playerBudgetOfferState(amount):{tone:'off'};
            if(controls)controls.dataset.budgetTone=state.tone;
            const layer=document.getElementById('exact-bid-slider-layer');
            if(layer)layer.dataset.budgetTone=exactBidActive&&exactBidSelected>0?playerBudgetOfferState(exactBidSelected).tone:'off';
        }

        function defaultPlayerBudgetPlan(){
            const total=playerBudgetTotalCredits();
            const base=Math.floor(total/4);
            const remainder=total-(base*4);
            return {
                enabled:false,
                alerts:{}, initial:null, initialLocked:false, initialOrigin:null,
                P:base+(remainder>0?1:0),
                D:base+(remainder>1?1:0),
                C:base+(remainder>2?1:0),
                A:base
            };
        }

        function normalizePlayerBudgetPlan(plan){
            const total=playerBudgetTotalCredits(),roles=BUDGET_ROLES;
            const values=roles.map(r=>budgetCreditNumber(plan?.[r]));
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
            return {
                schemaVersion:2,enabled:!!plan?.enabled,
                ...Object.fromEntries(roles.map((r,i)=>[r,scaled[i]])),
                alerts:Object.fromEntries(roles.map((r,i)=>[r,Math.min(scaled[i],values[i]===scaled[i]?budgetCreditNumber(plan?.alerts?.[r],budgetDefaultAlert(scaled[i])):budgetDefaultAlert(scaled[i]))])),
                initial:hasInitial?Object.fromEntries(roles.map(r=>[r,budgetCreditNumber(plan.initial[r])])):null,
                initialLocked:hasInitial&&!!plan.initialLocked,
                initialOrigin:hasInitial?(plan.initialOrigin==='during-auction'?'during-auction':'before-auction'):null
            };
        }

        async function loadPlayerBudgetPlan(force=false){
            const key=playerBudgetStateKey();
            if(!key){playerBudgetPlan=defaultPlayerBudgetPlan();playerBudgetLoadedFor='';budgetPlanReadyFor='';return;}
            if(!force && budgetPlanReadyFor===key)return;
            budgetPlanReadyFor='';
            const local=safeReadLocalJson('liveasta_budget_cache_'+key);
            let remote=null;
            try{
                const {data,error}=await supabaseClient.from('fanta_app_data').select('data').eq('key',key).maybeSingle();
                if(error)throw error;
                remote=data?.data||null;
            }catch(e){console.warn('Caricamento budget: uso la copia locale se disponibile',e);}
            if(playerBudgetStateKey()!==key)return;
            const chosen=local&&(!remote||String(local.updated_at||'')>String(remote.updated_at||''))?local:remote;
            playerBudgetPlan=normalizePlayerBudgetPlan(chosen||defaultPlayerBudgetPlan());
            playerBudgetLoadedFor=key;budgetPlanReadyFor=key;
            renderPlayerBudgetManager();updatePlayerBudgetVisuals();
        }

        async function persistPlayerBudgetPlan(snapshot=null,savedKey=null){
            const key=savedKey||playerBudgetStateKey();if(!key)return;
            const data=snapshot||{...normalizePlayerBudgetPlan(playerBudgetPlan),total:playerBudgetTotalCredits(),updated_at:new Date().toISOString()};
            safeWriteLocalJson('liveasta_budget_cache_'+key,data);
            const status=document.getElementById('budget-save-status');
            try{
                const {error}=await supabaseClient.from('fanta_app_data').upsert({key,data,file_name:'player-budget-plan',updated_at:data.updated_at},{onConflict:'key'});
                if(error)throw error;
                if(status&&playerBudgetStateKey()===key)status.textContent='Budget salvato';
            }catch(e){
                if(status&&playerBudgetStateKey()===key)status.textContent='Salvato su questo dispositivo; sincronizzazione non riuscita.';
                console.warn('Salvataggio remoto budget non riuscito',e);
            }
        }

        function schedulePlayerBudgetSave(){
            const key=playerBudgetStateKey();if(!key||budgetPlanReadyFor!==key)return;
            const data={...normalizePlayerBudgetPlan(playerBudgetPlan),total:playerBudgetTotalCredits(),updated_at:new Date().toISOString()};
            safeWriteLocalJson('liveasta_budget_cache_'+key,data);
            const status=document.getElementById('budget-save-status');if(status)status.textContent='Salvataggio…';
            clearTimeout(budgetSaveTimers.get(key));
            budgetSaveTimers.set(key,setTimeout(()=>{budgetSaveTimers.delete(key);persistPlayerBudgetPlan(data,key);},180));
        }

        function playerBudgetSpentByRole(){
            const spent={P:0,D:0,C:0,A:0};

            if(!myTeamId)return spent;

            teamPurchases(myTeamId).forEach(p=>{
                const role=String(p.role||'').toUpperCase();
                if(spent[role]!==undefined){
                    spent[role]+=Math.max(0,parseInt(p.price)||0);
                }
            });

            return spent;
        }

        function playerBudgetRoleState(role){
            const r=String(role||'').toUpperCase();
            if(!['P','D','C','A'].includes(r))return {ok:true};

            const spent=playerBudgetSpentByRole();
            const counts=teamCounts(myTeamId);
            const limits=roomLimits();
            const allocated=Math.max(0,parseInt(playerBudgetPlan[r])||0);
            const spentRole=spent[r]||0;
            const remainingBudget=allocated-spentRole;
            const missingSlots=Math.max(0,(limits[r]||0)-(counts[r]||0));

            // Un piano è ancora rispettabile se nel reparto sono rimasti
            // almeno 1 credito per ogni slot ancora da completare.
            const ok=remainingBudget>=missingSlots;

            return {
                ok,
                allocated,
                spent:spentRole,
                remainingBudget,
                missingSlots
            };
        }

        function playerBudgetHealth(){
            if(!playerBudgetPlan.enabled || isMantraRoom())return 'off';

            const states=['P','D','C','A'].map(r=>playerBudgetRoleState(r).ok);
            const good=states.filter(Boolean).length;

            if(good===4)return 'green';
            if(good>0)return 'orange';
            return 'red';
        }

        function redistributePlayerBudget(changedRole,newCredits){
            const before={...playerBudgetPlan};
            const roles=['P','D','C','A'];
            const total=playerBudgetTotalCredits();
            const role=String(changedRole||'').toUpperCase();
            if(!roles.includes(role))return;

            const target=Math.max(0,Math.min(total,Math.round(Number(newCredits)||0)));
            const others=roles.filter(r=>r!==role);
            const remainder=total-target;

            const current=others.map(r=>Math.max(0,parseInt(playerBudgetPlan[r])||0));
            const currentSum=current.reduce((a,b)=>a+b,0);

            let nextOthers=[0,0,0];

            if(currentSum>0){
                nextOthers=current.map(v=>Math.floor(v*remainder/currentSum));
                let missing=remainder-nextOthers.reduce((a,b)=>a+b,0);

                const fractions=current
                    .map((v,i)=>({i,f:(v*remainder/currentSum)-Math.floor(v*remainder/currentSum)}))
                    .sort((a,b)=>b.f-a.f);

                let k=0;
                while(missing>0){
                    nextOthers[fractions[k%fractions.length].i]++;
                    missing--;
                    k++;
                }
            }else{
                const base=Math.floor(remainder/3);
                nextOthers=[base,base,base];
                let missing=remainder-base*3;
                for(let i=0;i<3 && missing>0;i++,missing--)nextOthers[i]++;
            }

            playerBudgetPlan[role]=target;
            others.forEach((r,i)=>playerBudgetPlan[r]=nextOthers[i]);
            playerBudgetPlan.alerts=playerBudgetPlan.alerts||{};
            roles.forEach(r=>{if(before[r]!==playerBudgetPlan[r])playerBudgetPlan.alerts[r]=budgetDefaultAlert(playerBudgetPlan[r]);});

            renderPlayerBudgetManager();
            updatePlayerBudgetVisuals();
            schedulePlayerBudgetSave();
        }

        function updateBudgetFromCredits(role,value){
            redistributePlayerBudget(role,parseInt(value)||0);
        }

        function updateBudgetFromPercent(role,value){
            const total=playerBudgetTotalCredits();
            const pct=Math.max(0,Math.min(100,Number(String(value).replace(',','.'))||0));
            redistributePlayerBudget(role,Math.round(total*pct/100));
        }

        function setPlayerBudgetEnabled(enabled){
            if(isMantraRoom()){
                playerBudgetPlan.enabled=false;
                renderPlayerBudgetManager();
                alert('La gestione budget P / D / C / A è disponibile nelle stanze Classic.');
                return;
            }

            playerBudgetPlan.enabled=!!enabled;
            renderPlayerBudgetManager();
            updatePlayerBudgetVisuals();
            schedulePlayerBudgetSave();
        }

        async function openPlayerBudgetManager(){
            if(!currentRoomId || !myTeamId)return;

            if(isMantraRoom()){
                alert('La gestione budget P / D / C / A è disponibile nelle stanze Classic.');
                return;
            }

            // Elimina subito focus/tap-highlight del riquadro Slot · Budget prima
            // che l'overlay venga disegnato: evita il lampo blu visibile dietro al modal.
            try{ document.activeElement?.blur?.(); }catch(_e){}
            const overlay=document.getElementById('player-budget-overlay');
            overlay?.classList.add('open');

            // Disegna immediatamente lo stato già disponibile, poi aggiorna dai dati salvati.
            renderPlayerBudgetManager();
            try{
                await loadPlayerBudgetPlan();
                renderPlayerBudgetManager();
            }catch(err){
                console.warn('Budget plan load failed',err);
            }
        }

        function closePlayerBudgetManager(){
            document.getElementById('player-budget-overlay')?.classList.remove('open');
        }

        function renderPlayerBudgetManager(){
            if(!document.getElementById('player-budget-overlay'))return;
            const total=playerBudgetTotalCredits(),spent=playerBudgetSpentByRole();
            const toggle=document.getElementById('player-budget-enabled');if(toggle)toggle.checked=!!playerBudgetPlan.enabled;
            const title=document.getElementById('player-budget-total-label');if(title)title.textContent=`Budget totale: ${total} crediti`;
            for(const unit of ['credits','percent']){
                document.getElementById(`budget-unit-${unit}`)?.setAttribute('aria-pressed',String(unit===budgetInputUnit));
                document.querySelectorAll(`[data-budget-unit="${unit}"]`).forEach(el=>el.hidden=unit!==budgetInputUnit);
            }
            for(const role of BUDGET_ROLES){
                const amount=budgetCreditNumber(playerBudgetPlan[role]);
                const ci=document.getElementById(`budget-credit-${role}`),pi=document.getElementById(`budget-percent-${role}`);
                const alert=document.getElementById(`budget-alert-${role}`),left=document.getElementById(`budget-left-${role}`);
                if(ci){ci.value=amount;ci.max=total;}
                if(pi)pi.value=(100*amount/total).toFixed(1);
                if(alert){alert.value=budgetAlertCredits(role);alert.max=amount;}
                if(left){left.textContent=String(amount-(spent[role]||0));left.classList.toggle('over',amount<(spent[role]||0));}
            }
            const current=document.getElementById('budget-current-credits');
            const team=teamsCache.find(t=>String(t.id)===String(myTeamId));
            if(current)current.textContent=String(team?.credits_remaining||0);
            renderBudgetRebalance();
        }

        function updatePlayerBudgetVisuals(){
            updatePlayerBidBudgetVisuals();
            const credits=document.getElementById('player-credits');
            const slots=document.getElementById('player-slots');

            if(!credits || !slots)return;

            credits.classList.remove('budget-health-green','budget-health-orange','budget-health-red');

            const active=!!playerBudgetPlan.enabled && !isMantraRoom();
            slots.classList.toggle('budget-management-active',active);
            slots.classList.toggle('budget-management-inactive',!active);

            if(!active){
                slots.querySelectorAll?.('.slot-budget-state').forEach(el=>{
                    el.classList.remove('budget-slot-ok','budget-slot-over');
                });
                return;
            }

            const health=playerBudgetHealth();
            if(health==='green')credits.classList.add('budget-health-green');
            else if(health==='orange')credits.classList.add('budget-health-orange');
            else if(health==='red')credits.classList.add('budget-health-red');

            slots.querySelectorAll?.('.slot-budget-state').forEach(el=>{
                const role=String(el.dataset.role||'').toUpperCase();
                const state=playerBudgetRoleState(role);

                el.classList.toggle('budget-slot-ok',state.ok);
                el.classList.toggle('budget-slot-over',!state.ok);
            });
        }

        function updatePlayerTeamStatus() {
            const t = myTeamId ? teamsCache.find(x => String(x.id) === String(myTeamId)) : findTeamByName(myTeamName);
            if (!t) return;
            myTeamId = t.id;
            const counts = teamCounts(t.id), limits = roomLimits();
            const free = Math.max(0,totalRoomSlots()-counts.total);
            const ce = document.getElementById('player-credits');
            if (ce) ce.innerText = t.credits_remaining;

            const se = document.getElementById('player-slots');
            if(se){
                if(isMantraRoom()){
                    se.textContent=`${free} liberi · Por ${counts.Por}/${mantraMinGoalkeepers()}`;
                }else{
                    const roles=['P','D','C','A'];
                    se.innerHTML=`<span class="slot-free-total">${free} •</span> `+
                        roles.map(r=>{
                            const missing=Math.max(0,(limits[r]||0)-(counts[r]||0));
                            return `<span class="slot-budget-state" data-role="${r}">${r}${missing}</span>`;
                        }).join(' ');
                }
            }

            updatePlayerBudgetVisuals();
            renderPlayerBudgetManager();
            const mine=filterAndSortPlayers(teamPurchases(t.id),'mine');

            const rb=document.getElementById('player-roster-btn'); if(rb) rb.innerText=`Rosa · ${teamPurchases(t.id).length}`;
            const rl=document.getElementById('player-roster-list'); if(rl) rl.innerHTML=mine.length?mine.map(x=>`<div class="roster-row"><span class="role-badge role-${escapeHtml(x.role)}">${escapeHtml(x.role)}</span><span class="player-roster-main"><b>${escapeHtml(x.player_name)}</b><small>${escapeHtml(x.club||'')}</small></span><b class="player-roster-price">${x.price}</b></div>`).join(''):'<div class="auctioned-empty">Nessun acquisto.</div>';
            refreshPlayerBidButtons();
        }

        function togglePlayerRoster(open) {
            if(open){
                loadPlayerUiPrefs();
                updatePlayerTeamStatus();
            }
            document.getElementById('player-roster-overlay')?.classList.toggle('open', !!open);
        }

        function playerRoomOverviewSlotsText(team){
            const counts=teamCounts(team.id);

            if(isMantraRoom()){
                const free=Math.max(0,mantraRosterMax()-counts.total);
                const porMissing=Math.max(0,mantraMinGoalkeepers()-(counts.Por||0));
                const minMissing=Math.max(0,mantraRosterMin()-counts.total);
                return `Liberi ${free} · Por mancanti ${porMissing} · Min rosa ${minMissing}`;
            }

            const limits=roomLimits();
            return ['P','D','C','A'].map(role=>{
                const missing=Math.max(0,(limits[role]||0)-(counts[role]||0));
                return `${role}${missing}`;
            }).join(' · ');
        }

        function playerRoomOverviewTotalMissing(team){
            const counts=teamCounts(team.id);
            if(isMantraRoom())return Math.max(0,mantraRosterMax()-counts.total);

            const limits=roomLimits();
            return ['P','D','C','A'].reduce(
                (sum,role)=>sum+Math.max(0,(limits[role]||0)-(counts[role]||0)),
                0
            );
        }

        function renderPlayerRoomOverview(){
            const list=document.getElementById('player-room-overview-list');
            const title=document.getElementById('player-room-overview-title');
            if(!list)return;

            if(title)title.textContent=currentRoom?.name||currentRoomCode||'Stanza';

            if(!teamsCache.length){
                list.innerHTML='<div class="player-room-overview-empty">Nessuna squadra presente.</div>';
                return;
            }

            list.innerHTML=teamsCache.map(team=>{
                const mine=String(team.id)===String(myTeamId);
                const credits=parseInt(team.credits_remaining)||0;
                const missing=playerRoomOverviewTotalMissing(team);
                const slots=playerRoomOverviewSlotsText(team);

                return `<button type="button"
                               class="player-room-team-row${mine?' mine':''}"
                               onclick="openPlayerRoomTeamRoster('${escapeHtml(String(team.id))}')">
                    <span class="player-room-team-main">
                        <b>${escapeHtml(team.name||'Squadra')}${mine?' · TU':''}</b>
                        <small>${escapeHtml(slots)}</small>
                    </span>
                    <span class="player-room-team-stats">
                        <span><small>Crediti</small><b>${credits}</b></span>
                        <span><small>Slot mancanti</small><b>${missing}</b></span>
                    </span>
                    <span class="player-room-team-arrow">›</span>
                </button>`;
            }).join('');
        }

        async function openPlayerRoomOverview(){
            if(!currentRoomId)return;

            await loadRoomState();
            renderPlayerRoomOverview();

            document.getElementById('player-room-team-roster-overlay')?.classList.remove('open');
            document.getElementById('player-room-overview-overlay')?.classList.add('open');
        }

        function closePlayerRoomOverview(){
            document.getElementById('player-room-overview-overlay')?.classList.remove('open');
            document.getElementById('player-room-team-roster-overlay')?.classList.remove('open');
        }

        function openPlayerRoomTeamRoster(teamId){
            listFilterTeamId=teamId;
            const team=teamsCache.find(t=>String(t.id)===String(teamId));
            if(!team)return;

            const title=document.getElementById('player-room-team-roster-title');
            const meta=document.getElementById('player-room-team-roster-meta');
            const list=document.getElementById('player-room-team-roster-list');

            if(title)title.textContent=team.name||'Squadra';
            if(meta){
                meta.textContent=`${parseInt(team.credits_remaining)||0} crediti · ${playerRoomOverviewSlotsText(team)}`;
            }

            const purchases=filterAndSortPlayers(teamPurchases(team.id),'team');
            if(list){
                list.innerHTML=purchases.length?purchases.map(p=>`
                    <button type="button"
                            class="player-room-roster-line"
                            onclick="openRoomRosterPlayerPreview('${escapeHtml(String(p.id))}')">
                        <span class="role-badge role-${escapeHtml(p.role||'')}">${escapeHtml(p.role||'-')}</span>
                        <span class="player-room-roster-main">
                            <b>${escapeHtml(p.player_name||'')}</b>
                            <small>${escapeHtml(p.club||'')}</small>
                        </span>
                        <span class="player-room-roster-price">${parseInt(p.price)||0}</span>
                    </button>
                `).join(''):'<div class="player-room-overview-empty">Nessun giocatore acquistato.</div>';
            }

            document.getElementById('player-room-overview-overlay')?.classList.remove('open');
            document.getElementById('player-room-team-roster-overlay')?.classList.add('open');
        }

        function closePlayerRoomTeamRoster(){
            document.getElementById('player-room-team-roster-overlay')?.classList.remove('open');
            renderPlayerRoomOverview();
            document.getElementById('player-room-overview-overlay')?.classList.add('open');
        }

        function openRoomRosterPlayerPreview(purchaseId){
            const purchase=(purchasesCache||[]).find(
                p=>String(p.id)===String(purchaseId)
            );
            if(!purchase)return;

            const player=playersList.find(
                p=>String(p.Id)===String(purchase.player_id)
            );

            const playerId=String(purchase.player_id||player?.Id||'');
            const name=String(purchase.player_name||player?.Nome||'--');
            const role=String(purchase.role||playerRole(player)||'-');
            const club=String(purchase.club||player?.Squadra||'-');

            const card=document.getElementById('room-roster-player-preview-card');
            const image=document.getElementById('room-roster-player-preview-image');
            const nameEl=document.getElementById('room-roster-player-preview-name');
            const roleEl=document.getElementById('room-roster-player-preview-role');
            const clubEl=document.getElementById('room-roster-player-preview-club');

            if(nameEl)nameEl.textContent=name;
            if(roleEl){
                roleEl.textContent=role;
                roleEl.classList.remove('role-P','role-D','role-C','role-A');
                const classicRole=String(role||'').trim().toUpperCase();
                if(['P','D','C','A'].includes(classicRole)) roleEl.classList.add('role-'+classicRole);
            }
            if(clubEl)clubEl.textContent=club;
            if(image)setPlayerImage(image,playerId,role);

            // Colori sociali del CLUB reale. La funzione viene esposta
            // dal runtime dei colori usato anche nelle schermate asta.
            const bg=typeof window.liveastaTeamBackgroundForClub==='function'
                ?window.liveastaTeamBackgroundForClub(club)
                :'linear-gradient(180deg,#171E28 0%,#111821 100%)';

            if(card){
                card.style.setProperty('--roster-preview-team-bg',bg);
                card.style.backgroundImage=bg;
            }

            document.getElementById('room-roster-player-preview-overlay')?.classList.add('open');
        }

        function closeRoomRosterPlayerPreview(event){
            if(event){
                event.preventDefault?.();
                event.stopPropagation?.();
            }
            document.getElementById('room-roster-player-preview-overlay')?.classList.remove('open');
        }


        function playerShortlistStateKey(){
            return currentRoomId && myTeamId
                ? `liveasta_shortlist_${currentRoomId}_${String(myTeamId)}`
                : '';
        }

        function shortlistPriority(playerId){
            const n=parseInt(playerShortlist.get(String(playerId)))||0;
            return [1,2,3].includes(n)?n:0;
        }

        function priorityBadgeHtml(priority,extraClass=''){
            const n=parseInt(priority)||0;
            if(![1,2,3].includes(n))return '';
            return `<span class="player-priority-badge priority-${n} ${extraClass}">${n}</span>`;
        }

        async function loadPlayerShortlist(force=false){
            const key=playerShortlistStateKey();
            if(!key){
                playerShortlist=new Map();
                playerShortlistLoadedFor='';
                return;
            }
            if(!force && playerShortlistLoadedFor===key)return;

            playerShortlist=new Map();
            playerShortlistLoadedFor=key;

            try{
                const {data,error}=await supabaseClient
                    .from('fanta_app_data')
                    .select('data')
                    .eq('key',key)
                    .maybeSingle();

                if(error)throw error;

                const picks=data?.data?.picks||{};
                Object.entries(picks).forEach(([id,rank])=>{
                    const n=parseInt(rank)||0;
                    if([1,2,3].includes(n))playerShortlist.set(String(id),n);
                });
            }catch(e){
                console.warn('Caricamento preferenze listone non riuscito',e);
            }

            renderCurrentPlayerPriority();
        }

        async function persistPlayerShortlist(){
            const key=playerShortlistStateKey();
            if(!key)return;

            const picks={};
            playerShortlist.forEach((rank,id)=>{
                const n=parseInt(rank)||0;
                if([1,2,3].includes(n))picks[String(id)]=n;
            });

            const now=new Date().toISOString();

            try{
                const {error}=await supabaseClient
                    .from('fanta_app_data')
                    .upsert({
                        key,
                        data:{
                            team_id:String(myTeamId),
                            team_name:String(myTeamName||''),
                            picks,
                            updated_at:now
                        },
                        file_name:'player-shortlist',
                        updated_at:now
                    },{onConflict:'key'});

                if(error)throw error;
            }catch(e){
                console.warn('Salvataggio preferenze listone non riuscito',e);
            }
        }

        function schedulePlayerShortlistSave(){
            clearTimeout(playerShortlistSaveTimer);
            playerShortlistSaveTimer=setTimeout(()=>persistPlayerShortlist(),180);
        }

        function setPhonePlayerDisplayName(name,playerId=null){
            const outer=document.getElementById('phone-player-name');
            const text=document.getElementById('phone-player-name-text');
            const badge=document.getElementById('phone-player-priority-badge');
            if(!outer)return;

            const safeName=String(name||'--');
            if(text)text.textContent=safeName;
            else outer.textContent=safeName;

            const id=playerId ?? currentAuctionPlayer?.Id;
            const priority=id!=null?shortlistPriority(id):0;

            if(badge){
                badge.className=`player-priority-badge auction-priority-badge${priority?` priority-${priority}`:''}`;
                badge.textContent=priority?String(priority):'';

                if(priority){
                    badge.style.setProperty('display','inline-flex','important');
                    badge.style.setProperty('color','#111','important');

                    const palette={
                        1:['linear-gradient(145deg,#FFF0A3,#D4A514)','#FFE780'],
                        2:['linear-gradient(145deg,#F7F8FA,#9EA6B0)','#E7EBEF'],
                        3:['linear-gradient(145deg,#E0A06B,#9B552A)','#E7AA77']
                    };
                    badge.style.setProperty('background',palette[priority][0],'important');
                    badge.style.setProperty('border-color',palette[priority][1],'important');
                }else{
                    // In il display:inline-flex!important della classe generica
                    // prevaleva sul display:none inline: appariva quindi un cerchio vuoto.
                    badge.style.setProperty('display','none','important');
                    badge.style.removeProperty('background');
                    badge.style.removeProperty('border-color');
                }
            }

            requestAnimationFrame(()=>{
                try{window.fitAllNames?.()}catch(e){}
            });
        }

        function renderCurrentPlayerPriority(){
            if(currentAuctionPlayer){
                setPhonePlayerDisplayName(
                    currentAuctionPlayer.Nome||currentAuctionPlayer.nome||'--',
                    currentAuctionPlayer.Id||currentAuctionPlayer.id
                );
            }
        }


        function playerListoneNumericValue(player){
            const raw=isMantraRoom()
                ?(player?.['FVM M']??player?.FVM??player?.['Qt.A M']??player?.['Qt.A']??0)
                :(player?.FVM??player?.['Qt.A']??0);
            const n=parseFloat(String(raw).replace(',','.'));
            return Number.isFinite(n)?n:0;
        }


        function updatePriorityLegendStats(){
            [1,2,3].forEach(rank=>{
                let total=0;
                let auctioned=0;

                playerShortlist.forEach((value,id)=>{
                    if(parseInt(value)!==rank)return;
                    total++;
                    if(auctionedPlayerIds.has(String(id)))auctioned++;
                });

                const el=document.getElementById(`priority-progress-${rank}`);
                if(el){
                    el.textContent=`${auctioned}/${total}`;
                    el.title=`${auctioned} già banditi su ${total} giocatori segnati come ${rank}ª scelta`;
                }
            });
        }


        function playerListonePurchaseFor(playerId){
            const id=String(playerId);
            return (purchasesCache||[]).find(x=>String(x.player_id)===id) || null;
        }

        function playerListoneStatus(playerId){
            const id=String(playerId);
            const purchase=playerListonePurchaseFor(id);

            if(purchase){
                return String(purchase.team_id)===String(myTeamId)
                    ?'mine'
                    :'other';
            }

            if(auctionedPlayerIds.has(id))return 'unsold';
            return 'available';
        }

        function playerListonePurchaseTeamName(purchase){
            if(!purchase)return '';
            const team=teamsCache.find(t=>String(t.id)===String(purchase.team_id));
            return String(team?.name||'Altra squadra');
        }

        function updatePlayerListoneSummary(){
            updatePriorityLegendStats();

            const summary=document.getElementById('player-listone-summary');
            if(!summary)return;

            const selected=[...playerShortlist.values()]
                .filter(x=>[1,2,3].includes(parseInt(x))).length;
            const available=playersList
                .filter(p=>!auctionedPlayerIds.has(String(p.Id))).length;

            summary.textContent=`${available} disponibili · ${selected} preferenze salvate`;
        }

        function updatePlayerListoneRowPriority(playerId){
            const id=String(playerId);
            const row=document.querySelector(`.player-listone-row[data-player-id="${CSS.escape(id)}"]`);
            if(!row)return;

            const priority=shortlistPriority(id);
            row.classList.remove('selected','priority-1','priority-2','priority-3');

            if(priority){
                row.classList.add('selected',`priority-${priority}`);
            }

            const slot=row.querySelector('.player-listone-priority');
            if(slot)slot.innerHTML=priorityBadgeHtml(priority);
        }

        function cyclePlayerShortlistPriority(playerId){
            const id=String(playerId);
            if(auctionedPlayerIds.has(id))return;

            const current=shortlistPriority(id);
            const next=current>=3?0:current+1;

            if(next)playerShortlist.set(id,next);
            else playerShortlist.delete(id);

            // NON ridisegnare tutto il listone: il giocatore resta esattamente
            // nella stessa posizione, quindi puoi fare 1°/2°/3° click senza
            // perdere il punto in cui stavi scorrendo.
            updatePlayerListoneRowPriority(id);
            updatePlayerListoneSummary();
            renderCurrentPlayerPriority();
            renderNominationCandidatesIfOpen();
            schedulePlayerShortlistSave();
        }

        async function clearPlayerShortlistWithConfirm(){
            if(!playerShortlist.size){
                alert('Non hai preferenze da rimuovere.');
                return;
            }

            if(!await appConfirm('Vuoi eliminare tutte le preferenze 1ª, 2ª e 3ª scelta di questa stanza?')){
                return;
            }

            playerShortlist.clear();

            document.querySelectorAll('.player-listone-row[data-player-id]').forEach(row=>{
                row.classList.remove('selected','priority-1','priority-2','priority-3');
                const slot=row.querySelector('.player-listone-priority');
                if(slot)slot.innerHTML='';
            });

            updatePlayerListoneSummary();
            updatePriorityLegendStats();
            renderCurrentPlayerPriority();
            await persistPlayerShortlist();
            renderNominationCandidatesIfOpen();
        }

        async function openPlayerListone(){
            if(!currentRoomId || !myTeamId)return;

            if(!playersList.length){
                try{
                    const {data}=await supabaseClient
                        .from('fanta_app_data')
                        .select('data')
                        .eq('key','official_listone')
                        .maybeSingle();
                    if(Array.isArray(data?.data))playersList=data.data;
                }catch(e){}
            }

            await loadPlayerShortlist();
            await loadRoomState();

            loadPlayerUiPrefs();
            const search=document.getElementById('player-listone-search');
            if(search)search.value='';

            updatePriorityLegendStats();

            renderPlayerListone({preserveScroll:false});
            document.getElementById('player-listone-overlay')?.classList.add('open');
        }

        function closePlayerListone(){
            document.getElementById('player-listone-overlay')?.classList.remove('open');
        }

        function renderPlayerListone(options={}){
            const box=document.getElementById('player-listone-list');
            if(!box)return;

            const preserveScroll=options?.preserveScroll!==false;
            const previousScroll=preserveScroll?box.scrollTop:0;

            const q=String(document.getElementById('player-listone-search')?.value||'')
                .trim().toLowerCase();

            const list=filterAndSortPlayers(playersList,'player');

            updatePlayerListoneSummary();

            box.innerHTML=list.length?list.map(p=>{
                const id=String(p.Id);
                const purchase=playerListonePurchaseFor(id);
                const status=playerListoneStatus(id);
                const auctioned=status!=='available';
                const priority=shortlistPriority(id);
                const role=playerRole(p)||'-';

                let ownerLabel='';
                let shownValue=playerListoneNumericValue(p)||'';

                if(status==='mine'){
                    ownerLabel='TUO';
                    shownValue=parseInt(purchase?.price)||0;
                }else if(status==='other'){
                    ownerLabel=playerListonePurchaseTeamName(purchase)||'ALTRO';
                    shownValue=parseInt(purchase?.price)||0;
                }else if(status==='unsold'){
                    ownerLabel='INVENDUTO';
                    shownValue='—';
                }

                return `<button class="player-listone-row${auctioned?' auctioned':''} status-${status}${priority?` selected priority-${priority}`:''}"
                               type="button"
                               data-player-id="${escapeHtml(id)}"
                               ${auctioned?'disabled':''}
                               onclick="cyclePlayerShortlistPriority('${escapeHtml(id)}')">
                    <span class="player-listone-priority">${priorityBadgeHtml(priority)}</span>
                    <span class="role-badge role-${escapeHtml(String(role||'').toUpperCase())}">${escapeHtml(role)}</span>
                    <span class="player-listone-main">
                        <b>${escapeHtml(p.Nome||'')}</b>
                        <small>${escapeHtml(p.Squadra||'')}</small>
                    </span>
                    <span class="player-listone-owner">${escapeHtml(ownerLabel)}</span>
                    <span class="player-listone-value${auctioned?' sold-value':''}">${escapeHtml(String(shownValue))}</span>
                </button>`;
            }).join(''):'<div class="player-listone-empty">Nessun giocatore trovato.</div>';

            if(preserveScroll){
                requestAnimationFrame(()=>{box.scrollTop=previousScroll;});
            }
        }

        function renderNominationCandidatesIfOpen(){
            if(document.getElementById('nomination-picker-overlay')?.classList.contains('open')){
                renderNominationCandidates();
            }
        }

        function refreshPlayerListoneIfOpen(){
            updatePriorityLegendStats();
            if(document.getElementById('player-listone-overlay')?.classList.contains('open')){
                renderPlayerListone();
            }
        }


        function broadcastStateChanged() {
            if (!channel) return;
            channel.send({type:'broadcast',event:'state_changed',payload:{at:Date.now()}}).catch(()=>{});
        }

        function toggleAuctionedList() {
            const box = document.getElementById('auctioned-list');
            const btn = document.getElementById('auctioned-toggle');
            const view = document.getElementById('view-list');
            if (!box || !btn) return;
            const willOpen = box.classList.contains('collapsed');
            box.classList.toggle('collapsed', !willOpen);
            btn.classList.toggle('open', willOpen);
            view?.classList.toggle('auctioned-open',willOpen);
        }


        function syncControlPurchasesCollapseUI(){
            const content=document.getElementById('control-purchases-content');
            const btn=document.getElementById('control-purchases-toggle');
            if(!content || !btn)return;

            content.classList.toggle('collapsed',!controlPurchasesExpanded);
            btn.classList.toggle('open',!!controlPurchasesExpanded);
            btn.setAttribute('aria-expanded',controlPurchasesExpanded?'true':'false');
        }

        function toggleControlPurchases(){
            controlPurchasesExpanded=!controlPurchasesExpanded;
            syncControlPurchasesCollapseUI();

            if(controlPurchasesExpanded){
                const search=document.getElementById('control-purchases-search');
                search?.blur();
            }
        }

        function renderControlPurchases(){
            const body=document.getElementById('control-purchases-body');
            const count=document.getElementById('control-purchase-count');
            const search=document.getElementById('control-purchases-search');
            if(!body)return;

            if(search && search.value!==controlPurchasesSearch){
                search.value=controlPurchasesSearch;
            }

            const q=String(controlPurchasesSearch||'').trim().toLowerCase();

            const filtered=filterAndSortPlayers((purchasesCache||[]).filter(x=>{
                const team=teamsCache.find(t=>String(t.id)===String(x.team_id));
                const text=[
                    x.player_name||'',
                    x.role||'',
                    team?.name||'',
                    x.price??''
                ].join(' ').toLowerCase();
                return !q || text.includes(q);
            }),'purchases');

            if(count){
                count.textContent=q
                    ? `${filtered.length}/${purchasesCache.length} acquisti`
                    : `${purchasesCache.length} acquisti`;
            }

            body.innerHTML=filtered.length
                ? filtered.map(x=>{
                    const team=teamsCache.find(t=>String(t.id)===String(x.team_id));
                    return `<tr>
                        <td>${escapeHtml(x.player_name)}</td>
                        <td><span class="role-badge role-${escapeHtml(x.role)}">${escapeHtml(x.role)}</span></td>
                        <td>${escapeHtml(team?.name||'--')}</td>
                        <td>${x.price}</td>
                        <td><button class="restore-btn" onclick="removePurchaseControl('${x.id}')">Ripristina</button></td>
                    </tr>`;
                }).join('')
                : `<tr><td colspan="5">${q?'Nessun acquisto corrisponde alla ricerca.':'Nessun acquisto'}</td></tr>`;

            syncControlPurchasesCollapseUI();
        }


        async function loadRooms(renderAdmin = false) {
            let query=supabaseClient.from('fanta_rooms').select('*').order('created_at', { ascending: true });
            if(!renderAdmin)query=query.eq('approved',true);
            const { data, error } = await query;
            if (error) {
                roomsCache = [];
                const msg = 'Database stanze non configurato. Esegui setup_supabase_rooms.sql su Supabase.';
                const pe = document.getElementById('player-room-error'); if (pe) pe.innerText = msg;
                const ae = document.getElementById('auction-room-error'); if (ae) ae.innerText = msg;
                if (renderAdmin) alert(msg);
                renderRoomSelects();
                renderAdminRooms();
                return [];
            }
            roomsCache = data || [];
            renderRoomSelects();
            if (renderAdmin) renderAdminRooms();
            return roomsCache;
        }

        function renderRoomSelects() {
            const options = roomsCache.length
                ? '<option value="">Seleziona una stanza...</option>' + roomsCache.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('')
                : '<option value="">Nessuna stanza disponibile</option>';
            ['player-room-select','auction-room-select'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = options;
            });
        }

        async function openPlayerLobby() {
            showScreen('screen-player-setup');
            document.getElementById('player-room-error').innerText = '';
            document.getElementById('player-room-password').value='';
            document.getElementById('player-room-name-input').value='';
            resetPlayerPinPanel();

            await loadShowRoomsSetting();

            if(showRoomsToUsers){
                await loadRooms();
            }else{
                applyPlayerRoomVisibilityUI();
                const sel=document.getElementById('player-team-select');
                if(sel){
                    sel.disabled=true;
                    sel.innerHTML='<option value="">Inserisci nome stanza e password...</option>';
                }
            }
            window.resetPlayerAccessWizard?.();
        }

        async function setAuctioneerRoomMode(mode) {
            if(mode!=='create' && mode!=='join') return;

            window.prepareAuctionAccessWizard?.();
            auctioneerRoomMode = mode;

            const choice=document.getElementById('auction-mode-choice');
            const fields=document.getElementById('auction-mode-fields');
            const createBox=document.getElementById('auction-create-box');
            const joinBox=document.getElementById('auction-join-box');
            const label=document.getElementById('auction-mode-selected-label');
            const err=document.getElementById('auction-room-error');

            if(choice) choice.style.display='none';
            if(fields) fields.style.display='block';
            if(createBox) createBox.style.display=mode==='create'?'block':'none';
            if(joinBox) joinBox.style.display=mode==='join'?'block':'none';
            if(label) label.textContent=mode==='create'?'CREA NUOVA STANZA':'ENTRA IN UNA STANZA';
            if(err) err.innerText='';

            if(mode==='join'){
                await loadShowRoomsSetting();
                applyAuctioneerRoomVisibilityUI();
                if(showRoomsToUsers) await loadRooms();
            }
            window.renderAuctionAccessWizard?.();
        }

        function resetAuctioneerRoomMode(){
            window.stopAuctioneerOccupiedRetryCountdown?.();
            window.prepareAuctionAccessWizard?.();
            auctioneerRoomMode=null;

            const choice=document.getElementById('auction-mode-choice');
            const fields=document.getElementById('auction-mode-fields');
            const createBox=document.getElementById('auction-create-box');
            const joinBox=document.getElementById('auction-join-box');
            const err=document.getElementById('auction-room-error');

            if(choice) choice.style.display='grid';
            if(fields) fields.style.display='none';
            if(createBox) createBox.style.display='none';
            if(joinBox) joinBox.style.display='none';

            const manualRoom=document.getElementById('auction-room-name-input');
            if(manualRoom) manualRoom.value='';
            const password=document.getElementById('auction-room-password');
            if(password) password.value='';

            if(err) err.innerText='';
            window.renderAuctionAccessWizard?.();
        }

        async function createRoom(name, password, config = {}) {
            const cleanName = normalizeRoomCode(name);
            if (!cleanName || !password) throw new Error('Inserisci nome e password della stanza.');
            const payload = {
                name: cleanName,
                password,
                initial_credits: Math.max(1, parseInt(config.initial_credits ?? 500) || 500),
                limit_p: Math.max(0, parseInt(config.limit_p ?? 3) || 0),
                limit_d: Math.max(0, parseInt(config.limit_d ?? 8) || 0),
                limit_c: Math.max(0, parseInt(config.limit_c ?? 8) || 0),
                limit_a: Math.max(0, parseInt(config.limit_a ?? 6) || 0),
                timer_seconds: Math.max(1, parseInt(config.timer_seconds ?? 5) || 5),
                prep_seconds: Math.max(1, Math.min(15, parseInt(config.prep_seconds ?? 5) || 5)),
                sealed_timer_seconds: Math.max(5, Math.min(180, parseInt(config.sealed_timer_seconds ?? 30) || 30)),
                sealed_reveal_seconds: Math.max(1, Math.min(30, parseInt(config.sealed_reveal_seconds ?? 5) || 5)),
                game_mode:String(config.game_mode||'classic').toLowerCase()==='mantra'?'mantra':'classic',
                mantra_min_roster:23,
                mantra_max_roster:Math.max(23,Math.min(90,parseInt(config.mantra_max_roster??30)||30)),
                mantra_min_goalkeepers:2,
                approved: false
            };
            if (payload.game_mode==='classic' && (payload.limit_p + payload.limit_d + payload.limit_c + payload.limit_a) < 1) throw new Error('La rosa Classic deve avere almeno uno slot.');
            const { data, error } = await supabaseClient.from('fanta_rooms').insert(payload).select().single();
            if (error) {
                if (String(error.message || '').toLowerCase().includes('duplicate')) throw new Error('Esiste già una stanza con questo nome.');
                throw new Error('Impossibile creare la stanza. Esegui il nuovo setup SQL su Supabase.');
            }
            await loadRooms();
            return data;
        }

        async function getRoomById(id) {
            const cached = roomsCache.find(r => r.id === id);
            if (cached) return cached;
            const { data, error } = await supabaseClient.from('fanta_rooms').select('*').eq('id', id).single();
            if (error || !data) return null;
            return data;
        }


        function createPresenceClientKey(){
            if(presenceClientKey) return presenceClientKey;
            try{
                if(globalThis.crypto?.randomUUID) presenceClientKey=crypto.randomUUID();
                else presenceClientKey=`client_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;
            }catch(e){
                presenceClientKey=`client_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;
            }
            return presenceClientKey;
        }

        async function trackPlayerPresence(){
            const activeChannel=channel;
            if(!activeChannel || !myTeamId || !myTeamName) return false;
            try{
                await activeChannel.track({
                    type:'player',
                    team_id:String(myTeamId),
                    team_name:String(myTeamName),
                    online_at:new Date().toISOString()
                });

                if(channel!==activeChannel) return false;
                presenceTracked=true;
                return true;
            }catch(e){
                console.warn('Presence track non riuscito',e);
                return false;
            }
        }

        async function untrackPlayerPresence(targetChannel=channel){
            if(!targetChannel || !presenceTracked) return;
            try{ await targetChannel.untrack(); }catch(e){}
            if(channel===targetChannel) presenceTracked=false;
        }

        function syncOnlinePlayersFromPresence(){
            if(!channel || typeof channel.presenceState!=='function') return;
            const state=channel.presenceState()||{};
            const seen=new Set();

            Object.values(state).forEach(entries=>{
                const list=Array.isArray(entries)?entries:[];
                list.forEach(entry=>{
                    if(String(entry?.type||'')!=='player')return;
                    const id=String(entry?.team_id||''); if(!id)return;
                    seen.add(id);
                    const old=onlinePlayers.get(id)||{};
                    onlinePlayers.set(id,{
                        ...old,
                        team_id:id,
                        team_name:String(entry?.team_name||old.team_name||'Squadra'),
                        from_presence:true,
                        presence_at:Date.now()
                    });
                });
            });

            for(const [id,p] of onlinePlayers.entries()){
                if(p?.from_presence&&!seen.has(id)){
                    onlinePlayers.set(id,{...p,from_presence:false,presence_at:0});
                }
            }

            cleanupFallbackOnlinePlayers();
            renderOnlinePlayers();
        }


        function playerAvailabilityKey(teamId){
            return currentRoomId&&teamId
                ?`liveasta_absence_${currentRoomId}_${teamId}`
                :'';
        }

        async function loadAbsentTeams(){
            absentTeamIds=new Set();
            if(!currentRoomId)return absentTeamIds;

            try{
                const prefix=`liveasta_absence_${currentRoomId}_%`;
                const {data,error}=await supabaseClient
                    .from('fanta_app_data')
                    .select('data')
                    .like('key',prefix);

                if(error)throw error;

                (data||[]).forEach(row=>{
                    const d=row?.data||{};
                    if(d.absent && d.team_id) absentTeamIds.add(String(d.team_id));
                });
            }catch(e){
                console.warn('Lettura modalità assente non riuscita',e);
            }

            renderOnlinePlayers();
            return absentTeamIds;
        }


        async function resetMyAvailabilityOnlineOnEntry(){
            playerAvailabilityMode='online';

            if(!currentRoomId || !myTeamId)return;

            absentTeamIds.delete(String(myTeamId));

            const now=new Date().toISOString();

            try{
                const {error}=await supabaseClient
                    .from('fanta_app_data')
                    .upsert({
                        key:playerAvailabilityKey(myTeamId),
                        data:{
                            team_id:String(myTeamId),
                            team_name:String(myTeamName||''),
                            absent:false,
                            updated_at:now
                        },
                        file_name:'player-availability',
                        updated_at:now
                    },{onConflict:'key'});

                if(error)throw error;
            }catch(e){
                console.warn('Reset ONLINE all’ingresso non riuscito',e);
            }

            // L'ingresso in stanza prevale sempre sul vecchio stato ASSENTE.
            setPlayerConnectionStatus(playerRealtimeOnline?'online':'connecting');
            renderOnlinePlayers();
        }

        function broadcastMyAvailabilityOnline(){
            if(!channel || !myTeamId)return;
            channel.send({
                type:'broadcast',
                event:'player_availability',
                payload:{
                    team_id:String(myTeamId),
                    team_name:String(myTeamName||''),
                    absent:false,
                    at:Date.now()
                }
            }).catch(()=>{});
        }

        async function loadMyAvailabilityMode(){
            playerAvailabilityMode='online';
            if(!currentRoomId||!myTeamId)return playerAvailabilityMode;

            try{
                const {data,error}=await supabaseClient
                    .from('fanta_app_data')
                    .select('data')
                    .eq('key',playerAvailabilityKey(myTeamId))
                    .maybeSingle();

                if(error)throw error;
                playerAvailabilityMode=data?.data?.absent?'absent':'online';
            }catch(e){
                console.warn('Lettura stato squadra non riuscita',e);
            }

            if(playerAvailabilityMode==='absent') absentTeamIds.add(String(myTeamId));
            else absentTeamIds.delete(String(myTeamId));

            // Mantiene il pallino corretto anche se la connessione realtime è già attiva.
            if(playerRealtimeOnline) setPlayerConnectionStatus('online');
            return playerAvailabilityMode;
        }

        function openPlayerAvailabilityModal(){
            if(!currentRoomId||!myTeamId)return;

            const modal=document.getElementById('player-availability-modal');
            const note=document.getElementById('player-availability-turn-note');

            if(note){
                note.textContent=nominationState.enabled
                    ?'ASSENTE vale fino a quando resti nella stanza: salti i READY, ma il tuo turno di banditura resta obbligatorio. Se esci e rientri torni ONLINE.'
                    :'ASSENTE vale per questa sessione: il banditore non aspetterà il tuo READY. Se esci e rientri torni ONLINE.';
                note.classList.toggle('mandatory',!!nominationState.enabled);
            }

            if(modal)modal.style.display='flex';
        }

        function closePlayerAvailabilityModal(){
            const modal=document.getElementById('player-availability-modal');
            if(modal)modal.style.display='none';
        }

        async function setMyAvailabilityMode(mode){
            if(!currentRoomId||!myTeamId)return;

            const absent=mode==='absent';
            playerAvailabilityMode=absent?'absent':'online';

            if(absent)absentTeamIds.add(String(myTeamId));
            else absentTeamIds.delete(String(myTeamId));

            const now=new Date().toISOString();

            try{
                const {error}=await supabaseClient
                    .from('fanta_app_data')
                    .upsert({
                        key:playerAvailabilityKey(myTeamId),
                        data:{
                            team_id:String(myTeamId),
                            team_name:String(myTeamName||''),
                            absent,
                            updated_at:now
                        },
                        file_name:'player-availability',
                        updated_at:now
                    },{onConflict:'key'});

                if(error)throw error;
            }catch(e){
                console.warn('Salvataggio modalità squadra non riuscito',e);
                alert('Non riesco a salvare la modalità della squadra. Riprova.');
                return;
            }

            // Il dispositivo resta connesso: cambia soltanto lo stato logico.
            setPlayerConnectionStatus('online');
            closePlayerAvailabilityModal();

            if(absent){
                closePlayerReadyBanner();
            }

            if(channel){
                channel.send({
                    type:'broadcast',
                    event:'player_availability',
                    payload:{
                        team_id:String(myTeamId),
                        team_name:String(myTeamName||''),
                        absent,
                        at:Date.now()
                    }
                }).catch(()=>{});

                // Se torni ONLINE durante un READY, chiedi subito lo stato:
                // il banditore potrà reinserirti tra quelli obbligati.
                if(!absent){
                    channel.send({
                        type:'broadcast',
                        event:'live_state_request',
                        payload:{team_id:String(myTeamId)}
                    }).catch(()=>{});
                }
            }

            // Se il banditore è anche giocatore, aggiorna direttamente
            // la propria logica senza dipendere dal broadcast self.
            if(auctioneerLockKey){
                if(absent)absentTeamIds.add(String(myTeamId));
                else absentTeamIds.delete(String(myTeamId));

                renderOnlinePlayers();
                if(readyGateWaiting){
                    evaluateReadyGate();
                    saveReadyGateDedicated(true);
                }
            }
        }

        function setPlayerConnectionStatus(status){
            const pill=document.getElementById('player-connection-pill');
            const text=document.getElementById('player-connection-text');
            if(!pill||!text)return;

            // Se sei fisicamente online ma hai scelto ASSENTE, mostra ASSENTE.
            if(status==='online' && playerAvailabilityMode==='absent'){
                status='absent';
            }

            pill.classList.remove('online','offline','connecting','absent');

            if(status==='online'){
                pill.classList.add('online');
                text.textContent='ONLINE';
                playerRealtimeOnline=true;
            }else if(status==='absent'){
                pill.classList.add('absent');
                text.textContent='ASSENTE';
                playerRealtimeOnline=true;
            }else if(status==='connecting'){
                pill.classList.add('connecting');
                text.textContent='CONNESSIONE…';
                playerRealtimeOnline=false;
            }else{
                pill.classList.add('offline');
                text.textContent='OFFLINE';
                playerRealtimeOnline=false;
            }
        }


        function sendExplicitPlayerOffline(targetChannel=channel){
            if(!targetChannel||!myTeamId)return Promise.resolve();
            return targetChannel.send({
                type:'broadcast',
                event:'player_offline_now',
                payload:{
                    team_id:String(myTeamId),
                    team_name:String(myTeamName||''),
                    at:Date.now()
                }
            }).catch(()=>{});
        }

        function sendFallbackOnlineHeartbeat(){
            if(!channel||!myTeamId||!myTeamName||!playerRealtimeOnline)return;
            channel.send({
                type:'broadcast',
                event:'player_online_fallback',
                payload:{team_id:String(myTeamId),team_name:String(myTeamName),at:Date.now()}
            }).catch(()=>{});
        }

        function startFallbackOnlineHeartbeat(){
            if(fallbackOnlineHeartbeat)clearInterval(fallbackOnlineHeartbeat);
            sendFallbackOnlineHeartbeat();
            fallbackOnlineHeartbeat=setInterval(sendFallbackOnlineHeartbeat,10000);
        }

        function stopFallbackOnlineHeartbeat(){
            if(fallbackOnlineHeartbeat){
                clearInterval(fallbackOnlineHeartbeat);
                fallbackOnlineHeartbeat=null;
            }
        }

        function touchFallbackOnlinePlayer(data){
            const id=String(data?.team_id||'');
            if(!id)return;
            const old=onlinePlayers.get(id)||{};
            onlinePlayers.set(id,{
                ...old,
                team_id:id,
                team_name:String(data?.team_name||old.team_name||'Squadra'),
                fallback_at:Date.now()
            });
            renderOnlinePlayers();
        }

        function cleanupFallbackOnlinePlayers(){
            const now=Date.now();
            let changed=false;
            for(const [id,p] of onlinePlayers.entries()){
                const fallbackFresh=!!p?.fallback_at && now-p.fallback_at<22000;
                const presenceFresh=!!p?.presence_at && now-p.presence_at<15000;
                if(!fallbackFresh&&!presenceFresh){
                    onlinePlayers.delete(id);
                    changed=true;
                }
            }
            if(changed){
                renderOnlinePlayers();
                }
        }

        function startFallbackOnlineCleanup(){
            if(fallbackOnlineCleanup)clearInterval(fallbackOnlineCleanup);
            fallbackOnlineCleanup=setInterval(cleanupFallbackOnlinePlayers,5000);
        }

        function renderOnlinePlayers(){
            const box=document.getElementById('online-player-list');
            const count=document.getElementById('online-player-count');
            cleanupOnlinePlayersSilent();

            const order=ensureNominationOrder();
            const position=new Map(order.map((id,i)=>[String(id),i]));

            const items=[...onlinePlayers.values()];

            // Il banditore-giocatore è un giocatore reale a tutti gli effetti:
            // deve comparire ONLINE anche se usa lo stesso dispositivo del banditore.
            if(auctioneerPlayerMode && auctioneerPlayerTeamId){
                const hostTeam=teamsCache.find(t=>String(t.id)===String(auctioneerPlayerTeamId));
                if(hostTeam && !items.some(p=>String(p.team_id)===String(hostTeam.id))){
                    items.push({
                        team_id:String(hostTeam.id),
                        team_name:String(hostTeam.name),
                        presence_at:Date.now(),
                        hybrid_auctioneer:true
                    });
                }
            }

            items.sort((a,b)=>{
                const pa=position.has(String(a.team_id))?position.get(String(a.team_id)):9999;
                const pb=position.has(String(b.team_id))?position.get(String(b.team_id)):9999;
                return pa-pb || String(a.team_name).localeCompare(String(b.team_name),'it');
            });

            if(count) count.textContent=`${items.length} online`;
            const auctionCount=document.getElementById('auction-online-count');
            if(auctionCount) auctionCount.textContent=`${items.length} / ${teamsCache.length}`;
            if(!box) return;

            if(!items.length){
                box.innerHTML='<div class="online-empty">Nessun giocatore online</div>';
                return;
            }

            box.innerHTML=items.map(p=>{
                const turn=nominationState.enabled &&
                    String(nominationState.turn_team_id)===String(p.team_id);
                const absent=absentTeamIds.has(String(p.team_id));
                return `<div class="online-player-chip ${turn?'current-turn':''} ${absent?'absent':''}">
                    <span class="online-player-dot"></span>
                    <span>${escapeHtml(p.team_name)}${p.hybrid_auctioneer?' · BANDITORE':''}${absent?' · ASSENTE':''}</span>
                </div>`;
            }).join('');
        }

        function cleanupOnlinePlayersSilent(){
            const now=Date.now();
            for(const [id,p] of onlinePlayers.entries()){
                const fallbackFresh=!!p?.fallback_at && now-p.fallback_at<22000;
                const presenceFresh=!!p?.presence_at && now-p.presence_at<15000;
                if(!fallbackFresh&&!presenceFresh) onlinePlayers.delete(id);
            }
        }

        

        

        

        


        async function connectToRoom(room) {
            if (!room || !room.id) throw new Error('Stanza non valida');

            // Invalida immediatamente tutti i callback della connessione precedente.
            realtimeConnectionGeneration++;
            const previousChannel=channel;
            channel=null;

            if (previousChannel) {
                try { await supabaseClient.removeChannel(previousChannel); } catch(e) {}
            }

            currentRoom = room;
            currentRoomId = room.id;
            banditoreUiPrefsLoadedFor='';
            playerUiPrefsLoadedFor='';
            onlinePlayers.clear();
            absentTeamIds.clear();
            playerAvailabilityMode='online';
            renderOnlinePlayers();
            currentRoomCode = room.name;
            presenceTracked=false;
            presenceClientKey=null;
            channel = supabaseClient.channel(`fanta-room-${room.id}`,{
                config:{presence:{key:createPresenceClientKey()}}
            });
            localStorage.setItem('fanta-last-room-id', room.id);
            return channel;
        }

        async function loadAuctionedPlayers() {
            auctionedPlayerIds = new Set(Array.isArray(currentRoom?.auctioned_ids) ? currentRoom.auctioned_ids.map(String) : []);
            refreshPlayerLists();
        }

        async function saveAuctionedPlayers() {
            if (!currentRoomId) return;
            const ids = [...auctionedPlayerIds];
            const { error } = await supabaseClient.from('fanta_rooms').update({ auctioned_ids: ids, updated_at: new Date().toISOString() }).eq('id', currentRoomId);
            if (!error && currentRoom) currentRoom.auctioned_ids = ids;
        }

        function broadcastAuctionedState() {
            if (!channel) return;
            channel.send({ type:'broadcast', event:'auctioned_state', payload:{ ids:[...auctionedPlayerIds] } }).catch(() => {});
        }

        function applyAuctionedState(ids) {
            if (!Array.isArray(ids)) return;
            auctionedPlayerIds = new Set(ids.map(String));
            refreshPlayerLists();
        }

        async function markCurrentPlayerAuctioned() {
            if (!currentAuctionPlayer) return;
            auctionedPlayerIds.add(String(currentAuctionPlayer.Id));
            await saveAuctionedPlayers();
            refreshPlayerLists();
            broadcastAuctionedState();
        }

        async function restoreAuctionedPlayer(id) {
            const player = playersList.find(p => String(p.Id) === String(id));
            if (!player) return;
            const purchase = purchasesCache.find(p => String(p.player_id) === String(id));
            const msg = purchase ? `Annullare l'acquisto di ${player.Nome} e rimborsare la squadra?` : `Rimettere ${player.Nome} tra i giocatori disponibili?`;
            if (!await appConfirm(msg)) return;
            if (purchase) {
                const {error} = await supabaseClient.rpc('fanta_remove_purchase',{p_purchase_id:purchase.id});
                if (error) { alert('Ripristino non riuscito: ' + error.message); return; }
                auctionedPlayerIds.delete(String(id));
                await saveAuctionedPlayers();
                await loadRoomState();
            } else {
                auctionedPlayerIds.delete(String(id));
                await saveAuctionedPlayers();
            }
            refreshPlayerLists();
            broadcastAuctionedState();
            broadcastStateChanged();
        }


        async function restoreAllAuctionHistory(origin='gestione'){
            if(!currentRoomId)return;

            const purchaseCount=(purchasesCache||[]).length;
            const auctionedCount=auctionedPlayerIds?.size||0;

            if(!purchaseCount && !auctionedCount){
                alert('Non ci sono acquisti o giocatori già banditi da ripristinare.');
                return;
            }

            const message=
                'RIPRISTINARE TUTTO?\\n\\n'+
                `Acquisti da annullare: ${purchaseCount}\\n`+
                `Giocatori già banditi da rendere disponibili: ${auctionedCount}\\n\\n`+
                'Tutti i crediti degli acquisti verranno restituiti alle rispettive squadre.\\n'+
                'Squadre, password, timer e impostazioni della stanza NON verranno eliminati.';

            if(!await appConfirm(message))return;

            const purchases=(purchasesCache||[]).slice();

            for(const purchase of purchases){
                const {error}=await supabaseClient.rpc(
                    'fanta_remove_purchase',
                    {p_purchase_id:purchase.id}
                );
                if(error){
                    alert(
                        'Ripristino interrotto su '+(purchase.player_name||'un giocatore')+
                        ': '+error.message
                    );
                    await loadRoomState();
                    refreshPlayerLists();
                    if(document.getElementById('screen-room-control')?.classList.contains('active')){
                        renderRoomControl();
                    }
                    return;
                }
            }

            auctionedPlayerIds.clear();
            await saveAuctionedPlayers();
            await loadRoomState();

            refreshPlayerLists();
            if(document.getElementById('screen-room-control')?.classList.contains('active')){
                renderRoomControl();
            }

            broadcastAuctionedState();
            broadcastStateChanged();

            // Se il pannello "già banditi" era aperto, resta coerente e vuoto.
            renderAuctionedList();

            alert(
                origin==='listone'
                    ? 'Tutti i giocatori sono di nuovo disponibili.'
                    : 'Acquisti annullati, crediti rimborsati e giocatori ripristinati.'
            );
        }

        function getAvailablePlayers() {
            const purchasedIds = new Set(
                (purchasesCache || [])
                    .map(x => String(x?.player_id ?? ''))
                    .filter(Boolean)
            );
            return playersList.filter(p => {
                const id = String(p.Id);
                return !auctionedPlayerIds.has(id) && !purchasedIds.has(id);
            });
        }

        function refreshPlayerLists() {
            const board=document.getElementById('screen-auctioneer-board');
            if(board)board.dataset.gameMode=isMantraRoom()?'mantra':'classic';

            if(auctioneerLockKey)loadBanditoreUiPrefs();

            updateSealedModeButton();
            const search = document.getElementById('player-search');
            const term = search ? search.value.toLowerCase() : '';
            const available = sortBanditoreListCopy(getAvailablePlayers().filter(p =>
                String(p.Nome || '').toLowerCase().includes(term) ||
                String(p.Squadra || '').toLowerCase().includes(term)
            ));
            renderTable(available);
            renderAuctionedList();
            const a = document.getElementById('available-count');
            const b = document.getElementById('auctioned-count');
            if (a) a.innerText = getAvailablePlayers().length;
            if (b) b.innerText = auctionedPlayerIds.size;
        }

        function renderAuctionedList() {
            const box = document.getElementById('auctioned-list');
            if (!box) return;
            const byId=new Map(playersList.map(p=>[String(p.Id),p]));
            const list=[...auctionedPlayerIds]
                .reverse()
                .map(id=>byId.get(String(id)))
                .filter(Boolean);
            if (!list.length) {
                box.innerHTML = '<div class="auctioned-empty">Nessun giocatore ancora bandito.</div>';
                return;
            }
            box.innerHTML = list.map(p => `
                <div class="auctioned-row">
                    <span class="role-badge role-${escapeHtml(String(playerRole(p)||'').toUpperCase())}">${escapeHtml(playerRole(p) || '-')}</span>
                    <span class="auctioned-name">${escapeHtml(p.Nome)}</span>
                    <span class="auctioned-team">${escapeHtml(p.Squadra || '')}</span>
                    <button class="restore-btn" onclick="restoreAuctionedPlayer('${String(p.Id).replace(/'/g, "\\'")}')">Ripristina</button>
                </div>
            `).join('');
        }

        function openAdminLogin() {
            document.getElementById('admin-pin').value = '';
            document.getElementById('admin-login-error').innerText = '';
            showScreen('screen-admin-login');
        }

        function refreshLiveAstaApp(){
            try{
                const url=new URL(window.location.href);
                url.searchParams.set('_liveasta_refresh',Date.now().toString());
                window.location.replace(url.toString());
            }catch(e){
                window.location.reload();
            }
        }


        async function adminLogin() {
            const pin=document.getElementById('admin-pin')?.value||'';
            const err=document.getElementById('admin-login-error');
            if(err)err.innerText='';
            if(!pin){ if(err)err.innerText='Inserisci la password.'; return; }

            try{
                const {data,error}=await supabaseClient.rpc('liveasta_verify_superuser',{p_password:pin});
                if(error)throw error;
                if(data!==true){
                    adminSessionPassword='';
                    if(err)err.innerText='Password errata.';
                    return;
                }
            }catch(e){
                adminSessionPassword='';
                if(err)err.innerText='Verifica superuser non disponibile.';
                console.warn('Verifica superuser non riuscita',e);
                return;
            }

            // La password resta soltanto nella memoria della pagina corrente:
            // non è nel codice HTML, localStorage o Supabase in chiaro.
            adminSessionPassword=pin;
            document.getElementById('admin-pin').value='';
            showScreen('screen-admin');
            await Promise.all([loadRooms(true), loadCentralListoneInfo(), loadShowRoomsSetting()]);
        }

        function adminLogout(){
            adminSessionPassword='';
            const pin=document.getElementById('admin-pin'); if(pin)pin.value='';
            showScreen('screen-role');
        }

        function renderAdminRooms() {
            const body = document.getElementById('admin-rooms-body');
            if (!body) return;
            if (!roomsCache.length) {
                body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Nessuna stanza</td></tr>';
                return;
            }
            body.innerHTML = roomsCache.map(r => `
                <tr>
                    <td data-label="Stanza"><input id="admin-name-${r.id}" class="minimal-input" value="${escapeHtml(r.name)}"></td>
                    <td data-label="Password"><input id="admin-pass-${r.id}" class="minimal-input" value="${escapeHtml(r.password)}"></td>
                    <td data-label="Configurazione" class="admin-room-config">${parseInt(r.initial_credits||500)} cr · ${roomGameMode(r)==='mantra'?`MANTRA · 23–${mantraRosterMax(r)} · min 2 Por`:`CLASSIC · ${parseInt(r.limit_p||3)}/${parseInt(r.limit_d||8)}/${parseInt(r.limit_c||8)}/${parseInt(r.limit_a||6)}`}</td>
                    <td data-label="Approvazione">
                        <label class="admin-approval-flag ${r.approved?'approved':'pending'}">
                            <input type="checkbox" ${r.approved?'checked':''} onchange="adminToggleRoomApproval('${r.id}',this.checked,this)">
                            <span>${r.approved?'APPROVATA':'IN ATTESA'}</span>
                        </label>
                    </td>
                    <td data-label="Azioni"><div class="room-actions"><button class="btn btn-small" onclick="adminManageRoom('${r.id}')">Gestisci asta</button><button class="btn btn-small" onclick="openAdminTeamPinManager('${r.id}')">PIN giocatori</button><button class="btn btn-small" onclick="adminSaveRoom('${r.id}')">Salva</button><button class="btn btn-danger btn-small" onclick="adminDeleteRoom('${r.id}')">Elimina</button></div></td>
                </tr>`).join('');
        }

        async function adminToggleRoomApproval(id,approved,checkbox){
            if(!adminSessionPassword){
                if(checkbox)checkbox.checked=!approved;
                alert('Sessione superuser scaduta. Accedi di nuovo.');
                openAdminLogin();
                return;
            }

            try{
                if(checkbox)checkbox.disabled=true;
                const {data,error}=await supabaseClient.rpc('liveasta_set_room_approval',{
                    p_room_id:id,
                    p_approved:!!approved,
                    p_password:adminSessionPassword
                });
                if(error)throw error;
                if(data!==true)throw new Error('Autorizzazione superuser non valida.');
                await loadRooms(true);
            }catch(e){
                if(checkbox){checkbox.checked=!approved;checkbox.disabled=false;}
                alert('Modifica approvazione non riuscita: '+(e.message||e));
            }
        }

        async function adminManageRoom(id) {
            const room = await getRoomById(id); if (!room) return;
            roomControlReturnScreen = 'screen-admin';
            await connectToRoom(room);
            if (!playersList.length) await fetchListone();
            await loadRoomState();
            nominationReady=!!nominationState.enabled;
            subscribeCommonRoomEvents();
            setTimeout(()=>broadcastNominationState(nominationReady),350);
            await openRoomControl(false);
        }

        async function adminSaveRoom(id) {
            const name = normalizeRoomCode(document.getElementById(`admin-name-${id}`).value);
            const password = document.getElementById(`admin-pass-${id}`).value;
            if (!name || !password) { alert('Nome e password sono obbligatori.'); return; }
            const { error } = await supabaseClient.from('fanta_rooms').update({ name, password, updated_at:new Date().toISOString() }).eq('id', id);
            if (error) { alert('Modifica non riuscita: ' + error.message); return; }
            await loadRooms(true);
        }

        async function adminDeleteRoom(id) {
            const room = roomsCache.find(r => r.id === id);
            if (!room || !await appConfirm(`Eliminare definitivamente la stanza "${room.name}"?`)) return;
            const { error } = await supabaseClient.from('fanta_rooms').delete().eq('id', id);
            if (error) { alert('Eliminazione non riuscita: ' + error.message); return; }
            await loadRooms(true);
        }

        function unlockAudio() {
            ['audio-prep', 'audio-start', 'audio-buzz', 'audio-end'].forEach(id => {
                const a = document.getElementById(id);
                if (!a) return;
                const oldMuted = a.muted, oldVolume = a.volume;
                a.muted = true;
                a.volume = 0.01;
                a.currentTime = 0;
                const p = a.play();
                if (p && p.then) {
                    p.then(() => {
                        a.pause();
                        a.currentTime = 0;
                        a.muted = oldMuted;
                        a.volume = oldVolume;
                    }).catch(() => {
                        a.muted = oldMuted;
                        a.volume = oldVolume;
                    });
                }
            });
        }

        function showScreen(screenId) {
            syncHybridViewButtons();
            if(isAuctioneerPlayerIdentity() && hybridPreferredView && ['screen-player-buzzer','screen-auctioneer-board'].includes(screenId)){
                screenId=hybridPreferredView==='player'?'screen-player-buzzer':'screen-auctioneer-board';
            }
            if(screenId==='screen-player-buzzer' && isAuctioneerPlayerIdentity())configureHybridPlayerIdentity();
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById(screenId).classList.add('active');
            syncHybridViewButtons();
            if(screenId==='screen-player-buzzer')requestAnimationFrame(syncSealedBidAreaHeight);
        }

        async function leaveCurrentSession() {
            const activeAuction = document.getElementById('screen-auctioneer-board')?.classList.contains('active');

            if (activeAuction && isAuctionActive && !await appConfirm("C’è un’asta in corso. Vuoi davvero uscire dalla plancia?")) return;
            if (!activeAuction && !await appConfirm("Vuoi uscire dalla stanza e tornare alla Home?")) return;

            setPlayerConnectionStatus('offline');
            stopFallbackOnlineHeartbeat();

            const oldChannel=channel;

            // Avvisa il banditore PRIMA di chiudere il canale.
            if(oldChannel){
                try{ await sendExplicitPlayerOffline(oldChannel); }catch(e){}
            }

            // Invalida subito i callback del canale che stiamo chiudendo.
            realtimeConnectionGeneration++;
            channel=null;

            if(oldChannel){
                try{
                    if(presenceTracked) await oldChannel.untrack();
                }catch(e){}
                presenceTracked=false;

                try{ await supabaseClient.removeChannel(oldChannel); }catch(e){}
            }

            // Se questo dispositivo era il banditore della stanza,
            // libera immediatamente il posto per un nuovo banditore.
            await releaseAuctioneerRoomLock();

            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval=null;
            }

            isAuctionActive=false;
            presenceClientKey=null;
            currentRoomCode='';
            currentRoomId='';
            currentRoom=null;
            myTeamId=null;
            myTeamName='';

            showScreen('screen-role');
            loadRooms().catch(()=>{});
        }

        function openOfficialListone() {
            alert('Carica il listone XLSX autorizzato dalla schermata di gestione.');
        }

        function normalizeListoneRows(jsonData) {
            return jsonData.filter(row => row && row.Id && row.Nome);
        }


        async function fetchOfficialListoneForAudit(){
            const {data,error}=await supabaseClient
                .from('fanta_app_data')
                .select('data,file_name,updated_at')
                .eq('key','official_listone')
                .maybeSingle();

            if(error)throw error;
            if(!data || !Array.isArray(data.data) || !data.data.length){
                throw new Error('Nessun listone centrale pubblicato.');
            }
            return data;
        }

        async function miniatureAssetExists(playerId){
            const relative=playerImageUrl(playerId);
            const url=new URL(relative,window.location.href).href;

            try{
                const head=await fetch(url,{
                    method:'HEAD',
                    cache:'no-store',
                    credentials:'same-origin'
                });

                if(head.ok)return true;

                // Alcuni hosting possono non gestire HEAD: prova GET solo in quel caso.
                if(head.status===405 || head.status===501){
                    const get=await fetch(url,{
                        method:'GET',
                        cache:'no-store',
                        credentials:'same-origin'
                    });
                    return get.ok;
                }
                return false;
            }catch(e){
                try{
                    const get=await fetch(url,{
                        method:'GET',
                        cache:'no-store',
                        credentials:'same-origin'
                    });
                    return get.ok;
                }catch(_){
                    return false;
                }
            }
        }

        async function checkMissingMiniatures(){
            const btn=document.getElementById('admin-miniature-check-btn');
            const exportBtn=document.getElementById('admin-miniature-export-btn');
            const status=document.getElementById('admin-miniature-check-status');

            if(btn)btn.disabled=true;
            if(exportBtn)exportBtn.disabled=true;
            miniatureAuditResult=null;

            try{
                if(status)status.textContent='Caricamento listone centrale…';

                const source=await fetchOfficialListoneForAudit();
                const list=source.data.slice();
                const missing=[];
                let checked=0;
                let present=0;
                let cursor=0;
                const workers=Math.min(14,Math.max(1,list.length));

                const worker=async()=>{
                    while(true){
                        const index=cursor++;
                        if(index>=list.length)return;

                        const p=list[index];
                        const exists=await miniatureAssetExists(p.Id);

                        if(exists){
                            present++;
                        }else{
                            missing.push({
                                Id:String(p.Id??''),
                                Nome:String(p.Nome??''),
                                Ruolo:String(p.R??p.Ruolo??''),
                                Squadra:String(p.Squadra??''),
                                File_atteso:`${String(p.Id??'').trim()}.webp`,
                                Percorso:`assets/players/${String(p.Id??'').trim()}.webp`,
                                Stato:'MANCANTE'
                            });
                        }

                        checked++;
                        if(status && (checked===list.length || checked%10===0)){
                            status.textContent=`Controllo miniature: ${checked}/${list.length} · mancanti ${missing.length}`;
                        }
                    }
                };

                await Promise.all(Array.from({length:workers},worker));

                missing.sort((a,b)=>{
                    const ra=String(a.Ruolo||'');
                    const rb=String(b.Ruolo||'');
                    return ra.localeCompare(rb,'it') ||
                           String(a.Squadra).localeCompare(String(b.Squadra),'it') ||
                           String(a.Nome).localeCompare(String(b.Nome),'it');
                });

                miniatureAuditResult={
                    checked_at:new Date(),
                    listone_file:source.file_name||'Listone centrale',
                    listone_updated_at:source.updated_at||null,
                    total:list.length,
                    present,
                    missing
                };

                if(status){
                    status.innerHTML=
                        `<b>${missing.length} miniature mancanti</b> su ${list.length} giocatori · `+
                        `${present} presenti. Controllo completato.`;
                }
                if(exportBtn)exportBtn.disabled=false;
            }catch(e){
                if(status)status.textContent='Controllo non riuscito: '+(e.message||e);
                alert('Controllo miniature non riuscito: '+(e.message||e));
            }finally{
                if(btn)btn.disabled=false;
            }
        }

        function downloadMissingMiniaturesExcel(){
            const result=miniatureAuditResult;
            if(!result){
                alert('Esegui prima "Controlla miniature".');
                return;
            }
            if(!window.XLSX){
                alert('Modulo Excel non disponibile.');
                return;
            }

            const checkedAt=result.checked_at instanceof Date
                ? result.checked_at
                : new Date(result.checked_at);

            const summaryRows=[
                ['Controllo miniature LIVEASTA',''],
                ['Data controllo',checkedAt.toLocaleString('it-IT')],
                ['Listone',result.listone_file||''],
                ['Totale giocatori',result.total],
                ['Miniature presenti',result.present],
                ['Miniature mancanti',result.missing.length],
                ['Copertura %',result.total?Math.round((result.present/result.total)*10000)/100:0]
            ];

            const missingRows=result.missing.map(x=>({
                ID:x.Id,
                Nome:x.Nome,
                Ruolo:x.Ruolo,
                Squadra:x.Squadra,
                'File atteso':x.File_atteso,
                Percorso:x.Percorso,
                Stato:x.Stato
            }));

            const wb=XLSX.utils.book_new();

            const wsSummary=XLSX.utils.aoa_to_sheet(summaryRows);
            wsSummary['!cols']=[
                {wch:24},
                {wch:38}
            ];
            XLSX.utils.book_append_sheet(wb,wsSummary,'Riepilogo');

            const wsMissing=XLSX.utils.json_to_sheet(missingRows,{
                header:['ID','Nome','Ruolo','Squadra','File atteso','Percorso','Stato']
            });
            wsMissing['!cols']=[
                {wch:10},{wch:28},{wch:9},{wch:20},{wch:18},{wch:36},{wch:12}
            ];
            XLSX.utils.book_append_sheet(wb,wsMissing,'Miniature mancanti');

            const stamp=checkedAt.toISOString().slice(0,10);
            XLSX.writeFile(wb,`LIVEASTA_Miniature_Mancanti_${stamp}.xlsx`);
        }

        async function uploadCentralListone(file) {
            if (!file) return;
            const statusEl = document.getElementById('central-listone-status');
            try {
                if (statusEl) statusEl.textContent='Importazione e pubblicazione listone…';
                const data=await file.arrayBuffer();
                const workbook=window.XLSX.read(data,{type:'array'});
                const worksheet=workbook.Sheets[workbook.SheetNames[0]];
                let rows=window.XLSX.utils.sheet_to_json(worksheet,{range:1});
                let parsed=normalizeListoneRows(rows);
                if (!parsed.length) { rows=window.XLSX.utils.sheet_to_json(worksheet); parsed=normalizeListoneRows(rows); }
                if (!parsed.length) throw new Error('Formato non riconosciuto: nessun giocatore trovato.');
                const payload={key:'official_listone',data:parsed,file_name:file.name,updated_at:new Date().toISOString()};
                const {error}=await supabaseClient.from('fanta_app_data').upsert(payload,{onConflict:'key'});
                if(error) throw error;
                playersList=parsed;
                refreshPlayerLists();
                await loadCentralListoneInfo();
                alert(`Listone centrale aggiornato: ${parsed.length} giocatori. Tutti i dispositivi useranno questa versione.`);
            } catch(e) {
                if(statusEl) statusEl.textContent='Aggiornamento non riuscito: '+(e.message||e);
                alert('Errore aggiornamento listone: '+(e.message||e));
            } finally {
                const inp=document.getElementById('admin-listone-file'); if(inp) inp.value='';
            }
        }

        async function loadCentralListoneInfo() {
            const statusEl=document.getElementById('central-listone-status');
            const countEl=document.getElementById('admin-listone-count');
            try {
                const {data,error}=await supabaseClient.from('fanta_app_data').select('file_name,updated_at,data').eq('key','official_listone').maybeSingle();
                if(error) throw error;
                if(!data){ if(statusEl) statusEl.textContent='Nessun listone centrale pubblicato.'; if(countEl) countEl.textContent='0 giocatori'; return; }
                const n=Array.isArray(data.data)?data.data.length:0;
                const d=data.updated_at?new Date(data.updated_at).toLocaleDateString('it-IT'):'';
                if(countEl) countEl.textContent=`${n} giocatori`;
                const mantraOk=Array.isArray(data.data)&&data.data.some(p=>!!mantraRoleFromPlayer(p));
                if(statusEl) statusEl.textContent=`${data.file_name||'Listone'}${d?' • aggiornato '+d:''} • ${mantraOk?'Classic + Mantra':'solo Classic'}`;
            } catch(e) {
                if(statusEl) statusEl.textContent='Tabella listone non configurata: esegui il nuovo SQL Supabase.';
                if(countEl) countEl.textContent='--';
            }
        }

        function applyAuctioneerUiMode(mode, persist=true) {
            const normalized = mode === 'mobile' ? 'mobile' : 'desktop';
            const legacyMode = normalized === 'desktop' ? 'pc' : 'mobile';
            const dashboard = document.getElementById('auction-dashboard');
            const board = document.getElementById('screen-auctioneer-board');

            if (dashboard) {
                dashboard.classList.remove('mode-pc', 'mode-mobile');
                dashboard.classList.add('mode-' + legacyMode);
            }
            if (board) {
                board.classList.add('auctioneer-ui-root');
                board.classList.remove('auctioneer-ui-mobile', 'auctioneer-ui-desktop');
                board.classList.add('auctioneer-ui-' + normalized);
                board.dataset.auctioneerUi = normalized;
            }
            document.body.classList.remove('auctioneer-mobile', 'auctioneer-desktop');
            document.body.classList.add('auctioneer-' + normalized);
            document.documentElement.dataset.auctioneerUi = normalized;

            if (persist) {
                try { localStorage.setItem('liveasta_auctioneer_ui', normalized); } catch(e) {}
            }
            return normalized;
        }

        async function setDeviceMode(mode) {
            unlockAudio();
            applyAuctioneerUiMode(mode === 'pc' ? 'desktop' : mode, true);
            resetAuctioneerRoomMode();
            showScreen('screen-auctioneer-setup');

            await loadShowRoomsSetting();
            applyAuctioneerRoomVisibilityUI();
            if(showRoomsToUsers) await loadRooms();

            // Il listone viene sempre verificato automaticamente sul database centrale.
            fetchListone();
        }

        async function fetchListone() {
            const statusEl = document.getElementById('excel-status');
            const btnPlancia = document.getElementById('btn-apri-plancia');
            const cacheKey = 'fanta_central_listone_cache_v1';

            const formatCentralStatus = (data, cached=false) => {
                const n = Array.isArray(data?.data) ? data.data.length : 0;
                const d = data?.updated_at ? new Date(data.updated_at).toLocaleDateString('it-IT') : '--';
                const mantraOk=Array.isArray(data?.data)&&data.data.some(p=>!!mantraRoleFromPlayer(p));
                return `${cached ? '🟡' : '✅'} ${n} giocatori · ${mantraOk?'Classic + Mantra':'solo Classic'} · aggiornato ${d}${cached ? ' · copia salvata' : ''}`;
            };

            try {
                if (statusEl) {
                    statusEl.textContent = 'Controllo listone ufficiale…';
                    statusEl.style.color = 'var(--text-muted)';
                }

                const {data,error} = await supabaseClient
                    .from('fanta_app_data')
                    .select('data,file_name,updated_at')
                    .eq('key','official_listone')
                    .maybeSingle();

                if (error) throw error;

                if (data && Array.isArray(data.data) && data.data.length) {
                    playersList = data.data;
                    try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch(_) {}
                    refreshPlayerLists();
                    if (statusEl) {
                        statusEl.textContent = formatCentralStatus(data, false);
                        statusEl.style.color = 'var(--lime)';
                    }
                    if (btnPlancia) btnPlancia.disabled = false;
                    return true;
                }

                // Nessun listone pubblicato: il banditore non può usare un file locale diverso.
                playersList = [];
                if (statusEl) {
                    statusEl.textContent = 'Nessun listone ufficiale pubblicato dal Super User';
                    statusEl.style.color = 'var(--accent-red)';
                }
                if (btnPlancia) btnPlancia.disabled = true;
                return false;

            } catch(e) {
                console.warn('Listone centrale non raggiungibile', e);

                // Solo come continuità operativa: usa l'ultima versione CENTRALE già ricevuta.
                // Non viene più caricato listone.xlsx locale.
                try {
                    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
                    if (cached && Array.isArray(cached.data) && cached.data.length) {
                        playersList = cached.data;
                        refreshPlayerLists();
                        if (statusEl) {
                            statusEl.textContent = formatCentralStatus(cached, true);
                            statusEl.style.color = 'var(--accent-yellow)';
                        }
                        if (btnPlancia) btnPlancia.disabled = false;
                        return true;
                    }
                } catch(_) {}

                playersList = [];
                if (statusEl) {
                    statusEl.textContent = 'Listone centrale non disponibile';
                    statusEl.style.color = 'var(--accent-red)';
                }
                if (btnPlancia) btnPlancia.disabled = true;
                return false;
            }
        }


        function sortBanditoreListCopy(list){
            return filterAndSortPlayers(list,'board');
        }


        function renderTable(list) {
            const tbody = document.getElementById('players-tbody');
            tbody.innerHTML = '';
            list.forEach(p => {
                const tr = document.createElement('tr');
                tr.onclick = () => sealedListonePickMode ? chooseSealedPlayerFromListone(p.Id) : selectAndStartPlayer(p.Id);

                const shownRole=playerRole(p)||'-';
                let roleClass = `role-${shownRole.replace(/[^a-z0-9]/gi,'')}`;
                let val = isMantraRoom() ? (p['FVM M'] ?? p.FVM ?? p['Qt.A M'] ?? p['Qt.A']) : (p.FVM !== undefined ? p.FVM : p['Qt.A']);
                if(val === undefined) val = '-';

                tr.innerHTML = `
                    <td><span class="role-badge ${roleClass}">${escapeHtml(shownRole)}</span></td>
                    <td style="font-weight: 800;">${p.Nome}</td>
                    <td style="color: var(--text-muted);">${p.Squadra}</td>
                    <td style="text-align: right; font-weight: 800; color: var(--accent-blue);">${val}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        function filterTable(e) {
            const search=document.getElementById('player-search');
            const term=String(search?.value||'').trim().toLowerCase();

            const state=listFilterState('board');
            const roles=listFilterRoles();

            const rows=getAvailablePlayers()
                .filter(p=>{
                    const name=String(p.Nome||'').toLowerCase();
                    const club=String(p.Squadra||'').toLowerCase();
                    if(term && !name.includes(term) && !club.includes(term))return false;

                    const tokens=isMantraRoom()
                        ? mantraRoleTokens(playerRole(p))
                        : [String(playerRole(p)||'').toUpperCase()];
                    return tokens.some(r=>state.roles.includes(r));
                })
                .map(p=>{
                    const tokens=isMantraRoom()
                        ? mantraRoleTokens(playerRole(p))
                        : [String(playerRole(p)||'').toUpperCase()];
                    return {
                        row:p,
                        id:String(p.Id),
                        name:p.Nome||'',
                        team:p.Squadra||'',
                        role:Math.min(...tokens.map(r=>{
                            const i=roles.indexOf(r);
                            return i<0?99:i;
                        }),99),
                        value:playerListoneNumericValue(p),
                        price:null
                    };
                });

            const direction=state.direction==='asc'?1:-1;
            rows.sort((a,b)=>{
                const av=a[state.sort],bv=b[state.sort];
                if(av==null&&bv!=null)return 1;
                if(bv==null&&av!=null)return -1;
                const primary=av==null?0:
                    typeof av==='string'
                        ? listFilterCollator.compare(av,bv)
                        : av-bv;
                return direction*primary ||
                    listFilterCollator.compare(a.name,b.name) ||
                    listFilterCollator.compare(a.id,b.id);
            });

            renderTable(rows.map(x=>x.row));
            const count=document.getElementById('available-count');
            if(count)count.innerText=rows.length;
        }

        function changeTimer() {
            let newTime = prompt("Imposta i secondi del timer dell'Asta:", auctionTimeLimit);
            if(newTime && !isNaN(newTime)) {
                auctionTimeLimit = parseInt(newTime);
                alert("Timer aggiornato a " + auctionTimeLimit + " secondi.");
            }
        }

        function blockHybridBanditoreOutOfTurnAction(showMessage=true){
            const blocked=
                auctioneerPlayerMode &&
                nominationState.enabled &&
                nominationState.role &&
                !isMyNominationTurn();

            if(!blocked)return false;

            if(showMessage){
                const turnTeam=currentNominationTeam();
                const who=turnTeam?.name||'un altro giocatore';
                alert(`Non puoi bandire adesso: è il turno di ${who}. Puoi comunque consultare liberamente il listone.`);
            }
            return true;
        }

        function startRandomPlayer() {
            if(blockHybridBanditoreOutOfTurnAction(true))return;

            const grid=document.getElementById('random-role-grid');
            if(grid){
                if(isMantraRoom()){
                    grid.innerHTML=`<button class="random-role-btn all" onclick="pickRandomRole('ALL')">TUTTI</button>`+
                        MANTRA_ROLE_ORDER.map(r=>`<button class="random-role-btn" onclick="pickRandomRole('${r}')">${r}</button>`).join('');
                    grid.classList.add('mantra-random-grid');
                }else{
                    grid.innerHTML=`
                        <button class="random-role-btn all" onclick="pickRandomRole('ALL')">TUTTI</button>
                        <button class="random-role-btn p" onclick="pickRandomRole('P')">P</button>
                        <button class="random-role-btn d" onclick="pickRandomRole('D')">D</button>
                        <button class="random-role-btn c" onclick="pickRandomRole('C')">C</button>
                        <button class="random-role-btn a" onclick="pickRandomRole('A')">A</button>`;
                    grid.classList.remove('mantra-random-grid');
                }
            }
            const modal = document.getElementById('random-role-modal');
            if (modal) modal.style.display = 'flex';
        }

        function closeRandomRolePicker() {
            const modal = document.getElementById('random-role-modal');
            if (modal) modal.style.display = 'none';
        }

        function pickRandomRole(role) {
            closeRandomRolePicker();
            let availablePlayers = getAvailablePlayers();
            if (role && role !== 'ALL') {
                availablePlayers = availablePlayers.filter(p =>
                    isMantraRoom()
                        ? mantraRoleMatches(p,role)
                        : String(playerRole(p)||'').toUpperCase()===String(role).toUpperCase()
                );
            }
            if (availablePlayers.length === 0) {
                alert(role === 'ALL' ? 'Non ci sono più giocatori disponibili in questa stanza!' : `Non ci sono più giocatori disponibili per il ruolo ${role}.`);
                return;
            }
            const player = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];

            if(sealedListonePickMode){
                chooseSealedPlayerFromListone(player.Id);
            }else{
                selectAndStartPlayer(player.Id);
            }
        }

        async function selectAndStartPlayer(id, skipConfirm=false) {
            // Il listone resta consultabile al banditore+giocatore quando
            // è il turno di un'altra squadra, ma un click non può avviare l'asta.
            // skipConfirm=true è riservato alla nomina valida ricevuta dal giocatore di turno.
            if(!skipConfirm && blockHybridBanditoreOutOfTurnAction(true))return;

            const consultNote=document.getElementById('hybrid-consultation-note');
            if(consultNote)consultNote.style.display='none';

            const player = playersList.find(p => String(p.Id) === String(id));
            if (auctionedPlayerIds.has(String(id))) {
                alert("Questo giocatore è già stato bandito. Ripristinalo dalla lista in basso per ribandirlo.");
                return;
            }
            if(player) {
                currentAuctionPlayer = {...player,R:playerRole(player)};
                // una nuova banditura parte sempre da stato economico neutro,
                // prima ancora del READY, così non può ereditare vincitore/prezzo precedenti.
                currentWinner='';
                currentAuctionValue=0;
                currentTimer=0;
                normalBidMaxima=new Map();
                recentNormalBidIds=new Map();
                sealedAuctionModeActive=false;
                sealedListonePickMode=false;
                updateSealedModeButton();
                sealedAuctionToken=null;
                sealedBids=new Map();
                sealedEligibleIds=[];
                if(skipConfirm || await appConfirm(`Avviare l'asta per ${player.Nome}?`)) {
                    unlockAudio();
                    restoreAuctionCardVisibility();
                    const activeRole=playerRole(player);
                    const imgUrl = playerImageUrl(player.Id, activeRole);
                    document.getElementById('auction-player-name-top').innerText = player.Nome;
                    fitAuctionNames();
                    document.getElementById('auction-player-role').innerText = activeRole || '-';
                    if(typeof setMobileRoleBadge==='function')setMobileRoleBadge(activeRole);
                    document.getElementById('auction-player-club').innerText = player.Squadra || '-';
                    setPlayerImage(document.getElementById('card-image'), player.Id, activeRole);
                    readySkipPlayers=new Set();
                    if(readyModeEnabled) beginReadyGate();
                    else { readyGateWaiting=false; readyGateToken=null; readyPlayers=new Set(); }

                    if(channel) {
                        channel.send({
                            type: 'broadcast',
                            event: 'new_player',
                            payload: { url: imgUrl, nome: player.Nome, player_id: player.Id, role: activeRole, club: player.Squadra, fvm: playerListoneNumericValue(player), prep_seconds: auctionPrepSeconds, ready_required: readyModeEnabled, ready_token: readyGateToken, ready_required_ids: readyModeEnabled ? readyRequiredIds() : [], ready_ids: readyModeEnabled ? [...readyPlayers] : [], skip_ids: readyModeEnabled ? [...readySkipPlayers] : [] }
                        }).catch(e => console.log("Canale broadcast non pronto"));
                    }

                    document.getElementById('view-list').style.display = 'none';

                    if(auctioneerPlayerMode){
                        showHybridPlayerForCurrentAuction();
                        if(readyModeEnabled)showHybridReadyIfNeeded();
                    }

                    if(readyModeEnabled){
                        showAuctioneerReadyStage();
                        updateReadyGateDisplay();
                        evaluateReadyGate();
                    } else {
                        startCountdown();
                    }
                }
            }
        }

        function backToList() {
            const auctionViewNow=document.getElementById('view-auction');
            if(auctionViewNow)auctionViewNow.classList.add('auction-view-hidden');

            saveLiveAuctionState({
                phase:'idle',player:null,winner:'',value:0,seconds:0,deadline_at:null,
                ready_token:null,ready_required_ids:[],ready_ids:[]
            });
            if(nominationState.enabled){
                nominationReady=true;
                showNominationWaitingBoard();
                broadcastNominationState(true);
                return;
            }

            hideNominationStage();
            const auctionView=document.getElementById('view-auction');
            auctionView.classList.add('auction-view-hidden');
            auctionView.style.display='none';
            document.getElementById('view-list').style.display='flex';
            document.getElementById('btn-next').style.display='none';
            refreshPlayerLists();
        }

        // --- LOGICA GIOCATORE ---


        function stopPlayerSealedCountdown(){
            if(playerSealedCountdownInterval){
                clearInterval(playerSealedCountdownInterval);
                playerSealedCountdownInterval=null;
            }
        }

        function safeSealedSeconds(value,fallback=30,maxAllowed=180){
            const n=parseInt(value);
            if(!Number.isFinite(n) || n<0)return Math.max(0,parseInt(fallback)||0);
            return Math.max(0,Math.min(maxAllowed,n));
        }

        function playerRemainingFromLiveState(state,kind='sealed'){
            const maxSeconds=kind==='reveal'
                ? Math.max(1,parseInt(state?.sealed_seconds)||parseInt(sealedRevealSeconds)||5)
                : Math.max(5,parseInt(state?.sealed_seconds)||parseInt(sealedTimerSeconds)||30);

            // Quando lo stato arriva dal banditore, questa è la durata residua
            // calcolata DAL SUO orologio e trasformata in semplici secondi.
            const synced=Number(state?.client_countdown_seconds);
            if(Number.isFinite(synced)){
                return Math.max(0,Math.min(maxSeconds,Math.ceil(synced)));
            }

            // Fallback per un restore iniziale dal DB: usa l'assoluto solo se
            // produce un valore plausibile. Se gli orologi differiscono (es. 150s),
            // non fidarti del timestamp remoto.
            const deadline=Number(
                kind==='reveal'
                    ? state?.deadline_at
                    : (state?.sealed_deadline_at||state?.deadline_at)
            )||0;
            const calculated=Math.ceil((deadline-Date.now())/1000);

            if(calculated>=0 && calculated<=maxSeconds+2){
                return Math.min(maxSeconds,calculated);
            }

            return Math.max(1,Math.min(maxSeconds,parseInt(state?.seconds)||maxSeconds));
        }

        function startPlayerSealedCountdownSeconds(seconds,dangerAt=5,withSound=false){
            stopPlayerSealedCountdown();

            const total=safeSealedSeconds(seconds,0,180);
            const localEnd=Date.now()+total*1000;
            const timer=document.getElementById('player-countdown');
            let lastSoundSecond=null;

            const tick=()=>{
                const rem=Math.max(0,Math.ceil((localEnd-Date.now())/1000));
                if(timer){
                    timer.textContent=String(rem);
                    timer.classList.toggle('danger',rem>0&&rem<=dangerAt);
                }

                // In apertura buste usa lo stesso suono della preparazione,
                // una sola volta per ogni secondo visualizzato.
                if(withSound && rem>0 && rem!==lastSoundSecond){
                    lastSoundSecond=rem;
                    playSound('audio-prep');
                }

                if(rem<=0)stopPlayerSealedCountdown();
            };

            tick();
            if(total>0){
                playerSealedCountdownInterval=setInterval(tick,200);
            }

            return localEnd;
        }

        function startLocalPlayerPreparation(seconds = 5) {
            stopPlayerSealedCountdown();
            if (playerPrepInterval) {
                clearInterval(playerPrepInterval);
                playerPrepInterval = null;
            }

            let remaining = Math.max(1, parseInt(seconds) || 5);
            isAuctionActive = false;
            setPlayerBidButtonsEnabled(false);
            setPlayerAuctionVisualState('preparing');

            const title = document.getElementById('player-auction-title');
            const winner = document.getElementById('player-current-winner');
            const timer = document.getElementById('player-countdown');

            if (title) title.innerText = 'PREPARAZIONE ASTA';
            if (winner) {
                winner.innerText = 'Preparati';
                winner.style.color = 'var(--text-main)';
            }
            if (timer) {
                timer.innerText = remaining;
                timer.classList.remove('danger','liveasta-last3');
                timer.classList.add('prep-countdown');
            }

            playerPrepInterval = setInterval(() => {
                remaining--;
                if (remaining <= 0) {
                    clearInterval(playerPrepInterval);
                    playerPrepInterval = null;
                    return; // auction_started prenderà il controllo
                }
                if (timer) {
                    timer.innerText = remaining;
                    timer.classList.remove('danger','liveasta-last3');
                timer.classList.add('prep-countdown');
                }
            }, 1000);
        }

        function setPlayerAuctionVisualState(state) {
            const panel = document.getElementById('phone-card-container');
            if (!panel) return;
            panel.classList.remove('player-winning','player-losing','player-preparing');
            if (state === 'winning') panel.classList.add('player-winning');
            if (state === 'losing') panel.classList.add('player-losing');
            if (state === 'preparing') panel.classList.add('player-preparing');
        }

        async function joinAsPlayer() {
            const teamId = document.getElementById('player-team-select')?.value||'';
            const password = document.getElementById('player-room-password').value;
            const err = document.getElementById('player-room-error');
            err.innerText = '';

            const room = await getPlayerSetupRoom();
            if (!room) {
                err.innerText = showRoomsToUsers
                    ?'Seleziona una stanza.'
                    :'Stanza non trovata. Controlla il nome inserito.';
                return;
            }
            if (room.approved!==true) { err.innerText = 'Questa stanza è in attesa di approvazione del superuser.'; return; }
            if (!teamId) { err.innerText = 'Seleziona la tua squadra.'; return; }
            if (room.password !== password) { err.innerText = 'Password stanza errata.'; return; }

            if(String(playerPinTeamId)!==String(teamId) || String(playerPinRoomId)!==String(room.id)){
                await preparePlayerPinPanel(room,teamId);
            }

            const pinOk=await ensurePlayerPinAccess(room,teamId,password);
            if(!pinOk)return;

            try {
                // Ultimo controllo subito prima dell'accesso, per evitare doppioni.
                const occupied=await fetchOccupiedTeamIds(room,700);
                if(occupied.has(String(teamId))){
                    if(typeof startPlayerOccupiedRetryCountdown==='function'){
                        startPlayerOccupiedRetryCountdown(room,teamId);
                    }else{
                        err.innerText='Questa squadra è già occupata. Riprova tra qualche secondo.';
                    }
                    return;
                }

                await closePlayerSetupChannel();
                await connectToRoom(room);
                await selectExistingTeam(teamId);
            } catch(e) {
                err.innerText = e.message || 'Impossibile collegarsi alla stanza.';
                return;
            }
            document.getElementById('display-team-name').innerText = myTeamName;
            document.getElementById('player-room-inline').innerText = currentRoomCode;
            unlockAudio();
            showScreen('screen-player-buzzer');
            setPlayerBidButtonsEnabled(false);
            updatePlayerTeamStatus();
            await loadNominationState();
            await loadReadyMode();
            await loadPlayerShortlist(true);
            await loadPlayerBudgetPlan(true);
            updatePlayerTeamStatus();

            // Ogni nuovo ingresso nella stanza parte ONLINE, anche se nella
            // sessione precedente il giocatore era stato impostato ASSENTE.
            await resetMyAvailabilityOnlineOnEntry();

            await loadAudioRoutingSettings();
            setPlayerConnectionStatus('connecting');

            if (channel) {
                const playerChannel=channel;
                const playerChannelGeneration=realtimeConnectionGeneration;

                channel.on('presence',{event:'sync'},()=>{});
                channel.on('broadcast',{event:'audio_route_updated'},(payload)=>{
                    applyAudioRoutingPayload(payload.payload||{});
                });
                channel.on('broadcast', { event: 'new_player' }, (payload) => {
                    nominationReady=false;nominationRequestPending=false;closeNominationPicker();updateNominationUI();
                    playerSkippedCurrentAuction=false;
                    playerReadyChoice=null;
                    playerReadyRequiredIds=[];
                    playerReadyIds=[];
                    const data = payload.payload;
                    setPlayerImage(document.getElementById('phone-card-image'), data.player_id||data.id, data.role||'');
                    if(data.nome) setPhonePlayerDisplayName(data.nome,data.player_id||data.id);
                    const roleEl = document.getElementById('phone-player-role');
                    const clubEl = document.getElementById('phone-player-club');
                    if (roleEl) roleEl.innerText = data.role || '-';
                    if (clubEl) clubEl.innerText = data.club || '-';
                    document.getElementById('player-auction-title').innerText = 'MIGLIOR OFFERTA';
                    document.getElementById('player-current-winner').innerText = 'Nessuno';
                    document.getElementById('player-current-winner').style.color = 'var(--text-muted)';
                    document.getElementById('player-current-value').innerText = '0';
                    clearSealedBidRanking();
                    document.getElementById('phone-card-container').style.visibility = 'visible';
                    currentAuctionValue = 0;
                    currentWinner = '';
                    currentAuctionPlayer = playersList.find(p => String(p.Id) === String(data.player_id)) || {Id:data.player_id,R:data.role,Nome:data.nome,Squadra:data.club,FVM:data.fvm};
                    renderCurrentPlayerPriority();
                    refreshPlayerListoneIfOpen();
                    playerHasBidThisAuction = false;
                    setPlayerAuctionVisualState('neutral');
                    isAuctionActive = false;
                    setPlayerBidButtonsEnabled(false);
                    stopPlayerSealedCountdown();
                    playerSealedRevealLocalEndAt=0;
                    document.getElementById('player-countdown').innerText = '--';
                    document.getElementById('player-countdown').classList.remove('danger');
                    updatePlayerTeamStatus();

                    playerSealedMode=data.mode==='sealed';
                    playerSealedToken=playerSealedMode?String(data.sealed_token||''):null;
                    playerSealedSubmitted=false;
                    preparePlayerSealedControls(false);

                    if(data.ready_required) showPlayerReadyBanner(data);
                    else if(playerSealedMode){
                        closePlayerReadyBanner();
                        document.getElementById('player-auction-title').textContent='BUSTA CHIUSA';
                        document.getElementById('player-current-winner').textContent='In attesa apertura';
                    } else {
                        closePlayerReadyBanner();
                        startLocalPlayerPreparation(Math.max(1,parseInt(data.prep_seconds)||5));
                    }
                });
                channel.on('broadcast',{event:'sealed_bid_start'},(payload)=>{
                    playerSkippedCurrentAuction=false;
                    playSound('audio-start');
                    const d=payload.payload||{};
                    const token=String(d.token||'');
                    if(!token)return;

                    // Il token ricevuto è autoritativo: così funziona anche se
                    // sealed_bid_start arriva prima di new_player o è uno spareggio.
                    playerSealedMode=true;
                    playerSealedToken=token;
                    playerSealedSubmitted=false;

                    if(d.player_id){
                        const p=playersList.find(x=>String(x.Id)===String(d.player_id));
                        if(p)currentAuctionPlayer=p;
                    }

                    closePlayerReadyBanner();
                    isAuctionActive=false;
                    setPlayerBidButtonsEnabled(false);

                    const eligible=(Array.isArray(d.eligible_ids)?d.eligible_ids:[]).map(String);
                    const allowed=eligible.includes(String(myTeamId));
                    preparePlayerSealedControls(allowed);

                    const round=Math.max(1,parseInt(d.round)||1);
                    const title=document.getElementById('player-auction-title');
                    const winner=document.getElementById('player-current-winner');
                    const val=document.getElementById('player-current-value');

                    if(title)title.textContent=round>1?'SPAREGGIO BUSTA':'BUSTA CHIUSA';
                    if(winner){
                        winner.textContent=allowed
                            ?(round>1?'Nuova offerta richiesta':'Inserisci la tua offerta')
                            :(round>1?'Spareggio in corso':'Non puoi partecipare');
                        winner.style.color=allowed?'var(--text-main)':'var(--text-muted)';
                    }
                    if(val)val.textContent='?';

                    const localSeconds=safeSealedSeconds(d.seconds,30,180);
                    startPlayerSealedCountdownSeconds(localSeconds,5);
                });

                channel.on('broadcast',{event:'sealed_bid_rejected'},(payload)=>{
                    const d=payload.payload||{};
                    if(String(d.token)!==String(playerSealedToken)||String(d.team_id)!==String(myTeamId))return;
                    playerSealedSubmitted=false;
                    const btn=document.getElementById('sealed-bid-submit');
                    const inp=document.getElementById('sealed-bid-input');
                    const st=document.getElementById('sealed-bid-status');
                    if(btn){btn.disabled=false;btn.textContent='OFFRI';}
                    if(inp)inp.disabled=false;
                    if(st){st.textContent=d.reason||'Offerta rifiutata.';st.className='sealed-bid-status error';}
                });

                channel.on('broadcast',{event:'sealed_reveal_start'},(payload)=>{
                    const d=payload.payload||{};
                    if(String(d.token)!==String(playerSealedToken))return;
                    if(playerPrepInterval){clearInterval(playerPrepInterval);playerPrepInterval=null;}
                    playerSealedMode=true;
                    preparePlayerSealedControls(false);
                    const st=document.getElementById('sealed-bid-status');
                    if(st){st.textContent='Buste chiuse. Apertura in corso…';st.className='sealed-bid-status sent';}
                    const title=document.getElementById('player-auction-title');
                    const winner=document.getElementById('player-current-winner');
                    const val=document.getElementById('player-current-value');
                    const timer=document.getElementById('player-countdown');
                    if(title)title.textContent='APERTURA BUSTE';
                    if(winner){winner.textContent='ATTENDI';winner.style.color='var(--text-muted)';}
                    if(val)val.textContent='?';
                    const revealSeconds=safeSealedSeconds(d.seconds,5,30);
                    playerSealedRevealDeadlineAt=Number(d.deadline_at)||0;
                    playerSealedRevealLocalEndAt=Date.now()+revealSeconds*1000;
                    playerPendingSealedResult=null;
                    clearSealedBidRanking();
                    startPlayerSealedCountdownSeconds(revealSeconds,2,true);
                });

                channel.on('broadcast',{event:'sealed_bid_end'},(payload)=>{
                    const d=payload.payload||{};
                    if(String(d.token)!==String(playerSealedToken))return;

                    const renderResult=()=>{
                        playSound('audio-end');
                        if(playerPrepInterval){clearInterval(playerPrepInterval);playerPrepInterval=null;}
                        stopPlayerSealedCountdown();
                        preparePlayerSealedControls(false);
                        const title=document.getElementById('player-auction-title');
                        const winner=document.getElementById('player-current-winner');
                        const val=document.getElementById('player-current-value');
                        const timer=document.getElementById('player-countdown');
                        if(title)title.textContent='BUSTE APERTE';
                        if(winner){
                            winner.textContent=d.no_bids?'INVENDUTO':(d.winner||'--');
                            if(d.no_bids){
                                winner.style.color='var(--text-muted)';
                                setPlayerAuctionVisualState('neutral');
                            }else if(String(d.winner||'')===String(myTeamName||'')){
                                winner.style.color='var(--accent-green)';
                                setPlayerAuctionVisualState('winning');
                            }else{
                                winner.style.color='var(--accent-red)';
                                setPlayerAuctionVisualState('losing');
                            }
                        }
                        if(val)val.textContent=d.no_bids?'0':String(parseInt(d.value)||0);
                        if(timer){timer.textContent='0';timer.classList.remove('danger');}
                        playerSealedMode=false;
                        playerSealedToken=null;
                        playerSealedSubmitted=false;
                        playerSealedRevealDeadlineAt=0;
                        playerSealedRevealLocalEndAt=0;
                        playerPendingSealedResult=null;
                        preparePlayerSealedControls(false);
                    };

                    // Protezione forte: anche se il broadcast dell'esito arrivasse in anticipo,
                    // il telecomando non mostra vincitore/importo prima dello ZERO del secondo countdown.
                    const waitMs=Math.max(0,(Number(playerSealedRevealLocalEndAt)||0)-Date.now());
                    if(waitMs>25){
                        playerPendingSealedResult=d;
                        setTimeout(()=>{
                            if(playerPendingSealedResult && String(playerPendingSealedResult.token)===String(d.token)) renderResult();
                        },waitMs+40);
                        return;
                    }
                    renderResult();
                });

                channel.on('broadcast', { event: 'prep_started' }, (payload) => {
                    playerSkippedCurrentAuction=false;
                    playSound('audio-prep');
                    closePlayerReadyBanner();
                    isAuctionActive = false;
                    setPlayerBidButtonsEnabled(false);
                    setPlayerAuctionVisualState('preparing');
                    document.getElementById('player-auction-title').innerText = 'ASTA IN PREPARAZIONE';
                    document.getElementById('player-current-winner').innerText = 'Preparati';
                    document.getElementById('player-current-winner').style.color = 'var(--text-main)';
                    const t = Math.max(1, parseInt(payload.payload?.seconds) || 5);
                    startLocalPlayerPreparation(t);
                });
                channel.on('broadcast', { event: 'prep_tick' }, (payload) => {
                    playSound('audio-prep');
                    isAuctionActive = false;
                    setPlayerBidButtonsEnabled(false);
                    setPlayerAuctionVisualState('preparing');
                    const t = Math.max(0, parseInt(payload.payload?.seconds) || 0);
                    const el = document.getElementById('player-countdown');
                    el.innerText = t;
                    el.classList.remove('danger','liveasta-last3');
                    el.classList.add('prep-countdown');
                });
                channel.on('broadcast', { event: 'auction_started' }, (payload) => {
                    playerSkippedCurrentAuction=false;
                    playSound('audio-start');
                    stopPlayerSealedCountdown();
                    playerSealedRevealLocalEndAt=0;
                    playerSealedMode=false;
                    playerSealedToken=null;
                    playerSealedSubmitted=false;
                    preparePlayerSealedControls(false);
                    if (playerPrepInterval) {
                        clearInterval(playerPrepInterval);
                        playerPrepInterval = null;
                    }
                    isAuctionActive = true;
                    clearPlayerNormalBidCooldown();
                    currentAuctionValue = Math.max(0,parseInt(payload.payload?.value)||0);
                    currentWinner = String(payload.payload?.winner||'');
                    if(typeof payload.payload?.self_raise_enabled==='boolean')selfRaiseEnabled=payload.payload.self_raise_enabled;
                    playerHasBidThisAuction=!!currentWinner && currentWinner===myTeamName;
                    const prepTimerEl=document.getElementById('player-countdown');
                    if(prepTimerEl)prepTimerEl.classList.remove('prep-countdown','danger','liveasta-last3');
                    setPlayerAuctionVisualState(playerHasBidThisAuction?'winning':'neutral');
                    document.getElementById('player-auction-title').innerText = 'MIGLIOR OFFERTA';
                    document.getElementById('player-current-winner').innerText = currentWinner||'Nessuno';
                    document.getElementById('player-current-winner').style.color = currentWinner?(playerHasBidThisAuction?'var(--accent-green)':'var(--accent-red)'):'var(--text-muted)';
                    document.getElementById('player-current-value').innerText=String(currentAuctionValue||0);
                    setPlayerBidButtonsEnabled(true);
                    const t = clampNormalAuctionSeconds(payload.payload?.seconds ?? currentRoom?.timer_seconds ?? 5) || normalAuctionConfiguredSeconds();
                    document.getElementById('player-countdown').innerText = t;
                    updatePlayerTeamStatus();
                });
                channel.on('broadcast', { event: 'timer_tick' }, (payload) => {
                    const t = clampNormalAuctionSeconds(payload.payload?.seconds);

                    // Fallback se il browser ha sospeso il timeout,
                    // il tick del banditore riattiva i pulsanti appena i intervallo configurato sono trascorsi.
                    if(
                        isAuctionActive &&
                        !playerSealedMode &&
                        playerNormalBidCooldownUntil>0 &&
                        Date.now()>=playerNormalBidCooldownUntil
                    ){
                        clearPlayerNormalBidCooldown();
                        refreshPlayerBidButtons();
                    }

                    const el = document.getElementById('player-countdown');
                    el.innerText = t;
                    el.classList.toggle('danger', t > 0 && t <= 3);
                    el.classList.toggle('liveasta-last3', t > 0 && t <= 3);

                    if(!isAuctioneerPlayerIdentity() && t>0 && t<=3){
                        playAuctionFinalCountdown(t);
                    }
                });
                channel.on('broadcast', { event: 'auction_update' }, (payload) => {
                    const data = payload.payload||{};
                    currentAuctionValue = parseInt(data.value)||0;
                    currentWinner = String(data.winner||'');
                    if(typeof data.self_raise_enabled==='boolean')selfRaiseEnabled=data.self_raise_enabled;

                    if(data.cooldown_ms){
                        applyPlayerNormalBidCooldownMs(data.cooldown_ms);
                    }

                    playSound('audio-buzz');
                    speakBidValue(currentAuctionValue);
                    const winnerEl = document.getElementById('player-current-winner');
                    winnerEl.innerText = data.winner;
                    if (data.winner === myTeamName) {
                        playerHasBidThisAuction = true;
                        winnerEl.style.color = 'var(--accent-green)';
                        setPlayerAuctionVisualState('winning');
                    } else {
                        winnerEl.style.color = data.winner ? 'var(--accent-red)' : 'var(--text-muted)';
                        setPlayerAuctionVisualState(playerHasBidThisAuction && data.winner ? 'losing' : 'neutral');
                    }
                    document.getElementById('player-current-value').innerText = data.value;
                    refreshPlayerBidButtons();
                    updatePlayerTeamStatus();
                });
                channel.on('broadcast', { event: 'bid_rejected' }, (payload) => {
                    const d=payload.payload||{}; if(String(d.team_id)!==String(myTeamId)) return;
                    if(navigator.vibrate) navigator.vibrate([80,60,80]);
                    document.getElementById('player-auction-title').innerText = d.reason || 'OFFERTA NON VALIDA';
                });
                channel.on('broadcast', { event: 'auction_end' }, async (payload) => {
                    playSound('audio-end');
                    const data = payload.payload; isAuctionActive = false; setPlayerBidButtonsEnabled(false); playerSkippedCurrentAuction=false;
                    document.getElementById('player-auction-title').innerText = data.winner === '' ? 'NESSUNA OFFERTA' : 'AGGIUDICATO A';
                    const winnerEl = document.getElementById('player-current-winner');
                    winnerEl.innerText = data.winner === '' ? 'INVENDUTO' : data.winner;
                    if (data.winner === myTeamName) {
                        playerHasBidThisAuction = true;
                        winnerEl.style.color = 'var(--accent-green)';
                        setPlayerAuctionVisualState('winning');
                    } else {
                        winnerEl.style.color = data.winner ? 'var(--accent-red)' : 'var(--text-muted)';
                        setPlayerAuctionVisualState(playerHasBidThisAuction && data.winner ? 'losing' : 'neutral');
                    }
                    document.getElementById('player-current-value').innerText = data.value;
                    document.getElementById('player-countdown').innerText = '0';
                    document.getElementById('player-countdown').classList.remove('danger');
                    await loadRoomState();
                });
                channel.on('broadcast',{event:'nomination_state'},async(payload)=>{
                    const p=payload.payload||{};
                    if(p.state)nominationState={...nominationState,...p.state};
                    nominationReady=!!p.ready;
                    nominationRequestPending=false;
                    await loadRoomState();
                    normalizeNominationState();
                    updateNominationUI();
                    if(playerReadyToken)renderPlayerReadySidePanel();
                    if(isMyNominationTurn()) autoOpenNominationPicker();
                    else closeNominationPicker();
                });
                channel.on('broadcast',{event:'ready_gate_state'},async(payload)=>{
                    const gate=payload.payload||null;
                    if(gate?.active){
                        await restorePlayerReadyGateFirst();
                    }
                });
                channel.on('broadcast',{event:'live_state'},async(payload)=>{
                    const state=payload.payload||null;
                    liveAuctionState=state;
                    await restorePlayerFromLiveState(state);
                });
                channel.on('broadcast',{event:'force_state_reset'},async(payload)=>{
                    stopPlayerSealedCountdown();
                    playerSealedRevealLocalEndAt=0;
                    if(playerPrepInterval){
                        clearInterval(playerPrepInterval);
                        playerPrepInterval=null;
                    }
                    closePlayerReadyBanner();
                    closeNominationPicker();
                    isAuctionActive=false;
                    playerHasBidThisAuction=false;
                    playerSkippedCurrentAuction=false;
                    currentAuctionPlayer=null;
                    currentWinner='';
                    currentAuctionValue=0;
                    playerSealedMode=false;
                    playerSealedToken=null;
                    playerSealedSubmitted=false;
                    preparePlayerSealedControls(false);
                    setPlayerBidButtonsEnabled(false);
                    setPlayerAuctionVisualState('neutral');

                    const card=document.getElementById('phone-card-container');
                    if(card)card.style.visibility='hidden';
                    const name=document.getElementById('phone-player-name');
                    const role=document.getElementById('phone-player-role');
                    const club=document.getElementById('phone-player-club');
                    const title=document.getElementById('player-auction-title');
                    const winner=document.getElementById('player-current-winner');
                    const value=document.getElementById('player-current-value');
                    const timer=document.getElementById('player-countdown');
                    if(name)setPhonePlayerDisplayName('--',null);
                    if(role)role.textContent='-';
                    if(club)club.textContent='-';
                    if(title)title.textContent='IN ATTESA';
                    if(winner){winner.textContent='Nessuna asta in corso';winner.style.color='var(--text-muted)';}
                    if(value)value.textContent='0';
                    if(timer){timer.textContent='--';timer.classList.remove('danger');}

                    if(payload.payload?.nomination_state){
                        nominationState={...nominationState,...payload.payload.nomination_state};
                        nominationReady=!!payload.payload?.nomination_enabled;
                    }else{
                        await loadNominationState();
                    }
                    updateNominationUI();
                    if(isMyNominationTurn())autoOpenNominationPicker();
                });
                channel.on('broadcast',{event:'ready_state'},(payload)=>{updatePlayerReadyProgress(payload.payload||{});});
                channel.on('broadcast',{event:'online_status_request'},()=>{
                    if(channel===playerChannel && realtimeConnectionGeneration===playerChannelGeneration){
                        sendFallbackOnlineHeartbeat();
                    }
                });
                channel.on('broadcast',{event:'self_raise_setting'},(payload)=>{
                    const enabled=payload.payload?.enabled;
                    if(typeof enabled==='boolean'){
                        selfRaiseEnabled=enabled;
                        refreshPlayerBidButtons();
                    }
                });
                channel.on('broadcast',{event:'state_changed'}, async()=>{ await loadRoomState(); await loadNominationState(); });
                playerChannel.subscribe(async(status)=>{
                    // Ignora eventi tardivi provenienti da una vecchia connessione.
                    if(channel!==playerChannel || realtimeConnectionGeneration!==playerChannelGeneration){
                        return;
                    }

                    if(status==='SUBSCRIBED'){
                        // Ogni accesso/reingresso è sempre ONLINE.
                        playerAvailabilityMode='online';
                        absentTeamIds.delete(String(myTeamId));
                        setPlayerConnectionStatus('online');
                        broadcastMyAvailabilityOnline();

                        // Segnala subito ONLINE al banditore.
                        startFallbackOnlineHeartbeat();
                        trackPlayerPresence().catch(()=>{});

                        // La connessione potrebbe essere cambiata durante gli await.
                        if(channel!==playerChannel || realtimeConnectionGeneration!==playerChannelGeneration){
                            return;
                        }

                        await restorePlayerFromLiveState();

                        if(channel!==playerChannel || realtimeConnectionGeneration!==playerChannelGeneration){
                            return;
                        }

                        if(!liveAuctionState || liveAuctionState.phase==='idle'){
                            autoOpenNominationPicker();
                        }

                        playerChannel.send({
                            type:'broadcast',
                            event:'live_state_request',
                            payload:{team_id:myTeamId}
                        }).catch(()=>{});
                    }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){
                        setPlayerConnectionStatus('connecting');
                        stopFallbackOnlineHeartbeat();
                    }else if(status==='CLOSED'){
                        // CLOSED vale solo se questo è ancora davvero il canale corrente.
                        setPlayerConnectionStatus('offline');
                        stopFallbackOnlineHeartbeat();
                    }else{
                        setPlayerConnectionStatus('connecting');
                    }
                });
            }
        }


        function clearPlayerNormalBidCooldown(){
            playerNormalBidCooldownUntil=0;
            if(playerNormalBidCooldownTimer){
                clearTimeout(playerNormalBidCooldownTimer);
                playerNormalBidCooldownTimer=null;
            }
        }

        function applyPlayerNormalBidCooldownMs(durationMs=normalBidCooldownMs){
            clearPlayerNormalBidCooldown();

            const duration=Math.max(0,parseInt(durationMs)||normalBidCooldownMs);
            playerNormalBidCooldownUntil=Date.now()+duration;

            // i pulsanti restano colorati e cliccabili visivamente.
            // buzz() ignora localmente i tap nel cooldown e il banditore rimane
            // comunque l'autorità definitiva sul blocco configurato.
            playerNormalBidCooldownTimer=setTimeout(()=>{
                playerNormalBidCooldownTimer=null;
                playerNormalBidCooldownUntil=0;
                if(isAuctionActive && !playerSealedMode){
                    refreshPlayerBidButtons();
                }
            },duration+40);
        }

        function isSelfRaiseBlockedForTeam(team){
            if(selfRaiseEnabled || !team)return false;
            if(!currentWinner)return false;
            return String(currentWinner).trim().toLowerCase()===String(team.name||'').trim().toLowerCase();
        }

        function isNormalBidAmountAllowed(amount){
            const inc=Math.max(1,parseInt(amount)||1);
            const team = myTeamId
                ? teamsCache.find(x => String(x.id) === String(myTeamId))
                : findTeamByName(myTeamName);

            if(!isAuctionActive || !currentAuctionPlayer || !team)return false;
            if(isSelfRaiseBlockedForTeam(team))return false;

            const role=String(currentAuctionPlayer?.R||'');
            const limits=roomLimits();
            const counts=teamCounts(team.id);
            const totalFree=Math.max(0,totalRoomSlots()-counts.total);
            const roleFree=isMantraRoom()
                ? totalFree
                : (limits[role.toUpperCase()]!==undefined
                    ? Math.max(0,(limits[role.toUpperCase()]||0)-(counts[role.toUpperCase()]||0))
                    : 0);

            if(totalFree<=0 || roleFree<=0)return false;

            const maxBid=maxBidForTeam(team,role);
            return maxBid>0 && (currentAuctionValue+inc)<=maxBid;
        }

        function isSelfRaiseTemporarilyLocked(){
            const team = myTeamId
                ? teamsCache.find(x => String(x.id) === String(myTeamId))
                : findTeamByName(myTeamName);
            return !!(team && isSelfRaiseBlockedForTeam(team));
        }

        function refreshPlayerBidButtons() {
            updatePlayerBidBudgetVisuals();
            const team = myTeamId ? teamsCache.find(x => String(x.id) === String(myTeamId)) : findTeamByName(myTeamName);
            const role = String(currentAuctionPlayer?.R || '');
            const limits = roomLimits();
            const counts = team ? teamCounts(team.id) : {P:0,D:0,C:0,A:0,Por:0,total:0};
            const totalFree = team ? Math.max(0, totalRoomSlots() - counts.total) : 0;
            const roleFree = isMantraRoom()
                ? totalFree
                : (team && limits[role.toUpperCase()] !== undefined ? Math.max(0, limits[role.toUpperCase()] - (counts[role.toUpperCase()] || 0)) : 0);
            const maxBid = team && currentAuctionPlayer ? maxBidForTeam(team, role) : 0;
            const baseAllowed = Boolean(
                isAuctionActive &&
                currentAuctionPlayer &&
                team &&
                totalFree > 0 &&
                roleFree > 0 &&
                maxBid>0
            );

            document.querySelectorAll('#screen-player-buzzer .buzzer-btn').forEach(btn => {
                const inc = parseInt(btn.textContent.replace('+','')) || 1;
                const selfRaiseLocked = isSelfRaiseTemporarilyLocked();
                // MV105: l'autorilancio disattivato blocca il tap ma NON rende grigi i tasti.
                // Restano grigi solo per i veri vincoli (crediti, slot, asta non attiva, ecc.).
                const allowedByRealConstraints = baseAllowed && (
                    selfRaiseLocked
                        ? (() => {
                            const roleNow=String(currentAuctionPlayer?.R||'');
                            const maxBidNow=maxBidForTeam(team,roleNow);
                            return maxBidNow>0 && (currentAuctionValue+inc)<=maxBidNow;
                        })()
                        : isNormalBidAmountAllowed(inc)
                );
                btn.disabled = !allowedByRealConstraints;
                btn.setAttribute('aria-disabled', allowedByRealConstraints ? 'false' : 'true');
                btn.classList.toggle('self-raise-locked', selfRaiseLocked && allowedByRealConstraints);
            });
            refreshExactBidControl();
        }

        function setPlayerBidButtonsEnabled(enabled) {
            if (!enabled) {
                document.querySelectorAll('#screen-player-buzzer .buzzer-btn').forEach(btn => {
                    btn.disabled = true;
                    btn.setAttribute('aria-disabled', 'true');
                });
                exactBidSliderCancel(false);
                refreshExactBidControl();
                return;
            }
            refreshPlayerBidButtons();
        }

        function preparePlayerSealedControls(enabled){
            const normal=document.getElementById('normal-bid-controls');
            const sealed=document.getElementById('sealed-bid-controls');
            const input=document.getElementById('sealed-bid-input');
            const btn=document.getElementById('sealed-bid-submit');
            const st=document.getElementById('sealed-bid-status');

            // Non nascondiamo il contenitore dei pulsanti: la busta vive DENTRO lo stesso
            // contenitore e sostituisce fisicamente i quattro tasti.
            if(normal){
                normal.style.display='grid';
                normal.classList.toggle('sealed-active',!!playerSealedMode);
            }
            if(sealed){
                sealed.classList.toggle('sealed-visible',!!playerSealedMode);
                sealed.style.display=playerSealedMode?'block':'none';
            }

            enabled=!!enabled;

            if(input){
                input.disabled=!enabled || playerSealedSubmitted;
                input.value=playerSealedSubmitted?input.value:'';
                const team=myTeamId?teamsCache.find(t=>String(t.id)===String(myTeamId)):null;
                const max=team&&currentAuctionPlayer?maxBidForTeam(team,currentAuctionPlayer.R):0;
                input.max=String(Math.max(1,max));
                input.placeholder=max>0?`Max ${max} crediti`:'Offerta non disponibile';
            }
            if(btn){
                btn.disabled=!enabled || playerSealedSubmitted;
                btn.textContent=playerSealedSubmitted?'OFFERTA INVIATA ✓':'OFFRI';
            }
            if(st){
                st.className='sealed-bid-status'+(playerSealedSubmitted?' sent':'');
                st.textContent=playerSealedSubmitted
                    ? 'Offerta registrata. Non può più essere modificata.'
                    : enabled
                        ? 'Inserisci l’importo e conferma. L’offerta è definitiva.'
                        : (playerSealedMode?'Buste in attesa di apertura.':'In attesa della busta chiusa.');
            }
            updatePlayerBidBudgetVisuals();
            syncSealedBidAreaHeight();
        }

        async function submitSealedBid(){
            if(!playerSealedMode || !playerSealedToken || playerSealedSubmitted || !myTeamId)return;
            // Per il banditore+giocatore l'offerta viene consegnata direttamente
            // a receiveSealedBid(), quindi il realtime channel non è un prerequisito.
            if(!isAuctioneerPlayerIdentity() && !channel)return;

            const input=document.getElementById('sealed-bid-input');
            const amount=Math.max(1,parseInt(input?.value)||0);
            const team=teamsCache.find(t=>String(t.id)===String(myTeamId));
            const max=team&&currentAuctionPlayer?maxBidForTeam(team,currentAuctionPlayer.R):0;
            const st=document.getElementById('sealed-bid-status');

            if(amount<1 || amount>max){
                if(st){st.textContent=`Inserisci un'offerta tra 1 e ${max} crediti.`;st.className='sealed-bid-status error';}
                return;
            }

            if(!await appConfirm(`Confermi l'offerta di ${amount} crediti?\n\nDopo l'invio NON potrai modificarla.`))return;

            playerSealedSubmitted=true;
            preparePlayerSealedControls(true);

            const sealedPayload={
                token:playerSealedToken,
                team_id:String(myTeamId),
                team_name:String(myTeamName||''),
                amount,
                at:Date.now()
            };

            if(isAuctioneerPlayerIdentity()){
                await receiveSealedBid(sealedPayload);
                return;
            }

            channel.send({
                type:'broadcast',
                event:'sealed_bid_submit',
                payload:sealedPayload
            }).catch(()=>{
                playerSealedSubmitted=false;
                preparePlayerSealedControls(true);
                if(st){st.textContent='Invio non riuscito. Riprova.';st.className='sealed-bid-status error';}
            });
        }


        // ==========================================================
        // LIVEASTA OFFERTA ESATTA CON PRESSIONE + SLIDER
        // Il valore inviato al banditore è ASSOLUTO (non un incremento),
        // così un rilancio concorrente non può trasformare 50 in 55.
        // ==========================================================
        let exactBidHoldTimer=null;
        let exactBidStateTimer=null;
        let exactBidPointerId=null;
        let exactBidActive=false;
        let exactBidPointerY=0;
        let exactBidOriginX=0;
        let exactBidOriginY=0;
        let exactBidTopY=0;
        let exactBidTrackHeight=0;
        let exactBidSelected=0;

        function exactBidTeam(){
            return myTeamId
                ? teamsCache.find(x=>String(x.id)===String(myTeamId))
                : findTeamByName(myTeamName);
        }

        function exactBidRange(){
            const team=exactBidTeam();
            if(!isAuctionActive || playerSealedMode || !currentAuctionPlayer || !team){
                return {valid:false,min:0,max:0};
            }
            if(isSelfRaiseBlockedForTeam(team)){
                return {valid:false,min:0,max:0};
            }
            const role=String(currentAuctionPlayer.R||'');
            const max=Math.max(0,parseInt(maxBidForTeam(team,role))||0);
            const min=Math.max(1,(parseInt(currentAuctionValue)||0)+1);
            return {valid:max>=min,min,max};
        }

        function refreshExactBidControl(){
            const knob=document.getElementById('exact-bid-knob');
            if(!knob)return;
            const range=exactBidRange();
            const selfRaiseLocked=isSelfRaiseTemporarilyLocked();
            let available=!!range.valid;
            if(selfRaiseLocked){
                const team=exactBidTeam();
                const role=String(currentAuctionPlayer?.R||'');
                const max=Math.max(0,parseInt(team?maxBidForTeam(team,role):0)||0);
                const min=Math.max(1,(parseInt(currentAuctionValue)||0)+1);
                available=max>=min;
            }
            knob.disabled=!available;
            knob.classList.toggle('available',available);
            knob.classList.toggle('self-raise-locked',selfRaiseLocked && available);
            knob.setAttribute('aria-disabled',available?'false':'true');
            knob.title=available
                ? (selfRaiseLocked ? 'Attendi il rilancio di un’altra squadra' : `Tieni premuto 0,3 secondi · 0 in basso annulla · offerta ${range.min}-${range.max}`)
                : 'Offerta esatta non disponibile';
        }

        function exactBidLayer(show){
            const layer=document.getElementById('exact-bid-slider-layer');
            if(!layer)return;
            layer.classList.toggle('active',!!show);
            layer.setAttribute('aria-hidden',show?'false':'true');
        }

        function exactBidRefreshActive(){
            if(!exactBidActive)return;
            const track=document.getElementById('exact-bid-track');
            const fill=document.getElementById('exact-bid-track-fill');
            const thumb=document.getElementById('exact-bid-thumb');
            const bubble=document.getElementById('exact-bid-value-bubble');
            const valueEl=document.getElementById('exact-bid-value');
            if(!track||!fill||!thumb||!bubble||!valueEl)return;

            // Keep the amount above the finger, centered for either hand.
            const halfHeight=(bubble.offsetHeight||112)/2;
            const fingerY=Number.isFinite(exactBidPointerY)?exactBidPointerY:exactBidOriginY;
            const viewportHeight=window.innerHeight;
            const bubbleY=Math.max(halfHeight+8,Math.min(viewportHeight-halfHeight-8,fingerY-halfHeight-40));
            bubble.style.top=`${Math.round(bubbleY)}px`;

            const range=exactBidRange();
            track.style.left=`${Math.round(exactBidOriginX-5)}px`;
            track.style.top=`${Math.round(exactBidTopY)}px`;
            track.style.height=`${Math.round(exactBidTrackHeight)}px`;

            if(!range.valid){
                // Se mentre stai trascinando l'offerta minima supera il tuo massimo,
                // la corsa torna automaticamente a 0: rilasciare significa NON OFFRIRE.
                exactBidSelected=0;
                const y=exactBidOriginY;
                thumb.style.left=`${Math.round(exactBidOriginX)}px`;
                thumb.style.top=`${Math.round(y)}px`;
                fill.style.height='0px';


                bubble.classList.remove('invalid');
                valueEl.textContent='0';
                updatePlayerBidBudgetVisuals();
                return;
            }

            bubble.classList.remove('invalid');
            const y=Math.max(exactBidTopY,Math.min(exactBidOriginY,exactBidPointerY||exactBidOriginY));
            const lift=Math.max(0,exactBidOriginY-y);

            // la parte più bassa della corsa è una vera zona ANNULLA.
            // Se torni completamente giù (o negli ultimi pochi pixel) il valore
            // diventa 0 e, al rilascio, non viene inviata nessuna offerta.
            const cancelZone=Math.min(30,Math.max(16,Math.round(exactBidTrackHeight*.10)));
            const bidTravel=Math.max(1,exactBidTrackHeight-cancelZone);
            let thumbY=exactBidOriginY;

            if(lift<=cancelZone){
                exactBidSelected=0;
                thumbY=exactBidOriginY;
            }else{
                const ratio=Math.max(0,Math.min(1,(lift-cancelZone)/bidTravel));
                exactBidSelected=range.min+Math.round((range.max-range.min)*ratio);
                exactBidSelected=Math.max(range.min,Math.min(range.max,exactBidSelected));
                const selectedRatio=range.max===range.min?0:(exactBidSelected-range.min)/(range.max-range.min);
                thumbY=exactBidOriginY-cancelZone-(selectedRatio*bidTravel);
            }

            const fillHeight=Math.max(0,exactBidOriginY-thumbY);

            thumb.style.left=`${Math.round(exactBidOriginX)}px`;
            thumb.style.top=`${Math.round(thumbY)}px`;
            fill.style.height=`${Math.round(fillHeight)}px`;


            valueEl.textContent=String(exactBidSelected);
            updatePlayerBidBudgetVisuals();
        }

        function exactBidActivate(knob){
            exactBidHoldTimer=null;

            // Se il rilancio precedente è ancora nel lock da intervallo configurato, mantieni
            // la pressione e apri lo slider appena il lock termina.
            const cooldownLeft=Math.max(0,playerNormalBidCooldownUntil-Date.now());
            if(cooldownLeft>0 && exactBidPointerId!==null){
                exactBidHoldTimer=setTimeout(()=>{
                    if(exactBidPointerId!==null)exactBidActivate(knob);
                },cooldownLeft+25);
                return;
            }

            const range=exactBidRange();
            if(!range.valid){
                exactBidSliderCancel(false);
                return;
            }

            const rect=knob.getBoundingClientRect();
            exactBidOriginX=rect.left+rect.width/2;
            exactBidOriginY=rect.top+rect.height/2;
            const desiredTop=Math.round(window.innerHeight*.48);
            exactBidTopY=Math.max(52,Math.min(exactBidOriginY-120,desiredTop));
            if(exactBidTopY>=exactBidOriginY-80){
                exactBidTopY=Math.max(42,exactBidOriginY-160);
            }
            exactBidTrackHeight=Math.max(80,exactBidOriginY-exactBidTopY);
            exactBidPointerY=exactBidOriginY;
            exactBidActive=true;
            knob.classList.remove('holding');
            knob.classList.add('active');
            exactBidLayer(true);
            exactBidRefreshActive();
            if(navigator.vibrate)navigator.vibrate([28,24,28]);
            exactBidStateTimer=setInterval(exactBidRefreshActive,80);
        }

        function exactBidPointerDown(event){
            if(event.pointerId===undefined || exactBidPointerId!==null)return;
            const range=exactBidRange();
            if(!range.valid)return;
            event.preventDefault();
            exactBidPointerId=event.pointerId;
            exactBidPointerY=event.clientY;
            const knob=event.currentTarget;
            try{knob.setPointerCapture(event.pointerId);}catch(e){}
            knob.classList.add('holding');
            exactBidHoldTimer=setTimeout(()=>{
                if(exactBidPointerId===event.pointerId)exactBidActivate(knob);
            },300);
        }

        function exactBidPointerMove(event){
            if(exactBidPointerId!==event.pointerId)return;
            event.preventDefault();
            exactBidPointerY=event.clientY;
            if(exactBidActive)exactBidRefreshActive();
        }

        function exactBidPointerUp(event){
            if(exactBidPointerId!==event.pointerId)return;
            event.preventDefault();
            exactBidPointerY=event.clientY;
            const knob=event.currentTarget;
            const wasActive=exactBidActive;
            if(wasActive)exactBidRefreshActive();
            const target=exactBidSelected;
            exactBidSliderCancel(false);
            try{knob.releasePointerCapture(event.pointerId);}catch(e){}
            if(wasActive && target>0)submitExactBid(target);
        }

        function exactBidPointerCancel(event){
            if(exactBidPointerId!==null && event?.pointerId!==undefined && exactBidPointerId!==event.pointerId)return;
            exactBidSliderCancel(false);
        }

        function exactBidSliderCancel(refresh=true){
            if(exactBidHoldTimer){clearTimeout(exactBidHoldTimer);exactBidHoldTimer=null;}
            if(exactBidStateTimer){clearInterval(exactBidStateTimer);exactBidStateTimer=null;}
            const knob=document.getElementById('exact-bid-knob');
            if(knob)knob.classList.remove('holding','active');
            exactBidLayer(false);
            exactBidPointerId=null;
            exactBidActive=false;
            exactBidSelected=0;
            updatePlayerBidBudgetVisuals();
            if(refresh)refreshExactBidControl();
        }

        function submitExactBid(target){
            const range=exactBidRange();
            const exact=Math.max(1,parseInt(target)||0);
            if(!range.valid || exact<range.min || exact>range.max)return;
            if(Date.now()<playerNormalBidCooldownUntil)return;

            if(navigator.vibrate)navigator.vibrate(40);
            const bidId=`exact_${String(myTeamId||'team')}_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;

            if(isAuctioneerPlayerIdentity()){
                handleExactBidReceived(myTeamName,exact,myTeamId,bidId);
                return;
            }

            if(channel){
                channel.send({
                    type:'broadcast',
                    event:'exact_bid',
                    payload:{
                        team:myTeamName,
                        team_id:myTeamId,
                        target:exact,
                        bid_id:bidId
                    }
                }).catch(()=>console.log('Errore di rete invio offerta esatta.'));
            }
        }

        function buzz(amount) {
            if (!isAuctionActive) return;

            // sicurezza logica indipendente dallo stato grafico/disabled del bottone.
            // Un rilancio non consentito (es. +2 oltre il max) NON può essere inviato.
            if(!isNormalBidAmountAllowed(amount))return;

            // I pulsanti restano colorati durante il cooldown, ma il tap non produce offerte.
            if (Date.now() < playerNormalBidCooldownUntil) return;

            if (navigator.vibrate) navigator.vibrate(40);

            const bidId=`${String(myTeamId||'team')}_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;

            if(isAuctioneerPlayerIdentity()){
                handleBuzzReceived(myTeamName,amount,myTeamId,bidId);
                return;
            }

            if (channel) {
                channel.send({
                    type: 'broadcast',
                    event: 'buzz',
                    payload: {
                        team: myTeamName,
                        team_id: myTeamId,
                        amount: amount,
                        bid_id: bidId
                    }
                }).catch(e => console.log("Errore di rete invio buzz."));
            }
        }

        // --- LOCK ESCLUSIVO BANDITORE ---
        function auctioneerLockLastSeen(row){
            const raw=
                row?.data?.heartbeat_at ||
                row?.data?.acquired_at ||
                row?.updated_at ||
                '';
            const ts=Date.parse(raw);
            return Number.isFinite(ts)?ts:0;
        }

        function isAuctioneerLockFresh(row){
            const last=auctioneerLockLastSeen(row);
            return !!last && (Date.now()-last)<AUCTIONEER_LOCK_STALE_MS;
        }

        function createAuctioneerLockToken(){
            try{
                if(globalThis.crypto?.randomUUID) return crypto.randomUUID();
            }catch(e){}
            return `auctioneer_${Date.now()}_${Math.random().toString(36).slice(2,12)}`;
        }

        function stopAuctioneerLockHeartbeat(){
            if(auctioneerLockHeartbeatTimer){
                clearInterval(auctioneerLockHeartbeatTimer);
                auctioneerLockHeartbeatTimer=null;
            }
        }

        async function readAuctioneerLock(lockKey){
            if(!lockKey)return null;
            const {data,error}=await supabaseClient
                .from('fanta_app_data')
                .select('key,data,updated_at')
                .eq('key',lockKey)
                .maybeSingle();

            if(error){
                console.warn('Lettura lock banditore non riuscita',error);
                return null;
            }
            return data||null;
        }


        async function insertAuctioneerLock(lockKey,token,room){
            const now=new Date().toISOString();
            const payload={
                token,
                room_id:String(room.id),
                room_name:String(room.name||''),
                acquired_at:now,
                heartbeat_at:now
            };

            const {error}=await supabaseClient
                .from('fanta_app_data')
                .insert({
                    key:lockKey,
                    data:payload,
                    file_name:'liveasta-auctioneer-lock',
                    updated_at:now
                });

            return {ok:!error,error};
        }

        async function acquireAuctioneerRoomLock(room){
            if(!room?.id) return false;

            // Se questo dispositivo possiede già un proprio lock precedente,
            // lo rilascia prima di tentare una stanza diversa.
            await releaseAuctioneerRoomLock();

            const lockKey=`liveasta_auctioneer_lock_${room.id}`;
            const token=createAuctioneerLockToken();

            // 1) Il primo INSERT vince sempre grazie alla PRIMARY KEY.
            let attempt=await insertAuctioneerLock(lockKey,token,room);
            if(attempt.ok){
                auctioneerLockKey=lockKey;
                auctioneerLockToken=token;
                auctioneerLockLostHandled=false;
                startAuctioneerLockHeartbeat();
                return true;
            }

            // 2) Se esiste già un lock con heartbeat recente, NON si tocca:
            //    il secondo banditore resta bloccato.
            let existing=await readAuctioneerLock(lockKey);
            if(existing && isAuctioneerLockFresh(existing)){
                return false;
            }

            // 3) Potrebbe essere rimasto un lock orfano da una chiusura/crash.
            //    Prima di pulirlo ricontrolliamo dopo un breve intervallo.
            if(existing){
                const oldUpdatedAt=String(existing.updated_at||'');
                const oldToken=String(existing?.data?.token||'');

                await new Promise(resolve=>setTimeout(resolve,500));

                const verify=await readAuctioneerLock(lockKey);

                // Nel frattempo il banditore originale ha battuto heartbeat:
                // blocca l'accesso e NON cancellare nulla.
                if(verify && (
                    isAuctioneerLockFresh(verify) ||
                    String(verify.updated_at||'')!==oldUpdatedAt ||
                    String(verify?.data?.token||'')!==oldToken
                )){
                    return false;
                }

                if(verify){
                    // Delete "compare-and-swap": cancella solo la stessa versione
                    // stale che abbiamo verificato. Se si aggiorna nel frattempo,
                    // la DELETE non lo tocca.
                    const {error:deleteError}=await supabaseClient
                        .from('fanta_app_data')
                        .delete()
                        .eq('key',lockKey)
                        .eq('updated_at',verify.updated_at);

                    if(deleteError){
                        console.warn('Pulizia lock banditore orfano non riuscita',deleteError);
                        return false;
                    }
                }
            }

            // 4) Riprova l'INSERT atomico. Se un altro banditore è arrivato prima,
            //    questo fallisce e rimaniamo bloccati.
            attempt=await insertAuctioneerLock(lockKey,token,room);
            if(!attempt.ok)return false;

            auctioneerLockKey=lockKey;
            auctioneerLockToken=token;
            auctioneerLockLostHandled=false;
            startAuctioneerLockHeartbeat();
            return true;
        }

        async function heartbeatAuctioneerRoomLock(){
            if(!auctioneerLockKey || !auctioneerLockToken) return;

            const key=auctioneerLockKey;
            const token=auctioneerLockToken;
            const row=await readAuctioneerLock(key);

            // Se non esiste più o appartiene a un altro token,
            // questo dispositivo ha realmente perso il lock.
            if(!row || String(row?.data?.token||'')!==String(token)){
                stopAuctioneerLockHeartbeat();

                if(!auctioneerLockLostHandled){
                    auctioneerLockLostHandled=true;
                    alert('Questa sessione non è più il banditore autorizzato della stanza. La plancia verrà chiusa.');
                    await forceAuctioneerExitAfterLockLoss();
                }
                return;
            }

            const now=new Date().toISOString();
            const nextData={
                ...(row.data||{}),
                token,
                heartbeat_at:now
            };

            // Aggiornamento condizionato alla stessa versione letta.
            // Se qualcun altro avesse cambiato la riga, non sovrascriviamo.
            const {data,error}=await supabaseClient
                .from('fanta_app_data')
                .update({
                    data:nextData,
                    updated_at:now
                })
                .eq('key',key)
                .eq('updated_at',row.updated_at)
                .select('key')
                .maybeSingle();

            if(error){
                console.warn('Heartbeat lock banditore non riuscito',error);
                return;
            }

            if(!data){
                // La riga è cambiata tra read e update: ricontrolla subito.
                const verify=await readAuctioneerLock(key);
                if(!verify || String(verify?.data?.token||'')!==String(token)){
                    stopAuctioneerLockHeartbeat();
                    if(!auctioneerLockLostHandled){
                        auctioneerLockLostHandled=true;
                        alert('Questa sessione non è più il banditore autorizzato della stanza. La plancia verrà chiusa.');
                        await forceAuctioneerExitAfterLockLoss();
                    }
                }
            }
        }

        function startAuctioneerLockHeartbeat(){
            stopAuctioneerLockHeartbeat();
            heartbeatAuctioneerRoomLock().catch(()=>{});
            auctioneerLockHeartbeatTimer=setInterval(
                ()=>heartbeatAuctioneerRoomLock().catch(()=>{}),
                AUCTIONEER_LOCK_HEARTBEAT_MS
            );
        }

        async function releaseAuctioneerRoomLock(){
            stopAuctioneerLockHeartbeat();

            const key=auctioneerLockKey;
            const token=auctioneerLockToken;

            auctioneerLockKey=null;
            auctioneerLockToken=null;

            if(!key || !token) return;

            try{
                const row=await readAuctioneerLock(key);

                // Non cancellare mai il lock di un altro banditore.
                if(row && String(row?.data?.token||'')===String(token)){
                    await supabaseClient
                        .from('fanta_app_data')
                        .delete()
                        .eq('key',key);
                }
            }catch(e){
                console.warn('Rilascio lock banditore non riuscito',e);
            }
        }

        async function forceAuctioneerExitAfterLockLoss(){
            stopAuctioneerLockHeartbeat();

            const oldChannel=channel;
            realtimeConnectionGeneration++;
            channel=null;

            if(oldChannel){
                try{await supabaseClient.removeChannel(oldChannel)}catch(e){}
            }

            if(timerInterval){
                clearInterval(timerInterval);
                timerInterval=null;
            }

            isAuctionActive=false;
            auctioneerLockKey=null;
            auctioneerLockToken=null;
            currentRoomCode='';
            currentRoomId='';
            currentRoom=null;

            showScreen('screen-role');
        }

        // --- LOGICA BANDITORE ---
        async function joinAsAuctioneer() {
            const err = document.getElementById('auction-room-error');
            err.innerText = '';
            if(auctioneerRoomMode!=='create' && auctioneerRoomMode!=='join'){
                err.innerText='Scegli prima se creare o entrare in una stanza.';
                return;
            }
            auctionTimeLimit = 5;
            let room;
            let auctioneerLockAcquired=false;
            try {
                if (auctioneerRoomMode === 'create') {
                    const name = document.getElementById('auction-new-room-name').value;
                    const password = document.getElementById('auction-new-room-password').value;
                    const gameMode=document.querySelector('input[name="auction-game-mode"]:checked')?.value||'classic';
                    const mantraMax=Math.max(23,Math.min(90,parseInt(document.getElementById('auction-mantra-max-roster')?.value)||30));

                    if(gameMode==='mantra' && !listoneHasMantraRoles()){
                        throw new Error('Il listone centrale non contiene la colonna RM / Ruolo Mantra. Carica prima un listone Fantacalcio con ruoli Mantra.');
                    }

                    room = await createRoom(name, password, {
                        game_mode:gameMode,
                        initial_credits: 500,
                        limit_p: 3,
                        limit_d: 8,
                        limit_c: 8,
                        limit_a: 6,
                        mantra_min_roster:23,
                        mantra_max_roster:mantraMax,
                        mantra_min_goalkeepers:2,
                        timer_seconds: 5
                    });
                    throw new Error('Stanza creata correttamente. Ora deve essere approvata dal superuser prima di poter essere utilizzata.');
                } else {
                    const password = document.getElementById('auction-room-password').value;

                    if(showRoomsToUsers){
                        const roomId = document.getElementById('auction-room-select').value;
                        if (!roomId) throw new Error('Seleziona una stanza esistente.');
                        room = await getRoomById(roomId);
                    }else{
                        const roomName = document.getElementById('auction-room-name-input').value;
                        if (!roomName.trim()) throw new Error('Digita il nome della stanza.');
                        room = await getRoomByExactName(roomName);
                    }

                    if (!room) throw new Error('Stanza non trovata.');
                    if (room.approved!==true) throw new Error('Questa stanza è in attesa di approvazione del superuser.');
                    if (room.password !== password) throw new Error('Password stanza errata.');
                }
                const lockOk=await acquireAuctioneerRoomLock(room);
                if(!lockOk){
                    if(typeof startAuctioneerOccupiedRetryCountdown==='function'){
                        await startAuctioneerOccupiedRetryCountdown(room);
                    }else{
                        err.innerText="Accesso bloccato: in questa stanza c'è già un banditore attivo. Riprova tra qualche secondo.";
                    }
                    return;
                }
                if(typeof stopAuctioneerOccupiedRetryCountdown==='function')stopAuctioneerOccupiedRetryCountdown(false);
                auctioneerLockAcquired=true;

                await connectToRoom(room);
            } catch(e) {
                if(auctioneerLockAcquired){
                    await releaseAuctioneerRoomLock();
                }
                err.innerText = e.message || 'Impossibile accedere alla stanza.';
                return;
            }
            document.querySelector('#auction-room-pill b').innerText = currentRoomCode;
            auctionTimeLimit = Math.max(1, parseInt(currentRoom?.timer_seconds || auctionTimeLimit) || 5);
            await loadAuctionedPlayers();
            await loadRoomState();
            await loadAbsentTeams();
            await loadAudioRoutingSettings();
            loadAuctioneerPlayerMode();

            // Anche il banditore+giocatore, quando entra/rientra nella stanza,
            // riparte ONLINE. L'ASSENTE vale solo per la sessione corrente.
            if(auctioneerPlayerMode && myTeamId){
                await resetMyAvailabilityOnlineOnEntry();
                await loadPlayerShortlist(true);
                await loadPlayerBudgetPlan(true);
                updatePlayerTeamStatus();
            }

            await loadNominationState();
            await loadAuctionPrepSeconds();
            await loadRoomAuctionExtraSettings();
            await loadReadyMode();
            await loadSealedTimerSeconds();
            await loadSealedRevealSeconds();
            roomControlReturnScreen = 'screen-auctioneer-board';
            const listView=document.getElementById('view-list');
            const auctionView=document.getElementById('view-auction');
            const nextBtn=document.getElementById('btn-next');

            if(nominationState.enabled){
                if(listView)listView.style.display='none';
                if(auctionView){
                    auctionView.classList.remove('auction-view-hidden');
                    auctionView.style.display='flex';
                }
            }else{
                hideNominationStage();
                if(listView)listView.style.display='flex';
                if(auctionView){
                    auctionView.classList.add('auction-view-hidden');
                    auctionView.style.display='none';
                }
            }
            if(nextBtn)nextBtn.style.display='none';

            showScreen('screen-auctioneer-board');
            refreshPlayerLists();
            subscribeCommonRoomEvents();

            const restoredLive=await restoreAuctioneerFromLiveState();
            if(!restoredLive && nominationState.enabled){
                nominationReady=true;
                showNominationWaitingBoard();
                setTimeout(()=>broadcastNominationState(true),350);
            }
        }


        async function handleNominationSubmission(data){
            const d=data||{};

            if(!nominationState.enabled || !nominationReady || isAuctionActive){
                nominationRequestPending=false;
                return false;
            }

            await loadRoomState();
            normalizeNominationState();

            const p=playersList.find(x=>String(x.Id)===String(d.player_id));
            const t=teamsCache.find(x=>String(x.id)===String(d.team_id));
            const l=roomLimits();
            const c=t?teamCounts(t.id):null;

            const invalidClassic=
                !isMantraRoom() &&
                p &&
                String(playerRole(p))!==String(nominationState.role);

            const invalidCapacity=
                isMantraRoom()
                    ?(!c || c.total>=mantraRosterMax())
                    :(!c || (c[nominationState.role]||0)>=(l[nominationState.role]||0));

            const invalid=
                String(d.team_id)!==String(nominationState.turn_team_id) ||
                !p ||
                invalidClassic ||
                invalidCapacity ||
                auctionedPlayerIds.has(String(p.Id));

            if(invalid){
                nominationRequestPending=false;
                broadcastNominationState(true);

                // Nel device ibrido riapri il listone: il turno è ancora suo.
                if(auctioneerPlayerMode && isMyNominationTurn()){
                    configureHybridPlayerIdentity();
                    showScreen('screen-player-buzzer');
                    updateNominationUI();
                }
                return false;
            }

            nominationRequestPending=false;
            nominationReady=false;
            broadcastNominationState(false);

            await selectAndStartPlayer(p.Id,true);
            return true;
        }

        function subscribeCommonRoomEvents() {
            if (!channel) return;
            channel
                .on('broadcast', { event: 'buzz' }, (payload) => {
                    const data = payload.payload;
                    if(data && data.team) handleBuzzReceived(data.team, data.amount, data.team_id, data.bid_id);
                })
                .on('broadcast', { event: 'exact_bid' }, (payload) => {
                    const data=payload.payload||{};
                    if(data && data.team) handleExactBidReceived(data.team,data.target,data.team_id,data.bid_id);
                })
                .on('broadcast',{event:'sealed_bid_submit'},(payload)=>{
                    receiveSealedBid(payload.payload||{});
                })
                .on('presence',{event:'sync'},()=>{
                    syncOnlinePlayersFromPresence();
                })
                .on('presence',{event:'join'},(payload)=>{
                    syncOnlinePlayersFromPresence();
                    handleReadyPresenceJoin(payload);
                })
                .on('presence',{event:'leave'},(payload)=>{
                    syncOnlinePlayersFromPresence();
                    cleanupFallbackOnlinePlayers();
                    handleReadyPresenceLeave(payload);
                })
                .on('broadcast',{event:'player_online_fallback'},(payload)=>{
                    const d=payload.payload||{};
                    touchFallbackOnlinePlayer(d);
                    if(readyGateWaiting && d.team_id){
                        readyMarkTeamOnline(d.team_id);
                    }
                })
                .on('broadcast',{event:'player_offline_now'},(payload)=>{
                    const id=String(payload.payload?.team_id||'');
                    if(!id)return;

                    // Uscita volontaria: rimuovi subito dal conteggio online.
                    onlinePlayers.delete(id);
                    renderOnlinePlayers();

                    if(readyGateWaiting){
                        readyMarkTeamOffline(id);
                    }
                })
                .on('broadcast',{event:'team_availability_request'},(payload)=>{
                    cleanupOnlinePlayersSilent();
                    const requestId=String(payload.payload?.request_id||'');
                    channel.send({
                        type:'broadcast',
                        event:'team_availability_state',
                        payload:{
                            request_id:requestId,
                            occupied_ids:[
                                ...new Set([
                                    ...onlinePlayers.keys(),
                                    ...(auctioneerPlayerMode&&auctioneerPlayerTeamId?[String(auctioneerPlayerTeamId)]:[])
                                ])
                            ].map(String)
                        }
                    }).catch(()=>{});
                })
                .on('broadcast',{event:'live_state_request'},async()=>{
                    if(readyGateWaiting){
                        persistReadyGateState();
                        await saveReadyGateDedicated(true);
                    }
                    const gate=await loadReadyGateState();
                    if(gate?.active){
                        channel.send({type:'broadcast',event:'ready_gate_state',payload:gate}).catch(()=>{});
                    }
                    if(liveAuctionState){
                        channel.send({type:'broadcast',event:'live_state',payload:liveStateForBroadcast()}).catch(()=>{});
                    }
                    broadcastNominationState(nominationReady);
                })
                .on('broadcast',{event:'player_ready'},(payload)=>{
                    const d=payload.payload||{};
                    if(!readyGateWaiting||String(d.token)!==String(readyGateToken))return;

                    const required=readyRequiredIds();
                    if(!required.includes(String(d.team_id)))return;

                    readyPlayers.add(String(d.team_id));
                    if(String(d.choice||'ready')==='skip')readySkipPlayers.add(String(d.team_id));
                    else readySkipPlayers.delete(String(d.team_id));
                    persistReadyGateState();
                    evaluateReadyGate();
                })
                .on('broadcast',{event:'player_availability'},async(payload)=>{
                    const d=payload.payload||{};
                    const id=String(d.team_id||'');
                    if(!id)return;

                    if(d.absent)absentTeamIds.add(id);
                    else absentTeamIds.delete(id);

                    renderOnlinePlayers();

                    // Se cambia stato durante un READY, ricalcola subito
                    // chi è realmente obbligato. L'ASSENTE non deve mai bloccare il READY,
                    // anche se la banditura a turni è attiva.
                    if(readyGateWaiting){
                        evaluateReadyGate();
                        await saveReadyGateDedicated(readyGateWaiting);
                    }
                })
                .on('broadcast',{event:'nominate_player'},async(payload)=>{
                    await handleNominationSubmission(payload.payload||{});
                })
                .on('broadcast', { event: 'auctioned_state' }, (payload) => applyAuctionedState(payload.payload?.ids))
                .on('broadcast', { event: 'auctioned_state_request' }, () => broadcastAuctionedState())
                .on('broadcast', { event: 'state_changed' }, async () => { await loadRoomState(); if(document.getElementById('screen-room-control')?.classList.contains('active')) renderRoomControl(); })
                .subscribe((status) => {
                    if(status==='SUBSCRIBED' && channel){
                        channel.send({type:'broadcast',event:'auctioned_state_request',payload:{}}).catch(()=>{});
                        channel.send({type:'broadcast',event:'online_status_request',payload:{at:Date.now()}}).catch(()=>{});
                        syncOnlinePlayersFromPresence();
                        startFallbackOnlineCleanup();
                    }
                });
        }


        function isAuctioneerMobileBoard(){
            const d=document.getElementById('auction-dashboard');
            return !!d?.classList.contains('mode-mobile');
        }
        function mobileBoardView(){
            return document.getElementById('view-auction');
        }
        function setMobileBoardPhase(name=''){
            const av=mobileBoardView();
            if(!av)return;
            [...av.classList].filter(c=>c.startsWith('mobile-')).forEach(c=>av.classList.remove(c));
            if(name)av.classList.add(`mobile-${name}`);
            updateMobileQuadLabels(name);
        }
        function updateMobileQuadLabels(name=''){
            if(!isAuctioneerMobileBoard())return;
            const left=document.getElementById('mobile-left-label');
            const right=document.getElementById('mobile-right-label');
            if(!left||!right)return;

            left.textContent='TIMER';
            right.textContent='OFFERTA';

            if(name==='preparing'){
                left.textContent='PREPARAZIONE';
                right.textContent='OFFERTA';
            }
        }
        function setMobileRoleBadge(role){
            const el=document.getElementById('auction-player-role');
            if(!el)return;
            ['P','D','C','A'].forEach(r=>el.classList.remove(`mobile-role-${r}`));
            const r=String(role||'').trim().toUpperCase();
            if(['P','D','C','A'].includes(r))el.classList.add(`mobile-role-${r}`);
        }
        function setMobileAuctionCard(player=currentAuctionPlayer){
            if(!player)return;
            document.getElementById('auction-player-name-top').textContent=player.Nome||'--';
            document.getElementById('auction-player-role').textContent=player.R||'-';
            if(typeof setMobileRoleBadge==='function')setMobileRoleBadge(player.R);
            document.getElementById('auction-player-club').textContent=player.Squadra||'-';
            setMobileRoleBadge(player.R);
            const img=document.getElementById('card-image');
            if(img){img.style.visibility='visible';setPlayerImage(img,player.Id,player.R);}
            requestAnimationFrame(()=>fitAuctionNames());
        }
        function showMobileReadyBoard(ready,total){
            if(!isAuctioneerMobileBoard() || !currentAuctionPlayer)return false;
            showAuctionPanels();
            setMobileBoardPhase('ready');
            setMobileAuctionCard();
            const av=mobileBoardView();
            const caption=av?.querySelector('.timer-caption');
            if(caption)caption.textContent='FVM';
            document.getElementById('countdown-display').textContent=String(playerListoneNumericValue(currentAuctionPlayer)||0);
            document.getElementById('auction-title-display').textContent='READY';
            document.getElementById('winner-display').textContent='';
            document.getElementById('current-value-display').textContent=`${ready}/${total}`;
            return true;
        }
        function showMobileTurnBoard(team){
            if(!isAuctioneerMobileBoard())return false;
            showAuctionPanels();
            setMobileBoardPhase('turn');
            const center=document.getElementById('auctioneer-turn-center');
            center?.setAttribute('aria-hidden','false');
            const teamEl=document.getElementById('auctioneer-turn-team');
            if(teamEl)teamEl.textContent=team?.name||'--';
            return true;
        }

        function showSealedAuctionStage(phase='offers'){
            const opening=phase==='opening';
            if(!sealedAuctionModeActive || !currentAuctionPlayer || (sealedEnding&&!opening))return;
            const remaining=Math.max(0,Math.ceil(((opening?sealedRevealDeadlineAt:sealedDeadlineAt)-Date.now())/1000));
            const eligible=[...new Set(sealedEligibleIds.map(String))];
            const submitted=new Set([...sealedBids.keys()].map(String));
            const delivered=eligible.filter(id=>submitted.has(id));
            showAuctionPanels();
            const av=document.getElementById('view-auction');
            av?.classList.add('sealed-collecting');
            av?.classList.toggle('sealed-opening',opening);
            if(isAuctioneerMobileBoard())setMobileBoardPhase(opening?'sealed-opening':'sealed-collecting');
            const caption=av?.querySelector('.timer-caption');if(caption)caption.textContent=opening?'APERTURA':'TEMPO RESIDUO';
            document.getElementById('winner-display').textContent='';
            document.getElementById('auction-player-name-top').textContent=currentAuctionPlayer.Nome||'--';
            document.getElementById('auction-player-role').textContent=currentAuctionPlayer.R||'-';
            document.getElementById('auction-player-club').textContent=currentAuctionPlayer.Squadra||'-';
            const img=document.getElementById('card-image');
            const imageKey=String(currentAuctionPlayer.Id)+':'+sealedAuctionToken;
            if(img && img.dataset.sealedPlayer!==imageKey){
                img.dataset.sealedPlayer=imageKey;setPlayerImage(img,currentAuctionPlayer.Id,currentAuctionPlayer.R);
            }
            document.getElementById('countdown-display').textContent=String(remaining);
            document.getElementById('sealed-delivery-count').textContent=`${delivered.length} / ${eligible.length}`;
            const sealedHead=document.querySelector('#sealed-delivery-panel h3');
            if(sealedHead)sealedHead.textContent=isAuctioneerMobileBoard()?'CONSEGNATE':'BUSTE CONSEGNATE';
            const list=document.getElementById('sealed-delivery-names');
            list.innerHTML=delivered.length?delivered.map(id=>`<div class="sealed-delivery-row"><span class="sealed-delivery-dot"></span><strong>${escapeHtml(teamsCache.find(t=>String(t.id)===id)?.name||'Squadra')}</strong><span>✓</span></div>`).join(''):'<p>In attesa delle buste…</p>';
        }

        async function startSealedAuctionTimer(){
            if(!sealedAuctionModeActive || !currentAuctionPlayer)return;
            sealedEnding=false;
            await closeReadyGateDedicated();

            sealedDeadlineAt=Date.now()+Math.max(5,parseInt(sealedTimerSeconds)||30)*1000;
            isAuctionActive=false;
            currentWinner='';
            currentAuctionValue=0;

            await saveLiveAuctionState({
                phase:'sealed',
                mode:'sealed',
                player:livePlayerSnapshot(),
                sealed_token:sealedAuctionToken,
                sealed_round:sealedRound,
                sealed_seconds:sealedTimerSeconds,
                sealed_deadline_at:sealedDeadlineAt,
                sealed_eligible_ids:sealedEligibleIds,
                sealed_submitted_ids:[...sealedBids.keys()],
                winner:'',value:0,seconds:sealedTimerSeconds,deadline_at:sealedDeadlineAt,
                ready_token:null,ready_required_ids:[],ready_ids:[]
            });

            playSound('audio-start');

            if(channel){
                const sealedStartPayload={
                    token:sealedAuctionToken,
                    player_id:String(currentAuctionPlayer.Id),
                    seconds:sealedTimerSeconds,
                    deadline_at:sealedDeadlineAt,
                    eligible_ids:sealedEligibleIds,
                    round:sealedRound
                };

                channel.send({
                    type:'broadcast',
                    event:'sealed_bid_start',
                    payload:sealedStartPayload
                }).catch(()=>{});

                // Secondo invio + live state: protegge i telefoni da un broadcast perso.
                setTimeout(()=>{
                    channel?.send({
                        type:'broadcast',
                        event:'sealed_bid_start',
                        payload:sealedStartPayload
                    }).catch(()=>{});
                    if(liveAuctionState){
                        channel?.send({type:'broadcast',event:'live_state',payload:liveStateForBroadcast()}).catch(()=>{});
                    }
                },350);
            }

            showSealedAuctionStage();

            // il banditore+giocatore usa lo stesso dispositivo del banditore,
            // quindi non riceve necessariamente il proprio broadcast sealed_bid_start.
            // Avviamo direttamente anche la sua interfaccia giocatore.
            if(isAuctioneerPlayerIdentity()){
                showScreen('screen-player-buzzer');
                hybridStartSealedRound();
            }

            if(sealedTimerInterval)clearInterval(sealedTimerInterval);
            sealedTimerInterval=setInterval(()=>{
                showSealedAuctionStage();
                if(Date.now()>=sealedDeadlineAt){
                    clearInterval(sealedTimerInterval);
                    sealedTimerInterval=null;
                    endSealedAuction();
                }
            },250);
        }

        async function receiveSealedBid(data){
            if(!sealedAuctionModeActive || !sealedAuctionToken || !currentAuctionPlayer)return;
            if(String(data?.token||'')!==String(sealedAuctionToken))return;

            // Il banditore è l'autorità temporale: dopo la sua scadenza
            // nessuna offerta tardiva viene accettata.
            if(sealedDeadlineAt && Date.now()>sealedDeadlineAt+250)return;
            const teamId=String(data?.team_id||'');
            if(!sealedEligibleIds.includes(teamId))return;
            if(sealedBids.has(teamId))return;

            const team=teamsCache.find(t=>String(t.id)===teamId);
            if(!team)return;

            const amount=Math.max(1,parseInt(data?.amount)||0);
            const max=maxBidForTeam(team,currentAuctionPlayer.R);
            if(amount<1 || amount>max){
                const reason=`Offerta non valida. Massimo ${max}.`;

                if(isAuctioneerPlayerIdentity() && String(teamId)===String(myTeamId)){
                    playerSealedSubmitted=false;
                    preparePlayerSealedControls(true);
                    const st=document.getElementById('sealed-bid-status');
                    if(st){
                        st.textContent=reason;
                        st.className='sealed-bid-status error';
                    }
                }else{
                    channel?.send({
                        type:'broadcast',event:'sealed_bid_rejected',
                        payload:{token:sealedAuctionToken,team_id:teamId,reason}
                    }).catch(()=>{});
                }
                return;
            }

            sealedBids.set(teamId,{
                team_id:teamId,
                team_name:team.name,
                amount,
                at:Date.now()
            });

            if(isAuctioneerPlayerIdentity() && String(teamId)===String(myTeamId)){
                playerSealedSubmitted=true;
                preparePlayerSealedControls(true);
                const st=document.getElementById('sealed-bid-status');
                if(st){
                    st.textContent='Offerta registrata. Non può più essere modificata.';
                    st.className='sealed-bid-status sent';
                }
            }

            persistSealedBids();
            showSealedAuctionStage();

            channel?.send({
                type:'broadcast',event:'sealed_bid_count',
                payload:{
                    token:sealedAuctionToken,
                    count:sealedBids.size,
                    total:sealedEligibleIds.length,
                    submitted_ids:[...sealedBids.keys()]
                }
            }).catch(()=>{});

            // Se tutti gli aventi diritto hanno offerto, non aspettiamo la scadenza.
            if(sealedEligibleIds.length>0 && sealedBids.size>=sealedEligibleIds.length){
                if(sealedTimerInterval){clearInterval(sealedTimerInterval);sealedTimerInterval=null;}
                endSealedAuction();
            }
        }


        function normalizeSealedRanking(bids){
            return (Array.isArray(bids)?bids:[])
                .map((b,index)=>({
                    team_id:String(b?.team_id||''),
                    team_name:String(b?.team_name||'Squadra'),
                    amount:Math.max(0,parseInt(b?.amount)||0),
                    at:Number(b?.at)||0,
                    original_index:index
                }))
                .filter(b=>b.amount>0)
                .sort((a,b)=>b.amount-a.amount || a.at-b.at || a.original_index-b.original_index);
        }

        function sealedRankingMarkup(ranking,title='CLASSIFICA OFFERTE'){
            const rows=normalizeSealedRanking(ranking);
            if(!rows.length)return '';

            return `
                <div class="sealed-ranking-title">${escapeHtml(title)}</div>
                <div class="sealed-ranking-list">
                    ${rows.map((bid,i)=>`
                        <div class="sealed-ranking-row ${i===0?'winner':''}">
                            <span class="sealed-ranking-pos">${i+1}</span>
                            <span class="sealed-ranking-team">${escapeHtml(bid.team_name)}</span>
                            <strong class="sealed-ranking-value">${bid.amount}</strong>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        function renderAuctioneerBidRanking(ranking,title='CLASSIFICA OFFERTE'){
            const rows=normalizeSealedRanking(ranking);
            const pc=document.getElementById('sealed-ranking-auctioneer');
            if(pc){
                pc.innerHTML=sealedRankingMarkup(rows,title);
                pc.style.display=rows.length?'block':'none';
            }
        }

        function renderSealedBidRanking(ranking){
            renderAuctioneerBidRanking(ranking,'CLASSIFICA OFFERTE');
        }

        function clearSealedBidRanking(){
            renderAuctioneerBidRanking([]);
        }

        function normalBidRanking(){
            return normalizeSealedRanking([...normalBidMaxima.values()]);
        }

        function recordNormalBid(team,amount){
            if(!team)return;
            const key=String(team.id);
            const value=Math.max(0,parseInt(amount)||0);
            const prev=normalBidMaxima.get(key);
            if(!prev || value>prev.amount){
                normalBidMaxima.set(key,{
                    team_id:key,
                    team_name:String(team.name||'Squadra'),
                    amount:value,
                    at:Date.now()
                });
            }
        }


        async function restartSealedTieBreak(tiedBids,previousToken){
            const tied=normalizeSealedRanking(tiedBids);
            if(tied.length<2)return;

            // NESSUNA assegnazione: nuova busta soltanto per i pari merito.
            await clearPersistedSealedBids(previousToken);

            sealedRound=Math.max(1,sealedRound)+1;
            sealedAuctionToken=`sealed_${currentRoomId}_${currentAuctionPlayer.Id}_r${sealedRound}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
            sealedEligibleIds=tied.map(b=>String(b.team_id));
            sealedBids=new Map();
            sealedEnding=false;
            sealedDeadlineAt=0;
            sealedRevealDeadlineAt=0;
            currentWinner='';
            currentAuctionValue=0;

            clearSealedBidRanking();

            document.getElementById('auction-title-display').textContent='PARITÀ';
            document.getElementById('winner-display').textContent='NUOVA BUSTA';
            document.getElementById('winner-display').style.color='var(--accent-blue)';
            document.getElementById('current-value-display').textContent='--';
            document.getElementById('countdown-display').textContent='--';

            // prima del round 2 (e di ogni eventuale round successivo)
            // si rifà il READY. Grazie a readyRequiredTeams() lo ricevono
            // soltanto le squadre rimaste in parità.
            if(readyModeEnabled){
                beginReadyGate();
                await saveReadyGateDedicated(true);

                const required=readyRequiredIds();
                const readyPayload={
                    ready_token:readyGateToken,
                    ready_required_ids:required,
                    ready_ids:[],
                    nome:currentAuctionPlayer.Nome,
                    role:currentAuctionPlayer.R,
                    club:currentAuctionPlayer.Squadra
                };

                if(channel){
                    channel.send({
                        type:'broadcast',
                        event:'new_player',
                        payload:{
                            url:playerImageUrl(currentAuctionPlayer.Id,currentAuctionPlayer.R),
                            nome:currentAuctionPlayer.Nome,
                            player_id:currentAuctionPlayer.Id,
                            role:currentAuctionPlayer.R,
                            club:currentAuctionPlayer.Squadra,
                            fvm:playerListoneNumericValue(currentAuctionPlayer),
                            prep_seconds:0,
                            ready_required:true,
                            ready_token:readyGateToken,
                            ready_required_ids:required,
                            ready_ids:[...readyPlayers],
                            skip_ids:[...readySkipPlayers],
                            mode:'sealed',
                            sealed_token:sealedAuctionToken,
                            sealed_round:sealedRound,
                            sealed_seconds:sealedTimerSeconds,
                            sealed_eligible_ids:sealedEligibleIds
                        }
                    }).catch(()=>{});

                    channel.send({
                        type:'broadcast',
                        event:'ready_state',
                        payload:{
                            token:readyGateToken,
                            ready_count:0,
                            total:required.length,
                            waiting:true,
                            required_ids:required,
                            ready_ids:[]
                        }
                    }).catch(()=>{});
                }

                if(auctioneerPlayerMode){
                    showHybridPlayerForCurrentAuction();
                    showHybridReadyIfNeeded();
                }

                showAuctioneerReadyStage();
                updateReadyGateDisplay();
                evaluateReadyGate();
                return;
            }

            await startSealedAuctionTimer();
        }

        async function finalizeSealedAuctionResult(){
            // v0.93 reveal hard guard
            if(sealedBids.size>0){
                const __deadline=Number(sealedRevealDeadlineAt)||0;
                if(__deadline<=0){
                    const __seconds=Math.max(1,parseInt(sealedRevealSeconds)||5);
                    sealedRevealDeadlineAt=Date.now()+__seconds*1000;
                    showSealedAuctionStage('opening');
                    if(sealedRevealInterval){clearInterval(sealedRevealInterval);clearTimeout(sealedRevealInterval);}
                    sealedRevealInterval=setTimeout(()=>{sealedRevealInterval=null;finalizeSealedAuctionResult();},__seconds*1000+60);
                    return;
                }
                const __left=__deadline-Date.now();
                if(__left>25){
                    if(sealedRevealInterval){clearInterval(sealedRevealInterval);clearTimeout(sealedRevealInterval);}
                    sealedRevealInterval=setTimeout(()=>{sealedRevealInterval=null;finalizeSealedAuctionResult();},__left+60);
                    return;
                }
            }

            if(!currentAuctionPlayer)return;

            // L'esito non può essere calcolato/mostrato prima della fine del secondo countdown.
            // Questo evita anticipi dovuti a timer concorrenti, restore dello stato o broadcast.
            const remainingRevealMs=(Number(sealedRevealDeadlineAt)||0)-Date.now();
            if(remainingRevealMs>25){
                if(sealedRevealInterval){clearInterval(sealedRevealInterval);sealedRevealInterval=null;}
                sealedRevealInterval=setTimeout(()=>{sealedRevealInterval=null;finalizeSealedAuctionResult();},remainingRevealMs+40);
                return;
            }

            showAuctionPanels();
            const token=sealedAuctionToken;
            const bids=normalizeSealedRanking(
                [...sealedBids.values()]
                    .filter(x=>sealedEligibleIds.includes(String(x.team_id)))
            );
            const winner=bids.length?bids[0]:null;

            // Se il massimo è pari, il giocatore NON viene assegnato.
            // Rifacciamo la busta solo tra i pari; può ripetersi più volte.
            if(winner){
                const topAmount=parseInt(winner.amount)||0;
                const tiedTop=bids.filter(b=>(parseInt(b.amount)||0)===topAmount);
                if(tiedTop.length>1){
                    await restartSealedTieBreak(tiedTop,token);
                    return;
                }
            }

            let assignmentOk=true;

            if(winner){
                const team=teamsCache.find(t=>String(t.id)===String(winner.team_id));
                const {error}=await supabaseClient.rpc('fanta_assign_player',{
                    p_room_id:currentRoomId,
                    p_team_id:team?.id,
                    p_player_id:String(currentAuctionPlayer.Id),
                    p_player_name:String(currentAuctionPlayer.Nome||''),
                    p_role:String(currentAuctionPlayer.R||''),
                    p_club:String(currentAuctionPlayer.Squadra||''),
                    p_price:parseInt(winner.amount)||1
                });
                if(error){
                    assignmentOk=false;
                    currentWinner='';
                    currentAuctionValue=0;
                    document.getElementById('auction-title-display').textContent='ASSEGNAZIONE BLOCCATA';
                    document.getElementById('winner-display').textContent='ERRORE';
                    document.getElementById('current-value-display').textContent='--';
                    alert(error.message||'Impossibile assegnare il giocatore.');
                }else{
                    auctionedPlayerIds.add(String(currentAuctionPlayer.Id));
                    await saveAuctionedPlayers();
                    currentWinner=team?.name||winner.team_name;
                    currentAuctionValue=parseInt(winner.amount)||1;
                    await loadRoomState();
                    broadcastAuctionedState();
                    broadcastStateChanged();
                }
            }else{
                currentWinner='';
                currentAuctionValue=0;
                await markCurrentPlayerAuctioned();
            }

            if(assignmentOk){
                playSound('audio-end');
                document.getElementById('auction-title-display').textContent=winner?'AGGIUDICATO A':'ESITO BUSTA';
                document.getElementById('winner-display').textContent=winner?(currentWinner||winner.team_name):'INVENDUTO';
                document.getElementById('winner-display').style.color=winner?'var(--accent-blue)':'var(--text-muted)';
                document.getElementById('current-value-display').textContent=winner?String(currentAuctionValue):'0';
                document.getElementById('countdown-display').textContent='0';

                // dopo l'apertura buste mostra tutte le offerte ordinate.
                renderSealedBidRanking(bids);
                if(isAuctioneerMobileBoard()){
                    setMobileBoardPhase(winner?'sealed-result':'unsold');
                    mobileBoardView()?.classList.add('mobile-ended');
                    if(!winner){
                        document.getElementById('winner-display').textContent='INVENDUTO';
                    }
                }

                await saveLiveAuctionState({
                    phase:'ended',mode:'sealed_result',player:livePlayerSnapshot(),winner:currentWinner||'',value:currentAuctionValue||0,
                    sealed_ranking:bids.map(b=>({team_id:b.team_id,team_name:b.team_name,amount:b.amount,at:b.at})),
                    seconds:0,deadline_at:null,ready_token:null,ready_required_ids:[],ready_ids:[]
                });

                channel?.send({
                    type:'broadcast',event:'sealed_bid_end',
                    payload:{
                        token,
                        winner:currentWinner||'',
                        value:currentAuctionValue||0,
                        player_id:String(currentAuctionPlayer.Id),
                        no_bids:!winner,
                        ranking:bids.map(b=>({team_id:b.team_id,team_name:b.team_name,amount:b.amount,at:b.at}))
                    }
                }).catch(()=>{});
                hybridRenderSealedEnd(currentWinner||'',currentAuctionValue||0,!winner);
            }

            await clearPersistedSealedBids(token);

            // La modalità busta è MONOUSO: da qui la prossima banditura è sempre normale.
            sealedAuctionModeActive=false;
            sealedEnding=false;
            sealedAuctionToken=null;
            sealedRound=1;
            sealedBids=new Map();
            sealedEligibleIds=[];
            sealedDeadlineAt=0;
            sealedRevealDeadlineAt=0;
            sealedListonePickMode=false;
            updateSealedModeButton();

            const nextButton=document.getElementById('btn-next');
            if(assignmentOk){
                if(nominationState.enabled){
                    await advanceNominationTurn();
                    nominationReady=true;
                    await saveNominationState(true);
                    await saveLiveAuctionState({phase:'idle',mode:'normal',player:null,winner:'',value:0,seconds:0,deadline_at:null,ready_token:null,ready_required_ids:[],ready_ids:[]});
                    showNominationWaitingBoard();
                }else if(nextButton){
                    nextButton.style.display='flex';
                }
            }
        }

        async function endSealedAuction(){
            if(!sealedAuctionModeActive || sealedEnding)return;
            sealedEnding=true;
            if(sealedTimerInterval){clearInterval(sealedTimerInterval);sealedTimerInterval=null;}

            // v0.93: nessuna busta = nessun countdown di apertura, esito invenduto immediato.
            if(sealedBids.size===0){
                sealedRevealDeadlineAt=0;
                await finalizeSealedAuctionResult();
                return;
            }

            // Il primo timer è finito: NON mostriamo ancora né vincitore né importo.
            clearSealedBidRanking();
            hideNominationStage();
            showAuctionPanels();
            document.getElementById('auction-title-display').textContent='APERTURA BUSTE';
            document.getElementById('winner-display').textContent='ATTENDI';
            document.getElementById('winner-display').style.color='var(--text-muted)';
            document.getElementById('current-value-display').textContent='?';
            const nextButton=document.getElementById('btn-next');
            if(nextButton)nextButton.style.display='none';

            let reveal=Math.max(1,parseInt(sealedRevealSeconds)||5);
            const revealDeadline=Date.now()+reveal*1000;
            sealedRevealDeadlineAt=revealDeadline;
            showSealedAuctionStage('opening');
            const timerEl=document.getElementById('countdown-display');
            timerEl.textContent=String(reveal);
            timerEl.style.color='var(--accent-blue)';

            // Lo stato condiviso non contiene il risultato finché il countdown non è terminato.
            await saveLiveAuctionState({
                phase:'sealed_reveal',mode:'sealed',player:livePlayerSnapshot(),winner:'',value:0,
                sealed_token:sealedAuctionToken,sealed_round:sealedRound,sealed_seconds:sealedRevealSeconds,sealed_eligible_ids:sealedEligibleIds,
                sealed_submitted_ids:[...sealedBids.keys()],seconds:reveal,deadline_at:revealDeadline
            });

            channel?.send({
                type:'broadcast',event:'sealed_reveal_start',
                payload:{token:sealedAuctionToken,round:sealedRound,seconds:reveal,deadline_at:revealDeadline,player_id:String(currentAuctionPlayer.Id)}
            }).catch(()=>{});
            hybridStartSealedReveal(reveal);

            if(sealedRevealInterval)clearInterval(sealedRevealInterval);
            let lastRevealSoundSecond=null;
            const tick=()=>{
                reveal=Math.max(0,Math.ceil((revealDeadline-Date.now())/1000));
                timerEl.textContent=String(reveal);

                // Banditore normale: stesso beep della preparazione.
                // Se è banditore+giocatore il suono viene già riprodotto
                // dal countdown della schermata giocatore, quindi niente doppio audio.
                if(!isAuctioneerPlayerIdentity() && reveal>0 && reveal!==lastRevealSoundSecond){
                    lastRevealSoundSecond=reveal;
                    playSound('audio-prep');
                }

                if(reveal<=0){
                    if(sealedRevealInterval){clearInterval(sealedRevealInterval);sealedRevealInterval=null;}
                    finalizeSealedAuctionResult();
                }
            };
            tick();
            sealedRevealInterval=setInterval(tick,250);
        }

        function startCountdown() {
            clearSealedBidRanking();
            showAuctionPanels();
            // Se siamo arrivati qui, il READY è concluso.
            closeReadyGateDedicated();
            document.getElementById('auction-title-display').innerText = isAuctioneerMobileBoard() ? "" : "IN ATTESA";
            document.getElementById('winner-display').innerText = isAuctioneerMobileBoard() ? "Nessuna offerta" : "--";
            if(isAuctioneerMobileBoard())setMobileBoardPhase('preparing');
            document.getElementById('winner-display').style.color = "var(--text-muted)";
            const prepCountdownEl=document.getElementById('countdown-display');
            prepCountdownEl.style.color = "#FFFFFF";
            prepCountdownEl.classList.remove('danger','liveasta-last3');
            prepCountdownEl.classList.add('prep-countdown');

            currentWinner = "";
            currentAuctionValue = 0;
            const currentValueDisplay=document.getElementById('current-value-display');
            currentValueDisplay.classList.remove('ready-label');
            currentValueDisplay.innerText = currentAuctionValue;

            isAuctionActive = false;

            let prepTime = Math.max(1, parseInt(auctionPrepSeconds) || 5);
            document.getElementById('countdown-display').innerText = prepTime;
            const prepDeadline=Date.now()+prepTime*1000;
            saveLiveAuctionState({
                phase:'prep',player:livePlayerSnapshot(),winner:'',value:0,
                seconds:prepTime,deadline_at:prepDeadline,
                ready_token:null,ready_required_ids:[],ready_ids:[],
                skip_ids:[]
            });
            playSound('audio-prep');
            if(channel) channel.send({type:'broadcast',event:'prep_started',payload:{seconds:prepTime,player_id:currentAuctionPlayer?.Id}}).catch(()=>{});
            hybridStartNormalPrep(prepTime);

            if(auctionPrepInterval){
                clearInterval(auctionPrepInterval);
                auctionPrepInterval=null;
            }

            auctionPrepInterval = setInterval(() => {
                prepTime--;
                if (prepTime > 0) {
                    document.getElementById('countdown-display').innerText = prepTime;
                    if(channel) channel.send({type:'broadcast',event:'prep_tick',payload:{seconds:prepTime,player_id:currentAuctionPlayer?.Id}}).catch(()=>{});
                    playSound('audio-prep');
                } else {
                    clearInterval(auctionPrepInterval);
                    auctionPrepInterval=null;
                    startAuction();
                }
            }, 1000);
        }

        function startAuction() {
            clearSealedBidRanking();
            if(isAuctioneerMobileBoard()){
                setMobileBoardPhase('normal');
                document.getElementById('auction-title-display').textContent='';
                if(!currentWinner)document.getElementById('winner-display').textContent='';
            }

            if(auctionPrepInterval){
                clearInterval(auctionPrepInterval);
                auctionPrepInterval=null;
            }
            if(timerInterval){
                clearInterval(timerInterval);
                timerInterval=null;
            }

            normalBidMaxima=new Map();
            recentNormalBidIds=new Map();
            normalBidCooldownUntil=0;
            clearPlayerNormalBidCooldown();

            // opzionale offerta iniziale di 1 credito della squadra che ha bandito.
            // Non apre il cooldown: è il valore di partenza dell'asta, non un tap concorrente.
            const autoBidTeam=nominationAutoBidTeam();
            if(autoBidTeam){
                currentWinner=String(autoBidTeam.name||'');
                currentAuctionValue=1;
                recordNormalBid(autoBidTeam,1);
            }else{
                currentWinner='';
                currentAuctionValue=0;
            }
            const initialBidRanking=normalBidRanking();

            showAuctionPanels();
            isAuctionActive = true;
            currentTimer = normalAuctionConfiguredSeconds();
            saveLiveAuctionState({
                phase:'active',
                player:livePlayerSnapshot(),
                winner:currentWinner||'',
                value:currentAuctionValue||0,
                normal_bid_ranking:initialBidRanking,
                seconds:currentTimer,
                deadline_at:Date.now()+currentTimer*1000,
                ready_token:null,ready_required_ids:[],ready_ids:[],
                skip_ids:[]
            });

            document.getElementById('auction-title-display').innerText = "MIGLIOR OFFERENTE";
            const winnerDisplay=document.getElementById('winner-display');
            winnerDisplay.innerText=currentWinner||"NESSUNO";
            winnerDisplay.style.color=currentWinner?"var(--accent-blue)":"var(--text-muted)";
            const startValueDisplay=document.getElementById('current-value-display');
            startValueDisplay.classList.remove('ready-label');
            startValueDisplay.innerText=String(currentAuctionValue||0);
            const activeCountdownEl=document.getElementById('countdown-display');
            activeCountdownEl.classList.remove('prep-countdown','danger','liveasta-last3');
            activeCountdownEl.innerText = currentTimer;
            activeCountdownEl.style.color = "var(--accent-green)";

            playSound('audio-start');
            if(channel) channel.send({type:'broadcast',event:'auction_started',payload:{
                player_id:currentAuctionPlayer?.Id,
                seconds:currentTimer,
                winner:currentWinner||'',
                value:currentAuctionValue||0,
                self_raise_enabled:!!selfRaiseEnabled
            }}).catch(()=>{});
            hybridStartNormalAuction(currentTimer);
            if(currentTimer>0 && currentTimer<=3)playAuctionFinalCountdown(currentTimer);

            timerInterval = setInterval(() => {
                currentTimer--;
                const display=document.getElementById('countdown-display');
                display.innerText=currentTimer;
                if(channel) channel.send({type:'broadcast',event:'timer_tick',payload:{seconds:currentTimer}}).catch(()=>{});
                hybridNormalTick(currentTimer);

                if(currentTimer>0 && currentTimer<=3){
                    playAuctionFinalCountdown(currentTimer);
                    display.style.color="var(--accent-red)";
                    display.classList.add('liveasta-last3');
                }else{
                    display.classList.remove('liveasta-last3');
                }

                if(currentTimer<=0){
                    endAuction();
                }
            }, 1000);
        }

        function handleBuzzReceived(teamName, amount, teamId = null, bidId = null) {
            if (!isAuctionActive || !currentAuctionPlayer) return;

            const receivedAt=Date.now();

            // Protezione aggiuntiva contro una eventuale consegna duplicata
            // dello STESSO tap da rete/browser.
            if(bidId){
                const id=String(bidId);
                if(recentNormalBidIds.has(id))return;
                recentNormalBidIds.set(id,receivedAt);

                for(const [oldId,ts] of recentNormalBidIds.entries()){
                    if(receivedAt-ts>10000)recentNormalBidIds.delete(oldId);
                }
            }

            // Il primo rilancio valido vince la finestra; le offerte arrivate durante
            // il blocco configurato vengono ignorate senza cambiare graficamente i pulsanti.
            if(receivedAt<normalBidCooldownUntil)return;

            const team = teamId ? teamsCache.find(t => String(t.id) === String(teamId)) : findTeamByName(teamName);
            if (!team) return;
            if(isSelfRaiseBlockedForTeam(team)){
                if(channel)channel.send({type:'broadcast',event:'bid_rejected',payload:{team_id:team.id,reason:'AUTORILANCIO DISATTIVATO'}}).catch(()=>{});
                return;
            }
            const raise = Math.max(1, parseInt(amount) || 1);
            const proposed = currentAuctionValue + raise;
            const maxBid = maxBidForTeam(team, currentAuctionPlayer.R);
            if (proposed > maxBid) {
                const counts=teamCounts(team.id), limits=roomLimits();
                const roleKey=String(currentAuctionPlayer.R||'').toUpperCase();
                const reason = isMantraRoom()
                    ? (counts.total>=mantraRosterMax()
                        ? 'ROSA MANTRA COMPLETA'
                        : (maxBid<=0?'VINCOLI ROSA MANTRA / PORTIERI':'MAX OFFERTA '+maxBid))
                    : (counts[roleKey] >= limits[roleKey]
                        ? `REPARTO ${roleKey} COMPLETO`
                        : `MAX OFFERTA ${maxBid}`);
                if(channel) channel.send({type:'broadcast',event:'bid_rejected',payload:{team_id:team.id,reason,max_bid:maxBid}}).catch(()=>{});
                return;
            }

            // Solo una OFFERTA VALIDA apre il blocco globale per l’intervallo configurato.
            normalBidCooldownUntil=Date.now()+normalBidCooldownMs;

            currentWinner = team.name;
            currentAuctionValue = proposed;
            currentTimer = normalAuctionConfiguredSeconds();

            // Registra il massimo valore effettivamente offerto da questa squadra.
            recordNormalBid(team,currentAuctionValue);
            const currentBidRanking=normalBidRanking();

            saveLiveAuctionState({
                phase:'active',
                player:livePlayerSnapshot(),
                winner:currentWinner,
                value:currentAuctionValue,
                self_raise_enabled:!!selfRaiseEnabled,
                normal_bid_ranking:currentBidRanking,
                seconds:currentTimer,
                deadline_at:Date.now()+currentTimer*1000
            });
            document.getElementById('winner-display').innerText = currentWinner;
            document.getElementById('winner-display').style.color = "var(--accent-blue)";
            const liveValueDisplay=document.getElementById('current-value-display');
            liveValueDisplay.classList.remove('ready-label');
            liveValueDisplay.innerText = currentAuctionValue;
            document.getElementById('countdown-display').innerText = currentTimer;
            document.getElementById('countdown-display').style.color = "var(--accent-green)";
            if(channel) channel.send({type:'broadcast',event:'timer_tick',payload:{seconds:currentTimer}}).catch(()=>{});
            playSound('audio-buzz');
            speakBidValue(currentAuctionValue);
            if(channel) channel.send({
                type:'broadcast',
                event:'auction_update',
                payload:{
                    winner:currentWinner,
                    value:currentAuctionValue,
                    cooldown_ms:normalBidCooldownMs,
                    self_raise_enabled:!!selfRaiseEnabled
                }
            }).catch(()=>{});

            if(isAuctioneerPlayerIdentity()){
                applyPlayerNormalBidCooldownMs(normalBidCooldownMs);
            }
            hybridNormalBidUpdate();
        }


        function handleExactBidReceived(teamName,targetValue,teamId=null,bidId=null){
            if(!isAuctionActive || !currentAuctionPlayer)return;

            const receivedAt=Date.now();
            if(bidId){
                const id=String(bidId);
                if(recentNormalBidIds.has(id))return;
                recentNormalBidIds.set(id,receivedAt);
                for(const [oldId,ts] of recentNormalBidIds.entries()){
                    if(receivedAt-ts>10000)recentNormalBidIds.delete(oldId);
                }
            }

            if(receivedAt<normalBidCooldownUntil)return;

            const team=teamId
                ? teamsCache.find(t=>String(t.id)===String(teamId))
                : findTeamByName(teamName);
            if(!team)return;
            if(isSelfRaiseBlockedForTeam(team)){
                if(channel)channel.send({type:'broadcast',event:'bid_rejected',payload:{team_id:team.id,reason:'AUTORILANCIO DISATTIVATO'}}).catch(()=>{});
                return;
            }

            const proposed=Math.max(1,parseInt(targetValue)||0);
            const maxBid=maxBidForTeam(team,currentAuctionPlayer.R);

            // Il target è assoluto. Se nel frattempo qualcun altro ha superato
            // la cifra scelta, non la trasformiamo in un incremento: la rifiutiamo.
            if(proposed<=currentAuctionValue){
                if(channel)channel.send({
                    type:'broadcast',event:'bid_rejected',
                    payload:{team_id:team.id,reason:`OFFERTA SUPERATA · MIN ${currentAuctionValue+1}`,max_bid:maxBid}
                }).catch(()=>{});
                return;
            }

            if(proposed>maxBid){
                const counts=teamCounts(team.id),limits=roomLimits();
                const roleKey=String(currentAuctionPlayer.R||'').toUpperCase();
                const reason=isMantraRoom()
                    ? (counts.total>=mantraRosterMax()
                        ? 'ROSA MANTRA COMPLETA'
                        : (maxBid<=0?'VINCOLI ROSA MANTRA / PORTIERI':'MAX OFFERTA '+maxBid))
                    : (counts[roleKey]>=(limits[roleKey]||0)
                        ? `REPARTO ${roleKey} COMPLETO`
                        : `MAX OFFERTA ${maxBid}`);
                if(channel)channel.send({
                    type:'broadcast',event:'bid_rejected',
                    payload:{team_id:team.id,reason,max_bid:maxBid}
                }).catch(()=>{});
                return;
            }

            normalBidCooldownUntil=Date.now()+normalBidCooldownMs;
            currentWinner=team.name;
            currentAuctionValue=proposed;
            currentTimer=normalAuctionConfiguredSeconds();

            recordNormalBid(team,currentAuctionValue);
            const currentBidRanking=normalBidRanking();

            saveLiveAuctionState({
                phase:'active',
                player:livePlayerSnapshot(),
                winner:currentWinner,
                value:currentAuctionValue,
                self_raise_enabled:!!selfRaiseEnabled,
                normal_bid_ranking:currentBidRanking,
                seconds:currentTimer,
                deadline_at:Date.now()+currentTimer*1000
            });

            document.getElementById('winner-display').innerText=currentWinner;
            document.getElementById('winner-display').style.color='var(--accent-blue)';
            const liveValueDisplay=document.getElementById('current-value-display');
            liveValueDisplay.classList.remove('ready-label');
            liveValueDisplay.innerText=currentAuctionValue;
            document.getElementById('countdown-display').innerText=currentTimer;
            document.getElementById('countdown-display').style.color='var(--accent-green)';

            if(channel)channel.send({type:'broadcast',event:'timer_tick',payload:{seconds:currentTimer}}).catch(()=>{});
            playSound('audio-buzz');
            speakBidValue(currentAuctionValue);
            if(channel)channel.send({
                type:'broadcast',event:'auction_update',
                payload:{winner:currentWinner,value:currentAuctionValue,cooldown_ms:normalBidCooldownMs,self_raise_enabled:!!selfRaiseEnabled}
            }).catch(()=>{});

            if(isAuctioneerPlayerIdentity()){
                applyPlayerNormalBidCooldownMs(normalBidCooldownMs);
                updatePlayerTeamStatus();
            }
            hybridNormalBidUpdate();
        }

        async function endAuction(forceUnsold=false) {
            clearInterval(timerInterval);
            timerInterval=null;
            if(forceUnsold && auctionPrepInterval){clearInterval(auctionPrepInterval);auctionPrepInterval=null;}
            normalBidCooldownUntil=0;
            clearPlayerNormalBidCooldown();

            if(forceUnsold){
                currentWinner='';
                currentAuctionValue=0;
                currentTimer=0;
                normalBidMaxima=new Map();
                recentNormalBidIds=new Map();
                const valueEl=document.getElementById('current-value-display');
                if(valueEl){valueEl.classList.remove('ready-label');valueEl.innerText='0';}
            }

            const finalBidRanking=forceUnsold?[]:normalBidRanking();
            readyGateWaiting=false;
            readyGateToken=null;
            readyPlayers=new Set();
            readySkipPlayers=new Set();
            readyOfflineExcludedIds=new Set();
            isAuctionActive = false;
            let titleEl = document.getElementById('auction-title-display');
            let winnerEl = document.getElementById('winner-display');
            let timerEl = document.getElementById('countdown-display');
            let assignmentOk = true;
            if (forceUnsold || currentWinner === "") {
                if(forceUnsold){currentWinner='';currentAuctionValue=0;}
                titleEl.innerText = "ESITO ASTA";
                winnerEl.innerText = "INVENDUTO";
                winnerEl.style.color = "var(--text-muted)";
                timerEl.style.color = "var(--text-muted)";
                await markCurrentPlayerAuctioned();
                if(forceUnsold){
                    // Protezione finale contro qualunque stato rimasto dall'asta precedente.
                    currentWinner='';
                    currentAuctionValue=0;
                    currentTimer=0;
                }
            } else {
                const team=findTeamByName(currentWinner);
                const {error}=await supabaseClient.rpc('fanta_assign_player',{
                    p_room_id:currentRoomId,
                    p_team_id:team?.id,
                    p_player_id:String(currentAuctionPlayer.Id),
                    p_player_name:String(currentAuctionPlayer.Nome||''),
                    p_role:String(currentAuctionPlayer.R||''),
                    p_club:String(currentAuctionPlayer.Squadra||''),
                    p_price:currentAuctionValue
                });
                if(error){
                    assignmentOk=false;
                    titleEl.innerText='ASSEGNAZIONE BLOCCATA';
                    winnerEl.innerText=error.message;
                    winnerEl.style.color='var(--accent-red)';
                    timerEl.style.color='var(--accent-red)';
                } else {
                    titleEl.innerText = "ASTA VINTA DA";
                    winnerEl.innerText = currentWinner;
                    winnerEl.style.color = "var(--accent-blue)";
                    timerEl.style.color = "var(--accent-blue)";
                    auctionedPlayerIds.add(String(currentAuctionPlayer.Id));
                    await saveAuctionedPlayers();
                    await loadRoomState();
                    broadcastAuctionedState();
                    broadcastStateChanged();
                }
            }
            if(assignmentOk&&nominationState.enabled)await advanceNominationTurn();

            if(assignmentOk){
                renderAuctioneerBidRanking(finalBidRanking,'CLASSIFICA OFFERTE · MASSIMO PER SQUADRA');
            }

            playSound('audio-end');
            if(assignmentOk){
                await saveLiveAuctionState({
                    phase:'ended',
                    player:livePlayerSnapshot(),
                    mode:'normal_result',
                    winner:currentWinner||'',
                    value:currentAuctionValue||0,
                    normal_bid_ranking:finalBidRanking,
                    seconds:0,
                    deadline_at:null,
                    ready_token:null,ready_required_ids:[],ready_ids:[],skip_ids:[]
                });
            }
            if(channel && assignmentOk) channel.send({type:'broadcast',event:'auction_end',payload:{winner:currentWinner,value:currentAuctionValue}}).catch(()=>{});

            const nextButton=document.getElementById('btn-next');
            if(assignmentOk&&nominationState.enabled){
                if(nextButton)nextButton.style.display='none';
                setTimeout(async()=>{
                    nominationReady=true;
                    await saveNominationState(true);
                    await saveLiveAuctionState({
                        phase:'idle',player:null,winner:'',value:0,seconds:0,deadline_at:null,
                        ready_token:null,ready_required_ids:[],ready_ids:[]
                    });
                    showNominationWaitingBoard();
                },700);
            }else{
                if(autoRandomEnabled){
                    if(nextButton)nextButton.style.display='none';
                    // Lascia visibile l'esito per un istante, poi avvia senza intervento manuale.
                    scheduleAutoRandomAuction(850);
                }else{
                    if(nextButton)nextButton.style.display='flex';
                }
            }
            timerEl.innerText = "0";
            hybridRenderNormalEnd();
        }


        async function openAllRosters() {
            if (!currentRoomId) return;
            loadBanditoreUiPrefs();
            await loadRoomState();
            renderAllRosters();
            showScreen('screen-all-rosters');
        }

        function closeAllRosters() {
            showScreen('screen-auctioneer-board');
        }

        function renderAllRosters() {
            renderListFilters('rosters');
            const grid = document.getElementById('all-rosters-grid');
            if (!grid) return;
            const limits = roomLimits();
            const totalSlots = totalRoomSlots();
            const roomName = document.getElementById('rosters-room-name');
            if (roomName) roomName.innerText = currentRoom?.name || currentRoomCode || '--';
            document.getElementById('rosters-team-count').innerText = `${teamsCache.length} squadre`;
            document.getElementById('rosters-purchase-count').innerText = `${purchasesCache.length} acquisti`;

            if (!teamsCache.length) {
                grid.style.removeProperty('--roster-columns');
                grid.innerHTML = '<div class="roster-empty">Nessuna squadra presente nella stanza.</div>';
                return;
            }

            const cards = teamsCache.map(team => {
                const bought = filterAndSortPlayers(teamPurchases(team.id),'rosters');
                const counts = teamCounts(team.id);
                const free = Math.max(0, totalSlots - counts.total);
                const slotText = isMantraRoom()
                    ? `<span>Por <b>${counts.Por}/${mantraMinGoalkeepers()}</b></span><span>Min rosa <b>${mantraRosterMin()}</b></span><span>Max <b>${mantraRosterMax()}</b></span>`
                    : ['P','D','C','A'].map(r => {
                        const left = Math.max(0, limits[r] - (counts[r] || 0));
                        return `<span>${r} <b>${left}</b> liberi</span>`;
                    }).join('');
                const players = bought.length ? bought.map(p => `
                    <div class="roster-player-line">
                        <span class="role-badge role-${escapeHtml(String(p.role || '').toUpperCase())}">${escapeHtml(p.role || '-')}</span>
                        <div class="roster-player-main">
                            <b>${escapeHtml(p.player_name || '')}</b>
                            <small>${escapeHtml(p.club || '')}</small>
                        </div>
                        <span class="roster-player-price">${parseInt(p.price) || 0}</span>
                    </div>`).join('') : '<div class="roster-empty">Nessun giocatore acquistato.</div>';

                return {
                    weight: Math.max(4, bought.length + 3),
                    html: `<section class="roster-team-card">
                        <div class="roster-team-head">
                            <div class="roster-team-name">${escapeHtml(team.name || 'Squadra')}</div>
                            <div class="roster-team-credit">${parseInt(team.credits_remaining) || 0} crediti</div>
                        </div>
                        <div class="roster-slots">
                            <span>Slot liberi <b>${free}</b></span>${slotText}
                        </div>
                        <div class="roster-player-list">${players}</div>
                    </section>`
                };
            });

            // Colonne indipendenti: ogni squadra è nel normale flusso verticale della propria colonna.
            // In questo modo 3, 8 o 20 rose non possono mai sovrapporsi tra loro.
            const viewport = window.innerWidth || document.documentElement.clientWidth || 1200;
            const wantedColumns = viewport <= 680 ? 1 : (viewport <= 1050 ? 2 : 3);
            const columnCount = Math.max(1, Math.min(wantedColumns, cards.length));
            const columns = Array.from({length:columnCount},()=>({weight:0,cards:[]}));
            cards.forEach(card=>{
                let target=columns[0];
                for(const col of columns){ if(col.weight < target.weight) target=col; }
                target.cards.push(card.html);
                target.weight += card.weight;
            });

            grid.style.setProperty('--roster-columns', String(columnCount));
            grid.innerHTML = columns.map(col=>`<div class="roster-stack-column">${col.cards.join('')}</div>`).join('');
        }

        let allRostersResizeTimer=null;
        window.addEventListener('resize',()=>{
            if(!document.getElementById('screen-all-rosters')?.classList.contains('active'))return;
            clearTimeout(allRostersResizeTimer);
            allRostersResizeTimer=setTimeout(()=>renderAllRosters(),120);
        });

        async function resetRoomRuntimeState(){
            cancelAutoRandomLaunch();
            if(!currentRoomId)return;

            const ok=await appConfirm(
                'RESETTARE LO STATO DELL’ASTA?\n\n'+
                'Verranno azzerati READY, countdown/asta in corso e stati temporanei dei giocatori.\n'+
                'Rose, acquisti, crediti, squadre e impostazioni NON verranno modificati.'
            );
            if(!ok)return;

            // Ferma timer locali del banditore.
            if(timerInterval){clearInterval(timerInterval);timerInterval=null;}
            if(auctionPrepInterval){clearInterval(auctionPrepInterval);auctionPrepInterval=null;}
            readyGateWaiting=false;
            readyGateToken=null;
            readyPlayers=new Set();
            readySkipPlayers=new Set();
            readyOfflineExcludedIds=new Set();
            if(readyPresenceReconcileTimer){
                clearTimeout(readyPresenceReconcileTimer);
                readyPresenceReconcileTimer=null;
            }
            isAuctionActive=false;
            currentWinner='';
            currentAuctionValue=0;
            currentAuctionPlayer=null;

            if(sealedTimerInterval){clearInterval(sealedTimerInterval);sealedTimerInterval=null;}
            const oldSealedToken=sealedAuctionToken;
            sealedAuctionModeActive=false;
            sealedAuctionToken=null;
            sealedDeadlineAt=0;
            sealedBids=new Map();
            sealedEligibleIds=[];
            if(oldSealedToken)await clearPersistedSealedBids(oldSealedToken);

            // Chiudi eventuale READY persistente.
            await saveReadyGateDedicated(false);

            // Stato live neutro persistente, così anche chi rientra non resta bloccato.
            liveAuctionState={
                phase:'idle',
                player:null,
                winner:'',
                value:0,
                seconds:0,
                deadline_at:null,
                ready_token:null,
                ready_required_ids:[],
                ready_ids:[],
                updated_at:new Date().toISOString()
            };
            await saveLiveAuctionState(liveAuctionState);

            // In banditura a turni manteniamo turno/ordine, ma riapriamo la fase di scelta.
            if(nominationState.enabled){
                nominationRequestPending=false;
                nominationReady=true;
                normalizeNominationState();
                await saveNominationState(true);
            }

            // Notifica immediata a tutti i telefoni collegati.
            if(channel){
                channel.send({
                    type:'broadcast',
                    event:'force_state_reset',
                    payload:{
                        at:Date.now(),
                        nomination_enabled:!!nominationState.enabled,
                        nomination_state:nominationState
                    }
                }).catch(()=>{});
            }

            // Ripristina la plancia banditore.
            hideNominationStage();
            const av=document.getElementById('view-auction');
            const lv=document.getElementById('view-list');
            if(av){av.classList.add('auction-view-hidden');av.style.display='none';}

            if(nominationState.enabled){
                showNominationWaitingBoard();
            }else{
                if(lv)lv.style.display='flex';
            }

            await loadRoomState();
            renderRoomControl();
            alert('Stato asta resettato. I giocatori collegati sono stati sbloccati.');
        }

        async function openRoomControl(changeReturn = true) {
            if (!currentRoomId) return;

            await refreshRoomTeamPinStatuses();

            // Acquisti / Rose parte sempre compresso quando si apre Gestione.
            controlPurchasesExpanded=false;
            controlPurchasesSearch='';

            if (changeReturn) roomControlReturnScreen='screen-auctioneer-board';
            await loadRoomState();
            await loadNominationState();
            await loadAuctionPrepSeconds();
            await loadRoomAuctionExtraSettings();
            await loadReadyMode();
            await loadSealedTimerSeconds();
            await loadSealedRevealSeconds();
            renderRoomControl();
            showScreen('screen-room-control');
        }

        async function openHybridRoomControl(){
            if(!auctioneerPlayerMode){
                await openRoomControl(true);
                return;
            }

            // Ricordiamo che Gestione è stata aperta dal telecomando del
            // banditore+giocatore, così alla chiusura torniamo al contesto corretto.
            roomControlReturnScreen='hybrid-context';
            await openRoomControl(false);
        }

        function closeRoomControl(){
            if(roomControlReturnScreen==='hybrid-context' && auctioneerPlayerMode){
                roomControlReturnScreen='screen-auctioneer-board';

                configureHybridPlayerIdentity();

                // Asta/READY in corso: torna al telecomando giocatore.
                if(currentAuctionPlayer && (isAuctionActive || readyGateWaiting || playerSealedMode)){
                    showHybridPlayerForCurrentAuction();
                    if(readyGateWaiting)showHybridReadyIfNeeded();
                    return;
                }

                // Se è il suo turno di banditura resta sul telecomando,
                // con il pulsante per aprire il listone.
                if(isMyNominationTurn()){
                    showScreen('screen-player-buzzer');
                    updateNominationUI();
                    return;
                }

                // Se invece tocca a un altro, torna alla plancia/listone banditore.
                if(nominationState.enabled){
                    showHybridBanditoreWaitingList();
                    return;
                }

                showScreen('screen-auctioneer-board');
                return;
            }

            showScreen(roomControlReturnScreen || 'screen-auctioneer-board');
        }
        async function refreshRoomControl() { await loadRoomState(); await loadAuctionPrepSeconds(); await loadRoomAuctionExtraSettings(); await loadSealedTimerSeconds(); await loadSealedRevealSeconds(); renderRoomControl(); }

        function renderRoomControl() {
            if (!currentRoom) return;
            ensureNominationOrder();
            updateNominationUI();
            updateReadyControlUI();
            renderAutoRandomControlUI();
            updateSelfRaiseControlUI();
            renderOnlinePlayers();
            renderAuctioneerPlayerControl();
            renderAudioRoutingTargets();
            document.querySelector('#control-room-pill b').innerText=currentRoom.name;
            const mantra=isMantraRoom();
            const controlScreen=document.getElementById('screen-room-control');
            const boardScreen=document.getElementById('screen-auctioneer-board');
            if(controlScreen)controlScreen.dataset.gameMode=mantra?'mantra':'classic';
            if(boardScreen)boardScreen.dataset.gameMode=mantra?'mantra':'classic';
            const modeBadge=document.getElementById('control-game-mode-badge');
            if(modeBadge){modeBadge.textContent=mantra?'MANTRA':'CLASSIC';modeBadge.classList.toggle('mantra',mantra);}
            const classicLimits=document.getElementById('control-classic-limits');
            const mantraRules=document.getElementById('control-mantra-rules');
            if(classicLimits)classicLimits.style.display=mantra?'none':'grid';
            if(mantraRules)mantraRules.style.display=mantra?'block':'none';
            const mantraMaxInput=document.getElementById('control-mantra-max-roster');
            if(mantraMaxInput)mantraMaxInput.value=mantraRosterMax();
            const nomNote=document.getElementById('nomination-control-note');
            if(nomNote)nomNote.textContent=mantra
                ?'MANTRA: turno libero. Ogni squadra può bandire qualsiasi giocatore disponibile finché ha posti in rosa.'
                :'Si completa un ruolo alla volta. Chi ha completato il reparto viene saltato automaticamente.';
            document.getElementById('control-room-name').value=currentRoom.name||'';
            document.getElementById('control-room-password').value=currentRoom.password||'';
            document.getElementById('control-room-timer').value=currentRoom.timer_seconds||auctionTimeLimit||5;
            const cooldownInput=document.getElementById('control-bid-cooldown');
            if(cooldownInput)cooldownInput.value=(normalBidCooldownMs/1000).toFixed(1).replace(/\.0$/,'');
            const autoBidOneInput=document.getElementById('nomination-auto-bid-one');
            if(autoBidOneInput)autoBidOneInput.checked=!!nominationAutoBidOneEnabled;
            const prepInput=document.getElementById('control-room-prep'); if(prepInput) prepInput.value=auctionPrepSeconds||5;
            const sealedInput=document.getElementById('control-sealed-timer'); if(sealedInput) sealedInput.value=sealedTimerSeconds||30;
            const revealInput=document.getElementById('control-sealed-reveal-timer'); if(revealInput) revealInput.value=sealedRevealSeconds||5;
            const l=roomLimits(); ['P','D','C','A'].forEach(r=>document.getElementById('control-limit-'+r).value=l[r]);
            document.getElementById('control-team-count').innerText=`${teamsCache.length} squadre`;
            const head=document.getElementById('control-teams-head-row');
            if(head){
                head.innerHTML=mantra
                    ?'<th>Squadra</th><th>Crediti</th><th>Por</th><th>Rosa</th><th>Liberi</th><th>Min.</th><th>Max.</th><th>PIN</th><th>Azioni</th>'
                    :'<th>Squadra</th><th>Crediti</th><th>P</th><th>D</th><th>C</th><th>A</th><th>Tot.</th><th>PIN</th><th>Azioni</th>';
            }
            const tb=document.getElementById('control-teams-body');
            tb.innerHTML=teamsCache.length?teamsCache.map(t=>{const c=teamCounts(t.id);return `<tr>
                <td data-label="Squadra"><input id="ctl-team-name-${t.id}" class="minimal-input" style="margin:0;padding:7px;text-align:left" value="${escapeHtml(t.name)}"></td>
                <td data-label="Crediti"><input id="ctl-team-credits-${t.id}" type="number" class="minimal-input" style="margin:0;padding:7px" value="${t.credits_remaining}"></td>
                ${mantra
                    ? `<td data-label="Por">${c.Por}/${mantraMinGoalkeepers()}</td><td data-label="Rosa">${c.total}</td><td data-label="Liberi">${Math.max(0,mantraRosterMax()-c.total)}</td><td data-label="Min.">${mantraRosterMin()}</td><td data-label="Max.">${mantraRosterMax()}</td>`
                    : `<td data-label="P">${c.P}/${l.P}</td><td data-label="D">${c.D}/${l.D}</td><td data-label="C">${c.C}/${l.C}</td><td data-label="A">${c.A}/${l.A}</td><td data-label="Tot.">${c.total}/${totalRoomSlots()}</td>`}
                <td data-label="PIN">${teamPinStatusHtml(t.id)}</td>
                <td data-label="Azioni">
                    <div class="control-teams-actions">
                        <button class="btn btn-green btn-small manual-assign-btn" onclick="openManualAssign('${t.id}')">+ Assegna giocatore</button>
                        <button class="btn btn-small" onclick="saveTeamControl('${t.id}')">Salva</button>
                        <button class="btn btn-danger btn-small control-team-delete" onclick="deleteTeamControl('${t.id}')">🗑 Elimina</button>
                    </div>
                </td></tr>`}).join(''):'<tr><td colspan="9">Nessuna squadra</td></tr>';
            renderControlPurchases();
        }

        async function saveRoomConfig() {
            const rawCooldown=parseFloat(String(document.getElementById('control-bid-cooldown')?.value||'0.5').replace(',','.'));
            const cooldownSeconds=Number.isFinite(rawCooldown)?Math.max(.1,Math.min(5,rawCooldown)):.5;
            normalBidCooldownMs=Math.round(cooldownSeconds*1000);
            selfRaiseEnabled=!!document.getElementById('self-raise-enabled')?.checked;
            nominationAutoBidOneEnabled=!!document.getElementById('nomination-auto-bid-one')?.checked;
            const randomRoleSelection=autoRandomSelectedRolesFromControl();
            if(randomRoleSelection.length)autoRandomRoles=new Set(randomRoleSelection);
            autoRandomEnabled=!!document.getElementById('auto-random-enabled')?.checked && autoRandomRoles.size>0 && !nominationState.enabled;
            const prepSeconds=Math.max(1,Math.min(15,parseInt(document.getElementById('control-room-prep')?.value)||5));
            const sealedSeconds=Math.max(5,Math.min(180,parseInt(document.getElementById('control-sealed-timer')?.value)||30));
            const revealSeconds=Math.max(1,Math.min(30,parseInt(document.getElementById('control-sealed-reveal-timer')?.value)||5));
            const payload={
                name:normalizeRoomCode(document.getElementById('control-room-name').value),
                password:document.getElementById('control-room-password').value,
                initial_credits:Math.max(1,parseInt(currentRoom?.initial_credits)||500),
                timer_seconds:Math.max(1,parseInt(document.getElementById('control-room-timer').value)||5),
                prep_seconds:prepSeconds,
                sealed_timer_seconds:sealedSeconds,
                sealed_reveal_seconds:revealSeconds,
                limit_p:Math.max(0,parseInt(document.getElementById('control-limit-P').value)||0),
                limit_d:Math.max(0,parseInt(document.getElementById('control-limit-D').value)||0),
                limit_c:Math.max(0,parseInt(document.getElementById('control-limit-C').value)||0),
                limit_a:Math.max(0,parseInt(document.getElementById('control-limit-A').value)||0),
                mantra_min_roster:23,
                mantra_min_goalkeepers:2,
                mantra_max_roster:Math.max(23,Math.min(90,parseInt(document.getElementById('control-mantra-max-roster')?.value)||mantraRosterMax())),
                updated_at:new Date().toISOString()
            };
            if(!payload.name||!payload.password){alert('Controlla nome e password.');return;}
            if(!isMantraRoom() && payload.limit_p+payload.limit_d+payload.limit_c+payload.limit_a<1){alert('La rosa Classic deve avere almeno uno slot.');return;}
            if(isMantraRoom() && payload.mantra_max_roster<23){alert('In Mantra la rosa massima non può essere inferiore a 23.');return;}
            const {error}=await supabaseClient.from('fanta_rooms').update(payload).eq('id',currentRoomId);
            if(error){
                const msg=String(error.message||'');
                if(/prep_seconds|sealed_timer_seconds|sealed_reveal_seconds|column/i.test(msg)) alert('Prima di usare questi timer devi eseguire una sola volta la migrazione SQL dei timer su Supabase.');
                else alert('Salvataggio non riuscito: '+msg);
                return;
            }
            auctionTimeLimit=payload.timer_seconds;
            auctionPrepSeconds=payload.prep_seconds;
            sealedTimerSeconds=payload.sealed_timer_seconds;
            sealedRevealSeconds=payload.sealed_reveal_seconds;
            const extraSaved=await saveRoomAuctionExtraSettings();
            if(!extraSaved)console.warn('Impostazioni extra non salvate: verranno mantenuti i valori correnti su questo dispositivo.');
            await loadRoomState();
            await loadRooms();
            renderRoomControl();
            broadcastStateChanged();
        }

        async function createTeamControl(){
            if(!currentRoomId)return;

            const input=document.getElementById('control-new-team-name');
            const name=(input?.value||'').trim();
            if(!name){
                alert('Inserisci il nome della squadra.');
                input?.focus();
                return;
            }

            await loadRoomState();

            if(teamsCache.some(t=>String(t.name||'').trim().toLowerCase()===name.toLowerCase())){
                alert('Esiste già una squadra con questo nome.');
                return;
            }

            const initialCredits=Math.max(1,parseInt(currentRoom?.initial_credits??500)||500);
            const {error}=await supabaseClient.from('fanta_teams').insert({
                room_id:currentRoomId,
                name,
                credits_remaining:initialCredits
            });

            if(error){
                alert('Creazione squadra non riuscita: '+error.message);
                return;
            }

            if(input)input.value='';
            await loadRoomState();
            await refreshRoomTeamPinStatuses();
            ensureNominationOrder();
            if(nominationState.enabled)await saveNominationState(nominationReady);
            renderRoomControl();
            broadcastStateChanged();
        }

        function updateSealedModeButton(){
            const btn=document.getElementById('toolbar-sealed-mode-btn');
            if(!btn)return;

            btn.classList.toggle('active',!!sealedListonePickMode);
            btn.textContent=sealedListonePickMode
                ?'Buste ✓'
                :'Avvia buste';
            btn.setAttribute('aria-pressed',sealedListonePickMode?'true':'false');
        }

        function toggleSealedListoneMode(){
            if(!currentRoomId)return;
            if(!sealedListonePickMode && blockHybridBanditoreOutOfTurnAction(true))return;

            sealedListonePickMode=!sealedListonePickMode;
            updateSealedModeButton();

            const search=document.getElementById('player-search');
            if(search && sealedListonePickMode)search.focus();

            refreshPlayerLists();
        }

        function openSealedPlayerPicker(){
            if(blockHybridBanditoreOutOfTurnAction(true))return;

            sealedListonePickMode=true;
            updateSealedModeButton();
            refreshPlayerLists();
        }

        function closeSealedPlayerPicker(){
            sealedListonePickMode=false;
            updateSealedModeButton();
            refreshPlayerLists();
        }

        function cancelSealedListonePick(){
            closeSealedPlayerPicker();
        }

        async function chooseSealedPlayerFromListone(id){
            if(blockHybridBanditoreOutOfTurnAction(true)){
                sealedListonePickMode=false;
                updateSealedModeButton();
                return;
            }

            const player=playersList.find(p=>String(p.Id)===String(id));
            if(!player || auctionedPlayerIds.has(String(id)))return;
            if(!await appConfirm(`Avviare l'offerta in busta chiusa per ${player.Nome}?`))return;
            sealedListonePickMode=false;
            updateSealedModeButton();
            await startSealedAuctionForPlayer(player);
        }

        function renderSealedPlayerOptions(){
            const sel=document.getElementById('sealed-player-select');
            if(!sel)return;
            const list=filterAndSortPlayers(getAvailablePlayers(),'sealed');

            sel.innerHTML=list.length
                ? '<option value="">Seleziona un giocatore...</option>'+
                  list.map(p=>`<option value="${escapeHtml(String(p.Id))}">[${escapeHtml(playerRole(p)||'-')}] ${escapeHtml(p.Nome||'')} · ${escapeHtml(p.Squadra||'')}</option>`).join('')
                : '<option value="">Nessun giocatore disponibile</option>';
        }

        async function confirmStartSealedAuction(){
            if(blockHybridBanditoreOutOfTurnAction(true))return;

            const err=document.getElementById('sealed-picker-error');
            if(err)err.textContent='';
            const id=document.getElementById('sealed-player-select')?.value||'';
            const player=playersList.find(p=>String(p.Id)===String(id));
            if(!player){if(err)err.textContent='Seleziona un giocatore.';return;}

            if(!await appConfirm(`Avviare l'offerta in busta chiusa per ${player.Nome}?`))return;

            closeSealedPlayerPicker();
            closeRoomControl();
            await startSealedAuctionForPlayer(player);
        }

        function sealedEligibleTeams(){
            if(!currentAuctionPlayer)return[];
            const role=String(currentAuctionPlayer.R||'').toUpperCase();
            return teamsCache.filter(team=>maxBidForTeam(team,role)>=1);
        }

        async function startSealedAuctionForPlayer(player){
            if(!player || auctionedPlayerIds.has(String(player.Id)))return;

            currentAuctionPlayer={...player,R:playerRole(player)};
            player=currentAuctionPlayer;
            // nessun nuovo giocatore eredita esito/prezzo dell'asta precedente.
            currentWinner='';
            currentAuctionValue=0;
            currentTimer=0;
            normalBidMaxima=new Map();
            recentNormalBidIds=new Map();
            sealedEnding=false;
            sealedAuctionModeActive=true;
            sealedRound=1;
            sealedAuctionToken=`sealed_${currentRoomId}_${player.Id}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
            sealedBids=new Map();
            sealedEligibleIds=sealedEligibleTeams().map(t=>String(t.id));
            sealedDeadlineAt=0;
            if(sealedTimerInterval){clearInterval(sealedTimerInterval);sealedTimerInterval=null;}

            restoreAuctionCardVisibility();
            document.getElementById('auction-player-name-top').textContent=player.Nome||'--';
            document.getElementById('auction-player-role').textContent=player.R||'-';
            document.getElementById('auction-player-club').textContent=player.Squadra||'-';
            setPlayerImage(document.getElementById('card-image'), player.Id, player.R);

            readySkipPlayers=new Set();
            if(readyModeEnabled)beginReadyGate();
            else{readyGateWaiting=false;readyGateToken=null;readyPlayers=new Set();}

            if(channel){
                channel.send({
                    type:'broadcast',
                    event:'new_player',
                    payload:{
                        url:playerImageUrl(player.Id,player.R),
                        nome:player.Nome,player_id:player.Id,role:player.R,club:player.Squadra,fvm:playerListoneNumericValue(player),
                        prep_seconds:0,
                        ready_required:readyModeEnabled,
                        ready_token:readyGateToken,
                        ready_required_ids:readyModeEnabled?readyRequiredIds():[],
                        ready_ids:readyModeEnabled?[...readyPlayers]:[],
                        skip_ids:readyModeEnabled?[...readySkipPlayers]:[],
                        mode:'sealed',
                        sealed_token:sealedAuctionToken,
                        sealed_round:sealedRound,
                        sealed_seconds:sealedTimerSeconds,
                        sealed_eligible_ids:sealedEligibleIds
                    }
                }).catch(()=>{});
            }

            if(auctioneerPlayerMode){
                showHybridPlayerForCurrentAuction();
                if(readyModeEnabled)showHybridReadyIfNeeded();
            }

            if(readyModeEnabled){
                showAuctioneerReadyStage();
                updateReadyGateDisplay();
                evaluateReadyGate();
            }else{
                startSealedAuctionTimer();
            }
        }

        function manualAvailablePlayers(){
            return getAvailablePlayers().filter(p=>{
                const role=playerRole(p);
                return isMantraRoom()?!!role:['P','D','C','A'].includes(String(role).toUpperCase());
            });
        }

        function openManualAssign(teamId){
            const team=teamsCache.find(t=>String(t.id)===String(teamId));
            if(!team)return;

            manualAssignTeamId=team.id;
            const overlay=document.getElementById('manual-assign-overlay');
            const teamName=document.getElementById('manual-assign-team-name');
            const search=document.getElementById('manual-player-search');
            const price=document.getElementById('manual-player-price');
            const err=document.getElementById('manual-assign-error');

            if(teamName)teamName.textContent=team.name||'Squadra';
            if(search)search.value='';
            if(price)price.value='1';
            if(err)err.textContent='';

            renderManualPlayerOptions();
            updateManualAssignPreview();
            overlay?.classList.add('open');
            setTimeout(()=>search?.focus(),50);
        }

        function closeManualAssign(){
            document.getElementById('manual-assign-overlay')?.classList.remove('open');
            manualAssignTeamId=null;
        }

        function renderManualPlayerOptions(){
            const sel=document.getElementById('manual-player-select');
            if(!sel)return;

            const list=filterAndSortPlayers(manualAvailablePlayers(),'manual');

            sel.innerHTML=list.length
                ? '<option value="">Seleziona un giocatore...</option>'+
                  list.map(p=>`<option value="${escapeHtml(String(p.Id))}">[${escapeHtml(playerRole(p)||'-')}] ${escapeHtml(p.Nome||'')} · ${escapeHtml(p.Squadra||'')}</option>`).join('')
                : '<option value="">Nessun giocatore disponibile</option>';

            updateManualAssignPreview();
        }

        function updateManualAssignPreview(){
            const sel=document.getElementById('manual-player-select');
            const box=document.getElementById('manual-player-preview');
            if(!box)return;

            const player=playersList.find(p=>String(p.Id)===String(sel?.value||''));
            const team=teamsCache.find(t=>String(t.id)===String(manualAssignTeamId));

            if(!player || !team){
                box.textContent='Seleziona un giocatore disponibile.';
                return;
            }

            const role=playerRole(player);
            const counts=teamCounts(team.id);
            const limits=roomLimits();
            const max=Math.max(0,maxBidForTeam(team,role));

            box.innerHTML=isMantraRoom()
                ? `<b>${escapeHtml(player.Nome||'')}</b> · ${escapeHtml(role)} · ${escapeHtml(player.Squadra||'')}
                   <br>Rosa: <b>${counts.total}/${mantraRosterMax()}</b> · Por: <b>${counts.Por}/${mantraMinGoalkeepers()}</b> · Crediti: <b>${parseInt(team.credits_remaining)||0}</b> · Prezzo massimo: <b>${max}</b>`
                : `<b>${escapeHtml(player.Nome||'')}</b> · ${escapeHtml(role)} · ${escapeHtml(player.Squadra||'')}
                   <br>Slot ${escapeHtml(role)}: <b>${counts[role]||0}/${limits[role]||0}</b> · Crediti: <b>${parseInt(team.credits_remaining)||0}</b> · Prezzo massimo: <b>${max}</b>`;
        }

        async function confirmManualAssign(){
            const err=document.getElementById('manual-assign-error');
            if(err)err.textContent='';

            const team=teamsCache.find(t=>String(t.id)===String(manualAssignTeamId));
            const playerId=document.getElementById('manual-player-select')?.value||'';
            const player=playersList.find(p=>String(p.Id)===String(playerId));
            const price=Math.max(1,parseInt(document.getElementById('manual-player-price')?.value)||1);

            if(!team){if(err)err.textContent='Squadra non trovata.';return;}
            if(!player){if(err)err.textContent='Seleziona un giocatore.';return;}
            if(auctionedPlayerIds.has(String(player.Id)) || purchasesCache.some(x=>String(x.player_id)===String(player.Id))){
                if(err)err.textContent='Questo giocatore risulta già assegnato.';
                await loadRoomState();
                renderManualPlayerOptions();
                return;
            }

            const role=playerRole(player);
            const limits=roomLimits();
            const counts=teamCounts(team.id);

            if(isMantraRoom()){
                if(!role){
                    if(err)err.textContent='Ruolo Mantra del giocatore non disponibile nel listone.';
                    return;
                }
                if(counts.total>=mantraRosterMax()){
                    if(err)err.textContent='La rosa Mantra è già completa.';
                    return;
                }
            }else{
                const classicRole=String(role||'').toUpperCase();
                if(!['P','D','C','A'].includes(classicRole)){
                    if(err)err.textContent='Ruolo del giocatore non valido.';
                    return;
                }
                if((counts[classicRole]||0)>=(limits[classicRole]||0)){
                    if(err)err.textContent=`La squadra ha già completato gli slot ${classicRole}.`;
                    return;
                }
            }

            const max=maxBidForTeam(team,role);
            if(price>max){
                if(err)err.textContent=`Prezzo troppo alto. Per questa squadra il massimo è ${max} crediti.`;
                return;
            }

            if(!await appConfirm(`Assegnare ${player.Nome} a "${team.name}" per ${price} crediti?`))return;

            const {error}=await supabaseClient.rpc('fanta_assign_player',{
                p_room_id:currentRoomId,
                p_team_id:team.id,
                p_player_id:String(player.Id),
                p_player_name:String(player.Nome||''),
                p_role:role,
                p_club:String(player.Squadra||''),
                p_price:price
            });

            if(error){
                if(err)err.textContent='Assegnazione non riuscita: '+error.message;
                return;
            }

            // Mantiene coerente anche il listone locale/room state.
            auctionedPlayerIds.add(String(player.Id));
            await saveAuctionedPlayers();
            await loadRoomState();

            renderRoomControl();
            refreshPlayerLists();
            broadcastAuctionedState();
            broadcastStateChanged();
            closeManualAssign();
        }

        async function saveTeamControl(id) {
            const name=document.getElementById('ctl-team-name-'+id).value.trim();
            const credits=Math.max(0,parseInt(document.getElementById('ctl-team-credits-'+id).value)||0);
            if(!name){alert('Il nome squadra è obbligatorio.');return;}
            const {error}=await supabaseClient.from('fanta_teams').update({name,credits_remaining:credits}).eq('id',id);
            if(error){alert('Modifica squadra non riuscita: '+error.message);return;}
            await loadRoomState(); ensureNominationOrder(); if(nominationState.enabled) await saveNominationState(nominationReady); renderRoomControl(); broadcastStateChanged();
        }

        async function removePurchaseControl(id) {
            if(!await appConfirm('Annullare questo acquisto, rimborsare i crediti e rimettere il giocatore disponibile?'))return;
            const purchase = purchasesCache.find(x => String(x.id) === String(id));
            const {error}=await supabaseClient.rpc('fanta_remove_purchase',{p_purchase_id:id});
            if(error){alert('Operazione non riuscita: '+error.message);return;}
            if(purchase?.player_id){
                auctionedPlayerIds.delete(String(purchase.player_id));
                await saveAuctionedPlayers();
            }
            await loadRoomState(); renderRoomControl(); refreshPlayerLists(); broadcastAuctionedState(); broadcastStateChanged();
        }

        async function deleteTeamControl(id) {
            const t=teamsCache.find(x=>String(x.id)===String(id)); if(!t)return;
            if(!await appConfirm(`ELIMINARE LA SQUADRA "${t.name}"?

Tutti i suoi acquisti verranno annullati e i giocatori torneranno disponibili nel listone.`))return;
            const purchases=teamPurchases(id).slice();
            for(const x of purchases){const {error}=await supabaseClient.rpc('fanta_remove_purchase',{p_purchase_id:x.id}); if(error){alert(error.message);return;}}
            const {error}=await supabaseClient.from('fanta_teams').delete().eq('id',id);
            if(error){alert('Eliminazione squadra non riuscita: '+error.message);return;}
            await loadRoomState(); ensureNominationOrder(); if(nominationState.enabled) await saveNominationState(nominationReady); renderRoomControl(); broadcastStateChanged();
        }


        

        

        

        

        

        

        

        function csvImportFindPlayer(raw){
            const id=String(raw.id||'').trim();

            if(id){
                const byId=playersList.find(p=>String(p.Id)===id);
                if(byId)return {player:byId,reason:null};
            }

            const nameKey=csvImportNormalize(raw.name);
            if(!nameKey){
                return {player:null,reason:id?`ID ${id} non trovato nel listone.`:'Manca ID o nome giocatore.'};
            }

            let matches=playersList.filter(p=>csvImportNormalize(p.Nome)===nameKey);

            if(raw.club){
                const clubKey=csvImportNormalize(raw.club);
                const filtered=matches.filter(p=>csvImportNormalize(p.Squadra)===clubKey);
                if(filtered.length)matches=filtered;
            }

            if(raw.role){
                const roleKey=csvImportNormalize(raw.role);
                const filtered=matches.filter(p=>csvImportNormalize(playerRole(p))===roleKey);
                if(filtered.length)matches=filtered;
            }

            if(matches.length===1)return {player:matches[0],reason:null};
            if(matches.length>1)return {player:null,reason:`"${raw.name}" è ambiguo: usa la colonna ID.`};

            return {player:null,reason:`"${raw.name}" non trovato nel listone.`};
        }

        function csvImportConnectedPlayerIds(){
            try{cleanupOnlinePlayersSilent();}catch(e){}

            const ids=new Set(
                [...onlinePlayers.keys()]
                    .map(String)
                    .filter(Boolean)
            );

            if(auctioneerPlayerMode&&auctioneerPlayerTeamId){
                ids.add(String(auctioneerPlayerTeamId));
            }

            return ids;
        }

        function csvImportCanStart(){
            if(!currentRoomId){
                return {ok:false,message:'Apri prima una stanza.'};
            }

            if(isAuctionActive || readyGateWaiting || sealedAuctionModeActive){
                return {ok:false,message:'Termina o resetta l’asta/READY in corso prima di importare.'};
            }

            const connected=csvImportConnectedPlayerIds();
            if(connected.size){
                return {
                    ok:false,
                    message:`Importazione bloccata: ${connected.size} giocator${connected.size===1?'e':'i'} collegat${connected.size===1?'o':'i'}. Devono uscire dalla stanza.`
                };
            }

            return {ok:true,message:''};
        }

        function resetCsvRosterImportUI(){
            csvRosterImportPlan=null;
            csvRosterImportBusy=false;

            const input=document.getElementById('csv-roster-import-file');
            const status=document.getElementById('csv-roster-import-status');
            const preview=document.getElementById('csv-roster-import-preview');
            const confirm=document.getElementById('csv-roster-import-confirm');

            if(input)input.value='';
            if(status){
                status.textContent='Seleziona un file CSV.';
                status.className='csv-roster-import-status';
            }
            if(preview)preview.innerHTML='';
            if(confirm){
                confirm.disabled=true;
                confirm.textContent='Importa nella stanza';
            }
        }

        async function openCsvRosterImport(){
            await loadRoomState();

            const allowed=csvImportCanStart();
            if(!allowed.ok){
                alert(allowed.message);
                return;
            }

            resetCsvRosterImportUI();
            document.getElementById('csv-roster-import-overlay')?.classList.add('open');
        }

        function closeCsvRosterImport(){
            if(csvRosterImportBusy)return;
            document.getElementById('csv-roster-import-overlay')?.classList.remove('open');
            resetCsvRosterImportUI();
        }

        function downloadCsvImportTemplate(){
            const text=[
                'Fantasquadra,ID,Giocatore,Ruolo,Club,Prezzo',
                'Mia Squadra,123,Nome Giocatore,P,Club,10'
            ].join('\r\n');

            downloadBlob('LIVEASTA_modello_importazione_rose.csv',text);
        }

        function csvImportRowsFromParsed(parsed){
            const rows=parsed.rows||[];
            if(!rows.length)return {records:[],errors:['Il file è vuoto.']};

            const hasHeader=csvImportLooksLikeHeader(rows[0]);
            const records=[];
            const errors=[];

            if(!hasHeader){
                rows.forEach((row,index)=>{
                    if(row.length<3){
                        errors.push(`Riga ${index+1}: servono almeno Squadra, ID e Prezzo.`);
                        return;
                    }

                    records.push({
                        sourceRow:index+1,
                        team:String(row[0]||'').trim(),
                        id:String(row[1]||'').trim(),
                        name:'',
                        role:'',
                        club:'',
                        price:csvImportPrice(row[2])
                    });
                });

                return {records,errors,format:'liveasta-legacy'};
            }

            const headers=rows[0];
            const map=csvImportColumnMap(headers);

            if(map.team<0)errors.push('Manca la colonna Fantasquadra/Squadra.');
            if(map.price<0)errors.push('Manca la colonna Prezzo/Costo.');
            if(map.id<0 && map.name<0)errors.push('Serve almeno una colonna ID oppure Giocatore/Nome.');

            if(errors.length)return {records:[],errors,format:'header'};

            rows.slice(1).forEach((row,index)=>{
                records.push({
                    sourceRow:index+2,
                    team:String(row[map.team]||'').trim(),
                    id:map.id>=0?String(row[map.id]||'').trim():'',
                    name:map.name>=0?String(row[map.name]||'').trim():'',
                    price:csvImportPrice(row[map.price]),
                    role:map.role>=0?String(row[map.role]||'').trim():'',
                    club:map.club>=0?String(row[map.club]||'').trim():''
                });
            });

            return {records,errors,format:'header'};
        }

        function buildCsvRosterImportPlan(text){
            const parsed=parseCsvRows(text);
            const raw=csvImportRowsFromParsed(parsed);
            const errors=[...(raw.errors||[])];
            const warnings=[];
            const rows=[];
            const seenPlayerIds=new Map();

            if(errors.length){
                return {
                    valid:false,
                    errors,
                    warnings,
                    rows:[],
                    teams:[],
                    importCount:0,
                    skipCount:0
                };
            }

            const existingTeamByName=new Map(
                teamsCache.map(t=>[csvImportNormalize(t.name),t])
            );

            const existingPurchaseByPlayer=new Map(
                purchasesCache.map(p=>[String(p.player_id),p])
            );

            for(const record of raw.records){
                if(!record.team){
                    errors.push(`Riga ${record.sourceRow}: nome fantasquadra mancante.`);
                    continue;
                }

                if(!Number.isFinite(record.price) || record.price<1){
                    errors.push(`Riga ${record.sourceRow}: prezzo non valido.`);
                    continue;
                }

                const resolved=csvImportFindPlayer(record);
                if(!resolved.player){
                    errors.push(`Riga ${record.sourceRow}: ${resolved.reason}`);
                    continue;
                }

                const player=resolved.player;
                const pid=String(player.Id);
                const teamKey=csvImportNormalize(record.team);

                if(seenPlayerIds.has(pid)){
                    errors.push(
                        `Riga ${record.sourceRow}: ${player.Nome} è presente più volte nel CSV (prima alla riga ${seenPlayerIds.get(pid)}).`
                    );
                    continue;
                }
                seenPlayerIds.set(pid,record.sourceRow);

                const existingPurchase=existingPurchaseByPlayer.get(pid);
                let skip=false;

                if(existingPurchase){
                    const existingTeam=teamsCache.find(t=>String(t.id)===String(existingPurchase.team_id));
                    if(existingTeam && csvImportNormalize(existingTeam.name)===teamKey){
                        skip=true;
                        warnings.push(
                            `${player.Nome}: già presente in ${existingTeam.name}, verrà ignorato.`
                        );
                    }else{
                        errors.push(
                            `Riga ${record.sourceRow}: ${player.Nome} è già assegnato a ${existingTeam?.name||'un’altra squadra'}.`
                        );
                        continue;
                    }
                }

                rows.push({
                    sourceRow:record.sourceRow,
                    teamName:record.team,
                    teamKey,
                    player,
                    playerId:pid,
                    playerName:String(player.Nome||''),
                    role:playerRole(player),
                    club:String(player.Squadra||record.club||''),
                    price:record.price,
                    skip
                });
            }

            const grouped=new Map();
            for(const row of rows){
                if(!grouped.has(row.teamKey)){
                    grouped.set(row.teamKey,{
                        key:row.teamKey,
                        name:row.teamName,
                        existing:existingTeamByName.get(row.teamKey)||null,
                        rows:[]
                    });
                }
                grouped.get(row.teamKey).rows.push(row);
            }

            const initialCredits=Math.max(1,parseInt(currentRoom?.initial_credits??500)||500);
            const limits=roomLimits();

            for(const group of grouped.values()){
                const existing=group.existing;
                const currentCounts=existing
                    ? teamCounts(existing.id)
                    : {P:0,D:0,C:0,A:0,Por:0,total:0};

                const sim={...currentCounts};
                let credits=existing
                    ? Math.max(0,parseInt(existing.credits_remaining)||0)
                    : initialCredits;

                for(const row of group.rows.filter(r=>!r.skip)){
                    const role=String(row.role||'');
                    if(!role){
                        errors.push(`${row.playerName}: ruolo non disponibile nel listone.`);
                        continue;
                    }

                    if(isMantraRoom()){
                        if(sim.total>=mantraRosterMax()){
                            errors.push(`${group.name}: supera la rosa massima Mantra (${mantraRosterMax()}).`);
                            break;
                        }
                        if(mantraRoleTokens(role).includes('Por'))sim.Por++;
                    }else{
                        const classic=role.toUpperCase();
                        if(!['P','D','C','A'].includes(classic)){
                            errors.push(`${row.playerName}: ruolo Classic non valido (${role}).`);
                            continue;
                        }
                        if((sim[classic]||0)>=(limits[classic]||0)){
                            errors.push(`${group.name}: supera gli slot ${classic}.`);
                            continue;
                        }
                        sim[classic]=(sim[classic]||0)+1;
                    }

                    sim.total++;
                    credits-=row.price;

                    if(credits<0){
                        errors.push(`${group.name}: i prezzi importati superano i crediti disponibili.`);
                        break;
                    }
                }

                const remainingSlots=isMantraRoom()
                    ? Math.max(0,mantraRosterMax()-sim.total)
                    : Math.max(0,totalRoomSlots()-sim.total);

                if(credits<remainingSlots){
                    errors.push(
                        `${group.name}: dopo l'import resterebbero ${credits} crediti ma ${remainingSlots} slot da completare.`
                    );
                }

                group.finalCredits=credits;
                group.finalCounts=sim;
                group.newTeam=!existing;
            }

            const teams=[...grouped.values()];
            const importCount=rows.filter(r=>!r.skip).length;
            const skipCount=rows.filter(r=>r.skip).length;

            if(!importCount && !errors.length){
                warnings.push('Il CSV non contiene nuovi giocatori da importare.');
            }

            return {
                valid:errors.length===0 && importCount>0,
                errors,
                warnings,
                rows,
                teams,
                importCount,
                skipCount,
                newTeamCount:teams.filter(t=>t.newTeam).length,
                format:raw.format,
                delimiter:parsed.delimiter
            };
        }

        function renderCsvRosterImportPlan(plan){
            const status=document.getElementById('csv-roster-import-status');
            const preview=document.getElementById('csv-roster-import-preview');
            const confirm=document.getElementById('csv-roster-import-confirm');

            if(!status||!preview||!confirm)return;

            confirm.disabled=!plan?.valid;

            if(!plan){
                status.textContent='Seleziona un file CSV.';
                status.className='csv-roster-import-status';
                preview.innerHTML='';
                return;
            }

            status.className='csv-roster-import-status '+(plan.valid?'ok':'error');
            status.textContent=plan.valid
                ? `${plan.importCount} giocatori pronti · ${plan.newTeamCount} nuove squadre`
                : `CSV non importabile · ${plan.errors.length} problemi`;

            const errorHtml=(plan.errors||[]).length
                ? `<div class="csv-import-message-block error">
                    <b>Da correggere</b>
                    ${(plan.errors||[]).slice(0,30).map(e=>`<span>${escapeHtml(e)}</span>`).join('')}
                   </div>`
                :'';

            const warningHtml=(plan.warnings||[]).length
                ? `<div class="csv-import-message-block warning">
                    <b>Note</b>
                    ${(plan.warnings||[]).slice(0,20).map(e=>`<span>${escapeHtml(e)}</span>`).join('')}
                   </div>`
                :'';

            const teamsHtml=(plan.teams||[]).length
                ? `<div class="csv-import-team-list">
                    ${(plan.teams||[]).map(group=>{
                        const additions=group.rows.filter(r=>!r.skip);
                        const total=additions.reduce((s,r)=>s+r.price,0);
                        return `<div class="csv-import-team-row">
                            <div>
                                <b>${escapeHtml(group.name)}</b>
                                <small>${group.newTeam?'NUOVA SQUADRA':'SQUADRA ESISTENTE'}</small>
                            </div>
                            <span>${additions.length} giocatori</span>
                            <span>${total} crediti</span>
                            <strong>→ ${group.finalCredits}</strong>
                        </div>`;
                    }).join('')}
                   </div>`
                :'';

            preview.innerHTML=errorHtml+warningHtml+teamsHtml;
        }

        async function handleCsvRosterImportFile(file){
            const status=document.getElementById('csv-roster-import-status');
            const confirm=document.getElementById('csv-roster-import-confirm');

            csvRosterImportPlan=null;
            if(confirm)confirm.disabled=true;

            if(!file){
                renderCsvRosterImportPlan(null);
                return;
            }

            const allowed=csvImportCanStart();
            if(!allowed.ok){
                if(status){
                    status.textContent=allowed.message;
                    status.className='csv-roster-import-status error';
                }
                return;
            }

            if(!/\.csv$/i.test(file.name||'')){
                if(status){
                    status.textContent='Seleziona un file con estensione .csv.';
                    status.className='csv-roster-import-status error';
                }
                return;
            }

            try{
                const text=await file.text();
                csvRosterImportPlan=buildCsvRosterImportPlan(text);
                renderCsvRosterImportPlan(csvRosterImportPlan);
            }catch(e){
                console.error(e);
                if(status){
                    status.textContent='Impossibile leggere il CSV.';
                    status.className='csv-roster-import-status error';
                }
            }
        }

        async function rollbackCsvRosterImport(previousPurchaseIds,previousTeamIds,previousAuctionedIds){
            try{
                await loadRoomState();

                const newPurchases=(purchasesCache||[])
                    .filter(p=>!previousPurchaseIds.has(String(p.id)))
                    .slice()
                    .reverse();

                for(const purchase of newPurchases){
                    await supabaseClient.rpc('fanta_remove_purchase',{
                        p_purchase_id:purchase.id
                    });
                }

                await loadRoomState();

                const newTeams=(teamsCache||[])
                    .filter(t=>!previousTeamIds.has(String(t.id)));

                for(const team of newTeams){
                    await supabaseClient
                        .from('fanta_teams')
                        .delete()
                        .eq('id',team.id);
                }

                auctionedPlayerIds=new Set(previousAuctionedIds);
                await saveAuctionedPlayers();
                await loadRoomState();
            }catch(e){
                console.error('Rollback import CSV non completo',e);
            }
        }

        async function confirmCsvRosterImport(){
            if(csvRosterImportBusy || !csvRosterImportPlan?.valid)return;

            const allowed=csvImportCanStart();
            if(!allowed.ok){
                alert(allowed.message);
                return;
            }

            await loadRoomState();

            const plan=csvRosterImportPlan;

            const message=
                `IMPORTARE IL CSV NELLA STANZA?\\n\\n`+
                `Nuove squadre: ${plan.newTeamCount}\\n`+
                `Nuovi giocatori: ${plan.importCount}\\n`+
                `Già presenti ignorati: ${plan.skipCount}\\n\\n`+
                `L'importazione NON cancella acquisti esistenti.`;

            if(!await appConfirm(message))return;

            const status=document.getElementById('csv-roster-import-status');
            const confirmBtn=document.getElementById('csv-roster-import-confirm');

            csvRosterImportBusy=true;
            if(confirmBtn){
                confirmBtn.disabled=true;
                confirmBtn.textContent='Importazione…';
            }
            if(status){
                status.className='csv-roster-import-status working';
                status.textContent='Importazione in corso. Non chiudere la pagina.';
            }

            const previousPurchaseIds=new Set((purchasesCache||[]).map(p=>String(p.id)));
            const previousTeamIds=new Set((teamsCache||[]).map(t=>String(t.id)));
            const previousAuctionedIds=new Set([...auctionedPlayerIds].map(String));

            try{
                const teamMap=new Map(
                    teamsCache.map(t=>[csvImportNormalize(t.name),t])
                );

                const initialCredits=Math.max(1,parseInt(currentRoom?.initial_credits??500)||500);

                for(const group of plan.teams){
                    if(teamMap.has(group.key))continue;

                    const {data,error}=await supabaseClient
                        .from('fanta_teams')
                        .insert({
                            room_id:currentRoomId,
                            name:group.name,
                            credits_remaining:initialCredits
                        })
                        .select('*')
                        .single();

                    if(error)throw new Error(`Creazione squadra "${group.name}": ${error.message}`);
                    teamMap.set(group.key,data);
                }

                await loadRoomState();
                teamsCache.forEach(t=>teamMap.set(csvImportNormalize(t.name),t));

                let done=0;

                for(const row of plan.rows){
                    if(row.skip)continue;

                    const team=teamMap.get(row.teamKey);
                    if(!team)throw new Error(`Squadra "${row.teamName}" non trovata dopo la creazione.`);

                    const {error}=await supabaseClient.rpc('fanta_assign_player',{
                        p_room_id:currentRoomId,
                        p_team_id:team.id,
                        p_player_id:String(row.playerId),
                        p_player_name:String(row.playerName||''),
                        p_role:String(row.role||''),
                        p_club:String(row.club||''),
                        p_price:row.price
                    });

                    if(error){
                        throw new Error(
                            `${row.playerName} → ${team.name} (${row.price}): ${error.message}`
                        );
                    }

                    auctionedPlayerIds.add(String(row.playerId));
                    done++;

                    if(status){
                        status.textContent=`Importazione ${done} / ${plan.importCount}…`;
                    }
                }

                await saveAuctionedPlayers();
                await loadRoomState();
                await refreshRoomTeamPinStatuses();

                ensureNominationOrder();
                if(nominationState.enabled){
                    await saveNominationState(nominationReady);
                }

                renderRoomControl();
                refreshPlayerLists();
                broadcastAuctionedState();
                broadcastStateChanged();

                if(status){
                    status.className='csv-roster-import-status ok';
                    status.textContent=`Importazione completata: ${plan.importCount} giocatori assegnati.`;
                }

                csvRosterImportBusy=false;

                setTimeout(()=>{
                    document.getElementById('csv-roster-import-overlay')?.classList.remove('open');
                    resetCsvRosterImportUI();
                },900);

            }catch(e){
                console.error('Import CSV fallito',e);

                if(status){
                    status.className='csv-roster-import-status error';
                    status.textContent='Errore: ripristino automatico della stanza in corso…';
                }

                await rollbackCsvRosterImport(
                    previousPurchaseIds,
                    previousTeamIds,
                    previousAuctionedIds
                );

                renderRoomControl();
                refreshPlayerLists();
                broadcastAuctionedState();
                broadcastStateChanged();

                csvRosterImportBusy=false;

                if(confirmBtn){
                    confirmBtn.disabled=false;
                    confirmBtn.textContent='Riprova importazione';
                }

                if(status){
                    status.className='csv-roster-import-status error';
                    status.textContent=`Importazione annullata e ripristinata. ${e.message||e}`;
                }
            }
        }


        function downloadBlob(filename,text,type='text/csv;charset=utf-8;') {
            const blob=new Blob([text],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
        }

        function csvCell(v){const q=String(v??'');return /[",\n]/.test(q)?'"'+q.replace(/"/g,'""')+'"':q;}
        function exportRoseCSV() {
            if(!purchasesCache.length){alert('Non ci sono acquisti da esportare.');return;}
            const rows=purchasesCache.map(x=>{const t=teamsCache.find(z=>String(z.id)===String(x.team_id));return [t?.name||'',x.player_id,x.price].map(csvCell).join(',');});
            downloadBlob(`Rose_${(currentRoomCode||'LIVEASTA').replace(/[^a-z0-9_-]+/gi,'_')}.csv`,rows.join('\r\n'));
        }

        function exportRostersXlsx() {
            if(!purchasesCache.length){alert('Non ci sono acquisti da esportare.');return;}
            const rows=purchasesCache.map(x=>{const t=teamsCache.find(z=>String(z.id)===String(x.team_id));return {Squadra:t?.name||'',Id:x.player_id,Nome:x.player_name,Ruolo:x.role,Club:x.club,Prezzo:x.price};});
            const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Rose'); XLSX.writeFile(wb,`Rose_${(currentRoomCode||'LIVEASTA').replace(/[^a-z0-9_-]+/gi,'_')}.xlsx`);
        }

        const defaultAudioRoutingSettings={
            mode:'presence',
            mutedTargets:['all_players']
        };
        let audioRoutingSettings={
            mode:'presence',
            mutedTargets:['all_players']
        };

        function audioRoutingKey(){
            return currentRoomId?`liveasta_audio_route_${currentRoomId}`:'';
        }

        function audioTargetIdForThisDevice(){
            // Se questo dispositivo è il banditore (anche banditore+giocatore),
            // è un solo dispositivo fisico e viene controllato dalla riga BANDITORE.
            if(auctioneerLockKey && currentRoomId)return 'auctioneer';
            if(myTeamId)return `team:${String(myTeamId)}`;
            return null;
        }

        function isThisDeviceAudioMuted(){
            const target=audioTargetIdForThisDevice();
            if(!target)return false;
            const muted=new Set((audioRoutingSettings.mutedTargets||[]).map(String));
            if(target==='auctioneer')return muted.has('auctioneer');
            if(String(target).startsWith('team:') && muted.has('all_players'))return true;
            return muted.has(String(target));
        }

        function applyAudioRoutingPayload(data){
            audioRoutingSettings={
                ...defaultAudioRoutingSettings,
                ...(data||{}),
                mutedTargets:Array.isArray(data?.mutedTargets)
                    ?[...new Set(data.mutedTargets.map(String))]
                    :[]
            };
            renderAudioRoutingTargets();
        }

        async function loadAudioRoutingSettings(){
            audioRoutingSettings={...defaultAudioRoutingSettings,mutedTargets:['all_players']};
            if(!currentRoomId)return audioRoutingSettings;

            try{
                const {data,error}=await supabaseClient
                    .from('fanta_app_data')
                    .select('data')
                    .eq('key',audioRoutingKey())
                    .maybeSingle();

                if(error)throw error;
                if(data?.data)applyAudioRoutingPayload(data.data);
            }catch(e){
                console.warn('Caricamento distribuzione audio non riuscito',e);
            }

            renderAudioRoutingTargets();
            return audioRoutingSettings;
        }

        async function saveAudioRoutingSettings(){
            if(!currentRoomId)return;

            const status=document.getElementById('audio-routing-status');
            if(status)status.textContent='Salvataggio…';

            const payload={
                mode:'presence',
                mutedTargets:[...new Set((audioRoutingSettings.mutedTargets||[]).map(String))],
                updated_at:new Date().toISOString()
            };

            try{
                const {error}=await supabaseClient
                    .from('fanta_app_data')
                    .upsert({
                        key:audioRoutingKey(),
                        data:payload,
                        file_name:'audio-routing',
                        updated_at:payload.updated_at
                    },{onConflict:'key'});

                if(error)throw error;

                audioRoutingSettings=payload;
                if(status)status.textContent='Distribuzione audio aggiornata.';

                if(channel){
                    channel.send({
                        type:'broadcast',
                        event:'audio_route_updated',
                        payload
                    }).catch(()=>{});
                }
            }catch(e){
                if(status)status.textContent='Salvataggio non riuscito.';
                alert('Impossibile salvare la distribuzione audio: '+(e.message||e));
            }

            renderAudioRoutingTargets();
        }

        function audioRoutingStatusForTeam(teamId){
            const id=String(teamId);
            if(auctioneerPlayerMode && String(auctioneerPlayerTeamId||'')===id){
                return 'STESSO DISPOSITIVO BANDITORE';
            }
            if(absentTeamIds.has(id))return 'ASSENTE';
            if(onlinePlayers.has(id))return 'ONLINE';
            return 'OFFLINE';
        }

        function renderAudioRoutingTargets(){
            const box=document.getElementById('audio-routing-targets');
            if(!box)return;

            const muted=new Set((audioRoutingSettings.mutedTargets||[]).map(String));
            const rows=[];

            rows.push({
                target:'auctioneer',
                label:auctioneerPlayerMode&&currentAuctioneerPlayerTeam()
                    ?`Banditore · ${currentAuctioneerPlayerTeam().name}`
                    :'Banditore',
                status:'BANDITORE'
            });

            teamsCache.forEach(team=>{
                // Banditore+giocatore = un solo telefono, quindi niente doppia riga.
                if(auctioneerPlayerMode &&
                   String(auctioneerPlayerTeamId||'')===String(team.id)){
                    return;
                }
                rows.push({
                    target:`team:${String(team.id)}`,
                    label:team.name,
                    status:audioRoutingStatusForTeam(team.id)
                });
            });

            box.innerHTML=rows.map(row=>{
                const checked=muted.has(String(row.target)) || (String(row.target).startsWith('team:') && muted.has('all_players'));
                return `<label class="audio-routing-row ${checked?'muted':''}">
                    <span class="audio-routing-device">
                        <b>${escapeHtml(row.label)}</b>
                        <small>${escapeHtml(row.status)}</small>
                    </span>
                    <span class="audio-routing-checkbox">
                        <input type="checkbox"
                               data-audio-target="${escapeHtml(row.target)}"
                               ${checked?'checked':''}
                               onchange="setAudioTargetMuted(this.dataset.audioTarget,this.checked)">
                        <span>LEVA AUDIO</span>
                    </span>
                </label>`;
            }).join('');
        }

        async function setAudioTargetMuted(target,muted){
            if(!target)return;
            const set=new Set((audioRoutingSettings.mutedTargets||[]).map(String));

            // Il default compatto "all_players" significa: tutti i player muti,
            // banditore con audio. Al primo cambio individuale lo espandiamo.
            if(set.has('all_players') && String(target).startsWith('team:')){
                set.delete('all_players');
                teamsCache.forEach(team=>{
                    if(!(auctioneerPlayerMode && String(auctioneerPlayerTeamId||'')===String(team.id))){
                        set.add(`team:${String(team.id)}`);
                    }
                });
            }

            if(muted)set.add(String(target));
            else set.delete(String(target));
            audioRoutingSettings={...audioRoutingSettings,mode:'presence',mutedTargets:[...set]};
            renderAudioRoutingTargets();
            await saveAudioRoutingSettings();
        }

        async function unmuteAllAudioTargets(){
            audioRoutingSettings={...audioRoutingSettings,mode:'presence',mutedTargets:[]};
            renderAudioRoutingTargets();
            await saveAudioRoutingSettings();
        }

        
        
        

        
        

        
        
        
        
        
        
        

        

        

        


        window.addEventListener('pointerdown', unlockAudio, {once:true, passive:true});
        window.addEventListener('touchstart', unlockAudio, {once:true, passive:true});

        window.addEventListener('DOMContentLoaded', () => {
            window.addEventListener('pagehide',()=>{
                if(channel && myTeamId){
                    sendExplicitPlayerOffline(channel);
                }
            });

            document.addEventListener('visibilitychange',()=>{
                if(document.visibilityState==='visible' &&
                   document.getElementById('screen-player-buzzer')?.classList.contains('active') &&
                   currentRoomId && myTeamId){
                    restorePlayerFromLiveState().then(()=>{
                        channel?.send({
                            type:'broadcast',
                            event:'live_state_request',
                            payload:{team_id:myTeamId}
                        }).catch(()=>{});
                    });
                }
            });
            installScreenWakeLock();
            loadAudioSettings();
            installAuctionNameAutoFit();
            loadRooms();
            // test branch: service worker disabled to avoid stale HTML/cache while validating the single-file build.
        });
