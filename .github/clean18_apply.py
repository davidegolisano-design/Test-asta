from pathlib import Path

ui=Path('dev/styles/ui.css')
s=ui.read_text(encoding='utf-8')
before=s
s=s.replace(':is(.control-title,.v090-menu-header)', '.control-title')
if s==before:
    raise SystemExit('Expected v090-menu-header selector branch not found')
if '.v090-menu-header' in s:
    raise SystemExit('Unexpected remaining v090-menu-header reference')
ui.write_text(s,encoding='utf-8')

idx=Path('dev/index.html')
h=idx.read_text(encoding='utf-8')
h=h.replace('CLEAN-17','CLEAN-18').replace('094-clean17a','094-clean18a')
idx.write_text(h,encoding='utf-8')

Path('dev/CLEANUP_REPORT_CLEAN18.txt').write_text('''LIVEASTA CLEAN-18 - REMOVE ORPHAN VERSIONED CSS BRANCH\n=====================================================\nBehavior preserved.\n\nRemoved the obsolete .v090-menu-header branch from the two management selectors that also target .control-title.\nThe class had no remaining HTML/JavaScript literal references.\nActive .control-title behavior and v090-collapsed behavior remain unchanged.\n''',encoding='utf-8')
