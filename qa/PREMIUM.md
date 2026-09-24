# LIVEASTA v1.07.4 — candidata alla pubblicazione

Branch: `dev-premium-20260923`. Il sito pubblico e il branch `main` non sono
stati aggiornati. Nessuna migrazione Premium o nuova funzione email è stata
applicata al database condiviso.

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

`index.html` è la candidata con database reale. I nuovi flussi creazione stanza,
richiesta e abilitazioni Premium richiedono l'attivazione server descritta sotto;
non usare la pagina normale per dichiarare verificato un invio email reale.

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

## Attivazione server: sospesa, autorizzazione necessaria

La revisione automatica ha respinto la migrazione perché modifica il database
live condiviso, introduce RPC/RLS e email contenenti la password della stanza.
L'autorizzazione ricevuta riguarda la dev, non questa modifica condivisa.
Non ritentare né applicare queste operazioni con uno strumento alternativo
senza autorizzazione esplicita. Preparazione e test locali non sono deployment.

Dopo autorizzazione:

1. Ricontrollare schema corrente, funzioni esistenti e assenza di collisioni.
   Applicare in una transazione `supabase/premium-dev.sql` e poi
   `supabase/migrations/20260924071323_room_requests_dev.sql`.
2. Pubblicare `supabase/functions/liveasta-notification/index.ts` e `mail.mjs`,
   con `verify_jwt=false`: ogni evento ha un token privato verificato da RPC
   accessibili solo al servizio. Nessuna chiave server entra nel frontend.
   Verificare i secret esistenti `ARUBA_SMTP_USER`, `ARUBA_SMTP_PASSWORD`,
   `ADMIN_NOTIFICATION_EMAIL=postmaster@liveasta.it`. Non modificare i worker
   email già utilizzati dalla produzione.
3. Eseguire gli advisors; creare una stanza temporanea dalla dev, verificare
   email reale, deduplicazione, revoca approvazione e concessione/revoca Premium
   su due client reali. L'anteprima simulata non sostituisce questo collaudo.
4. Solo dopo decisione dell'utente, promuovere i file pubblici sul sito.
   Non distribuire `qa/`, `supabase/` o altre risorse di sviluppo nel pacchetto
   statico destinato a un nuovo hosting. Verificare PWA su dispositivo reale.

La tabella Premium consente sola lettura ai client; le scritture verificano
la password superuser sul server. Il Realtime riguarda la nuova tabella.
Il rollback del frontend consiste nel ripristinare il precedente commit
pubblico; lasciare lo schema aggiuntivo in sede evita perdita di dati.

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
