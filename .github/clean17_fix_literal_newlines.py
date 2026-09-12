from pathlib import Path
p=Path('dev/index.html')
s=p.read_text(encoding='utf-8')
old=s
s=s.replace('\n\\n<link rel="stylesheet" href="./styles/ui.css?dev=094-clean16a">','\n    <link rel="stylesheet" href="./styles/ui.css?dev=094-clean17a">')
s=s.replace('<link rel="stylesheet" href="./styles/pwa.css?dev=094-clean16a">\\n','<link rel="stylesheet" href="./styles/pwa.css?dev=094-clean17a">')
s=s.replace('094-clean16a','094-clean17a')
s=s.replace('CLEAN-16','CLEAN-17')
if s==old:
    raise SystemExit('No expected literal newline artifacts found')
# Guard: no literal backslash-n text nodes immediately around stylesheet links remain.
assert '\\n<link rel="stylesheet"' not in s
assert 'css?dev=094-clean17a">\\n' not in s
p.write_text(s,encoding='utf-8')
Path('dev/CLEANUP_REPORT_CLEAN17.txt').write_text('''LIVEASTA CLEAN-17 - LITERAL NEWLINE FIX\n=======================================\nRemoved two literal \\n artifacts from dev/index.html head that were rendered as visible text above the app.\nNo DOM application nodes or logic changed.\n''',encoding='utf-8')
