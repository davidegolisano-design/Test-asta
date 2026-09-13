/* LIVEASTA DEV — canonical Gestione helpers · v1.03 MGMT-09
   UI-only: participant list/order/detail. Auction rules remain in app.js. */
(function(){
  'use strict';

  function syncDevVersionBadge(){
    const marker=document.querySelector('#liveasta-dev-static-marker strong');
    if(marker)marker.textContent='⚠ AMBIENTE DEV · v1.03 MGMT-09';
    if(document.title.startsWith('LIVEASTA DEV'))document.title='LIVEASTA DEV · v1.03 MGMT-09';
  }

  function ensureDesktopManagementScroll(){
    if(document.getElementById('mgmt09-desktop-scroll-style'))return;
    const style=document.createElement('style');
    style.id='mgmt09-desktop-scroll-style';
    style.textContent=`
      body.auctioneer-desktop #screen-room-control{
        height:100dvh!important;
        min-height:100dvh!important;
        max-height:100dvh!important;
        overflow-x:hidden!important;
        overflow-y:auto!important;
        overscroll-behavior-y:contain!important;
        scrollbar-gutter:stable!important;
      }
      body.auctioneer-desktop #screen-room-control .mg-page.control-grid{
        height:auto!important;
        min-height:100%!important;
        max-height:none!important;
        overflow:visible!important;
      }
    `;
    document.head.appendChild(style);
  }

  function cleanupOldManagement(){
    const root=document.getElementById('screen-room-control');
    if(!root)return;
    root.classList.remove('v092-mobile-management','mg-system');
    root.querySelectorAll('.v087-collapsed,.v090-collapsed').forEach(el=>el.classList.remove('v087-collapsed','v090-collapsed'));
    root.querySelectorAll('.v087-collapse-btn,.v091-collapse-btn,.v092-collapse-btn,.mg-section-label').forEach(el=>el.remove());
    root.querySelectorAll('[data-v087-collapsible]').forEach(el=>el.removeAttribute('data-v087-collapsible'));
  }

  function presenceFor(teamId){
    const id=String(teamId);
    try{
      if(typeof absentTeamIds!=='undefined' && absentTeamIds?.has(id)) return {key:'absent',label:'ASSENTE'};
      if(typeof auctioneerPlayerMode!=='undefined' && auctioneerPlayerMode && typeof auctioneerPlayerTeamId!=='undefined' && String(auctioneerPlayerTeamId||'')===id) return {key:'online',label:'ONLINE'};
      const p=(typeof onlinePlayers!=='undefined' && onlinePlayers?.get)?onlinePlayers.get(id):null;
      const raw=String(p?.state||p?.status||'').toLowerCase();
      if(raw.includes('connect')) return {key:'connecting',label:'CONNESSIONE'};
      if(p) return {key:'online',label:'ONLINE'};
    }catch(_){ }
    return {key:'offline',label:'OFFLINE'};
  }

  function orderedTeams(){
    try{
      if(typeof nominationOrderedTeams==='function'){
        const ordered=nominationOrderedTeams();
        if(Array.isArray(ordered) && ordered.length)return ordered;
      }
    }catch(_){ }
    return typeof teamsCache!=='undefined' && Array.isArray(teamsCache)?teamsCache:[];
  }

  function esc(value){
    try{return typeof escapeHtml==='function'?escapeHtml(String(value??'')):String(value??'');}
    catch(_){return String(value??'');}
  }

  window.renderManagementTeamList=function(){
    const list=document.getElementById('control-team-list');
    if(!list)return;
    const teams=orderedTeams();
    if(!teams.length){list.innerHTML='<div class="mg-team-empty">Nessuna squadra</div>';return;}
    const activeTurn=(typeof nominationState!=='undefined' && nominationState?.enabled)?String(nominationState.turn_team_id||''):'';
    list.innerHTML=teams.map((team,index)=>{
      const id=String(team.id);
      const state=presenceFor(id);
      const current=activeTurn===id;
      return `<div class="mg-team-row mg-team-${state.key}${current?' mg-team-current':''}" role="button" tabindex="0" data-team-id="${esc(id)}" onclick="openManagementTeamDetail('${esc(id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openManagementTeamDetail('${esc(id)}')}">
        <span class="mg-team-state-bar" aria-hidden="true"></span>
        <div class="mg-team-row-main"><strong>${esc(team.name)}</strong><span>${state.label}${current?' · TURNO':''}</span></div>
        <div class="mg-team-order-actions" aria-label="Sposta ordine">
          <button type="button" class="mg-team-order-btn" ${index===0?'disabled':''} aria-label="Sposta su" onclick="event.stopPropagation();moveManagementTeamOrder('${esc(id)}',-1)">↑</button>
          <button type="button" class="mg-team-order-btn" ${index===teams.length-1?'disabled':''} aria-label="Sposta giù" onclick="event.stopPropagation();moveManagementTeamOrder('${esc(id)}',1)">↓</button>
        </div>
        <button type="button" class="mg-team-open" aria-label="Apri ${esc(team.name)}" onclick="event.stopPropagation();openManagementTeamDetail('${esc(id)}')">›</button>
      </div>`;
    }).join('');
  };

  window.moveManagementTeamOrder=async function(teamId,delta){
    if(typeof moveNominationOrder==='function') await moveNominationOrder(String(teamId),Number(delta));
    else window.renderManagementTeamList();
  };

  function metric(label,value){return `<div class="mg-team-metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;}

  window.openManagementTeamDetail=function(teamId){
    const id=String(teamId);
    const team=(typeof teamsCache!=='undefined'?teamsCache:[]).find(t=>String(t.id)===id);
    const overlay=document.getElementById('management-team-detail');
    if(!team||!overlay)return;
    overlay.dataset.teamId=id;
    const state=presenceFor(id);
    const stateEl=document.getElementById('mg-team-detail-state');
    stateEl.textContent=state.label;
    stateEl.className='mg-team-detail-state mg-state-'+state.key;
    document.getElementById('mg-team-detail-title').textContent=team.name;
    document.getElementById('mg-team-detail-name').value=team.name||'';
    document.getElementById('mg-team-detail-credits').value=team.credits_remaining??0;

    const counts=typeof teamCounts==='function'?teamCounts(team.id):{};
    const metrics=document.getElementById('mg-team-detail-metrics');
    if(typeof isMantraRoom==='function' && isMantraRoom()){
      const max=typeof mantraRosterMax==='function'?mantraRosterMax():'--';
      const min=typeof mantraRosterMin==='function'?mantraRosterMin():'--';
      const gk=typeof mantraMinGoalkeepers==='function'?mantraMinGoalkeepers():'--';
      metrics.innerHTML=metric('Por',`${counts.Por||0}/${gk}`)+metric('Rosa',counts.total||0)+metric('Liberi',Math.max(0,Number(max||0)-Number(counts.total||0)))+metric('Min.',min)+metric('Max.',max);
    }else{
      const limits=typeof roomLimits==='function'?roomLimits():{P:0,D:0,C:0,A:0};
      metrics.innerHTML=metric('P',`${counts.P||0}/${limits.P||0}`)+metric('D',`${counts.D||0}/${limits.D||0}`)+metric('C',`${counts.C||0}/${limits.C||0}`)+metric('A',`${counts.A||0}/${limits.A||0}`)+metric('Tot.',`${counts.total||0}/${typeof totalRoomSlots==='function'?totalRoomSlots():0}`);
    }
    document.getElementById('mg-team-detail-pin-value').innerHTML=typeof teamPinStatusHtml==='function'?teamPinStatusHtml(team.id):'--';
    overlay.hidden=false;
    document.body.classList.add('mg-detail-open');
  };

  window.closeManagementTeamDetail=function(){
    const overlay=document.getElementById('management-team-detail');
    if(!overlay)return;
    overlay.hidden=true;
    overlay.dataset.teamId='';
    document.body.classList.remove('mg-detail-open');
  };

  window.saveManagementTeamDetail=async function(){
    const overlay=document.getElementById('management-team-detail');
    const id=String(overlay?.dataset.teamId||'');
    if(!id||typeof saveTeamControl!=='function')return;
    const name=document.getElementById('mg-team-detail-name');
    const credits=document.getElementById('mg-team-detail-credits');
    if(!name?.value.trim()){alert('Il nome squadra è obbligatorio.');return;}

    const bridgeName=document.createElement('input');
    const bridgeCredits=document.createElement('input');
    bridgeName.id='ctl-team-name-'+id;
    bridgeCredits.id='ctl-team-credits-'+id;
    bridgeName.value=name.value;
    bridgeCredits.value=credits.value;
    bridgeName.hidden=true;
    bridgeCredits.hidden=true;
    overlay.append(bridgeName,bridgeCredits);
    try{
      await saveTeamControl(id);
    }finally{
      bridgeName.remove();
      bridgeCredits.remove();
    }

    window.renderManagementTeamList();
    const still=(typeof teamsCache!=='undefined'?teamsCache:[]).some(t=>String(t.id)===id);
    if(still)window.openManagementTeamDetail(id); else window.closeManagementTeamDetail();
  };

  window.assignFromManagementTeamDetail=function(){
    const id=String(document.getElementById('management-team-detail')?.dataset.teamId||'');
    if(!id)return;
    window.closeManagementTeamDetail();
    if(typeof openManualAssign==='function')openManualAssign(id);
  };

  window.deleteManagementTeamDetail=async function(){
    const overlay=document.getElementById('management-team-detail');
    const id=String(overlay?.dataset.teamId||'');
    if(!id||typeof deleteTeamControl!=='function')return;
    await deleteTeamControl(id);
    const still=(typeof teamsCache!=='undefined'?teamsCache:[]).some(t=>String(t.id)===id);
    if(!still)window.closeManagementTeamDetail();
  };

  function init(){
    syncDevVersionBadge();
    ensureDesktopManagementScroll();
    cleanupOldManagement();
    const presenceTarget=document.getElementById('online-player-list');
    if(presenceTarget){
      new MutationObserver(()=>window.renderManagementTeamList()).observe(presenceTarget,{childList:true,subtree:true,characterData:true});
    }
    window.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&!document.getElementById('management-team-detail')?.hidden)window.closeManagementTeamDetail();
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
