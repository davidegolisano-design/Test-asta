// LIVEASTA v1.04.19
// L'offerta mirata (slider) deve restare utilizzabile anche durante il cooldown
// dei rilanci rapidi +1/+2/+5/+10. Il cooldown continua invece a proteggere
// i rilanci normali e viene riaperto normalmente dopo un'offerta mirata valida.
(function(){
  if(window.__liveastaExactBidCooldownExemptionLoaded)return;
  window.__liveastaExactBidCooldownExemptionLoaded=true;

  if(typeof exactBidActivate==='function'){
    const originalExactBidActivate=exactBidActivate;
    exactBidActivate=function(knob){
      const saved=playerNormalBidCooldownUntil;
      playerNormalBidCooldownUntil=0;
      try{
        const result=originalExactBidActivate.call(this,knob);
        if(playerNormalBidCooldownUntil===0)playerNormalBidCooldownUntil=saved;
        return result;
      }catch(error){
        playerNormalBidCooldownUntil=saved;
        throw error;
      }
    };
  }

  if(typeof submitExactBid==='function'){
    const originalSubmitExactBid=submitExactBid;
    submitExactBid=function(target){
      const saved=playerNormalBidCooldownUntil;
      playerNormalBidCooldownUntil=0;
      try{
        const result=originalSubmitExactBid.call(this,target);
        if(playerNormalBidCooldownUntil===0)playerNormalBidCooldownUntil=saved;
        return result;
      }catch(error){
        playerNormalBidCooldownUntil=saved;
        throw error;
      }
    };
  }

  if(typeof handleExactBidReceived==='function'){
    const originalHandleExactBidReceived=handleExactBidReceived;
    handleExactBidReceived=function(...args){
      const saved=normalBidCooldownUntil;
      normalBidCooldownUntil=0;
      try{
        const result=originalHandleExactBidReceived.apply(this,args);
        // Se l'offerta è stata accettata, il codice originale apre un nuovo
        // cooldown: non sovrascriverlo. Se è stata rifiutata, ripristina quello
        // eventualmente già in corso.
        if(normalBidCooldownUntil===0)normalBidCooldownUntil=saved;
        return result;
      }catch(error){
        normalBidCooldownUntil=saved;
        throw error;
      }
    };
  }
})();