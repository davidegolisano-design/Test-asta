(function(){
  document.title='v0.80 TEST';
  const old=document.getElementById('liveasta-v080-player-light-states');
  if(old) old.remove();
  const style=document.createElement('style');
  style.id='liveasta-v080-player-light-states';
  style.textContent=`
  html:is(
    [data-live-theme="light-neutral"],
    [data-live-theme="light-blue"],
    [data-live-theme="light-sand"],
    [data-live-theme="ocean-daily"],
    [data-live-theme="sunset-daily"],
    [data-live-theme="royal-daily"]
  ) #screen-player-buzzer .phone-top-area.player-winning .player-live-side{
    background:linear-gradient(180deg,#1f7a55 0%,#14513c 100%)!important;
    border-left-color:#0f6947!important;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),0 0 22px rgba(31,122,85,.24)!important;
    color:#fff!important;
  }
  html:is(
    [data-live-theme="light-neutral"],
    [data-live-theme="light-blue"],
    [data-live-theme="light-sand"],
    [data-live-theme="ocean-daily"],
    [data-live-theme="sunset-daily"],
    [data-live-theme="royal-daily"]
  ) #screen-player-buzzer .phone-top-area.player-losing .player-live-side{
    background:linear-gradient(180deg,#a43c4d 0%,#702936 100%)!important;
    border-left-color:#8f3141!important;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),0 0 22px rgba(164,60,77,.22)!important;
    color:#fff!important;
  }
  html:is(
    [data-live-theme="light-neutral"],
    [data-live-theme="light-blue"],
    [data-live-theme="light-sand"],
    [data-live-theme="ocean-daily"],
    [data-live-theme="sunset-daily"],
    [data-live-theme="royal-daily"]
  ) #screen-player-buzzer .phone-top-area:is(.player-winning,.player-losing) #player-current-winner{
    color:#fff!important;
    -webkit-text-fill-color:#fff!important;
    text-shadow:0 1px 2px rgba(0,0,0,.45)!important;
  }
  html:is(
    [data-live-theme="light-neutral"],
    [data-live-theme="light-blue"],
    [data-live-theme="light-sand"],
    [data-live-theme="ocean-daily"],
    [data-live-theme="sunset-daily"],
    [data-live-theme="royal-daily"]
  ) #screen-player-buzzer .phone-top-area:is(.player-winning,.player-losing) .player-live-side::before{
    opacity:.22!important;
    background:radial-gradient(circle at 50% 38%,rgba(255,255,255,.24) 0%,rgba(255,255,255,.06) 48%,transparent 80%)!important;
  }
  html:is(
    [data-live-theme="light-neutral"],
    [data-live-theme="light-blue"],
    [data-live-theme="light-sand"],
    [data-live-theme="ocean-daily"],
    [data-live-theme="sunset-daily"],
    [data-live-theme="royal-daily"]
  ) #screen-player-buzzer .phone-top-area:is(.player-winning,.player-losing) .player-live-side :is(.player-live-label,.player-live-title,.player-live-meta,.winner-label){
    color:rgba(255,255,255,.88)!important;
    -webkit-text-fill-color:rgba(255,255,255,.88)!important;
  }
  `;
  document.head.appendChild(style);
})();