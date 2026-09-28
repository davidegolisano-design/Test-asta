import nodemailer from 'npm:nodemailer@7.0.6';
import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {handleVerification,digest} from './handler.mjs';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return new Response('Method not allowed',{status:405,headers});
 let body;
 try{const raw=await req.text();if(raw.length>12000)throw Error();body=JSON.parse(raw);}catch(_){return Response.json({error:'invalid'},{status:400,headers});}
 const user=Deno.env.get('ARUBA_SMTP_USER'),pass=Deno.env.get('ARUBA_SMTP_PASSWORD');
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!user||!pass||!url||!key)return Response.json({error:'unavailable'},{status:503,headers});
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const transport=nodemailer.createTransport({host:'smtps.aruba.it',port:465,secure:true,auth:{user,pass},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,dnsTimeout:10000});
 try{
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const result=await handleVerification({body,admin,transport,user,ipHash:await digest(key+':'+ip)});
  return Response.json(result,{headers});
 }catch(_){return Response.json({error:'unavailable'},{status:503,headers});}
 finally{transport.close();}
});
