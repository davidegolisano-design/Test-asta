import fs from 'node:fs';
export const SITE='https://davidegolisano-design.github.io/Test-asta/';
export const ROOM='QA10P5T';
export const ROOM_PASS='testqa';
export const OUT='qa-output';
export const RT_LIMIT=10000;
fs.mkdirSync(OUT,{recursive:true});
export const report={startedAt:new Date().toISOString(),frames:0,limit:RT_LIMIT,steps:[],errors:[],audits:[],checks:[]};
export function step(name,status='PASS',detail=''){report.steps.push({name,status,detail});console.log(`${status} ${name}${detail?' — '+detail:''}`);}
export function check(name,ok,detail=''){report.checks.push({name,ok,detail});if(!ok)report.errors.push({type:'check',name,detail});console.log(`${ok?'PASS':'FAIL'} CHECK ${name}${detail?' — '+detail:''}`);return ok;}
export function watch(page,label){
  page.on('pageerror',e=>report.errors.push({label,type:'pageerror',message:String(e),stack:e?.stack||''}));
  page.on('console',m=>{if(m.type()==='error')report.errors.push({label,type:'console',message:m.text()});});
  page.on('websocket',ws=>{
    if(!/supabase|realtime/i.test(ws.url()))return;
    const count=()=>{report.frames++;if(report.frames>RT_LIMIT){report.errors.push({type:'safety',message:`Realtime safety limit exceeded: ${report.frames}`});process.exitCode=2;}};
    ws.on('framesent',count);ws.on('framereceived',count);
  });
}
export function guard(){if(report.frames>RT_LIMIT)throw new Error(`Realtime safety stop ${report.frames}/${RT_LIMIT}`);}
export async function shot(page,name){guard();const path=`${OUT}/${name}.png`;await page.screenshot({path,fullPage:true});return path;}
export async function audit(page,name){
  guard();
  const data=await page.evaluate(()=>{
    const vis=[...document.querySelectorAll('body *')].filter(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>2&&r.height>2;});
    const bad=[];
    for(const el of vis){const r=el.getBoundingClientRect();if(r.left<-4||r.right>innerWidth+4){const p=el.parentElement?getComputedStyle(el.parentElement):null;if(!(p&&['auto','scroll'].includes(p.overflowX))){bad.push({tag:el.tagName,id:el.id,cls:String(el.className||'').slice(0,80),l:Math.round(r.left),r:Math.round(r.right)});if(bad.length>=15)break;}}}
    const tiny=[];for(const el of vis.filter(e=>['BUTTON','INPUT','SELECT'].includes(e.tagName))){const r=el.getBoundingClientRect();if(r.width<32||r.height<32){tiny.push({tag:el.tagName,id:el.id,cls:String(el.className||'').slice(0,60),w:Math.round(r.width),h:Math.round(r.height)});if(tiny.length>=15)break;}}
    return {viewport:[innerWidth,innerHeight],scrollWidth:document.documentElement.scrollWidth,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+4,outside:bad,tiny};
  });
  report.audits.push({name,...data});return data;
}
export async function snap(page,name){await shot(page,name);return audit(page,name);}
export async function selectText(page,selector,text){
  const el=page.locator(selector);await el.waitFor({state:'visible',timeout:25000});
  await page.waitForFunction(([sel,txt])=>[...(document.querySelector(sel)?.options||[])].some(o=>o.textContent.trim()===txt||o.textContent.includes(txt)),[selector,text],{timeout:25000});
  const val=await el.locator('option').evaluateAll((opts,txt)=>opts.find(o=>o.textContent.trim()===txt||o.textContent.includes(txt))?.value,text);if(!val)throw new Error(`Option not found ${selector}: ${text}`);await el.selectOption(val);
}
export async function waitListone(page){await page.waitForFunction(()=>/✅|532/.test(document.querySelector('#excel-status')?.textContent||''),null,{timeout:30000});}
export async function loginAuctioneer(page,mode='Computer'){
  await page.goto(SITE,{waitUntil:'networkidle',timeout:60000});
  await page.getByRole('button',{name:/Banditore/i}).click();
  await page.getByRole('button',{name:new RegExp(mode,'i')}).click();
  await page.getByRole('button',{name:/Entra in una stanza/i}).click();await waitListone(page);
  await selectText(page,'#auction-room-select',ROOM);await page.locator('#auction-room-password').fill(ROOM_PASS);
  await page.locator('#auction-wizard-next:visible, #btn-apri-plancia:visible').first().click();await page.waitForTimeout(1200);
  if(!(await page.locator('#screen-auctioneer-board.active').count())){
    const err=(await page.locator('#auction-room-error').textContent())||'';
    if(/riprova|banditore/i.test(err)){await page.waitForTimeout(47000);await selectText(page,'#auction-room-select',ROOM);await page.locator('#auction-room-password').fill(ROOM_PASS);await page.locator('#auction-wizard-next:visible, #btn-apri-plancia:visible').first().click();}
  }
  await page.locator('#screen-auctioneer-board.active').waitFor({timeout:25000});step(`Banditore ${mode} collegato`);
}
export async function loginPlayer(browser,name,pin,index){
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await ctx.newPage();watch(page,name);
  await page.goto(SITE,{waitUntil:'networkidle',timeout:60000});await page.getByRole('button',{name:/Giocatore/i}).click();
  await selectText(page,'#player-room-select',ROOM);await page.locator('#player-room-password').fill(ROOM_PASS);await page.locator('#player-wizard-next').click();await page.waitForTimeout(600);
  await selectText(page,'#player-team-select',name);await page.locator('#player-wizard-next').click();await page.waitForTimeout(700);
  const pi=page.locator('#player-pin');await pi.waitFor({state:'visible',timeout:15000});await pi.fill(pin);const pc=page.locator('#player-pin-confirm');if(await pc.isVisible())await pc.fill(pin);
  for(let i=0;i<3;i++){if(await page.locator('#screen-player-buzzer.active').count())break;const b=page.locator('#player-wizard-next:visible,#player-enter-btn:visible').first();if(await b.count()){await b.click();await page.waitForTimeout(900);}}
  await page.locator('#screen-player-buzzer.active').waitFor({timeout:20000});step(`${name} collegata`);await snap(page,`player-${index}-idle`);return {ctx,page,name,pin,index};
}
export async function finishReport(){report.finishedAt=new Date().toISOString();fs.writeFileSync(`${OUT}/report.json`,JSON.stringify(report,null,2));const lines=['# LIVEASTA v1.0 — QA 3 squadre','',`Realtime frames osservati: **${report.frames} / ${report.limit}**`,'',`Errori: **${report.errors.length}**`,'','## Passaggi',...report.steps.map(x=>`- ${x.status} — ${x.name}${x.detail?`: ${x.detail}`:''}`),'','## Controlli',...report.checks.map(x=>`- ${x.ok?'PASS':'FAIL'} — ${x.name}${x.detail?`: ${x.detail}`:''}`),'','## Audit grafici',...report.audits.map(x=>`- ${x.name}: ${x.viewport.join('×')}; overflow=${x.horizontalOverflow}; fuori viewport=${x.outside.length}; controlli <32px=${x.tiny.length}`),'','## Errori',...(report.errors.length?report.errors.map(e=>`- ${e.label||e.type}: ${e.message||e.name||''} ${e.detail||''}`):['- Nessuno'])];fs.writeFileSync(`${OUT}/REPORT.md`,lines.join('\n'));}
