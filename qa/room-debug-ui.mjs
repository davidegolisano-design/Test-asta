// Local integration check. All Supabase calls are mocked; never touches live rooms.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '.']}));
const browser=await chromium.launch({headless:true});
try {
    for (const width of [390,1440]) {
        const page=await browser.newPage({viewport:{width,height:900},acceptDownloads:true});
        const errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8765/')?route.continue():route.abort());
        await page.addInitScript(()=>{
            const room={id:'00000000-0000-4000-8000-00000000de01',name:'SGDP debug',password:'test',approved:true,game_mode:'classic',initial_credits:500};
            window.supabase={createClient:()=>({
                from(table){
                    const result={data:table==='fanta_rooms'?[room]:[],error:null};
                    const builder=new Proxy({}, {get:(target,key)=>key==='then'?((a,b)=>Promise.resolve(result).then(a,b)):(()=>builder)});
                    return builder;
                },
                rpc(name){
                    const data=name==='liveasta_debug_export'?{events:[{id:'1',event:'ready.accepted',details:{choice:'ready'}}],through:'1',has_more:false}:true;
                    const promise=Promise.resolve({data,error:null});promise.abortSignal=()=>promise;return promise;
                }
            })};
        });
        await page.goto('http://127.0.0.1:8765/',{waitUntil:'load'});
        await page.evaluate(async()=>{
            openAdminLogin();document.getElementById('admin-pin').value='test';await adminLogin();
        });
        const button=page.getByRole('button',{name:'Scarica log',exact:true});
        await button.waitFor({state:'visible'});
        await button.scrollIntoViewIfNeeded();
        const bounds=await button.boundingBox();assert(bounds.x>=0 && bounds.x+bounds.width<=width+1);
        const downloadPromise=page.waitForEvent('download');await button.click();const download=await downloadPromise;
        const path=await download.path();const data=JSON.parse(readFileSync(path,'utf8'));
        assert.equal(data.event_count,1);assert.equal(data.room.name,'SGDP debug');
        assert(!readFileSync(path,'utf8').includes('"password"'));
        assert.equal(errors.length,0,errors.join('\n'));
        await page.screenshot({path:`/tmp/liveasta-debug-admin-${width}.png`,fullPage:true});
        console.log(`PASS ${width}px: superuser login, room log button, JSON download, no JS errors`);
        await page.close();
    }
} finally {await browser.close();}
