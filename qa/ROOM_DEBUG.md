# Registro diagnostico per stanza — v1.01

Nel pannello superuser ogni stanza ha il pulsante **Scarica log**. Esporta un JSON
con gli eventi ricevuti dal server, paginati automaticamente. La password superuser
viene verificata sul server a ogni pagina. Un download fallito non produce un file
parziale presentato come completo. Non è necessario entrare come banditore.

## Installazione

1. Applicare `supabase/03_room_debug.sql` al progetto usato dal dominio (Test-asta,
   `qvkembahfeecfpsshepv`). È un setup aggiuntivo: non sostituisce lo schema esistente.
2. Pubblicare `index.html`, `scripts/app.js` e `scripts/room-debug.js` insieme.
3. Ricaricare la pagina su banditore e giocatori. Il registro parte con la nuova
   versione e non può ricostruire eventi precedenti.

## Cosa viene registrato

- Sessione del dispositivo, versione, browser, visibilità e stato di connessione.
- READY premuto, inviato, ricevuto, accettato/rifiutato e completamento del gruppo.
- Rilanci inviati/ricevuti, importo accettato o motivo del rifiuto, con `bid_id`.
- Fasi e salvataggi READY/live, esito HTTP e durata, con `request_id`.
- Ricezione delle buste, apertura/esito, reset, assegnazioni e rimozioni acquisti.
- Errori JavaScript con tipo e posizione (senza messaggi/stack potenzialmente sensibili).
- Stato periodico ogni 15 secondi per individuare dispositivi rimasti su fasi diverse.

`client_at` dipende dall'orologio del dispositivo; `received_at` viene assegnato dal
server. `session_id` e `sequence` permettono di seguire un singolo dispositivo.
Gli eventi arrivati dopo un periodo offline possono avere un orario di ricezione
molto successivo all'azione. `realtime.send_result` descrive il trasporto e non è
una conferma applicativa del banditore: confrontare `realtime.receive`,
`ready.accepted` e `bid.accepted`.

## Isolamento e limiti

- Tabella in schema non esposto, RLS abilitata e nessun accesso diretto anon/authenticated.
  RPC pubbliche invoker e funzioni private definer con ricerca schema fissa.
- Compatibile con l'autenticazione attuale: password stanza per scrivere,
  password superuser per leggere. Gli attori dichiarati dai client non sono
  identità certificate; questo registro non sostituisce un registro autorevole delle offerte.
- Nessun body HTTP, header, password, PIN o importo delle buste non aperte salvato.
- Massimo 50000 eventi per stanza, export degli ultimi 30 giorni. I record scaduti
  vengono eliminati a blocchi durante nuovi invii; non è installato un cron.
- Invio di massimo 40 eventi ogni 5 secondi per dispositivo. Timeout di invio
  8 secondi, retry con attesa crescente fino a 60 secondi, deduplicazione UUID.
- Coda temporanea di massimo 1200 eventi per scheda in sessionStorage, senza
  credenziali; sopravvive al refresh. A scheda chiusa gli eventi ancora offline
  possono andare persi. Cambio stanza: gli eventi precedenti attendono il rientro
  nella stanza corretta. Un overflow viene segnalato con `logger.dropped`.
- I reset dell'asta non cancellano i log. Eliminare una stanza elimina anche i log.
- Il logger non corregge i difetti READY/sincronizzazione individuati in precedenza.

## Verifiche

`node --test qa/room-debug.test.mjs qa/room-debug-bids.test.mjs`

Copre retry/idempotenza client, isolamento stanze, refresh, storage non disponibile,
coda limitata, occultamento credenziali/buste, errori HTTP, paginazione/logout e
regressione dei rilanci normali/mirati (accettazione, duplicati, cooldown, autorilancio,
limiti, squadra mancante e offerta superata).

Il setup SQL è stato eseguito in una transazione poi annullata con stanza fittizia:
scrittura autorizzata, rimozione del campo password, rifiuto di password errate
e rifiuto della lettura diretta della tabella da ruolo anon.

`qa/room-debug-ui.mjs` verifica login superuser, pulsante e download su 390/1440 px
contro server locale 8765, con tutte le chiamate Supabase simulate. Richiede
Playwright e Chromium. Non invia richieste alle stanze reali.
