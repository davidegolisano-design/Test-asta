// Read-only projection of the public room snapshot. Never starts or ends an auction.
window.liveastaSpectatorView=(()=>{
  let snapshot=null;
  let clock=null;
  const el=id=>document.getElementById(id);
  const write=(id,value)=>{const target=el(id);if(target)target.textContent=String(value);};
  function tick(){
    if(!snapshot)return;
    const phase=snapshot.phase;
    const timed=['ready','prep','active','sealed','sealed_reveal'].includes(phase);
    const deadline=Number(snapshot.deadline_at||snapshot.sealed_deadline_at)||0;
    const remaining=deadline?Math.max(0,Math.ceil((deadline-Date.now())/1000)):Math.max(0,Number(snapshot.seconds)||0);
    write('countdown-display',timed?remaining:'--');
    const display=el('countdown-display');
    if(display){
      const lastThree=timed&&remaining>0&&remaining<=3;
      display.classList.toggle('liveasta-last3',lastThree);
      display.classList.toggle('danger',lastThree);
    }
  }
  function render(state){
    snapshot=state||null;
    const phase=state?.phase||'idle';
    const player=state?.player;
    const board=el('screen-auctioneer-board');
    const view=el('view-auction');
    if(board)board.dataset.spectatorPhase=phase;
    if(view){
      view.classList.remove('auction-view-hidden','nomination-turn-desktop','sealed-collecting','sealed-opening');
      [...view.classList].filter(name=>name.startsWith('mobile-')).forEach(name=>view.classList.remove(name));
      view.style.display='flex';
    }
    if(el('view-list'))el('view-list').style.display='none';
    const image=el('card-image');
    if(player){
      write('auction-player-name-top',player.nome||'--');
      write('auction-player-role',player.role||'-');
      write('auction-player-club',player.club||'-');
      if(image){
        if(typeof setPlayerImage==='function')setPlayerImage(image,player.id,player.role);
        image.style.visibility='visible';
      }
    }else{
      write('auction-player-name-top','ASTA LIVE');
      write('auction-player-role','-');
      write('auction-player-club','IN ATTESA');
      if(image)image.style.visibility='hidden';
    }
    const ready=(state?.ready_ids||[]).length;
    const required=(state?.ready_required_ids||[]).length;
    const delivered=(state?.sealed_submitted_ids||[]).length;
    const eligible=(state?.sealed_eligible_ids||[]).length;
    let heading='IN ATTESA';
    let winner='Il banditore avvierà l’asta';
    let value='--';
    if(phase==='ready'){heading='READY';winner='In attesa dei giocatori';value=`${ready} / ${required}`;}
    if(phase==='prep'){heading='PREPARAZIONE';winner='STA PER INIZIARE';value='0';}
    if(phase==='active'){heading='MIGLIOR OFFERENTE';winner=state.winner||'NESSUNO';value=state.value||0;}
    if(phase==='sealed'){heading='BUSTE CONSEGNATE';winner='Importi nascosti fino all’apertura';value=`${delivered} / ${eligible}`;}
    if(phase==='sealed_reveal'){heading='APERTURA BUSTE';winner='ATTENDI';value='?';}
    if(phase==='ended'){heading=state.winner?'AGGIUDICATO A':'ESITO ASTA';winner=state.winner||'INVENDUTO';value=state.value||0;}
    write('auction-title-display',heading);
    write('winner-display',winner);
    write('mobile-winner-display',winner);
    write('current-value-display',value);
    const ranking=phase==='ended'?(state.mode==='sealed_result'?state.sealed_ranking:state.normal_bid_ranking):null;
    if(Array.isArray(ranking)&&ranking.length&&typeof renderAuctioneerBidRanking==='function'){
      renderAuctioneerBidRanking(ranking,'CLASSIFICA OFFERTE');
    }else if(typeof clearSealedBidRanking==='function')clearSealedBidRanking();
    const caption=document.querySelector('#view-auction .timer-caption');
    if(caption)caption.textContent=phase==='idle'?'IN ATTESA':'TEMPO RESIDUO';
    tick();
    clearInterval(clock);
    if(['ready','prep','active','sealed','sealed_reveal'].includes(phase))clock=setInterval(tick,250);
  }
  function stop(){clearInterval(clock);clock=null;snapshot=null;el('countdown-display')?.classList.remove('liveasta-last3','danger');delete el('screen-auctioneer-board')?.dataset.spectatorPhase;}
  return{render,stop};
})();
