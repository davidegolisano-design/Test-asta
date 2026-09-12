import { chromium } from 'playwright';

const base=process.env.LIVEASTA_SMOKE_URL || 'http://127.0.0.1:4173/dev/index.html?smoke=1';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const pageErrors=[];
const consoleErrors=[];
page.on('pageerror',err=>pageErrors.push(String(err?.stack||err)));
page.on('console',msg=>{ if(msg.type()==='error') consoleErrors.push(msg.text()); });

function assert(condition,message){ if(!condition) throw new Error(message); }

try{
  const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(1800);

  const title=await page.title();
  console.log('Smoke URL:',page.url());
  console.log('HTTP status:',response?.status());
  console.log('Document title:',JSON.stringify(title));
  assert(response && response.status()===200,'DEV index HTTP status is not 200');
  assert(/LIVEASTA DEV/.test(title),'DEV title missing');

  const marker=page.locator('#liveasta-dev-static-marker');
  await marker.waitFor({state:'visible',timeout:5000});
  assert((await marker.innerText()).includes('AMBIENTE DEV'),'DEV marker text missing');

  const bodyText=await page.locator('body').innerText();
  assert(!bodyText.includes('\\n\\n'),'Visible literal \\n\\n artifact detected');

  const role=page.locator('#screen-role');
  assert(await role.evaluate(el=>el.classList.contains('active')),'Home screen not active');
  await page.getByRole('button',{name:/Banditore/i}).click();
  await page.waitForTimeout(200);
  assert(await page.locator('#screen-device-choice').evaluate(el=>el.classList.contains('active')),'Device choice did not open');
  await page.getByRole('button',{name:/Indietro/i}).click();
  await page.waitForTimeout(200);
  assert(await role.evaluate(el=>el.classList.contains('active')),'Return to home from device choice failed');

  await page.getByRole('button',{name:/Giocatore/i}).click();
  await page.waitForTimeout(500);
  assert(await page.locator('#screen-player-setup').evaluate(el=>el.classList.contains('active')),'Player setup did not open');
  await page.locator('#player-wizard-back').click();
  await page.waitForTimeout(200);
  assert(await role.evaluate(el=>el.classList.contains('active')),'Return to home from player wizard failed');

  if(pageErrors.length) throw new Error('Page errors:\n'+pageErrors.join('\n---\n'));

  console.log('LIVEASTA browser smoke: OK');
  if(consoleErrors.length){
    console.log('Non-fatal console errors/warnings captured:');
    for(const e of consoleErrors.slice(0,20)) console.log('- '+e);
  }
} finally {
  await browser.close();
}
