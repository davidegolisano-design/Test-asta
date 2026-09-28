const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
function setup(){
 const {window}=parseHTML(fs.readFileSync('index.html','utf8'));const calls=[];
 let privateRoom=false,badPassword=false,failCounts=false;
 const rpc=async(name,args)=>{
  calls.push({name,args});
  if(name==='liveasta_spectator_directory')return {data:[{id:'public',name:'Public <room>',game_mode:'classic',online:true}]};
  if(name==='liveasta_spectator_online_counts')return failCounts?{error:{}}:{data:{classic:3,mantra:2}};
  if(name==='liveasta_spectator_resolve')return {data:args.p_name==='missing'?null:{is_public:!privateRoom,room_id:privateRoom?null:'public'}};
  return {data:badPassword?null:{id:privateRoom?'private':'public'}};
 };
 vm.runInNewContext(fs.readFileSync('scripts/spectator-lobby.js','utf8'),{window,document:window.document,setInterval:()=>1,supabaseClient:{rpc},showScreen:()=>{}});
 return {api:window.liveastaSpectatorLobby,doc:window.document,calls,private:v=>privateRoom=v,bad:v=>badPassword=v,fail:()=>failCounts=true};
}
test('all-room totals are independent of public listing; refreshing preserves typed private name',async()=>{
 const s=setup();await s.api.open();const $=id=>s.doc.getElementById(id);
 assert.equal($('spectator-count-classic').textContent,'3');assert.equal($('spectator-count-mantra').textContent,'2');
 assert.equal(s.doc.querySelectorAll('.spectator-public-room').length,1);assert.equal(s.doc.querySelector('room'),null);
 $('spectator-room-name-input').value='private name';await s.api.refresh();assert.equal($('spectator-room-name-input').value,'private name');
 s.doc.querySelector('.spectator-public-room').click();assert.equal($('spectator-room-name-input').value,'Public <room>');
 const room=await s.api.resolveRoom();assert.equal(room.id,'public');assert.equal(s.calls.at(-1).args.p_password,'');
 assert.equal($('spectator-password-step').hidden,true);
});
test('private name advances to password, retry and back retain the correct room',async()=>{
 const s=setup();s.private(true);await s.api.open();const $=id=>s.doc.getElementById(id);
 $('spectator-room-name-input').value='private';assert.equal(await s.api.resolveRoom(),null);
 assert.equal($('spectator-password-step').hidden,false);assert.equal($('spectator-room-step').hidden,true);
 assert(!s.calls.some(c=>c.name==='liveasta_spectator_enter'));await assert.rejects(s.api.resolveRoom(),/password/);
 $('spectator-room-password').value='wrong';s.bad(true);await assert.rejects(s.api.resolveRoom(),/Password errata/);
 $('spectator-room-password').value='right';s.bad(false);assert.equal((await s.api.resolveRoom()).id,'private');
 assert.equal(s.calls.at(-1).args.p_public,false);assert.equal(s.calls.at(-1).args.p_name,'private');
 s.api.back();assert.equal($('spectator-room-step').hidden,false);assert.equal($('spectator-room-password').value,'');assert.equal($('spectator-room-name-input').value,'private');
});
test('unknown name, changed visibility and failed counts are handled without false online numbers',async()=>{
 const s=setup();await s.api.open();const input=s.doc.getElementById('spectator-room-name-input');
 input.value='missing';await assert.rejects(s.api.resolveRoom(),/non trovata/);
 input.value='private';s.private(true);await s.api.resolveRoom();s.private(false);
 assert.equal((await s.api.resolveRoom()).id,'public');assert.equal(s.calls.at(-1).args.p_password,'');
 s.fail();await s.api.refresh();assert.equal(s.doc.getElementById('spectator-count-classic').textContent,'–');
 assert.equal(s.doc.querySelectorAll('.spectator-public-room').length,1);
});
