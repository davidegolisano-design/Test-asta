const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../scripts/demo-engine.js'),players=require('../scripts/demo-players.json');
for(const game_mode of ['classic','mantra'])for(const selection of ['random','turns'])for(const auction_mode of ['normal','sealed','mixed'])test(`${game_mode} ${selection} ${auction_mode}: complete cycle, budget and capacity`,()=>{
 const config={game_mode,selection,auction_mode,seed:game_mode==='classic'?417:821,anchor_ms:100000,elapsed_ms:0,paused:false};
 const plan=E.build(config,players),spent=new Map(),rosters=new Map();
 assert.equal(plan.purchases.length,200);assert.equal(new Set(plan.purchases.map(p=>p.player_id)).size,200);
 for(const p of plan.purchases){assert.ok(p.price>=1);spent.set(p.team_id,(spent.get(p.team_id)||0)+p.price);rosters.set(p.team_id,[...(rosters.get(p.team_id)||[]),p]);}
 for(const team of plan.teams){assert.ok(spent.get(team.id)<=500);assert.equal(rosters.get(team.id).length,25);if(game_mode==='classic')for(const [role,n] of Object.entries({P:3,D:8,C:8,A:6}))assert.equal(rosters.get(team.id).filter(p=>p.role===role).length,n);else assert.ok(rosters.get(team.id).filter(p=>p.role==='Por').length>=2);}
 const end=E.frame(plan,config,100000+plan.duration-1);assert.equal(end.purchases.length,200);
 const restart=E.frame(plan,config,100000+plan.duration+1);assert.equal(restart.purchases.length,0);assert.equal(restart.cycle,1);
 const paused={...config,paused:true,elapsed_ms:12345};const a=E.frame(plan,paused,100000),b=E.frame(plan,paused,200000);delete a.state.deadline_at;delete b.state.deadline_at;assert.deepEqual(a,b);
 const active=plan.steps.find(s=>s.state.phase==='active');if(active){const f=E.frame(plan,config,100000+active.at+1);assert.equal(f.state.seconds,config.auction_seconds||8);}
 assert.deepEqual(plan,E.build(config,players));
});
test('paused and resumed clocks preserve elapsed; resetting returns to the first frame',()=>{
 const paused={anchor_ms:1000,elapsed_ms:15000,paused:true};assert.equal(E.elapsed(paused,999999),15000);
 assert.equal(E.elapsed({...paused,paused:false,anchor_ms:20000},25000),20000);
 assert.equal(E.elapsed({paused:false,anchor_ms:25000,elapsed_ms:0},25000),0);
});
