import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];
page.on('pageerror',e=>errors.push(String(e?.stack||e)));
function assert(c,m){if(!c)throw new Error(m);}

try{
  await page.goto('http://127.0.0.1:4173/dev/index.html?auction-rules-smoke=1',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(900);

  const result=await page.evaluate(()=>{
    const snapshot={
      currentRoom,currentAuctionPlayer,teamsCache:[...teamsCache],purchasesCache:[...purchasesCache],
      absentTeamIds:new Set(absentTeamIds),sealedAuctionModeActive,sealedEligibleIds:[...sealedEligibleIds],
      isAuctionActive,currentAuctionValue,currentWinner,myTeamId,myTeamName,selfRaiseEnabled,
      readyGateWaiting,readyPlayers:new Set(readyPlayers),readySkipPlayers:new Set(readySkipPlayers),
      sealedAuctionToken,playerSkippedCurrentAuction,nominationState:{...nominationState}
    };
    const originals={
      updateReadyGateDisplay,broadcastReadyState,persistReadyGateState,closeReadyGateDedicated,
      showAuctionPanels,endAuction,startSealedAuctionTimer,startCountdown
    };
    const calls={display:0,broadcast:0,persist:0,close:0,panels:0,end:[],sealedStart:0,countdown:0};
    try{
      updateReadyGateDisplay=()=>{calls.display++;};
      broadcastReadyState=()=>{calls.broadcast++;};
      persistReadyGateState=()=>{calls.persist++;};
      closeReadyGateDedicated=()=>{calls.close++;};
      showAuctionPanels=()=>{calls.panels++;};
      endAuction=(unsold)=>{calls.end.push(unsold);};
      startSealedAuctionTimer=()=>{calls.sealedStart++;};
      startCountdown=()=>{calls.countdown++;};

      currentRoom={game_mode:'classic',limit_p:1,limit_d:1,limit_c:1,limit_a:1};
      teamsCache=[
        {id:'a',name:'Alpha',credits_remaining:10},
        {id:'b',name:'Beta',credits_remaining:10},
        {id:'c',name:'Gamma',credits_remaining:10}
      ];
      purchasesCache=[{team_id:'a',role:'D',price:1}];
      currentAuctionPlayer={Id:'pl1',Nome:'Player',R:'D',Squadra:'Club'};
      absentTeamIds=new Set(['c']);
      sealedAuctionModeActive=false;sealedEligibleIds=[];
      const readyClassic={
        required:readyRequiredIds(),
        includingAbsent:readyRequiredTeams(true).map(t=>String(t.id))
      };

      absentTeamIds=new Set();
      sealedAuctionModeActive=true;sealedEligibleIds=['b'];
      const sealedRequired=readyRequiredIds();

      currentRoom={game_mode:'mantra',mantra_max_roster:23,mantra_min_roster:23,mantra_min_goalkeepers:2};
      teamsCache=[
        {id:'m1',name:'Rich',credits_remaining:30},
        {id:'m2',name:'Poor',credits_remaining:5}
      ];
      purchasesCache=[];
      currentAuctionPlayer={Id:'pl2',Nome:'Mantra',R:'M',Squadra:'Club'};
      sealedAuctionModeActive=false;sealedEligibleIds=[];absentTeamIds=new Set();
      const readyMantra=readyRequiredIds();

      currentRoom={game_mode:'classic',limit_p:1,limit_d:1,limit_c:1,limit_a:1};
      teamsCache=[{id:'bid',name:'Bidder',credits_remaining:10}];
      purchasesCache=[];
      currentAuctionPlayer={Id:'pl3',Nome:'BidTarget',R:'D',Squadra:'Club'};
      myTeamId='bid';myTeamName='Bidder';isAuctionActive=true;currentAuctionValue=3;currentWinner='Other';selfRaiseEnabled=true;
      const bidRules={
        inc4:isNormalBidAmountAllowed(4),
        inc5:isNormalBidAmountAllowed(5)
      };
      selfRaiseEnabled=false;currentWinner=' bidder ';
      bidRules.selfRaiseBlocked=isSelfRaiseBlockedForTeam(teamsCache[0]);
      bidRules.inc1WhenSelfRaiseBlocked=isNormalBidAmountAllowed(1);
      selfRaiseEnabled=true;currentWinner='Other';
      purchasesCache=[{team_id:'bid',role:'D',price:1}];
      bidRules.fullRole=isNormalBidAmountAllowed(1);

      // Nomination eligibility in Classic.
      teamsCache=[
        {id:'n1',name:'One',credits_remaining:10},
        {id:'n2',name:'Two',credits_remaining:10}
      ];
      purchasesCache=[
        {team_id:'n1',role:'P',price:1},{team_id:'n2',role:'P',price:1},
        {team_id:'n1',role:'D',price:1}
      ];
      nominationState={enabled:true,role:'D',turn_team_id:'n1',order_team_ids:['n1','n2']};
      const nominationClassic={first:firstIncompleteRole(),eligibleD:eligibleNominationTeams('D').map(t=>String(t.id))};

      // Nomination eligibility in Mantra.
      currentRoom={game_mode:'mantra',mantra_max_roster:23,mantra_min_roster:23,mantra_min_goalkeepers:2};
      teamsCache=[{id:'x1',name:'Full',credits_remaining:30},{id:'x2',name:'Free',credits_remaining:30}];
      purchasesCache=[];
      for(let i=0;i<23;i++)purchasesCache.push({team_id:'x1',role:i<2?'Por':'M',price:1});
      for(let i=0;i<22;i++)purchasesCache.push({team_id:'x2',role:i<2?'Por':'M',price:1});
      const nominationMantra={first:firstIncompleteRole(),eligible:eligibleNominationTeams('ALL').map(t=>String(t.id))};

      // READY gate: all SKIP => immediate unsold at 0.
      currentRoom={game_mode:'classic',limit_p:1,limit_d:1,limit_c:1,limit_a:1};
      teamsCache=[{id:'r1',name:'R1',credits_remaining:10},{id:'r2',name:'R2',credits_remaining:10}];
      purchasesCache=[];currentAuctionPlayer={Id:'pl4',Nome:'Ready',R:'D',Squadra:'Club'};absentTeamIds=new Set();
      sealedAuctionModeActive=false;sealedEligibleIds=[];sealedAuctionToken='tok';
      readyGateWaiting=true;readyPlayers=new Set(['r1','r2']);readySkipPlayers=new Set(['r1','r2']);
      currentWinner='Someone';currentAuctionValue=9;playerSkippedCurrentAuction=true;
      evaluateReadyGate();
      const allSkip={
        waiting:readyGateWaiting,winner:currentWinner,value:currentAuctionValue,
        sealed:sealedAuctionModeActive,eligible:[...sealedEligibleIds],end:[...calls.end],countdown:calls.countdown,sealedStart:calls.sealedStart
      };

      // One READY + one SKIP => auction starts and skip state is cleared.
      calls.end=[];calls.countdown=0;calls.sealedStart=0;calls.persist=0;
      readyGateWaiting=true;readyPlayers=new Set(['r1','r2']);readySkipPlayers=new Set(['r1']);
      sealedAuctionModeActive=false;sealedEligibleIds=[];playerSkippedCurrentAuction=true;
      evaluateReadyGate();
      const mixedReady={waiting:readyGateWaiting,skipSize:readySkipPlayers.size,playerSkipped:playerSkippedCurrentAuction,end:[...calls.end],countdown:calls.countdown};

      // Not everyone answered => stays waiting and persists state.
      calls.end=[];calls.countdown=0;calls.persist=0;
      readyGateWaiting=true;readyPlayers=new Set(['r1']);readySkipPlayers=new Set(['r1']);
      evaluateReadyGate();
      const incomplete={waiting:readyGateWaiting,persist:calls.persist,end:[...calls.end],countdown:calls.countdown};

      // Sealed READY with at least one READY => starts sealed timer, not normal countdown.
      calls.end=[];calls.countdown=0;calls.sealedStart=0;calls.persist=0;
      readyGateWaiting=true;readyPlayers=new Set(['r1','r2']);readySkipPlayers=new Set(['r1']);
      sealedAuctionModeActive=true;sealedEligibleIds=['r1','r2'];
      evaluateReadyGate();
      const sealedMixed={waiting:readyGateWaiting,skipSize:readySkipPlayers.size,sealedStart:calls.sealedStart,countdown:calls.countdown,end:[...calls.end]};

      return {readyClassic,sealedRequired,readyMantra,bidRules,nominationClassic,nominationMantra,allSkip,mixedReady,incomplete,sealedMixed};
    } finally {
      currentRoom=snapshot.currentRoom;currentAuctionPlayer=snapshot.currentAuctionPlayer;teamsCache=snapshot.teamsCache;purchasesCache=snapshot.purchasesCache;
      absentTeamIds=snapshot.absentTeamIds;sealedAuctionModeActive=snapshot.sealedAuctionModeActive;sealedEligibleIds=snapshot.sealedEligibleIds;
      isAuctionActive=snapshot.isAuctionActive;currentAuctionValue=snapshot.currentAuctionValue;currentWinner=snapshot.currentWinner;myTeamId=snapshot.myTeamId;myTeamName=snapshot.myTeamName;selfRaiseEnabled=snapshot.selfRaiseEnabled;
      readyGateWaiting=snapshot.readyGateWaiting;readyPlayers=snapshot.readyPlayers;readySkipPlayers=snapshot.readySkipPlayers;sealedAuctionToken=snapshot.sealedAuctionToken;playerSkippedCurrentAuction=snapshot.playerSkippedCurrentAuction;nominationState=snapshot.nominationState;
      updateReadyGateDisplay=originals.updateReadyGateDisplay;broadcastReadyState=originals.broadcastReadyState;persistReadyGateState=originals.persistReadyGateState;closeReadyGateDedicated=originals.closeReadyGateDedicated;showAuctionPanels=originals.showAuctionPanels;endAuction=originals.endAuction;startSealedAuctionTimer=originals.startSealedAuctionTimer;startCountdown=originals.startCountdown;
    }
  });

  assert(JSON.stringify(result.readyClassic.required)===JSON.stringify(['b']),'READY Classic absent/full-role eligibility changed: '+JSON.stringify(result.readyClassic));
  assert(JSON.stringify(result.readyClassic.includingAbsent)===JSON.stringify(['b','c']),'READY includeAbsent behavior changed');
  assert(JSON.stringify(result.sealedRequired)===JSON.stringify(['b']),'Sealed eligible READY filter changed: '+JSON.stringify(result.sealedRequired));
  assert(JSON.stringify(result.readyMantra)===JSON.stringify(['m1']),'READY Mantra max-bid eligibility changed: '+JSON.stringify(result.readyMantra));

  assert(result.bidRules.inc4===true,'Exact allowed bid boundary changed');
  assert(result.bidRules.inc5===false,'Over-max bid boundary changed');
  assert(result.bidRules.selfRaiseBlocked===true&&result.bidRules.inc1WhenSelfRaiseBlocked===false,'Self-raise block changed: '+JSON.stringify(result.bidRules));
  assert(result.bidRules.fullRole===false,'Full role bid block changed');

  assert(result.nominationClassic.first==='D','Classic first incomplete role changed: '+JSON.stringify(result.nominationClassic));
  assert(JSON.stringify(result.nominationClassic.eligibleD)===JSON.stringify(['n2']),'Classic nomination eligibility changed');
  assert(result.nominationMantra.first==='ALL','Mantra incomplete-role marker changed');
  assert(JSON.stringify(result.nominationMantra.eligible)===JSON.stringify(['x2']),'Mantra nomination eligibility changed');

  assert(result.allSkip.waiting===false&&result.allSkip.winner===''&&result.allSkip.value===0,'All-SKIP reset changed: '+JSON.stringify(result.allSkip));
  assert(result.allSkip.sealed===false&&result.allSkip.eligible.length===0,'All-SKIP sealed cleanup changed');
  assert(JSON.stringify(result.allSkip.end)===JSON.stringify([true])&&result.allSkip.countdown===0&&result.allSkip.sealedStart===0,'All-SKIP must end unsold immediately');

  assert(result.mixedReady.waiting===false&&result.mixedReady.skipSize===0&&result.mixedReady.playerSkipped===false,'Mixed READY/SKIP state cleanup changed');
  assert(result.mixedReady.countdown===1&&result.mixedReady.end.length===0,'Mixed READY/SKIP must start normal auction');
  assert(result.incomplete.waiting===true&&result.incomplete.persist===1&&result.incomplete.end.length===0&&result.incomplete.countdown===0,'Incomplete READY gate behavior changed');
  assert(result.sealedMixed.waiting===false&&result.sealedMixed.skipSize===0&&result.sealedMixed.sealedStart===1&&result.sealedMixed.countdown===0&&result.sealedMixed.end.length===0,'Sealed mixed READY/SKIP behavior changed');

  assert(errors.length===0,'Page errors:\n'+errors.join('\n---\n'));
  console.log('LIVEASTA critical auction rules regression: OK');
} finally {
  await browser.close();
}
