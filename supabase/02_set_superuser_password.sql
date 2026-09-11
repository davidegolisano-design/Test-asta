-- Sostituisci SOSTITUISCI_QUI_LA_PASSWORD e poi esegui nel SQL Editor.
insert into private.liveasta_secrets(key,secret_hash,updated_at)
values(
  'superuser_password',
  crypt('SOSTITUISCI_QUI_LA_PASSWORD',gen_salt('bf',10)),
  now()
)
on conflict(key) do update
set secret_hash=excluded.secret_hash,
    updated_at=now();
