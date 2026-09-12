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
function walk(node,cb,parent=null){
  if(!node||typeof node!=='object')return;
  cb(node,parent);
  for(const [k,v] of Object.entries(node)){
    if(k==='range'||k==='loc')continue;
    if(Array.isArray(v)){
      for(const c of v)if(c&&typeof c==='object')walk(c,cb,node);
    }else if(v&&typeof v==='object'&&typeof v.type==='string'){
      walk(v,cb,node);
    }
  }
}
function collectPattern(node,set){
  if(!node)return;
  if(node.type==='Identifier')set.add(node.name);
  else if(node.type==='RestElement')collectPattern(node.argument,set);
  else if(node.type==='AssignmentPattern')collectPattern(node.left,set);
  else if(node.type==='ArrayPattern')for(const e of node.elements)collectPattern(e,set);
  else if(node.type==='ObjectPattern')for(const p of node.properties)collectPattern(p.value||p.argument,set);
}
const builtins=new Set(['Math','String','Number','Object','Array','Set','Map','Date','JSON','parseInt','parseFloat','isNaN','console','window','document','localStorage','sessionStorage','navigator','encodeURIComponent','decodeURIComponent','Promise','Error','Intl','setTimeout','clearTimeout','setInterval','clearInterval','Boolean','RegExp']);
function dependencies(fn){
  const local=new Set();
  for(const p of fn.params)collectPattern(p,local);
  walk(fn.body,(n)=>{
    if(n.type==='VariableDeclarator')collectPattern(n.id,local);
    if(n.type==='FunctionDeclaration'&&n.id)local.add(n.id.name);
    if((n.type==='FunctionExpression'||n.type==='ArrowFunctionExpression'))for(const p of n.params)collectPattern(p,local);
    if(n.type==='CatchClause')collectPattern(n.param,local);
  });
  const used=new Set();
  walk(fn.body,(n,p)=>{
    if(n.type!=='Identifier')return;
    const name=n.name;
    if(local.has(name)||builtins.has(name))return;
    if(p?.type==='MemberExpression'&&p.property===n&&!p.computed)return;
    if(p?.type==='Property'&&p.key===n&&!p.computed&&p.value!==n)return;
    if(p?.type==='VariableDeclarator'&&p.id===n)return;
    if((p?.type==='FunctionDeclaration'||p?.type==='FunctionExpression')&&p.id===n)return;
    if(p?.type==='LabeledStatement'&&p.label===n)return;
    used.add(name);
  });
  return [...used].sort();
}
const candidates=['teamPurchases','teamCounts','findTeamByName','maxBidForTeam'];
const lines=['LIVEASTA CLEAN-32 - TEAM LOGIC DEPENDENCY AUDIT','=============================================','Audit only. No application code changed.',''];
for(const name of candidates){
  const fn=topFunctions.get(name);
  if(!fn){lines.push(`[${name}] NOT FOUND`,'');continue;}
  const deps=dependencies(fn);
  lines.push(`[${name}]`);
  lines.push(`bytes: ${Buffer.byteLength(src.slice(fn.range[0],fn.range[1]))}`);
  lines.push(`dependencies: ${deps.join(', ')||'(none)'}`);
  lines.push(`function deps: ${deps.filter(x=>topFunctions.has(x)).join(', ')||'(none)'}`);
  lines.push(`state deps: ${deps.filter(x=>topVars.has(x)).join(', ')||'(none)'}`);
  lines.push(`other/global deps: ${deps.filter(x=>!topFunctions.has(x)&&!topVars.has(x)).join(', ')||'(none)'}`);
  lines.push('');
}
lines.push('[APPROX CALL COUNTS]');
for(const name of candidates){
  const count=(src.match(new RegExp('\\b'+name+'\\s*\\(','g'))||[]).length;
  lines.push(`${name}: ${Math.max(0,count-1)} external call site(s)`);
}
fs.writeFileSync('dev/CLEANUP_AUDIT_CLEAN32_TEAM_LOGIC.txt',lines.join('\n')+'\n');
