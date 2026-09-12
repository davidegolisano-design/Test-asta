import fs from 'node:fs';
import * as espree from 'espree';

const appPath='dev/scripts/app.js';
const indexPath='dev/index.html';
const outPath='dev/scripts/team-rules.js';
const reportPath='dev/CLEANUP_REPORT_CLEAN34_TEAM_RULES.txt';

const targetNames=['teamPurchases','teamCounts','findTeamByName','maxBidForTeam'];
let app=fs.readFileSync(appPath,'utf8');
let index=fs.readFileSync(indexPath,'utf8');

const ast=espree.parse(app,{ecmaVersion:'latest',sourceType:'script',range:true,comment:true});
const found=new Map();
for(const node of ast.body){
  if(node.type==='FunctionDeclaration' && node.id && targetNames.includes(node.id.name)){
    if(found.has(node.id.name))throw new Error(`Duplicate top-level function ${node.id.name}`);
    found.set(node.id.name,node);
  }
}
for(const name of targetNames){
  if(!found.has(name))throw new Error(`Missing top-level function ${name}`);
}

const pieces=targetNames.map(name=>app.slice(found.get(name).range[0],found.get(name).range[1]).trim());
const moduleText=`// LIVEASTA team roster and bidding rules — CLEAN-34\n// Characterized by tests/team-logic-smoke.mjs before extraction.\n${pieces.join('\n\n')}\n`;

const ranges=[...found.values()].map(n=>n.range).sort((a,b)=>b[0]-a[0]);
for(const [start,end] of ranges){
  app=app.slice(0,start)+app.slice(end);
}
app=app.replace(/\n{4,}/g,'\n\n\n');

if(!index.includes('./scripts/room-rules.js?dev=094-clean31a')){
  throw new Error('Expected CLEAN-31 room-rules script tag not found');
}
index=index.replace(
  '    <script src="./scripts/room-rules.js?dev=094-clean31a"></script>',
  '    <script src="./scripts/room-rules.js?dev=094-clean34a"></script>\n    <script src="./scripts/team-rules.js?dev=094-clean34a"></script>'
);
index=index.replaceAll('094-clean31a','094-clean34a');
index=index.replaceAll('CLEAN-31','CLEAN-34');

fs.writeFileSync(appPath,app);
fs.writeFileSync(outPath,moduleText);
fs.writeFileSync(indexPath,index);
fs.writeFileSync(reportPath,`LIVEASTA CLEAN-34 - TEAM RULES MODULE EXTRACTION\n=================================================\nBehavior intended to be preserved exactly.\n\nCreated: scripts/team-rules.js\nMoved functions: ${targetNames.join(', ')}\n\nDependencies intentionally remain external globals:\n - purchasesCache / teamsCache state in app.js\n - Classic/Mantra helpers in roles.js\n - room capacity helpers in room-rules.js\n\nPersistent characterization test: tests/team-logic-smoke.mjs\nNo realtime, Supabase, timer, READY/SKIP or auction event code was moved.\n`);
