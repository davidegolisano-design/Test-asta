# LIVEASTA Admin DEV - architettura semplice

## Obiettivo
Aggiungere una PWA amministrativa separata per approvare le nuove stanze senza modificare `main` e senza creare branch/progetti Supabase a pagamento.

## Confini
- frontend separato in `/admin/`
- manifest e service worker separati
- branch GitHub: `admin-push-dev`
- backend: quello LIVEASTA esistente
- nessuna migrazione database
- nessuna nuova Edge Function
- nessun nuovo utente Supabase Auth

## Flusso
1. LIVEASTA crea la stanza con `approved=false`, come già avviene oggi.
2. LIVEASTA Admin interroga periodicamente `fanta_rooms` e mostra solo le stanze non approvate.
3. L'Admin accede con la password Superuser già esistente.
4. La password viene verificata tramite RPC `liveasta_verify_superuser`.
5. La password rimane soltanto nella RAM della pagina corrente; non viene salvata in localStorage/sessionStorage.
6. Il pulsante `Approva` usa l'RPC esistente `liveasta_set_room_approval` con `p_approved=true`.
7. Dopo l'approvazione la stanza sparisce dalle pendenti e diventa utilizzabile dall'app principale.

## Notifiche
La PWA controlla automaticamente le nuove stanze ogni 5 secondi.
Se le notifiche sono abilitate e compare un nuovo `room.id` pending:
- mostra una notifica browser/PWA;
- aggiorna il badge con il numero delle richieste;
- il tap apre `/admin/?room=<uuid>` e porta alla relativa richiesta.

Questa modalità non è vero Web Push: funziona mentre LIVEASTA Admin è in esecuzione. Con la PWA completamente chiusa non esiste codice JavaScript attivo che possa interrogare Supabase. Per ottenere notifiche affidabili ad app chiusa servirebbe in futuro un mittente server-side Web Push.

## Sicurezza
Il frontend contiene soltanto la publishable key Supabase, che è pubblica per natura. La password Superuser non viene hardcoded né memorizzata.

La sicurezza delle policy esistenti di `fanta_rooms` non viene modificata in questa DEV per evitare regressioni nell'app principale. L'eventuale hardening RLS va trattato separatamente.
