from pathlib import Path
import re

root=Path('.')
index_p=root/'dev/index.html'
app_p=root/'dev/scripts/app.js'
mgjs_p=root/'dev/scripts/management.js'
css_p=root/'dev/styles/management.css'

index=index_p.read_text(encoding='utf-8')
app=app_p.read_text(encoding='utf-8')
mgjs=mgjs_p.read_text(encoding='utf-8')
css=css_p.read_text(encoding='utf-8')

index=index.replace('v0.97 MGMT-03','v0.98 MGMT-04').replace('dev=097-mgmt03','dev=098-mgmt04').replace('>v0.96<','>v0.98<')
css=css.replace('v0.97 MGMT-03','v0.98 MGMT-04')
mgjs=mgjs.replace('v0.97 MGMT-03','v0.98 MGMT-04')

# Canonical switch component: replace button-based switches with checkbox + track.
def replace_once(old,new,label):
    global index
    if old not in index:
        raise SystemExit(f'{label} markup not found')
    index=index.replace(old,new,1)

replace_once(
'''<button id="self-raise-toggle" class="mg-switch self-raise-switch" type="button" role="switch" aria-checked="true" aria-label="Autorilancio" onclick="toggleSelfRaiseFromUI(event)">Autorilancio</button>''',
'''<label class="mg-switch-label" title="Autorilancio"><input id="self-raise-toggle" type="checkbox" onchange="toggleSelfRaiseFromUI(event)" aria-label="Autorilancio"><span class="mg-switch-ui" aria-hidden="true"></span></label>''','self raise')

replace_once(
'''<button id="ready-toggle-btn" class="mg-switch" type="button" role="switch" aria-checked="false" aria-label="Ready prima dell'asta" onclick="toggleReadyMode()">Attiva READY</button>''',
'''<label class="mg-switch-label" title="Ready prima dell'asta"><input id="ready-toggle-btn" type="checkbox" onchange="toggleReadyMode()" aria-label="Ready prima dell'asta"><span class="mg-switch-ui" aria-hidden="true"></span></label>''','ready')

replace_once(
'''<button id="nomination-toggle-btn" class="mg-switch" type="button" role="switch" aria-checked="false" aria-label="Banditura giocatori a turni" onclick="toggleNominationMode()">Attiva banditura a turni</button>''',
'''<label class="mg-switch-label" title="Banditura giocatori a turni"><input id="nomination-toggle-btn" type="checkbox" onchange="toggleNominationMode()" aria-label="Banditura giocatori a turni"><span class="mg-switch-ui" aria-hidden="true"></span></label>''','nomination')

replace_once(
'''<button id="auctioneer-player-toggle-btn" class="mg-switch" type="button" role="switch" aria-checked="false" aria-label="Banditore giocatore" onclick="toggleAuctioneerPlayerMode()">Attiva banditore giocatore</button>''',
'''<label class="mg-switch-label" title="Banditore giocatore"><input id="auctioneer-player-toggle-btn" type="checkbox" onchange="toggleAuctioneerPlayerMode()" aria-label="Banditore giocatore"><span class="mg-switch-ui" aria-hidden="true"></span></label>''','auctioneer player')

# Standard role filter visual classes for auto-random.
for role in 'PDCA':
    index=index.replace(f'<label class="mg-role-chip role-{role}"><input id="auto-random-role-{role}"',f'<label class="mg-role-chip unified-role role-{role}"><input id="auto-random-role-{role}"',1)

# Keep header actions in strict 2x2 semantic order.
header_old='''<div class="mg-header-actions">
                <button class="btn btn-secondary audio-toolbar-btn control-action-audio" type="button" onclick="openAudioMixer()">🔊 Audio</button>
                <button class="btn btn-danger control-action-reset" type="button" onclick="resetRoomRuntimeState()">⟳ Reset</button>
                <button class="btn btn-secondary control-action-import-csv" type="button" onclick="openCsvRosterImport()">↑ Importa</button>
                <button class="btn btn-green control-action-csv" type="button" onclick="exportRoseCSV()">Esporta</button>
            </div>'''
header_new='''<div class="mg-header-actions">
                <button class="btn btn-secondary audio-toolbar-btn control-action-audio" type="button" onclick="openAudioMixer()">🔊 Audio</button>
                <button class="btn btn-danger control-action-reset" type="button" onclick="resetRoomRuntimeState()">⟳ Reset</button>
                <button class="btn btn-secondary control-action-import-csv" type="button" onclick="openCsvRosterImport()">↑ Importa</button>
                <button class="btn btn-green control-action-csv" type="button" onclick="exportRoseCSV()">Esporta</button>
            </div>'''
if header_old not in index: raise SystemExit('header actions block not found')
index=index.replace(header_old,header_new,1)

# App state -> checkbox checked synchronization.
repls=[
("if(toggle)toggle.setAttribute('aria-checked',selfRaiseEnabled?'true':'false');", "if(toggle){toggle.checked=!!selfRaiseEnabled;toggle.setAttribute('aria-checked',selfRaiseEnabled?'true':'false');}"),
("if(btn){btn.textContent=readyModeEnabled?'Disattiva READY':'Attiva READY';btn.setAttribute('aria-checked',String(readyModeEnabled));}", "if(btn){btn.checked=!!readyModeEnabled;btn.textContent=readyModeEnabled?'Disattiva READY':'Attiva READY';btn.setAttribute('aria-checked',String(readyModeEnabled));}"),
("btn.textContent=active?'Disattiva banditore giocatore':'Attiva banditore giocatore';\n                btn.setAttribute('aria-checked',String(active));", "btn.checked=!!active;\n                btn.textContent=active?'Disattiva banditore giocatore':'Attiva banditore giocatore';\n                btn.setAttribute('aria-checked',String(active));"),
("const t=document.getElementById('nomination-toggle-btn');if(t){t.textContent=nominationState.enabled?'Disattiva banditura a turni':'Attiva banditura a turni';t.setAttribute('aria-checked',String(!!nominationState.enabled));}", "const t=document.getElementById('nomination-toggle-btn');if(t){t.checked=!!nominationState.enabled;t.textContent=nominationState.enabled?'Disattiva banditura a turni':'Attiva banditura a turni';t.setAttribute('aria-checked',String(!!nominationState.enabled));}")
]
for old,new in repls:
    if old not in app: raise SystemExit('app sync target missing: '+old[:55])
    app=app.replace(old,new,1)

# Management presence: host+player on same device is online unless explicitly marked absent.
presence_old="""      if(typeof absentTeamIds!=='undefined' && absentTeamIds?.has(id)) return {key:'absent',label:'ASSENTE'};\n      const p=(typeof onlinePlayers!=='undefined' && onlinePlayers?.get)?onlinePlayers.get(id):null;"""
presence_new="""      if(typeof absentTeamIds!=='undefined' && absentTeamIds?.has(id)) return {key:'absent',label:'ASSENTE'};\n      if(typeof auctioneerPlayerMode!=='undefined' && auctioneerPlayerMode && typeof auctioneerPlayerTeamId!=='undefined' && String(auctioneerPlayerTeamId||'')===id) return {key:'online',label:'ONLINE'};\n      const p=(typeof onlinePlayers!=='undefined' && onlinePlayers?.get)?onlinePlayers.get(id):null;"""
if presence_old not in mgjs: raise SystemExit('presence target not found')
mgjs=mgjs.replace(presence_old,presence_new,1)

# Canonical Gestione widths/header and switch details. Replace existing rules rather than layering another file.
css=css.replace('#screen-room-control .mg-header-actions{display:grid; grid-template-columns:repeat(2,minmax(120px,1fr)); gap:8px; min-width:280px;}', '#screen-room-control .mg-header-actions{display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; width:100%; min-width:0;}')
css=css.replace('#screen-room-control .mg-content{width:min(1240px,100%); margin:0 auto; padding:22px 18px 44px; display:flex; flex-direction:column; gap:30px;}', '#screen-room-control .mg-content{width:100%; max-width:1240px; margin:0 auto; padding:22px 10px 44px; display:flex; flex-direction:column; gap:30px;}')
css=css.replace('#screen-room-control .nomination-control-card:has(#nomination-toggle-btn[aria-checked="false"]) .mg-nomination-details{display:none;}', '#screen-room-control .nomination-control-card:has(#nomination-toggle-btn:not(:checked)) .mg-nomination-details{display:none;}')

# Replace auto-random role visual block with the standard role-filter language.
css,n=re.subn(r'''#screen-room-control \.mg-role-choice\{.*?#screen-room-control \.mg-role-chip:active\{transform:scale\(\.98\);\}''', '''#screen-room-control .mg-role-choice{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px;}\n#screen-room-control .mg-role-chip{position:relative;min-height:42px;display:flex;align-items:center;justify-content:center;border:1px solid var(--mg-border);border-radius:9px;background:var(--mg-hover);cursor:pointer;box-shadow:none;transition:transform .08s ease,background .14s ease,border-color .14s ease,opacity .14s ease;}\n#screen-room-control .mg-role-chip input{position:absolute!important;opacity:0!important;pointer-events:none!important;width:1px!important;height:1px!important;}\n#screen-room-control .mg-role-chip span{font-weight:900;font-size:15px;color:var(--mg-muted);}\n#screen-room-control .mg-role-chip:has(input:checked){border-color:transparent;box-shadow:none;}\n#screen-room-control .mg-role-chip.role-P:has(input:checked){background:#facc15;}\n#screen-room-control .mg-role-chip.role-D:has(input:checked){background:#22c55e;}\n#screen-room-control .mg-role-chip.role-C:has(input:checked){background:#3b82f6;}\n#screen-room-control .mg-role-chip.role-A:has(input:checked){background:#ef4444;}\n#screen-room-control .mg-role-chip.role-P:has(input:checked) span,#screen-room-control .mg-role-chip.role-D:has(input:checked) span{color:#111;}\n#screen-room-control .mg-role-chip.role-C:has(input:checked) span,#screen-room-control .mg-role-chip.role-A:has(input:checked) span{color:#fff;}\n#screen-room-control .mg-role-chip:active{transform:scale(.98);}''', css, count=1, flags=re.S)
if n!=1: raise SystemExit('role CSS block not replaced')

# Mobile: same edge usage as auctioneer board, opaque sticky header, full-width action grid.
mobile='''\n@media (max-width: 700px){\n  #screen-room-control .mg-header{position:sticky!important;top:0!important;z-index:80!important;padding:8px 6px 9px!important;background:var(--mg-card)!important;backdrop-filter:none!important;}\n  #screen-room-control .mg-header-main{width:100%!important;display:grid!important;grid-template-columns:auto 1fr!important;align-items:center!important;gap:8px!important;}\n  #screen-room-control .mg-heading h1{font-size:18px!important;}\n  #screen-room-control .mg-header-actions{grid-template-columns:repeat(2,minmax(0,1fr))!important;width:100%!important;gap:7px!important;}\n  #screen-room-control .mg-header-actions .btn{width:100%!important;min-width:0!important;min-height:42px!important;}\n  #screen-room-control .mg-content{width:100%!important;max-width:none!important;margin:0!important;padding:12px 6px 30px!important;gap:22px!important;}\n  #screen-room-control .mg-section-head{padding:0 2px!important;}\n  #screen-room-control .mg-card{border-radius:12px!important;padding:12px!important;}\n}\n'''
# Replace previous MGMT-03 mobile canonical block if present, otherwise append within owner file.
css += mobile

index_p.write_text(index,encoding='utf-8')
app_p.write_text(app,encoding='utf-8')
mgjs_p.write_text(mgjs,encoding='utf-8')
css_p.write_text(css,encoding='utf-8')
print('MGMT-04 applied')
