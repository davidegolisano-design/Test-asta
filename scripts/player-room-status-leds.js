// LIVEASTA v1.04.20 - stato giocatori nella panoramica stanza
(function(){
  if(window.__liveastaPlayerRoomStatusLedsLoaded)return;
  window.__liveastaPlayerRoomStatusLedsLoaded=true;

  const STATES={
    online:{label:'ONLINE'},
    connecting:{label:'CONNESSIONE'},
    absent:{label:'ASSENTE'},
    offline:{label:'OFFLINE'}
  };

  let absentIds=new Set();
  let refreshTimer=null;

  function normalizeName(value){
    return String(value||'').replace(/\s+/g,' ').trim().toLowerCase();
  }

  function ensureStyles(){
    if(document.getElementById('liveasta-player-room-status-led-style'))return;
    const style=document.createElement('style');
    style.id='liveasta-player-room-status-led-style';
    style.textContent=`
      .player-room-team-main>b{display:inline-flex;align-items:center;gap:8px;min-width:0}
      .liveasta-player-state-led{display:inline-block;width:10px;height:10px;min-width:10px;border-radius:50%;box-shadow:0 0 0 2px rgba(255,255,255,.07);vertical-align:middle}
      .liveasta-player-state-led.online{background:#22c55e;box-shadow:0 0 0 2px rgba(34,197,94,.14),0 0 9px rgba(34,197,94,.72)}
      .liveasta-player-state-led.connecting{background:#f59e0b;box-shadow:0 0 0 2px rgba(245,158,11,.14),0 0 9px rgba(245,158,11,.72)}
      .liveasta-player-state-led.absent{background:#a855f7;box-shadow:0 0 0 2px rgba(168,85,247,.14),0 0 9px rgba(168,85,247,.72)}
      .liveasta-player-state-led.offline{background:#ef4444;box-shadow:0 0 0 2px rgba(239,68,68,.14),0 0 9px rgba(239,68,68,.62)}
    `;
    document.head.appendChild(style);
  }

  function roomId(){
    try{return String(localStorage.getItem('fanta-last-room-id')||'').trim();}catch(_){return '';}
  }

  function teamIdFromRow(row){
    const raw=String(row.getAttribute('onclick')||'');
    const match=raw.match(/openPlayerRoomTeamRoster\('([^']+)'\)/);
    return match?String(match[1]):'';
  }

  function currentOnlineByName(){
    const out=new Map();
    document.querySelectorAll('#online-player-list .online-player-chip').forEach(chip=>{
      const label=chip.querySelector('span:nth-child(2)')?.textContent||'';
      const name=normalizeName(
        label
          .replace(/\s·\sBANDITORE\b/gi,'')
          .replace(/\s·\sASSENTE\b/gi,'')
      );
      if(!name)return;
      out.set(name,chip.classList.contains('absent')?'absent':'online');
    });
    return out;
  }

  function ownState(){
    const pill=document.getElementById('player-connection-pill');
    if(!pill)return null;
    if(pill.classList.contains('absent'))return 'absent';
    if(pill.classList.contains('connecting'))return 'connecting';
    if(pill.classList.contains('online'))return 'online';
    return 'offline';
  }

  function rowTeamName(row){
    const b=row.querySelector('.player-room-team-main > b');
    if(!b)return '';
    const clone=b.cloneNode(true);
    clone.querySelectorAll('.liveasta-player-state-led').forEach(el=>el.remove());
    return normalizeName(String(clone.textContent||'').replace(/\s·\sTU\s*$/i,''));
  }

  function setLed(row,state){
    const b=row.querySelector('.player-room-team-main > b');
    if(!b)return;
    let led=b.querySelector('.liveasta-player-state-led');
    if(!led){
      led=document.createElement('span');
      led.className='liveasta-player-state-led';
      led.setAttribute('aria-hidden','true');
      b.insertBefore(led,b.firstChild);
    }
    const safe=STATES[state]?state:'offline';
    led.className=`liveasta-player-state-led ${safe}`;
    led.title=STATES[safe].label;
  }

  function decorate(){
    const list=document.getElementById('player-room-overview-list');
    if(!list)return;
    const online=currentOnlineByName();
    const self=ownState();

    list.querySelectorAll('.player-room-team-row').forEach(row=>{
      const id=teamIdFromRow(row);
      const name=rowTeamName(row);
      let state='offline';

      if(row.classList.contains('mine') && self){
        state=self;
      }else if(id && absentIds.has(id)){
        state='absent';
      }else if(online.has(name)){
        state=online.get(name);
      }

      setLed(row,state);
    });
  }

  async function refreshAbsent(){
    const id=roomId();
    if(!id || !window.supabaseClient){
      absentIds=new Set();
      decorate();
      return;
    }
    try{
      const {data,error}=await window.supabaseClient
        .from('fanta_app_data')
        .select('data')
        .like('key',`liveasta_absence_${id}_%`);
      if(error)throw error;
      const next=new Set();
      (data||[]).forEach(row=>{
        const d=row?.data||{};
        if(d.absent && d.team_id)next.add(String(d.team_id));
      });
      absentIds=next;
    }catch(_){
      // Lo stato presenza realtime resta comunque utilizzabile.
    }
    decorate();
  }

  function overviewOpen(){
    return document.getElementById('player-room-overview-overlay')?.classList.contains('open')===true;
  }

  function installOpenWrapper(){
    const original=window.openPlayerRoomOverview;
    if(typeof original!=='function' || original.__statusLedWrapped)return false;
    async function wrapped(...args){
      const result=await original.apply(this,args);
      await refreshAbsent();
      decorate();
      return result;
    }
    wrapped.__statusLedWrapped=true;
    window.openPlayerRoomOverview=wrapped;
    return true;
  }

  function boot(){
    ensureStyles();
    installOpenWrapper();

    const list=document.getElementById('player-room-overview-list');
    if(list)new MutationObserver(()=>decorate()).observe(list,{childList:true,subtree:true});

    const online=document.getElementById('online-player-list');
    if(online)new MutationObserver(()=>{if(overviewOpen())decorate();}).observe(online,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});

    const own=document.getElementById('player-connection-pill');
    if(own)new MutationObserver(()=>{if(overviewOpen())decorate();}).observe(own,{attributes:true,attributeFilter:['class']});

    refreshTimer=setInterval(()=>{
      if(!installOpenWrapper() && overviewOpen())refreshAbsent();
      else if(overviewOpen())refreshAbsent();
    },4000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
