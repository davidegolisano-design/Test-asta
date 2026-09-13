import { chromium } from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('qa-output',{recursive:true});
const SITE='https://davidegolisano-design.github.io/Test-asta/';
const ROOM='Test';
const PASS='1111';
let frames=0;
const issues=[];
function watch(page,label){
  page.on('pageerror',e=>issues.push({label,type:'pageerror',message:String(e)}));
  page.on('console',m=>{if(m.type()==='error')issues.push({label,type:'console',message:m.text()})});
  page.on('websocket',ws=>{if(/supabase|realtime/i.test(ws.url())){ws.on('framesent',()=>frames++);ws.on('framereceived',()=>frames++);}});
}
async function shot(page,name){await page.screenshot({path:`qa-output/${name}.png`,fullPage:true});}
async function selectByText(page,selector,text){
  await page.locator(selector).waitFor({state:'visible',timeout:20000});
  await page.waitForFunction(([sel,txt])=>[...(document.querySelector(sel)?.options||[])].some(o=>o.textContent.includes(txt)),[selector,text],{timeout:20000});
  const value=await page.locator(selector).locator('option').evaluateAll((opts,txt)=>opts.find(o=>o.textContent.includes(txt))?.value,text);
  await page.locator(selector).selectOption(value);
}
async function joinAuctioneer(page){
  await page.goto(SITE,{waitUntil:'networkidle',timeout:60000});
  await page.getByRole('button',{name:/Banditore/i}).click();
  await page.getByRole('button',{name:/Computer/i}).click();
  await page.getByRole('button',{name:/Entra in una stanza/i}).click();
  await selectByText(page,'#auction-room-select',ROOM);
  await page.locator('#auction-room-password').fill(PASS);
  for(let i=0;i<4;i++){
    if(await page.locator('#screen-auctioneer-board.active').count())break;
    const next=page.locator('#auction-wizard-next:visible, #btn-apri-plancia:visible').first();
    if(await next.count()){await next.click();await page.waitForTimeout(1200);}else break;
  }
  await page.locator('#screen-auctioneer-board.active').waitFor({timeout:20000});
}
async function joinPlayer(page){
  await page.goto(SITE,{waitUntil:'networkidle',timeout:60000});
  await page.getByRole('button',{name:/Giocatore/i}).click();
  await selectByText(page,'#player-room-select',ROOM);
  await page.locator('#player-room-password').fill(PASS);
  await page.locator('#player-wizard-next').click();
  await selectByText(page,'#player-team-select','REAL NAPOLI');
  await page.locator('#player-wizard-next').click();
  await page.locator('#player-pin-panel').waitFor({state:'visible',timeout:15000});
  await page.locator('#player-pin').fill('654321');
  if(await page.locator('#player-pin-confirm').isVisible())await page.locator('#player-pin-confirm').fill('654321');
  for(let i=0;i<3;i++){
    if(await page.locator('#screen-player-buzzer.active').count())break;
    const next=page.locator('#player-wizard-next:visible, #player-enter-btn:visible').first();
    if(await next.count()){await next.click();await page.waitForTimeout(1200);}else break;
  }
  await page.locator('#screen-player-buzzer.active').waitFor({timeout:20000});
}
const browser=await chromium.launch({headless:true});
let status='ok';
try{
  const ac=await browser.newContext({viewport:{width:1440,height:900}});
  const ap=await ac.newPage();watch(ap,'auctioneer');
  await joinAuctioneer(ap);await shot(ap,'session-auctioneer-board');
  const pc=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const pp=await pc.newPage();watch(pp,'player');
  await joinPlayer(pp);await shot(pp,'session-player-idle');
  await ap.getByRole('button',{name:/Gestione/i}).click();await ap.waitForTimeout(500);await shot(ap,'session-management');
  await pp.locator('#player-listone-btn').click();await pp.waitForTimeout(400);await shot(pp,'session-player-listone');
  await pp.evaluate(()=>closePlayerListone());
  await pc.close();await ac.close();
}catch(e){status='fail';issues.push({label:'runner',type:'fatal',message:e?.stack||String(e)});}
fs.writeFileSync('qa-output/session.json',JSON.stringify({status,frames,issues},null,2));
console.log(JSON.stringify({status,frames,issues}));
await browser.close();
if(status!=='ok')process.exit(1);