from pathlib import Path
import re

p=Path('dev/index.html')
s=p.read_text(encoding='utf-8')
before=len(s)

# Remove only duplicate head meta declarations, keeping their first occurrence.
for name in ['mobile-web-app-capable','apple-mobile-web-app-capable','apple-mobile-web-app-status-bar-style']:
    pat=re.compile(r'^[ \t]*<meta\s+name="'+re.escape(name)+r'"[^>]*>\s*\n',re.M)
    matches=list(pat.finditer(s))
    for m in reversed(matches[1:]):
        s=s[:m.start()]+s[m.end():]

# Normalize excessive blank lines without altering element order or DOM nodes.
s=re.sub(r'\n[ \t]*\n(?:[ \t]*\n)+','\n\n',s)
# Normalize obvious top-level head indentation only for unindented link/meta/script lines.
lines=s.splitlines()
in_head=False
out=[]
for line in lines:
    if '<head>' in line: in_head=True
    if in_head and re.match(r'^(<meta |<link |<script )', line):
        line='    '+line
    out.append(line.rstrip())
    if '</head>' in line: in_head=False
s='\n'.join(out)+'\n'

s=s.replace('CLEAN-12','CLEAN-13').replace('094-clean12a','094-clean13a')
p.write_text(s,encoding='utf-8')

report=Path('dev/CLEANUP_REPORT_CLEAN13.txt')
report.write_text(f'''LIVEASTA CLEAN-13 - INDEX STRUCTURAL CLEANUP\n============================================\nBehavior/DOM preserved.\n\nindex.html bytes before: {before}\nindex.html bytes after:  {len(s)}\n\nRemoved only duplicate head meta declarations:\n- mobile-web-app-capable\n- apple-mobile-web-app-capable\n- apple-mobile-web-app-status-bar-style\n\nAlso normalized excessive blank lines, trailing whitespace and obvious head indentation.\nNo element IDs, application DOM nodes, script order or stylesheet order were intentionally changed.\n''',encoding='utf-8')
