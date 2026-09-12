import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];
page.on('pageerror',e=>errors.push(String(e?.stack||e)));
function assert(c,m){if(!c)throw new Error(m);}

try{
  await page.goto('http://127.0.0.1:4173/dev/index.html?list-filters-smoke=1',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(900);
  const r=await page.evaluate(()=>{
    currentRoomId='';myTeamId=null;
    currentRoom={game_mode:'classic'};
    playersList=[
      {Id:'p1',Nome:'Zulu',Squadra:'Club1',R:'P',FVM:10},
      {Id:'p2',Nome:'Alpha',Squadra:'Club2',R:'D',FVM:30},
      {Id:'p3',Nome:'Beta',Squadra:'Club3',R:'A',FVM:20}
    ];
    purchasesCache=[];
    playerShortlist=new Map();
    listFilterCache.clear();

    const classicRoles=listFilterRoles();
    const defaultState={...listFilterState('player'),roles:[...listFilterState('player').roles]};
    const byRole=filterAndSortPlayers([...playersList],'player').map(p=>p.Id);
    const state=listFilterState('player');
    state.sort='value';state.direction='desc';state.roles=['P','D','C','A'];
    const byValue=filterAndSortPlayers([...playersList],'player').map(p=>p.Id);
    state.sort='name';state.direction='asc';state.roles=['D'];
    const onlyD=filterAndSortPlayers([...playersList],'player').map(p=>p.Id);

    currentRoom={game_mode:'mantra'};
    listFilterCache.clear();
    const mantraRoles=listFilterRoles();
    const mantraState={...listFilterState('player'),roles:[...listFilterState('player').roles]};

    return {
      types:['listFilterRoles','listFilterStorageKey','listFilterState','changeListFilter','renderListFilters','filterAndSortPlayers'].map(n=>typeof window[n]),
      classicRoles,defaultState,byRole,byValue,onlyD,mantraRoles,mantraState,
      playerFields:[...listFilterViews.player.fields],
      labels:{...listFilterLabels}
    };
  });
  assert(r.types.every(x=>x==='function'),'List filter function missing');
  assert(JSON.stringify(r.classicRoles)===JSON.stringify(['P','D','C','A']),'Classic roles changed');
  assert(r.defaultState.sort==='role'&&r.defaultState.direction==='asc','Default player sort changed: '+JSON.stringify(r.defaultState));
  assert(JSON.stringify(r.defaultState.roles)===JSON.stringify(['P','D','C','A']),'Default Classic role filter changed');
  assert(JSON.stringify(r.byRole)===JSON.stringify(['p1','p2','p3']),'Role sorting changed: '+JSON.stringify(r.byRole));
  assert(JSON.stringify(r.byValue)===JSON.stringify(['p2','p3','p1']),'Value sorting changed: '+JSON.stringify(r.byValue));
  assert(JSON.stringify(r.onlyD)===JSON.stringify(['p2']),'Role filtering changed: '+JSON.stringify(r.onlyD));
  assert(JSON.stringify(r.mantraState.roles)===JSON.stringify(r.mantraRoles),'Default Mantra roles changed');
  assert(r.mantraRoles.includes('Por')&&r.mantraRoles.includes('Dc')&&r.mantraRoles.includes('M')&&r.mantraRoles.includes('Pc'),'Mantra role set changed: '+JSON.stringify(r.mantraRoles));
  assert(JSON.stringify(r.playerFields)===JSON.stringify(['role','name','team','value','price','priority']),'Player filter fields changed');
  assert(r.labels.role==='Ruolo'&&r.labels.priority==='Preferenza','Filter labels changed');
  assert(errors.length===0,'Page errors:\n'+errors.join('\n---\n'));
  console.log('LIVEASTA list filters characterization: OK');
} finally {
  await browser.close();
}
