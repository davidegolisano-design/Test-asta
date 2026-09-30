# Stanze automatiche v1.07.20-dev

Dev separata: `dev-automated-rooms-20260930`. La versione pubblica resta v1.07.19.

## Anteprima pronta

- Due stanze virtuali pubbliche: Lega del Martedì (Classic), Mantra League (Mantra).
- Nessuna riga in fanta_rooms: non possono essere selezionate né risolte come giocatore/banditore.
- 8 squadre, 500 crediti, 25 acquisti per squadra e reset automatico a fine ciclo.
- Listone reale: 532 calciatori, esportato dal riferimento miniature del superuser. Aggiornabile localmente con il relativo pulsante nel superuser.
- Motore puro e deterministico; strategie diverse, riserva crediti per gli slot, READY progressivi, SKIP e invenduti, rilanci, consegne progressive, apertura buste e spareggi.
- Controller nel superuser: nome, random/turni, rilanci/buste/alternanza, timer, attiva/disattiva, pausa/riprendi, reset.
- Nella dev i comandi sono conservati nel browser (localStorage); altri browser hanno configurazioni indipendenti. Non sono ancora comandi globali.
- Lista pubblica: conteggi reali tramite lettura Realtime Presence, solo nella schermata elenco, nessun tracking o invio offerte. Canali rimossi quando si esce/nasconde la pagina.
- Le aste simulate non aprono canali di stanza, non scrivono acquisti, non effettuano polling Supabase e non inviano log diagnostici. Il timer globale del controller legge solo la configurazione locale.

## Passaggio a configurazione condivisa

`db/automated-rooms-dev.sql` è una proposta NON APPLICATA. L'auto-review ha rifiutato la migrazione sul progetto condiviso perché l'autorizzazione riguardava una dev separata. Nessun tentativo alternativo di eseguirla è stato effettuato.

Per abilitarla occorre approvazione del target `qvkembahfeecfpsshepv` e delle nuove funzioni. La tabella è privata, con RLS, senza accesso diretto anon/authenticated; lettura pubblica solo per configurazioni prive di segreti, modifiche protette dalla verifica superuser già esistente e da revisione ottimistica. Gli endpoint sono nuovi e non sostituiscono quelli pubblici esistenti.

Per la proposta di conteggio aggregato da heartbeat, aggiungere il campo players_online al segnale del banditore prima di usare liveasta_spectator_directory_dev. La dev attuale usa invece Presence e non dipende da questi endpoint.

## Verifica

`node qa/demo-engine.test.cjs` copre 12 combinazioni e le invarianti di ciclo/rosa/budget/determinismo/reset/pausa. `node qa/spectator-presence.test.cjs` verifica deduplicazione e filtro spettatori.
`qa/demo-controls-preview.html` permette di provare i controlli locali senza autenticazione e senza API. Non è una schermata di accesso superuser.
