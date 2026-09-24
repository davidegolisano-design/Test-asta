/* One candidate for GitHack and the public domain. No URL/localStorage override. */
(function () {
  'use strict';
  const production = location.protocol === 'https:' && ['www.liveasta.it','liveasta.it'].includes(location.hostname);
  window.LIVEASTA_CONFIG = Object.freeze({
    version: 'v1.07.4',
    environment: production ? 'production' : 'dev-premium',
    serviceWorker: production,
    publicUrl: 'https://www.liveasta.it/'
  });
})();
