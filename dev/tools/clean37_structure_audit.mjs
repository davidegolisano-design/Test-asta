import fs from 'node:fs';
import path from 'node:path';
import * as espree from 'espree';
import postcss from 'postcss';

const index=fs.readFileSync('dev/index.html','utf8');
const scriptRefs=[...index.matchAll(/<script\s+src="\.\/scripts\/([^"?]+)(?:\?[^" ]*)?"/g)].map(m=>m[1]);
const cssRefs=[...index.matchAll(/<link[^>]+href="\.\/styles\/([^"?]+)(?:\?[^" ]*)?"/g)].map(m=>m[1]);

const owners=new Map();
let out='LIVEASTA CLEAN-37 - UPDATED STRUCTURE AUDIT\n============================================\nAudit only. No application code changed.\n\n';
out+=`Loaded JS files: ${scriptRefs.length}\nLoaded CSS files: ${cssRefs.length}\n\n[JS MODULES]\n`;

for(const file of scriptRefs){
  const p=path.join('dev/scripts',file);
  if(!fs.existsSync(p)){out+=`${file}: MISSING\n`;continue;}
  const src=fs.readFileSync(p,'utf8');
  const ast=espree.parse(src,{ecmaVersion:'latest',sourceType:'script'});
  let funcs=0,vars=0;
  for(const n of ast.body){
    if(n.type==='FunctionDeclaration'&&n.id){
      funcs++; const arr=owners.get(n.id.name)||[];arr.push(file);owners.set(n.id.name,arr);
    }
    if(n.type==='VariableDeclaration'){
      for(const d of n.declarations){if(d.id.type==='Identifier'){vars++;const arr=owners.get(d.id.name)||[];arr.push(file);owners.set(d.id.name,arr);}}
    }
    if(n.type==='ExpressionStatement'&&n.expression?.type==='AssignmentExpression'){
      const l=n.expression.left;
      if(l.type==='Identifier'){const arr=owners.get(l.name)||[];arr.push(file);owners.set(l.name,arr);}
      if(l.type==='MemberExpression'&&l.object?.name==='window'&&l.property?.type==='Identifier'){
        const arr=owners.get(l.property.name)||[];arr.push(file);owners.set(l.property.name,arr);
      }
    }
  }
  out+=`${file}: ${Buffer.byteLength(src)} bytes | ${src.split(/\r?\n/).length} lines | top-level functions ${funcs} | top-level vars ${vars}\n`;
}
const duplicateOwners=[...owners.entries()].filter(([,files])=>new Set(files).size>1);
out+=`\nCross-file global owner collisions: ${duplicateOwners.length}\n`;
for(const [name,files] of duplicateOwners)out+=` - ${name}: ${[...new Set(files)].join(', ')}\n`;

const app=fs.readFileSync('dev/scripts/app.js','utf8');
out+=`\n[APP.JS]\nbytes: ${Buffer.byteLength(app)}\nlines: ${app.split(/\r?\n/).length}\nversion-like markers in comments/text: ${(app.match(/\b(?:MV|V|v)\d{2,3}\b/g)||[]).length}\n`;

out+='\n[CSS]\n';
let totalRules=0,totalDecls=0,totalImportant=0,totalRepeated=0;
for(const file of cssRefs){
  const p=path.join('dev/styles',file);if(!fs.existsSync(p)){out+=`${file}: MISSING\n`;continue;}
  const src=fs.readFileSync(p,'utf8');
  const root=postcss.parse(src,{from:p});
  let rules=0,decls=0,important=0;
  const selectorCounts=new Map();
  root.walkRules(rule=>{rules++;const s=rule.selector.trim();selectorCounts.set(s,(selectorCounts.get(s)||0)+1);});
  root.walkDecls(d=>{decls++;if(d.important)important++;});
  const repeated=[...selectorCounts.values()].filter(n=>n>1).length;
  totalRules+=rules;totalDecls+=decls;totalImportant+=important;totalRepeated+=repeated;
  out+=`${file}: ${Buffer.byteLength(src)} bytes | rules ${rules} | declarations ${decls} | !important ${important} | repeated selector signatures ${repeated}\n`;
}
out+=`TOTAL CSS: rules ${totalRules} | declarations ${totalDecls} | !important ${totalImportant} | repeated selector signatures ${totalRepeated}\n`;

fs.writeFileSync('dev/CLEANUP_AUDIT_CLEAN37_STRUCTURE.txt',out);
