// LIVEASTA text fitting and responsive name utilities.

function fitTextToBox(el, maxPx, minPx, forceSingleLine=false){
            if(!el || !el.getClientRects().length) return;
            // Empty-state copy wraps naturally; it is not a player name.
            if(el.id==='auction-player-name-top' && el.closest('.nomination-empty-previous'))return;

            // Rimuove eventuali scale precedenti prima di misurare.
            el.style.removeProperty('transform');

            if(forceSingleLine){
                el.style.setProperty('display','block','important');
                el.style.setProperty('white-space','nowrap','important');
                el.style.setProperty('overflow','visible','important');
                el.style.setProperty('text-overflow','clip','important');
                el.style.setProperty('overflow-wrap','normal','important');
                el.style.setProperty('word-break','normal','important');
                el.style.setProperty('max-height','none','important');
                el.style.setProperty('line-height','1','important');

                // La misura deve dipendere dal riquadro, non dalla larghezza
                // eventualmente già espansa del testo.
                const box=el.closest('.col-player') || el.parentElement;
                const available=Math.max(40,(box?.clientWidth||el.clientWidth||100)-24);
                el.style.setProperty('width',available+'px','important');
                el.style.setProperty('max-width',available+'px','important');
                el.style.setProperty('min-width','0','important');
            }

            let size=maxPx;
            el.style.setProperty('font-size',size+'px','important');

            const fits=()=>{
                if(forceSingleLine){
                    return el.scrollWidth <= el.clientWidth + 1;
                }
                return el.scrollWidth<=el.clientWidth+2 &&
                       el.scrollHeight<=el.clientHeight+2;
            };

            while(size>minPx && !fits()){
                size-=1;
                el.style.setProperty('font-size',size+'px','important');
            }

            // Ultima protezione per nomi eccezionalmente lunghi:
            // sempre una sola riga, mai tagliata.
            if(forceSingleLine && el.scrollWidth>el.clientWidth){
                const ratio=Math.max(.58,el.clientWidth/el.scrollWidth);
                el.style.setProperty('transform',`scaleX(${ratio})`,'important');
                el.style.setProperty('transform-origin','center center','important');
            }
        }

function fitNominationStageTeam(){
            const el=document.getElementById('nomination-stage-team');
            if(!el)return;
            const max=window.innerWidth<=600?86:136;
            const min=window.innerWidth<=600?24:34;
            requestAnimationFrame(()=>{
                el.style.fontSize=max+'px';
                let size=max;
                while(size>min && el.scrollWidth>el.clientWidth){
                    size-=2;
                    el.style.fontSize=size+'px';
                }
            });
        }

function fitAuctionNames(){
            const mobile=document.getElementById('auction-dashboard')?.classList.contains('mode-mobile');
            requestAnimationFrame(()=>{
                fitTextToBox(
                    document.getElementById('auction-player-name-top'),
                    mobile?28:64,
                    mobile?11:18,
                    true
                );
                fitTextToBox(
                    document.getElementById('winner-display'),
                    mobile?24:72,
                    mobile?12:16,
                    true
                );
            });
        }

function installAuctionNameAutoFit(){
            const ids=['auction-player-name-top','winner-display'];
            ids.forEach(id=>{
                const el=document.getElementById(id);
                if(!el || el.dataset.fitObserver==='1') return;
                el.dataset.fitObserver='1';
                new MutationObserver(()=>fitAuctionNames()).observe(el,{
                    childList:true,subtree:true,characterData:true
                });
            });
            window.addEventListener('resize',fitAuctionNames,{passive:true});
            window.addEventListener('resize',fitNominationStageTeam,{passive:true});
            fitAuctionNames();
        }
