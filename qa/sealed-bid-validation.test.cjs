const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('scripts/app.js','utf8');
function load(ctx,names){
  vm.createContext(ctx);
  for(const name of names){
    const start=source.search(new RegExp(`        (?:async )?function ${name}\\(`));
    assert.ok(start>=0,name);
    const end=source.indexOf('\n        }',start)+10;
    vm.runInContext(source.slice(start,end),ctx);
  }
  return ctx;
}
function fixture(){
  const nodes=new Map(),messages=[];
  const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',disabled:false,textContent:'',className:''});return nodes.get(id);};
  let now=1000;
  const c={Date:{now:()=>now},Number,String,Math,Map,Array,
    document:{getElementById:node},myTeamId:'t1',myTeamName:'Uno',teamsCache:[{id:'t1',name:'Uno'},{id:'t2',name:'Due'}],
    currentAuctionPlayer:{Id:'p1',R:'P'},maxBidForTeam:()=>100,
    sealedAuctionModeActive:true,sealedAuctionToken:'round1',sealedEnding:false,sealedDeadlineAt:2000,
    sealedEligibleIds:['t1','t2'],sealedBids:new Map(),sealedTimerInterval:null,
    playerSealedMode:true,playerSealedToken:'round1',playerSealedSubmitted:false,playerSealedConfirming:false,
    isAuctioneerPlayerIdentity:()=>false,appConfirm:async()=>true,
    preparePlayerSealedControls(){},persistSealedBids(){},showSealedAuctionStage(){},
    endSealedAuction(){c.ended=true;},roomDebug:{record(){}},clearInterval(){},
    channel:{send:m=>{messages.push(m);return Promise.resolve('ok');}}
  };
  node('player-countdown').textContent='10';
  load(c,['sealedBidAmount','submitSealedBid','receiveSealedBid','normalizeSealedRanking']);
  return {c,node,messages,setNow:n=>now=n};
}
test('strict amounts: zero stays zero; invalid values are never rounded or replaced',()=>{
  const {c}=fixture();
  for(const value of ['', ' ', '-1', -1, '1.5', 1.5, '1,5', '12abc','1e2',null,undefined,true,[],{},Infinity,NaN,'9007199254740992']){
    assert.equal(c.sealedBidAmount(value),null,String(value));
  }
  for(const [value,amount] of [[0,0],['0',0],[' 0 ',0],['001',1],[100,100]])assert.equal(c.sealedBidAmount(value),amount);
});
test('player refuses invalid or over-budget values before asking confirmation',async()=>{
  for(const value of ['', '-1','1.2','101']){
    const {c,node,messages}=fixture();let asked=false;c.appConfirm=async()=>{asked=true;return true;};
    node('sealed-bid-input').value=value;await c.submitSealedBid();
    assert.equal(asked,false);assert.equal(messages.length,0);assert.equal(c.playerSealedSubmitted,false);
  }
});
test('zero is submitted as zero with an explicit withdrawal confirmation',async()=>{
  const {c,node,messages}=fixture();node('sealed-bid-input').value='0';let prompt='';
  c.appConfirm=async text=>{prompt=text;return true;};await c.submitSealedBid();
  assert.match(prompt,/rinuncia/);assert.equal(messages[0].payload.amount,0);
});
test('confirmation cannot submit a different round or player, an expired bid or a changed budget',async()=>{
  for(const change of [
    (c,n)=>{c.playerSealedToken='round2';},
    (c,n)=>{c.currentAuctionPlayer={Id:'p2',R:'P'};},
    (c,n)=>{c.playerSealedMode=false;},
    (c,n)=>{n('sealed-bid-input').disabled=true;},
    (c,n)=>{n('player-countdown').textContent='0';},
    (c,n)=>{c.maxBidForTeam=()=>9;}
  ]){
    const {c,node,messages}=fixture();node('sealed-bid-input').value='10';
    c.appConfirm=async()=>{change(c,node);return true;};await c.submitSealedBid();
    assert.equal(messages.length,0);assert.equal(c.playerSealedSubmitted,false);
  }
});
test('double click while confirming cannot open another confirmation or send another bid',async()=>{
  const {c,node,messages}=fixture();node('sealed-bid-input').value='10';
  let resolve,asked=0;c.appConfirm=()=>{asked++;return new Promise(r=>resolve=r);};
  const first=c.submitSealedBid();await c.submitSealedBid();resolve(true);await first;
  assert.equal(asked,1);assert.equal(messages.length,1);
});
test('host rejects invalid amounts and over-budget messages independently of the player UI',async()=>{
  for(const amount of ['',-1,1.5,'12foo',101,null]){
    const {c,messages}=fixture();await c.receiveSealedBid({token:'round1',team_id:'t1',amount});
    assert.equal(c.sealedBids.size,0);assert.equal(messages[0].event,'sealed_bid_rejected');
  }
});
test('host counts zero withdrawals once; they never win or enter a tie',async()=>{
  const {c,messages}=fixture();
  await c.receiveSealedBid({token:'round1',team_id:'t1',amount:0});
  await c.receiveSealedBid({token:'round1',team_id:'t1',amount:10});
  assert.equal(c.sealedBids.size,1);assert.equal(c.sealedBids.get('t1').amount,0);
  await c.receiveSealedBid({token:'round1',team_id:'t2',amount:'0'});
  assert.equal(c.ended,true);assert.equal(c.normalizeSealedRanking([...c.sealedBids.values()]).length,0);
  assert.equal(messages.filter(m=>m.event==='sealed_bid_count').at(-1).payload.count,2);
  const ranking=c.normalizeSealedRanking([{team_id:'t1',amount:0},{team_id:'t2',amount:1}]);
  assert.equal(ranking.length,1);assert.equal(ranking[0].team_id,'t2');
});
test('host cannot accept bids at or after deadline, during opening, for old rounds or excluded teams',async()=>{
  for(const change of [f=>f.setNow(2000),f=>f.setNow(2001),f=>f.c.sealedEnding=true,
    f=>f.c.sealedAuctionToken='round2',f=>f.c.sealedEligibleIds=['t2']]){
    const f=fixture();change(f);await f.c.receiveSealedBid({token:'round1',team_id:'t1',amount:1});
    assert.equal(f.c.sealedBids.size,0);
  }
  const f=fixture();f.setNow(1999);await f.c.receiveSealedBid({token:'round1',team_id:'t1',amount:100});
  assert.equal(f.c.sealedBids.get('t1').amount,100);
});
