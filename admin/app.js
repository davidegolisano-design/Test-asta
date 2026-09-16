(() => {
  'use strict';

  const config = window.LIVEASTA_ADMIN_CONFIG;
  const supabaseFactory = window.supabase?.createClient;

  if (!config || typeof supabaseFactory !== 'function') {
    document.body.innerHTML = '<p style="padding:20px;color:#fff">Configurazione Admin non disponibile.</p>';
    return;
  }

  const client = supabaseFactory(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const els = {
    loadingLine: document.getElementById('loadingLine'),
    loginView: document.getElementById('loginView'),
    dashboardView: document.getElementById('dashboardView'),
    loginForm: document.getElementById('loginForm'),
    loginButton: document.getElementById('loginButton'),
    loginError: document.getElementById('loginError'),
    passwordInput: document.getElementById('passwordInput'),
    logoutButton: document.getElementById('logoutButton'),
    refreshButton: document.getElementById('refreshButton'),
    pendingBadge: document.getElementById('pendingBadge'),
    pendingList: document.getElementById('pendingList'),
    historyList: document.getElementById('historyList'),
    globalError: document.getElementById('globalError'),
    sessionLabel: document.getElementById('sessionLabel'),
    versionLabel: document.getElementById('versionLabel'),
    notificationButton: document.getElementById('notificationButton'),
    notificationStatus: document.getElementById('notificationStatus')
  };

  const state = {
    adminPassword: '',
    loading: false,
    pollTimer: null,
    firstSnapshot: true,
    knownPendingIds: new Set(),
    approvingIds: new Set(),
    serviceWorkerRegistration: null,
    notificationEnabled: localStorage.getItem('liveasta-admin-notifications') === '1'
  };

  const targetRoomId = new URLSearchParams(location.search).get('room');

  function setLoading(value) {
    state.loading = Boolean(value);
    els.loadingLine.classList.toggle('hidden', !state.loading);
    els.refreshButton.disabled = state.loading;
  }

  function showError(element, message) {
    element.textContent = message || '';
    element.classList.toggle('hidden', !message);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  async function verifySuperuser(password) {
    const { data, error } = await client.rpc('liveasta_verify_superuser', { p_password: password });
    if (error) throw error;
    return data === true;
  }

  async function fetchSnapshot() {
    const fields = 'id,name,created_at,updated_at,approved,game_mode';
    const [pendingResult, recentResult] = await Promise.all([
      client.from('fanta_rooms')
        .select(fields)
        .eq('approved', false)
        .order('created_at', { ascending: false }),
      client.from('fanta_rooms')
        .select(fields)
        .eq('approved', true)
        .order('updated_at', { ascending: false })
        .limit(12)
    ]);

    if (pendingResult.error) throw pendingResult.error;
    if (recentResult.error) throw recentResult.error;

    return {
      pending: pendingResult.data || [],
      recent: recentResult.data || []
    };
  }

  function renderPending(rooms) {
    const list = Array.isArray(rooms) ? rooms : [];
    els.pendingBadge.textContent = String(list.length);
    els.pendingBadge.classList.toggle('hidden', !state.adminPassword);
    updateAppBadge(list.length);

    if (!list.length) {
      els.pendingList.innerHTML = '<div class="empty-state">Nessuna stanza da approvare.</div>';
      return;
    }

    els.pendingList.innerHTML = list.map((room) => {
      const isTarget = targetRoomId && String(room.id) === String(targetRoomId);
      const busy = state.approvingIds.has(String(room.id));
      return `
        <article class="room-card${isTarget ? ' is-target' : ''}" data-room-id="${escapeHtml(room.id)}">
          <div class="room-top">
            <div>
              <h3 class="room-name">${escapeHtml(room.name)}</h3>
              <p class="room-meta">Creata ${escapeHtml(formatDate(room.created_at))}<br>Modalità: ${escapeHtml(room.game_mode || 'classic')}</p>
            </div>
            <span class="status-chip pending">In attesa</span>
          </div>
          <div class="room-actions single-action">
            <button class="success-button" type="button" data-approve="${escapeHtml(room.id)}" ${busy ? 'disabled' : ''}>${busy ? 'Approvazione…' : 'Approva'}</button>
          </div>
        </article>`;
    }).join('');

    els.pendingList.querySelectorAll('[data-approve]').forEach((button) => {
      button.addEventListener('click', () => approveRoom(button.dataset.approve));
    });

    if (targetRoomId) {
      requestAnimationFrame(() => {
        const target = els.pendingList.querySelector(`[data-room-id="${CSS.escape(String(targetRoomId))}"]`);
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }

  function renderHistory(rooms) {
    const list = Array.isArray(rooms) ? rooms : [];
    if (!list.length) {
      els.historyList.innerHTML = '<div class="empty-state">Nessuna stanza approvata.</div>';
      return;
    }

    els.historyList.innerHTML = list.map((room) => `
      <div class="history-row">
        <div>
          <h3 class="history-title">${escapeHtml(room.name)}</h3>
          <p class="history-meta">${escapeHtml(formatDate(room.updated_at || room.created_at))}</p>
        </div>
        <span class="status-chip approved">Approvata</span>
      </div>`).join('');
  }

  async function updateAppBadge(count) {
    try {
      if (count > 0 && 'setAppBadge' in navigator) await navigator.setAppBadge(count);
      if (count === 0 && 'clearAppBadge' in navigator) await navigator.clearAppBadge();
    } catch (_) { /* badge non supportato o negato */ }
  }

  function canNotify() {
    return Boolean(
      state.notificationEnabled &&
      'Notification' in window &&
      Notification.permission === 'granted' &&
      state.serviceWorkerRegistration
    );
  }

  async function notifyNewRoom(room) {
    if (!canNotify()) return;
    try {
      await state.serviceWorkerRegistration.showNotification('Nuova stanza da approvare', {
        body: `Nome stanza: ${room.name || 'Senza nome'}`,
        icon: '../icon-192.png',
        badge: '../icon-192.png',
        tag: `liveasta-admin-room-${room.id}`,
        renotify: false,
        data: { url: `./?room=${encodeURIComponent(room.id)}` }
      });
    } catch (_) { /* la dashboard resta comunque aggiornata */ }
  }

  async function detectNewPending(rooms) {
    const list = Array.isArray(rooms) ? rooms : [];
    const nextIds = new Set(list.map((room) => String(room.id)));

    if (!state.firstSnapshot) {
      const newRooms = list.filter((room) => !state.knownPendingIds.has(String(room.id)));
      for (const room of newRooms) await notifyNewRoom(room);
    }

    state.knownPendingIds = nextIds;
    state.firstSnapshot = false;
  }

  async function refreshSnapshot({ quiet = false } = {}) {
    if (!state.adminPassword) return;
    if (!quiet) setLoading(true);
    showError(els.globalError, '');

    try {
      const snapshot = await fetchSnapshot();
      await detectNewPending(snapshot.pending);
      renderPending(snapshot.pending);
      renderHistory(snapshot.recent);
    } catch (error) {
      showError(els.globalError, error.message || 'Aggiornamento non riuscito.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  async function approveRoom(roomId) {
    roomId = String(roomId || '');
    if (!roomId || !state.adminPassword || state.approvingIds.has(roomId)) return;

    state.approvingIds.add(roomId);
    showError(els.globalError, '');
    setLoading(true);
    try {
      const { data, error } = await client.rpc('liveasta_set_room_approval', {
        p_room_id: roomId,
        p_approved: true,
        p_password: state.adminPassword
      });
      if (error) throw error;
      if (data !== true) throw new Error('Autorizzazione Superuser non valida.');
      await refreshSnapshot({ quiet: true });
    } catch (error) {
      showError(els.globalError, error.message || 'Approvazione non riuscita.');
    } finally {
      state.approvingIds.delete(roomId);
      setLoading(false);
    }
  }

  function stopPolling() {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = null;
  }

  function startPolling() {
    stopPolling();
    const delay = Math.max(5000, Number(config.pollIntervalMs) || 10000);
    state.pollTimer = setInterval(() => refreshSnapshot({ quiet: true }), delay);
  }

  function updateNotificationUI() {
    if (!('Notification' in window)) {
      els.notificationStatus.textContent = 'Questo browser non supporta le notifiche Web.';
      els.notificationButton.disabled = true;
      return;
    }

    if (Notification.permission === 'denied') {
      state.notificationEnabled = false;
      localStorage.removeItem('liveasta-admin-notifications');
      els.notificationStatus.textContent = 'Notifiche bloccate nelle impostazioni del browser.';
      els.notificationButton.textContent = 'Notifiche bloccate';
      els.notificationButton.disabled = true;
      return;
    }

    const active = state.notificationEnabled && Notification.permission === 'granted';
    els.notificationStatus.textContent = active
      ? 'Attive: una nuova stanza genera una notifica mentre LIVEASTA Admin è in esecuzione.'
      : 'Non attive.';
    els.notificationButton.textContent = active ? 'Disattiva notifiche' : 'Attiva notifiche';
    els.notificationButton.disabled = false;
  }

  async function toggleNotifications() {
    if (!('Notification' in window)) return;

    if (state.notificationEnabled && Notification.permission === 'granted') {
      state.notificationEnabled = false;
      localStorage.removeItem('liveasta-admin-notifications');
      updateNotificationUI();
      return;
    }

    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

    state.notificationEnabled = permission === 'granted';
    if (state.notificationEnabled) localStorage.setItem('liveasta-admin-notifications', '1');
    else localStorage.removeItem('liveasta-admin-notifications');
    updateNotificationUI();
  }

  async function login(password) {
    const valid = await verifySuperuser(password);
    if (!valid) throw new Error('Password Superuser errata.');

    state.adminPassword = password;
    state.firstSnapshot = true;
    state.knownPendingIds = new Set();
    els.passwordInput.value = '';
    els.loginView.classList.add('hidden');
    els.dashboardView.classList.remove('hidden');
    els.logoutButton.classList.remove('hidden');
    els.pendingBadge.classList.remove('hidden');
    els.sessionLabel.textContent = 'Superuser connesso';
    startPolling();
    updateNotificationUI();
    await refreshSnapshot();
  }

  function logout() {
    state.adminPassword = '';
    state.firstSnapshot = true;
    state.knownPendingIds = new Set();
    state.approvingIds.clear();
    stopPolling();
    updateAppBadge(0);
    els.loginView.classList.remove('hidden');
    els.dashboardView.classList.add('hidden');
    els.logoutButton.classList.add('hidden');
    els.pendingBadge.classList.add('hidden');
    els.pendingList.innerHTML = '';
    els.historyList.innerHTML = '';
    els.sessionLabel.textContent = 'Accesso Superuser';
    showError(els.globalError, '');
    els.passwordInput.focus();
  }

  els.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.loading) return;
    const password = els.passwordInput.value;
    if (!password) return;

    setLoading(true);
    els.loginButton.disabled = true;
    showError(els.loginError, '');
    try {
      await login(password);
    } catch (error) {
      state.adminPassword = '';
      showError(els.loginError, error.message || 'Accesso non riuscito.');
    } finally {
      els.loginButton.disabled = false;
      setLoading(false);
    }
  });

  els.logoutButton.addEventListener('click', logout);
  els.refreshButton.addEventListener('click', () => refreshSnapshot());
  els.notificationButton.addEventListener('click', toggleNotifications);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.adminPassword) refreshSnapshot({ quiet: true });
  });
  window.addEventListener('online', () => {
    if (state.adminPassword) refreshSnapshot({ quiet: true });
  });
  window.addEventListener('beforeunload', () => {
    state.adminPassword = '';
    stopPolling();
  });

  async function bootstrap() {
    els.versionLabel.textContent = config.version;
    if ('serviceWorker' in navigator) {
      try {
        state.serviceWorkerRegistration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
        await state.serviceWorkerRegistration.update();
      } catch (_) {
        state.serviceWorkerRegistration = null;
      }
    }
    updateNotificationUI();
  }

  bootstrap().catch((error) => showError(els.loginError, error.message || 'Errore di inizializzazione.'));
})();
