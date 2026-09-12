import fs from 'node:fs';

const appPath='dev/scripts/app.js';
const indexPath='dev/index.html';
const assetPath='dev/scripts/player-assets.js';
const reportPath='dev/CLEANUP_REPORT_CLEAN23_ASSETS.txt';

let app=fs.readFileSync(appPath,'utf8');
let index=fs.readFileSync(indexPath,'utf8');

const start="        const LIVEASTA_ASSET_BASE = '..';\n";
const end="        const SUPABASE_URL = 'https://qvkembahfeecfpsshepv.supabase.co';";
const startAt=app.indexOf(start);
const endAt=app.indexOf(end);
if(startAt<0 || endAt<0 || endAt<=startAt) throw new Error('Asset block markers not found');

const moved=app.slice(startAt,endAt);
for(const required of ['function genericPlayerImage','function playerImageUrl','function setPlayerImage','function playerImageFallback']){
  if(!moved.includes(required)) throw new Error(`Missing ${required} in extracted block`);
}
app=app.slice(0,startAt)+app.slice(endAt);

const asset=`// LIVEASTA player image / asset utilities — CLEAN-23\n`+moved.trimStart();
fs.writeFileSync(assetPath,asset.endsWith('\n')?asset:asset+'\n');
fs.writeFileSync(appPath,app);

if(!index.includes('./scripts/app.js')) throw new Error('app.js script tag not found');
if(index.includes('./scripts/player-assets.js')) throw new Error('player-assets.js already present');
index=index.replace(/094-clean22a/g,'094-clean23a');
index=index.replace(/CLEAN-22/g,'CLEAN-23');
index=index.replace(/(<script[^>]+src="\.\/scripts\/app\.js\?dev=094-clean23a"[^>]*><\/script>)/,
  '<script src="./scripts/player-assets.js?dev=094-clean23a"></script>\n    $1');
if(!index.includes('scripts/player-assets.js?dev=094-clean23a')) throw new Error('Failed to insert player-assets.js');
fs.writeFileSync(indexPath,index);

const report=`LIVEASTA CLEAN-23 - PLAYER ASSET MODULE EXTRACTION\n===============================================\nBehavior intended to be preserved.\n\nCreated: scripts/player-assets.js\nMoved constant: LIVEASTA_ASSET_BASE\nMoved functions: genericPlayerImage, playerImageUrl, setPlayerImage, playerImageFallback\n\nThe module is loaded immediately before app.js. The Mantra role helper remains owned by app.js and is resolved when genericPlayerImage is called.\n`;
fs.writeFileSync(reportPath,report);
