// DEV MOBILE v1.04.14 — single canonical renderer for the two lower auctioneer quadrants.
// Presentation only: authoritative auction state continues to be produced by app.js/sealed-auction.js.
(function(){
  if(window.__liveastaMobileCanonicalLoaded)return;
  window.__liveastaMobileCanonicalLoaded=true;

  const mq=window.matchMedia('(max-width:760px)');
  let scheduled=false;
  let sourceObservers=[];

  const text=id=>String(document.getElementById(id)?.textContent||'').trim();
  const cleanWinner=value=>{
    const v=String(value||'').trim();
    return /^(|--|-|nessuno|nessuna offerta|nessuno offerente)$/i.test(v)?'':v;
  };

  function isMobileAuctioneer(){
    return mq.matches &&
      document.getElementById('screen-auctioneer-board')?.classList.contains('auctioneer-ui-mobile') &&
      document.getElementById('auction-dashboard')?.classList.contains('mode-mobile');
  }

  function buildShell(id){
    const root=document.createElement('section');
    root.id=id;
    root.className='liveasta-mobile-canonical';
    root.setAttribute('aria-live','polite');
    const label=document.createElement('div'); label.className='liveasta-mobile-canonical-label';
    const value=document.createElement('div'); value.className='liveasta-mobile-canonical-value';
    const sub=document.createElement('div'); sub.className='liveasta-mobile-canonical-sub';
    const list=document.createElement('div'); list.className='liveasta-mobile-canonical-list';
    root.append(label,value,sub,list);
    return {root,label,value,sub,list};
  }

  function shellFromRoot(root){
    return {
      root,
      label:root.querySelector('.liveasta-mobile-canonical-label'),
      value:root.querySelector('.liveasta-mobile-canonical-value'),
      sub:root.querySelector('.liveasta-mobile-canonical-sub'),
      list:root.querySelector('.liveasta-mobile-canonical-list')
    };
  }

  function ensureShells(){
    const leftHost=document.querySelector('#screen-auctioneer-board #view-auction .col-timer');
    const rightHost=document.querySelector('#screen-auctioneer-board #view-auction .col-info');
    if(!leftHost||!rightHost)return null;
    let leftRoot=document.getElementById('liveasta-mobile-left-canonical');
    let rightRoot=document.getElementById('liveasta-mobile-right-canonical');
    if(!leftRoot){const built=buildShell('liveasta-mobile-left-canonical');leftHost.appendChild(built.root);leftRoot=built.root;}
    if(!rightRoot){const built=buildShell('liveasta-mobile-right-canonical');rightHost.appendChild(built.root);rightRoot=built.root;}
    return {left:shellFromRoot(leftRoot),right:shellFromRoot(rightRoot)};
  }

  function setText(el,value){
    const next=String(value??'');
    if(el.textContent!==next)el.textContent=next;
  }
  function clearList(el){if(el.childNodes.length)el.replaceChildren();}
  function setDigits(shell,value){
    const digits=String(value||'').replace(/\D/g,'').length;
    shell.root.dataset.digits=String(Math.max(1,digits));
  }
  function resetShell(shell){
    shell.root.dataset.state='empty';shell.root.dataset.digits='1';
    setText(shell.label,'');setText(shell.value,'');setText(shell.sub,'');clearList(shell.list);
  }
  function renderSimple(shell,{state,label='',value='',sub=''}){
    shell.root.dataset.state=state;
    setText(shell.label,label);setText(shell.value,value);setText(shell.sub,sub);setDigits(shell,value);clearList(shell.list);
  }

  function deliveryRows(){
    return [...document.querySelectorAll('#sealed-delivery-names .sealed-delivery-row strong')]
      .map(el=>String(el.textContent||'').trim()).filter(Boolean);
  }
  function rankingRows(){
    return [...document.querySelectorAll('#sealed-ranking-auctioneer .sealed-ranking-row')]
      .map((row,index)=>({
        pos:String(row.querySelector('.sealed-ranking-pos')?.textContent||index+1).trim(),
        team:String(row.querySelector('.sealed-ranking-team')?.textContent||'').trim(),
        value:String(row.querySelector('.sealed-ranking-value')?.textContent||'').trim()
      })).filter(row=>row.team);
  }

  function renderDelivery(shell){
    shell.root.dataset.state='delivery';shell.root.dataset.digits='1';
    setText(shell.label,'CONSEGNATE');setText(shell.value,text('sealed-delivery-count')||'0 / 0');setText(shell.sub,'');
    const names=deliveryRows();shell.list.replaceChildren();
    if(!names.length){const empty=document.createElement('div');empty.className='liveasta-mobile-canonical-empty';empty.textContent='IN ATTESA';shell.list.appendChild(empty);return;}
    names.forEach(name=>{
      const row=document.createElement('div');row.className='liveasta-mobile-canonical-row';
      const dot=document.createElement('span');dot.className='liveasta-mobile-canonical-dot';
      const strong=document.createElement('strong');strong.textContent=name;
      const ok=document.createElement('span');ok.textContent='✓';
      row.append(dot,strong,ok);shell.list.appendChild(row);
    });
  }

  function renderResult(shell,winner){
    shell.root.dataset.state='result';shell.root.dataset.digits='1';
    setText(shell.label,winner?'AGGIUDICATO A':'ESITO');setText(shell.value,winner||'INVENDUTO');setText(shell.sub,'');
    shell.list.replaceChildren();
    if(!winner)return;
    rankingRows().forEach((item,index)=>{
      const row=document.createElement('div');row.className='liveasta-mobile-canonical-rank'+(index===0?' winner':'');
      const pos=document.createElement('span');pos.textContent=item.pos||String(index+1);
      const team=document.createElement('strong');team.textContent=item.team;
      const value=document.createElement('span');value.textContent=item.value;
      row.append(pos,team,value);shell.list.appendChild(row);
    });
  }

  function turnTeamText(){
    const direct=text('auctioneer-turn-team');if(direct)return direct;
    const center=document.getElementById('auctioneer-turn-center');if(!center)return '';
    const clone=center.cloneNode(true);clone.querySelectorAll('.auctioneer-turn-kicker,.auctioneer-turn-role').forEach(el=>el.remove());
    return String(clone.textContent||'').replace(/È IL TURNO DI/gi,'').trim();
  }

  function sync(){
    scheduled=false;
    const view=document.getElementById('view-auction');
    const shells=ensureShells();
    if(!view||!shells)return;
    const {left,right}=shells;
    const active=isMobileAuctioneer();
    view.classList.toggle('liveasta-mobile-canonical-active',active);
    if(!active){resetShell(left);resetShell(right);return;}

    const ready=view.classList.contains('mobile-ready');
    const preparing=view.classList.contains('mobile-preparing');
    const turn=view.classList.contains('mobile-turn');
    const normal=view.classList.contains('mobile-normal');
    const collecting=view.classList.contains('mobile-sealed-collecting');
    const opening=view.classList.contains('mobile-sealed-opening');
    const sealedResult=view.classList.contains('mobile-sealed-result');
    const unsold=view.classList.contains('mobile-unsold');

    if(ready){
      renderSimple(left,{state:'fvm',label:'FVM',value:text('countdown-display')||'0'});
      renderSimple(right,{state:'ready',label:'READY',value:text('current-value-display')||'0 / 0'});
      return;
    }
    if(turn){
      renderSimple(left,{state:'turn',label:'È IL TURNO DI',value:turnTeamText()||'--'});resetShell(right);return;
    }
    if(collecting||opening){
      renderSimple(left,{state:opening?'opening':'sealed-timer',label:opening?'APERTURA':'TIMER BUSTE',value:text('countdown-display')||'0'});
      renderDelivery(right);return;
    }
    if(sealedResult){
      const price=text('current-value-display')||text('countdown-display')||'0';
      const winner=cleanWinner(text('winner-display'));
      renderSimple(left,{state:'sealed-price',label:'OFFERTA',value:price});renderResult(right,winner);return;
    }
    if(unsold){
      renderSimple(left,{state:'unsold-price',label:'OFFERTA',value:'0'});renderResult(right,'');return;
    }
    if(preparing){
      renderSimple(left,{state:'preparing',label:'PREPARAZIONE',value:text('countdown-display')||'0'});
      renderSimple(right,{state:'offer',label:'OFFERTA',value:text('current-value-display')||'0'});return;
    }
    if(normal){
      const offer=text('current-value-display')||'0';
      const numeric=parseInt(offer.replace(/\D/g,''),10)||0;
      const winner=numeric>0?cleanWinner(text('winner-display')):'';
      renderSimple(left,{state:'timer',label:'TIMER',value:text('countdown-display')||'0'});
      renderSimple(right,{state:'offer',label:'OFFERTA',value:offer,sub:winner});return;
    }
    resetShell(left);resetShell(right);
  }

  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(sync);}
  function observeSources(){
    sourceObservers.forEach(obs=>obs.disconnect());sourceObservers=[];
    ['view-auction','countdown-display','current-value-display','winner-display','auctioneer-turn-center','auctioneer-turn-team','sealed-delivery-count','sealed-delivery-names','sealed-ranking-auctioneer'].forEach(id=>{
      const el=document.getElementById(id);if(!el)return;
      const obs=new MutationObserver(schedule);
      obs.observe(el,{subtree:true,childList:true,characterData:true,attributes:id==='view-auction',attributeFilter:id==='view-auction'?['class']:undefined});
      sourceObservers.push(obs);
    });
  }
  function start(){ensureShells();observeSources();schedule();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  mq.addEventListener?.('change',schedule);window.addEventListener('resize',schedule);
})();
