import fs from 'node:fs';
import * as espree from 'espree';

const src=fs.readFileSync('dev/scripts/app.js','utf8');
const ast=espree.parse(src,{ecmaVersion:'latest',sourceType:'script',range:true});
const funcs=ast.body.filter(n=>n.type==='FunctionDeclaration'&&n.id&&/sealed/i.test(n.id.name));

const top=new Set();
for(const n of ast.body){
  if(n.type==='FunctionDeclaration'&&n.id)top.add(n.id.name);
  if(n.type==='VariableDeclaration')for(const d of n.declarations)if(d.id.type==='Identifier')top.add(d.id.name);
}
function walk(node,fn,parent=null){if(!node||typeof node!=='object')return;fn(node,parent);for(const [k,v] of Object.entries(node)){if(['range','loc','start','end'].includes(k))continue;if(Array.isArray(v))v.forEach(x=>walk(x,fn,node));else if(v&&typeof v==='object'&&v.type)walk(v,fn,node);}}
function addPattern(p,set){if(!p)return;if(p.type==='Identifier')set.add(p.name);else if(p.type==='AssignmentPattern')addPattern(p.left,set);else if(p.type==='RestElement')addPattern(p.argument,set);else if(p.type==='ArrayPattern')p.elements.forEach(x=>addPattern(x,set));else if(p.type==='ObjectPattern')p.properties.forEach(x=>addPattern(x.value||x.argument,set));}
function deps(fn){const local=new Set([fn.id.name]);fn.params.forEach(p=>addPattern(p,local));walk(fn.body,n=>{if(n.type==='VariableDeclarator')addPattern(n.id,local);if((n.type==='FunctionExpression'||n.type==='ArrowFunctionExpression'))n.params.forEach(p=>addPattern(p,local));});const ids=new Set();walk(fn.body,(n,p)=>{if(n.type!=='Identifier')return;if(p?.type==='MemberExpression'&&p.property===n&&!p.computed)return;if((p?.type==='Property'||p?.type==='MethodDefinition')&&p.key===n&&!p.computed)return;if(p?.type==='VariableDeclarator'&&p.id===n)return;if((p?.type==='FunctionDeclaration'||p?.type==='FunctionExpression')&&p.id===n)return;ids.add(n.name);});return [...ids].filter(x=>!local.has(x));}

let out='LIVEASTA CLEAN-44 - SEALED AUCTION FUNCTION AUDIT\n===============================================\nAudit only. No application code changed.\n\n';
out+=`Top-level sealed functions found: ${funcs.length}\n\n`;
for(const fn of funcs){const ds=deps(fn);out+=`[${fn.id.name}] bytes=${fn.range[1]-fn.range[0]}\napp deps: ${ds.filter(x=>top.has(x)).join(', ')||'(none)'}\nexternal/builtins: ${ds.filter(x=>!top.has(x)).join(', ')||'(none)'}\nsource:\n${src.slice(fn.range[0],fn.range[1])}\n\n`;}
fs.writeFileSync('dev/CLEANUP_AUDIT_CLEAN44_SEALED.txt',out);
