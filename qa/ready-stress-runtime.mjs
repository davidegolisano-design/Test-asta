import fs from 'node:fs';
const path='qa/ten-player-stress.mjs';
let text=fs.readFileSync(path,'utf8');
text=text.replace("await ps[0].page.locator('.btn-plus-2').click();","await ps[0].page.locator('.btn-plus-1').click({timeout:3000});");
fs.writeFileSync(path,text);
console.log('READY stress click normalized');
