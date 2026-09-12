const fs=require('fs');
const acorn=require('acorn');

const appPath='dev/scripts/app.js';
const outPath='dev/scripts/csv-import-utils.js';
const indexPath='dev/index.html';
const names=[
  'csvImportNormalize',
  'csvImportDetectDelimiter',
  'parseCsvRows',
  'csvImportHeaderIndex',
  'csvImportLooksLikeHeader',
  'csvImportColumnMap',
  'csvImportPrice'
];

let src=fs.readFileSync(appPath,'utf8');
const beforeBytes=Buffer.byteLength(src);
const ast=acorn.parse(src,{ecmaVersion:'latest',sourceType:'script',ranges:true});
const found=new Map();
for(const node of ast.body){
  if(node.type==='FunctionDeclaration' && node.id && names.includes(node.id.name)){
    found.set(node.id.name,node);
  }
}
for(const name of names){
  if(!found.has(name)) throw new Error(`Missing function: ${name}`);
}

const nodes=names.map(n=>found.get(n)).sort((a,b)=>a.start-b.start);
const chunks=nodes.map(n=>src.slice(n.start,n.end).trim());
const moduleText=`// LIVEASTA CSV import parsing utilities.\n// Pure parsing/normalization helpers; no DOM, Supabase or application state.\n\n${chunks.join('\n\n')}\n`;
fs.writeFileSync(outPath,moduleText);

for(const n of [...nodes].sort((a,b)=>b.start-a.start)){
  src=src.slice(0,n.start)+src.slice(n.end);
}
src=src.replace(/\n{4,}/g,'\n\n\n');
fs.writeFileSync(appPath,src);

let html=fs.readFileSync(indexPath,'utf8');
const appTag='<script src="./scripts/app.js?dev=094-clean18a"></script>';
if(!html.includes(appTag)) throw new Error('Expected CLEAN-18 app.js tag not found');
html=html.replace(appTag,`<script src="./scripts/csv-import-utils.js?dev=094-clean19a"></script>\n    <script src="./scripts/app.js?dev=094-clean19a"></script>`);
html=html.replaceAll('CLEAN-18','CLEAN-19').replaceAll('094-clean18a','094-clean19a');
fs.writeFileSync(indexPath,html);

const afterBytes=Buffer.byteLength(src);
fs.writeFileSync('dev/CLEANUP_REPORT_CLEAN19.txt',`LIVEASTA CLEAN-19 - FIRST app.js MODULE EXTRACTION\n=================================================\nBehavior intended to be preserved.\n\nCreated: scripts/csv-import-utils.js\nExtracted functions: ${names.join(', ')}\n\napp.js bytes: ${beforeBytes} -> ${afterBytes}\nRemoved from app.js: ${beforeBytes-afterBytes} bytes\n\nThe new file is loaded immediately before app.js.\nOnly pure CSV parsing/normalization helpers were moved.\nNo Supabase calls, UI handlers, room state or roster mutation logic moved.\n`);
