import fs from 'node:fs';
import * as espree from 'espree';

const src=fs.readFileSync('dev/scripts/app.js','utf8');
const ast=espree.parse(src,{ecmaVersion:'latest',sourceType:'script',range:true});
const topFunctions=new Map();
const topVars=new Set();
for(const n of ast.body){
  if(n.type==='FunctionDeclaration'&&n.id)topFunctions.set(n.id.name,n);
  if(n.type==='VariableDeclaration')for(const d of n.declarations)if(d.id?.type==='Identifier')topVars.add(d.id.name);
}

function declaredInside(fn){
  const s=new Set(fn.params.filter(p=>p.type==='Identifier').map(p=>p.name));
  walk(fn.body,(node,parent)=>{
    if(node.type==='VariableDeclarator'&&node.id?.type==='Identifier')s.add(node.id.name);
    if(node.type==='FunctionDeclaration'&&node.id)s.add(node.id.name);
    if(node.type==='FunctionExpression'&&node.id)s.add(node.id.name);
    if(node.type==='CatchClause'&&node.param?.type==='Identifier')s.add(node.param.name);
  });
  return s;
}
function walk(node,cb,parent=null){
  if(!node||typeof node!=='object')return;
  cb(node,parent);
  for(const [k,v] of Object.entries(node)){
    if(k==='range'||k==='loc')continue;
    if(Array.isArray(v))for(const c of v)if(c&&typeof c==='object')walk(c,cb,node);
    else if(v&&typeof v==='object'&&typeof v.type==='string')walk(v,cb,node);
  }
}
const globals=new Set(['Math','String','Number','Object','Array','Set','Map','Date','JSON','parseInt','parseFloat','isNaN','Number','console','window','document','localStorage','sessionStorage','navigator','encodeURIComponent','decodeURIComponent','Promise','Error','Intl','setTimeout','clearTimeout','setInterval','clearInterval']);
function refs(fn){
  const local=declaredInside(fn);const used=new Set();
  walk(fn.body,(n,p)=>{
    if(n.type!=='Identifier')return;
    if(local.has(n.name)||globals.has(n.name))return;
    if(p?.type==='MemberExpression'&&p.property===n&&!p.computed)return;
    if(p?.type==='Property'&&p.key===n&&!p.computed&&p.value!==n)return;
    if(p?.type==='VariableDeclarator'&&p.id===n)return;
    if(p?.type==='FunctionDeclaration'&&p.id===n)return;
    if(p?.type==='LabeledStatement'&&p.label===n)return;
    used.add(n.name);
  });
  return [...used].sort();
}

const candidates=['roomLimits','totalRoomSlots','teamPurchases','teamCounts','maxBidForTeam'];
const lines=[];
lines.push('LIVEASTA CLEAN-30 - ROOM RULES DEPENDENCY AUDIT');
lines.push('==============================================');
lines.push('Audit only. No application code changed.');
lines.push('');
for(const name of candidates){
  const fn=topFunctions.get(name);
  if(!fn){lines.push(`[${name}] NOT FOUND`);continue;}
  const r=refs(fn);
  lines.push(`[${name}]`);
  lines.push(`bytes: ${Buffer.byteLength(src.slice(fn.range[0],fn.range[1]))}`);
  lines.push(`refs: ${r.join(', ')||'(none)'}`);
  lines.push(`top-level function refs: ${r.filter(x=>topFunctions.has(x)).join(', ')||'(none)'}`);
  lines.push(`top-level state refs: ${r.filter(x=>topVars.has(x)).join(', ')||'(none)'}`);
  lines.push('');
}

// Functions immediately around roomLimits in source order.
const ordered=[...topFunctions.entries()].sort((a,b)=>a[1].range[0]-b[1].range[0]);
const idx=ordered.findIndex(([n])=>n==='roomLimits');
lines.push('[NEARBY TOP-LEVEL FUNCTIONS]');
for(const [name,fn] of ordered.slice(Math.max(0,idx-5),idx+16)){
  lines.push(`${name}: ${Buffer.byteLength(src.slice(fn.range[0],fn.range[1]))} bytes | refs=${refs(fn).join(', ')}`);
}
lines.push('');
lines.push('[CALLERS IN APP.JS]');
for(const name of candidates){
  const rx=new RegExp('\\b'+name.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')+'\\s*\\(','g');
  const count=(src.match(rx)||[]).length;
  lines.push(`${name}: ${Math.max(0,count-1)} call site(s) outside its declaration (approx.)`);
}

fs.writeFileSync('dev/CLEANUP_AUDIT_CLEAN30_ROOM_RULES.txt',lines.join('\n')+'\n');
