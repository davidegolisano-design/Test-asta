(() => {
  'use strict';

  const config = window.LIVEASTA_ADMIN_CONFIG;
  const supabaseFactory = window.supabase?.createClient;

  if (!config || typeof supabaseFactory !== 'function') {
    document.body.innerHTML = '<p style="padding:20px;color:#fff">Configurazione Admin non disponibile.</p>';
    return;
  }

  const client = supabaseFactory(config.supabaseUrl, config.supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'liveasta-admin-auth'
    },
    realtime: { params: { eventsPerSecond: 5 } }
  });

  const els = {
    loadingLine: document.getElementById('loadingLine'),
    loginView: document.getElementById('loginView'),
    dashboardView: document.getElementById('dashboardView'),
    loginForm: document.getElementById('loginForm'),
    loginButton: document.getElementById('loginButton'),
    loginError: document.getElementById('loginError'),
    emailInput: document.getElementById('emailInput'),
    passwordInput: document.getElementById('passwordInput'),
    logoutButton: document.getElementById('logoutButton'),
    refreshButton: document.getElementById('refreshButton'),
    pendingBadge: document.getElementById('pendingBadge'),
    pendingList: document.getElementById('pendingList'),
    historyList: document.getElementById('historyList'),
    globalError: document.getElementById('globalError'),
    sessionLabel: document.getElementById('sessionLabel'),
    versionLabel: document.getElementById('versionLabel')
  };

  const state = {
    session: null,
    loading: false,
    realtimeChannel: null,
    refreshTimer: null,
    snapshotRequest: 0
  };

  const targetRoomId = new URLSearchParams(location.search).get('room');

  function setLoading(loading) {
    state.loading = loading;
    els.loadingLine.classList.toggle('hidden', !loading);
    els.refreshButton.disabled = loading;
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

  async function invokeAdmin(action, payload = {}) {
    const { data, error } = await client.functions.invoke(config.adminFunctionName, {
      body: { action, ...payload }
    });
    if (error) {
      let message = error.message || 'Errore backend.';
      try {
        const context = error.context;
        if (context instanceof Response) {
          const body = await context.clone().json();
          if (body?.error) message = body.error;
        }
      } catch (_) { /* fallback sul messaggio standard */ }
      throw new Error(message);
    }
    if (!data?.ok) throw new Error(data?.error || 'Risposta backend non valida.');
    return data;
  }

  function renderPending(rooms) {
    const list = Array.isArray(rooms) ? rooms : [];
    els.pendingBadge.textContent = String(list.length);
    els.pendingBadge.classList.toggle('hidden', !state.session);

    if (!list.length) {
      els.pendingList.innerHTML = '<div class="empty-state">Nessuna stanza in attesa.</div>';
      return;
    }

    els.pendingList.innerHTML = list.map((room) => {
      const isTarget = targetRoomId && room.id === targetRoomId;
      return `
        <article class="room-card${isTarget ? ' is-target' : ''}" data-room-id="${escapeHtml(room.id)}">
          <div class="room-top">
            <div>
              <h3 class="room-name">${escapeHtml(room.name)}</h3>
              <p class="room-meta">Creata ${escapeHtml(formatDate(room.created_at))}<br>Modalità: ${escapeHtml(room.game_mode || 'classic')}</p>
            </div>
            <span class="status-chip pending">Pending</span>
          </div>
          <div class="room-actions">
            <button class="danger-button" type="button" data-action="reject" data-room-id="${escapeHtml(room.id)}">Rifiuta</button>
            <button class="success-button" type="button" data-action="approve" data-room-id="${escapeHtml(room.id)}">Approva</button>
          </div>
        </article>`;
    }).join('');

    els.pendingList.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', () => reviewRoom(button));
    });

    if (targetRoomId) {
      requestAnimationFrame(() => {
        els.pendingList.querySelector(`[data-room-id="${CSS.escape(targetRoomId)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }

  function renderHistory(rooms) {
    const list = Array.isArray(rooms) ? rooms : [];
    if (!list.length) {
      els.historyList.innerHTML = '<div class="empty-state">Nessuna decisione recente.</div>';
      return;
    }

    els.historyList.innerHTML = list.map((room) => {
      const status = room.approval_status === 'approved' ? 'approved' : 'rejected';
      const label = status === 'approved' ? 'Approvata' : 'Rifiutata';
      return `
        <div class="history-row">
          <div>
            <h3 class="history-title">${escapeHtml(room.name)}</h3>
            <p class="history-meta">${escapeHtml(formatDate(room.approval_reviewed_at || room.updated_at))}</p>
          </div>
          <span class="status-chip ${status}">${label}</span>
        </div>`;
    }).join('');
  }

  async function refreshSnapshot({ quiet = false } = {}) {
    if (!state.session) return;
    const requestId = ++state.snapshotRequest;
    if (!quiet) setLoading(true);
    showError(els.globalError, '');
    try {
      const data = await invokeAdmin('snapshot');
      if (requestId !== state.snapshotRequest) return;
      renderPending(data.pending);
      renderHistory(data.recent);
    } catch (error) {
      if (requestId === state.snapshotRequest) showError(els.globalError, error.message);
    } finally {
      if (!quiet && requestId === state.snapshotRequest) setLoading(false);
    }
  }

  async function reviewRoom(button) {
    const roomId = button.dataset.roomId;
    const decision = button.dataset.action;
    if (!roomId || !['approve', 'reject'].includes(decision) || state.loading) return;

    const card = button.closest('.room-card');
    const buttons = card?.querySelectorAll('button') || [];
    buttons.forEach((item) => { item.disabled = true; });
    setLoading(true);
    showError(els.globalError, '');

    try {
      await invokeAdmin('review', { roomId, decision });
      await refreshSnapshot({ quiet: true });
    } catch (error) {
      showError(els.globalError, error.message);
      buttons.forEach((item) => { item.disabled = false; });
    } finally {
      setLoading(false);
    }
  }

  function scheduleRealtimeRefresh() {
    clearTimeout(state.refreshTimer);
    state.refreshTimer = setTimeout(() => refreshSnapshot({ quiet: true }), 180);
  }

  async function startRealtime() {
    await stopRealtime();
    if (!state.session) return;
    state.realtimeChannel = client
      .channel('liveasta-admin-room-refresh')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'liveasta_admin_room_events' }, scheduleRealtimeRefresh)
      .subscribe();
  }

  async function stopRealtime() {
    clearTimeout(state.refreshTimer);
    state.refreshTimer = null;
    if (state.realtimeChannel) {
      const channel = state.realtimeChannel;
      state.realtimeChannel = null;
      await client.removeChannel(channel);
    }
  }

  async function applySession(session) {
    state.session = session || null;
    const loggedIn = Boolean(state.session);
    els.loginView.classList.toggle('hidden', loggedIn);
    els.dashboardView.classList.toggle('hidden', !loggedIn);
    els.logoutButton.classList.toggle('hidden', !loggedIn);
    els.pendingBadge.classList.toggle('hidden', !loggedIn);
    els.sessionLabel.textContent = loggedIn ? (state.session.user?.email || 'Amministratore') : 'Accesso amministratore';

    if (loggedIn) {
      await startRealtime();
      await refreshSnapshot();
    } else {
      await stopRealtime();
      els.pendingBadge.classList.add('hidden');
      els.pendingList.innerHTML = '';
      els.historyList.innerHTML = '';
    }
  }

  els.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.loading) return;
    setLoading(true);
    showError(els.loginError, '');
    els.loginButton.disabled = true;
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: els.emailInput.value.trim(),
        password: els.passwordInput.value
      });
      if (error) throw error;
      els.passwordInput.value = '';
      await applySession(data.session);
    } catch (error) {
      showError(els.loginError, error.message || 'Accesso non riuscito.');
    } finally {
      els.loginButton.disabled = false;
      setLoading(false);
    }
  });

  els.logoutButton.addEventListener('click', async () => {
    setLoading(true);
    try {
      await client.auth.signOut();
      await applySession(null);
    } finally {
      setLoading(false);
    }
  });

  els.refreshButton.addEventListener('click', () => refreshSnapshot());

  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') applySession(null);
    if (event === 'TOKEN_REFRESHED') state.session = session;
  });

  async function bootstrap() {
    els.versionLabel.textContent = config.version;
    if ('serviceWorker' in navigator) {
      try { await navigator.serviceWorker.register('./sw.js', { scope: './' }); } catch (_) { /* non bloccare login */ }
    }
    const { data } = await client.auth.getSession();
    await applySession(data.session);
  }

  bootstrap().catch((error) => showError(els.loginError, error.message || 'Errore di inizializzazione.'));
})();
