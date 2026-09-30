const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
test('spectator uses shared player counting, deduplicates teams and excludes observers',()=>{
 const source=fs.readFileSync('scripts/app.js','utf8');
 const functions=['syncOnlinePlayersFromPresence','renderOnlinePlayers','cleanupOnlinePlayersSilent','touchFallbackOnlinePlayer'];
 const handlers=new Map(),counter={textContent:''};
 let state={a:[{type:'player',team_id:'1',team_name:'A'}],b:[{type:'player',team_id:'1',team_name:'A'}],c:[{type:'spectator',team_id:'viewer'}],d:[{type:'player',team_id:'2',team_name:'B'}]};
 const channel={presenceState:()=>state,on(type,{event},fn){handlers.set(type+':'+event,fn);return this;}};
 const context={window:{},channel,spectatorMode:true,onlinePlayers:new Map(),teamsCache:[{id:'1'},{id:'2'},{id:'3'}],auctioneerPlayerMode:true,auctioneerPlayerTeamId:'3',ensureNominationOrder:()=>[],cleanupFallbackOnlinePlayers:()=>{},document:{getElementById:id=>id==='auction-online-count'?counter:null}};
 vm.createContext(context);
 for(const name of functions){const start=source.indexOf('        function '+name+'(');const end=source.indexOf('\n        }',start)+10;vm.runInContext(source.slice(start,end),context);}
 vm.runInContext(fs.readFileSync('scripts/spectator.js','utf8'),context);
 context.window.liveastaSpectatorView.subscribePresence(channel);
 handlers.get('presence:sync')();assert.equal(counter.textContent,'2 / 3');
 state={a:state.a};handlers.get('presence:leave')();assert.equal(counter.textContent,'1 / 3');
 handlers.get('broadcast:player_online_fallback')({payload:{team_id:'2',team_name:'B'}});assert.equal(counter.textContent,'2 / 3');
 handlers.get('broadcast:player_offline_now')({payload:{team_id:'2'}});assert.equal(counter.textContent,'1 / 3');
 context.spectatorMode=false;state={};handlers.get('presence:sync')();assert.equal(counter.textContent,'1 / 3');
});
