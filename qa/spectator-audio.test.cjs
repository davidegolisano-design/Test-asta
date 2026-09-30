const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
function viewer(){
  const {document}=parseHTML(fs.readFileSync('index.html','utf8'));const sounds=[];
  const c={window:{},document,nominationState:{enabled:false},Date,Set,Number,String,
    setInterval:()=>1,clearInterval(){},showAuctionPanels(){},showAuctioneerReadyStage(){},setMobileAuctionCard(){},clearSealedBidRanking(){},
    isAuctioneerMobileBoard:()=>false,renderAuctioneerBidRanking(){},renderSealedAuctionStage(){},
    playSound:id=>sounds.push(id),speakBidValue:n=>sounds.push('voice:'+n),playAuctionFinalCountdown:n=>sounds.push('final:'+n)};
  vm.createContext(c);vm.runInContext(fs.readFileSync('scripts/spectator.js','utf8'),c);
  return {c,sounds,view:c.window.liveastaSpectatorView};
}
const state=(phase,value=0,seconds=8)=>({phase,value,seconds,player:{id:'p1',nome:'Uno',role:'P',club:'Club'},winner:'Team'});
test('spectator plays start, accepted bid and result once; polling and resize never duplicate them',()=>{
  const {view,sounds}=viewer();view.render(state('ready'));view.render(state('active'));
  view.render(state('active',10));view.render(state('active',10));view.reflow();view.render(state('ended',10));view.render(state('ended',10));
  assert.deepEqual(sounds,['audio-start','audio-buzz','voice:10','audio-end']);
});
test('joining mid-auction is silent and last-three countdown plays once per second',()=>{
  const {view,sounds}=viewer();view.render(state('active',10,8));assert.deepEqual(sounds,[]);
  view.render(state('active',10,3));view.render(state('active',10,3));view.reflow();
  view.render(state('active',10,2));view.render(state('active',10,1));
  assert.deepEqual(sounds,['final:3','final:2','final:1']);
});
test('paused automatic rooms are silent and opening follows its own countdown without red-final sounds',()=>{
  const {view,sounds}=viewer();view.render({...state('sealed',0,3),paused:true});view.reflow();assert.deepEqual(sounds,[]);
  view.render(state('sealed_reveal',0,3));view.render(state('sealed_reveal',0,3));view.render(state('sealed_reveal',0,2));
  assert.deepEqual(sounds,['audio-prep','audio-prep']);
});
test('spectator mixer unlocks media and saves local preferences without loading shared room controls',async()=>{
  const {document}=parseHTML(fs.readFileSync('index.html','utf8'));let reads=0,unlocked=0,stored='';
  const c={document,spectatorMode:true,localStorage:{getItem:()=>null,setItem:(_k,v)=>stored=v},
    unlockAudio:()=>unlocked++,loadAudioRoutingSettings:async()=>reads++,renderAudioRoutingTargets:()=>reads++,requestAnimationFrame:fn=>fn()};
  vm.createContext(c);vm.runInContext(fs.readFileSync('scripts/audio.js','utf8'),c);
  await c.openAudioMixer();assert.equal(unlocked,1);assert.equal(reads,0);
  assert.equal(document.getElementById('audio-mixer-modal').classList.contains('spectator-audio'),true);
  document.getElementById('spectator-audio-enabled').checked=false;c.saveAudioSettings();
  assert.equal(JSON.parse(stored).spectatorAudioEnabled,false);assert.equal(reads,0);
  c.spectatorMode=false;await c.openAudioMixer();assert.equal(reads,2);
  assert.equal(document.getElementById('audio-mixer-modal').classList.contains('spectator-audio'),false);
});
test('spectator audio routing commands cannot change or write other participants settings',async()=>{
  const source=fs.readFileSync('scripts/app.js','utf8'),c={spectatorMode:true};vm.createContext(c);
  for(const name of ['saveAudioRoutingSettings','setAudioTargetMuted','unmuteAllAudioTargets']){
    const start=source.indexOf('        async function '+name+'('),end=source.indexOf('\n        }',start)+10;
    vm.runInContext(source.slice(start,end),c);await c[name]('auctioneer',false);
  }
});
