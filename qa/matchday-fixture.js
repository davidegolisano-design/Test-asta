/* UI-only visual fixture. No auction client, credentials, realtime or database. */
const myTeamId=null, nominationState={enabled:false,ignore_sequence:true}, purchasesCache=[];
let fixtureMantra=false;
const MANTRA_ROLE_ORDER=['Por','Dd','Dc','Ds','B','E','M','C','W','T','A','Pc'];
const playersList=[
 {Id:1,Nome:'Marco Rossi',Squadra:'Milano',R:'P',RM:'Por',FVM:15},
 {Id:2,Nome:'Andrea Bianchi',Squadra:'Torino',R:'D',RM:'Dd;E',FVM:23},
 {Id:3,Nome:'Luca Verdi',Squadra:'Roma',R:'C',RM:'M;C',FVM:38},
 {Id:4,Nome:'Alessandro De Luca',Squadra:'Napoli',R:'A',RM:'Pc',FVM:105},
 {Id:5,Nome:'Matteo Esposito',Squadra:'Milano',R:'A',RM:'A;W',FVM:87}
];
const teamsCache=[{id:'demo-1',name:'Atletico Spritz'},{id:'demo-2',name:'Real Fantacalcio'},{id:'demo-3',name:'FC Ultimo Rilancio'}];
const onlinePlayers=new Map([['demo-1',{}],['demo-2',{}]]),absentTeamIds=new Set();
const isMantraRoom=()=>fixtureMantra, auctionRoleOptions=()=>fixtureMantra?['P','D','C','T','A']:['P','D','C','A'];
const roleUiFamily=r=>r, normalizeMantraRole=r=>r, mantraRoleTokens=r=>String(r).split(';'),playerRole=p=>fixtureMantra?p.RM:p.R;
const playerUiPrefsKey=()=>null, banditoreUiPrefsKey=()=>null,safeReadLocalJson=()=>null,safeWriteLocalJson=()=>{};
const shortlistPriority=()=>null,playerListoneNumericValue=p=>p.FVM,escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderFixtureList(){
 const rows=filterAndSortPlayers(playersList,'board');
 document.getElementById('players-tbody').innerHTML=rows.map(p=>`<tr><td><span class="role-tag role-${p.R}">${playerRole(p)}</span></td><td>${p.Nome}</td><td>${p.Squadra}</td><td>${p.FVM}</td><td><button class="btn btn-secondary" type="button">Bandisci</button></td></tr>`).join('');
 document.getElementById('available-count').textContent=rows.length;
 const list=filterAndSortPlayers(playersList,'player');
 document.getElementById('player-listone-list').innerHTML=list.map(p=>`<div class="player-listone-row"><span class="role-tag role-${p.R}">${playerRole(p)}</span><div class="player-listone-main"><b>${p.Nome}</b><small>${p.Squadra}</small></div><strong>${p.FVM}</strong></div>`).join('');
}
const refreshPlayerLists=renderFixtureList,renderPlayerListone=renderFixtureList;
const renderNominationCandidates=()=>renderListFilters('nomination'),updatePlayerTeamStatus=()=>renderListFilters('mine'),renderAllRosters=()=>renderListFilters('rosters'),openPlayerRoomTeamRoster=()=>renderListFilters('team'),renderControlPurchases=()=>renderListFilters('purchases'),renderSealedPlayerOptions=()=>renderListFilters('sealed'),renderManualPlayerOptions=()=>renderListFilters('manual');
function fixtureScene(scene){
 document.activeElement?.blur();closeAllListFilters();
 document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));
 document.getElementById('player-listone-overlay').classList.remove('active');
 const ids={management:'screen-room-control',board:'screen-auctioneer-board',auction:'screen-auctioneer-board',player:'screen-player-buzzer',listone:'screen-player-buzzer'};
 document.getElementById(ids[scene]||ids.management).classList.add('active');
 document.getElementById('view-list').style.display=scene==='board'?'flex':'none';
 document.getElementById('view-auction').style.display=scene==='auction'?'flex':'none';
 document.getElementById('player-listone-overlay').classList.toggle('active',scene==='listone');
}
function fixtureInit(){
 const $=id=>document.getElementById(id);
 const values={'control-room-name':'Lega degli amici','control-room-timer':15,'control-room-prep':5,'control-limit-P':3,'control-limit-D':8,'control-limit-C':8,'control-limit-A':6};
 Object.entries(values).forEach(([id,value])=>$(id).value=value);
 const labels={'auction-player-name-top':'Alessandro De Luca','auction-player-role':'A','auction-player-club':'NAPOLI','countdown-display':'12','current-value-display':'85','current-winner-display':'ATLETICO SPRITZ','phone-player-name-text':'Alessandro De Luca','phone-player-role':'A','phone-player-club':'NAPOLI','player-countdown':'12','player-current-value':'85','player-current-winner':'ATLETICO SPRITZ','display-team-name':'REAL FANTACALCIO','player-credits':'240','player-slots':'8 / 25','control-team-count':'3 squadre','auction-online-count':'2 / 3'};
 Object.entries(labels).forEach(([id,value])=>{if($(id))$(id).textContent=value});
 $('phone-card-container').style.visibility='visible';
 document.querySelectorAll('.buzzer-btn').forEach(el=>el.disabled=false);
 document.body.classList.add('auctioneer-desktop');document.documentElement.dataset.auctioneerUi='desktop';
 $('auction-dashboard').classList.add('mode-pc');$('screen-auctioneer-board').classList.add('auctioneer-ui-desktop');
 $('screen-auctioneer-board').dataset.auctioneerUi='desktop';
 document.querySelectorAll('[data-management-tab]').forEach(el=>el.addEventListener('click',()=>renderListFilters('purchases')));
 $('player-search').addEventListener('input',renderFixtureList);$('player-listone-search').addEventListener('input',renderFixtureList);
 $('fixture-theme').innerHTML=Object.keys(window.LiveAstaThemes).map(name=>`<option value="${name}">${window.LiveAstaThemeLabels[name]}</option>`).join('');
 $('fixture-theme').addEventListener('change',event=>window.setLiveAstaTheme(event.target.value));
 $('fixture-scene').addEventListener('change',event=>fixtureScene(event.target.value));
 $('fixture-mode').addEventListener('change',event=>{fixtureMantra=event.target.value==='mantra';renderFixtureList()});
 renderFixtureList();window.renderManagementTeamList();fixtureScene('management');
}
document.addEventListener('DOMContentLoaded',fixtureInit,{once:true});
