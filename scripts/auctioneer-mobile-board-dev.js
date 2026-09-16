// DEV MOBILE v1.04.14 — presentation-only adapter for Banditore smartphone.
// Reads authoritative auction DOM/state and renders exactly one clean surface per lower quadrant.
(function(){
  if(window.__liveastaMobileBoardDevLoaded)return;
  window.__liveastaMobileBoardDevLoaded=true;

  const mq=window.matchMedia('(max-width:760px)');
  let scheduled=false;

  function isMobileAuctioneer(){
    return mq.matches &&
      document.getElementById('screen-auctioneer-board')?.classList.contains('auctioneer-ui-mobile') &&
      document.getElementById('auction-dashboard')?.classList.contains('mode-mobile');
  }

  function cleanText(value){
    return String(value??'').replace(/\s+/g,' ').trim();
  }

  function sourceText(id,fallback=''){
    return cleanText(document.getElementById(id)?.textContent)||fallback;
  }

  function meaningfulWinner(value){
    const t=cleanText(value);
    return /^(|--|-|nessuno|nessuna offerta|nessuno offerente|invenduto)$/i.test(t)?'':t;
  }

  function compactFraction(value,fallback='0/0'){
    const raw=cleanText(value||fallback);
    const match=raw.match(/(\d+)\s*\/\s*(\d+)/);
    return match?`${match[1]}/${match[2]}`:raw;
  }

  function readyCount(){
    return compactFraction(sourceText('current-value-display','0/0'),'0/0');
  }

  function deliveredNames(){
    return [...document.querySelectorAll('#sealed-delivery-names .sealed-delivery-row strong')]
      .map(el=>cleanText(el.textContent))
      .filter(Boolean);
  }

  function rankingRows(){
    return [...document.querySelectorAll('#sealed-ranking-auctioneer .sealed-ranking-row')]
      .map((row,index)=>({
        pos:cleanText(row.querySelector('.sealed-ranking-pos')?.textContent)||String(index+1),
        team:cleanText(row.querySelector('.sealed-ranking-team')?.textContent),
        value:cleanText(row.querySelector('.sealed-ranking-value')?.textContent)
      }))
      .filter(row=>row.team);
  }

  function ensureSurface(side){
    const col=document.querySelector(`#screen-auctioneer-board #view-auction .col-${side}`);
    if(!col)return null;
    const id=`liveasta-mobile-${side}-surface`;
    let root=document.getElementById(id);
    if(!root){
      root=document.createElement('div');
      root.id=id;
      root.className='liveasta-mobile-surface';
      root.setAttribute('aria-live','polite');

      const head=document.createElement('div');
      head.className='liveasta-mobile-surface-head';
      const main=document.createElement('div');
      main.className='liveasta-mobile-surface-main';
      const sub=document.createElement('div');
      sub.className='liveasta-mobile-surface-sub';
      const list=document.createElement('div');
      list.className='liveasta-mobile-surface-list';

      root.append(head,main,sub,list);
      col.appendChild(root);
    }
    return {
      root,
      head:root.querySelector('.liveasta-mobile-surface-head'),
      main:root.querySelector('.liveasta-mobile-surface-main'),
      sub:root.querySelector('.liveasta-mobile-surface-sub'),
      list:root.querySelector('.liveasta-mobile-surface-list')
    };
  }

  function setText(el,value){
    const next=cleanText(value);
    if(el.textContent!==next)el.textContent=next;
  }

  function clearList(el){
    if(el.childElementCount)el.replaceChildren();
    el.dataset.signature='';
  }

  function renderList(el,items,{ranking=false}={}){
    const signature=JSON.stringify(items);
    if(el.dataset.signature===signature)return;
    el.dataset.signature=signature;
    el.replaceChildren();

    items.forEach((item,index)=>{
      const row=document.createElement('div');
      row.className='liveasta-mobile-list-row'+(ranking&&index===0?' winner':'');

      const left=document.createElement('span');
      const center=document.createElement('strong');
      const right=document.createElement('span');

      if(ranking){
        left.textContent=item.pos||String(index+1);
        center.textContent=item.team||'';
        right.textContent=item.value||'';
      }else{
        left.textContent='•';
        center.textContent=String(item||'');
        right.textContent='✓';
      }
      row.append(left,center,right);
      el.appendChild(row);
    });
  }

  function setSurface(surface,{active=true,head='',main='',sub='',kind='number',tone='number',list=null,ranking=false}={}){
    if(!surface)return;
    surface.root.classList.toggle('active',!!active);
    surface.root.dataset.mainKind=kind;
    surface.root.dataset.tone=tone;
    setText(surface.head,head);
    setText(surface.main,main);
    setText(surface.sub,sub);
    if(Array.isArray(list)&&list.length)renderList(surface.list,list,{ranking});
    else clearList(surface.list);
  }

  function currentPhase(view){
    /* Specific terminal/sealed states first: legacy classes can coexist briefly. */
    if(view.classList.contains('mobile-unsold'))return 'unsold';
    if(view.classList.contains('mobile-sealed-result'))return 'sealed-result';
    if(view.classList.contains('mobile-sealed-opening'))return 'sealed-opening';
    if(view.classList.contains('mobile-sealed-collecting'))return 'sealed-collecting';
    if(view.classList.contains('mobile-ready'))return 'ready';
    if(view.classList.contains('mobile-preparing'))return 'preparing';
    if(view.classList.contains('mobile-turn'))return 'turn';
    if(view.classList.contains('mobile-normal'))return 'normal';
    return '';
  }

  function countdownTone(phase){
    const timer=document.getElementById('countdown-display');
    if(phase==='normal'){
      if(timer?.classList.contains('liveasta-last3')||timer?.classList.contains('danger'))return 'danger';
      return 'success';
    }
    return 'number';
  }

  function sync(){
    scheduled=false;
    const view=document.getElementById('view-auction');
    const left=ensureSurface('timer');
    const right=ensureSurface('info');
    if(!view||!left||!right)return;

    const phase=isMobileAuctioneer()?currentPhase(view):'';
    const active=!!phase;
    view.classList.toggle('liveasta-mobile-clean-active',active);

    if(!active){
      setSurface(left,{active:false});
      setSurface(right,{active:false});
      return;
    }

    const timer=sourceText('countdown-display','0');
    const value=sourceText('current-value-display','0');
    const winner=meaningfulWinner(sourceText('winner-display'));

    switch(phase){
      case 'ready':
        setSurface(left,{head:'FVM',main:timer,kind:'number',tone:'number'});
        setSurface(right,{head:'READY',main:readyCount(),kind:'count',tone:'number'});
        break;

      case 'preparing':
        setSurface(left,{head:'PREPARAZIONE',main:timer,kind:'number',tone:'number'});
        setSurface(right,{head:'OFFERTA',main:value,kind:'number',tone:'number'});
        break;

      case 'normal':{
        const numeric=parseInt(value.replace(/\D/g,''),10)||0;
        const visibleWinner=numeric>0?winner:'';
        setSurface(left,{head:'TIMER',main:timer,kind:'number',tone:countdownTone(phase)});
        setSurface(right,{head:'OFFERTA',main:value,sub:visibleWinner,kind:'number',tone:'number'});
        break;
      }

      case 'turn':{
        const team=sourceText('auctioneer-turn-team','--');
        setSurface(left,{head:'È IL TURNO DI',main:team,kind:'text',tone:'primary'});
        setSurface(right,{active:false});
        break;
      }

      case 'sealed-collecting':
      case 'sealed-opening':{
        const names=deliveredNames();
        const count=compactFraction(sourceText('sealed-delivery-count','0/0'),'0/0');
        setSurface(left,{
          head:phase==='sealed-opening'?'APERTURA':'TIMER BUSTE',
          main:timer,
          kind:'number',
          tone:'number'
        });
        setSurface(right,{
          head:'CONSEGNATE',
          main:count,
          kind:'count',
          tone:'number',
          list:names
        });
        break;
      }

      case 'sealed-result':{
        const rows=rankingRows();
        const resultWinner=winner || rows[0]?.team || '--';
        const rawValue=parseInt(value.replace(/\D/g,''),10)||0;
        const rankedValue=cleanText(rows[0]?.value);
        const resultValue=(rawValue>0?String(rawValue):rankedValue)||'0';
        const extraRows=rows.filter(row=>cleanText(row.team)!==cleanText(resultWinner)).slice(0,4);
        setSurface(left,{head:'OFFERTA',main:resultValue,kind:'number',tone:'number'});
        setSurface(right,{
          head:'AGGIUDICATO A',
          main:resultWinner,
          kind:'text',
          tone:'primary',
          list:extraRows,
          ranking:true
        });
        break;
      }

      case 'unsold':
        setSurface(left,{head:'OFFERTA',main:'0',kind:'number',tone:'number'});
        setSurface(right,{head:'ESITO',main:'INVENDUTO',kind:'text',tone:'primary'});
        break;

      default:
        setSurface(left,{active:false});
        setSurface(right,{active:false});
        view.classList.remove('liveasta-mobile-clean-active');
    }
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(sync);
  }

  function observeSource(id,{attributes=false}={}){
    const el=document.getElementById(id);
    if(!el)return;
    new MutationObserver(schedule).observe(el,{
      subtree:true,
      childList:true,
      characterData:true,
      attributes,
      attributeFilter:attributes?['class','style']:undefined
    });
  }

  function start(){
    ensureSurface('timer');
    ensureSurface('info');
    observeSource('view-auction',{attributes:true});
    observeSource('countdown-display',{attributes:true});
    observeSource('current-value-display',{attributes:true});
    observeSource('winner-display',{attributes:true});
    observeSource('auctioneer-turn-team');
    observeSource('sealed-delivery-count');
    observeSource('sealed-delivery-names');
    observeSource('sealed-ranking-auctioneer');
    schedule();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  mq.addEventListener?.('change',schedule);
  window.addEventListener('resize',schedule,{passive:true});
  window.refreshLiveAstaMobileBoardDev=schedule;
})();
