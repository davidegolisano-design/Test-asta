import { chromium } from 'playwright';

const BASE='http://127.0.0.1:4173/dev/';
const ROOM_ID='04ac31db-0959-4e14-a156-c20edaf55de6';
const ROOM_NAME='E2E_RT_20260912_2216';
const ROOM_PASSWORD='rt-test-2216';
const PLAYERS=[
  {name:'E2E Alpha',id:'4860dff6-fc23-4b80-9931-8c240f8cb2f7',pin:'111111'},
  {name:'E2E Beta',id:'b83c8edd-9afc-4fb4-9ef4-c3ce8af0794c',pin:'222222'}
];

const browser=await chromium.launch({headless:true});
const contexts=[];
const report={steps:[],errors:[],ws:{sent:0,received:0}};
const mark=(name,ok,detail='')=>{report.steps.push({name,ok,detail});console.log(`${ok?'OK':'FAIL'} ${name}${detail?': '+detail:''}`);};

function wire(page,label){
  page.on('pageerror',e=>report.errors.push(`${label}: ${e.message}`));
  page.on('websocket',ws=>{
    ws.on('framesent',()=>report.ws.sent++);
    ws.on('framereceived',()=>report.ws.received++);
  });
}

async function newPage(label,width=390,height=844){
  const c=await browser.newContext({viewport:{width,height}}); contexts.push(c);
  const p=await c.newPage(); wire(p,label);
  await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
  await p.waitForFunction(()=>typeof roomsCache!=='undefined' && roomsCache.length>=1,{timeout:30000});
  await p.waitForFunction(name=>roomsCache.some(r=>r.name===name),ROOM_NAME,{timeout:30000});
  return {c,p};
}

async function loginAuctioneer(){
  const {c,p}=await newPage('auctioneer',1280,800);
  await p.evaluate(()=>setDeviceMode('pc'));
  await p.evaluate(()=>setAuctioneerRoomMode('join'));
  await p.locator('#auction-room-select').selectOption(ROOM_ID);
  await p.locator('#auction-room-password').fill(ROOM_PASSWORD);
  await p.evaluate(async()=>{ await joinAsAuctioneer(); });
  const err=await p.locator('#auction-room-error').innerText().catch(()=>"");
  if(err) console.log('AUCTIONEER_ERROR '+err);
  await p.waitForFunction(()=>document.querySelector('#screen-auctioneer-board')?.classList.contains('active'),{timeout:15000});
  mark('Banditore entra nella stanza',true);
  return {c,p};
}

async function loginPlayer(def,label){
  const {c,p}=await newPage(label);
  const result=await p.evaluate(async ({roomId,password,teamId,pin})=>{
    const roomSel=document.querySelector('#player-room-select');
    roomSel.value=roomId;
    const pass=document.querySelector('#player-room-password');
    pass.value=password;
    await refreshPlayerTeamChoices();
    const teamSel=document.querySelector('#player-team-select');
    teamSel.value=teamId;
    await handlePlayerTeamSelection();
    const pinEl=document.querySelector('#player-pin'); if(pinEl)pinEl.value=pin;
    const pin2=document.querySelector('#player-pin-confirm'); if(pin2)pin2.value=pin;
    await joinAsPlayer();
    return {error:document.querySelector('#player-room-error')?.textContent||'',pinError:document.querySelector('#player-pin-error')?.textContent||''};
  },{roomId:ROOM_ID,password:ROOM_PASSWORD,teamId:def.id,pin:def.pin});
  if(result.error||result.pinError) console.log('PLAYER_JOIN_DETAIL '+JSON.stringify({name:def.name,...result}));
  await p.waitForFunction(()=>document.querySelector('#screen-player-buzzer')?.classList.contains('active'),{timeout:15000});
  await p.waitForFunction(()=>document.querySelector('#player-connection-text')?.textContent?.trim()==='ONLINE',{timeout:15000});
  mark(`${def.name} entra ed è ONLINE`,true);
  return {c,p};
}

try{
  const auctioneer=await loginAuctioneer();
  const alpha=await loginPlayer(PLAYERS[0],'alpha');
  const beta=await loginPlayer(PLAYERS[1],'beta');
  await auctioneer.p.waitForTimeout(1200);
  const onlineText=await auctioneer.p.locator('body').innerText();
  const seesAlpha=onlineText.includes('E2E Alpha');
  const seesBeta=onlineText.includes('E2E Beta');
  mark('Banditore riceve presenza giocatori',seesAlpha&&seesBeta,`alpha=${seesAlpha} beta=${seesBeta}`);
  if(!(seesAlpha&&seesBeta)) throw new Error('auctioneer did not render both online teams');
  await beta.c.close();
  mark('Beta disconnesso',true);
  await auctioneer.p.waitForTimeout(1800);
  await loginPlayer(PLAYERS[1],'beta-reconnect');
  await auctioneer.p.waitForTimeout(1200);
  const onlineAfter=await auctioneer.p.locator('body').innerText();
  const reconnectVisible=onlineAfter.includes('E2E Beta');
  mark('Beta rientra dopo disconnessione',reconnectVisible);
  if(!reconnectVisible) throw new Error('beta reconnect not visible to auctioneer');
  const playerState=await alpha.p.evaluate(()=>({room:document.querySelector('#player-room-inline')?.textContent,team:document.querySelector('#display-team-name')?.textContent,status:document.querySelector('#player-connection-text')?.textContent}));
  mark('Identità giocatore coerente',playerState.team==='E2E Alpha' && playerState.status==='ONLINE',JSON.stringify(playerState));
  if(report.errors.length) throw new Error('Page errors: '+report.errors.join(' | '));
  console.log('E2E_REPORT '+JSON.stringify(report));
} catch(e){
  report.errors.push(String(e?.stack||e));
  console.log('E2E_REPORT '+JSON.stringify(report));
  throw e;
} finally {
  for(const c of contexts) await c.close().catch(()=>{});
  await browser.close();
}
