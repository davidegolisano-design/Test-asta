/* Local button feedback. Delegation covers dynamically created controls, too. */
(function(){
  'use strict';
  if(window.liveastaButtonFeedback)return;
  let context=null,tapBuffer=null,lastSound=-Infinity,lastVibration=-Infinity;
  const settings=()=>typeof audioSettings==='object'?audioSettings:{uiClickVolume:.25,hapticsEnabled:true};
  function vibrate(pattern=12){
    if(settings().hapticsEnabled===false || typeof navigator.vibrate!=='function')return;
    const now=Date.now();if(now-lastVibration<80)return;
    lastVibration=now;
    try{navigator.vibrate(pattern);}catch(_){}
  }
  function sound(){
    const volume=Math.max(0,Math.min(1,Number(settings().uiClickVolume)||0));
    if(!volume)return;
    const now=Date.now();if(now-lastSound<60)return;
    lastSound=now;
    try{
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      if(!AudioContext)return;
      if(!context || context.state==='closed'){context=new AudioContext();tapBuffer=null;}
      const play=()=>{
        if(context.state!=='running')return;
        // A damped wooden impact: short noise attack and fixed resonances, no pitch sweep.
        if(!tapBuffer){
          tapBuffer=context.createBuffer(1,Math.ceil(context.sampleRate*.05),context.sampleRate);
          const samples=tapBuffer.getChannelData(0);
          for(let i=0;i<samples.length;i++){
            const t=i/context.sampleRate;
            const attack=Math.min(1,t/.0005);
            const body=.65*Math.sin(2*Math.PI*820*t)*Math.exp(-t/ .008)
              +.25*Math.sin(2*Math.PI*1640*t)*Math.exp(-t/ .004);
            const knock=(Math.random()*2-1)*.3*Math.exp(-t/ .002);
            const fade=Math.min(1,(samples.length-1-i)/(context.sampleRate*.003));
            samples[i]=(body+knock)*attack*fade;
          }
        }
        const source=context.createBufferSource(),gain=context.createGain();
        source.buffer=tapBuffer;gain.gain.setValueAtTime(volume*.4,context.currentTime);
        source.connect(gain);gain.connect(context.destination);
        source.onended=()=>{source.disconnect();gain.disconnect();};
        source.start();
      };
      if(context.state==='suspended')context.resume().then(play).catch(()=>{});
      else play();
    }catch(_){}
  }
  function control(target){
    if(!target?.closest)return null;
    let node=target.closest('button,[role="button"],[role="tab"],[role="switch"],input[type="checkbox"],input[type="radio"],a[href]');
    if(!node){const label=target.closest('label');node=label?.control||label?.querySelector('input[type="checkbox"],input[type="radio"]');}
    if(!node || node.disabled || node.closest('[inert],[aria-disabled="true"]'))return null;
    return node;
  }
  function feedback(){sound();vibrate();}
  // The browser emits click after an actual activation, not after a scroll gesture.
  // Capture also covers controls whose handlers stop propagation or replace the DOM.
  document.addEventListener('click',event=>{
    if(event.isTrusted===false)return;
    const node=control(event.target);if(!node)return;
    feedback();
  },{capture:true,passive:true});
  window.liveastaButtonFeedback={sound,vibrate};
})();
