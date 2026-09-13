from pathlib import Path
import re

# Append runtime single-line player-name fitter without touching auction logic.
p=Path('scripts/app.js')
s=p.read_text()
marker='// v1.0.117 — player main name single-line auto fit'
if marker not in s:
    s += r'''

// v1.0.117 — player main name single-line auto fit
(function(){
    if(typeof setPhonePlayerDisplayName!=='function')return;
    const baseSetPhonePlayerDisplayName=setPhonePlayerDisplayName;

    function fitMainPlayerNameSingleLine(){
        const outer=document.getElementById('phone-player-name');
        const text=document.getElementById('phone-player-name-text');
        const badge=document.getElementById('phone-player-priority-badge');
        if(!outer||!text)return;

        if(!text.dataset.fitBasePx){
            text.style.removeProperty('--player-main-name-size');
            const base=parseFloat(getComputedStyle(text).fontSize)||16;
            text.dataset.fitBasePx=String(base);
        }

        let size=Math.max(10,parseFloat(text.dataset.fitBasePx)||16);
        const gap=parseFloat(getComputedStyle(outer).columnGap||getComputedStyle(outer).gap)||0;
        const badgeVisible=badge && getComputedStyle(badge).display!=='none';
        const badgeWidth=badgeVisible?badge.getBoundingClientRect().width+gap:0;
        const available=Math.max(64,outer.clientWidth-badgeWidth-4);

        text.style.setProperty('max-width',available+'px','important');
        text.style.setProperty('--player-main-name-size',size+'px');

        while(size>10 && text.scrollWidth>available+1){
            size-=0.5;
            text.style.setProperty('--player-main-name-size',size+'px');
        }
    }

    setPhonePlayerDisplayName=function(){
        const result=baseSetPhonePlayerDisplayName.apply(this,arguments);
        requestAnimationFrame(fitMainPlayerNameSingleLine);
        return result;
    };

    window.addEventListener('resize',()=>requestAnimationFrame(fitMainPlayerNameSingleLine),{passive:true});
    window.fitMainPlayerNameSingleLine=fitMainPlayerNameSingleLine;
})();
'''
p.write_text(s)

# UI rules: desktop nomination reminder stays in the player column; main player name never wraps/truncates.
p=Path('styles/ui.css')
s=p.read_text()
marker='/* v1.0.117 — player desktop nomination reminder + single-line name fit */'
if marker not in s:
    s += r'''

/* v1.0.117 — player desktop nomination reminder + single-line name fit */
#screen-player-buzzer #phone-player-name{
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  box-sizing:border-box!important;
  flex-wrap:nowrap!important;
  overflow:visible!important;
}
#screen-player-buzzer #phone-player-name-text{
  font-size:var(--player-main-name-size,1.05rem)!important;
  white-space:nowrap!important;
  overflow:visible!important;
  text-overflow:clip!important;
  line-height:1.05!important;
  flex:0 1 auto!important;
  min-width:0!important;
}

@media (min-width:761px){
  #screen-player-buzzer #player-nominate-btn.nomination-turn-active{
    width:min(420px,calc(100% - 32px))!important;
    max-width:420px!important;
    min-width:0!important;
    box-sizing:border-box!important;
    margin:7px auto 8px!important;
    padding:8px 12px!important;
    overflow:hidden!important;
  }
  #screen-player-buzzer #player-nominate-btn.nomination-turn-active :is(.nominate-small,strong,#player-nominate-role){
    width:100%!important;
    max-width:100%!important;
    box-sizing:border-box!important;
    white-space:normal!important;
    overflow-wrap:anywhere!important;
    word-break:normal!important;
    text-align:center!important;
  }
}
'''
p.write_text(s)

# Cache bust.
p=Path('index.html')
s=p.read_text()
for name,version in [('ui.css','117'),('app.js','117')]:
    s,n=re.subn(rf'{re.escape(name)}\?v=\d+',f'{name}?v={version}',s,count=1)
    if n!=1: raise SystemExit(f'cache ref not found: {name}')
p.write_text(s)

# Refresh PWA cache too.
p=Path('service-worker.js')
s=p.read_text()
s,n=re.subn(r"const CACHE = 'liveasta-v1\.0-\d+';","const CACHE = 'liveasta-v1.0-117';",s,count=1)
if n!=1: raise SystemExit('service worker cache marker not found')
p.write_text(s)
