// LIVEASTA room timer settings — CLEAN-36
// Characterized before and after extraction by tests/timer-settings-smoke.mjs.
function auctionPrepStateKey(){
            return currentRoomId ? `auction_prep_${currentRoomId}` : '';
        }

async function loadAuctionPrepSeconds(){
            const n=parseInt(currentRoom?.prep_seconds);
            auctionPrepSeconds=Number.isFinite(n)?Math.max(1,Math.min(15,n)):5;
            return auctionPrepSeconds;
        }

async function saveAuctionPrepSeconds(seconds){
            auctionPrepSeconds=Math.max(1,Math.min(15,parseInt(seconds)||5));
            return auctionPrepSeconds;
        }

function sealedTimerStateKey(){
            return currentRoomId ? `sealed_timer_${currentRoomId}` : '';
        }

async function loadSealedTimerSeconds(){
            const n=parseInt(currentRoom?.sealed_timer_seconds);
            sealedTimerSeconds=Number.isFinite(n)?Math.max(5,Math.min(180,n)):30;
            return sealedTimerSeconds;
        }

async function saveSealedTimerSeconds(seconds){
            sealedTimerSeconds=Math.max(5,Math.min(180,parseInt(seconds)||30));
            return sealedTimerSeconds;
        }

function sealedRevealStateKey(){
            return currentRoomId ? `sealed_reveal_timer_${currentRoomId}` : '';
        }

async function loadSealedRevealSeconds(){
            const n=parseInt(currentRoom?.sealed_reveal_seconds);
            sealedRevealSeconds=Number.isFinite(n)?Math.max(1,Math.min(30,n)):5;
            return sealedRevealSeconds;
        }

async function saveSealedRevealSeconds(seconds){
            sealedRevealSeconds=Math.max(1,Math.min(30,parseInt(seconds)||5));
            return sealedRevealSeconds;
        }
