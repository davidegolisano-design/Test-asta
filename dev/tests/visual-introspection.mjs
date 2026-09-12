import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.goto('http://127.0.0.1:4173/dev/index.html?visual-introspection=1',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(800);
const result=await page.evaluate(()=>{
  const keys=['list','listone','roster','rose','budget','nomination','turn','control','management','modal','dialog','sealed','ready','auction-complete','complete','admin'];
  const elements=[...document.querySelectorAll('[id]')].map(el=>({
    id:el.id,tag:el.tagName.toLowerCase(),cls:el.className&&typeof el.className==='string'?el.className:'',
    text:(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,180),
    display:getComputedStyle(el).display
  })).filter(x=>keys.some(k=>(x.id+' '+x.cls+' '+x.text).toLowerCase().includes(k)));
  const functions=Object.getOwnPropertyNames(window).filter(k=>typeof window[k]==='function'&&keys.some(q=>k.toLowerCase().includes(q))).sort();
  const dialogs=[...document.querySelectorAll('dialog')].map(el=>({id:el.id,cls:el.className,text:(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,200)}));
  return {elements,functions,dialogs};
});
await browser.close();
await fs.mkdir('dev/visual-audit',{recursive:true});
await fs.writeFile('dev/visual-audit/introspection.json',JSON.stringify(result,null,2));
console.log('VISUAL_INTROSPECTION',result.functions.length,result.elements.length,result.dialogs.length);
