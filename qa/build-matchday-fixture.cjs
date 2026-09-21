// Usage: NODE_PATH=/path/to/deps/node_modules node qa/build-matchday-fixture.cjs
const {parseHTML}=require('linkedom'),fs=require('node:fs');
const {document}=parseHTML(fs.readFileSync('index.html','utf8'));
document.querySelectorAll('script,audio,source,link[rel=manifest],iframe').forEach(el=>el.remove());
document.querySelectorAll('*').forEach(el=>{
 for(const attr of [...el.attributes])if(attr.name.startsWith('on'))el.removeAttribute(attr.name);
 if(el.tagName==='IMG')el.setAttribute('src','./player-demo.svg');
 if(el.hasAttribute('autofocus'))el.removeAttribute('autofocus');
 const href=el.getAttribute('href');if(href?.startsWith('./'))el.setAttribute('href','.'+href);
});
document.title='LIVEASTA — Galleria UI (dati fittizi)';
const csp=document.createElement('meta');csp.httpEquiv='Content-Security-Policy';csp.content="connect-src 'none'; form-action 'none'; object-src 'none'";document.head.prepend(csp);
for(const name of ['auctioneer-mobile-clean','room-chat']){const link=document.createElement('link');link.rel='stylesheet';link.href=`../styles/${name}.css`;document.head.append(link)}
const toolbar=document.createElement('details');toolbar.id='fixture-tools';toolbar.innerHTML='<summary>Galleria UI · dati fittizi</summary><label>Schermata <select id="fixture-scene"><option value="management">Gestione</option><option value="board">Listone banditore</option><option value="auction">Asta banditore · Parma</option><option value="ready">Ready banditore · Parma</option><option value="first-turn">Primo turno · vuoto</option><option value="player">Giocatore · Parma</option><option value="listone">Listone giocatore</option><option value="preview">Rose · Bijlow</option><option value="preview-long">Rose · nome lungo</option></select></label><label>Tema <select id="fixture-theme"></select></label><label>Ruoli <select id="fixture-mode"><option value="classic">Classic</option><option value="mantra">Mantra</option></select></label>';
document.body.append(toolbar);
const style=document.createElement('style');style.textContent='#fixture-tools{position:fixed;right:10px;bottom:10px;z-index:200000;max-width:300px;padding:10px;background:#101710;color:#fff;border:1px solid #e7ff00;font:12px Inter,sans-serif;border-radius:4px}#fixture-tools label{display:block;margin-top:8px}#fixture-tools select{width:100%;margin:4px 0 0}';document.head.append(style);
for(const src of ['../scripts/theme-palettes.js','../scripts/theme-preload.js','../scripts/ui-fit.js','./matchday-fixture.js','../scripts/list-filters.js','../scripts/mantra-filter-ui.js','../scripts/theme.js','../scripts/management.js']){const script=document.createElement('script');script.src=src;document.body.append(script)}
fs.writeFileSync('qa/matchday-preview.html',document.toString());
