const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
function setup(blockStorage=false){
  const {window}=parseHTML('<html><body></body></html>'),values=new Map();let tick,player=true,busy=false;
  window.HTMLElement.prototype.showModal=function(){this.setAttribute('open','');};
  window.HTMLElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new window.Event('close'));};
  vm.runInNewContext(fs.readFileSync('scripts/player-onboarding.js','utf8'),{
    window,document:window.document,innerWidth:390,innerHeight:760,getComputedStyle:()=>({visibility:'visible'}),
    localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>{if(blockStorage)throw Error('blocked');values.set(k,v);}},
    setInterval:fn=>{tick=fn;return 1;},clearInterval:()=>{tick=null;}
  });
  const adapter={teamId:'one',isPlayer:()=>player,isBusy:()=>busy};
  return {doc:window.document,open:()=>window.liveastaPlayerOnboarding.enter(adapter),click:a=>window.document.querySelector(`[data-tour="${a}"]`).click(),tick:()=>tick?.(),busy:v=>busy=v,player:v=>player=v,adapter};
}
test('first visit includes premium steps without grants; completion and skip persist per team',()=>{
  const s=setup();s.open();s.open();assert.equal(s.doc.querySelectorAll('dialog').length,1);
  for(let i=0;i<4;i++)s.click('next');assert.match(s.doc.querySelector('.player-tour-premium').textContent,/PREMIUM/);
  s.click('back');assert.equal(s.doc.querySelector('.player-tour-premium'),null);
  for(let i=0;i<6;i++)s.click('next');s.click('next');assert.equal(s.doc.querySelector('dialog'),null);
  s.open();assert.equal(s.doc.querySelector('dialog'),null);
  s.adapter.teamId='two';s.open();s.click('skip');s.open();assert.equal(s.doc.querySelector('dialog'),null);
});
test('live activity closes immediately, keeps progress and does not reopen while busy',()=>{
  const s=setup();s.open();s.click('next');s.busy(true);s.tick();assert.equal(s.doc.querySelector('dialog'),null);
  s.open();assert.equal(s.doc.querySelector('dialog'),null);s.busy(false);s.open();assert.match(s.doc.querySelector('h2').textContent,/Rilancia/);
  s.player(false);s.tick();assert.equal(s.doc.querySelector('dialog'),null);
});
test('blocked local storage still remembers dismissal for this session',()=>{
  const s=setup(true);s.open();s.click('skip');s.open();assert.equal(s.doc.querySelector('dialog'),null);
});
