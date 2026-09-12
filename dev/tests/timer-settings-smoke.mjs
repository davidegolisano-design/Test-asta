import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];
page.on('pageerror',e=>errors.push(String(e?.stack||e)));
function assert(c,m){if(!c)throw new Error(m);}

try{
  await page.goto('http://127.0.0.1:4173/dev/index.html?timer-settings-smoke=1',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(900);
  const r=await page.evaluate(async()=>{
    const oldRoom=currentRoom;
    const oldRoomId=currentRoomId;
    const oldPrep=auctionPrepSeconds;
    const oldSealed=sealedTimerSeconds;
    const oldReveal=sealedRevealSeconds;
    try{
      currentRoomId='room-xyz';
      const keys={
        prep:auctionPrepStateKey(),
        sealed:sealedTimerStateKey(),
        reveal:sealedRevealStateKey()
      };
      currentRoom={prep_seconds:'0',sealed_timer_seconds:'2',sealed_reveal_seconds:'0'};
      const low={
        prep:await loadAuctionPrepSeconds(),
        sealed:await loadSealedTimerSeconds(),
        reveal:await loadSealedRevealSeconds()
      };
      currentRoom={prep_seconds:'99',sealed_timer_seconds:'999',sealed_reveal_seconds:'99'};
      const high={
        prep:await loadAuctionPrepSeconds(),
        sealed:await loadSealedTimerSeconds(),
        reveal:await loadSealedRevealSeconds()
      };
      currentRoom={prep_seconds:'x',sealed_timer_seconds:'x',sealed_reveal_seconds:'x'};
      const fallback={
        prep:await loadAuctionPrepSeconds(),
        sealed:await loadSealedTimerSeconds(),
        reveal:await loadSealedRevealSeconds()
      };
      const saved={
        prepLow:await saveAuctionPrepSeconds(-5),
        prepHigh:await saveAuctionPrepSeconds(88),
        sealedLow:await saveSealedTimerSeconds(1),
        sealedHigh:await saveSealedTimerSeconds(999),
        revealLow:await saveSealedRevealSeconds(-2),
        revealHigh:await saveSealedRevealSeconds(99)
      };
      return {keys,low,high,fallback,saved,types:[
        typeof auctionPrepStateKey,typeof loadAuctionPrepSeconds,typeof saveAuctionPrepSeconds,
        typeof sealedTimerStateKey,typeof loadSealedTimerSeconds,typeof saveSealedTimerSeconds,
        typeof sealedRevealStateKey,typeof loadSealedRevealSeconds,typeof saveSealedRevealSeconds
      ]};
    } finally {
      currentRoom=oldRoom;currentRoomId=oldRoomId;
      auctionPrepSeconds=oldPrep;sealedTimerSeconds=oldSealed;sealedRevealSeconds=oldReveal;
    }
  });
  assert(r.types.every(x=>x==='function'),'Timer setting function missing');
  assert(JSON.stringify(r.keys)===JSON.stringify({prep:'auction_prep_room-xyz',sealed:'sealed_timer_room-xyz',reveal:'sealed_reveal_timer_room-xyz'}),'Timer state keys changed: '+JSON.stringify(r.keys));
  assert(JSON.stringify(r.low)===JSON.stringify({prep:1,sealed:5,reveal:1}),'Timer lower clamps changed: '+JSON.stringify(r.low));
  assert(JSON.stringify(r.high)===JSON.stringify({prep:15,sealed:180,reveal:30}),'Timer upper clamps changed: '+JSON.stringify(r.high));
  assert(JSON.stringify(r.fallback)===JSON.stringify({prep:5,sealed:30,reveal:5}),'Timer fallback defaults changed: '+JSON.stringify(r.fallback));
  assert(JSON.stringify(r.saved)===JSON.stringify({prepLow:1,prepHigh:15,sealedLow:5,sealedHigh:180,revealLow:1,revealHigh:30}),'Timer save clamps changed: '+JSON.stringify(r.saved));
  assert(errors.length===0,'Page errors:\n'+errors.join('\n---\n'));
  console.log('LIVEASTA timer settings characterization: OK');
} finally {
  await browser.close();
}
