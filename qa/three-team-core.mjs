import { chromium } from 'playwright';
import {report,step,check,watch,snap,loginAuctioneer,loginPlayer,finishReport} from './live-lib.mjs';
const browser=await chromium.launch({headless:true});
let ac=null,a=null;const ps=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function mgOpen(){await a.evaluate(()=>openRoomControl(true));await a.locator('#screen-room-control.active').waitFor();}
async function mgClose(){await a.evaluate(()=>closeRoomControl());await a.locator('#screen-auctioneer-board.active').waitFor();}
async function toggle(id,want){const e=a.locator('#'+id);if((await e.isChecked())!==want){await e.click();await sleep(600);}}
async function setup(){
  await mgOpen();
  for(const name of ['QA Alfa','QA Beta','QA Gamma']){
    if(!(await a.locator('#control-team-list').getByText(name,{exact:true}).count())){await a.locator('#control-new-team-name').fill(name);await a.getByRole('button',{name:/Aggiungi squadra/i}).click();await sleep(650);}
  }
  await a.locator('#control-room-timer').fill('8');await a.locator('#control-room-prep').fill('2');await a.locator('#control-sealed-timer').fill('8');await a.locator('#control-sealed-reveal-timer').fill('2');
  await toggle('ready-toggle-btn',false);await toggle('nomination-toggle-btn',false);if(!(await a.locator('#self-raise-toggle').isChecked()))await a.locator('#self-raise-toggle').click();
  await a.getByRole('button',{name:/Salva impostazioni/i}).click();await sleep(700);await snap(a,'core-management');await mgClose();step('Configurazione QA e 3 squadre create');
}
async function nextPlayer(){await a.evaluate(()=>{if(typeof backToList==='function')backToList();});await sleep(300);const id=await a.evaluate(()=>String(playersList.find(p=>!auctionedPlayerIds.has(String(p.Id)))?.Id||''));if(!id)throw new Error('Nessun giocatore disponibile');await a.evaluate(id=>selectAndStartPlayer(id),id);return id;}
async function bidReady(p){await p.page.waitForFunction(()=>{const b=document.querySelector('.btn-plus-1');return b&&b.offsetParent!==null&&!b.disabled;},null,{timeout:16000});}
async function roundEnd(){await sleep(10500);}
async function normal(){
  await nextPlayer();await snap(a,'core-normal-prep-banditore');await bidReady(ps[0]);await snap(ps[0].page,'core-normal-prep-player');
  await ps[0].page.locator('.btn-plus-1').click();await sleep(650);await ps[1].page.locator('.btn-plus-5').click();await sleep(650);await ps[2].page.locator('.btn-plus-10').click();await sleep(650);
  const v1=Number(await ps[2].page.locator('#player-current-value').textContent());await ps[2].page.locator('.btn-plus-1').click();await sleep(650);const v2=Number(await ps[2].page.locator('#player-current-value').textContent());check('Autorilancio attivo',v2>v1,`${v1}→${v2}`);await snap(ps[2].page,'core-normal-winning');await snap(ps[0].page,'core-normal-losing');
  await ps[0].page.waitForFunction(()=>document.getElementById('player-countdown')?.textContent.trim()==='3',null,{timeout:12000});const t=await ps[0].page.evaluate(()=>{const e=document.getElementById('player-countdown');return [e.className,getComputedStyle(e).color];});check('Timer giocatore 3→0 rosso',t[0].includes('liveasta-last3')&&t[1].includes('255, 51, 79'),t.join(' '));await snap(ps[0].page,'core-timer-3');await roundEnd();step('Asta normale completata');
}
async function ready(){
  await mgOpen();await toggle('ready-toggle-btn',true);await mgClose();await nextPlayer();for(const p of ps)await p.page.locator('#player-ready-choice-controls').waitFor({state:'visible',timeout:12000});await snap(a,'core-ready-banditore');await snap(ps[0].page,'core-ready-player');
  await ps[0].page.locator('#player-ready-choice-ready').click();await ps[1].page.locator('#player-ready-choice-ready').click();await ps[2].page.locator('#player-ready-choice-skip').click();await bidReady(ps[2]);check('SKIP partecipa se almeno uno READY',await ps[2].page.locator('.btn-plus-1').isEnabled());await ps[2].page.locator('.btn-plus-2').click();await roundEnd();step('READY/SKIP completato');
}
async function allSkip(){
  await nextPlayer();for(const p of ps)await p.page.locator('#player-ready-choice-controls').waitFor({state:'visible',timeout:12000});for(const p of ps)await p.page.locator('#player-ready-choice-skip').click();await sleep(1800);const active=await a.evaluate(()=>isAuctionActive);check('Tutti SKIP = invenduto immediato',active===false);await snap(a,'core-all-skip');step('Tutti SKIP completato');
}
async function nomination(){
  await mgOpen();await toggle('ready-toggle-btn',false);await toggle('nomination-toggle-btn',true);await mgClose();await sleep(900);let n=null;for(const p of ps){if(await p.page.locator('#player-nominate-btn').isVisible()){n=p;break;}}if(!n){await a.evaluate(()=>recalculateNominationTurn());await sleep(700);for(const p of ps){if(await p.page.locator('#player-nominate-btn').isVisible()){n=p;break;}}}
  check('Turno banditura assegnato',!!n);if(!n)throw new Error('Turno non assegnato');await snap(a,'core-nomination-banditore');await n.page.locator('#player-nominate-btn').click();await n.page.locator('#nomination-picker-overlay').waitFor({state:'visible'});await snap(n.page,'core-nomination-picker');const badge=n.page.locator('#nomination-candidates .role-badge').first();if(await badge.count()){const b=await badge.boundingBox();check('Badge ruolo tondo',!!b&&Math.abs(b.width-b.height)<2,b?`${b.width}x${b.height}`:'');}
  await n.page.locator('#nomination-candidates > *').first().click();await bidReady(ps[0]);const bidder=ps.find(x=>x!==n)||ps[0];if(await bidder.page.locator('.btn-plus-1').isEnabled())await bidder.page.locator('.btn-plus-1').click();await snap(a,'core-nomination-auction');await roundEnd();step('Banditura a turni completata');
}
async function sealed(){
  await mgOpen();await toggle('nomination-toggle-btn',false);await toggle('ready-toggle-btn',false);await mgClose();await a.evaluate(()=>{if(typeof backToList==='function')backToList();});await sleep(350);await a.locator('#toolbar-sealed-mode-btn').click();await sleep(250);await a.locator('#players-tbody tr').first().click();await sleep(500);if(await a.locator('#sealed-player-picker-overlay').isVisible()){const s=a.locator('#sealed-player-select');if(!(await s.inputValue()))await s.selectOption({index:1});await a.getByRole('button',{name:/Avvia busta chiusa/i}).click();}
  for(const p of ps)await p.page.locator('#sealed-bid-input').waitFor({state:'visible',timeout:12000});await snap(a,'core-sealed-delivery');const vals=[7,11,15];for(let i=0;i<3;i++){await ps[i].page.locator('#sealed-bid-input').fill(String(vals[i]));await ps[i].page.locator('#sealed-bid-submit').click();await sleep(200);}await snap(ps[1].page,'core-sealed-submitted');await sleep(8500);await snap(a,'core-sealed-reveal');await sleep(2600);await snap(a,'core-sealed-result');const txt=(await a.locator('body').innerText()).toUpperCase();check('Busta chiusa produce esito',/BUST|CLASSIF|AGGIUDIC|15/.test(txt));step('Busta chiusa completata');
}
try{
  ac=await browser.newContext({viewport:{width:1440,height:900}});a=await ac.newPage();watch(a,'banditore');await loginAuctioneer(a,'Computer');await setup();ps.push(await loginPlayer(browser,'QA Alfa','111111',1));ps.push(await loginPlayer(browser,'QA Beta','222222',2));ps.push(await loginPlayer(browser,'QA Gamma','333333',3));await sleep(1000);const on=await a.locator('#auction-online-count').textContent();check('3/3 online',/3\s*\/\s*3/.test(on||''),on||'');await normal();await ready();await allSkip();await nomination();await sealed();
}catch(e){report.errors.push({type:'fatal',message:e?.stack||String(e)});step('Core QA interrotto','FAIL',String(e));}
finally{for(const p of ps)try{await p.page.evaluate(()=>leaveCurrentSession());await p.ctx.close();}catch{}try{if(a)await a.evaluate(()=>leaveCurrentSession());if(ac)await ac.close();}catch{}await finishReport();await browser.close();}
if(report.errors.length)process.exitCode=1;
