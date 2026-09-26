// Defaults for new rooms and missing settings; saved room values take precedence.
const LIVEASTA_TIMER_DEFAULTS=Object.freeze({auction:8,prep:3,sealed:40,reveal:3});
// LIVEASTA room timer settings — CLEAN-36
// Characterized before and after extraction by tests/timer-settings-smoke.mjs.
function auctionPrepStateKey(){
            return currentRoomId ? `auction_prep_${currentRoomId}` : '';
        }

async function loadAuctionPrepSeconds(){
            const n=parseInt(currentRoom?.prep_seconds);
            auctionPrepSeconds=Number.isFinite(n)?Math.max(1,Math.min(15,n)):LIVEASTA_TIMER_DEFAULTS.prep;
            return auctionPrepSeconds;
        }

async function saveAuctionPrepSeconds(seconds){
            auctionPrepSeconds=Math.max(1,Math.min(15,parseInt(seconds)||LIVEASTA_TIMER_DEFAULTS.prep));
            return auctionPrepSeconds;
        }

function sealedTimerStateKey(){
            return currentRoomId ? `sealed_timer_${currentRoomId}` : '';
        }

async function loadSealedTimerSeconds(){
            const n=parseInt(currentRoom?.sealed_timer_seconds);
            sealedTimerSeconds=Number.isFinite(n)?Math.max(5,Math.min(180,n)):LIVEASTA_TIMER_DEFAULTS.sealed;
            return sealedTimerSeconds;
        }

async function saveSealedTimerSeconds(seconds){
            sealedTimerSeconds=Math.max(5,Math.min(180,parseInt(seconds)||LIVEASTA_TIMER_DEFAULTS.sealed));
            return sealedTimerSeconds;
        }

function sealedRevealStateKey(){
            return currentRoomId ? `sealed_reveal_timer_${currentRoomId}` : '';
        }

async function loadSealedRevealSeconds(){
            const n=parseInt(currentRoom?.sealed_reveal_seconds);
            sealedRevealSeconds=Number.isFinite(n)?Math.max(1,Math.min(30,n)):LIVEASTA_TIMER_DEFAULTS.reveal;
            return sealedRevealSeconds;
        }

async function saveSealedRevealSeconds(seconds){
            sealedRevealSeconds=Math.max(1,Math.min(30,parseInt(seconds)||LIVEASTA_TIMER_DEFAULTS.reveal));
            return sealedRevealSeconds;
        }
