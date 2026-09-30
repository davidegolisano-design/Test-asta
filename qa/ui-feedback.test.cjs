const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('scripts/ui-feedback.js','utf8');
function fixture(){
  let now=1000;const listeners={},sounds=[],vibrations=[];
  const param={setValueAtTime(){},exponentialRampToValueAtTime(){}};
  class AudioContext{
    state='running';currentTime=0;sampleRate=48000;destination={};
    createBuffer(channels,length){const data=new Float32Array(length);return {getChannelData:()=>data};}
    createBufferSource(){return {connect(){},disconnect(){},start(){sounds.push(now);}};}
    createGain(){return {gain:param,connect(){},disconnect(){}};}
  }
  const c={window:{AudioContext},navigator:{vibrate:p=>vibrations.push(p)},Date:{now:()=>now},Math,Number,
    audioSettings:{uiClickVolume:.25,hapticsEnabled:true},document:{addEventListener:(kind,handler)=>listeners[kind]=handler}};
  vm.createContext(c);vm.runInContext(source,c);
  const node={disabled:false,closest:selector=>selector.startsWith('[inert]')?null:node};
  return {c,node,listeners,sounds,vibrations,advance:n=>now+=n};
}
test('one pointer activation gives one sound and vibration despite subsequent click and bid-specific vibration',()=>{
  const f=fixture();f.listeners.pointerdown({target:f.node,button:0,isPrimary:true});
  f.listeners.click({target:f.node});f.c.window.liveastaButtonFeedback.vibrate(40);
  assert.equal(f.sounds.length,1);assert.equal(f.vibrations.length,1);
});
test('keyboard activation is supported; disabled controls and secondary pointers produce no feedback',()=>{
  const f=fixture();f.node.disabled=true;f.listeners.click({target:f.node});assert.equal(f.sounds.length,0);
  f.node.disabled=false;f.listeners.pointerdown({target:f.node,button:2});f.listeners.pointerdown({target:f.node,isPrimary:false});
  assert.equal(f.vibrations.length,0);f.listeners.click({target:f.node});assert.equal(f.sounds.length,1);
});
test('local sound volume and vibration preference can independently disable feedback',()=>{
  const f=fixture();f.c.audioSettings.uiClickVolume=0;f.listeners.click({target:f.node});
  assert.equal(f.sounds.length,0);assert.equal(f.vibrations.length,1);
  f.advance(1000);f.c.audioSettings.hapticsEnabled=false;f.c.audioSettings.uiClickVolume=.25;
  f.listeners.click({target:f.node});assert.equal(f.sounds.length,1);assert.equal(f.vibrations.length,1);
});
test('unsupported audio and vibration APIs never prevent button activation or throw',()=>{
  const f=fixture();delete f.c.window.AudioContext;delete f.c.navigator.vibrate;
  assert.doesNotThrow(()=>f.listeners.click({target:f.node}));
});
