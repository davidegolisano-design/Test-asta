import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';

const dir='dev/styles';
const files=fs.readdirSync(dir).filter(x=>x.endsWith('.css')).sort();
const allowed=new Set([
  'margin','margin-top','margin-right','margin-bottom','margin-left',
  'padding','padding-top','padding-right','padding-bottom','padding-left',
  'gap','row-gap','column-gap',
  'width','min-width','max-width','height','min-height','max-height',
  'font-size','font-weight','line-height','letter-spacing','text-align','white-space',
  'overflow','overflow-x','overflow-y','box-sizing',
  'display','position','top','right','bottom','left','inset','inset-inline','inset-block',
  'z-index','opacity','visibility',
  'align-items','align-content','align-self','justify-content','justify-items','justify-self',
  'grid-template-columns','grid-template-rows','grid-column','grid-row','grid-auto-flow',
  'flex','flex-basis','flex-grow','flex-shrink','flex-direction','flex-wrap','order',
  'border-radius'
]);
const risky=/\b(?:var|env|calc|clamp|min|max)\s*\(|(?:^|\s)-(?:webkit|moz|ms|o)-/i;

function contextOf(rule){
  const parts=[];
  let p=rule.parent;
  while(p && p.type!=='root'){
    if(p.type==='atrule') parts.unshift(`@${p.name} ${p.params}`.trim());
    p=p.parent;
  }
  return parts.join(' > ');
}

let totalGroups=0,totalRemoved=0;
const report=[];

for(const file of files){
  const filePath=path.join(dir,file);
  const before=fs.readFileSync(filePath,'utf8');
  const root=postcss.parse(before,{from:filePath});
  const groups=new Map();

  root.walkRules(rule=>{
    const ctx=contextOf(rule);
    rule.walkDecls(decl=>{
      const prop=decl.prop.toLowerCase();
      if(!allowed.has(prop)) return;
      if(prop.startsWith('-')||decl.value.startsWith('-')||risky.test(decl.value)) return;
      const key=`${ctx}\u0000${rule.selector}\u0000${prop}`;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(decl);
    });
  });

  let fileGroups=0,fileRemoved=0;
  for(const decls of groups.values()){
    if(decls.length<2)continue;
    const important=decls.filter(d=>d.important);
    const winner=important.length?important[important.length-1]:decls[decls.length-1];
    const losers=decls.filter(d=>d!==winner);
    if(!losers.length)continue;
    fileGroups++;
    for(const d of losers){d.remove();fileRemoved++;}
  }

  const after=root.toString();
  // Reparse output before writing.
  postcss.parse(after,{from:filePath});
  fs.writeFileSync(filePath,after,'utf8');
  totalGroups+=fileGroups;totalRemoved+=fileRemoved;
  report.push(`${file}: groups consolidated=${fileGroups}; declarations removed=${fileRemoved}; bytes ${Buffer.byteLength(before)} -> ${Buffer.byteLength(after)}`);
}

const idx='dev/index.html';
let html=fs.readFileSync(idx,'utf8');
html=html.replaceAll('CLEAN-15','CLEAN-16').replaceAll('094-clean15a','094-clean16a');
fs.writeFileSync(idx,html,'utf8');

const text=[
  'LIVEASTA CLEAN-16 - CONSERVATIVE GLOBAL CSS CASCADE',
  '===================================================',
  'Behavior-preserving same-selector cascade cleanup.',
  '',
  ...report,
  '',
  `TOTAL groups consolidated: ${totalGroups}`,
  `TOTAL dead declarations removed: ${totalRemoved}`,
  '',
  'Safety constraints:',
  '- same stylesheet only',
  '- exact same selector',
  '- exact same at-rule ancestry',
  '- exact same property',
  '- CSS importance respected when choosing the winner',
  '- colors/backgrounds/custom properties untouched',
  '- var/env/calc/clamp/min/max values untouched',
  '- vendor-prefixed fallbacks untouched',
  ''
].join('\n');
fs.writeFileSync('dev/CLEANUP_REPORT_CLEAN16.txt',text,'utf8');
console.log(text);
