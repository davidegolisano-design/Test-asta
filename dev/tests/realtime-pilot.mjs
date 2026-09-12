import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base='http://127.0.0.1:4173/dev/index.html?realtime-pilot=1';
const channelName='liveasta-realtime-pilot-'+Date.now();
const browser=await chromium.launch({headless:true});
const pages=[];
const frameStats=[];
const received=[];

function attachWsStats(page,index){
  const stat={index,ws:0,sentFrames:0,receivedFrames:0,sentBytes:0,receivedBytes:0};
  frameStats.push(stat);
  page.on('websocket',ws=>{
    stat.ws++;
    ws.on('framesent',evt=>{const p=evt.payload;stat.sentFrames++;stat.sentBytes+=typeof p==='string'?Buffer.byteLength(p):p?.length||0;});
    ws.on('framereceived',evt=>{const p=evt.payload;stat.receivedFrames++;stat.receivedBytes+=typeof p==='string'?Buffer.byteLength(p):p?.length||0;});
  });
}

try{
  for(let i=0;i<3;i++){
    const ctx=await browser.newContext();
    const page=await ctx.newPage();
    attachWsStats(page,i);
    await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>window.supabaseClient,{timeout:10000});
    await page.evaluate(({channelName,i})=>{
      window.__pilot={received:0,presenceSync:0,statuses:[]};
      const ch=window.supabaseClient.channel(channelName,{config:{presence:{key:'pilot-'+i}}});
      ch.on('broadcast',{event:'pilot'},()=>{window.__pilot.received++;});
      ch.on('presence',{event:'sync'},()=>{window.__pilot.presenceSync++;});
      window.__pilotChannel=ch;
      ch.subscribe(async status=>{
        window.__pilot.statuses.push(status);
        if(status==='SUBSCRIBED'){
          await ch.track({kind:i===0?'banditore':'player',index:i,online_at:new Date().toISOString()});
          window.__pilot.subscribed=true;
        }
      });
    },{channelName,i});
    await page.waitForFunction(()=>window.__pilot?.subscribed===true,{timeout:10000});
    pages.push({ctx,page});
  }

  await new Promise(r=>setTimeout(r,1200));

  // 20 broadcast app-shaped events, distributed across the three clients.
  const events=[];
  events.push({kind:'new_player',payload:{player_id:'pilot-10',nome:'Pilot Player',role:'C',club:'TEST',fvm:20,prep_seconds:5}});
  for(let i=0;i<10;i++) events.push({kind:'buzz',payload:{team:'Pilot '+((i%2)+1),team_id:'team-'+((i%2)+1),amount:i+1}});
  for(let i=0;i<4;i++) events.push({kind:'ready',payload:{team_id:'team-'+((i%2)+1),choice:i%3===0?'skip':'ready'}});
  for(let i=0;i<3;i++) events.push({kind:'sealed_bid',payload:{team_id:'team-'+((i%2)+1),amount:10+i}});
  events.push({kind:'auction_state',payload:{value:47,winner:'Pilot 1'}});
  events.push({kind:'auction_end',payload:{winner:'Pilot 1',price:47}});

  for(let i=0;i<events.length;i++){
    const sender=pages[i%3].page;
    const evt=events[i];
    await sender.evaluate(async ({kind,payload})=>{
      await window.__pilotChannel.send({type:'broadcast',event:'pilot',payload:{kind,...payload}});
    },evt);
    await new Promise(r=>setTimeout(r,35));
  }

  // One presence disconnect/reconnect cycle to mimic a short network interruption.
  await pages[2].page.evaluate(async()=>{await window.__pilotChannel.untrack();});
  await new Promise(r=>setTimeout(r,350));
  await pages[2].page.evaluate(async()=>{await window.__pilotChannel.track({kind:'player',index:2,reconnected:true,online_at:new Date().toISOString()});});
  await new Promise(r=>setTimeout(r,1200));

  for(const {page} of pages){
    received.push(await page.evaluate(()=>window.__pilot));
  }

  for(const {page} of pages){
    await page.evaluate(async()=>{try{await window.__pilotChannel.untrack();}catch{};try{await window.supabaseClient.removeChannel(window.__pilotChannel);}catch{}});
  }
  await new Promise(r=>setTimeout(r,500));

  const broadcastCount=events.length;
  const totalReceived=received.reduce((s,x)=>s+(x.received||0),0);
  // Supabase docs: Broadcast = 1 message sent + 1 per subscribed client that receives it.
  const documentedBroadcastMessages=broadcastCount+totalReceived;
  const totalSentFrames=frameStats.reduce((s,x)=>s+x.sentFrames,0);
  const totalReceivedFrames=frameStats.reduce((s,x)=>s+x.receivedFrames,0);
  const report={
    generatedAt:new Date().toISOString(),
    channelName,
    clients:3,
    broadcastCount,
    receivedPerClient:received.map(x=>x.received||0),
    presenceSyncPerClient:received.map(x=>x.presenceSync||0),
    documentedBroadcastMessages,
    websocketFrames:{sent:totalSentFrames,received:totalReceivedFrames,total:totalSentFrames+totalReceivedFrames,byClient:frameStats},
    note:'Broadcast billing estimate is exact from observed broadcast deliveries under Supabase documented counting. Presence/system traffic is not converted to invoice messages here; websocket frames are reported as a conservative transport-volume indicator.'
  };
  await fs.writeFile('dev/REALTIME_PILOT_REPORT.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if(totalReceived < broadcastCount*1) throw new Error('Realtime deliveries unexpectedly low');
} finally {
  for(const x of pages){try{await x.ctx.close();}catch{}}
  await browser.close();
}
