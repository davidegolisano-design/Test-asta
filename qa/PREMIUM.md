# LIVEASTA v1.07.4 — candidata alla pubblicazione

Candidata approvata per la pubblicazione il 24 settembre 2026.
La migrazione `liveasta_premium_release_v1074` e il worker
`liveasta-notification` v1 sono attivi sul progetto Supabase condiviso.
La versione pubblica usa `index.html` e l'ambiente `production`.

## Prova della candidata

- `qa/premium-preview.html?entry=home`: normale home, creazione stanza e accesso.
- `qa/premium-preview.html`: Gestione della stanza fittizia già aperta.
- `qa/premium-preview-mobile.html`: stessa Gestione a larghezza 390 px.
- `qa/premium-preview.html?request=open`: richiesta Premium.

Queste pagine caricano l'interfaccia reale e un database simulato in memoria.
La CSP blocca le connessioni API. Non inviano email e i dati si azzerano al
ricaricamento; non consentono un'asta condivisa tra dispositivi. Non hanno
barre di prova o banner sovrapposti all'interfaccia.

Stanza di prova `PREMIUM DEMO`, password `demo`. Superuser `demo-premium`.
Per accedere al superuser dalla home: cinque tocchi su LIVEASTA, poi il comando
Superuser nelle impostazioni. Queste credenziali esistono solo nella fixture.

`index.html` utilizza il database reale. Creazione stanza, richiesta e
abilitazioni Premium sono collegate ai nuovi endpoint server. Le pagine
`qa/premium-preview*` rimangono simulate e non inviano email reali.

## Comportamento concordato

Classic, Mantra, gestione ordinaria dell'asta, crediti, rose, esportazione e
miniature generiche di portiere/giocatore sono gratuiti. Le sette funzioni
Premium sono Busta chiusa, Random, Turni, Ready/Skip, Budget per reparto, Chat
e catalogo completo delle miniature. Il bordo oro apre Acquista Premium;
nessun lucchetto altera le dimensioni dei controlli. Nessun pagamento automatico.

Le abilitazioni sono della stanza: il superuser concede singole funzioni o
il pacchetto intero. Il banditore decide poi quali usare. Una richiesta per
stanza/ciclo; si riapre solo quando l'ultima funzione attiva viene revocata.
Revocare parzialmente o disabilitare una stanza già Free non riapre la richiesta.
Le stanze precedenti senza contatto chiedono l'email al primo invio.

La nuova RPC `liveasta_create_room` registra nella stessa transazione stanza
approvata, contatto privato e notifica. Una chiave idempotente evita duplicati
sui reinvii e non riapprova stanze successivamente revocate. Il superuser può
sempre togliere l'approvazione. Non cambia il default usato dal vecchio sito.

Il worker `liveasta-notification` invia solo a `postmaster@liveasta.it`:
creazione con nome stanza, password ed email; richiesta Premium con stanza ed
email. La coda privata consente un solo invio concorrente; il payload viene
cancellato dopo l'invio. Errori certi sono ritentabili dal superuser; gli esiti
SMTP incerti restano da verificare, per evitare duplicati. Nessun invio dipende
dal mantenere aperto il browser. Un errore di stato email non blocca i toggle.

## Configurazione unica e PWA

`scripts/release-config.js` sceglie `production` soltanto su HTTPS nei domini
esatti `liveasta.it` e `www.liveasta.it`; GitHack e gli altri indirizzi usano
`dev-premium`. Nessun parametro URL o localStorage cambia questa scelta.
Le abilitazioni, le richieste, i tentativi di creazione e le notifiche dei due
ambienti sono separati. Le stanze restano nella tabella condivisa esistente.

Lo stesso sorgente può essere promosso dopo l'approvazione. Le concessioni fatte
nella dev non attivano il Premium pubblico: vanno confermate dal superuser
nell'ambiente pubblico. Le email indicano correttamente l'ambiente.

La PWA si registra soltanto sul dominio pubblico, anche con Premium presente.
La cache conserva soltanto file statici della stessa origine, mai API o dati
Supabase. A navigazione offline compare la pagina di connessione richiesta,
non una plancia con dati obsoleti. La pulizia cancella solo cache LIVEASTA.
QR e destinazione APK restano `https://www.liveasta.it/`; icone invariate.

## Attivazione server e stato del collaudo

Il 24 settembre 2026 l'utente ha autorizzato la pubblicazione. Sono stati
applicati in una transazione `supabase/premium-dev.sql` e
`supabase/migrations/20260924071323_room_requests_dev.sql`, registrati come
`liveasta_premium_release_v1074`. Il worker `liveasta-notification` v1 è attivo,
con token privato per evento e RPC di claim riservata al servizio.
I worker email precedenti rimangono invariati. Il loro trigger di creazione
si applica solo a stanze non approvate: non duplica la nuova notifica.

Verificati sul database reale: presenza delle RPC, SELECT consentita ai client,
UPDATE e claim negati ai client, claim consentito al servizio, pubblicazione
Realtime della tabella e compatibilità dello schema stanze/contatti.
Gli advisors non mostrano nuovi avvisi di sicurezza: le due tabelle private
hanno intenzionalmente RLS senza policy client. Rimangono gli avvisi sulle
funzioni privilegiate preesistenti; non sono stati corretti cambiando il
modello di autenticazione durante questa pubblicazione.

Il controllo automatico ha bloccato il collaudo che avrebbe creato una stanza
production temporanea e inviato due notifiche a postmaster: richiede consenso
specifico per questi dati e messaggi di prova. Non sono state create stanze
di collaudo né notifiche. Non ritentare attraverso un altro strumento.
La consegna SMTP reale e la propagazione delle abilitazioni fra due client
reali restano da verificare dopo quel consenso; le prove locali coprono
permessi, revoche, deduplicazione e comportamento del worker.

Per ripristinare il frontend precedente usare il commit pubblico
`3b259cc2f3295d4097ae8cea26dec239a893490a`. Lo schema aggiuntivo può restare
in sede: rimuoverlo cancellerebbe le abilitazioni e le richieste registrate.

## Verifiche riproducibili

```sh
node qa/build-premium-demo.cjs
NODE_PATH=/path/to/dependencies/node_modules node qa/premium-sql.test.cjs
NODE_PATH=/path/to/dependencies/node_modules node qa/room-requests-sql.test.cjs
NODE_PATH=/path/to/dependencies/node_modules node --test qa/premium-admin.test.cjs
node --test qa/notification-mail.test.mjs qa/player-assets.test.cjs qa/release.test.cjs
```

Dipendenze dei soli test locali: PGlite e LinkeDOM. Nessun test usa contatti,
password o stanze reali. Le prove coprono permessi, password errata, ambiente,
revoche, deduplicazione, idempotenza, contatti, coda/invio email, fallback
miniature, configurazione PWA e guasto della lettura notifiche nel superuser.

Per verificare visivamente le immagini nella fixture rose usare
`?portrait=keeper` o `?portrait=outfield`; aggiungere `&miniatures=premium`.
Questi parametri non sono caricati dall'app normale.

## Prima dei pagamenti

Le abilitazioni sono protette sul server; le operazioni dell'asta restano
eseguite dal client secondo l'architettura attuale. I controlli nell'interfaccia
non proteggono contro un client modificato. Le immagini restano pubbliche nel
repository. Prima della vendita occorre autorizzare anche le operazioni Premium
sul server. Un futuro pagamento potrà assegnare gli stessi identificatori da
un backend fidato con `source=payment`, mantenendo questa interfaccia.
