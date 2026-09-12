from pathlib import Path
import re

root=Path('dev')
css_files=list((root/'styles').glob('*.css'))
code='\n'.join([root.joinpath('index.html').read_text(encoding='utf-8',errors='ignore')] + [p.read_text(encoding='utf-8',errors='ignore') for p in (root/'scripts').glob('*.js')])

version_token=re.compile(r'([.#][A-Za-z0-9_-]*(?:v0?\d{2,3}|v\d{2,3})[A-Za-z0-9_-]*)',re.I)
rule_re=re.compile(r'([^{}]+)\{([^{}]*)\}',re.S)

rows=[]
for p in css_files:
    s=p.read_text(encoding='utf-8',errors='ignore')
    for m in rule_re.finditer(s):
        selector=' '.join(m.group(1).split())
        if selector.startswith('@'):
            continue
        toks=sorted(set(version_token.findall(selector)))
        if not toks:
            continue
        statuses=[]
        for tok in toks:
            name=tok[1:]
            # conservative literal search in HTML/JS code
            found=(name in code)
            statuses.append((tok,found))
        orphan=all(not f for _,f in statuses)
        line=s.count('\n',0,m.start())+1
        rows.append((orphan,p.name,line,selector,statuses))

out=[]
out.append('LIVEASTA CLEAN-18 - VERSIONED CSS SELECTOR AUDIT')
out.append('==============================================')
out.append('No application behavior changed.\n')
out.append(f'CSS rules/selectors with version-like class/id tokens: {len(rows)}')
out.append(f'Candidates with all version-like tokens absent from HTML/JS literals: {sum(1 for r in rows if r[0])}\n')

for orphan,pname,line,selector,statuses in sorted(rows,key=lambda x:(not x[0],x[1],x[2])):
    out.append(('ORPHAN? ' if orphan else 'REFERENCED ')+f'{pname}:{line}')
    out.append('  '+selector[:500])
    out.append('  tokens: '+', '.join(f'{t}={"found" if f else "absent"}' for t,f in statuses))

(root/'CLEANUP_AUDIT_CLEAN18.txt').write_text('\n'.join(out)+'\n',encoding='utf-8')
