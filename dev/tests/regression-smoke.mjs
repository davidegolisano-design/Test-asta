import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];
page.on('pageerror',e=>errors.push(String(e?.stack||e)));

function assert(condition,message){if(!condition)throw new Error(message);}

try{
  const response=await page.goto('http://127.0.0.1:4173/dev/index.html?regression-smoke=1',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(1200);
  assert(response?.status()===200,'DEV index HTTP status is not 200');

  const result=await page.evaluate(()=>{
    const required=[
      'safeReadLocalJson','safeWriteLocalJson','normalizeRoomCode','escapeHtml',
      'roomGameMode','isMantraRoom','normalizeMantraRole','mantraRoleTokens','mantraRoleFromPlayer','playerRole','playerIsGoalkeeper',
      'genericPlayerImage','playerImageUrl','setPlayerImage','playerImageFallback',
      'applyLiveAstaTheme','setLiveAstaTheme','openLiveAstaThemeMenu','closeLiveAstaThemeMenu',
      'fitAuctionNames','fitTextToBox','openAudioMixer','closeAudioMixer','playSound'
    ];
    const missing=required.filter(n=>typeof window[n]!=='function');

    localStorage.removeItem('__liveasta_regression_json');
    const jsonWrite=safeWriteLocalJson('__liveasta_regression_json',{n:7,s:'ok'});
    const jsonRead=safeReadLocalJson('__liveasta_regression_json');
    localStorage.removeItem('__liveasta_regression_json');

    const oldRoom=currentRoom;
    currentRoom={game_mode:'mantra'};
    const mantraMatch=mantraRoleMatches({RM:'Dc;B'},'B');
    const activeRole=activeRoleLabel('p / dc');
    currentRoom=oldRoom;

    const fake={dataset:{},_src:'',set src(v){this._src=v},get src(){return this._src},getAttribute(n){return n==='src'?this._src:null}};
    setPlayerImage(fake,'777','P');
    const beforeFallback=fake.src;
    playerImageFallback(fake);
    const afterFallback=fake.src;

    const previousTheme=localStorage.getItem('liveasta_theme');
    const themeApplied=setLiveAstaTheme('light-blue');
    const themeChoice=document.documentElement.getAttribute('data-theme-choice');
    const themeBase=document.documentElement.getAttribute('data-live-theme');
    const themeStored=localStorage.getItem('liveasta_theme');
    const invalidTheme=setLiveAstaTheme('__invalid__');
    if(previousTheme) setLiveAstaTheme(previousTheme); else { localStorage.removeItem('liveasta_theme'); applyLiveAstaTheme('broadcast',false); }

    return {
      missing,
      jsonWrite,jsonRead,
      normalizedRoom:normalizeRoomCode('  Test    Room   Name  '),
      escaped:escapeHtml(`<b>Tom & Jerry's</b>`),
      mantraNormalized:normalizeMantraRole('p / dc ; W'),
      mantraTokens:mantraRoleTokens('Por;Dc;W'),
      classicRole:playerRole({R:'d'},{game_mode:'classic'}),
      mantraRole:playerRole({RM:'dc / b'},{game_mode:'mantra'}),
      classicGK:playerIsGoalkeeper('P',{game_mode:'classic'}),
      mantraGK:playerIsGoalkeeper('Por',{game_mode:'mantra'}),
      mantraMatch,activeRole,
      genericP:genericPlayerImage('P'),genericPor:genericPlayerImage('Por'),genericA:genericPlayerImage('A'),
      playerUrl:playerImageUrl('123','A'),beforeFallback,afterFallback,fallbackState:fake.dataset.localFallback,
      themeApplied,themeChoice,themeBase,themeStored,invalidTheme
    };
  });

  assert(result.missing.length===0,'Missing shared functions: '+result.missing.join(', '));
  assert(result.jsonWrite===true && result.jsonRead?.n===7 && result.jsonRead?.s==='ok','Local JSON utilities regression');
  assert(result.normalizedRoom==='Test Room Name','Room normalization regression');
  assert(result.escaped==='&lt;b&gt;Tom &amp; Jerry&#39;s&lt;/b&gt;','HTML escaping regression');
  assert(result.mantraNormalized==='Por;Dc;W','Mantra normalization regression');
  assert(result.mantraTokens.join('|')==='Por|Dc|W','Mantra token regression');
  assert(result.classicRole==='D' && result.mantraRole==='Dc;B','Player role regression');
  assert(result.classicGK && result.mantraGK && result.mantraMatch && result.activeRole==='Por;Dc','Role matching regression');
  assert(result.genericP.endsWith('/assets/players/generic-goalkeeper.webp'),'Classic goalkeeper asset regression');
  assert(result.genericPor.endsWith('/assets/players/generic-goalkeeper.webp'),'Mantra goalkeeper asset regression');
  assert(result.genericA.endsWith('/assets/players/generic-player.webp'),'Generic player asset regression');
  assert(result.playerUrl.endsWith('/assets/players/123.webp'),'Player image URL regression');
  assert(result.beforeFallback.endsWith('/assets/players/777.webp') && result.afterFallback.endsWith('/assets/players/generic-goalkeeper.webp') && result.fallbackState==='1','Player image fallback regression');
  assert(result.themeApplied==='light-blue' && result.themeChoice==='light-blue' && result.themeBase==='light-blue' && result.themeStored==='light-blue','Theme application regression');
  assert(result.invalidTheme==='broadcast','Invalid theme fallback regression');
  assert(errors.length===0,'Page errors:\n'+errors.join('\n---\n'));

  console.log('LIVEASTA module regression smoke: OK');
} finally {
  await browser.close();
}
