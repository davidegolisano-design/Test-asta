/* LIVEASTA v0.91 — Gestione mobile: collapse espliciti + toggle sempre leggibili */
(function(){
  'use strict';

  const mq=window.matchMedia('(max-width:899px)');
  const SWITCHES=[
    ['auto-random-enabled','var(--theme-primary,#9B22EA)'],
    ['auto-random-role-P','#F2B800'],
    ['auto-random-role-D','#35B86B'],
    ['auto-random-role-C','#3F82E8'],
    ['auto-random-role-A','#EF454A'],
    ['nomination-auto-bid-one','var(--theme-primary,#9B22EA)']
  ];
  let syncTimer=null;

  function root(){return document.getElementById('screen-room-control');}

  function updateCollapseButton(card,button){
    const collapsed=card.classList.contains('v090-collapsed');
    button.textContent=collapsed?'⌄':'⌃';
    button.setAttribute('aria-label',collapsed?'Espandi sezione':'Comprimi sezione');
    button.setAttribute('title',collapsed?'Espandi':'Comprimi');
    button.setAttribute('aria-expanded',String(!collapsed));
  }

  function toggleCard(card){
    const collapsed=!card.classList.contains('v090-collapsed');
    card.classList.toggle('v090-collapsed',collapsed);
    const header=card.querySelector(':scope > .v090-menu-header');
    if(header){
      header.setAttribute('aria-expanded',String(!collapsed));
      header.setAttribute('title',collapsed?'Apri sezione':'Chiudi sezione');
    }
    const key=card.dataset.v090Menu;
    if(key){
      try{localStorage.setItem('liveasta:v090:management-menu:'+key,collapsed?'1':'0');}catch(_){}
    }
  }

  function installCollapseButtons(container){
    container.querySelectorAll('.v090-menu-card').forEach(card=>{
      const header=card.querySelector(':scope > .v090-menu-header');
      if(!header)return;
      let button=header.querySelector(':scope > .v091-collapse-btn');
      if(!button){
        button=document.createElement('button');
        button.type='button';
        button.className='v091-collapse-btn';
        button.addEventListener('click',event=>{
          event.preventDefault();
          event.stopPropagation();
          toggleCard(card);
          updateCollapseButton(card,button);
        });
        header.appendChild(button);
        new MutationObserver(()=>updateCollapseButton(card,button)).observe(card,{attributes:true,attributeFilter:['class']});
      }
      updateCollapseButton(card,button);
    });
  }

  function resolvedColor(input,color){
    if(!color.startsWith('var('))return color;
    const css=getComputedStyle(document.documentElement);
    return css.getPropertyValue('--theme-primary').trim() || css.getPropertyValue('--accent-blue').trim() || '#9B22EA';
  }

  function paintSwitch(input,color){
    if(!input)return;
    input.classList.add('v091-checkbox-switch');
    const on=!!input.checked;
    const fill=resolvedColor(input,color);
    const off='#A99AAF';
    const desired=on?fill:off;
    if(input.dataset.v091Paint!==String(on)+'|'+desired){
      input.style.setProperty('background',desired,'important');
      input.style.setProperty('background-color',desired,'important');
      input.style.setProperty('border-color',on?fill:'#A99AAF','important');
      input.style.setProperty('opacity','1','important');
      input.dataset.v091Paint=String(on)+'|'+desired;
    }

    if(input.id.startsWith('auto-random-role-')){
      const role=input.id.split('-').pop();
      const label=input.closest('.auto-random-role');
      if(label){
        label.dataset.v091Role=role;
        label.classList.toggle('v091-role-on',on);
      }
    }
    if(input.id==='nomination-auto-bid-one'){
      input.closest('.nomination-auto-bid-one-option')?.classList.toggle('v091-option-on',on);
    }
  }

  function syncCheckboxes(container){
    SWITCHES.forEach(([id,color])=>paintSwitch(container.querySelector('#'+id),color));
  }

  function syncSectionButtons(container){
    /* I toggle-button esistenti usano aria-checked; aggiungiamo un marcatore mobile coerente. */
    container.querySelectorAll('button.mg-switch').forEach(btn=>{
      const on=btn.getAttribute('aria-checked')==='true' || btn.classList.contains('v088-switch-on') || btn.classList.contains('active');
      btn.classList.toggle('v091-setting-on',on);
    });
  }

  function cleanupTeamCount(container){
    const source=container.querySelector('#control-team-count');
    if(source)source.setAttribute('aria-hidden','true');
  }

  function sync(){
    if(!mq.matches)return;
    const container=root();
    if(!container)return;
    installCollapseButtons(container);
    syncCheckboxes(container);
    syncSectionButtons(container);
    cleanupTeamCount(container);
  }

  function start(){
    if(!mq.matches)return;
    sync();
    if(syncTimer)return;
    syncTimer=setInterval(()=>{
      const container=root();
      if(!container || !container.classList.contains('active'))return;
      sync();
    },250);
  }

  function stop(){
    if(syncTimer){clearInterval(syncTimer);syncTimer=null;}
  }

  function onMedia(){
    if(mq.matches)start(); else stop();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  mq.addEventListener?.('change',onMedia);
})();
