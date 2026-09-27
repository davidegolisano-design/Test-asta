/* Ordered auction snapshots and protection against obsolete READY restores. */
(function(root){
  'use strict';

  function createSnapshotWriter(persist){
    const queues=new Map();
    return function save(record){
      // Capture now: later taps must not mutate a snapshot already in flight.
      const snapshot=JSON.parse(JSON.stringify(record));
      return new Promise((resolve,reject)=>{
        let queue=queues.get(snapshot.key);
        if(!queue){queue={pending:null,running:false};queues.set(snapshot.key,queue);}
        if(queue.pending){
          queue.pending.snapshot=snapshot;
          queue.pending.waiters.push({resolve,reject});
        }else queue.pending={snapshot,waiters:[{resolve,reject}]};
        if(queue.running)return;
        queue.running=true;
        (async()=>{
          while(queue.pending){
            const item=queue.pending;
            queue.pending=null;
            try{
              await persist(item.snapshot);
              item.waiters.forEach(waiter=>waiter.resolve());
            }catch(error){item.waiters.forEach(waiter=>waiter.reject(error));}
          }
          queues.delete(snapshot.key);
        })();
      });
    };
  }

  function createPlayerStateGuard(){
    let revision=0;
    const closed=new Set();
    const key=(room,token)=>JSON.stringify([String(room||''),String(token||'')]);
    return {
      advance:()=>++revision,
      isCurrent:expected=>expected===revision,
      closeReady(room,token){
        if(!token)return;
        closed.add(key(room,token));
        if(closed.size>128)closed.delete(closed.values().next().value);
      },
      isReadyClosed:(room,token)=>!!token&&closed.has(key(room,token))
    };
  }

  root.LiveAstaAuctionSync=Object.freeze({createSnapshotWriter,createPlayerStateGuard});
})(globalThis);
