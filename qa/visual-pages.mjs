import { chromium } from 'playwright';
import {report,step,check,watch,snap,loginAuctioneer,loginPlayer,finishReport} from './live-lib.mjs';
const browser=await chromium.launch({headless:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ac=null,a=null,player=null;
async function staticPages(){
  const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();watch(p,'static-mobile');await p.goto('https://davidegolisano-design.github.io/Test-asta/',{waitUntil:'networkidle'});await snap(p,'visual-home-mobile');
  await p.getByRole('button',{name:/Banditore/i}).click();await snap(p,'visual-device-choice');await p.getByRole('button',{name:/Smartphone/i}).click();await snap(p,'visual-auctioneer-setup-mobile');
  await p.evaluate(()=>showScreen('screen-role'));await p.getByRole('button',{name:/Giocatore/i}).click();await snap(p,'visual-player-setup-step1');
  await p.evaluate(()=>showScreen('screen-role'));await p.evaluate(()=>openAdminLogin());await snap(p,'visual-settings');await p.evaluate(()=>openLiveAstaThemeMenu());await snap(p,'visual-theme-menu-dark');await p.evaluate(()=>setLiveAstaTheme('light-neutral'));await snap(p,'visual-theme-menu-light');await p.evaluate(()=>closeLiveAstaThemeMenu());await p.getByRole('button',{name:/SUPERUSER/i}).click();await snap(p,'visual-superuser-login');await c.close();step('Pagine accesso/impostazioni analizzate');
}
async function managementPages(){
  await a.evaluate(()=>openRoomControl(true));await a.locator('#screen-room-control.active').waitFor();await snap(a,'visual-management-desktop');
  const first=a.locator('#control-team-list > *').first();if(await first.count()){const arrow=first.locator('button').last();if(await arrow.count()){await arrow.click();await sleep(250);if(await a.locator('#management-team-detail').isVisible()){await snap(a,'visual-team-detail');await a.evaluate(()=>closeManagementTeamDetail());}}}
  await a.evaluate(()=>openAudioMixer());await sleep(250);await snap(a,'visual-audio-mixer');await a.evaluate(()=>closeAudioMixer());
  await a.evaluate(()=>openCsvRosterImport());await sleep(250);await snap(a,'visual-csv-import');await a.evaluate(()=>closeCsvRosterImport());await a.evaluate(()=>closeRoomControl());step('Gestione desktop e modali analizzati');
}
async function playerPages(){
  const p=player.page;await snap(p,'visual-player-idle');await p.locator('#player-listone-btn').click();await sleep(250);await snap(p,'visual-player-listone');await p.evaluate(()=>closePlayerListone());
  await p.evaluate(()=>openPlayerBudgetManager());await sleep(250);await snap(p,'visual-player-budget');await p.evaluate(()=>closePlayerBudgetManager());
  await p.evaluate(()=>togglePlayerRoster(true));await sleep(250);await snap(p,'visual-player-roster');await p.evaluate(()=>togglePlayerRoster(false));
  await p.evaluate(()=>openPlayerRoomOverview());await sleep(250);await snap(p,'visual-room-overview');await p.evaluate(()=>closePlayerRoomOverview());
  await p.evaluate(()=>openPlayerAvailabilityModal());await sleep(250);await snap(p,'visual-availability');await p.evaluate(()=>closePlayerAvailabilityModal());step('Pagine/overlay giocatore analizzati');
}
async function rosters(){await a.evaluate(()=>openAllRosters());await sleep(300);await snap(a,'visual-all-rosters');await a.evaluate(()=>closeAllRosters());}
async function mobileBanditore(){
  await player.page.evaluate(()=>leaveCurrentSession()).catch(()=>{});await player.ctx.close();player=null;await a.evaluate(()=>leaveCurrentSession()).catch(()=>{});await ac.close();ac=null;a=null;await sleep(1200);
  const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();watch(p,'banditore-mobile');await loginAuctioneer(p,'Smartphone');await snap(p,'visual-banditore-mobile-list');await p.evaluate(()=>openRoomControl(true));await sleep(300);await snap(p,'visual-management-mobile');await p.evaluate(()=>closeRoomControl());await p.evaluate(()=>leaveCurrentSession()).catch(()=>{});await c.close();step('Banditore smartphone analizzato');
}
try{
  await staticPages();ac=await browser.newContext({viewport:{width:1440,height:900}});a=await ac.newPage();watch(a,'visual-banditore');await loginAuctioneer(a,'Computer');await snap(a,'visual-banditore-desktop-list');await managementPages();player=await loginPlayer(browser,'QA Alfa','111111',9);await playerPages();await rosters();await mobileBanditore();
  const bad=report.audits.filter(x=>x.horizontalOverflow);check('Nessun overflow orizzontale globale nelle pagine controllate',bad.length===0,bad.map(x=>x.name).join(','));
}catch(e){report.errors.push({type:'fatal-visual',message:e?.stack||String(e)});step('Visual QA interrotto','FAIL',String(e));}
finally{try{if(player)await player.ctx.close();}catch{}try{if(ac)await ac.close();}catch{}await finishReport();await browser.close();}
if(report.errors.length)process.exitCode=1;
