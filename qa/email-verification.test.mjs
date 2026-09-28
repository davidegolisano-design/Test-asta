import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateCode,digest,handleVerification} from '../supabase/functions/liveasta-room-verification/handler.mjs';
const payload={p_email:'creator@example.invalid',p_environment:'dev-premium'};
test('six numeric digits including leading zeros',()=>{for(let i=0;i<1000;i++)assert.match(generateCode(),/^\d{6}$/);});
test('send stores only digest before mailing and exposes no code',async()=>{
 let hash,id,mail;const order=[];
 const result=await handleVerification({body:{action:'send',payload},user:'postmaster@liveasta.it',ipHash:'test',
 admin:{rpc:async(name,p)=>{order.push('db');hash=p.p_hash;id=p.p_id;assert.equal(name,'liveasta_email_challenge_start');return {data:{challenge_id:p.p_id,expires_in:600,retry_after:60}};}},
 transport:{sendMail:async value=>{order.push('mail');mail=value;return {accepted:['creator@example.invalid']};}}});
 assert.deepEqual(order,['db','mail']);const code=mail.text.match(/è: (\d{6})/)[1];assert.equal(hash,await digest(id+':'+code));
 assert.equal(result.code,undefined);assert.equal(mail.from.address,'postmaster@liveasta.it');assert(!mail.text.includes('p_room_password'));
});
test('rate limited request never sends email',async()=>{
 const result=await handleVerification({body:{action:'send',payload},admin:{rpc:async()=>({data:{error:'rate_limit'}})},transport:{sendMail:()=>{throw Error('must not run');}}});
 assert.equal(result.error,'rate_limit');
});
test('SMTP rejection is reported without creating a room',async()=>{
 const calls=[];const result=await handleVerification({body:{action:'send',payload},admin:{rpc:async name=>{calls.push(name);return {data:{challenge_id:'id'}};}},transport:{sendMail:async()=>({accepted:[]})}});
 assert.equal(result.error,'mail_failed');assert.deepEqual(calls,['liveasta_email_challenge_start']);
});
test('confirmation only submits a digest and challenge id to service endpoint',async()=>{
 const id=crypto.randomUUID();let args;const result=await handleVerification({body:{action:'confirm',challenge_id:id,code:'001234'},admin:{rpc:async(name,p)=>{assert.equal(name,'liveasta_email_challenge_confirm');args=p;return {data:{room:{id:'room'}}};}}});
 assert.equal(args.p_hash,await digest(id+':001234'));assert.equal(args.code,undefined);assert.equal(result.room.id,'room');
});
