/* Local button feedback. Delegation covers dynamically created controls, too. */
(function(){
  'use strict';
  if(window.liveastaButtonFeedback)return;
  let context=null,lastSound=-Infinity,lastVibration=-Infinity,lastPointer=null;
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
      if(!context || context.state==='closed')context=new AudioContext();
      const play=()=>{
        if(context.state!=='running')return;
        const oscillator=context.createOscillator(),gain=context.createGain(),at=context.currentTime;
        oscillator.type='triangle';
        oscillator.frequency.setValueAtTime(1100,at);
        oscillator.frequency.exponentialRampToValueAtTime(650,at+.035);
        gain.gain.setValueAtTime(.0001,at);
        gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume*.12),at+.004);
        gain.gain.exponentialRampToValueAtTime(.0001,at+.04);
        oscillator.connect(gain);gain.connect(context.destination);
        oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
        oscillator.start(at);oscillator.stop(at+.045);
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
  document.addEventListener('pointerdown',event=>{
    if(event.isPrimary===false || (event.button!==undefined && event.button!==0))return;
    const node=control(event.target);if(!node)return;
    lastPointer={node,at:Date.now()};feedback();
  },{capture:true,passive:true});
  document.addEventListener('click',event=>{
    const node=control(event.target);if(!node)return;
    if(lastPointer?.node===node && Date.now()-lastPointer.at<800)return;
    feedback();
  },{capture:true,passive:true});
  window.liveastaButtonFeedback={sound,vibrate};
})();
