// LIVEASTA audio settings, playback and mixer UI. Extracted from app.js without behavioral changes.

const AUDIO_SETTINGS_KEY = 'fanta_buzzer_audio_v2';

const defaultAudioSettings = {
            voiceEnabled: true,
            voiceVolume: 1.00,
            voiceRate: 1.40,
            final3Mode: 'beep',
            volumes: {'audio-prep':0.70,'audio-start':1.00,'audio-buzz':0.20,'audio-end':0.80}
        };

let audioSettings = JSON.parse(JSON.stringify(defaultAudioSettings));

async function openAudioMixer(){
            loadAudioSettings();
            await loadAudioRoutingSettings();
            renderAudioRoutingTargets();

            const modal=document.getElementById('audio-mixer-modal');
            if(modal){
                // Il mixer nasce dentro Gestione, ma su mobile un overlay fixed dentro
                // un contenitore scrollabile può essere intrappolato/clippato dal parent.
                // Lo portiamo direttamente sotto BODY: un solo viewport, uno solo scroll.
                if(modal.parentElement!==document.body)document.body.appendChild(modal);
                modal.classList.add('open');
                document.documentElement.classList.add('audio-modal-open');
                requestAnimationFrame(()=>{
                    modal.scrollTop=0;
                    const card=modal.querySelector('.audio-mixer-card');
                    if(card)card.scrollTop=0;
                });
            }
            unlockAudio();
        }

function closeAudioMixer(){
            document.getElementById('audio-mixer-modal')?.classList.remove('open');
            document.documentElement.classList.remove('audio-modal-open');
        }

function loadAudioSettings(){
            try {
                const saved=JSON.parse(localStorage.getItem(AUDIO_SETTINGS_KEY)||'null');
                if(saved) audioSettings={...defaultAudioSettings,...saved,volumes:{...defaultAudioSettings.volumes,...(saved.volumes||{})}};
            } catch(_){}
            const toggle=document.getElementById('voice-bids-enabled'); if(toggle) toggle.checked=!!audioSettings.voiceEnabled;
            Object.entries(audioSettings.volumes).forEach(([id,v])=>{
                const el=document.getElementById('vol-'+id); if(el){el.value=Math.round(v*100);updateAudioLabel(el);}
            });
            const vv=document.getElementById('vol-bid-voice'); if(vv){vv.value=Math.round(audioSettings.voiceVolume*100);updateAudioLabel(vv);}
            const vr=document.getElementById('rate-bid-voice'); if(vr){vr.value=Math.round(audioSettings.voiceRate*100);updateAudioLabel(vr,true);}
            const final3=document.getElementById('auction-final3-mode');
            if(final3)final3.value=['beep','voice','off'].includes(audioSettings.final3Mode)?audioSettings.final3Mode:'beep';
        }

function saveAudioSettings(){
            const toggle=document.getElementById('voice-bids-enabled');
            if(toggle) audioSettings.voiceEnabled=toggle.checked;
            const final3=document.getElementById('auction-final3-mode');
            if(final3)audioSettings.final3Mode=['beep','voice','off'].includes(final3.value)?final3.value:'beep';
            Object.keys(audioSettings.volumes).forEach(id=>{
                const el=document.getElementById('vol-'+id); if(el) audioSettings.volumes[id]=(parseInt(el.value)||0)/100;
            });
            const vv=document.getElementById('vol-bid-voice'); if(vv) audioSettings.voiceVolume=(parseInt(vv.value)||0)/100;
            const vr=document.getElementById('rate-bid-voice'); if(vr) audioSettings.voiceRate=(parseInt(vr.value)||100)/100;
            localStorage.setItem(AUDIO_SETTINGS_KEY,JSON.stringify(audioSettings));
        }

function updateAudioLabel(el,isRate=false){
            const label=el?.parentElement?.querySelector('.audio-percent'); if(!label)return;
            label.textContent=isRate ? ((parseInt(el.value)||100)/100).toFixed(2).replace(/0$/,'')+'×' : (parseInt(el.value)||0)+'%';
        }

function playSound(elementId,force=false) {
            if(!force && isThisDeviceAudioMuted())return;

            const master = document.getElementById(elementId);
            if (!master) return;
            const volume = Math.max(0,Math.min(1,audioSettings.volumes[elementId] ?? 1));
            if (volume <= 0) return;
            try {
                const sound = new Audio(master.src);
                sound.preload = 'auto';
                sound.volume = volume;
                const p = sound.play();
                if (p && p.catch) p.catch(() => {
                    master.volume = volume;
                    master.currentTime = 0;
                    master.play().catch(()=>{});
                });
            } catch(_) {
                master.volume = volume;
                master.currentTime = 0;
                master.play().catch(()=>{});
            }
        }

function testAuctionAudio(id){ playSound(id,true); }

function speakBidValue(value,force=false){
            if(!('speechSynthesis' in window)) return;
            if(!force && isThisDeviceAudioMuted()) return;
            if(!force && !audioSettings.voiceEnabled) return;
            const n=parseInt(value); if(!Number.isFinite(n)) return;
            window.speechSynthesis.cancel(); // mai creare una coda: pronuncia sempre l'ultima offerta
            const u=new SpeechSynthesisUtterance(String(n));
            u.lang='it-IT'; u.volume=Math.max(0,Math.min(1,audioSettings.voiceVolume)); u.rate=audioSettings.voiceRate; u.pitch=1;
            window.speechSynthesis.speak(u);
        }

function testBidVoice(){ speakBidValue(currentAuctionValue || 25,true); }

function speakFinalCountdownNumber(value,force=false){
            if(!('speechSynthesis' in window))return;
            if(!force && isThisDeviceAudioMuted())return;
            const n=parseInt(value);
            if(![1,2,3].includes(n))return;

            window.speechSynthesis.cancel();
            const u=new SpeechSynthesisUtterance(String(n));
            u.lang='it-IT';
            u.volume=Math.max(0,Math.min(1,audioSettings.voiceVolume));
            u.rate=Math.max(.8,Math.min(1.4,audioSettings.voiceRate));
            u.pitch=1;
            window.speechSynthesis.speak(u);
        }

function playAuctionFinalCountdown(value,force=false){
            const n=parseInt(value);
            if(![1,2,3].includes(n))return;

            const mode=['beep','voice','off'].includes(audioSettings.final3Mode)
                ?audioSettings.final3Mode
                :'beep';

            if(mode==='off')return;
            if(mode==='voice'){
                speakFinalCountdownNumber(n,force);
                return;
            }
            playSound('audio-prep',force);
        }

function testFinalCountdownAudio(){
            const mode=document.getElementById('auction-final3-mode')?.value||audioSettings.final3Mode||'beep';
            audioSettings.final3Mode=mode;
            saveAudioSettings();
            if(mode==='off')return;
            [3,2,1].forEach((n,i)=>setTimeout(()=>playAuctionFinalCountdown(n,true),i*850));
        }
