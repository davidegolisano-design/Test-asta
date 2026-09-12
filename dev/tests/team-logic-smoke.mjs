import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];
page.on('pageerror',e=>errors.push(String(e?.stack||e)));
function assert(c,m){if(!c)throw new Error(m);}

try{
  await page.goto('http://127.0.0.1:4173/dev/index.html?team-logic-smoke=1',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(900);

  const r=await page.evaluate(()=>{
    const oldRoom=currentRoom;
    const oldPurchases=purchasesCache;
    const oldTeams=teamsCache;
    try{
      // Classic characterization.
      teamsCache=[
        {id:'t1',name:'Alpha',credits_remaining:10},
        {id:'t2',name:'Beta',credits_remaining:2}
      ];
      currentRoom={game_mode:'classic',limit_p:1,limit_d:1,limit_c:1,limit_a:1};
      purchasesCache=[
        {team_id:'t1',role:'P',price:3},
        {team_id:'other',role:'D',price:1}
      ];
      const classic={
        t1Purchases:teamPurchases('t1').map(p=>p.role),
        t1Counts:teamCounts('t1'),
        t1MaxD:maxBidForTeam(teamsCache[0],'D'),
        t1MaxP:maxBidForTeam(teamsCache[0],'P'),
        t2MaxA:maxBidForTeam(teamsCache[1],'A'),
        findAlpha:findTeamByName('Alpha')?.id||null,
        findMissing:findTeamByName('Missing')??null
      };

      // Mantra clamps max roster to a minimum of 23, so characterize with a valid 23-player room.
      teamsCache=[
        {id:'t1',name:'Alpha',credits_remaining:30},
        {id:'t2',name:'Beta',credits_remaining:30},
        {id:'t3',name:'Gamma',credits_remaining:30}
      ];
      currentRoom={game_mode:'mantra',mantra_max_roster:23,mantra_min_roster:23,mantra_min_goalkeepers:2};
      purchasesCache=[
        {team_id:'t1',role:'Por',price:1},
        {team_id:'t1',role:'Dc;B',price:1},
        {team_id:'t2',role:'Dc',price:1},
        {team_id:'t2',role:'M',price:1},
        ...Array.from({length:21},(_,i)=>({team_id:'t3',role:'Dc',price:1,player_id:'g'+i}))
      ];
      const mantra={
        maxRoster:mantraRosterMax(),
        minGoalkeepers:mantraMinGoalkeepers(),
        t1Counts:teamCounts('t1'),
        t1MaxM:maxBidForTeam(teamsCache[0],'M'),
        t2Counts:teamCounts('t2'),
        t2MaxM:maxBidForTeam(teamsCache[1],'M'),
        t2MaxPor:maxBidForTeam(teamsCache[1],'Por'),
        t3Counts:teamCounts('t3'),
        t3MaxM:maxBidForTeam(teamsCache[2],'M'),
        t3MaxPor:maxBidForTeam(teamsCache[2],'Por')
      };
      return {classic,mantra,types:['teamPurchases','teamCounts','findTeamByName','maxBidForTeam'].map(n=>typeof window[n])};
    } finally {
      currentRoom=oldRoom;purchasesCache=oldPurchases;teamsCache=oldTeams;
    }
  });

  console.log('TEAM_LOGIC_SNAPSHOT '+JSON.stringify(r));
  assert(r.types.every(x=>x==='function'),'Team logic function missing');
  assert(JSON.stringify(r.classic.t1Purchases)===JSON.stringify(['P']),'teamPurchases filtering changed');
  assert(JSON.stringify(r.classic.t1Counts)===JSON.stringify({P:1,D:0,C:0,A:0,Por:0,total:1}),'Classic teamCounts changed: '+JSON.stringify(r.classic.t1Counts));
  assert(r.classic.t1MaxD===8,'Classic max bid with free slot changed: '+r.classic.t1MaxD);
  assert(r.classic.t1MaxP===0,'Classic full-role max bid changed: '+r.classic.t1MaxP);
  assert(r.classic.t2MaxA===0,'Classic reserve-credit max bid changed: '+r.classic.t2MaxA);
  assert(r.classic.findAlpha==='t1'&&r.classic.findMissing===null,'findTeamByName behavior changed');

  assert(r.mantra.maxRoster===23&&r.mantra.minGoalkeepers===2,'Mantra room constraints changed');
  assert(JSON.stringify(r.mantra.t1Counts)===JSON.stringify({P:0,D:0,C:0,A:0,Por:1,total:2}),'Mantra teamCounts changed: '+JSON.stringify(r.mantra.t1Counts));
  assert(r.mantra.t1MaxM===10,'Mantra reserved-slot max bid changed: '+r.mantra.t1MaxM);
  assert(JSON.stringify(r.mantra.t2Counts)===JSON.stringify({P:0,D:0,C:0,A:0,Por:0,total:2}),'Mantra no-keeper counts changed');
  assert(r.mantra.t2MaxM===10,'Mantra normal purchase max bid changed: '+r.mantra.t2MaxM);
  assert(r.mantra.t2MaxPor===10,'Mantra goalkeeper purchase max bid changed: '+r.mantra.t2MaxPor);
  assert(JSON.stringify(r.mantra.t3Counts)===JSON.stringify({P:0,D:0,C:0,A:0,Por:0,total:21}),'Mantra edge counts changed: '+JSON.stringify(r.mantra.t3Counts));
  assert(r.mantra.t3MaxM===0,'Mantra goalkeeper-feasibility block changed: '+r.mantra.t3MaxM);
  assert(r.mantra.t3MaxPor===29,'Mantra final goalkeeper slot max bid changed: '+r.mantra.t3MaxPor);
  assert(errors.length===0,'Page errors:\n'+errors.join('\n---\n'));
  console.log('LIVEASTA team logic characterization: OK');
} finally {
  await browser.close();
}
