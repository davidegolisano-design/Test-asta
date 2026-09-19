(function(){
  // Must exist before the body parser can fire <img onerror> handlers.
  // The full player-assets module loaded later can replace/use the same global.
  if(typeof window.playerImageFallback!=='function'){
    const earlyPlayerFallback="data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='48' fill='%23141820'/%3E%3Ccircle cx='256' cy='190' r='92' fill='%23343c49'/%3E%3Cpath d='M96 470c14-103 74-158 160-158s146 55 160 158' fill='%23343c49'/%3E%3C/svg%3E";
    window.playerImageFallback=function playerImageFallbackEarly(img){
      if(!img || img.dataset.liveastaEarlyFallback==='1')return;
      img.dataset.liveastaEarlyFallback='1';
      img.onerror=null;
      img.src=earlyPlayerFallback;
    };
  }

  const KEY='liveasta_theme';
  const THEMES=window.LiveAstaThemes;
  const VARS={bg:'--theme-bg',deep:'--theme-bg-deep',card:'--theme-card',panel:'--theme-panel',hover:'--theme-hover',input:'--theme-input',border:'--theme-border',text:'--theme-text',muted:'--theme-muted',soft:'--theme-soft',primary:'--theme-primary',primaryHover:'--theme-primary-hover',accent:'--theme-accent',number:'--theme-number',danger:'--theme-danger',success:'--theme-success',marker:'--theme-marker',accentMarker:'--theme-accent-marker',onMarker:'--theme-on-marker'};
  try{
    let name=localStorage.getItem(KEY)||'broadcast';
    if(!THEMES[name]){name='broadcast';localStorage.setItem(KEY,name);}
    const t=THEMES[name];
    const root=document.documentElement;
    root.setAttribute('data-live-theme',t.base||name);
    root.setAttribute('data-theme-choice',name);
    Object.entries(VARS).forEach(([key,cssVar])=>root.style.setProperty(cssVar,t[key],'important'));
    root.style.setProperty('background-color',t.meta,'important');
    const light=String(name).includes('daily')||String(name).startsWith('light-');
    root.style.colorScheme=light?'light':'dark';
    let meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.content=t.meta;
    let scheme=document.querySelector('meta[name="color-scheme"]');
    if(scheme)scheme.content=light?'light':'dark';
    let ms=document.querySelector('meta[name="msapplication-navbutton-color"]');
    if(ms)ms.content=t.meta;
  }catch(e){
    document.documentElement.setAttribute('data-live-theme','broadcast');
    document.documentElement.setAttribute('data-theme-choice','broadcast');
    document.documentElement.style.backgroundColor='#11151B';
  }

  function installPlayerFit(){
    if(document.getElementById('liveasta-player-fit-style'))return;
    const style=document.createElement('style');
    style.id='liveasta-player-fit-style';
    style.textContent='@media (min-width:761px){#screen-player-buzzer #player-nominate-btn.nomination-turn-active{width:100%!important;max-width:var(--player-max,560px)!important;min-width:0!important;box-sizing:border-box!important;margin:7px auto 8px!important;padding:8px 12px!important;overflow:hidden!important}}#screen-player-buzzer .identity-pill.team{min-width:0!important;overflow:hidden!important}#screen-player-buzzer #display-team-name{flex:1 1 auto!important;min-width:0!important;max-width:100%!important;white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important;font-size:var(--player-team-name-size,.95rem)!important;line-height:1!important;letter-spacing:.02em!important}#screen-player-buzzer .player-ready-team-copy{min-width:0!important;overflow:hidden!important}#screen-player-buzzer .player-ready-team-copy strong{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important;font-size:var(--ready-team-fit-size,var(--ready-team-name-size,.80rem))!important;line-height:1!important}';
    document.head.appendChild(style);

    let raf=0;
    function fit(el,varName,min){
      if(!el||!el.isConnected)return;
      const available=Math.floor(el.clientWidth||0);
      if(available<8)return;
      if(!el.dataset.liveastaFitBasePx){
        el.style.removeProperty(varName);
        el.dataset.liveastaFitBasePx=String(parseFloat(getComputedStyle(el).fontSize)||12);
      }
      let size=Math.max(min,parseFloat(el.dataset.liveastaFitBasePx)||12);
      el.style.setProperty(varName,size+'px');
      while(size>min&&el.scrollWidth>available+1){
        size=Math.max(min,size-.35);
        el.style.setProperty(varName,size+'px');
      }
    }
    function run(){
      fit(document.getElementById('display-team-name'),'--player-team-name-size',7.2);
      document.querySelectorAll('#screen-player-buzzer .player-ready-team-copy strong').forEach(el=>fit(el,'--ready-team-fit-size',5.2));
    }
    function schedule(){cancelAnimationFrame(raf);raf=requestAnimationFrame(run);}
    const team=document.getElementById('display-team-name');
    const ready=document.getElementById('player-ready-team-list');
    if(team)new MutationObserver(schedule).observe(team,{subtree:true,childList:true,characterData:true});
    if(ready)new MutationObserver(schedule).observe(ready,{subtree:true,childList:true,characterData:true});
    window.addEventListener('resize',schedule,{passive:true});
    schedule();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installPlayerFit,{once:true});
  else installPlayerFit();
})();
