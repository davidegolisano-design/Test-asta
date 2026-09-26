const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('timer defaults, saved values and bounds remain consistent',async()=>{
 const ctx=vm.createContext({currentRoom:{},currentRoomId:'demo'});
 vm.runInContext(fs.readFileSync('scripts/timer-settings.js','utf8'),ctx);
 assert.equal(vm.runInContext('LIVEASTA_TIMER_DEFAULTS.auction',ctx),8);
 for(const [load,save,field,fallback,max] of [
  ['loadAuctionPrepSeconds','saveAuctionPrepSeconds','prep_seconds',3,15],
  ['loadSealedTimerSeconds','saveSealedTimerSeconds','sealed_timer_seconds',40,180],
  ['loadSealedRevealSeconds','saveSealedRevealSeconds','sealed_reveal_seconds',3,30]]){
  assert.equal(await ctx[load](),fallback);
  ctx.currentRoom[field]=9;assert.equal(await ctx[load](),9);
  assert.equal(await ctx[save](''),fallback);assert.equal(await ctx[save](999),max);
 }
});
test('Free blocks all roster transfer entry points before reads or writes',async()=>{
 const source=fs.readFileSync('scripts/app.js','utf8'),calls=[];
 const ctx=vm.createContext({premium:{require:id=>{calls.push(id);return false;}}});
 for(const name of ['openCsvRosterImport','confirmCsvRosterImport','exportRoseCSV','exportRostersXlsx']){
  const start=source.search(new RegExp('(?:async )?function '+name+'\\('));
  const end=source.indexOf('\n        }',start)+10;
  vm.runInContext(source.slice(start,end),ctx);
  await ctx[name]();
 }
 assert.deepEqual(calls,Array(4).fill('roster_io'));
});
