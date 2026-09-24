const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {parseHTML}=require('linkedom');
test('email status failure does not disable verified Premium administration',async()=>{
 const {window}=parseHTML('<html><body></body></html>');
 window.HTMLElement.prototype.showModal=function(){this.open=true;};
 const query={select(){return this;},eq(){return this;},abortSignal(){return this;},async maybeSingle(){return {data:{room_id:'room',environment:'dev-premium',features:[],revision:0}};}};
 window.LIVEASTA_CONFIG={environment:'dev-premium'};
 const ctx=vm.createContext({window,document:window.document,AbortController,setTimeout,clearTimeout,setInterval,clearInterval,CustomEvent:window.CustomEvent});
 vm.runInContext(fs.readFileSync('scripts/premium.js','utf8'),ctx);
 window.liveastaPremium.configure({getClient:()=>({from:()=>query,rpc:async()=>({error:new Error('mail unavailable')})}),getPassword:()=> 'test-password',getRooms:()=>[{id:'room',name:'Test room'}]});
 await window.liveastaPremium.openAdmin('room');
 assert.match(window.document.getElementById('premium-admin-status').textContent,/email non disponibile/);
 for(const input of window.document.querySelectorAll('[data-admin-premium]'))assert.equal(input.hasAttribute('disabled'),false);
});
