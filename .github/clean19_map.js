const fs=require('fs');
const acorn=require('acorn');
const eslintScope=require('eslint-scope');

const src=fs.readFileSync('dev/scripts/app.js','utf8');
const html=fs.readFileSync('dev/index.html','utf8');
const ast=acorn.parse(src,{ecmaVersion:'latest',sourceType:'script',locations:true,ranges:true,allowHashBang:true});
const manager=eslintScope.analyze(ast,{ecmaVersion:2022,sourceType:'script',optimistic:true,ignoreEval:true});

const handlers=[];
const attrRe=/\bon(?:click|change|input|keydown|keyup|pointerdown|pointermove|pointerup|pointercancel|contextmenu|submit)="([^"]*)"/gi;
let hm;
while((hm=attrRe.exec(html))) handlers.push(hm[1]);
const handlerText=handlers.join('\n');

const funcs=ast.body.filter(n=>n.type==='FunctionDeclaration' && n.id);
const rows=[];
for(const fn of funcs){
  const scope=manager.acquire(fn);
  const free=[...new Set((scope?.through||[]).map(r=>r.identifier.name))].sort();
  const name=fn.id.name;
  const directHtml=new RegExp('\\b'+name.replace(/[$]/g,'\\$&')+'\\s*\\(').test(handlerText);
  const bodyLines=fn.loc.end.line-fn.loc.start.line+1;
  rows.push({name,line:fn.loc.start.line,end:fn.loc.end.line,bodyLines,free,directHtml});
}

const vars=[];
for(const n of ast.body){
  if(n.type==='VariableDeclaration'){
    for(const d of n.declarations){
      if(d.id.type==='Identifier') vars.push({name:d.id.name,line:d.loc.start.line,kind:n.kind});
    }
  }
}

function bucket(name){
  const n=name.toLowerCase();
  if(/pin|auth|access|wizard|join|login/.test(n)) return 'access-auth';
  if(/ready/.test(n)) return 'ready';
  if(/sealed|busta|envelope/.test(n)) return 'sealed';
  if(/budget|slot|credit/.test(n)) return 'budget-roster';
  if(/roster|rose|rosa|purchase|acquist/.test(n)) return 'budget-roster';
  if(/audio|sound|voice|speak/.test(n)) return 'audio';
  if(/presence|online|offline|connection|heartbeat/.test(n)) return 'presence';
  if(/player|gioc/.test(n)) return 'player-ui';
  if(/auctioneer|banditor|nomination|turn/.test(n)) return 'auctioneer';
  if(/list|filter|search|shortlist|prefer/.test(n)) return 'listone';
  if(/room|stanza|team|squadra/.test(n)) return 'room-team';
  if(/supabase|rpc|fetch|load|save|sync/.test(n)) return 'data-sync';
  if(/render|update|refresh|show|open|close|toggle/.test(n)) return 'ui-general';
  return 'other';
}
const buckets={};
for(const r of rows){
  const b=bucket(r.name);
  (buckets[b]??=[]).push(r);
}

const out=[];
out.push('LIVEASTA CLEAN-19 - app.js MODULARIZATION MAP');
out.push('=============================================');
out.push('Audit only. No application behavior changed.\n');
out.push(`app.js bytes: ${Buffer.byteLength(src).toLocaleString('en-US')}`);
out.push(`app.js lines: ${src.split(/\n/).length.toLocaleString('en-US')}`);
out.push(`top-level function declarations: ${rows.length}`);
out.push(`top-level variable declarations: ${vars.length}`);
out.push(`functions called directly from HTML event attributes: ${rows.filter(r=>r.directHtml).length}\n`);

out.push('[DOMAIN HEURISTIC SUMMARY]');
for(const [b,arr] of Object.entries(buckets).sort((a,b)=>b[1].length-a[1].length)){
  const htmlCount=arr.filter(x=>x.directHtml).length;
  const lines=arr.reduce((n,x)=>n+x.bodyLines,0);
  out.push(`${b}: functions=${arr.length}; approx function-lines=${lines}; HTML-entrypoints=${htmlCount}`);
}

out.push('\n[LARGEST TOP-LEVEL FUNCTIONS]');
for(const r of [...rows].sort((a,b)=>b.bodyLines-a.bodyLines).slice(0,40)){
  out.push(`${r.name} L${r.line}-L${r.end} (${r.bodyLines} lines) free=${r.free.length}${r.directHtml?' HTML':''}`);
}

out.push('\n[HTML ENTRYPOINTS]');
for(const r of rows.filter(r=>r.directHtml).sort((a,b)=>a.line-b.line)){
  out.push(`${r.name} L${r.line} free=${r.free.length}`);
}

out.push('\n[LOW-COUPLING EXTRACTION CANDIDATES]');
const candidates=rows.filter(r=>r.free.length<=8 && r.bodyLines>=4 && !r.directHtml)
  .sort((a,b)=>a.free.length-b.free.length || b.bodyLines-a.bodyLines)
  .slice(0,80);
for(const r of candidates){
  out.push(`${r.name} L${r.line}-L${r.end} lines=${r.bodyLines} free=${r.free.length} [${r.free.join(', ')}]`);
}

out.push('\n[TOP-LEVEL STATE SAMPLE]');
for(const v of vars.slice(0,160)) out.push(`${v.kind} ${v.name} L${v.line}`);
if(vars.length>160) out.push(`... +${vars.length-160} more`);

out.push('\n[FUNCTION MAP BY DOMAIN]');
for(const [b,arr] of Object.entries(buckets).sort()){
  out.push(`\n## ${b}`);
  for(const r of arr.sort((a,b)=>a.line-b.line)){
    out.push(`${r.name} L${r.line}-${r.end} lines=${r.bodyLines} free=${r.free.length}${r.directHtml?' HTML':''}`);
  }
}

fs.writeFileSync('dev/CLEANUP_AUDIT_CLEAN19_APP_MAP.txt',out.join('\n')+'\n');
