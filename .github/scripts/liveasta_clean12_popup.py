from pathlib import Path

p=Path('dev/scripts/runtime.js')
s=p.read_text(encoding='utf-8')

old_danger="      const danger=options.danger ?? isDangerMessage(message);"
new_danger="      const formatted=window.formatLiveAstaPopupText?window.formatLiveAstaPopupText(message):String(message??'');\n      const danger=options.danger ?? isDangerMessage(formatted);"
if old_danger not in s:
    raise SystemExit('confirm danger target not found')
s=s.replace(old_danger,new_danger,1)

old_text="      text.textContent=String(message??'');"
if old_text not in s:
    raise SystemExit('confirm text target not found')
s=s.replace(old_text,"      text.textContent=formatted;",1)

old_queue="      alertQueue.push({message,resolve});"
new_queue="      const formatted=window.formatLiveAstaPopupText?window.formatLiveAstaPopupText(message):String(message??'');\n      alertQueue.push({message:formatted,resolve});"
if old_queue not in s:
    raise SystemExit('alert queue target not found')
s=s.replace(old_queue,new_queue,1)

wrapper="""  const originalAppAlert=window.appAlert;
  if(typeof originalAppAlert==='function'){
    window.appAlert=function(message){
      return originalAppAlert(window.formatLiveAstaPopupText(message));
    };
  }

  const originalAppConfirm=window.appConfirm;
  if(typeof originalAppConfirm==='function'){
    window.appConfirm=function(message,options={}){
      return originalAppConfirm(window.formatLiveAstaPopupText(message),options);
    };
  }

  // alert() era già sostituito dal popup interno: lo riallinea al formatter.
  window.alert=function(message){
    return window.appAlert(window.formatLiveAstaPopupText(message));
  };
"""
if wrapper not in s:
    raise SystemExit('popup wrapper block not found')
s=s.replace(wrapper,'',1)
p.write_text(s,encoding='utf-8')

idx=Path('dev/index.html')
html=idx.read_text(encoding='utf-8')
html=html.replace('CLEAN-11','CLEAN-12').replace('094-clean11a','094-clean12a')
idx.write_text(html,encoding='utf-8')

Path('dev/CLEANUP_REPORT_CLEAN12.txt').write_text("""LIVEASTA CLEAN-12 - POPUP OWNERSHIP
==================================
Behavior preserved; duplicate global popup wrappers removed.

Canonical ownership after CLEAN-12:
- appConfirm: one assignment in runtime.js
- appAlert: one assignment in runtime.js
- alert: one assignment in runtime.js
- formatLiveAstaPopupText remains the single text-normalization helper

The formatter is now called directly by the canonical appConfirm/appAlert implementations.
The late originalAppAlert/originalAppConfirm/alert wrapper chain was removed.
""",encoding='utf-8')
