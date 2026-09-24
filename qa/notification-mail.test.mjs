import {test} from 'node:test';
import assert from 'node:assert/strict';
import {notificationMail,deliverNotification,failureState} from '../supabase/functions/liveasta-dev-notification/mail.mjs';
const job={id:'job-1',room_id:'room-1',kind:'room_created',payload:{name:'<Test>\r\nBCC: wrong',password:'<&secret>',email:'creator@example.invalid',mode:'mantra',created_at:'2026-09-24'}};
test('creation email only to configured postmaster with escaped data and actual newlines',()=>{
 const mail=notificationMail(job,'postmaster@liveasta.it','postmaster@liveasta.it');
 assert.equal(mail.to,'postmaster@liveasta.it');assert.ok(!/[\r\n]/.test(mail.subject));
 assert.ok(mail.text.includes('\nPassword: <&secret>'));assert.ok(mail.html.includes('&lt;&amp;secret&gt;'));
 assert.ok(mail.text.includes('approvata automaticamente'));
 assert.throws(()=>notificationMail(job,'postmaster@liveasta.it','stranger@example.invalid'));
});
test('Premium email refers to the room without sending its password',()=>{
 const mail=notificationMail({...job,kind:'premium_requested'},'postmaster@liveasta.it','postmaster@liveasta.it');
 assert.ok(mail.text.includes('tutta la stanza'));assert.ok(!mail.text.includes('Password:'));
});
test('a duplicate worker never calls SMTP',async()=>{
 let sends=0;
 const result=await deliverNotification({admin:{rpc:async()=>({data:null,error:null})},transport:{sendMail:async()=>{sends++;}},jobId:'x',token:'t',claim:'c'});
 assert.equal(sends,0);assert.equal(result.skipped,true);
});
test('accepted mail is recorded once; a failed DB acknowledgement never retries SMTP',async()=>{
 for(const failAck of [false,true]){
 let sends=0;const calls=[];
 const admin={rpc:async(name,args)=>{calls.push({name,args});return name.includes('claim')?{data:job}:{data:!failAck,error:failAck?new Error('db'):null};}};
 const run=()=>deliverNotification({admin,transport:{sendMail:async()=>{sends++;return {accepted:['postmaster@liveasta.it']};}},jobId:'x',token:'t',claim:'c',user:'postmaster@liveasta.it',recipient:'postmaster@liveasta.it'});
 if(failAck)await assert.rejects(run);else assert.equal((await run()).ok,true);
 assert.equal(sends,1);assert.equal(calls[1].args.p_state,'sent');
 }
});
test('uncertain DATA outcome is held for review; explicit SMTP rejection can retry',()=>{
 assert.equal(failureState({command:'DATA',code:'ETIMEDOUT'}),'uncertain');
 assert.equal(failureState({command:'DATA',responseCode:451}),'failed');
 assert.equal(failureState({command:'CONN'}),'failed');
});
