// LIVEASTA player UI fit helper — v1.0.118
(function(){
  let raf=0;
  let installed=false;

  function ensureStyle(){
    if(document.getElementById('liveasta-player-ui-fit-style'))return;
    const style=document.createElement('style');
    style.id='liveasta-player-ui-fit-style';
    style.textContent=`
      @media (min-width:761px){
        #screen-player-buzzer #player-nominate-btn.nomination-turn-active{
          width:100%!important;
          max-width:var(--player-max,560px)!important;
          min-width:0!important;
          box-sizing:border-box!important;
          margin:7px auto 8px!important;
          padding:8px 12px!important;
          overflow:hidden!important;
        }
      }
      #screen-player-buzzer .identity-pill.team{
        min-width:0!important;
        overflow:hidden!important;
      }
      #screen-player-buzzer #display-team-name{
        flex:1 1 auto!important;
        min-width:0!important;
        max-width:100%!important;
        white-space:nowrap!important;
        overflow:visible!important;
        text-overflow:clip!important;
        font-size:var(--player-team-name-size,.95rem)!important;
        line-height:1!important;
        letter-spacing:.02em!important;
      }
      #screen-player-buzzer .player-ready-team-copy{
        min-width:0!important;
        overflow:hidden!important;
      }
      #screen-player-buzzer .player-ready-team-copy strong{
        display:block!important;
        width:100%!important;
        max-width:100%!important;
        min-width:0!important;
        white-space:nowrap!important;
        overflow:visible!important;
        text-overflow:clip!important;
        font-size:var(--ready-team-fit-size,var(--ready-team-name-size,.80rem))!important;
        line-height:1!important;
      }
    `;
    document.head.appendChild(style);
  }

  function fitSingleLine(el,cssVar,minPx){
    if(!el||!el.isConnected)return;
    const available=Math.floor(el.clientWidth||0);
    if(available<8)return;

    if(!el.dataset.liveastaFitBasePx){
      el.style.removeProperty(cssVar);
      const base=parseFloat(getComputedStyle(el).fontSize)||12;
      el.dataset.liveastaFitBasePx=String(base);
    }

    let size=Math.max(minPx,parseFloat(el.dataset.liveastaFitBasePx)||12);
    el.style.setProperty(cssVar,size+'px');
    while(size>minPx && el.scrollWidth>available+1){
      size=Math.max(minPx,size-0.35);
      el.style.setProperty(cssVar,size+'px');
    }
  }

  function fitAll(){
    fitSingleLine(document.getElementById('display-team-name'),'--player-team-name-size',7.2);
    document.querySelectorAll('#screen-player-buzzer .player-ready-team-copy strong').forEach(el=>{
      fitSingleLine(el,'--ready-team-fit-size',5.2);
    });
  }

  function schedule(){
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(fitAll);
  }

  function install(){
    if(installed)return;
    installed=true;
    ensureStyle();

    const team=document.getElementById('display-team-name');
    const ready=document.getElementById('player-ready-team-list');
    if(team)new MutationObserver(schedule).observe(team,{subtree:true,childList:true,characterData:true});
    if(ready)new MutationObserver(schedule).observe(ready,{subtree:true,childList:true,characterData:true});

    window.addEventListener('resize',schedule,{passive:true});
    schedule();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();

  window.fitPlayerUiLongNames=fitAll;
})();
