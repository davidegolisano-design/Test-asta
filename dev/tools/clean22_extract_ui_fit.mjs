import fs from 'node:fs';
import * as espree from 'espree';

const appPath='dev/scripts/app.js';
const indexPath='dev/index.html';
const outPath='dev/scripts/ui-fit.js';
let src=fs.readFileSync(appPath,'utf8');
const ast=espree.parse(src,{ecmaVersion:'latest',sourceType:'script',range:true});
const names=new Set(['fitTextToBox','fitNominationStageTeam','fitAuctionNames','installAuctionNameAutoFit']);
const nodes=ast.body.filter(n=>n.type==='FunctionDeclaration'&&n.id&&names.has(n.id.name));
const found=new Set(nodes.map(n=>n.id.name));
for(const n of names) if(!found.has(n)) throw new Error('Missing UI fit function '+n);
const chunks=nodes.sort((a,b)=>a.range[0]-b.range[0]).map(n=>src.slice(n.range[0],n.range[1]).trim());
for(const node of [...nodes].sort((a,b)=>b.range[0]-a.range[0])) src=src.slice(0,node.range[0])+src.slice(node.range[1]);
src=src.replace(/\n{4,}/g,'\n\n\n');
fs.writeFileSync(appPath,src,'utf8');
fs.writeFileSync(outPath,`// LIVEASTA text fitting and responsive name utilities.\n\n${chunks.join('\n\n')}\n`,'utf8');
let html=fs.readFileSync(indexPath,'utf8');
if(!html.includes('scripts/ui-fit.js')){
  const marker='<script src="./scripts/app.js?dev=094-clean21a"></script>';
  if(!html.includes(marker)) throw new Error('CLEAN-21 app tag not found');
  html=html.replace(marker,`<script src="./scripts/ui-fit.js?dev=094-clean22a"></script>\n    <script src="./scripts/app.js?dev=094-clean22a"></script>`);
}
html=html.replace(/v0\.94 CLEAN-\d+/g,'v0.94 CLEAN-22');
html=html.replace(/094-clean21a/g,'094-clean22a');
fs.writeFileSync(indexPath,html,'utf8');
fs.writeFileSync('dev/CLEANUP_REPORT_CLEAN22_UI_FIT.txt',`LIVEASTA CLEAN-22 - UI FIT MODULE EXTRACTION\n============================================\nBehavior intended to be preserved.\n\nCreated: scripts/ui-fit.js\nMoved functions: ${[...names].join(', ')}\n\nThe module is loaded before app.js because app startup invokes installAuctionNameAutoFit and other modules may call fitAuctionNames.\n`,'utf8');
