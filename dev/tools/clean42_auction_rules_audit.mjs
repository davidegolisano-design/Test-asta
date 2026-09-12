import fs from 'node:fs';
import * as espree from 'espree';

const files=['dev/scripts/app.js','dev/scripts/team-rules.js','dev/scripts/room-rules.js','dev/scripts/roles.js'];
const targets=['readyRequiredTeams','readyRequiredIds','evaluateReadyGate','isNormalBidAmountAllowed','isSelfRaiseBlockedForTeam','eligibleNominationTeams','firstIncompleteRole','maxBidForTeam'];

const allTop=new Set();
const parsed=[];
for(const file of files){
  const src=fs.readFileSync(file,'utf8');
  const ast=espree.parse(src,{ecmaVersion:'latest',sourceType:'script',range:true});
  parsed.push({file,src,ast});
  for(const n of ast.body){
    if(n.type==='FunctionDeclaration'&&n.id)allTop.add(n.id.name);
    if(n.type==='VariableDeclaration')for(const d of n.declarations)if(d.id.type==='Identifier')allTop.add(d.id.name);
  }
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
function addPattern(p,set){
  if(!p)return;
  if(p.type==='Identifier')set.add(p.name);
  else if(p.type==='AssignmentPattern')addPattern(p.left,set);
  else if(p.type==='RestElement')addPattern(p.argument,set);
  else if(p.type==='ArrayPattern')p.elements.forEach(x=>addPattern(x,set));
  else if(p.type==='ObjectPattern')p.properties.forEach(x=>addPattern(x.value||x.argument,set));
}
function deps(fn){
  const local=new Set([fn.id?.name]);fn.params.forEach(p=>addPattern(p,local));
  walk(fn.body,n=>{if(n.type==='VariableDeclarator')addPattern(n.id,local);if((n.type==='FunctionExpression'||n.type==='ArrowFunctionExpression'))n.params.forEach(p=>addPattern(p,local));});
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

let out='LIVEASTA CLEAN-42 - CRITICAL AUCTION RULES AUDIT\n================================================\nAudit only. No application code changed.\n\n';
for(const name of targets){
  let hit=null;
  for(const unit of parsed){
    const fn=unit.ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name===name);
    if(fn){hit={...unit,fn};break;}
  }
  if(!hit){out+=`[${name}] MISSING\n\n`;continue;}
  const ds=deps(hit.fn);
  out+=`[${name}] owner=${hit.file.replace('dev/scripts/','')}\n`;
  out+=`top-level deps: ${ds.filter(x=>allTop.has(x)).join(', ')||'(none)'}\n`;
  out+=`external/builtins: ${ds.filter(x=>!allTop.has(x)).join(', ')||'(none)'}\n`;
  out+=`source:\n${hit.src.slice(hit.fn.range[0],hit.fn.range[1])}\n\n`;
}
fs.writeFileSync('dev/CLEANUP_AUDIT_CLEAN42_AUCTION_RULES.txt',out);
