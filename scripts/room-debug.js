/* Diagnostic telemetry only: no auction decision waits for this module. */
(function (root) {
    'use strict';
    const VERSION = '1.01-debug.1';
    const KEY = 'liveasta-debug-queue-v1';
    const MAX_QUEUE = 1200;
    const EVENTS = new Set(['player_ready','ready_state','ready_gate_state','live_state',
        'live_state_request','auction_started','auction_update','auction_end','buzz','exact_bid',
        'bid_rejected','force_state_reset','player_availability','nominate_player',
        'sealed_bid_submit','sealed_bid_start','sealed_bid_rejected','sealed_bid_count',
        'sealed_reveal_start','sealed_bid_end','auction_prep','new_player']);
    const FIELDS = new Set(['phase','mode','player_id','team_id','bid_id','token','ready_token',
        'choice','reason','status','event','operation','code','name','line','column','source',
        'value','amount','target','seconds','deadline_at','cooldown_ms','self_raise_enabled',
        'ready_count','total','waiting','active','absent','duration_ms','sequence','dropped',
        'required_ids','ready_required_ids','ready_ids','skip_ids','winner','online',
        'visibility','auction_active','ready_waiting','pending','screen','transport','request_id',
        'browser','platform','viewport']);

    function safeDetails(value) {
        const result = {};
        for (const [key, val] of Object.entries(value || {})) {
            if (!FIELDS.has(key)) continue;
            if (typeof val === 'boolean' || (typeof val === 'number' && Number.isFinite(val))) result[key] = val;
            else if (typeof val === 'string') result[key] = val.slice(0, 160);
            else if (Array.isArray(val)) result[key] = val.slice(0, 40).map(x => String(x).slice(0, 64));
        }
        return result;
    }

    function create(options) {
        const env = options.env || root;
        const clock = options.now || Date.now;
        const rawFetch = options.fetch || env.fetch.bind(env);
        const uuid = () => env.crypto.randomUUID();
        let queue = [], sequence = 0, busy = false, nextAttempt = 0, failures = 0;
        let session = uuid(), lastHealth = 0;
        try {
            session = env.sessionStorage.getItem(KEY + '-session') || session;
            env.sessionStorage.setItem(KEY + '-session', session);
            const saved = JSON.parse(env.sessionStorage.getItem(KEY) || '[]');
            if (Array.isArray(saved)) queue = saved.filter(x => x && x.room_id && x.event_id && x.event).slice(-MAX_QUEUE);
            sequence = Math.max(Number(env.sessionStorage.getItem(KEY + '-sequence')) || 0, ...queue.filter(x => x.session_id === session).map(x => Number(x.sequence) || 0));
        } catch (_) { /* Storage is optional; never affect the auction. */ }
        const persist = () => { try { env.sessionStorage.setItem(KEY, JSON.stringify(queue)); env.sessionStorage.setItem(KEY + '-sequence', String(sequence)); } catch (_) {} };
        const context = () => { try { return options.getContext() || {}; } catch (_) { return {}; } };

        function record(event, details = {}, level = 'info', override) {
            try {
                const c = override || context();
                if (!c.room_id) return;
                if (queue.length >= MAX_QUEUE) {
                    queue.splice(0, 100);
                    queue.push(makeEvent(c, 'logger.dropped', {dropped:100}, 'warning'));
                }
                queue.push(makeEvent(c, event, details, level));
            } catch (_) {}
        }
        function makeEvent(c, event, details, level) {
            return {event_id:uuid(), session_id:session, sequence:++sequence,
                room_id:c.room_id, team_id:c.team_id || null, actor:c.actor || 'observer',
                client_at:new Date(clock()).toISOString(), version:VERSION,
                event:String(event).slice(0,80), level, details:safeDetails({
                    phase:c.phase, player_id:c.player_id, auction_active:c.auction_active,
                    ready_waiting:c.ready_waiting, ready_token:c.ready_token, ...details})};
        }

        async function flush() {
            if (busy || clock() < nextAttempt || env.navigator?.onLine === false) return;
            const c = context();
            if (!c.room_id || !c.room_password || !options.getClient()) return;
            const batch = queue.filter(x => x.room_id === c.room_id).slice(0,40);
            if (!batch.length) return;
            busy = true;
            const controller = new env.AbortController();
            const timeout = env.setTimeout(() => controller.abort(), 8000);
            try {
                const {error} = await options.getClient().rpc('liveasta_debug_append', {
                    p_room_id:c.room_id, p_room_password:c.room_password, p_events:batch
                }).abortSignal(controller.signal);
                if (error) throw error;
                const ids = new Set(batch.map(x => x.event_id));
                queue = queue.filter(x => !ids.has(x.event_id));
                if (failures) record('logger.recovered', {pending:queue.length}, 'info', c);
                failures = 0; nextAttempt = 0;
            } catch (_) {
                failures++;
                nextAttempt = clock() + Math.min(60000, 5000 * 2 ** Math.min(failures,4));
                // Do not log the logging request itself or expose its credentials/errors.
            } finally {
                env.clearTimeout(timeout); busy = false; persist();
            }
        }

        function payloadDetails(event, payload) {
            // Sealed amounts must never be copied into diagnostics before opening.
            const data = safeDetails(payload);
            if (/sealed|bust/i.test(event)) { delete data.amount; delete data.target; delete data.value; }
            if (payload?.player?.id) data.player_id = String(payload.player.id);
            return data;
        }
        function attachChannel(channel) {
            if (!channel || channel.__liveastaDebug) return channel;
            channel.__liveastaDebug = true;
            const c = {...context()}; // Bind late callbacks to the original room.
            record('client.session',{browser:String(env.navigator?.userAgent || '').slice(0,160),
                platform:env.navigator?.platform || '',viewport:`${env.innerWidth || 0}x${env.innerHeight || 0}`},'info',c);
            const bound = () => context().room_id === c.room_id ? context() : c;
            const send = channel.send.bind(channel), on = channel.on.bind(channel), subscribe = channel.subscribe.bind(channel);
            channel.send = function (message, ...args) {
                const event = message?.event, watched = EVENTS.has(event);
                const details = payloadDetails(event || '', message?.payload);
                const ctx = bound();
                if (watched) record('realtime.send', {event,...details}, 'info', ctx);
                let result;
                try { result = send(message, ...args); }
                catch (error) { record('realtime.send_error', {event}, 'error', ctx); throw error; }
                if (watched && result?.then) result.then(status => record('realtime.send_result',
                    {event,status:String(status),bid_id:details.bid_id,token:details.token}, status === 'ok' ? 'info':'warning',ctx),
                    () => record('realtime.send_error',{event,bid_id:details.bid_id},'error',ctx));
                return result;
            };
            channel.on = function (type, filter, callback) {
                if (type !== 'broadcast' || !EVENTS.has(filter?.event)) return on(type,filter,callback);
                return on(type,filter,function (...args) {
                    const ctx = bound(), event = filter.event;
                    record('realtime.receive',{event,...payloadDetails(event,args[0]?.payload)},'info',ctx);
                    try {
                        const result = callback.apply(this,args);
                        if (result?.then) result.then(undefined, () => record('realtime.handler_error',{event},'error',ctx));
                        return result;
                    } catch (error) { record('realtime.handler_error',{event},'error',ctx); throw error; }
                });
            };
            channel.subscribe = function (callback, ...args) {
                return subscribe(function (status, error) {
                    record('connection.status',{status},status === 'SUBSCRIBED'?'info':'warning',bound());
                    return callback?.(status,error);
                },...args);
            };
            return channel;
        }

        async function tracedFetch(input, init) {
            let info, ctx;
            try {
                const url = new URL(typeof input === 'string' ? input : input.url);
                const method = String(init?.method || input?.method || 'GET').toUpperCase();
                if (url.origin === options.apiOrigin && !url.pathname.includes('liveasta_debug_')) {
                    ctx = {...context()};
                    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
                    const key = body.key || url.searchParams.get('key') || '';
                    const operation = /live_auction_/.test(key)?'live_state':/ready_gate_/.test(key)?'ready_gate':
                        /fanta_assign_player$/.test(url.pathname)?'assign_player':/fanta_remove_purchase$/.test(url.pathname)?'remove_purchase':null;
                    info = {request_id:uuid(),operation:operation || url.pathname.split('/').pop(), watched:!!operation && method !== 'GET', start:clock()};
                    if (info.watched) record('storage.request',{request_id:info.request_id,operation:info.operation,...safeDetails(body.data),
                        player_id:body.p_player_id || body.data?.player?.id},'info',ctx);
                }
            } catch (_) { /* Unparseable request still executes unchanged. */ }
            try {
                const response = await rawFetch(input,init);
                if (info && (info.watched || !response.ok)) record(response.ok?'storage.result':'storage.error',
                    {request_id:info.request_id,operation:info.operation,status:response.status,duration_ms:clock()-info.start},response.ok?'info':'error',ctx);
                return response;
            } catch (error) {
                if (info) record('storage.network_error',{request_id:info.request_id,operation:info.operation,duration_ms:clock()-info.start},'error',ctx);
                throw error;
            }
        }

        async function download(roomId, roomName, password, onProgress = () => {}, stillAuthorized = () => true) {
            if (!password) throw new Error('Accedi nuovamente come superuser.');
            let after = '0', through = null, events = [], metadata;
            do {
                if (!stillAuthorized()) throw new Error('Sessione superuser terminata.');
                const {data,error} = await options.getClient().rpc('liveasta_debug_export', {
                    p_room_id:roomId, p_password:password, p_after:after, p_through:through
                });
                if (error) throw new Error('Download non riuscito. Verifica la sessione superuser e riprova.');
                if (!data || !Array.isArray(data.events)) throw new Error('Risposta del registro non valida.');
                metadata = data; through = data.through;
                events.push(...data.events);
                onProgress(events.length);
                if (!data.has_more) break;
                const next = data.events.at(-1)?.id;
                if (!next || next === after) throw new Error('Paginazione del registro interrotta.');
                after = next;
            } while (true);
            if (!stillAuthorized()) throw new Error('Sessione superuser terminata.');
            return {format:'liveasta-room-debug/v1', room:{id:roomId,name:roomName},
                exported_at:new Date(clock()).toISOString(), retention_days:30,
                earliest_available:metadata.earliest_available, event_count:events.length,
                notes:['Gli eventi client sono diagnostici, non una prova certificata delle offerte.',
                    'Disponibili al massimo 50000 eventi per stanza degli ultimi 30 giorni; gli elenchi sono limitati a 40 identificativi.',
                    'client_at usa l’orologio del dispositivo; received_at usa quello del server.',
                    'send_result non certifica la ricezione del banditore: confrontare realtime.receive e bid.accepted.',
                    'Eventi offline non ancora inviati e dispositivi con versioni precedenti possono mancare.'], events};
        }
        function health() {
            if (clock()-lastHealth >= 15000) {
                lastHealth = clock();
                record('client.health',{...context(),online:env.navigator?.onLine !== false,
                    visibility:env.document?.visibilityState, pending:queue.length});
            }
            persist(); void flush();
        }
        const timer = env.setInterval(health,5000);
        env.addEventListener?.('online',()=>{record('browser.online'); nextAttempt=0; void flush();});
        env.addEventListener?.('offline',()=>{record('browser.offline',{},'warning'); persist();});
        env.addEventListener?.('pagehide',()=>{record('browser.pagehide'); persist(); void flush();});
        env.document?.addEventListener('visibilitychange',()=>{
            record('browser.visibility',{visibility:env.document.visibilityState}); persist(); void flush();
        });
        // Intentionally omit error messages, stacks and URLs: they can contain credentials.
        env.addEventListener?.('error',e=>record('javascript.error',{name:e.error?.name || 'Error',line:e.lineno,column:e.colno},'error'));
        env.addEventListener?.('unhandledrejection',e=>record('javascript.rejection',{name:e.reason?.name || 'Error'},'error'));
        return {record,flush,attachChannel,fetch:tracedFetch,download,
            inspect:()=>({pending:queue.length,failures}), stop:()=>{env.clearInterval(timer);persist();}};
    }
    root.LiveAstaDebug = {create, safeDetails, version:VERSION};
})(typeof window !== 'undefined' ? window : globalThis);
