import fs from 'node:fs';
import * as espree from 'espree';

const appPath='dev/scripts/app.js';
const indexPath='dev/index.html';
const audioPath='dev/scripts/audio.js';
let src=fs.readFileSync(appPath,'utf8');
const ast=espree.parse(src,{ecmaVersion:'latest',sourceType:'script',range:true});
const fnNames=new Set(['openAudioMixer','closeAudioMixer','loadAudioSettings','saveAudioSettings','updateAudioLabel','playSound','testAuctionAudio','speakBidValue','testBidVoice','speakFinalCountdownNumber','playAuctionFinalCountdown','testFinalCountdownAudio']);
const varNames=new Set(['AUDIO_SETTINGS_KEY','defaultAudioSettings','audioSettings']);
const nodes=[];
for(const node of ast.body){
  if(node.type==='FunctionDeclaration' && node.id && fnNames.has(node.id.name)) nodes.push(node);
  if(node.type==='VariableDeclaration'){
    const names=node.declarations.map(d=>d.id?.type==='Identifier'?d.id.name:null).filter(Boolean);
    if(names.some(n=>varNames.has(n))){
      if(!names.every(n=>varNames.has(n))) throw new Error('Mixed audio/non-audio variable declaration: '+names.join(','));
      nodes.push(node);
    }
  }
}
const foundFns=new Set(nodes.filter(n=>n.type==='FunctionDeclaration').map(n=>n.id.name));
const foundVars=new Set(nodes.filter(n=>n.type==='VariableDeclaration').flatMap(n=>n.declarations.map(d=>d.id.name)));
for(const n of fnNames) if(!foundFns.has(n)) throw new Error('Missing audio function '+n);
for(const n of varNames) if(!foundVars.has(n)) throw new Error('Missing audio variable '+n);
const chunks=nodes.sort((a,b)=>a.range[0]-b.range[0]).map(n=>src.slice(n.range[0],n.range[1]).trim());
for(const node of [...nodes].sort((a,b)=>b.range[0]-a.range[0])) src=src.slice(0,node.range[0])+src.slice(node.range[1]);
src=src.replace(/\n{4,}/g,'\n\n\n');
fs.writeFileSync(appPath,src,'utf8');
fs.writeFileSync(audioPath,`// LIVEASTA audio settings, playback and mixer UI. Extracted from app.js without behavioral changes.\n\n${chunks.join('\n\n')}\n`,'utf8');

let html=fs.readFileSync(indexPath,'utf8');
if(!html.includes('scripts/audio.js')){
  const marker=/\s*<script src="\.\/scripts\/app\.js\?dev=[^"]+"><\/script>/;
  const match=html.match(marker);
  if(!match) throw new Error('app.js script tag not found');
  const appTag=match[0].trim();
  html=html.replace(marker,`\n    <script src="./scripts/audio.js?dev=094-clean21a"></script>\n    ${appTag}`);
}
html=html.replace(/v0\.94 CLEAN-\d+/g,'v0.94 CLEAN-21');
html=html.replace(/094-clean\d+[a-z]?/g,'094-clean21a');
fs.writeFileSync(indexPath,html,'utf8');

const report=`LIVEASTA CLEAN-21 - AUDIO MODULE EXTRACTION\n===========================================\nBehavior intended to be preserved.\n\nCreated: scripts/audio.js\nMoved constants: ${[...varNames].join(', ')}\nMoved functions: ${[...fnNames].join(', ')}\n\naudio.js is loaded immediately before app.js because auction logic calls playSound/speakBidValue/playAuctionFinalCountdown.\nAudio routing/presence persistence remains in app.js for now.\n`;
fs.writeFileSync('dev/CLEANUP_REPORT_CLEAN21_AUDIO.txt',report,'utf8');
