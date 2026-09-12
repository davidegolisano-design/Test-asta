from pathlib import Path
import re, collections

root=Path('dev')
js=list((root/'scripts').glob('*.js'))
css=list((root/'styles').glob('*.css'))
idx=root/'index.html'

lines=[]
lines.append('LIVEASTA CLEAN-14 - POST CLEANUP STRUCTURAL AUDIT')
lines.append('================================================')
lines.append('No application behavior changed.\n')

lines.append('[FILE SIZES]')
for p in sorted([idx,*js,*css], key=lambda p:str(p)):
    lines.append(f'{p.relative_to(root)}: {p.stat().st_size:,} bytes')

app=root/'scripts/app.js'
if app.exists():
    s=app.read_text(encoding='utf-8')
    lines.append(f'\napp.js lines: {s.count(chr(10))+1:,}')
    lines.append(f'app.js function declarations (approx): {len(re.findall(r"\\b(?:async\\s+)?function\\s+[A-Za-z_$][\\w$]*\\s*\\(",s)):,}')

html=idx.read_text(encoding='utf-8')
lines.append('\n[INDEX]')
lines.append(f'inline <style>: {len(re.findall(r"<style\\b",html,re.I))}')
# Count script tags without src
inline_scripts=0
for m in re.finditer(r'<script\\b([^>]*)>',html,re.I):
    if 'src=' not in m.group(1).lower(): inline_scripts+=1
lines.append(f'inline <script> without src: {inline_scripts}')
ids=re.findall(r'\\bid="([^"]+)"',html)
lines.append(f'static duplicate ids: {len(ids)-len(set(ids))}')

all_text='\n'.join(p.read_text(encoding='utf-8',errors='ignore') for p in [idx,*js,*css])
markers=re.findall(r'(?i)(?:liveasta[-_ ]?)?v(?:0?\\.?\\d+|\\d{2,3})',all_text)
ctr=collections.Counter(x.lower() for x in markers)
lines.append('\n[VERSION / PATCH MARKERS]')
lines.append(f'total marker-like occurrences: {sum(ctr.values())}')
for k,v in ctr.most_common(30): lines.append(f'{k}: {v}')

# Window/global assignment ownership, more targeted than function-name lexical scan.
owners=collections.defaultdict(list)
for p in js:
    s=p.read_text(encoding='utf-8',errors='ignore')
    for n,line in enumerate(s.splitlines(),1):
        for m in re.finditer(r'window\\.([A-Za-z_$][\\w$]*)\\s*=',line):
            owners[m.group(1)].append(f'{p.name}:{n}')
lines.append('\n[DUPLICATE window.* ASSIGNMENTS]')
dups={k:v for k,v in owners.items() if len(v)>1}
lines.append(f'names assigned more than once: {len(dups)}')
for k in sorted(dups): lines.append(f'{k}: '+', '.join(dups[k]))

# Approximate CSS debt metrics.
lines.append('\n[CSS DEBT METRICS]')
for p in css:
    s=p.read_text(encoding='utf-8',errors='ignore')
    important=s.count('!important')
    # Basic repeated selector signature count; intentionally audit-only.
    selectors=[]
    for m in re.finditer(r'([^{}]+)\\{[^{}]*\\}',s,re.S):
        sel=' '.join(m.group(1).split())
        if sel and not sel.startswith('@'): selectors.append(sel)
    c=collections.Counter(selectors)
    repeated=sum(1 for v in c.values() if v>1)
    maxrep=max(c.values(),default=0)
    lines.append(f'{p.name}: !important={important:,}; repeated selector signatures={repeated:,}; max repeats={maxrep}')

# Patch-header comments and old labels: report, do not mutate.
lines.append('\n[PATCH HEADER COMMENTS]')
for p in [*js,*css]:
    s=p.read_text(encoding='utf-8',errors='ignore')
    hits=[]
    for n,line in enumerate(s.splitlines(),1):
        if re.search(r'(?i)(===.*v\\d|liveasta-v\\d|\\bV\\d{2,3}:)',line):
            hits.append((n,line.strip()[:140]))
    if hits:
        lines.append(f'{p.name}: {len(hits)}')
        for n,t in hits[:12]: lines.append(f'  {n}: {t}')
        if len(hits)>12: lines.append(f'  ... +{len(hits)-12} more')

(root/'CLEANUP_AUDIT_CLEAN14.txt').write_text('\n'.join(lines)+'\n',encoding='utf-8')
