import fs from 'node:fs';

const mode=(process.env.QA_MODE||'classic').toLowerCase();
const mantra=mode==='mantra';
const p='qa/ten-player-stress.mjs';
let s=fs.readFileSync(p,'utf8');

const ROOM=mantra?'QA10M5T':'QA10P5T';
const PREFIX=mantra?'QA-MANTRA':'QA-STRESS';

s=s.replace("const ROOM='QA10P5T';",`const ROOM='${ROOM}';`);
s=s.replace("const names=Array.from({length:10},(_,i)=>`ST${RUN}-${String(i+1).padStart(2,'0')}`);",`const names=Array.from({length:10},(_,i)=>\`${PREFIX}-\${String(i+1).padStart(2,'0')}\`);`);

s=s.replace(
  "function watch(page,label){page.on('pageerror',e=>{report.errors.push({type:'pageerror',label,message:String(e)});console.log('PAGEERROR',label,String(e));});page.on('console',m=>{if(m.type()==='error'){const x={label,message:m.text()};report.console_errors.push(x);console.log('CONSOLE',label,m.text());}});page.on('websocket',ws=>{if(/supabase|realtime/i.test(ws.url())){ws.on('framesent',()=>report.frames++);ws.on('framereceived',()=>report.frames++);}});}",
  "function watch(page,label){page.on('pageerror',e=>{report.errors.push({type:'pageerror',label,message:String(e)});console.log('PAGEERROR',label,String(e));});page.on('console',m=>{if(m.type()==='error'){const x={label,message:m.text()};report.console_errors.push(x);console.log('CONSOLE',label,m.text());}});page.on('response',r=>{if(r.status()===409)console.log('HTTP409',label,r.request().method(),r.url());});page.on('websocket',ws=>{if(/supabase|realtime/i.test(ws.url())){ws.on('framesent',()=>report.frames++);ws.on('framereceived',()=>report.frames++);}});}");

s=s.replace(
  "await selectText(page,'#auction-room-select',ROOM);await page.locator('#auction-room-password').fill(PASS);",
  "await page.waitForTimeout(1800);await page.evaluate(room=>{const input=document.querySelector('#auction-room-name-input');if(input){input.value=room;input.dispatchEvent(new Event('input',{bubbles:true}));}const sel=document.querySelector('#auction-room-select');if(sel){const opt=[...sel.options].find(o=>o.textContent.includes(room));if(opt){sel.value=opt.value;sel.dispatchEvent(new Event('change',{bubbles:true}));}}},ROOM);await page.locator('#auction-room-password').fill(PASS);");

s=s.replace(
  "await page.getByRole('button',{name:/Giocatore/i}).click();await selectText(page,'#player-room-select',ROOM);await page.locator('#player-room-password').fill(PASS);",
  "await page.getByRole('button',{name:/Giocatore/i}).click();await page.waitForTimeout(1800);await page.evaluate(room=>{const input=document.querySelector('#player-room-name-input');if(input){input.value=room;input.dispatchEvent(new Event('input',{bubbles:true}));}const sel=document.querySelector('#player-room-select');if(sel){const opt=[...sel.options].find(o=>o.textContent.includes(room));if(opt){sel.value=opt.value;sel.dispatchEvent(new Event('change',{bubbles:true}));}}},ROOM);await page.locator('#player-room-password').fill(PASS);");

s=s.replace(
  "await page.locator('#auction-room-password').fill(PASS);await page.locator('#auction-wizard-next:visible,#btn-apri-plancia:visible').first().click();",
  "await page.locator('#auction-room-password').fill(PASS);await page.waitForFunction(()=>typeof playersList!=='undefined'&&Array.isArray(playersList)&&playersList.length>0,null,{timeout:30000});await page.locator('#auction-wizard-next:visible,#btn-apri-plancia:visible').first().click();");

if(mantra){
  s=s.replace(
    "step('Banditore collegato');}",
    "step('Banditore collegato');check('Stanza MANTRA valida',await page.evaluate(()=>isMantraRoom()&&firstIncompleteRole()==='ALL'&&mantraRosterMin()===23&&mantraMinGoalkeepers()===2&&listoneHasMantraRoles()));}");
}

s=s.replace(
  "await selectText(page,'#player-team-select',name);await page.locator('#player-wizard-next').click();await sleep(450);await page.locator('#player-pin').waitFor({state:'visible',timeout:15000});await page.locator('#player-pin').fill(pin);if(await page.locator('#player-pin-confirm').isVisible())await page.locator('#player-pin-confirm').fill(pin);for(let i=0;i<3&&!await page.locator('#screen-player-buzzer.active').count();i++){await page.locator('#player-wizard-next:visible,#player-enter-btn:visible').first().click();await sleep(750);}",
  "await selectText(page,'#player-team-select',name);await page.waitForFunction(()=>{const id=String(document.querySelector('#player-team-select')?.value||'');return id&&String(playerPinTeamId||'')===id&&['create','verify'].includes(String(playerPinMode||''));},null,{timeout:15000});await page.locator('#player-wizard-next').click();await page.locator('#player-pin').waitFor({state:'visible',timeout:15000});for(let i=0;i<3&&!await page.locator('#screen-player-buzzer.active').count();i++){await page.locator('#player-pin').fill(pin);const confirm=page.locator('#player-pin-confirm');if(await confirm.isVisible())await confirm.fill(pin);await page.evaluate(()=>window.playerAccessWizardNext?.());await sleep(1200);}");

s=s.replace(
  "await page.locator('#screen-player-buzzer.active').waitFor({timeout:20000});return {ctx,page,name,pin,index};",
  "try{await page.locator('#screen-player-buzzer.active').waitFor({timeout:35000});}catch(e){const diag=await page.evaluate(()=>({active:[...document.querySelectorAll('.screen.active')].map(x=>x.id),roomError:document.querySelector('#player-room-error')?.textContent||'',pinError:document.querySelector('#player-pin-error')?.textContent||'',step:document.querySelector('#player-wizard-step-label')?.textContent||'',team:document.querySelector('#player-team-select')?.value||'',pinMode:typeof playerPinMode==='undefined'?'':playerPinMode,pinLen:document.querySelector('#player-pin')?.value?.length||0}));console.log('LOGIN_DIAG',name,JSON.stringify(diag));await page.screenshot({path:`${OUT}/login-fail-${index+1}.png`,fullPage:true}).catch(()=>{});throw e;}return {ctx,page,name,pin,index};");

s=s.replace(
  "async function prepareTeams(a){await mgOpen(a);",
  "async function prepareTeams(a){await mgOpen(a);await a.evaluate(async()=>{const old=[...(purchasesCache||[])];for(const purchase of old){const {error}=await supabaseClient.rpc('fanta_remove_purchase',{p_purchase_id:purchase.id});if(error)throw new Error(error.message||'QA purchase reset failed');if(purchase?.player_id)auctionedPlayerIds.delete(String(purchase.player_id));}await saveAuctionedPlayers();readyGateWaiting=false;readyGateToken=null;readyPlayers=new Set();readySkipPlayers=new Set();readyOfflineExcludedIds=new Set();if(readyPresenceReconcileTimer){clearTimeout(readyPresenceReconcileTimer);readyPresenceReconcileTimer=null;}isAuctionActive=false;currentWinner='';currentAuctionValue=0;currentAuctionPlayer=null;if(timerInterval){clearInterval(timerInterval);timerInterval=null;}if(auctionPrepInterval){clearInterval(auctionPrepInterval);auctionPrepInterval=null;}if(sealedTimerInterval){clearInterval(sealedTimerInterval);sealedTimerInterval=null;}if(sealedRevealInterval){clearInterval(sealedRevealInterval);clearTimeout(sealedRevealInterval);sealedRevealInterval=null;}sealedAuctionModeActive=false;sealedEnding=false;sealedAuctionToken=null;sealedBids=new Map();sealedEligibleIds=[];sealedDeadlineAt=0;sealedRevealDeadlineAt=0;await saveReadyGateDedicated(false);await saveLiveAuctionState({phase:'idle',mode:'normal',player:null,winner:'',value:0,seconds:0,deadline_at:null,ready_token:null,ready_required_ids:[],ready_ids:[],skip_ids:[],sealed_submitted_ids:[]});await loadRoomState();});");

s=s.replace("await sleep(350);}}await a.locator('#control-room-timer')","await sleep(150);const ok=a.locator('#liveasta-alert-overlay button').last();if(await ok.isVisible())await ok.click();await sleep(150);}}await a.locator('#control-room-timer')");
s=s.replace("await a.getByRole('button',{name:/Salva impostazioni/i}).click();await sleep(700);await mgClose(a);","const conf=a.locator('#liveasta-confirm-overlay.open button').last();if(await conf.isVisible())await conf.click();await a.getByRole('button',{name:/Salva impostazioni/i}).click();await sleep(250);const saveOk=a.locator('#liveasta-alert-overlay button').last();if(await saveOk.isVisible())await saveOk.click();await sleep(450);await mgClose(a);");
s=s.replace("await a.evaluate(id=>selectAndStartPlayer(id),id);","await a.evaluate(id=>selectAndStartPlayer(id,true),id);");
s=s.replace("async function toggle(a,id,want){const e=a.locator('#'+id);if((await e.isChecked())!==want){await e.click();await sleep(500);}}","async function toggle(a,id,want){const e=a.locator('#'+id);if((await e.isChecked())!==want){await a.evaluate(([id,want])=>{const el=document.getElementById(id);if(!el)return;el.checked=want;el.dispatchEvent(new Event('change',{bubbles:true}));},[id,want]);await sleep(150);const confirm=a.locator('#liveasta-confirm-overlay.open button').last();if(await confirm.isVisible())await confirm.click();await sleep(700);}}");

s=s.replace(
  "for(const p of [ps[7],ps[8],ps[9]]){const ready=p.page.locator('#player-ready-choice-ready');if(await ready.isVisible())await ready.click();}await waitBid(ps[0]);",
  "for(const p of [ps[7],ps[8],ps[9]]){await p.page.locator('#player-ready-choice-controls').waitFor({state:'visible',timeout:15000});await p.page.locator('#player-ready-choice-ready').click();}await a.waitForFunction(()=>!readyGateWaiting,null,{timeout:20000});check('READY completato dopo rientri',await a.evaluate(()=>!readyGateWaiting));await waitBid(ps[0]);");

s=s.replace(
  "async function allSkip(a,ps){await nextPlayer(a);await Promise.all(ps.map(p=>p.page.locator('#player-ready-choice-controls').waitFor({state:'visible',timeout:15000})));await Promise.all(ps.map(p=>p.page.locator('#player-ready-choice-skip').click()));",
  "async function allSkip(a,ps){await nextPlayer(a);await sleep(700);const required=await a.evaluate(()=>readyRequiredIds().map(String));check('READY richiesto ad almeno una squadra',required.length>0,JSON.stringify(required));for(const p of ps){const id=await p.page.evaluate(()=>String(myTeamId||''));if(!required.includes(id))continue;await p.page.locator('#player-ready-choice-controls').waitFor({state:'visible',timeout:15000});await p.page.locator('#player-ready-choice-skip').click();}await a.waitForFunction(()=>!readyGateWaiting,null,{timeout:20000});");

s=s.replace("await sleep(1800);check('Tutti SKIP = invenduto',await a.evaluate(()=>!isAuctionActive));step('All SKIP');","await sleep(1800);check('Tutti SKIP = invenduto',await a.evaluate(()=>!isAuctionActive));const gate=await a.evaluate(()=>loadReadyGateState());check('READY gate chiuso dopo tutti SKIP',!gate?.active,JSON.stringify(gate));step('All SKIP');");
s=s.replace("const vals=await ps[0].page.evaluate(()=>[...document.querySelectorAll('.player-room-team-row')].map(r=>({t:r.textContent,m:r.classList.contains('mine')})));check('Crediti avversari nascosti',vals.filter(x=>!x.m).every(x=>!/Crediti\\s*\\d/i.test(x.t)),JSON.stringify(vals.slice(0,2)));","const vals=await ps[0].page.evaluate(()=>[...document.querySelectorAll('.player-room-team-row')].map(r=>{const stat=r.querySelector('.player-room-team-stats > span:first-child');return {m:r.classList.contains('mine'),hidden:!!stat&&getComputedStyle(stat).display==='none'};}));check('Crediti avversari nascosti',vals.filter(x=>!x.m).every(x=>x.hidden)&&vals.filter(x=>x.m).every(x=>!x.hidden),JSON.stringify(vals.slice(0,3)));");

if(mantra){
  s=s.replace("await ps[0].page.locator('#nomination-candidates > *').first().click();await waitBid(ps[1]);","await ps[0].page.locator('#nomination-candidates .nomination-player-row').first().click();await sleep(150);const nomConfirm=ps[0].page.locator('#liveasta-confirm-overlay.open button').last();if(await nomConfirm.isVisible())await nomConfirm.click();await a.waitForFunction(()=>isAuctionActive,null,{timeout:20000});check('Nomina MANTRA avvia asta',await a.evaluate(()=>isAuctionActive&&nominationState.role==='ALL'));await waitBid(ps[1]);");
}else{
  s=s.replace("await ps[0].page.locator('#nomination-candidates > *').first().click();await waitBid(ps[1]);","await ps[0].page.locator('#nomination-candidates .nomination-player-row').first().click();await sleep(150);const nomConfirm=ps[0].page.locator('#liveasta-confirm-overlay.open button').last();if(await nomConfirm.isVisible())await nomConfirm.click();await a.waitForFunction(()=>isAuctionActive,null,{timeout:20000});check('Nomina avvia asta',await a.evaluate(()=>isAuctionActive));await waitBid(ps[1]);");
}

s=s.replace("await a.locator('#players-tbody tr').first().click();await sleep(450);if(await a.locator('#sealed-player-picker-overlay').isVisible())","await a.locator('#players-tbody tr').first().click();await sleep(150);const sealedConfirm=a.locator('#liveasta-confirm-overlay.open button').last();if(await sealedConfirm.isVisible())await sealedConfirm.click();await sleep(450);if(await a.locator('#sealed-player-picker-overlay').isVisible())");

s=s.replace(
  "const persistedNine=await a.evaluate(()=>({size:sealedBids.size,ids:[...sealedBids.keys()].map(String),state:[...(liveAuctionState?.sealed_submitted_ids||[])].map(String)}));",
  "await a.waitForFunction(()=>sealedBids instanceof Map&&sealedBids.size===9&&Array.isArray(liveAuctionState?.sealed_submitted_ids)&&liveAuctionState.sealed_submitted_ids.length===9,null,{timeout:5000});const persistedNine=await a.evaluate(()=>({size:sealedBids.size,ids:[...sealedBids.keys()].map(String),state:[...(liveAuctionState?.sealed_submitted_ids||[])].map(String)}));");

fs.writeFileSync(p,s);
console.log(`Adapted stress harness for ${mode}: ${ROOM}`);
