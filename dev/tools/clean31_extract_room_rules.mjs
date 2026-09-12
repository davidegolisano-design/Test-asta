import fs from 'node:fs';
import * as espree from 'espree';

const appPath='dev/scripts/app.js';
const indexPath='dev/index.html';
const modulePath='dev/scripts/room-rules.js';
const reportPath='dev/CLEANUP_REPORT_CLEAN31_ROOM_RULES.txt';

let app=fs.readFileSync(appPath,'utf8');
let index=fs.readFileSync(indexPath,'utf8');
const ast=espree.parse(app,{ecmaVersion:'latest',sourceType:'script',range:true});
const wanted=new Set(['roomLimits','totalRoomSlots']);
const nodes=ast.body.filter(n=>n.type==='FunctionDeclaration'&&n.id&&wanted.has(n.id.name));
if(nodes.length!==2)throw new Error(`Expected 2 room-rule functions, found ${nodes.length}`);

function lineRange(src,start,end){
  const a=src.lastIndexOf('\n',start-1)+1;
  let b=src.indexOf('\n',end);if(b<0)b=src.length;else b+=1;
  return [a,b];
}
const ordered=nodes.sort((a,b)=>a.range[0]-b.range[0]);
const snippets=ordered.map(n=>app.slice(n.range[0],n.range[1]).trim());
for(const [a,b] of ordered.map(n=>lineRange(app,n.range[0],n.range[1])).sort((x,y)=>y[0]-x[0]))app=app.slice(0,a)+app.slice(b);

fs.writeFileSync(modulePath,'// LIVEASTA room capacity rules — CLEAN-31\n'+snippets.join('\n\n')+'\n');
fs.writeFileSync(appPath,app);

if(!index.includes('scripts/roles.js?dev=094-clean29a'))throw new Error('CLEAN-29 roles script not found');
index=index.replace(/094-clean29a/g,'094-clean31a');
index=index.replace(/CLEAN-29/g,'CLEAN-31');
index=index.replace(
  '<script src="./scripts/roles.js?dev=094-clean31a"></script>',
  '<script src="./scripts/roles.js?dev=094-clean31a"></script>\n    <script src="./scripts/room-rules.js?dev=094-clean31a"></script>'
);
if(!index.includes('scripts/room-rules.js?dev=094-clean31a'))throw new Error('Failed to insert room-rules.js');
fs.writeFileSync(indexPath,index);

fs.writeFileSync(reportPath,`LIVEASTA CLEAN-31 - ROOM CAPACITY RULE MODULE EXTRACTION\n=====================================================\nBehavior intended to be preserved.\n\nCreated: scripts/room-rules.js\nMoved functions: roomLimits, totalRoomSlots\n\nOnly deterministic room-capacity rules were moved. teamPurchases, teamCounts, maxBidForTeam and all auction/realtime state remain in app.js.\nroles.js loads before room-rules.js so Mantra capacity continues to use isMantraRoom/mantraRosterMax.\n`);
