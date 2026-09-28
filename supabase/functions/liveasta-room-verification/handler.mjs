export async function digest(value){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export function generateCode(){
 const buffer=new Uint32Array(1);do{crypto.getRandomValues(buffer);}while(buffer[0]>=4294000000);
 return String(buffer[0]%1000000).padStart(6,'0');
}
export async function handleVerification({body,admin,transport,user,ipHash}){
 if(body.action==='send'){
  const p=body.payload;
  if(!p||!['dev-premium','production'].includes(p.p_environment)||typeof p.p_email!=='string'||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.p_email)||p.p_email.length>254)return {error:'invalid'};
  const id=crypto.randomUUID(),code=generateCode();
  const {data,error}=await admin.rpc('liveasta_email_challenge_start',{p_id:id,p_hash:await digest(id+':'+code),p_ip_hash:ipHash,p_payload:p});
  if(error)return {error:'unavailable'};
  if(data?.error)return data;
  if(!data?.challenge_id)return {error:'unavailable'};
  try{
   const email=p.p_email.trim().toLowerCase();
   const result=await transport.sendMail({from:{name:'LIVEASTA',address:user},to:email,
    subject:'LIVEASTA · conferma la tua email',
    text:`Il tuo codice LIVEASTA è: ${code}\n\nInseriscilo nell’app per confermare l’indirizzo email e creare la stanza.\nIl codice scade tra 10 minuti. Non condividerlo.\nLa stanza non è ancora stata creata.\n\nSe non hai richiesto il codice, ignora questa email.\nhttps://www.liveasta.it/`,
    disableFileAccess:true,disableUrlAccess:true});
   if(!result.accepted?.some(address=>String(address).toLowerCase()===email))return {error:'mail_failed'};
   return data;
  }catch(_){return {error:'mail_failed'};}
 }
 if(body.action==='confirm'){
  if(!/^[0-9a-f-]{36}$/i.test(body.challenge_id||'')||!/^\d{6}$/.test(body.code||''))return {error:'invalid_code'};
  const {data,error}=await admin.rpc('liveasta_email_challenge_confirm',{p_id:body.challenge_id,p_hash:await digest(body.challenge_id+':'+body.code)});
  return error?{error:'unavailable'}:data||{error:'unavailable'};
 }
 return {error:'invalid'};
}
