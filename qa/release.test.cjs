const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function config(address){
 const ctx=vm.createContext({window:{},location:new URL(address)});
 vm.runInContext(fs.readFileSync('scripts/release-config.js','utf8'),ctx);
 return ctx.window.LIVEASTA_CONFIG;
}
test('the same candidate selects public grants and PWA only on the HTTPS public domain',()=>{
 for(const host of ['liveasta.it','www.liveasta.it']){
  const c=config('https://'+host+'/');
  assert.equal(c.environment,'production');assert.equal(c.serviceWorker,true);assert.ok(Object.isFrozen(c));
 }
 for(const url of ['https://raw.githack.com/repo/index.html?environment=production','http://www.liveasta.it/','https://www.liveasta.it.example.com/','http://localhost:8080/']){
  const c=config(url);assert.equal(c.environment,'dev-premium');assert.equal(c.serviceWorker,false);
 }
});
function worker({offline=false}={}){
 const listeners={},writes=[],deletes=[],reads=[];
 const stored=new Response('saved static file');
 const ctx=vm.createContext({URL,Response,
  self:{location:{origin:'https://www.liveasta.it'},addEventListener:(name,fn)=>listeners[name]=fn,clients:{claim:async()=>{}},skipWaiting:async()=>{}},
  fetch:async()=>{if(offline)throw new Error('offline');return new Response('fresh');},
  caches:{keys:async()=>['liveasta-v1.06.8-public','other-app',`liveasta-${config('https://www.liveasta.it/').version}`],delete:async key=>{deletes.push(key);},
   open:async()=>({put:async(req)=>writes.push(req.url),addAll:async()=>{}}),
   match:async key=>{reads.push(typeof key==='string'?key:key.url);return stored.clone();}}
 });
 vm.runInContext(fs.readFileSync('service-worker.js','utf8'),ctx);
 const fetchEvent=(url,options={})=>{let response;listeners.fetch({request:{url,method:'GET',mode:'cors',...options},respondWith:p=>response=p});return response;};
 return {listeners,writes,deletes,reads,fetchEvent};
}
test('PWA never caches API calls, cross-origin traffic, or auction navigation',async()=>{
 const w=worker();
 for(const url of ['https://qvkembahfeecfpsshepv.supabase.co/rest/v1/fanta_rooms','https://www.liveasta.it/api/room','https://fonts.googleapis.com/css2'])assert.equal(w.fetchEvent(url),undefined);
 assert.equal(w.fetchEvent('https://www.liveasta.it/scripts/app.js',{method:'POST'}),undefined);
 await w.fetchEvent('https://www.liveasta.it/',{mode:'navigate'});
 assert.equal(w.writes.length,0);
 await w.fetchEvent('https://www.liveasta.it/scripts/app.js?v=1074');
 assert.deepEqual(w.writes,['https://www.liveasta.it/scripts/app.js?v=1074']);
});
test('offline navigation shows the connection page and cleanup only removes LIVEASTA caches',async()=>{
 const w=worker({offline:true});
 await w.fetchEvent('https://www.liveasta.it/',{mode:'navigate'});
 assert.deepEqual(w.reads,['/offline.html']);
 let activation;w.listeners.activate({waitUntil:p=>activation=p});await activation;
 assert.deepEqual(w.deletes,['liveasta-v1.06.8-public']);
});
