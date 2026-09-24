const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function notificationMail(job, user, recipient) {
  if (recipient.toLowerCase() !== 'postmaster@liveasta.it') throw new Error('Invalid notification recipient');
  if (!['dev-premium','production'].includes(job.environment)) throw new Error('Invalid notification environment');
  const environment = job.environment === 'production' ? 'LIVEASTA pubblico' : 'dev Premium';
  const p = job.payload;
  const created = job.kind === 'room_created';
  const title = created ? 'Nuova stanza LIVEASTA approvata automaticamente' : 'Richiesta Premium LIVEASTA';
  const fields = [['Stanza',p.name],['ID stanza',job.room_id],['Email',p.email]];
  if (created) fields.push(['Password',p.password],['Modalità',String(p.mode).toUpperCase()]);
  fields.push(['Data',p.created_at || p.requested_at]);
  const note = created ? 'La stanza è già attiva. Puoi revocare l’approvazione dal superuser.' : 'La richiesta riguarda tutta la stanza. Puoi abilitare il Premium dal superuser.';
  return {
    from:{name:'LIVEASTA',address:user}, to:recipient,
    subject:`LIVEASTA - ${created ? 'Nuova stanza' : 'Richiesta Premium'}: ${String(p.name).replace(/[\r\n]/g,' ')}`,
    messageId:`<liveasta-${job.environment}-${job.id}@liveasta.it>`,
    text:`${title}\n\n${fields.map(([k,v])=>`${k}: ${v}`).join('\n')}\n\n${note}\n\nAmbiente: ${environment}\nhttps://www.liveasta.it/`,
    html:`<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>${title}</h2><p>${fields.map(([k,v])=>`<b>${k}:</b> ${escapeHtml(v)}`).join('<br>')}</p><p>${note}</p><p>Ambiente: ${environment}</p><a href="https://www.liveasta.it/">LIVEASTA</a></div>`,
    disableFileAccess:true, disableUrlAccess:true
  };
}
export function failureState(error) {
  // A negative SMTP response or failure before DATA is safe to retry. A lost
  // connection after DATA could mean the server accepted mail: do not resend.
  if (Number(error?.responseCode) >= 400 || /^(CONN|AUTH|EHLO|HELO|STARTTLS|MAIL FROM|RCPT TO)$/i.test(String(error?.command || '')))
    return 'failed';
  return 'uncertain';
}
export async function deliverNotification({admin,transport,jobId,token,claim,user,recipient}) {
  const {data:job,error} = await admin.rpc('liveasta_claim_notification',{p_id:jobId,p_token:token,p_claim:claim});
  if (error) throw new Error('Claim unavailable');
  if (!job) return {ok:true,skipped:true};
  let state='sent', code=null;
  try {
    const result = await transport.sendMail(notificationMail(job,user,recipient));
    if (!result.accepted?.some(address=>String(address).toLowerCase()===recipient.toLowerCase())) {
      state='failed'; code='SMTP_REJECTED';
    }
  } catch (error) { state=failureState(error); code=state==='failed'?'SMTP_FAILED':'SMTP_UNCERTAIN'; }
  // If recording the SMTP outcome fails, leave the claim intact. Never retry a
  // potentially delivered message automatically.
  const {data:finished,error:finishError}=await admin.rpc('liveasta_finish_notification',{
    p_id:jobId,p_claim:claim,p_state:state,p_error:code
  });
  if (finishError || finished!==true) throw new Error('Delivery result unavailable');
  return {ok:state==='sent',state};
}
