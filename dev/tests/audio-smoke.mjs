import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));

try{
  await page.goto('http://127.0.0.1:4173/dev/index.html?audio-smoke=1',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1200);
  for(const name of ['openAudioMixer','closeAudioMixer','loadAudioSettings','saveAudioSettings','playSound','speakBidValue','playAuctionFinalCountdown']){
    const ok=await page.evaluate(n=>typeof window[n]==='function',name);
    if(!ok) throw new Error(name+' missing');
  }
  await page.evaluate(()=>openAudioMixer());
  const modal=page.locator('#audio-mixer-modal');
  if(!(await modal.evaluate(el=>el.classList.contains('open')))) throw new Error('Audio mixer did not open');
  const prep=await page.locator('#vol-audio-prep').inputValue();
  const voice=await page.locator('#vol-bid-voice').inputValue();
  if(prep!=='70' || voice!=='100') throw new Error(`Unexpected defaults prep=${prep} voice=${voice}`);
  await page.evaluate(()=>closeAudioMixer());
  if(await modal.evaluate(el=>el.classList.contains('open'))) throw new Error('Audio mixer did not close');
  if(errors.length) throw new Error('Page errors: '+errors.join(' | '));
  console.log('LIVEASTA audio browser smoke: OK');
} finally {
  await browser.close();
}
