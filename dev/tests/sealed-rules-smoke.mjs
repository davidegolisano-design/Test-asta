import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];
page.on('pageerror',e=>errors.push(String(e?.stack||e)));
function assert(c,m){if(!c)throw new Error(m);}

try{
  await page.goto('http://127.0.0.1:4173/dev/index.html?sealed-rules-smoke=1',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(900);
  const r=await page.evaluate(async()=>{
    const ranking=normalizeSealedRanking([
      {team_id:'a',team_name:'A',amount:'8',at:200},
      {team_id:'b',team_name:'B',amount:5,at:100},
      {team_id:'c',team_name:'C',amount:8,at:100},
      {team_id:'d',team_name:'D',amount:0,at:50}
    ]).map(x=>({id:x.team_id,amount:x.amount,at:x.at}));
    const safeSeconds={negative:safeSealedSeconds(-1,30,180),invalid:safeSealedSeconds('x',30,180),high:safeSealedSeconds(999,30,180),zero:safeSealedSeconds(0,30,180)};

    currentRoom={game_mode:'classic',limit_p:1,limit_d:1,limit_c:1,limit_a:1};
    currentAuctionPlayer={Id:'p1',Nome:'Target',R:'D',Squadra:'Club'};
    teamsCache=[
      {id:'t1',name:'Alpha',credits_remaining:10},
      {id:'t2',name:'Beta',credits_remaining:2}
    ];
    purchasesCache=[];
    const eligible=sealedEligibleTeams().map(t=>String(t.id));

    // Authority-side sealed bid reception, fully local/stubbed.
    teamsCache=[
      {id:'t1',name:'Alpha',credits_remaining:10},
      {id:'t2',name:'Beta',credits_remaining:10}
    ];
    purchasesCache=[];
    sealedAuctionModeActive=true;sealedAuctionToken='tok';sealedEligibleIds=['t1','t2'];sealedBids=new Map();
    sealedDeadlineAt=Date.now()+60000;sealedTimerInterval=null;
    const realEndSealedAuction=endSealedAuction;
    const sent=[];channel={send:payload=>{sent.push(payload);return Promise.resolve();}};
    const calls={persist:0,show:0,end:0,tie:[],finalize:0};
    persistSealedBids=()=>{calls.persist++;return Promise.resolve();};
    showSealedAuctionStage=()=>{calls.show++;};
    endSealedAuction=async()=>{calls.end++;};
    isAuctioneerPlayerIdentity=()=>false;

    await receiveSealedBid({token:'wrong',team_id:'t1',amount:5});
    const afterWrong=sealedBids.size;
    await receiveSealedBid({token:'tok',team_id:'t1',amount:5});
    const first={size:sealedBids.size,amount:sealedBids.get('t1')?.amount,persist:calls.persist,show:calls.show,end:calls.end};
    await receiveSealedBid({token:'tok',team_id:'t1',amount:6});
    const duplicate={size:sealedBids.size,amount:sealedBids.get('t1')?.amount};
    await receiveSealedBid({token:'tok',team_id:'t2',amount:99});
    const invalid={size:sealedBids.size,rejections:sent.filter(x=>x?.event==='sealed_bid_rejected').length};
    await receiveSealedBid({token:'tok',team_id:'t2',amount:4});
    const complete={size:sealedBids.size,end:calls.end,counts:sent.filter(x=>x?.event==='sealed_bid_count').length};
    sealedDeadlineAt=Date.now()-1000;
    sealedBids=new Map();calls.persist=0;calls.show=0;calls.end=0;
    await receiveSealedBid({token:'tok',team_id:'t1',amount:3});
    const late={size:sealedBids.size,persist:calls.persist,show:calls.show,end:calls.end};

    // A top tie must restart only between tied teams and never assign immediately.
    sealedAuctionModeActive=true;sealedEnding=false;sealedAuctionToken='tie-token';
    currentAuctionPlayer={Id:'p2',Nome:'Tie',R:'D',Squadra:'Club'};
    teamsCache=[{id:'t1',name:'Alpha',credits_remaining:10},{id:'t2',name:'Beta',credits_remaining:10},{id:'t3',name:'Gamma',credits_remaining:10}];
    sealedEligibleIds=['t1','t2','t3'];
    sealedBids=new Map([
      ['t1',{team_id:'t1',team_name:'Alpha',amount:8,at:100}],
      ['t2',{team_id:'t2',team_name:'Beta',amount:8,at:200}],
      ['t3',{team_id:'t3',team_name:'Gamma',amount:5,at:50}]
    ]);
    sealedRevealDeadlineAt=Date.now()-100;sealedRevealInterval=null;
    showAuctionPanels=()=>{};
    restartSealedTieBreak=async(tied,token)=>{calls.tie.push({ids:tied.map(x=>x.team_id),amounts:tied.map(x=>x.amount),token});};
    await finalizeSealedAuctionResult();
    const tie=calls.tie[0]||null;

    // No bids: endSealedAuction must skip the reveal countdown and finalize immediately.
    endSealedAuction=realEndSealedAuction;
    sealedAuctionModeActive=true;sealedEnding=false;sealedBids=new Map();sealedRevealDeadlineAt=123;sealedTimerInterval=null;
    finalizeSealedAuctionResult=async()=>{calls.finalize++;};
    await endSealedAuction();
    const noBids={ending:sealedEnding,revealDeadline:sealedRevealDeadlineAt,finalize:calls.finalize};

    return {ranking,safeSeconds,eligible,afterWrong,first,duplicate,invalid,complete,late,tie,noBids};
  });

  assert(JSON.stringify(r.ranking)===JSON.stringify([
    {id:'c',amount:8,at:100},{id:'a',amount:8,at:200},{id:'b',amount:5,at:100}
  ]),'Sealed ranking ordering changed: '+JSON.stringify(r.ranking));
  assert(JSON.stringify(r.safeSeconds)===JSON.stringify({negative:30,invalid:30,high:180,zero:0}),'Sealed seconds normalization changed: '+JSON.stringify(r.safeSeconds));
  assert(JSON.stringify(r.eligible)===JSON.stringify(['t1']),'Sealed eligibility changed: '+JSON.stringify(r.eligible));
  assert(r.afterWrong===0,'Wrong sealed token was accepted');
  assert(r.first.size===1&&r.first.amount===5&&r.first.persist===1&&r.first.show===1&&r.first.end===0,'First valid sealed bid behavior changed: '+JSON.stringify(r.first));
  assert(r.duplicate.size===1&&r.duplicate.amount===5,'Duplicate sealed bid modified first offer');
  assert(r.invalid.size===1&&r.invalid.rejections===1,'Invalid over-max sealed bid handling changed: '+JSON.stringify(r.invalid));
  assert(r.complete.size===2&&r.complete.end===1&&r.complete.counts===2,'All-delivered early close changed: '+JSON.stringify(r.complete));
  assert(r.late.size===0&&r.late.persist===0&&r.late.show===0&&r.late.end===0,'Late sealed bid was accepted: '+JSON.stringify(r.late));
  assert(r.tie&&JSON.stringify(r.tie.ids)===JSON.stringify(['t1','t2'])&&JSON.stringify(r.tie.amounts)===JSON.stringify([8,8])&&r.tie.token==='tie-token','Tie-break selection changed: '+JSON.stringify(r.tie));
  assert(r.noBids.ending===true&&r.noBids.revealDeadline===0&&r.noBids.finalize===1,'No-bid immediate finalize changed: '+JSON.stringify(r.noBids));
  assert(errors.length===0,'Page errors:\n'+errors.join('\n---\n'));
  console.log('LIVEASTA sealed auction rules regression: OK');
} finally {
  await browser.close();
}
