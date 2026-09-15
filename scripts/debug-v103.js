// LIVEASTA v1.03 — diagnostics extension for session resume, lock lifecycle and presence.
(function(){
  if(window.__liveastaDebugV103Loaded)return;
  window.__liveastaDebugV103Loaded=true;

  const RESUME_KEY='liveasta_resume_session_v1';
  const EXTRA_BROADCASTS=new Set([
    'player_offline_now','player_online_fallback','team_availability_request','team_availability_state',
    'self_raise_setting','nomination_state','auctioned_state','audio_route_updated','live_state_request'
  ]);

  function ctx(roomId='',teamId=null,actor='observer'){
    return {
      room_id:String(roomId||currentRoomId||''),
      team_id:teamId||myTeamId||null,
      actor:actor||(auctioneerLockKey?'auctioneer':myTeamId?'player':'observer'),
      phase:readyGateWaiting||playerReadyToken?'ready':isAuctionActive?'active':liveAuctionState?.phase||'idle',
      player_id:String(currentAuctionPlayer?.Id||''),
      ready_token:readyGateToken||playerReadyToken||'',
      auction_active:!!isAuctionActive,
      ready_waiting:!!readyGateWaiting
    };
  }

  function log(event,details={},level='info',override=null){
    try{
      if(typeof roomDebug==='undefined'||!roomDebug?.record)return;
      const c=override||ctx();
      if(!c.room_id)return;
      roomDebug.record(event,details,level,c);
    }catch(_){}
  }

  function readResumeRaw(){
    try{return JSON.parse(localStorage.getItem(RESUME_KEY)||'null');}catch(_){return null;}
  }

  const bootResume=readResumeRaw();
  if(bootResume?.room_id){
    log('session.resume_candidate',{
      mode:String(bootResume.role||''),
      status:Number(bootResume.expires_at||0)>Date.now()?'valid':'expired',
      screen:String(bootResume.screen||'')
    },Number(bootResume.expires_at||0)>Date.now()?'info':'warning',ctx(bootResume.room_id,bootResume.team_id||null,bootResume.role||'observer'));

    const started=Date.now();
    let done=false;
    const monitor=setInterval(()=>{
      if(done)return;
      const sameRoom=String(currentRoomId||'')===String(bootResume.room_id||'');
      const sameTeam=bootResume.role!=='player'||String(myTeamId||'')===String(bootResume.team_id||'');
      if(sameRoom&&sameTeam){
        done=true;clearInterval(monitor);
        log('session.resume_success',{mode:String(bootResume.role||''),duration_ms:Date.now()-started,screen:document.querySelector('.screen.active')?.id||''});
        return;
      }
      if(Date.now()-started>30000){
        done=true;clearInterval(monitor);
        const err=bootResume.role==='player'
          ?String(document.getElementById('player-room-error')?.textContent||document.getElementById('player-pin-error')?.textContent||'timeout')
          :String(document.getElementById('auction-room-error')?.textContent||'timeout');
        log('session.resume_failed',{mode:String(bootResume.role||''),reason:err.slice(0,150),duration_ms:Date.now()-started},'warning',ctx(bootResume.room_id,bootResume.team_id||null,bootResume.role||'observer'));
      }
    },500);
  }

  function wrapAsync(name,before,after){
    try{
      const original=window[name];
      if(typeof original!=='function'||original.__debugV103Wrapped)return;
      const wrapped=async function(){
        let meta={};
        try{meta=before?.apply(this,arguments)||{};}catch(_){}
        try{
          const out=await original.apply(this,arguments);
          try{after?.call(this,null,out,meta,...arguments);}catch(_){}
          return out;
        }catch(error){
          try{after?.call(this,error,null,meta,...arguments);}catch(_){}
          throw error;
        }
      };
      wrapped.__debugV103Wrapped=true;
      window[name]=wrapped;
    }catch(_){}
  }

  wrapAsync('acquireAuctioneerRoomLock',room=>({room_id:room?.id}), (error,result,meta)=>{
    log('auctioneer.lock_acquire',{status:error?'error':result?'ok':'blocked',reason:error?.name||''},error?'error':result?'info':'warning',ctx(meta.room_id,null,'auctioneer'));
  });
  wrapAsync('releaseAuctioneerRoomLock',()=>({room_id:currentRoomId}), (error)=>{
    if(currentRoomId)log('auctioneer.lock_release',{status:error?'error':'ok'},error?'error':'info');
  });
  wrapAsync('forceAuctioneerExitAfterLockLoss',()=>({room_id:currentRoomId}), (error,_r,meta)=>{
    log('auctioneer.lock_lost',{status:error?'error':'forced_exit'},'error',ctx(meta.room_id,null,'auctioneer'));
  });
  wrapAsync('leaveCurrentSession',()=>({room_id:currentRoomId,team_id:myTeamId,actor:auctioneerLockKey?'auctioneer':myTeamId?'player':'observer'}), (error,_r,meta)=>{
    log('session.leave',{status:error?'error':'ok'},error?'error':'info',ctx(meta.room_id,meta.team_id,meta.actor));
  });

  try{
    const originalAttach=roomDebug.attachChannel.bind(roomDebug);
    roomDebug.attachChannel=function(channel){
      const ch=originalAttach(channel);
      if(!ch||ch.__liveastaDebugV103)return ch;
      ch.__liveastaDebugV103=true;
      const bound=ctx(currentRoomId,myTeamId,auctioneerLockKey?'auctioneer':myTeamId?'player':'observer');
      const originalSend=ch.send.bind(ch);
      const originalOn=ch.on.bind(ch);
      ch.send=function(message,...args){
        const event=message?.event;
        if(EXTRA_BROADCASTS.has(event)){
          const p=message?.payload||{};
          log('realtime.send.extra',{event,team_id:p.team_id,request_id:p.request_id,status:p.status,absent:p.absent},'info',bound);
        }
        return originalSend(message,...args);
      };
      ch.on=function(type,filter,callback){
        if(type==='presence'){
          return originalOn(type,filter,function(payload){
            let total=0;
            try{total=Object.values(ch.presenceState?.()||{}).reduce((n,v)=>n+(Array.isArray(v)?v.length:0),0);}catch(_){}
            const item=payload?.newPresences?.[0]||payload?.leftPresences?.[0]||{};
            log('presence.'+String(filter?.event||'event'),{team_id:item.team_id,total,status:String(filter?.event||'')},'info',bound);
            return callback?.apply(this,arguments);
          });
        }
        if(type==='broadcast'&&EXTRA_BROADCASTS.has(filter?.event)){
          return originalOn(type,filter,function(payload){
            const p=payload?.payload||{};
            log('realtime.receive.extra',{event:filter.event,team_id:p.team_id,request_id:p.request_id,status:p.status,absent:p.absent},'info',bound);
            return callback?.apply(this,arguments);
          });
        }
        return originalOn(type,filter,callback);
      };
      return ch;
    };
  }catch(_){}

  try{
    const originalRpc=supabaseClient?.rpc?.bind(supabaseClient);
    if(originalRpc){
      supabaseClient.rpc=function(name,args,...rest){
        if(!/^liveasta_debug_/.test(String(name)) && ['fanta_assign_player','fanta_remove_purchase'].includes(String(name))){
          const started=Date.now();
          log('rpc.request',{operation:String(name),team_id:args?.p_team_id,player_id:args?.p_player_id,target:args?.p_purchase_id,amount:args?.p_price});
          const q=originalRpc(name,args,...rest);
          try{
            const oldThen=q.then?.bind(q);
            if(oldThen){
              q.then=(ok,fail)=>oldThen(result=>{
                log(result?.error?'rpc.error':'rpc.result',{operation:String(name),status:result?.error?'error':'ok',duration_ms:Date.now()-started},result?.error?'error':'info');
                return ok?ok(result):result;
              },error=>{
                log('rpc.error',{operation:String(name),status:'exception',reason:error?.name||'Error',duration_ms:Date.now()-started},'error');
                if(fail)return fail(error);throw error;
              });
            }
          }catch(_){}
          return q;
        }
        return originalRpc(name,args,...rest);
      };
    }
  }catch(_){}

  let lastScreen='';
  function captureScreen(){
    const current=document.querySelector('.screen.active')?.id||'';
    if(current&&current!==lastScreen){
      if(currentRoomId)log('screen.change',{screen:current,reason:lastScreen?'from '+lastScreen:'initial'});
      lastScreen=current;
    }
  }
  setInterval(captureScreen,750);
  document.addEventListener('visibilitychange',captureScreen);
  captureScreen();
  log('logger.extension',{mode:'v1.03-debug.2',screen:document.querySelector('.screen.active')?.id||''});
})();
