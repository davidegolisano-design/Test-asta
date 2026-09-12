import fs from 'node:fs';
import path from 'node:path';
import * as espree from 'espree';
import postcss from 'postcss';

const root='dev';
const scriptsDir=path.join(root,'scripts');
const stylesDir=path.join(root,'styles');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const jsFiles=fs.readdirSync(scriptsDir).filter(f=>f.endsWith('.js')).sort();
const cssFiles=fs.readdirSync(stylesDir).filter(f=>f.endsWith('.css')).sort();

function identifiersFromPattern(node,out=[]){
  if(!node)return out;
  if(node.type==='Identifier')out.push(node.name);
  else if(node.type==='ObjectPattern')node.properties.forEach(p=>identifiersFromPattern(p.value||p.argument,out));
  else if(node.type==='ArrayPattern')node.elements.forEach(e=>identifiersFromPattern(e,out));
  else if(node.type==='RestElement')identifiersFromPattern(node.argument,out);
  else if(node.type==='AssignmentPattern')identifiersFromPattern(node.left,out);
  return out;
}
function ownerNames(src){
  const ast=espree.parse(src,{ecmaVersion:'latest',sourceType:'script',allowHashBang:true});
  const names=[];
  for(const n of ast.body){
    if(n.type==='FunctionDeclaration'&&n.id)names.push({name:n.id.name,type:'function'});
    if(n.type==='ClassDeclaration'&&n.id)names.push({name:n.id.name,type:'class'});
    if(n.type==='VariableDeclaration')for(const d of n.declarations)for(const name of identifiersFromPattern(d.id))names.push({name,type:n.kind});
    if(n.type==='ExpressionStatement'&&n.expression?.type==='AssignmentExpression'){
      const l=n.expression.left;
      if(l.type==='Identifier')names.push({name:l.name,type:'assignment'});
      if(l.type==='MemberExpression'&&!l.computed&&l.object?.type==='Identifier'&&l.object.name==='window'&&l.property?.type==='Identifier')names.push({name:l.property.name,type:'window-assignment'});
    }
  }
  return names;
}

const jsStats=[];
const owners=new Map();
let appStats=null;
for(const file of jsFiles){
  const src=fs.readFileSync(path.join(scriptsDir,file),'utf8');
  let names=[];let parseError='';
  try{ names=ownerNames(src); }catch(e){ parseError=String(e.message||e); }
  const functions=names.filter(x=>x.type==='function').length;
  const variables=names.filter(x=>['const','let','var'].includes(x.type)).length;
  const stat={file,bytes:Buffer.byteLength(src),lines:src.split('\n').length,functions,variables,parseError};
  jsStats.push(stat);if(file==='app.js')appStats=stat;
  for(const item of names){
    if(!owners.has(item.name))owners.set(item.name,[]);
    owners.get(item.name).push({file,type:item.type});
  }
}

const crossFileDuplicates=[];
for(const [name,items] of owners){
  const files=[...new Set(items.map(x=>x.file))];
  if(files.length>1)crossFileDuplicates.push({name,items});
}
crossFileDuplicates.sort((a,b)=>a.name.localeCompare(b.name));

const inlineStyle=(html.match(/<style\b/gi)||[]).length;
const inlineScript=(html.match(/<script\b(?![^>]*\bsrc=)/gi)||[]).length;
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const idCounts=new Map();ids.forEach(id=>idCounts.set(id,(idCounts.get(id)||0)+1));
const duplicateIds=[...idCounts].filter(([,n])=>n>1);
const scriptSrcs=[...html.matchAll(/<script[^>]+src="([^"]+)"[^>]*><\/script>/gi)].map(m=>m[1]);
const handlerAttrs=[...html.matchAll(/\son[a-z]+="([^"]*)"/gi)].map(m=>m[1]);
const handlerNames=new Set();
for(const code of handlerAttrs)for(const m of code.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g))handlerNames.add(m[1]);
const ownerSet=new Set(owners.keys());
const builtinHandlerNames=new Set(['if','String','Number','parseInt','parseFloat','setTimeout','clearTimeout','encodeURIComponent']);
const missingHandlerOwners=[...handlerNames].filter(n=>!ownerSet.has(n)&&!builtinHandlerNames.has(n)).sort();

const cssStats=[];
for(const file of cssFiles){
  const src=fs.readFileSync(path.join(stylesDir,file),'utf8');
  const rootCss=postcss.parse(src,{from:file});
  let rules=0,decls=0,important=0;
  const selectors=new Map();
  rootCss.walkRules(r=>{rules++;const s=r.selector.trim();selectors.set(s,(selectors.get(s)||0)+1);});
  rootCss.walkDecls(d=>{decls++;if(d.important)important++;});
  cssStats.push({file,bytes:Buffer.byteLength(src),lines:src.split('\n').length,rules,decls,important,repeatedSelectors:[...selectors.values()].filter(n=>n>1).length});
}

const allText=[html,...jsFiles.map(f=>fs.readFileSync(path.join(scriptsDir,f),'utf8')),...cssFiles.map(f=>fs.readFileSync(path.join(stylesDir,f),'utf8'))].join('\n');
const versionMarkers=(allText.match(/\bv\d{2,3}\b/gi)||[]).length;
const cleanMarkers=(allText.match(/CLEAN-\d+/g)||[]).length;

const lines=[];
lines.push('LIVEASTA CLEAN-26 - ARCHITECTURE AUDIT');
lines.push('====================================');
lines.push('Audit only: no application behavior changed.');
lines.push('');
lines.push('[INDEX]');
lines.push(`bytes: ${Buffer.byteLength(html)}`);
lines.push(`inline <style>: ${inlineStyle}`);
lines.push(`inline <script> without src: ${inlineScript}`);
lines.push(`HTML ids: ${ids.length}`);
lines.push(`duplicate ids: ${duplicateIds.length}`);
lines.push(`inline event handler attributes: ${handlerAttrs.length}`);
lines.push(`handler function names detected: ${handlerNames.size}`);
lines.push(`handler names without top-level JS owner (review only): ${missingHandlerOwners.length}${missingHandlerOwners.length?' -> '+missingHandlerOwners.join(', '):''}`);
lines.push('script load order:');scriptSrcs.forEach((s,i)=>lines.push(`  ${i+1}. ${s}`));
lines.push('');
lines.push('[JAVASCRIPT FILES]');
for(const s of jsStats)lines.push(`${s.file}: ${s.bytes} bytes | ${s.lines} lines | ${s.functions} top-level functions | ${s.variables} top-level vars${s.parseError?' | PARSE ERROR '+s.parseError:''}`);
lines.push('');
if(appStats){
  lines.push('[APP.JS]');
  lines.push(`${appStats.bytes} bytes | ${appStats.lines} lines | ${appStats.functions} top-level functions | ${appStats.variables} top-level vars`);
  lines.push(`reduction vs historical 524582-byte baseline: ${524582-appStats.bytes} bytes (${(((524582-appStats.bytes)/524582)*100).toFixed(2)}%)`);
  lines.push('');
}
lines.push('[CROSS-FILE TOP-LEVEL OWNERSHIP DUPLICATES]');
lines.push(`count: ${crossFileDuplicates.length}`);
for(const d of crossFileDuplicates)lines.push(`${d.name}: ${d.items.map(x=>x.file+'['+x.type+']').join(', ')}`);
lines.push('');
lines.push('[CSS FILES]');
for(const s of cssStats)lines.push(`${s.file}: ${s.bytes} bytes | ${s.lines} lines | ${s.rules} rules | ${s.decls} declarations | ${s.important} !important | ${s.repeatedSelectors} repeated selector signatures`);
lines.push('');
lines.push('[LEGACY MARKERS - REVIEW ONLY]');
lines.push(`vXX/vXXX tokens: ${versionMarkers}`);
lines.push(`CLEAN-XX tokens: ${cleanMarkers}`);
lines.push('Do not remove markers automatically; some remain in compatibility class/id names or comments.');

fs.writeFileSync(path.join(root,'CLEANUP_AUDIT_CLEAN26_ARCHITECTURE.txt'),lines.join('\n')+'\n');
