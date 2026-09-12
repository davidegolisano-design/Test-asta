import fs from 'node:fs';
import path from 'node:path';
import * as espree from 'espree';
import postcss from 'postcss';

const indexPath='dev/index.html';
const index=fs.readFileSync(indexPath,'utf8');
const scriptRefs=[...index.matchAll(/<script\s+src="\.\/scripts\/([^"?]+)(?:\?[^" ]*)?"/g)].map(m=>m[1]);
const cssRefs=[...index.matchAll(/<link[^>]+href="\.\/styles\/([^"?]+)(?:\?[^" ]*)?"/g)].map(m=>m[1]);
const ids=[...index.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const duplicateIds=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
const missing=[];
for(const f of scriptRefs)if(!fs.existsSync(path.join('dev/scripts',f)))missing.push(`scripts/${f}`);
for(const f of cssRefs)if(!fs.existsSync(path.join('dev/styles',f)))missing.push(`styles/${f}`);

const owners=new Map();
let jsBytes=0;
let jsLines=0;
for(const file of scriptRefs){
  const p=path.join('dev/scripts',file);if(!fs.existsSync(p))continue;
  const src=fs.readFileSync(p,'utf8');jsBytes+=Buffer.byteLength(src);jsLines+=src.split(/\r?\n/).length;
  const ast=espree.parse(src,{ecmaVersion:'latest',sourceType:'script'});
  const add=(name)=>{const set=owners.get(name)||new Set();set.add(file);owners.set(name,set);};
  for(const n of ast.body){
    if(n.type==='FunctionDeclaration'&&n.id)add(n.id.name);
    if(n.type==='VariableDeclaration')for(const d of n.declarations)if(d.id.type==='Identifier')add(d.id.name);
    if(n.type==='ExpressionStatement'&&n.expression?.type==='AssignmentExpression'){
      const l=n.expression.left;
      if(l.type==='Identifier')add(l.name);
      if(l.type==='MemberExpression'&&l.object?.name==='window'&&l.property?.type==='Identifier')add(l.property.name);
    }
  }
}
const collisions=[...owners.entries()].filter(([,files])=>files.size>1).map(([name,files])=>[name,[...files]]);

let cssRules=0,cssDecls=0,cssImportant=0,cssBytes=0;
for(const file of cssRefs){
  const p=path.join('dev/styles',file);if(!fs.existsSync(p))continue;
  const src=fs.readFileSync(p,'utf8');cssBytes+=Buffer.byteLength(src);
  const root=postcss.parse(src,{from:p});
  root.walkRules(()=>cssRules++);
  root.walkDecls(d=>{cssDecls++;if(d.important)cssImportant++;});
}

const app=fs.readFileSync('dev/scripts/app.js','utf8');
const inlineScripts=[...index.matchAll(/<script(?![^>]*\bsrc=)[^>]*>/g)].length;
const inlineStyles=[...index.matchAll(/<style\b[^>]*>/g)].length;
const versionMarkers=(app.match(/\b(?:MV|V|v)\d{2,3}\b/g)||[]).length;

let out='LIVEASTA CLEAN-41 - FINAL STRUCTURE AUDIT\n=========================================\nAudit only. No application code changed.\n\n';
out+=`HTML duplicate ids: ${duplicateIds.length}${duplicateIds.length?` -> ${duplicateIds.join(', ')}`:''}\n`;
out+=`Missing loaded local assets: ${missing.length}${missing.length?` -> ${missing.join(', ')}`:''}\n`;
out+=`Inline <script> blocks: ${inlineScripts}\nInline <style> blocks: ${inlineStyles}\n`;
out+=`Loaded JS files: ${scriptRefs.length}\nLoaded JS total bytes: ${jsBytes}\nLoaded JS total lines: ${jsLines}\nCross-file global owner collisions: ${collisions.length}\n`;
for(const [name,files] of collisions)out+=` - ${name}: ${files.join(', ')}\n`;
out+=`\napp.js bytes: ${Buffer.byteLength(app)}\napp.js lines: ${app.split(/\r?\n/).length}\napp.js version-like markers: ${versionMarkers}\n`;
out+=`\nLoaded CSS files: ${cssRefs.length}\nCSS total bytes: ${cssBytes}\nCSS rules: ${cssRules}\nCSS declarations: ${cssDecls}\nCSS !important: ${cssImportant}\n`;
out+=`\nDecision gate:\n- JS structural cleanup is considered stable only if duplicate IDs=0, missing assets=0, inline blocks=0 and global owner collisions=0.\n- Remaining CSS cascade is intentionally not auto-collapsed across breakpoints.\n`;
fs.writeFileSync('dev/CLEANUP_AUDIT_CLEAN41_FINAL_STRUCTURE.txt',out);

if(duplicateIds.length||missing.length||inlineScripts||inlineStyles||collisions.length)process.exitCode=2;
