// === liveasta-theme-runtime-fix ===
(function(){
  const KEY='liveasta_theme';
  const THEMES={
    broadcast:{
      base:'broadcast',bg:'#11151B',deep:'#0B0E12',card:'#1A2028',panel:'#151A21',hover:'#242C36',input:'#171D24',
      border:'#3A4654',text:'#F6F2E8',muted:'#B8B1A3',soft:'#8E887E',primary:'#C9A84E',primaryHover:'#B5933E',
      accent:'#D5B45A',number:'#D5B45A',danger:'#D84A55',success:'#2DA66F',meta:'#11151B'
    },
    stadium:{
      base:'stadium',bg:'#120018',deep:'#08000D',card:'#21002B',panel:'#180020',hover:'#350044',input:'#1B0024',
      border:'#B535FF',text:'#FFFFFF',muted:'#58F2E1',soft:'#C99BE8',primary:'#B535FF',primaryHover:'#9B1CFF',
      accent:'#50EAD8',number:'#FF338B',danger:'#FF338B',success:'#9AFF20',meta:'#120018'
    },
    carbon:{
      base:'carbon',bg:'#101214',deep:'#090B0C',card:'#191C1F',panel:'#14171A',hover:'#252A2E',input:'#171A1D',
      border:'#3A4248',text:'#F4F6F7',muted:'#AEB6BC',soft:'#7F898F',primary:'#46B7A8',primaryHover:'#369A8E',
      accent:'#E18A4A',number:'#E18A4A',danger:'#E2535F',success:'#46B77B',meta:'#101214'
    },
    'light-neutral':{
      base:'light-neutral',bg:'#F6F1E7',deep:'#E9E0D1',card:'#FFFDF9',panel:'#F9F5ED',hover:'#ECE5D9',input:'#FFFFFF',
      border:'#CFC3B2',text:'#25231F',muted:'#6B655D',soft:'#8B8379',primary:'#3B6F73',primaryHover:'#315D60',
      accent:'#B17A2B',number:'#A96F20',danger:'#B94750',success:'#2D8E63',meta:'#F6F1E7'
    },
    'light-blue':{
      base:'light-blue',bg:'#F7F2FA',deep:'#EEE3F3',card:'#FFFFFF',panel:'#FCF8FE',hover:'#F0E4F5',input:'#FFFFFF',
      border:'#CFA7DF',text:'#25002F',muted:'#674B70',soft:'#846B8C',primary:'#9D22E8',primaryHover:'#8512D0',
      accent:'#00AFA0',number:'#E60068',danger:'#E60068',success:'#61A900',meta:'#F7F2FA'
    },
    'light-sand':{
      base:'light-sand',bg:'#F3F5F6',deep:'#E4E8EA',card:'#FFFFFF',panel:'#F8F9FA',hover:'#E8ECEE',input:'#FFFFFF',
      border:'#C3CCD1',text:'#1D2529',muted:'#657178',soft:'#849097',primary:'#267E76',primaryHover:'#1F6962',
      accent:'#C86D32',number:'#B85F28',danger:'#BF4653',success:'#267E76',meta:'#F3F5F6'
    },

    /* OCEAN */
    'ocean-daily':{
      base:'light-blue',bg:'#ECF8F8',deep:'#D8EEEE',card:'#FFFFFF',panel:'#F4FBFB',hover:'#DCEFEF',input:'#FFFFFF',
      border:'#A9CCCC',text:'#123536',muted:'#527475',soft:'#769394',primary:'#087F82',primaryHover:'#066A6D',
      accent:'#E28B3E',number:'#087F82',danger:'#C94655',success:'#138B64',meta:'#ECF8F8'
    },
    'ocean-dark':{
      base:'carbon',bg:'#061819',deep:'#031011',card:'#0C2527',panel:'#081E20',hover:'#123436',input:'#092225',
      border:'#256266',text:'#F2FCFC',muted:'#9BC7C8',soft:'#6F999B',primary:'#20C7C9',primaryHover:'#12AAAC',
      accent:'#FF9A4A',number:'#46DBDD',danger:'#FF5968',success:'#36D39A',meta:'#061819'
    },

    /* SUNSET */
    'sunset-daily':{
      base:'light-sand',bg:'#FFF3EC',deep:'#F5E1D6',card:'#FFFDFB',panel:'#FFF8F3',hover:'#F5E5DB',input:'#FFFFFF',
      border:'#DDBEAD',text:'#3A211B',muted:'#795F56',soft:'#987C72',primary:'#C9572F',primaryHover:'#AA4626',
      accent:'#A84A7C',number:'#C9572F',danger:'#C33D4B',success:'#32855D',meta:'#FFF3EC'
    },
    'sunset-dark':{
      base:'carbon',bg:'#1B0D10',deep:'#100709',card:'#291319',panel:'#211015',hover:'#3A1C24',input:'#241116',
      border:'#70404B',text:'#FFF5F1',muted:'#D3ABA1',soft:'#A47C74',primary:'#FF7048',primaryHover:'#E95D37',
      accent:'#FFB347',number:'#FF8A63',danger:'#FF4E63',success:'#47C987',meta:'#1B0D10'
    },

    /* ROYAL */
    'royal-daily':{
      base:'light-neutral',bg:'#F6F2FC',deep:'#E9E1F5',card:'#FFFFFF',panel:'#FAF8FD',hover:'#EBE3F4',input:'#FFFFFF',
      border:'#CBBCE0',text:'#2B2038',muted:'#695C78',soft:'#8A7B99',primary:'#6D47A8',primaryHover:'#59378F',
      accent:'#C4932F',number:'#6D47A8',danger:'#C34458',success:'#2B8A62',meta:'#F6F2FC'
    },
    'royal-dark':{
      base:'carbon',bg:'#110B1D',deep:'#09060F',card:'#1C132C',panel:'#171025',hover:'#2A1D40',input:'#191128',
      border:'#554078',text:'#FBF7FF',muted:'#C0B1D2',soft:'#8F7EA4',primary:'#9B70E5',primaryHover:'#865AD3',
      accent:'#E1B857',number:'#B58AF0',danger:'#F05C70',success:'#4AC78D',meta:'#110B1D'
    }
  };

  const LABELS={
    broadcast:'Classic Dark',stadium:'Glow Electric Dark',carbon:'Modern Dark',
    'light-neutral':'Classic Daily','light-blue':'Glow Electric Daily','light-sand':'Modern Daily',
    'ocean-daily':'Ocean Daily','ocean-dark':'Ocean Dark',
    'sunset-daily':'Sunset Daily','sunset-dark':'Sunset Dark',
    'royal-daily':'Royal Daily','royal-dark':'Royal Dark'
  };

  const VARS={
    bg:'--theme-bg',deep:'--theme-bg-deep',card:'--theme-card',panel:'--theme-panel',
    hover:'--theme-hover',input:'--theme-input',border:'--theme-border',text:'--theme-text',
    muted:'--theme-muted',soft:'--theme-soft',primary:'--theme-primary',
    primaryHover:'--theme-primary-hover',accent:'--theme-accent',number:'--theme-number',
    danger:'--theme-danger',success:'--theme-success'
  };

  function normalize(name){return Object.prototype.hasOwnProperty.call(THEMES,name)?name:'broadcast';}

  function apply(name,persist=true){
    name=normalize(name);
    const t=THEMES[name];
    const root=document.documentElement;

    /* base mantiene compatibili tutte le regole light/dark già presenti */
    root.setAttribute('data-live-theme',t.base||name);
    root.setAttribute('data-theme-choice',name);

    Object.entries(VARS).forEach(([k,cssVar])=>{
      root.style.setProperty(cssVar,t[k],'important');
    });

    root.style.setProperty('background-color',t.meta,'important');
    if(document.body)document.body.style.setProperty('background-color',t.bg,'important');

    document.querySelectorAll('[data-theme-option]').forEach(btn=>{
      const active=btn.dataset.themeOption===name;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-pressed',active?'true':'false');
    });

    const label=document.getElementById('current-theme-label');
    if(label)label.textContent=LABELS[name];

    const status=document.getElementById('theme-save-status');
    if(status)status.textContent='Salvato su questo dispositivo';

    let meta=document.querySelector('meta[name="theme-color"]');
    if(!meta){
      meta=document.createElement('meta');
      meta.name='theme-color';
      document.head.appendChild(meta);
    }
    meta.content=t.meta;

    if(persist){
      try{localStorage.setItem(KEY,name);}catch(_){}
    }

    requestAnimationFrame(()=>{
      window.updateLiveAstaTeamCards?.();
      window.fitAuctionNames?.();
    });
    return name;
  }

  window.applyLiveAstaTheme=apply;
  window.setLiveAstaTheme=function(name){return apply(name,true);};

  function boot(){
    let saved='broadcast';
    try{saved=localStorage.getItem(KEY)||'broadcast';}catch(_){}
    if(!THEMES[saved]){
      saved='broadcast';
      try{localStorage.setItem(KEY,saved);}catch(_){}
    }
    apply(saved,false);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }

  window.addEventListener('pageshow',()=>{
    let saved='broadcast';
    try{saved=localStorage.getItem(KEY)||'broadcast';}catch(_){}
    apply(saved,false);
  });
})();


// Canonical theme menu + lifecycle hooks
(function(){
  'use strict';
  const KEY='liveasta_theme';

  window.openLiveAstaThemeMenu=function(){
    const menu=document.getElementById('liveasta-theme-submenu');
    if(!menu)return;
    menu.classList.add('open');
    menu.setAttribute('aria-hidden','false');
    document.body&&document.body.classList.add('theme-submenu-open');
    menu.scrollTop=0;
  };

  window.closeLiveAstaThemeMenu=function(){
    const menu=document.getElementById('liveasta-theme-submenu');
    if(!menu)return;
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden','true');
    document.body&&document.body.classList.remove('theme-submenu-open');
  };

  function reapplyCurrentTheme(){
    if(typeof window.applyLiveAstaTheme!=='function')return;
    let saved='broadcast';
    try{saved=localStorage.getItem(KEY)||'broadcast';}catch(_){}
    window.applyLiveAstaTheme(saved,false);
  }

  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)reapplyCurrentTheme();
  });
})();
