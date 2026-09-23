# DEV Premium · 1.07.2

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

## Collegamento al database: in attesa di autorizzazione

La pagina normale `index.html` utilizza il database condiviso con il sito
pubblico. La migrazione `supabase/premium-dev.sql` è preparata e verificata
localmente, ma **non è stata applicata**: la revisione automatica ha respinto
la modifica del database condiviso perché l'autorizzazione riguarda la dev.
Non ritentare senza autorizzazione esplicita per quel database.

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
