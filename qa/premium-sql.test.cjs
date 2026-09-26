// Runs entirely in a disposable in-memory PostgreSQL (PGlite), never on Supabase.
// NODE_PATH=/path/to/test/dependencies/node_modules node qa/premium-sql.test.cjs
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
  const db=new PGlite();
  await db.exec("create role anon; create role authenticated; create table public.fanta_rooms(id uuid primary key); create function public.liveasta_verify_superuser(p_password text) returns boolean language sql as $$ select p_password='test-admin' $$; create publication supabase_realtime;");
  await db.exec(fs.readFileSync('supabase/premium-dev.sql','utf8'));
  const room='00000000-0000-4000-8000-000000000101';
  await db.query('insert into public.fanta_rooms(id) values ($1)',[room]);
  await db.exec('set role anon');
  const call=(feature,enabled,password='test-admin',environment='dev-premium')=>db.query('select public.liveasta_set_premium_feature($1,$2,$3,$4,$5) as result',[room,environment,feature,enabled,password]);
  assert.equal((await db.query('select * from public.liveasta_premium_entitlements')).rows.length,0);
  await assert.rejects(call('all',true,'wrong'),e=>e.code==='42501');
  await assert.rejects(db.query("insert into public.liveasta_premium_entitlements(room_id,environment) values ($1,'dev-premium')",[room]),e=>e.code==='42501');
  let {rows}=await call('ready',true);assert.deepEqual(rows[0].result.features,['ready']);
  ({rows}=await call('chat',true));assert.deepEqual(new Set(rows[0].result.features),new Set(['ready','chat']));
  ({rows}=await call('ready',false));assert.deepEqual(rows[0].result.features,['chat']);
  ({rows}=await call('miniatures',true));assert.ok(rows[0].result.features.includes('miniatures'));
  ({rows}=await call('miniatures',false));assert.ok(!rows[0].result.features.includes('miniatures'));
  ({rows}=await call('all',true));assert.equal(rows[0].result.features.length,8);
  assert.ok(rows[0].result.features.includes('miniatures'));
  assert.ok(!rows[0].result.features.includes('mantra'));
  await assert.rejects(call('mantra',true),e=>e.code==='22023');
  await assert.rejects(call('all',true,'test-admin','unknown'),e=>e.code==='22023');
  await assert.rejects(db.query("update public.liveasta_premium_entitlements set features='{}'"),e=>e.code==='42501');
  await assert.rejects(db.query('delete from public.liveasta_premium_entitlements'),e=>e.code==='42501');
  await call('chat',true,'test-admin','production');
  ({rows}=await db.query('select environment,features from public.liveasta_premium_entitlements order by environment'));
  assert.equal(rows.length,2);assert.equal(rows[0].features.length,8);assert.deepEqual(rows[1].features,['chat']);
  ({rows}=await call('all',false));assert.deepEqual(rows[0].result.features,[]);
  await db.exec('reset role');await db.query('delete from public.fanta_rooms where id=$1',[room]);
  assert.equal((await db.query('select * from public.liveasta_premium_entitlements')).rows.length,0);
  await db.close();console.log('PASS: SQL setup, administrator grants/revocation, direct writes denied, wrong password denied, Mantra free, environments isolated, cascade cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1;});
