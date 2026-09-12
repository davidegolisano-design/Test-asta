(function(){
  const META_COLORS={
    broadcast:'#0D1117',
    stadium:'#071521',
    carbon:'#0E0E0F',
    crimson:'#130E12',
    emerald:'#07130F',
    violet:'#100C18',
    daily:'#F4F7FB','light-neutral':'#F4F6F8','light-blue':'#EEF5FB','light-sand':'#F8F4EC'
  };

  try{
    var t=localStorage.getItem('liveasta_theme')||'broadcast';
    var allowed=['broadcast','stadium','carbon','light-neutral','light-blue','light-sand','ocean-daily','ocean-dark','sunset-daily','sunset-dark','royal-daily','royal-dark'];
    if(!allowed.includes(t)){t='broadcast';localStorage.setItem('liveasta_theme','broadcast');}
    if(!Object.prototype.hasOwnProperty.call(META_COLORS,t)) t='broadcast';
    var color=META_COLORS[t];

    document.documentElement.setAttribute('data-live-theme',t);
    document.documentElement.style.background=color;

    var meta=document.querySelector('meta[name="theme-color"]');
    if(!meta){
      meta=document.createElement('meta');
      meta.name='theme-color';
      document.head.appendChild(meta);
    }
    meta.content=color;

    var ms=document.querySelector('meta[name="msapplication-navbutton-color"]');
    if(ms) ms.content=color;
  }catch(e){
    document.documentElement.setAttribute('data-live-theme','broadcast');
  }
})();
