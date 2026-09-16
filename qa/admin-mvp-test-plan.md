# LIVEASTA Admin MVP - piano test

## Precondizioni
- Eseguire esclusivamente su Supabase DEV/branch.
- Migrazione `20260916143000_liveasta_admin_mvp.sql` applicata.
- Edge Function `liveasta-admin-api` deployata con JWT verification attiva.
- Esiste un utente Supabase Auth con `app_metadata.role = "liveasta_admin"`.
- Frontend `admin/` servito via HTTPS o localhost.

## Sicurezza
1. Senza sessione Auth: la funzione deve rispondere 401.
2. Utente Auth senza ruolo admin: 403.
3. Utente admin: snapshot consentito.
4. Tentativo anon di impostare `approved=true` direttamente su `fanta_rooms`: deve fallire/essere impedito.
5. Creazione stanza normale con payload manipolato `approved=true`: la stanza deve nascere `approved=false`, `approval_status=pending`.
6. Nessuna service/secret key deve essere presente nel bundle `admin/`.
7. La password Superuser storica non deve essere richiesta o memorizzata dalla Admin PWA.

## Funzionale
1. Creare una stanza dalla LIVEASTA utente: compare in Pending.
2. Badge: numero uguale alle richieste pendenti.
3. Realtime: nuova stanza visibile senza refresh manuale.
4. Approva: `approved=true`, `approval_status=approved`, sparisce da Pending e compare nello storico.
5. Rifiuta: `approved=false`, `approval_status=rejected`, sparisce da Pending e compare nello storico.
6. Doppio tap / doppia richiesta: una sola transizione; la seconda deve ricevere conflitto 409.
7. Refresh pagina: sessione persistente e stato coerente.
8. Deep-link `?room=<uuid>`: la richiesta viene evidenziata e portata in viewport se ancora pending.
9. Logout: sessione rimossa e pannello non accessibile.

## PWA / Android
1. Installazione da Chrome Android quando servita in HTTPS.
2. Avvio standalone apre solo `/admin/`.
3. La service worker Admin non controlla la PWA LIVEASTA principale.
4. Offline: shell caricabile; le azioni amministrative devono mostrare errore di rete, mai simulare successo.
5. Background/chiusura app: da validare nella fase Push, non nel MVP.

## Regressione LIVEASTA
1. Creazione stanza esistente invariata.
2. Accesso a stanza pending ancora bloccato.
3. Superuser storico continua ad approvare.
4. Asta, chat, PWA principale e plancia banditore non devono cambiare.
