const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {parseHTML}=require('linkedom');
function setup(){
 const {window}=parseHTML('<html><body></body></html>');const calls=[];let fail=false;
 window.HTMLElement.prototype.showModal=function(){this.open=true;};window.HTMLElement.prototype.close=function(){this.dispatchEvent(new window.Event('close'));};
 vm.runInNewContext(fs.readFileSync('scripts/room-email-verification.js','utf8'),{window,document:window.document,setInterval:()=>1,clearInterval:()=>{},supabaseClient:{functions:{invoke:async(name,{body})=>{
 calls.push(body);return {data:body.action==='send'?{challenge_id:'challenge',expires_in:600,retry_after:60}:fail?{error:'invalid_code'}:{room:{id:'created'}}};
 }}}});
 return {window,doc:window.document,calls,fail:v=>fail=v,open:()=>window.verifyRoomCreation({p_email:'<name>@example.invalid'})};
}
const flush=()=>new Promise(r=>setImmediate(r));
test('sending does not resolve creation; only valid confirmation does',async()=>{
 const s=setup();let resolved=false;const p=s.open().then(r=>{resolved=true;return r;});await flush();assert.equal(resolved,false);
 assert.equal(s.calls.length,1);assert.equal(s.doc.querySelector('name'),null);
 const input=s.doc.querySelector('input');input.value='001234';input.dispatchEvent(new s.window.Event('input'));
 s.fail(true);s.doc.querySelector('form').dispatchEvent(new s.window.Event('submit',{cancelable:true,bubbles:true}));await flush();assert.equal(resolved,false);assert.match(s.doc.querySelector('[role="alert"]').textContent,/Codice errato/);
 s.fail(false);s.doc.querySelector('form').dispatchEvent(new s.window.Event('submit',{cancelable:true,bubbles:true}));assert.equal((await p).id,'created');assert.equal(s.doc.querySelector('dialog'),null);
});
test('cancel returns to editable data without calling confirmation',async()=>{
 const s=setup(),p=s.open();await flush();const rejected=assert.rejects(p,/Verifica interrotta/);s.doc.querySelector('[data-email-action="cancel"]').click();await rejected;
 assert.equal(s.calls.length,1);assert.equal(s.calls[0].action,'send');
});
