// DEV MOBILE v1.04.13 — presentation-only bridge for sealed auction states.
// Reads existing authoritative DOM values and mirrors them into a mobile-only shell.
(function(){
  if(window.__liveastaMobileSealedDevLoaded)return;
  window.__liveastaMobileSealedDevLoaded=true;

  const mq=window.matchMedia('(max-width:760px)');
  let scheduled=false;

  function isMobileAuctioneer(){
    return mq.matches &&
      document.getElementById('screen-auctioneer-board')?.classList.contains('auctioneer-ui-mobile') &&
      document.getElementById('auction-dashboard')?.classList.contains('mode-mobile');
  }

  function ensureShell(){
    const bidBox=document.querySelector('#screen-auctioneer-board #view-auction .col-info .bid-box');
    if(!bidBox)return null;

    const make=(id,cls)=>{
      let el=document.getElementById(id);
      if(!el){
        el=document.createElement('div');
        el.id=id;
        el.className=cls;
        bidBox.appendChild(el);
      }
      return el;
    };

    return {
      count:make('mobile-sealed-count-copy','mobile-sealed-count-copy'),
      names:make('mobile-sealed-names-copy','mobile-sealed-names-copy'),
      winner:make('mobile-sealed-winner-copy','mobile-sealed-winner-copy'),
      ranking:make('mobile-sealed-ranking-copy','mobile-sealed-ranking-copy')
    };
  }

  function deliveredNames(){
    return [...document.querySelectorAll('#sealed-delivery-names .sealed-delivery-row strong')]
      .map(el=>String(el.textContent||'').trim())
      .filter(Boolean);
  }

  function rankingRows(){
    return [...document.querySelectorAll('#sealed-ranking-auctioneer .sealed-ranking-row')]
      .map(row=>({
        pos:String(row.querySelector('.sealed-ranking-pos')?.textContent||'').trim(),
        team:String(row.querySelector('.sealed-ranking-team')?.textContent||'').trim(),
        value:String(row.querySelector('.sealed-ranking-value')?.textContent||'').trim()
      }))
      .filter(row=>row.team);
  }

  function fillNames(container,names){
    container.replaceChildren();
    if(!names.length){
      const empty=document.createElement('div');
      empty.className='mobile-sealed-empty';
      empty.textContent='IN ATTESA';
      container.appendChild(empty);
      return;
    }
    names.forEach(name=>{
      const row=document.createElement('div');
      row.className='mobile-sealed-name-row';
      const dot=document.createElement('span');
      dot.className='mobile-sealed-name-dot';
      const text=document.createElement('strong');
      text.textContent=name;
      const check=document.createElement('span');
      check.textContent='✓';
      row.append(dot,text,check);
      container.appendChild(row);
    });
  }

  function fillRanking(container,rows){
    container.replaceChildren();
    if(!rows.length)return;
    rows.forEach((item,index)=>{
      const row=document.createElement('div');
      row.className='mobile-sealed-ranking-row'+(index===0?' winner':'');
      const pos=document.createElement('span');
      pos.textContent=item.pos||String(index+1);
      const team=document.createElement('strong');
      team.textContent=item.team;
      const value=document.createElement('span');
      value.textContent=item.value;
      row.append(pos,team,value);
      container.appendChild(row);
    });
  }

  function sync(){
    scheduled=false;
    const view=document.getElementById('view-auction');
    const right=document.getElementById('mobile-right-label');
    const shell=ensureShell();
    if(!view||!right||!shell)return;

    const collecting=view.classList.contains('mobile-sealed-collecting');
    const opening=view.classList.contains('mobile-sealed-opening');
    const result=view.classList.contains('mobile-sealed-result');
    const unsold=view.classList.contains('mobile-unsold') && view.classList.contains('sealed-collecting');

    view.classList.toggle('mobile-sealed-dev-active',isMobileAuctioneer() && (collecting||opening||result||unsold));
    view.classList.toggle('mobile-sealed-dev-collecting',isMobileAuctioneer() && collecting);
    view.classList.toggle('mobile-sealed-dev-opening',isMobileAuctioneer() && opening);
    view.classList.toggle('mobile-sealed-dev-result',isMobileAuctioneer() && result);
    view.classList.toggle('mobile-sealed-dev-unsold',isMobileAuctioneer() && unsold);

    if(!isMobileAuctioneer() || !(collecting||opening||result||unsold))return;

    if(collecting||opening){
      right.textContent='CONSEGNATE';
      shell.count.textContent=String(document.getElementById('sealed-delivery-count')?.textContent||'0 / 0').trim()||'0 / 0';
      fillNames(shell.names,deliveredNames());
      shell.winner.textContent='';
      shell.ranking.replaceChildren();
      return;
    }

    const winner=String(document.getElementById('winner-display')?.textContent||'').trim();
    const normalizedWinner=/^(|--|nessuno|invenduto)$/i.test(winner)?'':winner;

    if(result){
      right.textContent='AGGIUDICATO A';
      shell.winner.textContent=normalizedWinner||'--';
      shell.count.textContent='';
      shell.names.replaceChildren();
      fillRanking(shell.ranking,rankingRows());
      return;
    }

    if(unsold){
      right.textContent='ESITO';
      shell.winner.textContent='INVENDUTO';
      shell.count.textContent='';
      shell.names.replaceChildren();
      shell.ranking.replaceChildren();
    }
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(sync);
  }

  function start(){
    ensureShell();
    const ids=['view-auction','sealed-delivery-count','sealed-delivery-names','sealed-ranking-auctioneer','winner-display','current-value-display'];
    ids.forEach(id=>{
      const el=document.getElementById(id);
      if(!el)return;
      new MutationObserver(schedule).observe(el,{
        subtree:true,
        childList:true,
        characterData:true,
        attributes:id==='view-auction',
        attributeFilter:id==='view-auction'?['class']:undefined
      });
    });
    schedule();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  mq.addEventListener?.('change',schedule);
  window.addEventListener('resize',schedule);
})();
