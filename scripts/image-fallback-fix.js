// LIVEASTA QA fix — keep player cards stable when a miniature is missing.
(function(){
  if(typeof window.playerImageFallback==='function')return;

  const fallbackSvg="data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='48' fill='%23141820'/%3E%3Ccircle cx='256' cy='190' r='92' fill='%23343c49'/%3E%3Cpath d='M96 470c14-103 74-158 160-158s146 55 160 158' fill='%23343c49'/%3E%3C/svg%3E";

  window.playerImageFallback=function playerImageFallback(img){
    if(!img || img.dataset.liveastaFallbackBusy==='1')return;
    img.dataset.liveastaFallbackBusy='1';
    img.src=fallbackSvg;
    setTimeout(()=>{
      try{delete img.dataset.liveastaFallbackBusy;}catch(_){img.dataset.liveastaFallbackBusy='0';}
    },0);
  };
})();
