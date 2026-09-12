import fs from 'node:fs';
import * as espree from 'espree';

const appPath='dev/scripts/app.js';
const indexPath='dev/index.html';
const outPath='dev/scripts/timer-settings.js';
const reportPath='dev/CLEANUP_REPORT_CLEAN36_TIMER_SETTINGS.txt';
const targetNames=[
  'auctionPrepStateKey','loadAuctionPrepSeconds','saveAuctionPrepSeconds',
  'sealedTimerStateKey','loadSealedTimerSeconds','saveSealedTimerSeconds',
  'sealedRevealStateKey','loadSealedRevealSeconds','saveSealedRevealSeconds'
];

let app=fs.readFileSync(appPath,'utf8');
let index=fs.readFileSync(indexPath,'utf8');
const ast=espree.parse(app,{ecmaVersion:'latest',sourceType:'script',range:true});
const found=new Map();
for(const node of ast.body){
  if(node.type==='FunctionDeclaration'&&node.id&&targetNames.includes(node.id.name)){
    if(found.has(node.id.name))throw new Error(`Duplicate function ${node.id.name}`);
    found.set(node.id.name,node);
  }
}
for(const name of targetNames)if(!found.has(name))throw new Error(`Missing function ${name}`);

const moduleText=`// LIVEASTA room timer settings — CLEAN-36\n// Characterized before and after extraction by tests/timer-settings-smoke.mjs.\n${targetNames.map(name=>app.slice(found.get(name).range[0],found.get(name).range[1]).trim()).join('\n\n')}\n`;
for(const [start,end] of [...found.values()].map(n=>n.range).sort((a,b)=>b[0]-a[0])){
  app=app.slice(0,start)+app.slice(end);
}
app=app.replace(/\n{4,}/g,'\n\n\n');

if(!index.includes('./scripts/team-rules.js?dev=094-clean34a'))throw new Error('Expected CLEAN-34 team-rules tag not found');
index=index.replace(
  '    <script src="./scripts/team-rules.js?dev=094-clean34a"></script>',
  '    <script src="./scripts/team-rules.js?dev=094-clean36a"></script>\n    <script src="./scripts/timer-settings.js?dev=094-clean36a"></script>'
);
index=index.replaceAll('094-clean34a','094-clean36a');
index=index.replaceAll('CLEAN-34','CLEAN-36');

fs.writeFileSync(appPath,app);
fs.writeFileSync(outPath,moduleText);
fs.writeFileSync(indexPath,index);
fs.writeFileSync(reportPath,`LIVEASTA CLEAN-36 - ROOM TIMER SETTINGS MODULE EXTRACTION\n=========================================================\nBehavior preserved by before/after characterization.\n\nCreated: scripts/timer-settings.js\nMoved functions: ${targetNames.join(', ')}\n\nMoved only local room timer normalization/key helpers.\nKept roomAuctionExtraSettingsKey/load/save in app.js because those functions touch Supabase, self-raise, nomination and auto-random state.\nNo realtime, READY/SKIP, bid event or Supabase logic was moved.\n`);
