(function(){
  if(window.__liveastaPwaInstallLoaded) return;
  window.__liveastaPwaInstallLoaded=true;

  const DEV_VERSION='v1.04.09';
  const IS_RAWGITHACK=/raw\.githack\.com$/i.test(location.hostname);

  function applyLiveAstaVersion(){
    document.title='LIVEASTA · DEV MOBILE '+DEV_VERSION;
    document.querySelectorAll('.home-version-badge,.admin-version-badge').forEach(el=>{el.textContent='DEV MOBILE · '+DEV_VERSION;});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyLiveAstaVersion,{once:true});else applyLiveAstaVersion();

  const mobileDevStyle=document.createElement('style');
  mobileDevStyle.id='liveasta-mobile-dev-inline';
  mobileDevStyle.textContent=`
@media (max-width:760px){
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction .col-player{
    grid-template-rows:clamp(30px,5.2dvh,38px) minmax(0,1fr) 38px!important;
    padding:6px 8px 8px!important;gap:2px!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction #auction-player-name-top{
    height:auto!important;min-height:0!important;max-width:100%!important;
    font-size:clamp(25px,7vw,38px)!important;line-height:1!important;
    white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;
  }

  /* LOWER-LEFT QUADRANT — one owner per phase, no inherited desktop geometry. */
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction .col-timer{
    position:relative!important;min-width:0!important;min-height:0!important;
    padding:14px 10px!important;box-sizing:border-box!important;overflow:hidden!important;
    display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;
    gap:10px!important;background:var(--theme-card,#151D27)!important;border-color:var(--theme-border,#334155)!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction .col-timer .timer-ring{
    position:static!important;inset:auto!important;transform:none!important;
    flex:0 0 auto!important;width:100%!important;max-width:100%!important;height:auto!important;min-width:0!important;min-height:0!important;
    margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;
    display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction .col-timer .timer-ring small{
    display:none!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction #countdown-display{
    position:static!important;inset:auto!important;transform:none!important;
    display:block!important;width:100%!important;max-width:100%!important;height:auto!important;
    margin:0!important;padding:0 4px!important;box-sizing:border-box!important;
    font-size:clamp(68px,20vw,104px)!important;line-height:.9!important;letter-spacing:-.035em!important;
    text-align:center!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:clip!important;
    color:var(--theme-number,var(--accent-yellow,#E0BC59))!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction .col-timer :is(.mobile-quad-label,.timer-caption){
    position:static!important;inset:auto!important;transform:none!important;
    width:100%!important;max-width:100%!important;height:auto!important;min-height:0!important;
    margin:0!important;padding:0 4px!important;box-sizing:border-box!important;
    font-size:clamp(16px,4.7vw,22px)!important;line-height:1.05!important;font-weight:900!important;letter-spacing:.035em!important;
    text-align:center!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;
    color:var(--theme-text,#F3F4F6)!important;
  }

  /* READY = FVM + list value. Only these two elements are visible on the left. */
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction.mobile-ready .col-timer .mobile-quad-label{
    display:none!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction.mobile-ready .col-timer .timer-caption{
    display:block!important;visibility:visible!important;order:1!important;
    font-size:clamp(18px,5.2vw,25px)!important;color:var(--theme-text,#F3F4F6)!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction.mobile-ready .col-timer .timer-ring{
    display:flex!important;visibility:visible!important;order:2!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction.mobile-ready #countdown-display{
    font-size:clamp(66px,19vw,98px)!important;color:var(--theme-number,var(--accent-yellow,#E0BC59))!important;
  }

  /* TURN = only the turn message. Kill every residual timer/value/label. */
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction.mobile-turn .col-timer{
    padding:14px!important;gap:0!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction.mobile-turn .col-timer > :not(#auctioneer-turn-center){
    display:none!important;visibility:hidden!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction.mobile-turn #auctioneer-turn-center{
    position:static!important;inset:auto!important;transform:none!important;
    display:flex!important;visibility:visible!important;flex:1 1 auto!important;
    width:100%!important;max-width:100%!important;height:100%!important;max-height:100%!important;min-width:0!important;min-height:0!important;
    margin:0!important;padding:8px!important;box-sizing:border-box!important;overflow:hidden!important;
    flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:10px!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction.mobile-turn #auctioneer-turn-center :is(.auctioneer-turn-kicker,.auctioneer-turn-role){display:none!important;}
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction.mobile-turn .auctioneer-turn-title{
    width:100%!important;max-width:100%!important;margin:0!important;padding:0!important;
    font-size:clamp(15px,4.4vw,20px)!important;line-height:1.08!important;font-weight:900!important;
    text-align:center!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;color:var(--theme-text,#F3F4F6)!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction.mobile-turn .auctioneer-turn-team{
    width:100%!important;max-width:100%!important;margin:0!important;padding:0 2px!important;box-sizing:border-box!important;
    font-size:clamp(24px,7vw,34px)!important;line-height:1.02!important;font-weight:950!important;
    text-align:center!important;white-space:normal!important;overflow-wrap:anywhere!important;overflow:hidden!important;color:var(--theme-number,var(--accent-yellow,#E0BC59))!important;
  }

  /* PREPARATION and ACTIVE auction: explicit label + number, both contained. */
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction.mobile-preparing .col-timer .timer-caption,
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction.mobile-normal .col-timer .timer-caption{
    display:none!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction.mobile-preparing .col-timer .mobile-quad-label,
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction.mobile-normal .col-timer .mobile-quad-label{
    display:block!important;visibility:visible!important;order:1!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction.mobile-preparing .col-timer .timer-ring,
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction.mobile-normal .col-timer .timer-ring{
    order:2!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction.mobile-preparing #countdown-display{
    color:var(--theme-number,var(--accent-yellow,#E0BC59))!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction.mobile-normal #countdown-display{
    color:var(--theme-success,var(--accent-green,#28C76F))!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction.mobile-normal #countdown-display.liveasta-last3{
    color:var(--theme-danger,var(--accent-red,#FF334F))!important;
  }

  /* SEALED collection/opening: timer stays contained and theme-aware. */
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction:is(.mobile-sealed-collecting,.mobile-sealed-opening) .col-timer .timer-caption{
    display:none!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction:is(.mobile-sealed-collecting,.mobile-sealed-opening) .col-timer .mobile-quad-label{
    display:block!important;visibility:visible!important;order:1!important;
  }
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction:is(.mobile-sealed-collecting,.mobile-sealed-opening) .col-timer .timer-ring{order:2!important;}
  html body #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction:is(.mobile-sealed-collecting,.mobile-sealed-opening) #countdown-display{
    color:var(--theme-number,var(--accent-yellow,#E0BC59))!important;
  }

  /* Install CTA must never cover auction quadrants in DEV preview. */
  html body #screen-auctioneer-board.active ~ #liveasta-install-btn,
  html body:has(#screen-auctioneer-board.active) #liveasta-install-btn{display:none!important;}
}

@layer mantra-role-layout {
  @media (max-width:760px){
    .liveasta-mantra #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction #auction-player-meta:has(#auction-player-role.role-badge-mantra){
      position:static!important;inset:auto!important;transform:none!important;width:100%!important;min-width:0!important;
      height:38px!important;min-height:38px!important;max-height:38px!important;margin:0!important;padding:3px 8px!important;box-sizing:border-box!important;
      display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;align-items:center!important;justify-content:center!important;align-content:center!important;
      gap:8px!important;white-space:nowrap!important;overflow:hidden!important;
    }
    .liveasta-mantra #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction #auction-player-meta:has(#auction-player-role.role-badge-mantra) .meta-dot{display:none!important;}
    .liveasta-mantra #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction #auction-player-role.role-badge-mantra{
      position:static!important;inset:auto!important;transform:none!important;flex:0 1 auto!important;width:fit-content!important;min-width:0!important;max-width:70%!important;
      height:auto!important;min-height:28px!important;max-height:30px!important;margin:0!important;padding:0!important;display:inline-flex!important;flex-flow:row nowrap!important;
      align-items:center!important;justify-content:center!important;gap:3px!important;overflow:hidden!important;--role-size:28px;--role-font:11px;
    }
    .liveasta-mantra #screen-auctioneer-board.auctioneer-ui-mobile #auction-dashboard.mode-mobile #view-auction #auction-player-club{
      position:static!important;inset:auto!important;transform:none!important;flex:0 1 auto!important;width:auto!important;min-width:0!important;max-width:45%!important;height:auto!important;
      margin:0!important;padding:0!important;font-size:clamp(15px,4vw,18px)!important;line-height:28px!important;text-align:left!important;white-space:nowrap!important;
      overflow:hidden!important;overflow-wrap:normal!important;text-overflow:ellipsis!important;
    }
  }
}
`;
  document.head.appendChild(mobileDevStyle);

  /* Phase labels are semantic, not decorative: keep them synchronized with the existing phase classes. */
  function syncMobilePhaseLabels(){
    const board=document.getElementById('screen-auctioneer-board');
    const view=document.getElementById('view-auction');
    if(!board?.classList.contains('auctioneer-ui-mobile')||!view)return;
    const left=document.getElementById('mobile-left-label');
    if(!left)return;
    if(view.classList.contains('mobile-preparing'))left.textContent='PREPARAZIONE';
    else if(view.classList.contains('mobile-normal'))left.textContent='TIMER';
    else if(view.classList.contains('mobile-sealed-opening'))left.textContent='APERTURA';
    else if(view.classList.contains('mobile-sealed-collecting'))left.textContent='TIMER BUSTE';
    else if(view.classList.contains('mobile-ready'))left.textContent='FVM';
  }
  function installMobilePhaseObserver(){
    const view=document.getElementById('view-auction');
    if(!view)return;
    syncMobilePhaseLabels();
    new MutationObserver(syncMobilePhaseLabels).observe(view,{attributes:true,attributeFilter:['class']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installMobilePhaseObserver,{once:true});else installMobilePhaseObserver();

  if(IS_RAWGITHACK && 'serviceWorker' in navigator){
    navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(reg=>reg.unregister())).catch(()=>{});
    if(window.caches)caches.keys().then(keys=>Promise.all(keys.map(key=>caches.delete(key)))).catch(()=>{});
  }else if('serviceWorker' in navigator){
    window.addEventListener('load',()=>{navigator.serviceWorker.register('./service-worker.js').catch(()=>{});},{once:true});
  }

  const button=document.createElement('button');
  button.id='liveasta-install-btn';button.type='button';button.textContent='Installa LIVEASTA';document.body.appendChild(button);
  let deferredPrompt=null;
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;button.classList.add('show');});
  button.addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();try{await deferredPrompt.userChoice;}catch(_){}deferredPrompt=null;button.classList.remove('show');});
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;button.classList.remove('show');});

  const featureScripts=[
    './scripts/opponent-credits.js?v=103',
    './scripts/debug-v103.js?v=1032',
    './scripts/stability-core.js?v=1035',
    './scripts/session-resume.js?v=103'
  ];
  featureScripts.forEach(src=>{const script=document.createElement('script');script.src=src;script.async=false;document.head.appendChild(script);});
})();
