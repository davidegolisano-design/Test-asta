# LIVEASTA Admin MVP - architettura

## Confini
La Admin PWA è separata dalla PWA LIVEASTA principale:
- percorso frontend: `/admin/`
- manifest separato con `id` e `scope` `/admin/`
- service worker separato e limitato allo scope `/admin/`
- autenticazione Supabase Auth dedicata
- nessuna password Superuser legacy nel frontend

## Flusso MVP
1. LIVEASTA crea la stanza come oggi con `approved=false`.
2. La migrazione assegna `approval_status=pending` e impedisce al normale client di cambiare i campi di moderazione.
3. L’admin accede con Supabase Auth.
4. La PWA invoca `liveasta-admin-api` con il JWT utente.
5. L’Edge Function valida l’utente e richiede `app_metadata.role=liveasta_admin`.
6. Solo l’Edge Function usa credenziali server-side per leggere/aggiornare la moderazione.
7. La PWA usa Realtime solo come segnale di refresh e rilegge i dati tramite l’Edge Function.

## Stato approvazione
`approved` resta per compatibilità con LIVEASTA esistente.
Il nuovo `approval_status` distingue:
- `pending`
- `approved`
- `rejected`

Campi audit:
- `approval_reviewed_at`
- `approval_reviewed_by`

La funzione legacy `liveasta_set_room_approval` viene mantenuta compatibile. La revoca legacy porta la stanza a `pending`; il vero rifiuto è una decisione della nuova Admin PWA.

## Sicurezza
Il frontend contiene solo URL Supabase e publishable key, entrambi pubblici per natura.
Le chiavi server/secret e, nella fase push, la VAPID private key restano esclusivamente lato Supabase.

Problema preesistente da non confondere con l’MVP: le policy attuali delle tabelle operative sono molto permissive (`anon ALL`). La migrazione MVP protegge specificamente i campi di approvazione tramite trigger, senza tentare un refactor RLS globale che rischierebbe regressioni nell’asta. Il rifacimento RLS va trattato come lavoro separato e testato integralmente.

## Push - fase 2
Dopo la validazione MVP:
- subscription Web Push salvata server-side e associata all’admin autenticato;
- VAPID public key al client, VAPID private key in secret Supabase;
- evento nuova stanza `pending` -> webhook/trigger -> Edge Function push;
- payload con `roomId` e URL `/admin/?room=<uuid>`;
- `notificationclick` del service worker apre/focalizza la richiesta.
