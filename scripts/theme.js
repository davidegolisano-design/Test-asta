// === liveasta-theme-runtime-fix ===
(function(){
  const KEY='liveasta_theme';
  const THEMES=window.LiveAstaThemes;

  const LABELS=window.LiveAstaThemeLabels;

  const VARS={
    bg:'--theme-bg',deep:'--theme-bg-deep',card:'--theme-card',panel:'--theme-panel',
    hover:'--theme-hover',input:'--theme-input',border:'--theme-border',text:'--theme-text',
    muted:'--theme-muted',soft:'--theme-soft',primary:'--theme-primary',
    primaryHover:'--theme-primary-hover',accent:'--theme-accent',number:'--theme-number',
    danger:'--theme-danger',success:'--theme-success',marker:'--theme-marker',accentMarker:'--theme-accent-marker',onMarker:'--theme-on-marker'
  };

  function normalize(name){return Object.prototype.hasOwnProperty.call(THEMES,name)?name:'broadcast';}

  function apply(name,persist=true){
    name=normalize(name);
    const t=THEMES[name];
    const root=document.documentElement;

    /* base mantiene compatibili tutte le regole light/dark già presenti */
    root.setAttribute('data-live-theme',t.base||name);
    root.setAttribute('data-theme-choice',name);
    const light=name.startsWith('light-')||name.endsWith('-daily');
    root.style.colorScheme=light?'light':'dark';
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content',light?'light':'dark');

    Object.entries(VARS).forEach(([k,cssVar])=>{
      root.style.setProperty(cssVar,t[k],'important');
    });

    root.style.setProperty('background-color',t.meta,'important');
    if(document.body)document.body.style.setProperty('background-color',t.bg,'important');

    document.querySelectorAll('[data-theme-option]').forEach(btn=>{
      const active=btn.dataset.themeOption===name;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-pressed',active?'true':'false');
      const sample=THEMES[btn.dataset.themeOption];
      btn.querySelectorAll('.theme-swatches i').forEach((swatch,i)=>swatch.style.setProperty('background',[sample.bg,sample.marker,sample.accentMarker][i],'important'));
      const caption=btn.querySelector('strong');
      if(caption)caption.textContent=LABELS[btn.dataset.themeOption];
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
      window.refreshLiveAstaMobileBoardDev?.();
    });
    return name;
  }

  window.LiveAstaElectricThemes=THEMES;
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

    // Il selettore temi è un overlay globale: non deve dipendere dalla schermata
    // Impostazioni. Spostandolo sotto <body> resta graficamente identico ma
    // si apre sopra la schermata corrente (Home o Impostazioni).
    if(menu.parentElement!==document.body){
      document.body.appendChild(menu);
    }

    menu.classList.add('open');
    menu.setAttribute('aria-hidden','false');
    document.body.classList.add('theme-submenu-open');
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
