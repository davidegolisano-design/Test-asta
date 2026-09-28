/* Room creation waits here; no room exists until the server verifies the code. */
(function(){
 'use strict';
 const messages={invalid:'Controlla email e dati della stanza.',cooldown:'Attendi almeno 60 secondi prima di richiedere un altro codice.',rate_limit:'Troppi invii. Riprova tra un’ora.',room_exists:'Esiste già una stanza con questo nome. Torna indietro e cambialo.',invalid_code:'Codice errato. Controlla le sei cifre ricevute.',attempts:'Hai esaurito i 5 tentativi. Richiedi un nuovo codice.',expired:'Codice scaduto. Richiedi un nuovo codice.',mail_failed:'Invio non confermato. Controlla l’indirizzo e riprova tra 60 secondi.',unavailable:'Servizio non disponibile. Riprova tra poco.'};
 let active=false;
 window.verifyRoomCreation=function(payload){
  if(active)return Promise.reject(Error('La verifica email è già aperta.'));
  active=true;
  return new Promise((resolve,reject)=>{
   const dialog=document.createElement('dialog');dialog.className='room-onboarding';dialog.setAttribute('aria-labelledby','email-verify-title');
   dialog.innerHTML='<form class="onboarding-card"><div class="onboarding-content"><p class="onboarding-step">CONFERMA EMAIL</p><h2 id="email-verify-title" tabindex="-1">Inserisci il codice</h2><p>Invieremo un codice di 6 cifre a <strong id="email-verify-address"></strong>. La stanza verrà creata solo dopo la conferma.</p><label for="email-verify-code">Codice a 6 cifre</label><input id="email-verify-code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required><p class="onboarding-note" id="email-verify-status" role="status"></p><p class="onboarding-error" role="alert"></p><button type="button" class="btn btn-secondary" data-email-action="resend">Invia di nuovo</button></div><footer class="onboarding-actions"><button type="button" class="btn btn-secondary" data-email-action="cancel">Modifica dati</button><button type="submit" class="btn" data-email-action="confirm">Conferma e crea</button></footer></form>';
   document.body.append(dialog);
   const $=selector=>dialog.querySelector(selector),code=$('#email-verify-code'),status=$('#email-verify-status'),error=$('[role="alert"]');
   $('#email-verify-address').textContent=payload.p_email;
   let busy=false,challenge=null,nextSend=0,expires=0,settled=false;
   function controls(){
    $('[data-email-action="resend"]').disabled=busy||Date.now()<nextSend;
    const wait=Math.max(0,Math.ceil((nextSend-Date.now())/1000));
    $('[data-email-action="resend"]').textContent=wait?'Reinvia tra '+wait+' s':'Invia di nuovo';
    $('[data-email-action="confirm"]').disabled=busy||!challenge||!/^\d{6}$/.test(code.value);
    $('[data-email-action="cancel"]').disabled=busy;code.disabled=busy;
   }
   function finish(room){settled=true;dialog.close();resolve(room);}
   function cancel(){if(busy)return;dialog.close();}
   async function request(body){
    const {data,error:failure}=await supabaseClient.functions.invoke('liveasta-room-verification',{body});
    if(failure||!data)throw Error(messages.unavailable);
    if(data.error)throw Error(messages[data.error]||messages.unavailable);
    return data;
   }
   async function send(){
    if(busy||Date.now()<nextSend)return;
    busy=true;challenge=null;nextSend=Date.now()+60000;error.textContent='';status.textContent='Invio del codice…';controls();
    try{
     const result=await request({action:'send',payload});
     if(!result.challenge_id)throw Error(messages.unavailable);
     challenge=result.challenge_id;expires=Date.now()+result.expires_in*1000;
     nextSend=Date.now()+result.retry_after*1000;
     code.value='';status.textContent='Codice inviato. Valido per 10 minuti. Controlla anche la cartella Spam.';
    }catch(e){status.textContent='La stanza non è stata creata.';error.textContent=e.message;}
    finally{busy=false;controls();}
   }
   dialog.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!challenge||!/^\d{6}$/.test(code.value))return;
    busy=true;error.textContent='';status.textContent='Verifica e creazione della stanza…';controls();
    try{
     const result=await request({action:'confirm',challenge_id:challenge,code:code.value});
     if(!result.room?.id)throw Error(messages.unavailable);
     finish(result.room);
    }catch(e){status.textContent='Verifica non completata.';error.textContent=e.message;}
    finally{busy=false;controls();}
   });
   code.addEventListener('input',()=>{code.value=code.value.replace(/\D/g,'').slice(0,6);controls();});
   $('[data-email-action="cancel"]').addEventListener('click',cancel);
   $('[data-email-action="resend"]').addEventListener('click',send);
   dialog.addEventListener('cancel',event=>{event.preventDefault();cancel();});
   const timer=setInterval(()=>{controls();if(challenge&&!busy&&expires<Date.now())status.textContent='Il codice è scaduto. Richiedine uno nuovo.';},1000);
   dialog.addEventListener('close',()=>{clearInterval(timer);dialog.remove();active=false;if(!settled)reject(Error('Verifica interrotta. Completa la conferma email per creare la stanza.'));},{once:true});
   dialog.showModal();$('#email-verify-title').focus({preventScroll:true});send();
  });
 };
})();
