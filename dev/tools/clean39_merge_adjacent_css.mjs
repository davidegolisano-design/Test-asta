import fs from 'node:fs';
import postcss from 'postcss';

const files=['core.css','ui.css','pwa.css','refinements.css'];
let total=0;
const details=[];

function processContainer(container,file){
  let merged=0;
  for(let i=0;i<container.nodes.length-1;){
    const a=container.nodes[i],b=container.nodes[i+1];
    if(a.type==='rule'&&b.type==='rule'&&a.selector.trim()===b.selector.trim()){
      for(const child of [...b.nodes])a.append(child.clone());
      b.remove();
      merged++;total++;
      details.push(`${file}: ${a.selector.trim()}`);
      continue;
    }
    i++;
  }
  for(const node of [...container.nodes]){
    if(node.nodes&&node.type!=='rule')processContainer(node,file);
  }
  return merged;
}

for(const file of files){
  const p=`dev/styles/${file}`;
  const src=fs.readFileSync(p,'utf8');
  const root=postcss.parse(src,{from:p});
  processContainer(root,file);
  fs.writeFileSync(p,root.toString());
}

if(total===0)throw new Error('No adjacent identical-selector CSS rules found; nothing to clean');

let index=fs.readFileSync('dev/index.html','utf8');
if(!index.includes('094-clean36a'))throw new Error('Expected CLEAN-36 cache token not found');
index=index.replaceAll('094-clean36a','094-clean39a').replaceAll('CLEAN-36','CLEAN-39');
fs.writeFileSync('dev/index.html',index);
fs.writeFileSync('dev/CLEANUP_REPORT_CLEAN39_ADJACENT_CSS.txt',`LIVEASTA CLEAN-39 - ADJACENT CSS RULE MERGE\n==========================================\nMerged only immediately adjacent rules with the exact same selector inside the exact same parent context.\nDeclaration order was preserved. No rule was moved across another CSS rule or at-rule.\n\nMerged rule pairs: ${total}\n\n${details.map(x=>'- '+x).join('\n')}\n`);
