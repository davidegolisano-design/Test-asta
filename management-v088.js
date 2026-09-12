/* LIVEASTA v0.88 — gestione: stato compresso e toggle coerenti */
(function(){
  'use strict';

  function syncPurchasesCard(root){
    const card=root.querySelector('.purchases-card');
    const content=root.querySelector('#control-purchases-content');
    if(!card||!content)return;
    const apply=()=>card.classList.toggle('v088-purchases-collapsed',content.classList.contains('collapsed'));
    apply();
    new MutationObserver(apply).observe(content,{attributes:true,attributeFilter:['class']});
  }

  function syncSwitchVisuals(root){
    const apply=()=>{
      root.querySelectorAll('.mg-switch,[role="switch"]').forEach(el=>{
        const on=el.getAttribute('aria-checked')==='true' || el.getAttribute('aria-pressed')==='true' || el.classList.contains('active') || el.classList.contains('on');
        el.classList.toggle('v088-switch-on',on);
      });
    };
    apply();
    new MutationObserver(apply).observe(root,{subtree:true,attributes:true,attributeFilter:['aria-checked','aria-pressed','class','checked']});
    root.addEventListener('change',apply,true);
    root.addEventListener('click',()=>setTimeout(apply,0),true);
  }

  function normalizeCollapsedCards(root){
    root.querySelectorAll('.control-card[data-v087-collapsible="1"]').forEach(card=>{
      const button=card.querySelector(':scope > .control-title > .v087-collapse-btn, :scope > .v087-card-title > .v087-collapse-btn');
      if(!button)return;
      const apply=()=>button.setAttribute('title',card.classList.contains('v087-collapsed')?'Espandi sezione':'Riduci sezione');
      apply();
      new MutationObserver(apply).observe(card,{attributes:true,attributeFilter:['class']});
    });
  }

  function init(){
    const root=document.getElementById('screen-room-control');
    if(!root)return;
    syncPurchasesCard(root);
    syncSwitchVisuals(root);
    normalizeCollapsedCards(root);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
