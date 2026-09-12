from pathlib import Path

p=Path('dev/scripts/bootstrap.js')
s=p.read_text(encoding='utf-8')
old="""  function applyBrand(){
    document.title='v0.93';
    document.querySelectorAll('.admin-version-badge').forEach(el=>{
      el.textContent='v0.93';
    });
    document.querySelectorAll('.logo-text').forEach(el=>{
"""
new="""  function applyBrand(){
    document.querySelectorAll('.logo-text').forEach(el=>{
"""
if old not in s:
    raise SystemExit('Legacy applyBrand version override not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

idx=Path('dev/index.html')
h=idx.read_text(encoding='utf-8')
h=h.replace('CLEAN-19','CLEAN-20').replace('094-clean19a','094-clean20a')
idx.write_text(h,encoding='utf-8')

Path('dev/CLEANUP_REPORT_CLEAN20.txt').write_text('''LIVEASTA CLEAN-20 - BRAND/TITLE OWNERSHIP + BROWSER SMOKE\n=======================================================\nRemoved legacy bootstrap runtime overrides that forced:\n- document.title = v0.93\n- .admin-version-badge text = v0.93\n\nindex.html is now the canonical owner of DEV title/version labels.\nBrowser smoke validation is executed after this migration.\n''',encoding='utf-8')
