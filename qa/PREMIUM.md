# DEV Premium · 1.07.3

Classic e Mantra restano gratuiti. Le abilitazioni Premium sono per stanza:
`sealed`, `random`, `turns`, `ready`, `budget`, `chat`, `miniatures`.
Il superuser concede l'accesso; il banditore sceglie poi le modalità da attivare.
Non ci sono acquisti o addebiti in questa versione.

## Prova isolata

Aprire `qa/premium-preview.html` (oppure `qa/premium-preview-mobile.html` per
un riquadro largo 390 px). La pagina utilizza i veri componenti dell'app con
un backend simulato in memoria. Nessun client Supabase reale viene creato;
la CSP blocca le connessioni di rete. I dati sono fittizi e si azzerano
ricaricando la pagina.

La fixture si apre in Gestione e non aggiunge barre o comandi di prova.
Il link destinato alle prove dell'utente è invece `index.html`, con accesso
normale e database reale. La fixture rimane uno strumento interno di verifica.

I controlli bloccati hanno solo il bordo oro e aprono il popup Acquista Premium.
Non aggiungono etichette, icone o spazi e tornano al normale stile del tema
quando la funzione è abilitata. Mantra rimane gratuito.

Le miniature generiche (portiere e giocatore di movimento) sono gratuite.
`miniatures` abilita tutto il catalogo personalizzato per la stanza. La scelta
è centralizzata in `playerImageUrl`; `setPlayerImage` aggiorna anche le immagini
già aperte quando cambia l'abilitazione o si lascia la stanza. Il ripristino Ready
non usa l'URL salvato da un altro client. Un file mancante ricade sulla generica
corretta senza cicli di caricamento. Il controllo miniature del superuser verifica
sempre i file originali, indipendentemente dal Premium.

Per verificare le immagini nell'anteprima rose usare sulla sola fixture
`?portrait=keeper` o `?portrait=outfield`; aggiungere `&miniatures=premium`
per confrontare il catalogo completo. Questi parametri non sono letti dall'app
normale e non concedono abilitazioni sul database reale.

Test della selezione immagini, aggiornamento su revoca e fallback:
`node --test qa/player-assets.test.cjs`.

Rigenerare la pagina dopo modifiche a `index.html`:

```sh
node qa/build-premium-demo.cjs
```

## Stanze e richieste (1.07.3)

La creazione passa da `liveasta_create_room_dev`: stanza approvata, contatto
privato e notifica vengono registrati nella stessa transazione. Una chiave
idempotente evita doppie creazioni se si ripete un invio. Non cambia il default
delle stanze create dalla versione pubblica e non riapprova stanze revocate.

`liveasta_request_premium_dev` verifica password e approvazione della stanza,
blocca la riga delle abilitazioni e registra una richiesta per ciclo. Lo stato
è per stanza, condiviso fra giocatori e banditore. Resta bloccato dopo concessioni
parziali; si riapre solo passando da almeno una funzione attiva a nessuna.
Spegnere una stanza già Free non azzera una richiesta ancora da gestire.
Le stanze vecchie senza email richiedono un contatto al primo invio.

Le notifiche sono registrate in una coda privata. Il worker
`supabase/functions/liveasta-dev-notification` usa i secret Aruba esistenti e
invia esclusivamente a `postmaster@liveasta.it`. La nuova stanza include nome,
password ed email; il Premium include stanza ed email. Il token casuale della
notifica viene controllato da una RPC riservata al server prima di inviare.
Un solo worker può acquisire un evento. Dopo l’invio il payload viene cancellato.
Gli invii falliti possono essere ritentati dal superuser; un esito SMTP incerto
rimane da verificare per evitare un reinvio potenzialmente duplicato.
La coda non richiede che il browser del creatore rimanga aperto.

La fixture accetta `?entry=home` per provare la creazione e `?request=open` per
aprire la richiesta Premium della stanza fittizia. Le email della fixture sono
simulate, non partono messaggi reali. Tutti i dati si azzerano al ricaricamento.

## Collegamento al database: in attesa di autorizzazione

La pagina normale `index.html` utilizza il database condiviso con il sito
pubblico. La migrazione `supabase/premium-dev.sql` è preparata e verificata
localmente, ma **non è stata applicata**: la revisione automatica ha respinto
la modifica del database condiviso perché l'autorizzazione riguarda la dev.
Non ritentare senza autorizzazione esplicita per quel database.
Anche il tentativo del 24 settembre per la creazione automatica/richieste è
stato rifiutato dalla revisione automatica: database live condiviso, nuove
RPC/RLS e notifiche contenenti la password della stanza. Nessuna migrazione o
nuova Edge Function di questo aggiornamento è stata applicata/pubblicata.

Dopo l’autorizzazione applicare in una transazione prima `premium-dev.sql`, poi
`migrations/20260924071323_room_requests_dev.sql`. Pubblicare la nuova funzione
`liveasta-dev-notification` con il suo modulo `mail.mjs`; `verify_jwt=false`
perché l’autenticazione è il token privato di ogni evento (le RPC di claim e
risultato sono accessibili solo con `service_role`). Non cambiare le funzioni
email già usate dalla produzione. Verificare advisors e un invio reale a
postmaster da una stanza temporanea, quindi concessione e revoca su due client.

La migrazione aggiunge una tabella di abilitazioni, policy di sola lettura
per i client, una funzione di modifica che verifica la password superuser,
e la pubblicazione Realtime della sola nuova tabella. L'ambiente usato
dalla dev è `dev-premium`; `production` rimane distinto.
Non modifica stanze esistenti o le loro impostazioni.

Una volta autorizzata e applicata la migrazione, controllare sulla dev
il salvataggio e la sincronizzazione tra due client in una stanza di prova.
Il branch pubblico non include questi cambiamenti.

## Verifica

La prova locale della migrazione usa PostgreSQL in PGlite e dati temporanei:

```sh
NODE_PATH=/path/to/dependencies/node_modules node qa/premium-sql.test.cjs
NODE_PATH=/path/to/dependencies/node_modules node qa/room-requests-sql.test.cjs
node --test qa/notification-mail.test.mjs qa/player-assets.test.cjs
```

Sono verificati: accesso Free iniziale, password superuser errata,
scritture anonime dirette vietate, singola abilitazione, pacchetto completo,
revoca, isolamento degli ambienti e cancellazione delle abilitazioni insieme
alla stanza. Mantra non è un identificatore Premium valido.

Sul browser sono verificati popup di sblocco, attivazione singola/completa,
revoca, Mantra gratuito e finestre a larghezza smartphone.

## Limite prima della vendita

La tabella protegge la modifica delle abilitazioni. Come il resto dell'app
attuale, le azioni dell'asta sono gestite dal client: i controlli dell'interfaccia
non costituiscono una protezione commerciale contro un client modificato.
Anche i file delle miniature restano pubblici nel repository: questa dev
controlla quali mostrare nell'app, non protegge il download diretto dei file.
Prima dei pagamenti, le operazioni Premium dovranno anche essere autorizzate
dal server. Un futuro pagamento potrà concedere gli stessi identificatori
tramite un backend fidato (`source = payment`), senza cambiare l'interfaccia.
