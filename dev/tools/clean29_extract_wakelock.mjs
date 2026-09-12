import fs from 'node:fs';
import * as espree from 'espree';

const appPath='dev/scripts/app.js';
const indexPath='dev/index.html';
const modulePath='dev/scripts/screen-wake-lock.js';
const reportPath='dev/CLEANUP_REPORT_CLEAN29_WAKELOCK.txt';

let app=fs.readFileSync(appPath,'utf8');
let index=fs.readFileSync(indexPath,'utf8');

const stateLines=[
  '        let screenWakeLock = null;\n',
  '        let wakeLockRetryTimer = null;\n'
];
for(const line of stateLines){
  if(!app.includes(line)) throw new Error('Wake-lock state declaration not found: '+line.trim());
  app=app.replace(line,'');
}

const ast=espree.parse(app,{ecmaVersion:'latest',sourceType:'script',range:true});
const wanted=new Set(['requestScreenWakeLock','releaseScreenWakeLock','installScreenWakeLock']);
const found=[];
for(const node of ast.body){
  if(node.type==='FunctionDeclaration'&&node.id&&wanted.has(node.id.name)) found.push(node);
}
if(found.length!==wanted.size) throw new Error('Expected 3 wake-lock functions, found '+found.length);

function lineRange(src,start,end){
  let a=src.lastIndexOf('\n',start-1)+1;
  let b=src.indexOf('\n',end);
  if(b<0)b=src.length;else b+=1;
  return [a,b];
}
const snippets=found.sort((a,b)=>a.range[0]-b.range[0]).map(n=>app.slice(n.range[0],n.range[1]).trim());
const removals=found.map(n=>lineRange(app,n.range[0],n.range[1])).sort((a,b)=>b[0]-a[0]);
for(const [a,b] of removals) app=app.slice(0,a)+app.slice(b);

const module=`// LIVEASTA screen wake-lock lifecycle — CLEAN-29\nlet screenWakeLock = null;\nlet wakeLockRetryTimer = null;\n\n${snippets.join('\n\n')}\n`;
fs.writeFileSync(modulePath,module);
fs.writeFileSync(appPath,app);

if(!index.includes('scripts/player-assets.js?dev=094-clean27a')) throw new Error('CLEAN-27 player-assets script not found');
index=index.replace(/094-clean27a/g,'094-clean29a');
index=index.replace(/CLEAN-27/g,'CLEAN-29');
index=index.replace(
  '<script src="./scripts/player-assets.js?dev=094-clean29a"></script>',
  '<script src="./scripts/player-assets.js?dev=094-clean29a"></script>\n    <script src="./scripts/screen-wake-lock.js?dev=094-clean29a"></script>'
);
if(!index.includes('scripts/screen-wake-lock.js?dev=094-clean29a')) throw new Error('Failed to insert wake-lock module');
fs.writeFileSync(indexPath,index);

fs.writeFileSync(reportPath,`LIVEASTA CLEAN-29 - SCREEN WAKE-LOCK MODULE EXTRACTION\n===================================================\nBehavior intended to be preserved.\n\nCreated: scripts/screen-wake-lock.js\nMoved state: screenWakeLock, wakeLockRetryTimer\nMoved functions: requestScreenWakeLock, releaseScreenWakeLock, installScreenWakeLock\n\nThe module is loaded before app.js. App startup still calls installScreenWakeLock on DOMContentLoaded.\nNo auction, realtime, room access or Supabase behavior was changed.\n`);
