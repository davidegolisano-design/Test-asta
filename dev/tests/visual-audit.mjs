import { chromium } from 'playwright';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const base='http://127.0.0.1:4173/dev/index.html?visual-audit=1';
const outDir='dev/visual-audit';
const tmpDir='/tmp/liveasta-visual-audit';
await fsp.rm(tmpDir,{recursive:true,force:true});
await fsp.mkdir(tmpDir,{recursive:true});
await fsp.mkdir(outDir,{recursive:true});

const browser=await chromium.launch({headless:true});
const states=[];

function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}

async function newPage(viewport){
  const page=await browser.newPage({viewport});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(900);
  return {page,errors};
}

async function forceScreen(page,id){
  await page.evaluate(id=>{
    document.querySelectorAll('.screen').forEach(el=>{el.classList.remove('active');el.style.display='none';});
    const target=document.getElementById(id);
    if(target){target.style.display='block';target.classList.add('active');}
  },id);
}

async function fixtureBase(page){
  await page.evaluate(()=>{
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    try{
      currentRoom={id:'audit-room',name:'Visual Audit',game_mode:'classic',limit_p:3,limit_d:8,limit_c:8,limit_a:6,budget:500};
      currentRoomId='audit-room'; currentRoomCode='VISUAL';
      teamsCache=[
        {id:'t1',name:'Gli Ingegneri',credits_remaining:327},
        {id:'t2',name:'Real Test',credits_remaining:294},
        {id:'t3',name:'Atletico Debug',credits_remaining:361},
        {id:'t4',name:'FC Smartphone',credits_remaining:279},
        {id:'t5',name:'Long Team Name United',credits_remaining:410}
      ];
      purchasesCache=[
        {team_id:'t1',player_id:'1',player_name:'Portiere Test',role:'P',price:18,club:'Club'},
        {team_id:'t1',player_id:'2',player_name:'Difensore Test',role:'D',price:31,club:'Club'}
      ];
      currentAuctionPlayer={Id:'301',Nome:'Nicolò Barella',R:'C',Squadra:'Inter',FVM:120};
      currentWinner='Atletico Debug'; currentAuctionValue=47; currentTimer=9; isAuctionActive=true;
      myTeamId='t1'; myTeamName='Gli Ingegneri';
    }catch(_){}
    set('player-room-inline','Visual Audit'); set('display-team-name','Gli Ingegneri'); set('player-connection-text','ONLINE');
    const conn=document.getElementById('player-connection-pill');if(conn){conn.classList.remove('offline');conn.classList.add('online');}
    set('player-credits','327'); set('player-slots','P 1/3 · D 1/8 · C 0/8 · A 0/6');
    set('player-session-title','Asta Live'); set('player-roster-btn','Rosa · 2');
    const card=document.getElementById('phone-card-container');if(card)card.style.visibility='visible';
    set('phone-player-name-text','Nicolò Barella'); set('phone-player-role','C'); set('phone-player-club','Inter');
    set('player-countdown','9'); set('player-auction-title','MIGLIOR OFFERTA'); set('player-current-winner','Atletico Debug'); set('player-current-value','47');
    document.querySelectorAll('#normal-bid-controls .buzzer-btn').forEach(b=>b.disabled=false);
    try{const img=document.getElementById('phone-card-image'); if(img&&typeof setPlayerImage==='function')setPlayerImage(img,'301','C');}catch(_){}
  });
}

async function metrics(page,label){
  return await page.evaluate(label=>{
    const visible=el=>{
      const s=getComputedStyle(el),r=el.getBoundingClientRect();
      return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0&&r.width>0&&r.height>0;
    };
    const ident=el=>el.id?`#${el.id}`:(el.classList?.length?`${el.tagName.toLowerCase()}.${[...el.classList].slice(0,3).join('.')}`:el.tagName.toLowerCase());
    const all=[...document.querySelectorAll('body *')].filter(visible);
    const outside=all.filter(el=>{const r=el.getBoundingClientRect();return r.left<-2||r.right>innerWidth+2;}).slice(0,30).map(el=>({el:ident(el),text:(el.textContent||'').trim().slice(0,60),left:Math.round(el.getBoundingClientRect().left),right:Math.round(el.getBoundingClientRect().right)}));
    const small=[...document.querySelectorAll('button,a,input,select,[role="button"]')].filter(visible).filter(el=>{const r=el.getBoundingClientRect();return r.width<40||r.height<40;}).slice(0,40).map(el=>{const r=el.getBoundingClientRect();return {el:ident(el),text:(el.textContent||el.getAttribute('aria-label')||'').trim().slice(0,60),w:Math.round(r.width),h:Math.round(r.height)};});
    const clipped=all.filter(el=>{
      if(!String(el.textContent||'').trim())return false;
      const s=getComputedStyle(el); if(!['hidden','clip'].includes(s.overflowX)&&!['hidden','clip'].includes(s.overflowY)&&s.whiteSpace!=='nowrap')return false;
      return el.scrollWidth>el.clientWidth+2||el.scrollHeight>el.clientHeight+2;
    }).slice(0,40).map(el=>({el:ident(el),text:(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,80),cw:el.clientWidth,sw:el.scrollWidth,ch:el.clientHeight,sh:el.scrollHeight}));
    const tinyText=all.filter(el=>String(el.textContent||'').trim()&&parseFloat(getComputedStyle(el).fontSize)<11).slice(0,40).map(el=>({el:ident(el),text:(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,70),font:getComputedStyle(el).fontSize}));
    return {label,viewport:{w:innerWidth,h:innerHeight},body:{scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight},horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2,outside,small,clipped,tinyText};
  },label);
}

async function capture(label,viewport,setup){
  const {page,errors}=await newPage(viewport);
  try{
    if(setup)await setup(page);
    await page.waitForTimeout(250);
    const file=path.join(tmpDir,`${String(states.length+1).padStart(2,'0')}-${slug(label)}.png`);
    await page.screenshot({path:file,fullPage:false});
    const m=await metrics(page,label);
    const screens=await page.evaluate(()=>[...document.querySelectorAll('[id^="screen-"]')].map(el=>el.id));
    states.push({label,viewport,file,errors,metrics:m,screens});
  }catch(e){
    states.push({label,viewport,file:null,errors:[...errors,String(e?.stack||e)],metrics:null,screens:[]});
  }finally{await page.close();}
}

const mobile={width:390,height:844};
const smallMobile={width:360,height:740};
const desktop={width:1440,height:900};

await capture('Mobile · Home',mobile,null);
await capture('Mobile · Accesso giocatore',mobile,async page=>{await page.getByRole('button',{name:/Giocatore/i}).click();await page.waitForTimeout(350);});
await capture('Mobile · Scelta dispositivo banditore',mobile,async page=>{await page.getByRole('button',{name:/Banditore/i}).click();});
await capture('Mobile 360px · Home',smallMobile,null);

await capture('Giocatore · Asta normale',mobile,async page=>{
  await forceScreen(page,'screen-player-buzzer'); await fixtureBase(page);
});
await capture('Giocatore · READY / SKIP',mobile,async page=>{
  await forceScreen(page,'screen-player-buzzer'); await fixtureBase(page);
  await page.evaluate(()=>{
    const grid=document.getElementById('normal-bid-controls');if(grid)grid.classList.add('ready-choice-active');
    document.querySelectorAll('#normal-bid-controls .buzzer-btn').forEach(b=>b.style.display='none');
    const c=document.getElementById('player-ready-choice-controls');if(c){c.style.display='grid';c.setAttribute('aria-hidden','false');}
    const side=document.getElementById('player-ready-side-panel');if(side){side.setAttribute('aria-hidden','false');side.style.display='flex';}
    const f=document.getElementById('player-ready-fvm-value');if(f)f.textContent='120';
    const l=document.getElementById('player-ready-team-list');if(l)l.innerHTML='<div>Gli Ingegneri ✓</div><div>Real Test</div><div>Atletico Debug ✓</div><div>FC Smartphone</div>';
    const t=document.getElementById('player-auction-title');if(t)t.textContent='ATTESA READY';
    const w=document.getElementById('player-current-winner');if(w)w.textContent='2 / 4 pronti';
    const v=document.getElementById('player-current-value');if(v)v.textContent='0';
    const cd=document.getElementById('player-countdown');if(cd)cd.textContent='--';
  });
});
await capture('Giocatore · Busta chiusa',mobile,async page=>{
  await forceScreen(page,'screen-player-buzzer'); await fixtureBase(page);
  await page.evaluate(()=>{
    try{playerSealedMode=true;playerSealedSubmitted=false;}catch(_){}
    const grid=document.getElementById('normal-bid-controls');if(grid)grid.classList.add('sealed-active');
    document.querySelectorAll('#normal-bid-controls .buzzer-btn').forEach(b=>b.style.display='none');
    const c=document.getElementById('sealed-bid-controls');if(c){c.style.display='block';c.classList.add('sealed-visible');}
    const input=document.getElementById('sealed-bid-input');if(input){input.disabled=false;input.value='65';input.max='320';input.placeholder='Max 320 crediti';}
    const st=document.getElementById('sealed-bid-status');if(st)st.textContent='Inserisci l’importo e conferma. L’offerta è definitiva.';
    const t=document.getElementById('player-auction-title');if(t)t.textContent='BUSTA CHIUSA';
    const w=document.getElementById('player-current-winner');if(w)w.textContent='Inserisci la tua offerta';
    const v=document.getElementById('player-current-value');if(v)v.textContent='?';
    const cd=document.getElementById('player-countdown');if(cd)cd.textContent='18';
  });
});

async function boardFixture(page){
  await forceScreen(page,'screen-auctioneer-board');
  await page.evaluate(()=>{
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    try{if(typeof showAuctionPanels==='function')showAuctionPanels();}catch(_){}
    set('auction-player-name-top','Nicolò Barella');set('auction-player-role','C');set('auction-player-club','Inter');
    set('countdown-display','9');set('current-value-display','47');set('winner-display','Atletico Debug');
    set('auction-title-display','MIGLIOR OFFERTA');
    try{const img=document.getElementById('card-image');if(img&&typeof setPlayerImage==='function')setPlayerImage(img,'301','C');}catch(_){}
    const online=document.querySelector('[id*="online-count"], .online-count');if(online)online.textContent='4/5';
  });
}
await capture('Banditore desktop · Asta normale',desktop,boardFixture);
await capture('Banditore smartphone · Asta normale',mobile,boardFixture);

await capture('Banditore desktop · READY',desktop,async page=>{
  await page.evaluate(()=>{
    try{
      currentRoom={id:'audit-room',game_mode:'classic',limit_p:3,limit_d:8,limit_c:8,limit_a:6};currentRoomId='audit-room';
      teamsCache=[{id:'t1',name:'Gli Ingegneri',credits_remaining:327},{id:'t2',name:'Real Test',credits_remaining:294},{id:'t3',name:'Atletico Debug',credits_remaining:361},{id:'t4',name:'FC Smartphone',credits_remaining:279}];
      purchasesCache=[];currentAuctionPlayer={Id:'301',Nome:'Nicolò Barella',R:'C',Squadra:'Inter',FVM:120};
      readyGateWaiting=true;readyGateToken='audit';readyPlayers=new Set(['t1','t3']);readySkipPlayers=new Set(['t3']);absentTeamIds=new Set();sealedAuctionModeActive=false;
      showScreen('screen-auctioneer-board');showAuctioneerReadyStage();
    }catch(e){console.warn('visual ready fixture',e);}
  });
});

await capture('Banditore desktop · Buste in consegna',desktop,async page=>{
  await page.evaluate(()=>{
    try{
      showScreen('screen-auctioneer-board');currentAuctionPlayer={Id:'301',Nome:'Nicolò Barella',R:'C',Squadra:'Inter'};
      teamsCache=[{id:'t1',name:'Gli Ingegneri'},{id:'t2',name:'Real Test'},{id:'t3',name:'Atletico Debug'},{id:'t4',name:'FC Smartphone'}];
      sealedAuctionModeActive=true;sealedEnding=false;sealedAuctionToken='audit';sealedEligibleIds=['t1','t2','t3','t4'];sealedBids=new Map([['t1',{team_id:'t1',team_name:'Gli Ingegneri',amount:61}],['t3',{team_id:'t3',team_name:'Atletico Debug',amount:72}]]);sealedDeadlineAt=Date.now()+18000;
      showSealedAuctionStage('offers');
    }catch(e){console.warn('visual sealed fixture',e);}
  });
});
await capture('Banditore desktop · Apertura buste',desktop,async page=>{
  await page.evaluate(()=>{
    try{
      showScreen('screen-auctioneer-board');currentAuctionPlayer={Id:'301',Nome:'Nicolò Barella',R:'C',Squadra:'Inter'};
      teamsCache=[{id:'t1',name:'Gli Ingegneri'},{id:'t2',name:'Real Test'},{id:'t3',name:'Atletico Debug'},{id:'t4',name:'FC Smartphone'}];
      sealedAuctionModeActive=true;sealedEnding=true;sealedAuctionToken='audit';sealedEligibleIds=['t1','t2','t3','t4'];sealedBids=new Map([['t1',{team_id:'t1',team_name:'Gli Ingegneri',amount:61}],['t2',{team_id:'t2',team_name:'Real Test',amount:58}],['t3',{team_id:'t3',team_name:'Atletico Debug',amount:72}],['t4',{team_id:'t4',team_name:'FC Smartphone',amount:65}]]);sealedRevealDeadlineAt=Date.now()+4000;
      showSealedAuctionStage('opening');
      const a=document.getElementById('auction-title-display');if(a)a.textContent='APERTURA BUSTE';
      const w=document.getElementById('winner-display');if(w)w.textContent='ATTENDI';
      const v=document.getElementById('current-value-display');if(v)v.textContent='?';
    }catch(e){console.warn('visual reveal fixture',e);}
  });
});
await capture('Banditore desktop · Esito busta',desktop,async page=>{
  await boardFixture(page);
  await page.evaluate(()=>{
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('auction-title-display','AGGIUDICATO A');set('winner-display','Atletico Debug');set('current-value-display','72');set('countdown-display','0');
    try{if(typeof renderSealedBidRanking==='function')renderSealedBidRanking([{team_id:'t3',team_name:'Atletico Debug',amount:72,at:1},{team_id:'t4',team_name:'FC Smartphone',amount:65,at:2},{team_id:'t1',team_name:'Gli Ingegneri',amount:61,at:3},{team_id:'t2',team_name:'Real Test',amount:58,at:4}]);}catch(_){}
  });
});

await capture('Gestione stanza · Desktop',desktop,async page=>{
  await page.evaluate(()=>{
    try{
      currentRoom={id:'audit-room',name:'Visual Audit',game_mode:'classic',limit_p:3,limit_d:8,limit_c:8,limit_a:6,budget:500};currentRoomId='audit-room';
      teamsCache=[{id:'t1',name:'Gli Ingegneri',credits_remaining:327},{id:'t2',name:'Real Test',credits_remaining:294},{id:'t3',name:'Atletico Debug',credits_remaining:361},{id:'t4',name:'FC Smartphone',credits_remaining:279}];
      if(typeof openRoomControl==='function')openRoomControl();else showScreen('screen-room-control');
    }catch(_){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));const e=document.getElementById('screen-room-control');if(e)e.classList.add('active');}
  });
});
await capture('Gestione stanza · Smartphone',mobile,async page=>{
  await page.evaluate(()=>{
    try{currentRoom={id:'audit-room',name:'Visual Audit',game_mode:'classic',limit_p:3,limit_d:8,limit_c:8,limit_a:6,budget:500};currentRoomId='audit-room';if(typeof openRoomControl==='function')openRoomControl();else showScreen('screen-room-control');}catch(_){}
  });
});

await capture('Giocatore · Listone',mobile,async page=>{
  await forceScreen(page,'screen-player-buzzer');await fixtureBase(page);
  await page.evaluate(()=>{
    try{
      playersList=Array.from({length:24},(_,i)=>({Id:String(500+i),Nome:['Alessandro Buongiorno','Nicolò Barella','Federico Dimarco','Riccardo Orsolini','Lorenzo Pellegrini','Mateo Retegui'][i%6]+' '+(i+1),R:['P','D','C','A'][i%4],Squadra:['Inter','Milan','Roma','Bologna'][i%4],FVM:120-i}));auctionedPlayerIds=new Set();playerShortlist=new Map([['503',1],['507',2]]);if(typeof openPlayerListone==='function')openPlayerListone();
    }catch(e){console.warn('visual listone fixture',e);}
  });
});
await capture('Giocatore · Budget',mobile,async page=>{
  await forceScreen(page,'screen-player-buzzer');await fixtureBase(page);
  await page.evaluate(()=>{try{if(typeof openPlayerBudgetManager==='function')openPlayerBudgetManager();}catch(e){console.warn('visual budget fixture',e);}});
});

// Discover every screen for coverage accounting.
const {page:discovery}=await newPage(desktop);
const discoveredScreens=await discovery.evaluate(()=>[...document.querySelectorAll('[id^="screen-"]')].map(el=>el.id));
await discovery.close();

await browser.close();

// Build contact sheet.
const cells=[];
for(const s of states){
  if(!s.file||!fs.existsSync(s.file))continue;
  const img=sharp(s.file);const meta=await img.metadata();
  const w=320,h=540;
  const resized=await img.resize({width:w,height:h,fit:'contain',background:'#11151b'}).jpeg({quality:82}).toBuffer();
  const labelSvg=Buffer.from(`<svg width="${w}" height="38"><rect width="100%" height="100%" fill="#090d12"/><text x="10" y="25" fill="#ffffff" font-size="15" font-family="Arial" font-weight="700">${s.label.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</text></svg>`);
  const cell=await sharp({create:{width:w,height:h+38,channels:3,background:'#11151b'}}).composite([{input:labelSvg,top:0,left:0},{input:resized,top:38,left:0}]).jpeg({quality:84}).toBuffer();
  cells.push({label:s.label,buffer:cell,w,h:h+38});
}
const cols=3,cellW=320,cellH=578,rows=Math.ceil(cells.length/cols);
const sheet=sharp({create:{width:cols*cellW,height:rows*cellH,channels:3,background:'#06090d'}});
await sheet.composite(cells.map((c,i)=>({input:c.buffer,left:(i%cols)*cellW,top:Math.floor(i/cols)*cellH}))).jpeg({quality:85}).toFile(path.join(outDir,'contact-sheet.jpg'));

const report={generatedAt:new Date().toISOString(),base,discoveredScreens,states:states.map(({file,...x})=>x),notes:[
  'Audit visivo locale su Chromium con renderer/DOM reali della DEV e dati fixture non persistenti.',
  'Nessuna scrittura su Supabase e nessuna stanza reale modificata.',
  'Le schermate di asta usano le stesse funzioni e gli stessi componenti dell’app dove possibile; i valori mostrati sono fixture di audit.'
]};
await fsp.writeFile(path.join(outDir,'report.json'),JSON.stringify(report,null,2));
await fsp.writeFile(path.join(outDir,'README.md'),`# LIVEASTA Visual Audit\n\nGenerato automaticamente su Chromium.\n\n- Stati catturati: ${states.length}\n- Schermate DOM rilevate: ${discoveredScreens.length}\n- Nessuna scrittura su Supabase.\n- Vedi \`report.json\` per overflow, clipping e target touch.\n- \`contact-sheet.jpg\` è il confronto visivo complessivo.\n`);

console.log('VISUAL_AUDIT_STATES',states.map(s=>s.label));
console.log('VISUAL_AUDIT_SCREENS',discoveredScreens);
console.log('VISUAL_AUDIT_OK',states.length);
