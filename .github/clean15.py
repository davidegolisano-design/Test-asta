from pathlib import Path

p=Path('dev/scripts/pwa.js')
s=p.read_text(encoding='utf-8')
old="""  function cleanupMalformedLegacy(){
    const bad=document.getElementById('liveasta-v076-desktop-board');
    if(bad) bad.remove();
    try{
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
      const remove=[];
      while(walker.nextNode()){
        const n=walker.currentNode;
        const t=String(n.nodeValue||'').trim();
        if(t==='\\\\' || t==='\\\\n' || t==='\\\\n\\\\n') remove.push(n);
      }
      remove.forEach(n=>n.remove());
    }catch(_){}
  }

  cleanupMalformedLegacy();
  document.title='LIVEASTA DEV · v0.94 CLEAN-11';

"""
if old not in s:
    raise SystemExit('legacy PWA cleanup block not found')
s=s.replace(old,'')
p.write_text(s,encoding='utf-8')

idx=Path('dev/index.html')
html=idx.read_text(encoding='utf-8')
html=html.replace('CLEAN-13','CLEAN-15').replace('094-clean13a','094-clean15a')
idx.write_text(html,encoding='utf-8')

Path('dev/CLEANUP_REPORT_CLEAN15.txt').write_text('''LIVEASTA CLEAN-15 - DEAD PWA RUNTIME CLEANUP\n===========================================\nBehavior preserved.\n\nRemoved from scripts/pwa.js:\n- obsolete cleanupMalformedLegacy() DOM walker\n- obsolete lookup/removal of #liveasta-v076-desktop-board\n- stale document.title override for CLEAN-11\n\nOwnership after CLEAN-15:\n- DEV page title: index.html only\n- PWA script: install-prompt handling only\n\nThe removed cleanup targeted extraction artifacts that no longer exist in the structured DEV index.\n''',encoding='utf-8')
