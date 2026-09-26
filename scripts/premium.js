/* LIVEASTA Premium: one catalog, server-owned room entitlements, no local grants. */
(function () {
  'use strict';
  const ENVIRONMENT = window.LIVEASTA_CONFIG?.environment || 'dev-premium';
  const TABLE = 'liveasta_premium_entitlements';
  const FEATURES = Object.freeze([
    {id:'sealed', name:'Busta chiusa', description:'Offerte segrete, apertura delle buste e spareggi.'},
    {id:'random', name:'Random', description:'Estrazione di un calciatore e asta automatica per ruoli.'},
    {id:'turns', name:'Banditura a turni', description:'Ordine di chiamata, sequenza dei ruoli e gestione dei turni.'},
    {id:'ready', name:'Ready / Skip', description:'Ogni squadra sceglie se è pronta prima del countdown.'},
    {id:'budget', name:'Budget per reparto', description:'Pianifica le spese con soglie e redistribuzione del budget.'},
    {id:'chat', name:'Chat della stanza', description:'Messaggi live tra banditore e partecipanti.'},
    {id:'roster_io', name:'Importa ed esporta rose', description:'Importa le rose da CSV ed esporta i risultati della stanza.'},
    {id:'miniatures', name:'Pacchetto miniature', description:'Tutte le miniature personalizzate dei calciatori, nelle plance e nelle rose.'}
  ].map(Object.freeze));
  let adapter = {}, roomId = '', features = new Set(), loaded = false, failure = false;
  let revision = -1, generation = 0, subscription = null, polling = null, refreshing = null;
  let adminRoom = null, adminRow = null, adminBusy = false, adminGeneration = 0;
  let requestedAt = null, requesting = false, offerFeature = '', adminNotifications = [];
  const $ = id => document.getElementById(id);
  const has = id => loaded && features.has(id);
  const normalize = values => new Set(FEATURES.filter(f => Array.isArray(values) && values.includes(f.id)).map(f => f.id));
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function read(id) {
    const client = adapter.getClient?.();
    if (!client) throw new Error('Connessione non disponibile');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const {data,error} = await client.from(TABLE).select('room_id,environment,features,revision,updated_at,requested_at,request_cycle')
        .eq('room_id', id).eq('environment', ENVIRONMENT).abortSignal(controller.signal).maybeSingle();
      if (error) throw error;
      return data || {room_id:id, environment:ENVIRONMENT, features:[], revision:0};
    } finally { clearTimeout(timer); }
  }

  function apply(row) {
    if (String(row.room_id) !== roomId || row.environment !== ENVIRONMENT || Number(row.revision) < revision) return;
    const next = normalize(row.features);
    const changed = !loaded || FEATURES.some(f => features.has(f.id) !== next.has(f.id));
    features = next; revision = Number(row.revision); loaded = true; failure = false;
    requestedAt = row.requested_at || null;
    if (changed) adapter.onChange?.();
    decorate();
    updateRequestButton();
    window.dispatchEvent(new CustomEvent('liveasta:premium-change'));
  }

  async function refresh() {
    if (!roomId || refreshing) return refreshing;
    const id = roomId, ticket = generation;
    const task = (async () => {
      try { const row = await read(id); if (ticket === generation) apply(row); }
      catch (_) {
        if (ticket !== generation) return;
        // A temporary outage must not cancel a round already in progress.
        // First load remains locked; a previously verified session keeps its grants.
        failure = true; decorate();
      }
    })();
    refreshing = task;
    try { await task; } finally { if (refreshing === task) refreshing = null; }
  }

  function disconnect() {
    generation++; clearInterval(polling); polling = null; refreshing = null;
    if (subscription) adapter.getClient?.()?.removeChannel(subscription).catch(() => {});
    subscription = null; roomId = ''; features = new Set(); loaded = false; failure = false; revision = -1;
    requestedAt = null; requesting = false;
    $('premium-offer-dialog')?.close();
    decorate();
    window.dispatchEvent(new CustomEvent('liveasta:premium-change'));
  }

  async function connect(id) {
    disconnect(); roomId = String(id); const ticket = generation;
    await refresh();
    if (ticket !== generation) return;
    subscription = adapter.getClient().channel('premium:' + ENVIRONMENT + ':' + roomId)
      .on('postgres_changes', {event:'*', schema:'public', table:TABLE, filter:'room_id=eq.' + roomId}, () => refresh())
      .subscribe(status => { if (status === 'SUBSCRIBED') refresh(); });
    startPolling();
  }

  function startPolling() {
    if (roomId && !polling) polling = setInterval(() => { if (!document.hidden) refresh(); }, 10000);
  }

  function dialog(id) {
    let el = $(id);
    if (!el) {
      el = document.createElement('dialog'); el.id = id; el.className = 'premium-dialog';
      el.addEventListener('click', event => { if (event.target === el) el.close(); });
      el.addEventListener('close', () => {
        if (id === 'premium-admin-dialog') { adminGeneration++; adminRoom = null; }
      });
      document.body.appendChild(el);
    }
    return el;
  }
  function show(el) {
    document.activeElement?.blur?.();
    if (!el.open) el.showModal();
    el.querySelector('[data-premium-close]')?.focus({preventScroll:true});
  }
  function closeButton() { return '<button type="button" class="premium-close" data-premium-close aria-label="Chiudi">✕</button>'; }
  function wireClose(el) { el.querySelector('[data-premium-close]').onclick = () => el.close(); }

  function offer(id) {
    const feature = FEATURES.find(f => f.id === id), el = dialog('premium-offer-dialog');
    offerFeature = id;
    const unavailable = !!roomId && !loaded;
    el.innerHTML = `<header class="premium-dialog-head"><span class="premium-label">✦ LIVEASTA PREMIUM</span>${closeButton()}</header>
      <div class="premium-dialog-content"><h2 id="premium-offer-title">${unavailable ? 'Verifica abilitazioni' : 'Acquista Premium'}</h2>
      <p>${unavailable ? (failure ? 'Non riusciamo a verificare il Premium della stanza. Riprova tra poco.' : 'Stiamo verificando le abilitazioni della stanza.') : feature ? '<b>' + escape(feature.name) + '</b> · ' + escape(feature.description) + ' Sblocca questa funzione con Premium.' : 'Un unico pacchetto per tutta la stanza, a disposizione di banditore e giocatori.'}</p>
      <ul class="premium-feature-list">${FEATURES.map(f => `<li class="${f.id === id ? 'selected' : ''}"><span>${has(f.id) ? '✓' : '◇'}</span><div><b>${f.name}</b><small>${f.description}</small></div></li>`).join('')}</ul>
      <p class="premium-free-note">Classic e Mantra restano gratuiti, con miniature generiche per portieri e giocatori di movimento. Puoi completare l’asta, gestire crediti e rose.</p>
      <label id="premium-request-email-row" class="premium-email-row" hidden>Email di contatto
        <input id="premium-request-email" type="email" inputmode="email" autocomplete="email" maxlength="320" placeholder="nome@email.it">
      </label>
      <div id="premium-activation-info" class="premium-notice" role="status" hidden></div></div>
      <footer class="premium-dialog-foot"><button type="button" class="premium-primary" id="premium-activation">Richiedi Premium</button><p id="premium-request-status" role="status"></p><p>Premium è valido per tutti i partecipanti della stanza. Nessun pagamento automatico.</p></footer>`;
    el.setAttribute('aria-labelledby','premium-offer-title'); wireClose(el);
    $('premium-activation').onclick = async () => {
      if (roomId && !loaded) { await refresh(); offer(offerFeature); }
      else await requestPremium();
    };
    updateRequestButton();
    show(el);
  }

  function updateRequestButton() {
    const button = $('premium-activation'), status = $('premium-request-status');
    if (!button || !status) return;
    const complete = loaded && features.size === FEATURES.length;
    button.disabled = requesting || !!requestedAt || complete;
    button.textContent = requesting ? 'Invio…' : complete ? 'Premium attivo' : requestedAt ? 'Richiesta già inviata' : roomId && !loaded ? 'Riprova verifica' : 'Richiedi Premium';
    status.textContent = complete ? 'Il pacchetto è già attivo per questa stanza.' : requestedAt ? 'La richiesta è registrata per tutta la stanza. Potrete richiederlo di nuovo dopo la disattivazione completa del Premium.' : !roomId ? 'Entra in una stanza per richiedere il Premium.' : 'La richiesta sarà inviata all’amministratore di LIVEASTA.';
    if (requestedAt || complete) {
      if ($('premium-activation-info')) $('premium-activation-info').hidden = true;
      if ($('premium-request-email-row')) $('premium-request-email-row').hidden = true;
    }
  }

  async function requestPremium() {
    const info = $('premium-activation-info');
    const notice = message => { info.textContent = message; info.hidden = false; info.scrollIntoView({block:'nearest'}); };
    if (!roomId) { notice('Entra nella stanza per cui desideri attivare Premium, poi invia la richiesta.'); return; }
    if (requesting || requestedAt || features.size === FEATURES.length) return;
    const room = adapter.getCurrentRoom?.();
    if (String(room?.id) !== roomId || !room?.password) { notice('Entra di nuovo nella stanza per inviare la richiesta.'); return; }
    const ticket = generation, target = roomId;
    requesting = true; updateRequestButton(); info.hidden = true;
    try {
      const {data,error} = await adapter.getClient().rpc('liveasta_request_premium', {
        p_room_id:target, p_environment:ENVIRONMENT, p_room_password:room.password, p_email:$('premium-request-email')?.value.trim() || null
      });
      if (error) throw error;
      if (ticket !== generation) return;
      if (data?.needs_email) {
        $('premium-request-email-row').hidden = false;
        notice('Questa stanza non ha ancora un contatto email. Inseriscilo per inviare la richiesta.');
      } else if (data?.entitlement && (data.entitlement.requested_at || data.status === 'active')) {
        apply(data.entitlement);
      } else throw new Error('Risposta non valida');
    } catch (error) {
      if (ticket !== generation) return;
      notice(error.code === '22023' ? 'Inserisci un indirizzo email valido.' : error.code === '42501' ? 'Stanza non approvata o accesso scaduto. Entra di nuovo nella stanza.' : 'Invio non confermato. Riprova: una richiesta già registrata non verrà duplicata.');
    } finally { if (ticket === generation) { requesting = false; updateRequestButton(); } }
  }
  function requireFeature(id) { if (has(id)) return true; offer(id); return false; }

  function decorate() {
    document.querySelectorAll('[data-premium-feature]').forEach(el => {
      const id = el.dataset.premiumFeature, available = has(id);
      el.classList.add('premium-feature'); el.classList.toggle('premium-locked', !available);
      el.classList.toggle('premium-unlocked', available);
      if (el.matches('article')) {
        el.tabIndex = available ? -1 : 0;
        el.setAttribute('aria-label', (FEATURES.find(f => f.id === id)?.name || id) + (available ? ' · Premium abilitato' : ' · Funzione Premium, premi per sbloccare'));
      }
      // A locked numeric input must not open the mobile keyboard or catch Tab.
      el.querySelectorAll('input:not([type=checkbox]),select').forEach(input => {
        if (!available && input.dataset.premiumTab === undefined) { input.dataset.premiumTab = input.getAttribute('tabindex') ?? ''; input.tabIndex = -1; }
        if (available && input.dataset.premiumTab !== undefined) {
          const prev = input.dataset.premiumTab; if (prev === '') input.removeAttribute('tabindex'); else input.setAttribute('tabindex',prev);
          delete input.dataset.premiumTab;
        }
      });
    });
    document.querySelectorAll('[data-premium-room-status]').forEach(el => {
      el.textContent = !roomId ? 'PREMIUM' : !loaded ? 'Verifica Premium…' : features.size === FEATURES.length ? '✦ PREMIUM ATTIVO' : features.size ? `✦ PREMIUM · ${features.size}/${FEATURES.length}` : '◇ SCOPRI PREMIUM';
    });
  }

  function renderAdmin(error = '') {
    if (!adminRoom) return;
    const el = dialog('premium-admin-dialog'), grants = normalize(adminRow?.features);
    const all = grants.size === FEATURES.length, locked = adminBusy || !adminRow;
    el.innerHTML = `<header class="premium-dialog-head"><span class="premium-label">✦ PREMIUM · SUPERUSER</span>${closeButton()}</header>
      <div class="premium-dialog-content"><h2 id="premium-admin-title">${escape(adminRoom.name)}</h2><p>Abilita l’accesso per tutti i partecipanti. Il banditore sceglierà poi quali modalità utilizzare.</p>
      <label class="premium-toggle-row premium-package"><span><b>Pacchetto completo</b><small>Tutte le ${FEATURES.length} funzioni Premium</small></span><input type="checkbox" role="switch" data-admin-premium="all" ${all ? 'checked' : ''} ${locked ? 'disabled' : ''}><i aria-hidden="true"></i></label>
      <div class="premium-admin-features">${FEATURES.map(f => `<label class="premium-toggle-row"><span><b>${f.name}</b><small>${f.description}</small></span><input type="checkbox" role="switch" data-admin-premium="${f.id}" ${grants.has(f.id) ? 'checked' : ''} ${locked ? 'disabled' : ''}><i aria-hidden="true"></i></label>`).join('')}</div>
      <p class="premium-free-note">Classic, Mantra e miniature generiche: sempre gratuiti.</p>
      <p>${adminRow?.requested_at ? 'Richiesta Premium registrata per questa stanza.' : 'Nessuna richiesta Premium in attesa.'} La revoca di tutte le funzioni permette una nuova richiesta.</p>
      ${adminNotifications.map(n => `<p class="premium-mail-status">${n.kind === 'room_created' ? 'Email nuova stanza' : 'Email richiesta Premium'}: <b>${({pending:'in coda',sending:'invio in corso',sent:'inviata',failed:'invio non riuscito',uncertain:'esito da verificare'})[n.state] || 'da verificare'}</b></p>`).join('')}
      ${adminNotifications.some(n=>['pending','failed'].includes(n.state)) ? '<button type="button" class="premium-primary" id="premium-retry-mail">Riprova invio email</button>' : ''}</div>
      <footer class="premium-dialog-foot"><p id="premium-admin-status" role="status">${escape(error || (adminBusy ? 'Salvataggio…' : !adminRow ? 'Caricamento…' : `Abilitazioni salvate · ${grants.size} su ${FEATURES.length} funzioni`))}</p>${error ? '<button type="button" class="premium-primary" id="premium-admin-retry">Ricarica abilitazioni</button>' : ''}<small>La revoca non interrompe il turno già iniziato.</small></footer>`;
    el.setAttribute('aria-labelledby','premium-admin-title'); wireClose(el);
    const master = el.querySelector('[data-admin-premium=all]'); master.indeterminate = grants.size > 0 && !all;
    el.querySelectorAll('[data-admin-premium]').forEach(input => input.addEventListener('change', () => saveAdmin(input.dataset.adminPremium,input.checked)));
    if ($('premium-admin-retry')) $('premium-admin-retry').onclick = () => openAdmin(adminRoom.id);
    if ($('premium-retry-mail')) $('premium-retry-mail').onclick = async () => {
      $('premium-retry-mail').disabled = true;
      const ticket = adminGeneration;
      try { await readAdminNotifications(adminRoom.id,true); if (ticket === adminGeneration) renderAdmin(); }
      catch (_) { if (ticket === adminGeneration) renderAdmin('Notifica non confermata. Riprova tra poco.'); }
    };
  }

  async function readAdminNotifications(id,retry=false) {
    const ticket = adminGeneration;
    const {data,error} = await adapter.getClient().rpc('liveasta_admin_premium_notifications', {
      p_room_id:id,p_environment:ENVIRONMENT,p_password:adapter.getPassword?.(),p_retry:retry
    });
    if (error) throw error;
    if (ticket === adminGeneration) adminNotifications = Array.isArray(data) ? data : [];
  }

  async function openAdmin(id) {
    if (!adapter.getPassword?.()) { adapter.login?.(); return; }
    const room = adapter.getRooms?.().find(r => String(r.id) === String(id)); if (!room) return;
    const ticket = ++adminGeneration; adminRoom = room; adminRow = null; adminBusy = false; adminNotifications = [];
    renderAdmin(); show(dialog('premium-admin-dialog'));
    try {
      const row = await read(id);
      if (ticket !== adminGeneration) return;
      adminRow = row; renderAdmin();
      // Email availability must not prevent the administrator managing grants.
      try { await readAdminNotifications(id); if (ticket === adminGeneration) renderAdmin(); }
      catch (_) { if (ticket === adminGeneration) renderAdmin('Stato email non disponibile. Le abilitazioni Premium restano gestibili.'); }
    }
    catch (_) { if (ticket === adminGeneration) renderAdmin('Lettura non riuscita. Nessuna abilitazione è stata modificata.'); }
  }

  async function saveAdmin(id, enabled) {
    if (!adminRoom || adminBusy || !adminRow) return;
    const password = adapter.getPassword?.();
    if (!password) { dialog('premium-admin-dialog').close(); adapter.login?.(); return; }
    const target = adminRoom.id, ticket = adminGeneration;
    adminBusy = true; renderAdmin();
    try {
      const {data,error} = await adapter.getClient().rpc('liveasta_set_premium_feature', {
        p_room_id:target, p_environment:ENVIRONMENT, p_feature:id, p_enabled:enabled, p_password:password
      });
      if (error) throw error;
      if (!data || !Array.isArray(data.features)) throw new Error('Risposta non valida');
      if (String(target) === roomId) apply(data);
      if (ticket !== adminGeneration) return;
      adminRow = data; adminBusy = false; renderAdmin();
      dialog('premium-admin-dialog').querySelector(`[data-admin-premium="${id}"]`)?.focus({preventScroll:true});
    } catch (error) {
      if (ticket !== adminGeneration) return;
      adminBusy = false;
      renderAdmin(error.code === '42501' ? 'Sessione superuser non valida: accedi di nuovo.' : 'Salvataggio non riuscito. Le abilitazioni precedenti restano valide.');
    }
  }

  function intercept(event) {
    const el = event.target.closest?.('[data-premium-feature]');
    if (!el || has(el.dataset.premiumFeature)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (event.type !== 'pointerdown') { offer(el.dataset.premiumFeature); queueMicrotask(() => adapter.onChange?.()); }
  }
  document.addEventListener('click',intercept,true);
  document.addEventListener('pointerdown',event => {
    if (event.target.matches?.('input,select,textarea')) intercept(event);
  },true);
  document.addEventListener('keydown',event => { if (event.key === 'Enter' || event.key === ' ') intercept(event); },true);
  document.addEventListener('visibilitychange',() => { if (!document.hidden) refresh(); });
  window.addEventListener('pageshow',() => { startPolling(); refresh(); });
  window.addEventListener('pagehide',() => { clearInterval(polling); polling = null; });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',decorate,{once:true}); else decorate();
  window.liveastaPremium = Object.freeze({features:FEATURES, environment:ENVIRONMENT,
    configure(config) { adapter = config; }, connect, disconnect, refresh, has,
    require:requireFeature, offer, openAdmin, decorate,
    status() { return {roomId, loaded, failure, features:[...features], revision}; }
  });
})();
