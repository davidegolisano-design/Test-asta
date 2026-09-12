import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));

try{
  await page.goto('http://127.0.0.1:4173/dev/index.html?ui-fit-smoke=1',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1000);
  for(const name of ['fitTextToBox','fitNominationStageTeam','fitAuctionNames','installAuctionNameAutoFit']){
    const ok=await page.evaluate(n=>typeof window[n]==='function',name);
    if(!ok) throw new Error(name+' missing');
  }
  const result=await page.evaluate(()=>{
    const el=document.getElementById('winner-display');
    if(!el)return {missing:true};
    el.textContent='NOME GIOCATORE ESTREMAMENTE LUNGO PER TEST RESPONSIVE';
    fitAuctionNames();
    return {missing:false};
  });
  if(result.missing) throw new Error('winner-display missing');
  await page.waitForTimeout(100);
  const fontSize=await page.locator('#winner-display').evaluate(el=>getComputedStyle(el).fontSize);
  if(!fontSize || fontSize==='0px') throw new Error('winner-display fit not applied');
  if(errors.length) throw new Error('Page errors: '+errors.join(' | '));
  console.log('LIVEASTA UI fit browser smoke: OK');
} finally {
  await browser.close();
}
