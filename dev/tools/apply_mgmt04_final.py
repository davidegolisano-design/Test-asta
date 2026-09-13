from pathlib import Path

root=Path('.')
index_p=root/'dev/index.html'
app_p=root/'dev/scripts/app.js'

index=index_p.read_text(encoding='utf-8')
app=app_p.read_text(encoding='utf-8')

# Version/cache busting so mobile browsers actually receive MGMT-04.
index=index.replace('v0.97 MGMT-03','v0.98 MGMT-04')
index=index.replace('dev=097-mgmt03','dev=098-mgmt04')
index=index.replace('            v0.96\n','            v0.98\n',1)


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label} target not found')
    return text.replace(old,new,1)

# One canonical visual switch component: checkbox + shared track.
index=replace_once(index,
'''<button id="self-raise-toggle" class="mg-switch self-raise-switch" type="button" role="switch" aria-checked="true" aria-label="Autorilancio" onclick="toggleSelfRaiseFromUI(event)">Autorilancio</button>''',
'''<label class="mg-switch-label" title="Autorilancio"><input id="self-raise-toggle" type="checkbox" onchange="toggleSelfRaiseFromUI(event)" aria-label="Autorilancio"><span class="mg-switch-ui" aria-hidden="true"></span></label>''','self raise')

index=replace_once(index,
'''<button id="ready-toggle-btn" class="mg-switch" type="button" role="switch" aria-checked="false" aria-label="Ready prima dell'asta" onclick="toggleReadyMode()">Attiva READY</button>''',
'''<label class="mg-switch-label" title="Ready prima dell'asta"><input id="ready-toggle-btn" type="checkbox" onchange="toggleReadyMode()" aria-label="Ready prima dell'asta"><span class="mg-switch-ui" aria-hidden="true"></span></label>''','ready')

index=replace_once(index,
'''<button id="nomination-toggle-btn" class="mg-switch" type="button" role="switch" aria-checked="false" aria-label="Banditura giocatori a turni" onclick="toggleNominationMode()">Attiva banditura a turni</button>''',
'''<label class="mg-switch-label" title="Banditura giocatori a turni"><input id="nomination-toggle-btn" type="checkbox" onchange="toggleNominationMode()" aria-label="Banditura giocatori a turni"><span class="mg-switch-ui" aria-hidden="true"></span></label>''','nomination')

index=replace_once(index,
'''<button id="auctioneer-player-toggle-btn" class="mg-switch" type="button" role="switch" aria-checked="false" aria-label="Banditore giocatore" onclick="toggleAuctioneerPlayerMode()">Attiva banditore giocatore</button>''',
'''<label class="mg-switch-label" title="Banditore giocatore"><input id="auctioneer-player-toggle-btn" type="checkbox" onchange="toggleAuctioneerPlayerMode()" aria-label="Banditore giocatore"><span class="mg-switch-ui" aria-hidden="true"></span></label>''','auctioneer player')

# Use the same semantic role classes as the standard role filters.
for role in 'PDCA':
    old=f'<label class="mg-role-chip role-{role}"><input id="auto-random-role-{role}"'
    new=f'<label class="mg-role-chip unified-role role-{role}"><input id="auto-random-role-{role}"'
    index=replace_once(index,old,new,f'role {role}')

# Synchronize logical state to the real checkbox controls.
replacements=[
(
"if(toggle)toggle.setAttribute('aria-checked',selfRaiseEnabled?'true':'false');",
"if(toggle){toggle.checked=!!selfRaiseEnabled;toggle.setAttribute('aria-checked',selfRaiseEnabled?'true':'false');}"
),
(
"if(btn){btn.textContent=readyModeEnabled?'Disattiva READY':'Attiva READY';btn.setAttribute('aria-checked',String(readyModeEnabled));}",
"if(btn){btn.checked=!!readyModeEnabled;btn.textContent=readyModeEnabled?'Disattiva READY':'Attiva READY';btn.setAttribute('aria-checked',String(readyModeEnabled));}"
),
(
"btn.textContent=active?'Disattiva banditore giocatore':'Attiva banditore giocatore';\n                btn.setAttribute('aria-checked',String(active));",
"btn.checked=!!active;\n                btn.textContent=active?'Disattiva banditore giocatore':'Attiva banditore giocatore';\n                btn.setAttribute('aria-checked',String(active));"
),
(
"const t=document.getElementById('nomination-toggle-btn');if(t){t.textContent=nominationState.enabled?'Disattiva banditura a turni':'Attiva banditura a turni';t.setAttribute('aria-checked',String(!!nominationState.enabled));}",
"const t=document.getElementById('nomination-toggle-btn');if(t){t.checked=!!nominationState.enabled;t.textContent=nominationState.enabled?'Disattiva banditura a turni':'Attiva banditura a turni';t.setAttribute('aria-checked',String(!!nominationState.enabled));}"
)
]
for old,new in replacements:
    app=replace_once(app,old,new,'app switch sync')

index_p.write_text(index,encoding='utf-8')
app_p.write_text(app,encoding='utf-8')
print('MGMT-04 final patch applied')
