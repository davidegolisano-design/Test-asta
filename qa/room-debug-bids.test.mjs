import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../scripts/app.js',import.meta.url),'utf8');
for(const [name,next] of [['handleBuzzReceived','handleExactBidReceived'],['handleExactBidReceived','endAuction']]){
    test(`${name}: diagnostic hooks preserve accepted bids and every rejection`,()=>{
        const start=source.indexOf('        function '+name+'(');
        const end=source.indexOf((next==='endAuction'?'        async function ':'        function ')+next+'(',start);
        const node={innerText:'',style:{},classList:{remove(){}}};
        const logs=[];const c={
            selfRaiseEnabled:false,currentTimer:5,roomDebug:{record:(event,details)=>logs.push({event,...details})},Date,
            isAuctionActive:true,currentAuctionPlayer:{R:'P'},currentAuctionValue:10,currentWinner:'',
            recentNormalBidIds:new Map(),normalBidCooldownUntil:0,normalBidCooldownMs:500,
            teamsCache:[{id:'T1',name:'Team'}],findTeamByName:()=>({id:'T1',name:'Team'}),
            isSelfRaiseBlockedForTeam:()=>false,maxBidForTeam:()=>500,
            normalAuctionConfiguredSeconds:()=>5,recordNormalBid(){},normalBidRanking:()=>[],saveLiveAuctionState(){},
            livePlayerSnapshot:()=>({id:'P1'}),document:{getElementById:()=>node},
            channel:{send:()=>Promise.resolve('ok')},playSound(){},speakBidValue(){},
            isAuctioneerPlayerIdentity:()=>false,hybridNormalBidUpdate(){},
            teamCounts:()=>({P:0}),roomLimits:()=>({P:3}),isMantraRoom:()=>false
        };
        vm.createContext(c);vm.runInContext(source.slice(start,end),c);
        const offer=name==='handleBuzzReceived'?5:15;
        c[name]('Team',offer,'T1','bid1');assert.equal(c.currentAuctionValue,15);assert.equal(logs.at(-1).event,'bid.accepted');
        c[name]('Team',offer,'T1','bid1');assert.equal(logs.at(-1).reason,'duplicate');assert.equal(c.currentAuctionValue,15);
        c[name]('Team',offer,'T1','bid2');assert.equal(logs.at(-1).reason,'cooldown');
        c.normalBidCooldownUntil=0;c.isSelfRaiseBlockedForTeam=()=>true;
        c[name]('Team',offer,'T1','bid3');assert.equal(logs.at(-1).reason,'self_raise');
        c.isSelfRaiseBlockedForTeam=()=>false;c.maxBidForTeam=()=>15;
        c[name]('Team',20,'T1','bid4');assert.equal(logs.at(-1).reason,'max_bid');
        c[name]('Missing',20,'missing','bid5');assert.equal(logs.at(-1).reason,'team_missing');
        if(name==='handleExactBidReceived'){
            c[name]('Team',10,'T1','bid6');assert.equal(logs.at(-1).reason,'outbid');
        }
        c.isAuctionActive=false;c[name]('Team',20,'T1','bid7');assert.equal(logs.at(-1).reason,'inactive');
        assert.equal(c.currentAuctionValue,15);
    });
}
