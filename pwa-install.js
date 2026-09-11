(function(){
  if(window.__liveastaPwaInstallLoaded) return;
  window.__liveastaPwaInstallLoaded=true;

  function cleanupMalformedV076(){
    const bad=document.getElementById('liveasta-v076-desktop-board');
    if(bad) bad.remove();
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const remove=[];
    while(walker.nextNode()){
      const n=walker.currentNode;
      const t=String(n.nodeValue||'').trim();
      if(t==='\\' || t==='\\n' || t==='\\n\\n') remove.push(n);
    }
    remove.forEach(n=>n.remove());
  }

  cleanupMalformedV076();
  document.title='v0.78 TEST';

  const style=document.createElement('style');
  style.id='liveasta-v078-runtime-style';
  style.textContent=`
    #liveasta-install-btn{
      position:fixed;right:14px;bottom:14px;z-index:999999;
      display:none;align-items:center;justify-content:center;
      min-height:44px;padding:10px 16px;border-radius:12px;
      border:1px solid var(--theme-border,rgba(255,255,255,.18));
      background:var(--theme-primary,#6c5cff);color:#fff;
      font:800 14px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      box-shadow:0 8px 24px rgba(0,0,0,.22);cursor:pointer;
    }
    #liveasta-install-btn.show{display:flex}
    @media(display-mode:standalone){#liveasta-install-btn{display:none!important}}

    /* v0.78 - PLAYER: SOLO TEMI DAILY */
    html:is(
      [data-live-theme="light-neutral"],
      [data-live-theme="light-blue"],
      [data-live-theme="light-sand"],
      [data-live-theme="ocean-daily"],
      [data-live-theme="sunset-daily"],
      [data-live-theme="royal-daily"]
    ) #screen-player-buzzer .phone-top-area.player-preparing #player-countdown,
    html:is(
      [data-live-theme="light-neutral"],
      [data-live-theme="light-blue"],
      [data-live-theme="light-sand"],
      [data-live-theme="ocean-daily"],
      [data-live-theme="sunset-daily"],
      [data-live-theme="royal-daily"]
    ) #screen-player-buzzer #player-countdown.prep-countdown{
      display:block!important;
      visibility:visible!important;
      opacity:1!important;
      color:var(--theme-number)!important;
      -webkit-text-fill-color:var(--theme-number)!important;
      text-shadow:none!important;
      background:transparent!important;
    }

    html:is(
      [data-live-theme="light-neutral"],
      [data-live-theme="light-blue"],
      [data-live-theme="light-sand"],
      [data-live-theme="ocean-daily"],
      [data-live-theme="sunset-daily"],
      [data-live-theme="royal-daily"]
    ) #screen-player-buzzer .phone-top-area.player-winning{
      background:var(--theme-card)!important;
      border-color:#168A58!important;
      box-shadow:0 0 0 2px rgba(22,138,88,.18),0 10px 26px rgba(22,138,88,.12)!important;
    }

    html:is(
      [data-live-theme="light-neutral"],
      [data-live-theme="light-blue"],
      [data-live-theme="light-sand"],
      [data-live-theme="ocean-daily"],
      [data-live-theme="sunset-daily"],
      [data-live-theme="royal-daily"]
    ) #screen-player-buzzer .phone-top-area.player-winning .player-live-side{
      background:linear-gradient(180deg,
        color-mix(in srgb,#2BCB7F 26%,var(--theme-card)) 0%,
        color-mix(in srgb,#2BCB7F 17%,var(--theme-panel)) 52%,
        color-mix(in srgb,#168A58 12%,var(--theme-card)) 100%)!important;
      border-left-color:#168A58!important;
      box-shadow:inset 0 0 0 1px rgba(22,138,88,.28)!important;
      color:var(--theme-text)!important;
    }

    html:is(
      [data-live-theme="light-neutral"],
      [data-live-theme="light-blue"],
      [data-live-theme="light-sand"],
      [data-live-theme="ocean-daily"],
      [data-live-theme="sunset-daily"],
      [data-live-theme="royal-daily"]
    ) #screen-player-buzzer .phone-top-area.player-winning .player-live-side::before{
      opacity:1!important;
      background:radial-gradient(circle at 50% 42%,rgba(43,203,127,.28) 0%,rgba(22,138,88,.15) 48%,transparent 78%)!important;
    }

    html:is(
      [data-live-theme="light-neutral"],
      [data-live-theme="light-blue"],
      [data-live-theme="light-sand"],
      [data-live-theme="ocean-daily"],
      [data-live-theme="sunset-daily"],
      [data-live-theme="royal-daily"]
    ) #screen-player-buzzer .phone-top-area.player-winning #player-current-winner{
      color:#117347!important;
      -webkit-text-fill-color:#117347!important;
      text-shadow:none!important;
    }

    html:is(
      [data-live-theme="light-neutral"],
      [data-live-theme="light-blue"],
      [data-live-theme="light-sand"],
      [data-live-theme="ocean-daily"],
      [data-live-theme="sunset-daily"],
      [data-live-theme="royal-daily"]
    ) #screen-player-buzzer .phone-top-area.player-losing{
      background:var(--theme-card)!important;
      border-color:#C93E50!important;
      box-shadow:0 0 0 2px rgba(201,62,80,.17),0 10px 26px rgba(201,62,80,.11)!important;
    }

    html:is(
      [data-live-theme="light-neutral"],
      [data-live-theme="light-blue"],
      [data-live-theme="light-sand"],
      [data-live-theme="ocean-daily"],
      [data-live-theme="sunset-daily"],
      [data-live-theme="royal-daily"]
    ) #screen-player-buzzer .phone-top-area.player-losing .player-live-side{
      background:linear-gradient(180deg,
        color-mix(in srgb,#F05A70 24%,var(--theme-card)) 0%,
        color-mix(in srgb,#F05A70 16%,var(--theme-panel)) 52%,
        color-mix(in srgb,#C93E50 11%,var(--theme-card)) 100%)!important;
      border-left-color:#C93E50!important;
      box-shadow:inset 0 0 0 1px rgba(201,62,80,.26)!important;
      color:var(--theme-text)!important;
    }

    html:is(
      [data-live-theme="light-neutral"],
      [data-live-theme="light-blue"],
      [data-live-theme="light-sand"],
      [data-live-theme="ocean-daily"],
      [data-live-theme="sunset-daily"],
      [data-live-theme="royal-daily"]
    ) #screen-player-buzzer .phone-top-area.player-losing .player-live-side::before{
      opacity:1!important;
      background:radial-gradient(circle at 50% 42%,rgba(240,90,112,.26) 0%,rgba(201,62,80,.14) 48%,transparent 78%)!important;
    }

    html:is(
      [data-live-theme="light-neutral"],
      [data-live-theme="light-blue"],
      [data-live-theme="light-sand"],
      [data-live-theme="ocean-daily"],
      [data-live-theme="sunset-daily"],
      [data-live-theme="royal-daily"]
    ) #screen-player-buzzer .phone-top-area.player-losing #player-current-winner{
      color:#A92E40!important;
      -webkit-text-fill-color:#A92E40!important;
      text-shadow:none!important;
    }

    /* v0.77 desktop board fix, kept intact */
    @media (min-width:761px){
      #screen-auctioneer-board.auctioneer-ui-desktop .auction-session-center{
        display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:center!important;gap:8px!important;overflow:visible!important;
      }
      #screen-auctioneer-board.auctioneer-ui-desktop .auction-online-pill{
        display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;min-width:112px!important;width:auto!important;height:28px!important;min-height:28px!important;padding:0 10px!important;overflow:visible!important;white-space:nowrap!important;box-sizing:border-box!important;
      }
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-online-count{
        display:inline!important;visibility:visible!important;opacity:1!important;width:auto!important;max-width:none!important;overflow:visible!important;white-space:nowrap!important;color:var(--theme-text)!important;font-weight:900!important;
      }
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list .dashboard-left{
        display:grid!important;grid-template-columns:minmax(240px,1fr) 50px minmax(130px,160px) minmax(280px,340px) minmax(300px,380px)!important;grid-template-rows:50px auto minmax(0,1fr) auto auto!important;column-gap:7px!important;row-gap:6px!important;align-items:stretch!important;min-height:0!important;
      }
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list .auction-list-toolbar,
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #list-filters-board,
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #list-filters-board .unified-filter-controls{display:contents!important;margin:0!important;padding:0!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list .toolbar-roster-btn{display:none!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #player-search{grid-column:1!important;grid-row:1!important;width:100%!important;min-width:0!important;height:50px!important;min-height:50px!important;max-height:50px!important;margin:0!important;padding:0 14px!important;box-sizing:border-box!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list .toolbar-icon-btn{grid-column:2!important;grid-row:1!important;width:50px!important;min-width:50px!important;height:50px!important;min-height:50px!important;max-height:50px!important;margin:0!important;padding:0!important;box-sizing:border-box!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #toolbar-sealed-mode-btn{grid-column:3!important;grid-row:1!important;width:100%!important;min-width:0!important;height:50px!important;min-height:50px!important;max-height:50px!important;margin:0!important;padding:0 12px!important;box-sizing:border-box!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #list-filters-board .unified-role-row{grid-column:4!important;grid-row:1!important;display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:6px!important;height:50px!important;min-height:50px!important;margin:0!important;align-items:stretch!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #list-filters-board .unified-role-row>button{width:100%!important;min-width:0!important;max-width:none!important;height:50px!important;min-height:50px!important;max-height:50px!important;margin:0!important;padding:0 7px!important;box-sizing:border-box!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #list-filters-board .unified-sort-row{grid-column:5!important;grid-row:1!important;display:grid!important;grid-template-columns:auto minmax(0,1fr) 50px!important;gap:6px!important;height:50px!important;min-height:50px!important;margin:0!important;align-items:stretch!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #list-filters-board .unified-sort-row label{display:flex!important;align-items:center!important;height:50px!important;margin:0!important;white-space:nowrap!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #list-filters-board .unified-sort-row select,
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #list-filters-board .unified-direction{height:50px!important;min-height:50px!important;max-height:50px!important;margin:0!important;box-sizing:border-box!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #list-filters-board .unified-direction{width:50px!important;min-width:50px!important;padding:0!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list .list-section-title:not(.auctioned-section-head){grid-column:1/-1!important;grid-row:2!important;margin:0 2px!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list .table-container{grid-column:1/-1!important;grid-row:3!important;min-height:0!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list .auctioned-section-head{grid-column:1/-1!important;grid-row:4!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:7px!important;margin:0!important;align-items:stretch!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list .auctioned-section-head .collapsed-toggle,
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list .auctioned-section-head .restore-all-btn{height:40px!important;min-height:40px!important;max-height:40px!important;margin:0!important;box-sizing:border-box!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list .auctioned-section-head .restore-all-btn,
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list .auctioned-section-head .restore-all-btn:is(:hover,:focus,:active){background:#D9434E!important;background-image:none!important;border-color:#B9323C!important;color:#fff!important;box-shadow:none!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #auctioned-list{grid-column:1/-1!important;grid-row:5!important;width:100%!important;min-height:0!important;height:auto!important;box-sizing:border-box!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #auctioned-list.collapsed{display:none!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #auctioned-list:not(.collapsed){display:block!important;min-height:0!important;height:auto!important;max-height:210px!important;overflow-y:auto!important;padding:0!important;border:1px solid var(--theme-border)!important;border-radius:8px!important;background:var(--theme-input)!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #auctioned-list .auctioned-row{display:grid!important;grid-template-columns:54px minmax(0,1.25fr) minmax(0,1fr) 96px!important;gap:10px!important;align-items:center!important;width:100%!important;min-height:40px!important;height:40px!important;margin:0!important;padding:4px 10px!important;box-sizing:border-box!important;border-bottom:1px solid var(--theme-border)!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #auctioned-list .auctioned-row:last-child{border-bottom:0!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #auctioned-list .role-badge{width:38px!important;min-width:38px!important;max-width:38px!important;margin:0!important;padding:3px 5px!important;justify-self:start!important;border-radius:999px!important;font-size:.72rem!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #auctioned-list .auctioned-name,
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #auctioned-list .auctioned-team{min-width:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;font-size:.88rem!important;line-height:1!important;text-align:left!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #auctioned-list .auctioned-name{font-weight:850!important;color:var(--theme-text)!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #auctioned-list .auctioned-team{color:var(--theme-muted)!important;}
      #screen-auctioneer-board.auctioneer-ui-desktop #auction-dashboard.mode-pc #view-list #auctioned-list .restore-btn{width:92px!important;min-width:92px!important;height:30px!important;min-height:30px!important;margin:0!important;padding:0 7px!important;justify-self:end!important;font-size:.72rem!important;}
    }
  `;
  document.head.appendChild(style);

  const button=document.createElement('button');
  button.id='liveasta-install-btn';
  button.type='button';
  button.textContent='Installa LIVEASTA';
  document.body.appendChild(button);

  let deferredPrompt=null;
  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>{
      navigator.serviceWorker.register('./service-worker.js',{scope:'./'})
        .catch(err=>console.warn('Service worker non registrato:',err));
    });
  }
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredPrompt=event;
    button.classList.add('show');
  });
  button.addEventListener('click',async()=>{
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    try{await deferredPrompt.userChoice;}catch(_){ }
    deferredPrompt=null;
    button.classList.remove('show');
  });
  window.addEventListener('appinstalled',()=>{
    deferredPrompt=null;
    button.classList.remove('show');
  });
})();