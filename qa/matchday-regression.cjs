// Run: NODE_PATH=/path/to/deps/node_modules node qa/matchday-regression.cjs
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{parseHTML}=require('linkedom');
const {document,window}=parseHTML(fs.readFileSync('index.html','utf8'));
const context={document,console,Map,Set,Intl,MutationObserver:window.MutationObserver,requestAnimationFrame:f=>f(),cancelAnimationFrame:()=>{},setTimeout,clearTimeout,localStorage:{getItem:()=>null,setItem:()=>{}},navigator:{},addEventListener:()=>{}};
context.window=context;document.readyState='loading';vm.createContext(context);
const run=code=>vm.runInContext(code,context),load=file=>run(fs.readFileSync(file,'utf8'));
load('qa/matchday-fixture.js');load('scripts/list-filters.js');load('scripts/mantra-filter-ui.js');load('scripts/management.js');
let checks=0;const ok=(condition,message)=>{assert.ok(condition,message);checks++};
for(const view of ['player','board','nomination','mine','rosters','team','purchases','sealed','manual']){
 run(`renderListFilters('${view}')`);
 const root=document.getElementById('list-filters-'+view),search=root.querySelector('input'),button=root.querySelector('.unified-filter-toggle'),panel=root.querySelector('.unified-filter-controls');
 ok(search&&button&&panel,`${view}: search and disclosure mounted`);ok(panel.hidden,`${view}: collapsed initially`);
 button.click();ok(!panel.hidden&&button.getAttribute('aria-expanded')==='true',`${view}: opens`);
 search.value='milano';run(`changeListFilter('${view}','sort','name')`);
 ok(root.querySelector('input')===search&&search.value==='milano',`${view}: query and node survive refresh`);
 ok(!panel.hidden&&button.classList.contains('has-filters'),`${view}: open state and badge survive refresh`);
 run('closeAllListFilters()');ok(panel.hidden&&search.value==='milano',`${view}: closes without clearing`);
 search.value='';
}
ok(document.querySelectorAll('.unified-searchbar').length===9,'exactly one searchbar per list');
run("renderListFilters('board');renderListFilters('player')");
const board=document.getElementById('list-filters-board'),player=document.getElementById('list-filters-player');
board.querySelector('button').click();player.querySelector('button').click();ok(board.querySelector('.unified-filter-controls').hidden,'opening another panel closes first');
run("fixtureMantra=true;renderFixtureList()");
board.querySelector('.unified-filter-toggle').click();board.querySelector('.unified-role-all').click();
ok(run("filterAndSortPlayers(playersList,'board').length")===0,'Mantra all off really filters data');
ok(board.querySelector('.unified-filter-toggle').classList.contains('has-filters'),'Mantra all off indicator');
board.querySelector('.unified-role-all').click();ok(run("filterAndSortPlayers(playersList,'board').length")===5,'Mantra all on restores all players');
// Only invoke the management init handler, not the fixture data renderer.
const managed={document,window:null,MutationObserver:window.MutationObserver,console,addEventListener:()=>{}};managed.window=managed;document.readyState='complete';vm.createContext(managed);vm.runInContext(fs.readFileSync('scripts/management.js','utf8'),managed);
const timer=document.getElementById('control-room-timer');timer.value='47';document.getElementById('mg-tab-participants').click();
ok(document.getElementById('mg-panel-room').hidden&&!document.getElementById('mg-panel-participants').hidden,'management switches panels');document.getElementById('mg-tab-room').click();ok(timer.value==='47','management preserves unsaved values');
// Exercise the actual viewport adapter and state dispatch, with auction renderers stubbed.
const app=fs.readFileSync('scripts/app.js','utf8');loadActual=app.slice(app.indexOf('        function applyAuctioneerUiMode()'),app.indexOf('        async function openAuctioneerAccess()'));
let compact=false,resize;context.matchMedia=()=>({get matches(){return compact},addEventListener:(type,fn)=>resize=fn});
Object.assign(context,{auctioneerLockToken:null,readyGateWaiting:false,nominationReady:false,isAuctionActive:false,auctionPrepInterval:null,sealedAuctionModeActive:false,setMobileBoardPhase:phase=>{document.getElementById('view-auction').className='mobile-'+phase}});
run(loadActual);load('scripts/responsive-ui.js');
ok(document.documentElement.dataset.auctioneerUi==='desktop','wide viewport uses desktop');compact=true;resize();ok(document.getElementById('auction-dashboard').classList.contains('mode-mobile'),'compact viewport changes layout automatically');
context.auctioneerLockToken='fixture';context.isAuctionActive=true;compact=false;resize();compact=true;resize();ok(document.getElementById('view-auction').classList.contains('mobile-normal'),'live auction retains normal state on resize');
context.isAuctionActive=false;context.auctionPrepInterval=1;compact=false;resize();compact=true;resize();ok(document.getElementById('view-auction').classList.contains('mobile-preparing'),'preparation state survives resize');
compact=false;resize();ok(!document.getElementById('view-auction').className.includes('mobile-'),'wide mode clears compact-only state');
ok(!document.getElementById('screen-device-choice'),'device chooser removed');
require('css-tree').parse(fs.readFileSync('styles/matchday.css','utf8'));console.log(`${checks} regression checks passed; Matchday CSS parsed.`);
