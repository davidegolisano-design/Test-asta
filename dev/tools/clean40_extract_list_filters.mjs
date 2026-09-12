import fs from 'node:fs';
import * as espree from 'espree';

const appPath='dev/scripts/app.js';
const indexPath='dev/index.html';
const outPath='dev/scripts/list-filters.js';
const reportPath='dev/CLEANUP_REPORT_CLEAN40_LIST_FILTERS.txt';

const variableNames=new Set([
  'listFilterViews','listFilterLabels','listFilterCache','listFilterCollator','listFilterTeamId'
]);
const functionNames=new Set([
  'listFilterRoles','listFilterStorageKey','listFilterState','changeListFilter','renderListFilters','filterAndSortPlayers'
]);

let app=fs.readFileSync(appPath,'utf8');
let index=fs.readFileSync(indexPath,'utf8');
const ast=espree.parse(app,{ecmaVersion:'latest',sourceType:'script',range:true});
const nodes=[];
const foundVars=new Set();
const foundFuncs=new Set();

for(const node of ast.body){
  if(node.type==='VariableDeclaration'){
    const names=node.declarations.map(d=>d.id?.type==='Identifier'?d.id.name:null).filter(Boolean);
    const hits=names.filter(n=>variableNames.has(n));
    if(hits.length){
      const outsiders=names.filter(n=>!variableNames.has(n));
      if(outsiders.length)throw new Error(`Mixed variable declaration contains unrelated names: ${names.join(', ')}`);
      hits.forEach(n=>foundVars.add(n));
      nodes.push(node);
    }
  }
  if(node.type==='FunctionDeclaration'&&node.id&&functionNames.has(node.id.name)){
    if(foundFuncs.has(node.id.name))throw new Error(`Duplicate function ${node.id.name}`);
    foundFuncs.add(node.id.name);
    nodes.push(node);
  }
}

for(const n of variableNames)if(!foundVars.has(n))throw new Error(`Missing variable ${n}`);
for(const n of functionNames)if(!foundFuncs.has(n))throw new Error(`Missing function ${n}`);

nodes.sort((a,b)=>a.range[0]-b.range[0]);
const moduleText=`// LIVEASTA shared list filters and sorting — CLEAN-40\n// Behavior characterized by tests/list-filters-smoke.mjs before extraction.\n\n${nodes.map(n=>app.slice(n.range[0],n.range[1]).trim()).join('\n\n')}\n`;

for(const node of [...nodes].sort((a,b)=>b.range[0]-a.range[0])){
  app=app.slice(0,node.range[0])+app.slice(node.range[1]);
}
app=app.replace(/^\s*\/\/ Shared search\/filter UI\. Only roles, sort and direction are persisted\.\s*\n?/m,'');
app=app.replace(/\n{4,}/g,'\n\n\n');

if(!index.includes('./scripts/screen-wake-lock.js?dev=094-clean36a'))throw new Error('Expected CLEAN-36 script order not found');
if(!index.includes('./scripts/app.js?dev=094-clean36a'))throw new Error('Expected CLEAN-36 app script not found');
index=index.replace(
  '    <script src="./scripts/screen-wake-lock.js?dev=094-clean36a"></script>\n    <script src="./scripts/app.js?dev=094-clean36a"></script>',
  '    <script src="./scripts/screen-wake-lock.js?dev=094-clean40a"></script>\n    <script src="./scripts/list-filters.js?dev=094-clean40a"></script>\n    <script src="./scripts/app.js?dev=094-clean40a"></script>'
);
index=index.replaceAll('094-clean36a','094-clean40a');
index=index.replaceAll('CLEAN-36','CLEAN-40');

fs.writeFileSync(appPath,app);
fs.writeFileSync(outPath,moduleText);
fs.writeFileSync(indexPath,index);
fs.writeFileSync(reportPath,`LIVEASTA CLEAN-40 - LIST FILTERS MODULE EXTRACTION\n==================================================\nBehavior intended to be preserved exactly.\n\nCreated: scripts/list-filters.js\nMoved state: ${[...variableNames].join(', ')}\nMoved functions: ${[...functionNames].join(', ')}\n\nThe module remains a classic browser script and keeps the same global names used by inline handlers and app rendering code.\nIt is loaded immediately before app.js. Dependencies on role helpers, UI preferences, player data and rendering callbacks continue to resolve at call time.\nNo Supabase, realtime, READY/SKIP, bidding or auction timer logic was moved.\n\nPersistent characterization: tests/list-filters-smoke.mjs\n`);
