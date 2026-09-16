# LIVEASTA Admin DEV - piano test

## Precondizioni
- usare esclusivamente la branch GitHub `admin-push-dev`
- nessuna modifica a `main`
- nessuna migrazione/Edge Function nuova su Supabase
- frontend Admin servito via HTTPS

## Accesso
1. Password Superuser errata: accesso negato.
2. Password corretta: dashboard visibile.
3. Refresh pagina: richiede nuovamente la password, perché non viene memorizzata.
4. Logout: password cancellata dalla RAM e dashboard chiusa.

## Stanze
1. Creare una stanza dalla LIVEASTA principale: deve nascere con `approved=false`.
2. Entro il successivo polling deve comparire nelle richieste pendenti.
3. Badge: numero uguale alle stanze pending.
4. Approva: usa `liveasta_set_room_approval`, la stanza passa `approved=true` e sparisce dalle pendenti.
5. Doppio tap su Approva: il client deve bloccare la seconda azione mentre la prima è in corso.
6. Aggiorna manuale: stato coerente con Supabase.
7. Riapertura/ritorno in foreground: refresh immediato.
8. Deep-link `?room=<uuid>`: evidenzia e porta in viewport la stanza se ancora pending.

## Notifiche
1. Attivazione notifiche: Chrome richiede il permesso.
2. Permesso concesso: UI mostra notifiche attive.
3. Creare una nuova stanza dopo il primo snapshot: deve comparire una notifica `Nuova stanza da approvare`.
4. La notifica deve mostrare `Nome stanza: X`.
5. Tap sulla notifica: apre/focalizza LIVEASTA Admin con `?room=<uuid>`.
6. Più stanze create: badge e lista devono riportare il numero corretto.
7. Disattivazione notifiche dall'Admin: niente nuove notifiche, ma dashboard continua ad aggiornarsi.
8. PWA in background: verificare polling/notifica su Android Chrome; i timer possono essere rallentati dal sistema.
9. PWA completamente chiusa: nessuna garanzia di notifica in questa versione, perché non è ancora Web Push server-side.

## PWA / regressione
1. Manifest Admin installabile separatamente dalla PWA principale.
2. Service worker limitato allo scope `/admin/`.
3. La PWA principale LIVEASTA non deve cambiare.
4. Creazione stanza e accesso giocatori/banditore devono continuare a funzionare come prima.
5. `main` deve restare identico al commit produzione fino a esplicita autorizzazione al merge.
