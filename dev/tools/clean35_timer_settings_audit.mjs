import fs from 'node:fs';
import * as espree from 'espree';

const src=fs.readFileSync('dev/scripts/app.js','utf8');
const ast=espree.parse(src,{ecmaVersion:'latest',sourceType:'script',range:true});
const targets=[
  'auctionPrepStateKey','loadAuctionPrepSeconds','saveAuctionPrepSeconds',
  'sealedTimerStateKey','loadSealedTimerSeconds','saveSealedTimerSeconds',
  'sealedRevealStateKey','loadSealedRevealSeconds','saveSealedRevealSeconds',
  'roomAuctionExtraSettingsKey','loadRoomAuctionExtraSettings','saveRoomAuctionExtraSettings'
];

const topNames=new Set();
for(const n of ast.body){
  if(n.type==='FunctionDeclaration'&&n.id)topNames.add(n.id.name);
  if(n.type==='VariableDeclaration')for(const d of n.declarations)if(d.id.type==='Identifier')topNames.add(d.id.name);
}

function walk(node,fn,parent=null){
  if(!node||typeof node!=='object')return;
  fn(node,parent);
  for(const [k,v] of Object.entries(node)){
    if(['range','loc','start','end'].includes(k))continue;
    if(Array.isArray(v))v.forEach(x=>walk(x,fn,node));
    else if(v&&typeof v==='object'&&v.type)walk(v,fn,node);
  }
}
function addPattern(pattern,set){
  if(!pattern)return;
  if(pattern.type==='Identifier')set.add(pattern.name);
  else if(pattern.type==='ObjectPattern')pattern.properties.forEach(p=>addPattern(p.value||p.argument,set));
  else if(pattern.type==='ArrayPattern')pattern.elements.forEach(e=>addPattern(e,set));
  else if(pattern.type==='RestElement')addPattern(pattern.argument,set);
  else if(pattern.type==='AssignmentPattern')addPattern(pattern.left,set);
}
function depsFor(fn){
  const local=new Set([fn.id?.name]);
  fn.params.forEach(p=>addPattern(p,local));
  walk(fn.body,(n)=>{
    if(n.type==='VariableDeclarator')addPattern(n.id,local);
    if(n.type==='FunctionDeclaration'&&n!==fn&&n.id)local.add(n.id.name);
    if((n.type==='FunctionExpression'||n.type==='ArrowFunctionExpression'))n.params.forEach(p=>addPattern(p,local));
  });
  const ids=new Set();
  walk(fn.body,(n,p)=>{
    if(n.type!=='Identifier')return;
    if(p?.type==='MemberExpression'&&p.property===n&&!p.computed)return;
    if((p?.type==='Property'||p?.type==='MethodDefinition')&&p.key===n&&!p.computed)return;
    if(p?.type==='VariableDeclarator'&&p.id===n)return;
    if((p?.type==='FunctionDeclaration'||p?.type==='FunctionExpression')&&p.id===n)return;
    ids.add(n.name);
  });
  return [...ids].filter(x=>!local.has(x));
}

let out='LIVEASTA CLEAN-35 - TIMER/ROOM SETTINGS DEPENDENCY AUDIT\n==========================================================\nAudit only. No application code changed.\n\n';
for(const name of targets){
  const fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name===name);
  if(!fn){out+=`[${name}] MISSING\n\n`;continue;}
  const deps=depsFor(fn);
  const appDeps=deps.filter(x=>topNames.has(x));
  const external=deps.filter(x=>!topNames.has(x));
  out+=`[${name}]\nbytes: ${fn.range[1]-fn.range[0]}\napp-level deps: ${appDeps.join(', ')||'(none)'}\nexternal/global deps: ${external.join(', ')||'(none)'}\nsource:\n${src.slice(fn.range[0],fn.range[1])}\n\n`;
}
fs.writeFileSync('dev/CLEANUP_AUDIT_CLEAN35_TIMER_SETTINGS.txt',out);
