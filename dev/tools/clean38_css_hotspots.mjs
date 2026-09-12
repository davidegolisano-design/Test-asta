import fs from 'node:fs';
import postcss from 'postcss';

const files=['core.css','ui.css','pwa.css','refinements.css'];
let out='LIVEASTA CLEAN-38 - CSS HOTSPOT AUDIT\n===================================\nAudit only. No CSS changed.\n\n';

function contextOf(rule){
  const ctx=[];let p=rule.parent;
  while(p&&p.type!=='root'){
    if(p.type==='atrule')ctx.unshift(`@${p.name} ${p.params}`.trim());
    p=p.parent;
  }
  return ctx.join(' > ')||'root';
}

for(const file of files){
  const src=fs.readFileSync(`dev/styles/${file}`,'utf8');
  const root=postcss.parse(src,{from:file});
  const map=new Map();
  root.walkRules(rule=>{
    const key=rule.selector.trim();
    if(!map.has(key))map.set(key,[]);
    map.get(key).push({ctx:contextOf(rule),decls:rule.nodes?.filter(n=>n.type==='decl').map(d=>`${d.prop}${d.important?'!important':''}=${d.value}`)||[]});
  });
  const rows=[...map.entries()].filter(([,occ])=>occ.length>1).sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0])).slice(0,40);
  out+=`[${file}] top repeated selectors\n`;
  for(const [sel,occ] of rows){
    const contexts=new Map();
    for(const o of occ)contexts.set(o.ctx,(contexts.get(o.ctx)||0)+1);
    out+=`- ${occ.length}x ${sel}\n  contexts: ${[...contexts.entries()].map(([c,n])=>`${n}× ${c}`).join(' | ')}\n`;
    const propCounts=new Map();
    for(const o of occ)for(const d of o.decls){const prop=d.split(/[!=]/)[0];propCounts.set(prop,(propCounts.get(prop)||0)+1);}
    const repeatedProps=[...propCounts.entries()].filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]).slice(0,12);
    if(repeatedProps.length)out+=`  repeated props: ${repeatedProps.map(([p,n])=>`${p}(${n})`).join(', ')}\n`;
  }
  out+='\n';
}
fs.writeFileSync('dev/CLEANUP_AUDIT_CLEAN38_CSS_HOTSPOTS.txt',out);
