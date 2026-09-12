import fs from 'node:fs';

const appPath='dev/scripts/app.js';
const indexPath='dev/index.html';
const modulePath='dev/scripts/roles.js';
const reportPath='dev/CLEANUP_REPORT_CLEAN24_ROLES.txt';

let app=fs.readFileSync(appPath,'utf8');
let index=fs.readFileSync(indexPath,'utf8');

const start="        const MANTRA_ROLE_ORDER=['Por','Dc','B','Dd','Ds','E','M','C','W','T','A','Pc'];\n";
const end="        function updateCreateRoomModeUI(){";
const startAt=app.indexOf(start);
const endAt=app.indexOf(end);
if(startAt<0 || endAt<0 || endAt<=startAt) throw new Error('Role block markers not found');

const moved=app.slice(startAt,endAt);
const required=[
  'function roomGameMode','function isMantraRoom','function normalizeMantraRole','function mantraRoleTokens',
  'function mantraRoleFromPlayer','function playerRole','function playerIsGoalkeeper','function mantraRosterMax',
  'function mantraRosterMin','function mantraMinGoalkeepers','function listoneHasMantraRoles','function activeRoleLabel','function mantraRoleMatches'
];
for(const name of required){ if(!moved.includes(name)) throw new Error(`Missing ${name}`); }
app=app.slice(0,startAt)+app.slice(endAt);
fs.writeFileSync(appPath,app);

const moduleText='// LIVEASTA Classic / Mantra role domain helpers — CLEAN-24\n'+moved.trimStart();
fs.writeFileSync(modulePath,moduleText.endsWith('\n')?moduleText:moduleText+'\n');

if(!index.includes('scripts/player-assets.js?dev=094-clean23a')) throw new Error('CLEAN-23 player-assets script not found');
index=index.replace(/094-clean23a/g,'094-clean24a');
index=index.replace(/CLEAN-23/g,'CLEAN-24');
index=index.replace(
  '<script src="./scripts/player-assets.js?dev=094-clean24a"></script>',
  '<script src="./scripts/roles.js?dev=094-clean24a"></script>\n    <script src="./scripts/player-assets.js?dev=094-clean24a"></script>'
);
if(!index.includes('scripts/roles.js?dev=094-clean24a')) throw new Error('Failed to insert roles.js');
fs.writeFileSync(indexPath,index);

fs.writeFileSync(reportPath,`LIVEASTA CLEAN-24 - CLASSIC/MANTRA ROLE MODULE EXTRACTION\n======================================================\nBehavior intended to be preserved.\n\nCreated: scripts/roles.js\nMoved constant: MANTRA_ROLE_ORDER\nMoved functions: roomGameMode, isMantraRoom, normalizeMantraRole, mantraRoleTokens, mantraRoleFromPlayer, playerRole, playerIsGoalkeeper, mantraRosterMax, mantraRosterMin, mantraMinGoalkeepers, listoneHasMantraRoles, activeRoleLabel, mantraRoleMatches\n\nupdateCreateRoomModeUI remains in app.js because it is UI-specific.\nroles.js is loaded before player-assets.js and app.js. Defaults referencing currentRoom/playersList are evaluated at call time, after app.js has initialized the application state.\n`);
