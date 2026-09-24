import nodemailer from 'npm:nodemailer@7.0.6';
import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {deliverNotification} from './mail.mjs';

// Called only by the database outbox. Each job has a random private delivery
// token; the service-role-only claim verifies it before exposing any mail data.
Deno.serve(async (req:Request) => {
  if (req.method!=='POST') return new Response('Method not allowed',{status:405});
  let body;
  try { body=await req.json(); } catch { return Response.json({ok:false},{status:400}); }
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(body?.id) || !uuid.test(body?.token)) return Response.json({ok:false},{status:400});
  const user=Deno.env.get('ARUBA_SMTP_USER'), pass=Deno.env.get('ARUBA_SMTP_PASSWORD');
  const recipient=Deno.env.get('ADMIN_NOTIFICATION_EMAIL');
  const url=Deno.env.get('SUPABASE_URL'), key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!user || !pass || recipient?.toLowerCase()!=='postmaster@liveasta.it' || !url || !key)
    return Response.json({ok:false,error:'Configuration unavailable'},{status:503});
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const transport=nodemailer.createTransport({host:'smtps.aruba.it',port:465,secure:true,
    auth:{user,pass},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,dnsTimeout:10000});
  try {
    const result=await deliverNotification({admin,transport,jobId:body.id,token:body.token,
      claim:crypto.randomUUID(),user,recipient});
    return Response.json(result,{status:result.ok?200:502});
  } catch { return Response.json({ok:false,error:'Notification unavailable'},{status:503}); }
  finally { transport.close(); }
});
