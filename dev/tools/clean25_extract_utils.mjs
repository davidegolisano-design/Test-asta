import fs from 'node:fs';

const appPath='dev/scripts/app.js';
const indexPath='dev/index.html';
const modulePath='dev/scripts/utils.js';
const reportPath='dev/CLEANUP_REPORT_CLEAN25_UTILS.txt';

let app=fs.readFileSync(appPath,'utf8');
let index=fs.readFileSync(indexPath,'utf8');

const jsonStart='        function safeReadLocalJson(key){\n';
const jsonEnd='        function banditoreUiPrefsKey(){';
const js=app.indexOf(jsonStart), je=app.indexOf(jsonEnd);
if(js<0||je<0||je<=js) throw new Error('Local JSON utility block markers not found');
const jsonBlock=app.slice(js,je);
if(!jsonBlock.includes('function safeWriteLocalJson')) throw new Error('safeWriteLocalJson missing');
app=app.slice(0,js)+app.slice(je);

const textStart='        function normalizeRoomCode(value) {';
const textEnd='        function roomLimits(room = currentRoom) {';
const ts=app.indexOf(textStart), te=app.indexOf(textEnd);
if(ts<0||te<0||te<=ts) throw new Error('Text utility block markers not found');
const textBlock=app.slice(ts,te);
if(!textBlock.includes('function escapeHtml')) throw new Error('escapeHtml missing');
app=app.slice(0,ts)+app.slice(te);

const moduleText='// LIVEASTA generic shared utilities — CLEAN-25\n'+jsonBlock.trimStart()+'\n'+textBlock.trimStart();
fs.writeFileSync(modulePath,moduleText.endsWith('\n')?moduleText:moduleText+'\n');
fs.writeFileSync(appPath,app);

if(!index.includes('scripts/roles.js?dev=094-clean24a')) throw new Error('CLEAN-24 roles script not found');
index=index.replace(/094-clean24a/g,'094-clean25a');
index=index.replace(/CLEAN-24/g,'CLEAN-25');
index=index.replace(
  '<script src="./scripts/roles.js?dev=094-clean25a"></script>',
  '<script src="./scripts/utils.js?dev=094-clean25a"></script>\n    <script src="./scripts/roles.js?dev=094-clean25a"></script>'
);
if(!index.includes('scripts/utils.js?dev=094-clean25a')) throw new Error('Failed to insert utils.js');
fs.writeFileSync(indexPath,index);

fs.writeFileSync(reportPath,`LIVEASTA CLEAN-25 - SHARED UTILITY MODULE EXTRACTION\n================================================\nBehavior intended to be preserved.\n\nCreated: scripts/utils.js\nMoved functions: safeReadLocalJson, safeWriteLocalJson, normalizeRoomCode, escapeHtml\n\nutils.js is loaded before roles.js, player-assets.js and app.js. No auction, realtime, Supabase or access logic was changed.\n`);
