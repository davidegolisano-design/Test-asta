import fs from 'node:fs';
import path from 'node:path';
import * as espree from 'espree';
import postcss from 'postcss';

const marker=/\b[Vv]\d{2,3}\b\s*(?:[:—–-]\s*)?/g;
const changes=[];

function cleanText(text){return text.replace(marker,'');}
function cleanJs(file){
  let src=fs.readFileSync(file,'utf8');
  const ast=espree.parse(src,{ecmaVersion:'latest',sourceType:'script',comment:true,range:true});
  const edits=[];
  for(const c of ast.comments||[]){
    const cleaned=cleanText(c.value);
    if(cleaned!==c.value)edits.push({start:c.range[0],end:c.range[1],raw:src.slice(c.range[0],c.range[1]),cleaned,type:c.type});
  }
  if(!edits.length)return 0;
  for(const e of edits.sort((a,b)=>b.start-a.start)){
    const open=e.type==='Line'?'//':'/*';
    const close=e.type==='Line'?'':'*/';
    src=src.slice(0,e.start)+open+e.cleaned+close+src.slice(e.end);
  }
  fs.writeFileSync(file,src);return edits.length;
}
function cleanCss(file){
  const src=fs.readFileSync(file,'utf8');
  const root=postcss.parse(src,{from:file});
  let count=0;
  root.walkComments(c=>{const x=cleanText(c.text);if(x!==c.text){c.text=x;count++;}});
  if(count)fs.writeFileSync(file,root.toString());
  return count;
}
function cleanHtmlComments(file){
  let src=fs.readFileSync(file,'utf8');let count=0;
  src=src.replace(/<!--[\s\S]*?-->/g,m=>{const x=cleanText(m);if(x!==m)count++;return x;});
  if(count)fs.writeFileSync(file,src);return count;
}

for(const name of fs.readdirSync('dev/scripts').filter(x=>x.endsWith('.js')).sort()){
  const n=cleanJs(path.join('dev/scripts',name));if(n)changes.push(`${name}: ${n} comment(s)`);
}
for(const name of fs.readdirSync('dev/styles').filter(x=>x.endsWith('.css')).sort()){
  const n=cleanCss(path.join('dev/styles',name));if(n)changes.push(`${name}: ${n} comment(s)`);
}
const htmlComments=cleanHtmlComments('dev/index.html');if(htmlComments)changes.push(`index.html: ${htmlComments} comment(s)`);

let index=fs.readFileSync('dev/index.html','utf8');
index=index.replace(/094-clean25a/g,'094-clean27a');
index=index.replace(/CLEAN-25/g,'CLEAN-27');
fs.writeFileSync('dev/index.html',index);

const files=['dev/index.html',...fs.readdirSync('dev/scripts').filter(x=>x.endsWith('.js')).map(x=>'dev/scripts/'+x),...fs.readdirSync('dev/styles').filter(x=>x.endsWith('.css')).map(x=>'dev/styles/'+x)];
let remainingComments=0;
for(const file of files){
  const src=fs.readFileSync(file,'utf8');
  if(file.endsWith('.js')){
    const ast=espree.parse(src,{ecmaVersion:'latest',sourceType:'script',comment:true,range:true});
    remainingComments+=(ast.comments||[]).reduce((n,c)=>n+((c.value.match(/\b[Vv]\d{2,3}\b/g)||[]).length),0);
  }else if(file.endsWith('.css')){
    const root=postcss.parse(src,{from:file});root.walkComments(c=>{remainingComments+=(c.text.match(/\b[Vv]\d{2,3}\b/g)||[]).length;});
  }else{
    for(const m of src.matchAll(/<!--[\s\S]*?-->/g))remainingComments+=(m[0].match(/\b[Vv]\d{2,3}\b/g)||[]).length;
  }
}

fs.writeFileSync('dev/CLEANUP_REPORT_CLEAN27_COMMENT_MARKERS.txt',`LIVEASTA CLEAN-27 - LEGACY VERSION MARKERS IN COMMENTS\n=====================================================\nBehavior-neutral cleanup. Only comment text was normalized.\nNo identifiers, class names, IDs, strings, keys or executable expressions were renamed.\n\nChanged comment groups:\n${changes.length?changes.map(x=>' - '+x).join('\n'):' - none'}\n\nRemaining standalone Vxx/vxxx markers inside comments: ${remainingComments}\n`);
