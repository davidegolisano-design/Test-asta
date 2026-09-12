from pathlib import Path

boot_path=Path('dev/scripts/bootstrap.js')
run_path=Path('dev/scripts/runtime.js')
idx_path=Path('dev/index.html')
pwa_path=Path('dev/scripts/pwa.js')

boot=boot_path.read_text(encoding='utf-8')
run=run_path.read_text(encoding='utf-8')

boot_start=boot.find('// === liveasta-v73-theme-runtime ===')
boot_end=boot.find('// === liveasta-v73-home-qr ===', boot_start)
if boot_start < 0 or boot_end < 0:
    raise SystemExit('bootstrap theme block not found')
boot=boot[:boot_start]+boot[boot_end:]
boot_path.write_text(boot,encoding='utf-8')

run_start=run.find('// === liveasta-v035-theme-runtime-fix ===')
run_end=run.find('// === liveasta-v058-mobile-board-fix ===', run_start)
if run_start < 0 or run_end < 0:
    raise SystemExit('runtime theme block not found')
canonical=run[run_start:run_end].strip()+"\n"
run=run[:run_start]+run[run_end:]
run_path.write_text(run,encoding='utf-8')

addon=r'''

// Canonical theme menu + lifecycle hooks
(function(){
  'use strict';
  const KEY='liveasta_theme';

  window.openLiveAstaThemeMenu=function(){
    const menu=document.getElementById('liveasta-theme-submenu');
    if(!menu)return;
    menu.classList.add('open');
    menu.setAttribute('aria-hidden','false');
    document.body&&document.body.classList.add('theme-submenu-open');
    menu.scrollTop=0;
  };

  window.closeLiveAstaThemeMenu=function(){
    const menu=document.getElementById('liveasta-theme-submenu');
    if(!menu)return;
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden','true');
    document.body&&document.body.classList.remove('theme-submenu-open');
  };

  function reapplyCurrentTheme(){
    if(typeof window.applyLiveAstaTheme!=='function')return;
    let saved='broadcast';
    try{saved=localStorage.getItem(KEY)||'broadcast';}catch(_){}
    window.applyLiveAstaTheme(saved,false);
  }

  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)reapplyCurrentTheme();
  });
})();
'''
Path('dev/scripts/theme.js').write_text(canonical+addon,encoding='utf-8')

html=idx_path.read_text(encoding='utf-8')
html=html.replace('CLEAN-09','CLEAN-10')
html=html.replace('094-clean09a','094-clean10a')
needle='<script src="./scripts/bootstrap.js?dev=094-clean10a"></script>'
if needle not in html:
    raise SystemExit('bootstrap script ref not found in index')
html=html.replace(needle,needle+'\n<script src="./scripts/theme.js?dev=094-clean10a"></script>',1)
idx_path.write_text(html,encoding='utf-8')

if pwa_path.exists():
    pwa=pwa_path.read_text(encoding='utf-8')
    pwa=pwa.replace('CLEAN-09','CLEAN-10')
    pwa_path.write_text(pwa,encoding='utf-8')

Path('dev/CLEANUP_REPORT_CLEAN10.txt').write_text('''LIVEASTA CLEAN-10 - CANONICAL THEME RUNTIME\n===========================================\nGoal: one owner for theme state and application.\n\nChanges:\n- moved the effective theme implementation from runtime.js to scripts/theme.js\n- removed the older liveasta-v73 theme implementation from bootstrap.js\n- removed the later theme override block from runtime.js\n- retained theme menu open/close behavior in the canonical theme module\n- visibility reapply now uses the same canonical applyLiveAstaTheme implementation\n- theme palette, labels, localStorage key and final runtime values are preserved from the implementation that previously won the cascade\n\nOwnership after CLEAN-10:\n- applyLiveAstaTheme: theme.js only\n- setLiveAstaTheme: theme.js only\n- openLiveAstaThemeMenu / closeLiveAstaThemeMenu: theme.js only\n''',encoding='utf-8')
