// LIVEASTA screen wake-lock lifecycle — CLEAN-29
let screenWakeLock = null;
let wakeLockRetryTimer = null;

async function requestScreenWakeLock(){
            if(!('wakeLock' in navigator)) return false;
            if(document.visibilityState !== 'visible') return false;
            if(screenWakeLock && !screenWakeLock.released) return true;

            try{
                screenWakeLock = await navigator.wakeLock.request('screen');

                screenWakeLock.addEventListener('release',()=>{
                    screenWakeLock = null;

                    // Se LIVEASTA è ancora aperta e visibile, riprova.
                    if(document.visibilityState === 'visible'){
                        clearTimeout(wakeLockRetryTimer);
                        wakeLockRetryTimer = setTimeout(requestScreenWakeLock,800);
                    }
                });

                return true;
            }catch(e){
                screenWakeLock = null;
                // Alcuni browser richiedono prima un'interazione dell'utente.
                return false;
            }
        }

async function releaseScreenWakeLock(){
            clearTimeout(wakeLockRetryTimer);
            wakeLockRetryTimer = null;
            if(screenWakeLock){
                try{ await screenWakeLock.release(); }catch(e){}
                screenWakeLock = null;
            }
        }

function installScreenWakeLock(){
            // Primo tentativo appena l'app è pronta.
            requestScreenWakeLock();

            // Riprova alla prima interazione: utile sui browser che richiedono user activation.
            const retryFromInteraction=()=>{
                if(document.visibilityState === 'visible') requestScreenWakeLock();
            };
            document.addEventListener('pointerdown',retryFromInteraction,{passive:true});
            document.addEventListener('touchstart',retryFromInteraction,{passive:true});

            // In background il lock non serve; al ritorno viene richiesto di nuovo.
            document.addEventListener('visibilitychange',()=>{
                if(document.visibilityState === 'visible'){
                    requestScreenWakeLock();
                }else{
                    releaseScreenWakeLock();
                }
            });

            window.addEventListener('pageshow',()=>requestScreenWakeLock());
            window.addEventListener('focus',()=>requestScreenWakeLock());
        }
