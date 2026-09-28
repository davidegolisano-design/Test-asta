const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
function setup(){
  const {window}=parseHTML(fs.readFileSync('index.html','utf8'));const calls=[];
  Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){return this.querySelector('option[selected]')?.value||this.querySelector('option')?.value||'';},set(v){this.querySelectorAll('option').forEach(o=>{if(o.value===v)o.setAttribute('selected','');else o.removeAttribute('selected');});}});
  let rows=[{id:'one',name:'Public <room>',game_mode:'classic',online:true},{id:'two',name:'Mantra',game_mode:'mantra',online:false}],fail=false,result={id:'one'};
  vm.runInNewContext(fs.readFileSync('scripts/spectator-lobby.js','utf8'),{window,document:window.document,setInterval:()=>1,supabaseClient:{rpc:async(name,args)=>{calls.push({name,args});return {data:name==='liveasta_spectator_directory'?rows:result,error:fail?{}:null};}}});
  return {api:window.liveastaSpectatorLobby,doc:window.document,calls,fail:()=>fail=true,result:v=>result=v};
}
test('public listing counts only live hosts, escapes names and preserves selection',async()=>{
  const s=setup();await s.api.open();const $=id=>s.doc.getElementById(id);
  assert.equal($('spectator-count-classic').textContent,'1');assert.equal($('spectator-count-mantra').textContent,'0');
  assert.equal($('spectator-room-password').style.display,'none');assert.equal(s.doc.querySelector('room'),null);
  $('spectator-room-select').value='one';await s.api.refresh();assert.equal($('spectator-room-select').value,'one');
  await s.api.resolveRoom();assert.deepEqual(JSON.parse(JSON.stringify(s.calls.at(-1).args)),{p_room_id:'one',p_name:'',p_password:'',p_public:true});
});
test('private access requires manual name and password and handles server rejection',async()=>{
  const s=setup();await s.api.open();s.api.setMode('private');const $=id=>s.doc.getElementById(id);
  assert.equal($('spectator-room-select').style.display,'none');assert.equal($('spectator-room-password').style.display,'');
  await assert.rejects(s.api.resolveRoom(),/nome stanza e password/);
  $('spectator-room-name-input').value=' Private ';$('spectator-room-password').value='test-only';s.result(null);
  await assert.rejects(s.api.resolveRoom(),/password errata/);assert.equal(s.calls.at(-1).args.p_public,false);
  assert.equal(s.calls.at(-1).args.p_name,'Private');s.api.setMode('public');assert.equal($('spectator-room-password').value,'');
});
test('directory failure does not display stale online counts',async()=>{
  const s=setup();await s.api.open();s.fail();await s.api.refresh();
  assert.equal(s.doc.getElementById('spectator-count-classic').textContent,'–');assert.match(s.doc.getElementById('spectator-room-error').textContent,/non disponibile/);
});
