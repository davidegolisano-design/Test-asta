// DEV v1.04.14 — electric game palettes, 6 dark + 6 light.
(function(){
  if(window.__liveastaGlowThemeLoaded)return;
  window.__liveastaGlowThemeLoaded=true;

  const KEY='liveasta_theme';
  const THEMES={
    broadcast:{base:'broadcast',bg:'#0B1018',deep:'#05080E',card:'#141C28',panel:'#0F1722',hover:'#1C2A3B',input:'#101925',border:'#6A5A25',text:'#FFF9E8',muted:'#C9C2A6',soft:'#8F8A78',primary:'#FFD84A',primaryHover:'#F2C624',accent:'#35D9FF',number:'#FFD84A',danger:'#FF3D68',success:'#34F59B',meta:'#0B1018'},
    stadium:{base:'stadium',bg:'#100018',deep:'#06000A',card:'#21002D',panel:'#180021',hover:'#360046',input:'#1A0024',border:'#B938FF',text:'#FFFFFF',muted:'#61FFF0',soft:'#D1A0F3',primary:'#BC3CFF',primaryHover:'#A21FFF',accent:'#20F4E5',number:'#FF2F92',danger:'#FF315E',success:'#9BFF28',meta:'#100018'},
    carbon:{base:'carbon',bg:'#08110F',deep:'#030807',card:'#101B19',panel:'#0C1514',hover:'#18302B',input:'#0D1917',border:'#2B8073',text:'#F4FFFC',muted:'#9FD1C7',soft:'#6D9B92',primary:'#22E6C3',primaryHover:'#10C9A9',accent:'#FF8A2A',number:'#22E6C3',danger:'#FF4D67',success:'#35E88C',meta:'#08110F'},
    'light-neutral':{base:'light-neutral',bg:'#F5F8FF',deep:'#E7EEFF',card:'#FFFFFF',panel:'#F9FBFF',hover:'#E9F0FF',input:'#FFFFFF',border:'#A9BCE8',text:'#121A2A',muted:'#56627A',soft:'#7B879F',primary:'#006EFF',primaryHover:'#0058D9',accent:'#FFB000',number:'#E6005C',danger:'#FF2E56',success:'#00A86B',meta:'#F5F8FF'},
    'light-blue':{base:'light-blue',bg:'#F8F2FF',deep:'#EDE1FB',card:'#FFFFFF',panel:'#FCF8FF',hover:'#F1E5FF',input:'#FFFFFF',border:'#C99BEA',text:'#240034',muted:'#684C78',soft:'#8C7199',primary:'#9A23FF',primaryHover:'#7E0DDE',accent:'#00CFE8',number:'#F00073',danger:'#FF2E68',success:'#65B800',meta:'#F8F2FF'},
    'light-sand':{base:'light-sand',bg:'#F3F8F7',deep:'#E1EEEB',card:'#FFFFFF',panel:'#F8FCFB',hover:'#E5F0ED',input:'#FFFFFF',border:'#9FCBC2',text:'#102824',muted:'#55756E',soft:'#78968F',primary:'#00A98F',primaryHover:'#008C77',accent:'#FF6B1A',number:'#008A76',danger:'#E63E59',success:'#00A56E',meta:'#F3F8F7'},
    'ocean-daily':{base:'light-blue',bg:'#ECFBFF',deep:'#D7F2F8',card:'#FFFFFF',panel:'#F5FDFF',hover:'#DFF5FA',input:'#FFFFFF',border:'#8ED4E3',text:'#073844',muted:'#487781',soft:'#6F9AA3',primary:'#00A7C7',primaryHover:'#0087A2',accent:'#006EFF',number:'#008CAB',danger:'#E83D5F',success:'#00A875',meta:'#ECFBFF'},
    'ocean-dark':{base:'carbon',bg:'#03141A',deep:'#010A0E',card:'#08232B',panel:'#061B22',hover:'#0D3440',input:'#072129',border:'#1E7185',text:'#F0FDFF',muted:'#90CDD7',soft:'#639BA7',primary:'#1DEBFF',primaryHover:'#00CDE2',accent:'#4F7DFF',number:'#1DEBFF',danger:'#FF4A6E',success:'#38F0A1',meta:'#03141A'},
    'sunset-daily':{base:'light-sand',bg:'#FFF3EC',deep:'#F8E0D3',card:'#FFFFFF',panel:'#FFF9F5',hover:'#FBE7DC',input:'#FFFFFF',border:'#F0B899',text:'#37170E',muted:'#7A5A50',soft:'#9C7A70',primary:'#FF5A1F',primaryHover:'#E8450C',accent:'#FF2F92',number:'#F04400',danger:'#E93456',success:'#169E69',meta:'#FFF3EC'},
    'sunset-dark':{base:'carbon',bg:'#1A080B',deep:'#0B0305',card:'#2A1016',panel:'#210C11',hover:'#3A1720',input:'#250E14',border:'#8C384B',text:'#FFF7F2',muted:'#E1B0A3',soft:'#AE7A70',primary:'#FF6535',primaryHover:'#F14E1B',accent:'#FF37A8',number:'#FF8C42',danger:'#FF365F',success:'#3AE08E',meta:'#1A080B'},
    'royal-daily':{base:'light-neutral',bg:'#F6F2FF',deep:'#E9E0FB',card:'#FFFFFF',panel:'#FBF9FF',hover:'#ECE3FA',input:'#FFFFFF',border:'#BCA5E6',text:'#241435',muted:'#675576',soft:'#8B7899',primary:'#7B2CFF',primaryHover:'#6417DF',accent:'#FFB400',number:'#7B2CFF',danger:'#E93B60',success:'#119E6A',meta:'#F6F2FF'},
    'royal-dark':{base:'carbon',bg:'#0E0719',deep:'#05030A',card:'#1A0F2C',panel:'#140C23',hover:'#271640',input:'#170D28',border:'#65409E',text:'#FBF7FF',muted:'#C7B2E0',soft:'#927BAB',primary:'#A95CFF',primaryHover:'#8E3DE5',accent:'#FFD84A',number:'#C884FF',danger:'#FF4A70',success:'#44E39A',meta:'#0E0719'}
  };

  const LABELS={
    broadcast:'Classic Electric Dark',stadium:'Stadium Neon Dark',carbon:'Carbon Electric Dark',
    'light-neutral':'Classic Electric Light','light-blue':'Neon Purple Light','light-sand':'Modern Electric Light',
    'ocean-daily':'Ocean Electric Light','ocean-dark':'Ocean Electric Dark',
    'sunset-daily':'Sunset Electric Light','sunset-dark':'Sunset Electric Dark',
    'royal-daily':'Royal Electric Light','royal-dark':'Royal Electric Dark'
  };

  const VARS={
    bg:'--theme-bg',deep:'--theme-bg-deep',card:'--theme-card',panel:'--theme-panel',hover:'--theme-hover',
    input:'--theme-input',border:'--theme-border',text:'--theme-text',muted:'--theme-muted',soft:'--theme-soft',
    primary:'--theme-primary',primaryHover:'--theme-primary-hover',accent:'--theme-accent',number:'--theme-number',
    danger:'--theme-danger',success:'--theme-success'
  };

  function normalize(name){return Object.prototype.hasOwnProperty.call(THEMES,name)?name:'broadcast';}
  function isLight(name){return name.startsWith('light-')||name.endsWith('-daily');}

  function apply(name,persist=true){
    name=normalize(name);
    const t=THEMES[name];
    const root=document.documentElement;

    root.setAttribute('data-live-theme',t.base||name);
    root.setAttribute('data-theme-choice',name);
    Object.entries(VARS).forEach(([key,cssVar])=>root.style.setProperty(cssVar,t[key],'important'));
    root.style.setProperty('--theme-glow',t.primary,'important');
    root.style.setProperty('--theme-glow-accent',t.accent,'important');
    root.style.setProperty('background-color',t.meta,'important');
    root.style.colorScheme=isLight(name)?'light':'dark';

    if(document.body)document.body.style.setProperty('background-color',t.bg,'important');

    document.querySelectorAll('[data-theme-option]').forEach(btn=>{
      const active=btn.dataset.themeOption===name;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-pressed',active?'true':'false');
    });

    const label=document.getElementById('current-theme-label');
    if(label)label.textContent=LABELS[name]||name;
    const status=document.getElementById('theme-save-status');
    if(status)status.textContent='Salvato su questo dispositivo';

    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.content=t.meta;
    const scheme=document.querySelector('meta[name="color-scheme"]');
    if(scheme)scheme.content=isLight(name)?'light':'dark';
    const ms=document.querySelector('meta[name="msapplication-navbutton-color"]');
    if(ms)ms.content=t.meta;

    if(persist){
      try{localStorage.setItem(KEY,name);}catch(_){}
    }

    requestAnimationFrame(()=>{
      window.updateLiveAstaTeamCards?.();
      window.fitAuctionNames?.();
      window.refreshLiveAstaMobileBoardDev?.();
    });
    return name;
  }

  function reapplySaved(){
    let saved='broadcast';
    try{saved=localStorage.getItem(KEY)||'broadcast';}catch(_){}
    apply(saved,false);
  }

  window.applyLiveAstaTheme=apply;
  window.setLiveAstaTheme=name=>apply(name,true);
  window.LiveAstaElectricThemes=THEMES;

  reapplySaved();
  /* theme.js has an older pageshow listener; this later listener restores the DEV electric palette. */
  window.addEventListener('pageshow',reapplySaved);
})();
