// LIVEASTA room chat — DEV v1.04.14
// Realtime session chat: activation persists per room; messages travel on the existing room channel.
(function(){
  if(window.__liveastaRoomChatLoaded)return;
  window.__liveastaRoomChatLoaded=true;

  const MAX_MESSAGES=100;
  const MAX_LENGTH=280;
  let enabled=false;
  let loadedForKey='';
  let open=false;
  let unread=0;
  let messages=[];
  let attachedChannel=null;
  let dragMoved=false;

  function settingKey(){
    return currentRoomId?`liveasta_room_chat_${currentRoomId}`:'';
  }

  function historyKey(){
    return currentRoomId?`liveasta_chat_session_${currentRoomId}`:'';
  }

  function actorKey(){
    if(auctioneerLockKey)return 'auctioneer';
    if(myTeamId)return `team:${String(myTeamId)}`;
    return '';
  }

  function actorName(){
    if(auctioneerLockKey)return 'BANDITORE';
    return String(myTeamName||'GIOCATORE').trim()||'GIOCATORE';
  }

  function canChat(){
    return !!(currentRoomId && (auctioneerLockKey || myTeamId) && premium.has('chat'));
  }

  function roomName(){
    return String(currentRoom?.name||currentRoomCode||'STANZA').trim()||'STANZA';
  }

  function normalizeMessage(raw){
    if(!raw||typeof raw!=='object')return null;
    const text=String(raw.text||'').trim().slice(0,MAX_LENGTH);
    const sender=String(raw.sender||'').trim().slice(0,60);
    if(!text||!sender)return null;
    return {
      id:String(raw.id||''),
      room_id:String(raw.room_id||''),
      sender_id:String(raw.sender_id||''),
      sender,
      text,
      ts:Number(raw.ts)||Date.now()
    };
  }

  function messageId(){
    try{return crypto.randomUUID();}catch(_){return `${Date.now()}_${Math.random().toString(36).slice(2)}`;}
  }

  function saveLocalHistory(){
    const key=historyKey();
    if(!key)return;
    try{sessionStorage.setItem(key,JSON.stringify(messages.slice(-MAX_MESSAGES)));}catch(_){}
  }

  function loadLocalHistory(){
    messages=[];
    const key=historyKey();
    if(!key)return;
    try{
      const parsed=JSON.parse(sessionStorage.getItem(key)||'[]');
      if(Array.isArray(parsed))messages=parsed.map(normalizeMessage).filter(Boolean).slice(-MAX_MESSAGES);
    }catch(_){}
  }

  function ensureUI(){
    let fab=document.getElementById('room-chat-fab');
    if(!fab){
      fab=document.createElement('button');
      fab.id='room-chat-fab';
      fab.className='room-chat-fab';
      fab.type='button';
      fab.setAttribute('aria-label','Apri chat della stanza');
      fab.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-8 8H7l-4 2 1.4-4.2A8.5 8.5 0 1 1 21 12Z"></path></svg><span class="room-chat-unread-dot">0</span>`;
      document.body.appendChild(fab);
      installDrag(fab);
      fab.addEventListener('click',event=>{
        if(dragMoved){event.preventDefault();dragMoved=false;return;}
        openRoomChat();
      });
    }

    let overlay=document.getElementById('room-chat-overlay');
    if(!overlay){
      overlay=document.createElement('div');
      overlay.id='room-chat-overlay';
      overlay.className='room-chat-overlay';
      overlay.setAttribute('aria-hidden','true');
      overlay.innerHTML=`
        <section class="room-chat-panel" role="dialog" aria-modal="true" aria-label="Chat stanza">
          <header class="room-chat-header">
            <button id="room-chat-close" class="room-chat-close" type="button" aria-label="Chiudi chat">×</button>
            <div class="room-chat-head-copy">
              <strong class="room-chat-title">CHAT STANZA</strong>
              <span id="room-chat-room-name" class="room-chat-room-name">--</span>
            </div>
          </header>
          <div id="room-chat-messages" class="room-chat-messages" aria-live="polite"></div>
          <div class="room-chat-composer">
            <textarea id="room-chat-input" class="room-chat-input" maxlength="${MAX_LENGTH}" rows="1" placeholder="Scrivi un messaggio…"></textarea>
            <button id="room-chat-send" class="room-chat-send" type="button" aria-label="Invia messaggio">➤</button>
          </div>
        </section>`;
      document.body.appendChild(overlay);

      overlay.querySelector('#room-chat-close')?.addEventListener('click',closeRoomChat);
      overlay.querySelector('#room-chat-send')?.addEventListener('click',sendRoomChatMessage);
      overlay.querySelector('#room-chat-input')?.addEventListener('keydown',event=>{
        if(event.key==='Enter'&&!event.shiftKey){
          event.preventDefault();
          sendRoomChatMessage();
        }
      });
    }
    return {fab,overlay};
  }

  function installDrag(fab){
    let pointerId=null;
    let startX=0,startY=0,originX=0,originY=0;

    const saved=()=>{
      const key=currentRoomId?`liveasta_chat_fab_${currentRoomId}`:'liveasta_chat_fab';
      try{return JSON.parse(localStorage.getItem(key)||'null');}catch(_){return null;}
    };
    const store=(x,y)=>{
      const key=currentRoomId?`liveasta_chat_fab_${currentRoomId}`:'liveasta_chat_fab';
      try{localStorage.setItem(key,JSON.stringify({x,y}));}catch(_){}
    };
    const clamp=(x,y)=>({
      x:Math.max(6,Math.min(window.innerWidth-fab.offsetWidth-6,x)),
      y:Math.max(6,Math.min(window.innerHeight-fab.offsetHeight-6,y))
    });
    const apply=(x,y)=>{
      const p=clamp(x,y);
      fab.style.left=`${p.x}px`;
      fab.style.top=`${p.y}px`;
      fab.style.right='auto';
      fab.style.bottom='auto';
      return p;
    };
    const restore=()=>{
      const p=saved();
      if(p&&Number.isFinite(Number(p.x))&&Number.isFinite(Number(p.y)))apply(Number(p.x),Number(p.y));
    };

    fab.addEventListener('pointerdown',event=>{
      if(event.button!==undefined&&event.button!==0)return;
      pointerId=event.pointerId;
      dragMoved=false;
      startX=event.clientX;startY=event.clientY;
      const rect=fab.getBoundingClientRect();
      originX=rect.left;originY=rect.top;
      try{fab.setPointerCapture(pointerId);}catch(_){}
    });

    fab.addEventListener('pointermove',event=>{
      if(pointerId===null||event.pointerId!==pointerId)return;
      const dx=event.clientX-startX,dy=event.clientY-startY;
      if(Math.hypot(dx,dy)>5)dragMoved=true;
      if(!dragMoved)return;
      event.preventDefault();
      apply(originX+dx,originY+dy);
    });

    const end=event=>{
      if(pointerId===null||event.pointerId!==pointerId)return;
      const rect=fab.getBoundingClientRect();
      if(dragMoved)store(rect.left,rect.top);
      try{fab.releasePointerCapture(pointerId);}catch(_){}
      pointerId=null;
      setTimeout(()=>{dragMoved=false;},0);
    };
    fab.addEventListener('pointerup',end);
    fab.addEventListener('pointercancel',end);
    window.addEventListener('resize',()=>{
      const rect=fab.getBoundingClientRect();
      const p=clamp(rect.left,rect.top);
      apply(p.x,p.y);
    },{passive:true});

    requestAnimationFrame(restore);
  }

  function updateFab(){
    const {fab}=ensureUI();
    const visible=enabled&&canChat();
    fab.classList.toggle('visible',visible);
    fab.classList.toggle('unread',visible&&unread>0);
    const dot=fab.querySelector('.room-chat-unread-dot');
    if(dot)dot.textContent=unread>99?'99+':String(unread);
    fab.setAttribute('aria-label',unread>0?`Chat stanza · ${unread} nuovi messaggi`:'Apri chat della stanza');
  }

  function renderMessages(){
    const {overlay}=ensureUI();
    const host=overlay.querySelector('#room-chat-messages');
    if(!host)return;
    host.replaceChildren();

    if(!messages.length){
      const empty=document.createElement('div');
      empty.className='room-chat-empty';
      empty.textContent='Nessun messaggio nella sessione.';
      host.appendChild(empty);
      return;
    }

    const me=actorKey();
    messages.forEach(message=>{
      const item=document.createElement('article');
      item.className='room-chat-message'+(message.sender_id===me?' self':'');

      const head=document.createElement('div');
      head.className='room-chat-message-head';
      const sender=document.createElement('strong');
      sender.textContent=message.sender;
      const time=document.createElement('time');
      try{time.textContent=new Date(message.ts).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});}catch(_){time.textContent='';}
      head.append(sender,time);

      const body=document.createElement('div');
      body.className='room-chat-message-body';
      body.textContent=message.text;
      item.append(head,body);
      host.appendChild(item);
    });

    requestAnimationFrame(()=>{host.scrollTop=host.scrollHeight;});
  }

  function appendMessage(raw,{local=false}={}){
    const message=normalizeMessage(raw);
    if(!message)return;
    if(message.room_id&&currentRoomId&&message.room_id!==String(currentRoomId))return;
    if(message.id&&messages.some(item=>item.id===message.id))return;

    messages.push(message);
    if(messages.length>MAX_MESSAGES)messages=messages.slice(-MAX_MESSAGES);
    saveLocalHistory();

    if(open){
      renderMessages();
    }else if(!local){
      unread=Math.min(999,unread+1);
    }
    updateFab();
  }

  function openRoomChat(){
    if(!premium.require('chat'))return;
    if(!enabled||!canChat())return;
    const {overlay}=ensureUI();
    open=true;
    unread=0;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden','false');
    const name=overlay.querySelector('#room-chat-room-name');
    if(name)name.textContent=roomName();
    renderMessages();
    updateFab();
    document.body.classList.add('room-chat-open');
    // The chat opens without summoning the on-screen keyboard.
  }

  function closeRoomChat(){
    const {overlay}=ensureUI();
    open=false;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('room-chat-open');
    updateFab();
  }

  async function sendRoomChatMessage(){
    if(!enabled||!canChat()||!channel)return;
    const {overlay}=ensureUI();
    const input=overlay.querySelector('#room-chat-input');
    if(!input)return;
    const text=String(input.value||'').trim().slice(0,MAX_LENGTH);
    if(!text)return;

    const message={
      id:messageId(),
      room_id:String(currentRoomId),
      sender_id:actorKey(),
      sender:actorName(),
      text,
      ts:Date.now()
    };

    input.value='';
    appendMessage(message,{local:true});
    try{
      await channel.send({type:'broadcast',event:'room_chat_message',payload:message});
    }catch(error){
      console.warn('Invio chat stanza non riuscito',error);
    }
  }

  function updateControlUI(){
    const btn=document.getElementById('room-chat-toggle-btn');
    const status=document.getElementById('room-chat-status');
    if(btn){
      btn.checked=enabled && premium.has('chat');
    }
    if(status){
      status.textContent=!premium.has('chat')?'Sblocca Premium per attivare la chat.':enabled
        ?'Chat live attiva per banditore e giocatori della stanza.'
        :'Chat live disattivata. I messaggi della sessione non vengono archiviati sul server.';
    }
    updateFab();
    premium.decorate();
  }

  function injectManagementControl(){
    if(document.getElementById('room-chat-control-card')){updateControlUI();return;}
    const anchor=document.getElementById('opponent-credits-control-card')||document.querySelector('#screen-room-control .auctioneer-player-control-card');
    const host=anchor?.parentElement;
    if(!host)return;

    const card=document.createElement('article');
    card.id='room-chat-control-card';
    card.className='mg-card mg-setting-card room-chat-control-card';
    card.dataset.premiumFeature='chat';
    card.innerHTML=`
      <div class="mg-setting-head">
        <div>
          <h3>Chat stanza</h3>
          <p>Attiva una chat live per i partecipanti. L'icona resta mobile sullo schermo e segnala in rosso i nuovi messaggi.</p>
        </div>
        <label class="mg-switch-label" title="Chat stanza">
          <input id="room-chat-toggle-btn" type="checkbox" aria-label="Chat stanza">
          <span class="mg-switch-ui" aria-hidden="true"></span>
        </label>
      </div>
      <div id="room-chat-status" class="mg-status-text"></div>`;
    if(anchor.nextSibling)host.insertBefore(card,anchor.nextSibling);else host.appendChild(card);
    card.querySelector('#room-chat-toggle-btn')?.addEventListener('change',toggleRoomChat);
    updateControlUI();
  }

  async function loadEnabled(force=false){
    const key=settingKey();
    if(!key){enabled=false;loadedForKey='';updateControlUI();return false;}
    if(!force&&loadedForKey===key){updateControlUI();return enabled;}

    try{
      const {data,error}=await supabaseClient.from('fanta_app_data').select('data').eq('key',key).maybeSingle();
      if(error)throw error;
      enabled=!!data?.data?.enabled;
      loadedForKey=key;
    }catch(error){
      console.warn('Lettura chat stanza non riuscita',error);
      enabled=false;
    }

    loadLocalHistory();
    unread=0;
    updateControlUI();
    return enabled;
  }

  async function saveEnabled(){
    const key=settingKey();
    if(!key)return false;
    const {error}=await supabaseClient.from('fanta_app_data').upsert({
      key,
      data:{enabled:!!enabled},
      file_name:'chat-stanza',
      updated_at:new Date().toISOString()
    },{onConflict:'key'});
    if(error){console.warn('Salvataggio chat stanza non riuscito',error);return false;}
    loadedForKey=key;
    return true;
  }

  async function toggleRoomChat(){
    if(!premium.require('chat')){updateControlUI();return;}
    if(!auctioneerLockKey||!currentRoomId)return;
    const previous=enabled;
    enabled=!enabled;
    updateControlUI();
    if(!enabled)closeRoomChat();

    const ok=await saveEnabled();
    if(!ok){
      enabled=previous;
      updateControlUI();
      if(typeof appAlert==='function')appAlert('Impossibile salvare l’impostazione della chat.');
      return;
    }

    channel?.send({type:'broadcast',event:'room_chat_toggle',payload:{enabled}}).catch(()=>{});
  }

  function attachChannelHandlers(){
    if(!channel||attachedChannel===channel)return;
    attachedChannel=channel;

    channel.on('broadcast',{event:'room_chat_toggle'},packet=>{
      const value=packet?.payload?.enabled;
      if(typeof value!=='boolean')return;
      enabled=value;
      loadedForKey=settingKey();
      if(!enabled)closeRoomChat();
      updateControlUI();
    });

    channel.on('broadcast',{event:'room_chat_message'},packet=>{
      if(!enabled)return;
      appendMessage(packet?.payload||{}, {local:false});
    });
  }

  window.addEventListener('liveasta:premium-change',()=>{
    if(!premium.has('chat'))closeRoomChat();
    updateControlUI();
  });

  const originalConnectToRoom=connectToRoom;
  connectToRoom=async function(){
    const result=await originalConnectToRoom.apply(this,arguments);
    attachChannelHandlers();
    await loadEnabled(true);
    updateFab();
    return result;
  };

  if(typeof renderRoomControl==='function'){
    const originalRenderRoomControl=renderRoomControl;
    renderRoomControl=function(){
      const result=originalRenderRoomControl.apply(this,arguments);
      injectManagementControl();
      loadEnabled(false).catch(()=>{});
      return result;
    };
  }

  if(typeof openRoomControl==='function'){
    const originalOpenRoomControl=openRoomControl;
    openRoomControl=async function(){
      const result=await originalOpenRoomControl.apply(this,arguments);
      injectManagementControl();
      await loadEnabled(true);
      return result;
    };
  }

  if(typeof leaveCurrentSession==='function'){
    const originalLeaveCurrentSession=leaveCurrentSession;
    leaveCurrentSession=async function(){
      closeRoomChat();
      enabled=false;loadedForKey='';messages=[];unread=0;attachedChannel=null;
      updateFab();
      return await originalLeaveCurrentSession.apply(this,arguments);
    };
  }

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&open){event.preventDefault();closeRoomChat();}
  });

  function boot(){
    ensureUI();
    injectManagementControl();
    if(channel&&currentRoomId){
      attachChannelHandlers();
      loadEnabled(true).catch(()=>{});
    }else updateFab();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.openRoomChat=openRoomChat;
  window.closeRoomChat=closeRoomChat;
  window.sendRoomChatMessage=sendRoomChatMessage;
  window.toggleRoomChat=toggleRoomChat;
  window.refreshRoomChat=()=>{injectManagementControl();updateFab();};
})();
