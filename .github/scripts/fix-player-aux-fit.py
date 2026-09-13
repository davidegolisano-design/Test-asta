from pathlib import Path

ui=Path('styles/ui.css')
app=Path('scripts/app.js')
idx=Path('index.html')
sw=Path('service-worker.js')

u=ui.read_text(encoding='utf-8')
a=app.read_text(encoding='utf-8')
i=idx.read_text(encoding='utf-8')
s=sw.read_text(encoding='utf-8')

old="""@media (min-width:761px){
  #screen-player-buzzer #player-nominate-btn.nomination-turn-active{
    width:min(420px,calc(100% - 32px))!important;
    max-width:420px!important;
    min-width:0!important;
    box-sizing:border-box!important;
    margin:7px auto 8px!important;
    padding:8px 12px!important;
    overflow:hidden!important;
  }
"""
new="""@media (min-width:761px){
  #screen-player-buzzer #player-nominate-btn.nomination-turn-active{
    width:100%!important;
    max-width:var(--player-max,560px)!important;
    min-width:0!important;
    box-sizing:border-box!important;
    margin:7px auto 8px!important;
    padding:8px 12px!important;
    overflow:hidden!important;
  }
"""
if old not in u:
    raise SystemExit('desktop nomination reminder block not found')
u=u.replace(old,new,1)

marker='/* v1.0.118 — fit team pill and READY team names */'
if marker not in u:
    u += """

/* v1.0.118 — fit team pill and READY team names */
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
"""

jsmarker='// v1.0.118 — fit team pill and READY team names'
if jsmarker not in a:
    a += r'''

// v1.0.118 — fit team pill and READY team names
(function(){
    let fitRaf=0;

    function fitSingleLine(el,cssVar,minPx){
        if(!el || !el.isConnected)return;
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

    function fitPlayerAuxNames(){
        fitSingleLine(document.getElementById('display-team-name'),'--player-team-name-size',7.2);
        document.querySelectorAll('#screen-player-buzzer .player-ready-team-copy strong').forEach(el=>{
            fitSingleLine(el,'--ready-team-fit-size',5.2);
        });
    }

    function scheduleFit(){
        cancelAnimationFrame(fitRaf);
        fitRaf=requestAnimationFrame(fitPlayerAuxNames);
    }

    function install(){
        const team=document.getElementById('display-team-name');
        const ready=document.getElementById('player-ready-team-list');
        if(team){
            new MutationObserver(scheduleFit).observe(team,{subtree:true,childList:true,characterData:true});
        }
        if(ready){
            new MutationObserver(scheduleFit).observe(ready,{subtree:true,childList:true,characterData:true});
        }
        window.addEventListener('resize',scheduleFit,{passive:true});
        scheduleFit();
    }

    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
    else install();
    window.fitPlayerAuxNames=fitPlayerAuxNames;
})();
'''

# cache bust
for oldv,newv in [('./styles/ui.css?v=117','./styles/ui.css?v=118'),('./scripts/app.js?v=117','./scripts/app.js?v=118')]:
    if oldv in i:
        i=i.replace(oldv,newv)
    elif newv not in i:
        raise SystemExit(f'cache reference not found: {oldv}')

if "liveasta-v1.0-117" in s:
    s=s.replace("liveasta-v1.0-117","liveasta-v1.0-118")
elif "liveasta-v1.0-118" not in s:
    # accept previous 116/115 variants as long as cache advances
    import re
    s2=re.sub(r"liveasta-v1\.0-\d+","liveasta-v1.0-118",s,count=1)
    if s2==s: raise SystemExit('service worker cache name not found')
    s=s2

ui.write_text(u,encoding='utf-8')
app.write_text(a,encoding='utf-8')
idx.write_text(i,encoding='utf-8')
sw.write_text(s,encoding='utf-8')
