import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import vm from 'node:vm';
const source=readFileSync(new URL('../scripts/room-debug.js',import.meta.url),'utf8');
const sandbox={URL};vm.createContext(sandbox);vm.runInContext(source,sandbox);
const {create}=sandbox.LiveAstaDebug;
function fixture(){
    let now=Date.now(),mode='ok';const sent=[],storage=new Map(),listeners={};
    const room={room_id:randomUUID(),room_password:'DO_NOT_LOG_PASSWORD',actor:'player',team_id:randomUUID()};
    const env={crypto:{randomUUID},AbortController,navigator:{onLine:true},
        sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},
        setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},
        addEventListener:(k,f)=>listeners[k]=f};
    const client={rpc:(name,args)=>({abortSignal:async()=>{sent.push({name,args});return mode==='ok'?{data:args.p_events.length,error:null}:{error:{message:'offline'}};}})};
    const opts={env,now:()=>now,getContext:()=>room,getClient:()=>client,
        apiOrigin:'https://example.supabase.co',fetch:async()=>({ok:true,status:200})};
    const log=create(opts);
    return {log,room,sent,storage,listeners,opts,client,advance:()=>now+=65000,setMode:x=>mode=x};
}
test('offline retry retains stable event IDs, then removes acknowledged batch',async()=>{
    const f=fixture();f.log.record('ready.tap',{choice:'ready',password:'secret',p_pin:'123456'});
    f.setMode('fail');await f.log.flush();assert.equal(f.log.inspect().pending,1);
    const id=f.sent[0].args.p_events[0].event_id;
    f.advance();f.setMode('ok');await f.log.flush();
    assert.equal(f.sent[1].args.p_events[0].event_id,id);
    assert.equal(f.log.inspect().pending,1); // logger.recovered, not a second READY
    const event=f.sent[1].args.p_events[0];assert(!JSON.stringify(event).includes('secret'));
    assert(!JSON.stringify(event).includes('DO_NOT_LOG_PASSWORD'));
});
test('room switching cannot upload previous room events under new credentials',async()=>{
    const f=fixture(),a=f.room.room_id;f.log.record('ready.tap');f.log.stop();
    f.room.room_id=randomUUID();f.room.room_password='ROOM_B';f.log.record('room.connected');
    await f.log.flush();assert.equal(f.sent[0].args.p_events.length,1);
    assert.equal(f.sent[0].args.p_events[0].room_id,f.room.room_id);
    assert.equal(f.log.inspect().pending,1);assert.notEqual(f.room.room_id,a);
});
test('pending events survive reload and storage denial does not break logging',async()=>{
    const f=fixture();f.log.record('ready.tap');f.log.stop();const resumed=create(f.opts);
    await resumed.flush();assert.equal(f.sent[0].args.p_events[0].event,'ready.tap');
    f.opts.env.sessionStorage={getItem(){throw Error();},setItem(){throw Error();}};
    const blocked=create(f.opts);assert.doesNotThrow(()=>{blocked.record('bid.tap');blocked.stop();});
});
test('queue is bounded and overflow is explicit',async()=>{
    const f=fixture();for(let i=0;i<1500;i++)f.log.record('bid.tap',{amount:i});
    assert(f.log.inspect().pending<=1200);f.log.stop();
    assert([...f.storage.values()].some(v=>v.includes('logger.dropped')));
});
test('channel observation preserves results and excludes sealed amounts',async()=>{
    const f=fixture(),handlers={};const result=Promise.resolve('ok');
    const channel={send:()=>result,on(type,filter,cb){handlers[filter.event]=cb;return this;},subscribe(cb){cb('SUBSCRIBED');return this;}};
    f.log.attachChannel(channel);let received=0;
    channel.on('broadcast',{event:'sealed_bid_submit'},()=>++received);
    channel.subscribe(()=>{});
    assert.equal(channel.send({event:'sealed_bid_submit',payload:{amount:6789,token:'round',password:'secret'}}),result);
    handlers.sealed_bid_submit({payload:{amount:6789,token:'round'}});
    assert.equal(received,1);await result;await f.log.flush();
    assert(!JSON.stringify(f.sent[0].args.p_events).includes('6789'));
    assert(!JSON.stringify(f.sent[0].args.p_events).includes('secret'));
});
test('storage errors are logged without payloads and logger requests cannot recurse',async()=>{
    const f=fixture();f.opts.fetch=async()=>({ok:false,status:503});const log=create(f.opts);
    const response=await log.fetch('https://example.supabase.co/rest/v1/fanta_app_data',{
        method:'POST',body:JSON.stringify({key:'live_auction_x',data:{phase:'active',password:'secret'}})});
    assert.equal(response.status,503);await log.flush();
    assert.equal(f.sent[0].args.p_events[1].event,'storage.error');
    assert.equal(f.sent[0].args.p_events[0].details.request_id,f.sent[0].args.p_events[1].details.request_id);
    const before=log.inspect().pending;
    await log.fetch('https://example.supabase.co/rest/v1/rpc/liveasta_debug_append',{method:'POST',body:'{}'});
    assert.equal(log.inspect().pending,before);assert(!JSON.stringify(f.sent[0].args.p_events).includes('secret'));
});
test('download follows stable cursor, includes all pages, and aborts on logout',async()=>{
    const f=fixture();let calls=0;
    f.client.rpc=async(name,args)=>{calls++;return {data:{through:'2001',earliest_available:'2026-09-15',
        events:[{id:calls===1?'1000':'2001'}],has_more:calls===1},error:null};};
    const result=await f.log.download(f.room.room_id,'Room','admin');
    assert.equal(result.event_count,2);assert.equal(calls,2);
    await assert.rejects(()=>f.log.download(f.room.room_id,'Room','admin',()=>{},()=>false),/terminata/);
});
