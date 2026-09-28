const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('scripts/app.js','utf8');
const source=app.slice(app.indexOf('        let spectatorVisibilitySaving='),app.indexOf('        function renderRoomControl()'));
function setup(){
 const toggle={checked:true,disabled:false},status={textContent:''};let complete,calls=0,payload;
 const ctx={currentRoomId:'one',currentRoom:{spectator_public:false},auctioneerLockToken:'host',spectatorMode:false,
 document:{getElementById:id=>id==='control-spectator-public'?toggle:status},window:{},broadcastStateChanged:()=>{},
 supabaseClient:{from:()=>({update:p=>{calls++;payload=p;return {eq:()=>({select:()=>({single:()=>new Promise(r=>complete=r)})})};}})}};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 return {ctx,toggle,status,save:v=>ctx.saveSpectatorVisibility(v),finish:v=>complete(v),calls:()=>calls,payload:()=>payload};
}
test('toggle saves only visibility immediately and confirms returned state',async()=>{
 const s=setup(),p=s.save(true);assert.equal(s.toggle.disabled,true);assert.equal(s.status.textContent,'Salvataggio…');
 await s.save(false);assert.equal(s.calls(),1);assert.deepEqual(Object.keys(s.payload()).sort(),['spectator_public','updated_at']);
 s.finish({data:{id:'one',spectator_public:true}});await p;assert.equal(s.ctx.currentRoom.spectator_public,true);assert.match(s.status.textContent,/Salvato/);assert.equal(s.toggle.disabled,false);
 const q=s.save(false);s.finish({data:{id:'one',spectator_public:false}});await q;assert.equal(s.toggle.checked,false);
});
test('failed write restores previous switch state and permits retry',async()=>{
 const s=setup(),p=s.save(true);s.finish({error:{message:'offline'}});await p;
 assert.equal(s.toggle.checked,false);assert.equal(s.toggle.disabled,false);assert.match(s.status.textContent,/non confermato/);assert.equal(s.ctx.currentRoom.spectator_public,false);
});
test('spectators cannot save and stale response cannot update another room',async()=>{
 const s=setup();s.ctx.spectatorMode=true;await s.save(true);assert.equal(s.calls(),0);
 s.ctx.spectatorMode=false;const p=s.save(true);s.ctx.currentRoomId='two';s.ctx.currentRoom={spectator_public:false};s.finish({data:{id:'one',spectator_public:true}});await p;assert.equal(s.ctx.currentRoom.spectator_public,false);assert.equal(s.toggle.checked,false);
});
