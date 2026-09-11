LIVEASTA TEST-ASTA v0.74

Repository:
https://github.com/davidegolisano-design/Test-asta

Supabase:
https://qvkembahfeecfpsshepv.supabase.co

COSA CARICARE SU GITHUB
- index.html
- manifest-v22.webmanifest
- .nojekyll
- cartella supabase
- README_PRIMA_INSTALLAZIONE.txt

PRIMA DI PROVARE L'APP
1. Supabase > SQL Editor.
2. Esegui supabase/01_setup_schema.sql
3. Apri supabase/02_set_superuser_password.sql
4. Sostituisci SOSTITUISCI_QUI_LA_PASSWORD con la password Superuser desiderata.
5. Esegui anche il secondo SQL.
6. Apri l'app, entra come Superuser e carica il listone ufficiale Excel.
7. Approva le stanze che devono essere visibili ai giocatori.

GITHUB PAGES
Settings > Pages
Deploy from a branch
main
/(root)

ASSET
Per questo test miniature, audio e icone vengono letti dal repository live-asta esistente.
Non devi quindi duplicare adesso la cartella assets o i file MP3 nel repository Test-asta.
Il nuovo Supabase e tutta la logica dell'app restano invece separati.

Quando questa versione sarà stabile possiamo fare il pacchetto completamente indipendente
copiando anche tutti gli asset.
