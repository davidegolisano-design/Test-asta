from pathlib import Path
import re
import sys

ROOT = Path('.')

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')

def replace_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected 1 occurrence, found {n}')
    return text.replace(old, new, 1)

def sub_once(text, pattern, repl, label, flags=0):
    out, n = re.subn(pattern, repl, text, count=1, flags=flags)
    if n != 1:
        raise SystemExit(f'{label}: expected 1 regex match, found {n}')
    return out

# -----------------------------------------------------------------------------
# index.html — version/cache, consistent password field, manual player list shell
# -----------------------------------------------------------------------------
index_path = 'dev/index.html'
index = read(index_path)
index = index.replace('v0.98 MGMT-04', 'v0.99 MGMT-05')
index = index.replace('            v0.98\n', '            v0.99\n', 1)

for asset in ['core.css','ui.css','management.css','theme-preload.js','theme.js','app.js']:
    index = re.sub(rf'(\./(?:styles|scripts)/{re.escape(asset)}\?dev=)[^"\']+', rf'\g<1>099-mgmt05', index)

index = replace_once(
    index,
    'id="auction-room-password" class="liveasta-secret-input"',
    'id="auction-room-password" class="minimal-input liveasta-secret-input"',
    'auctioneer room password class'
)

index = replace_once(
    index,
    '<select id="manual-player-select" class="minimal-input" size="7" onchange="updateManualAssignPreview()"></select>',
    '<div id="manual-player-list" class="manual-player-list" role="listbox" aria-label="Giocatori disponibili"></div>\n            <select id="manual-player-select" class="minimal-input" size="7" onchange="updateManualAssignPreview()" hidden aria-hidden="true" tabindex="-1"></select>',
    'manual player list shell'
)
write(index_path, index)

# -----------------------------------------------------------------------------
# core.css — remove the obsolete mobile Audio grid ownership that conflicts with
# the canonical management 2x2 toolbar.
# -----------------------------------------------------------------------------
core_path = 'dev/styles/core.css'
core = read(core_path)
legacy_audio = re.compile(r'\n#screen-room-control \.control-action-audio\{(?P<body>[^}]*)\}\n')
matches = list(legacy_audio.finditer(core))
removed = 0
parts = []
pos = 0
for m in matches:
    body = m.group('body')
    if 'grid-column:span 2!important' in body or 'order:-1!important' in body:
        parts.append(core[pos:m.start()])
        parts.append('\n')
        pos = m.end()
        removed += 1
parts.append(core[pos:])
if removed < 1:
    raise SystemExit('legacy management Audio grid rule not found')
core = ''.join(parts)
write(core_path, core)

# -----------------------------------------------------------------------------
# management.css — make Random role buttons use the same geometry/semantics as
# the canonical role filters. No late override layer: replace the component.
# -----------------------------------------------------------------------------
mg_path = 'dev/styles/management.css'
mg = read(mg_path)
mg = mg.replace('v0.98 MGMT-04', 'v0.99 MGMT-05', 1)
role_component = '''#screen-room-control .mg-role-choice{display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-top:12px;}
#screen-room-control .mg-role-chip{position:relative; min-width:0; height:42px; min-height:42px; padding:0; margin:0; display:grid; place-items:center; border:1px solid var(--mg-border); border-radius:9px; background:var(--filter-role-color,var(--mg-hover)); opacity:.32; cursor:pointer; overflow:hidden; box-shadow:none; transition:opacity .14s ease,transform .08s ease,box-shadow .14s ease;}
#screen-room-control .mg-role-chip input{position:absolute!important; opacity:0!important; pointer-events:none!important; width:1px!important; min-width:1px!important; max-width:1px!important; height:1px!important; min-height:1px!important; max-height:1px!important; margin:0!important; padding:0!important; border:0!important;}
#screen-room-control .mg-role-chip span{position:static!important; width:100%; height:100%; margin:0!important; padding:0!important; display:grid!important; place-items:center!important; text-align:center!important; font-weight:900; font-size:15px; line-height:1!important; transform:none!important;}
#screen-room-control .mg-role-chip.role-P{--filter-role-color:#ffda32;color:#101820;}
#screen-room-control .mg-role-chip.role-D{--filter-role-color:#24c968;color:#101820;}
#screen-room-control .mg-role-chip.role-C{--filter-role-color:#387ef5;color:#fff;}
#screen-room-control .mg-role-chip.role-A{--filter-role-color:#ed3e46;color:#fff;}
#screen-room-control .mg-role-chip.role-P span,#screen-room-control .mg-role-chip.role-D span{color:#101820!important;}
#screen-room-control .mg-role-chip.role-C span,#screen-room-control .mg-role-chip.role-A span{color:#fff!important;}
#screen-room-control .mg-role-chip:has(input:checked){opacity:1; box-shadow:inset 0 0 0 1px rgba(255,255,255,.30);}
#screen-room-control .mg-role-chip:active{transform:scale(.98);}
'''
mg = sub_once(
    mg,
    r'#screen-room-control \.mg-role-choice\{.*?#screen-room-control \.mg-role-chip:active\{transform:scale\(\.98\);\}\n',
    role_component,
    'canonical random role component',
    re.S
)

# Remove the old MGMT-04 strong role overrides now superseded by the canonical component.
mg = sub_once(
    mg,
    r'html\[data-live-theme\] #screen-room-control#screen-room-control \.mg-role-chip\{.*?#screen-room-control \.mg-role-chip span\{position:relative!important;z-index:1!important;display:block!important;\}\n',
    '',
    'remove obsolete strong role overrides',
    re.S
)
write(mg_path, mg)

# -----------------------------------------------------------------------------
# ui.css — PIN dialog text, manual assignment list, consistent auctioneer join
# fields, semantic player result colors for all themes.
# -----------------------------------------------------------------------------
ui_path = 'dev/styles/ui.css'
ui = read(ui_path)
ui = replace_once(
    ui,
    'html body .v093-player-pin-actions .btn{width:100%!important;margin:0!important;}',
    'html body .v093-player-pin-actions .btn{width:100%!important;min-width:0!important;margin:0!important;padding:12px 10px!important;font-size:clamp(.78rem,3.6vw,.98rem)!important;line-height:1.1!important;letter-spacing:.02em!important;white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important;}',
    'PIN dialog buttons'
)

ui_add = r'''

/* === v0.99 MGMT-05 — canonical access/manual assignment details === */
#screen-auctioneer-setup #auction-join-box :is(#auction-room-select,#auction-room-name-input,#auction-room-password){
  width:100%!important;height:52px!important;min-height:52px!important;max-height:52px!important;
  margin:0 0 10px!important;padding:0 14px!important;box-sizing:border-box!important;
  border:1px solid var(--theme-border)!important;border-radius:10px!important;
  background:var(--theme-input)!important;color:var(--theme-text)!important;
  font:500 1rem/1.2 Inter,system-ui,sans-serif!important;text-align:center!important;
}
#screen-auctioneer-setup #auction-room-password{letter-spacing:.02em!important;}

html body .v093-player-pin-actions .btn{min-height:48px!important;}
@media(max-width:340px){
  html body .v093-player-pin-actions{grid-template-columns:1fr!important;}
}

html body .manual-player-list{
  width:100%;max-height:min(36dvh,330px);overflow-y:auto;overscroll-behavior:contain;
  display:flex;flex-direction:column;gap:6px;padding:6px;box-sizing:border-box;
  border:1px solid var(--theme-border);border-radius:12px;background:var(--theme-input);
}
html body .manual-player-option{
  width:100%;min-width:0;min-height:54px;margin:0;padding:7px 10px!important;
  display:grid;grid-template-columns:38px minmax(0,1fr) 28px;align-items:center;gap:9px;
  border:1px solid var(--theme-border)!important;border-radius:10px!important;
  background:var(--theme-card)!important;color:var(--theme-text)!important;
  text-align:left!important;text-transform:none!important;letter-spacing:0!important;box-shadow:none!important;
}
html body .manual-player-option.selected{
  border-color:var(--theme-primary)!important;
  background:color-mix(in srgb,var(--theme-primary) 10%,var(--theme-card))!important;
  box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--theme-primary) 45%,transparent)!important;
}
html body .manual-player-role{
  width:34px;height:34px;display:grid;place-items:center;border-radius:50%;
  font-size:13px;font-weight:900;line-height:1;text-align:center;background:var(--theme-hover);color:var(--theme-text);
}
html body .manual-player-role.role-P{background:#ffda32;color:#101820;}
html body .manual-player-role.role-D{background:#24c968;color:#101820;}
html body .manual-player-role.role-C{background:#387ef5;color:#fff;}
html body .manual-player-role.role-A{background:#ed3e46;color:#fff;}
html body .manual-player-copy{min-width:0;display:flex;flex-direction:column;gap:2px;}
html body .manual-player-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;line-height:1.2;color:var(--theme-text);}
html body .manual-player-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:1.2;color:var(--theme-muted);}
html body .manual-player-chevron{display:grid;place-items:center;color:var(--theme-muted);font-size:22px;font-weight:900;}
html body #manual-player-select[hidden]{display:none!important;}
html body .manual-player-empty{padding:16px 10px;text-align:center;color:var(--theme-muted);font-size:13px;}

/* Auction outcome colors are semantic and theme-aware, especially on light themes. */
html[data-live-theme] #screen-player-buzzer .phone-top-area.player-winning #player-current-winner{color:var(--theme-success)!important;}
html[data-live-theme] #screen-player-buzzer .phone-top-area.player-losing #player-current-winner{color:var(--theme-danger)!important;}
'''
if 'v0.99 MGMT-05 — canonical access/manual assignment details' in ui:
    raise SystemExit('MGMT-05 ui block already present')
ui += ui_add
write(ui_path, ui)

# -----------------------------------------------------------------------------
# app.js — checkbox visual state follows authorised state, hybrid nav cleanup,
# theme-aware result colors, custom manual assignment list while keeping the
# existing hidden select as the logic bridge.
# -----------------------------------------------------------------------------
app_path = 'dev/scripts/app.js'
app = read(app_path)

app = replace_once(
    app,
    '        async function toggleAuctioneerPlayerMode(){\n            if(auctioneerPlayerMode){',
    '        async function toggleAuctioneerPlayerMode(){\n            // A native checkbox changes visually before the async PIN check.\n            // Keep it on the authorised state until verification succeeds.\n            const visualToggle=document.getElementById(\'auctioneer-player-toggle-btn\');\n            if(visualToggle)visualToggle.checked=!!auctioneerPlayerMode;\n            if(auctioneerPlayerMode){',
    'auctioneer player async toggle guard'
)
app = replace_once(
    app,
    '            if(auctioneerPlayerMode){\n                auctioneerPlayerMode=false;\n                myTeamId=null;',
    '            if(auctioneerPlayerMode){\n                auctioneerPlayerMode=false;\n                restoreHybridPlayerNav();\n                myTeamId=null;',
    'hybrid nav reset on disable'
)
app = replace_once(
    app,
    "            if(screenId==='screen-player-buzzer' && isAuctioneerPlayerIdentity())configureHybridPlayerIdentity();",
    "            if(screenId==='screen-player-buzzer' && isAuctioneerPlayerIdentity())configureHybridPlayerIdentity();\n            if(screenId==='screen-player-buzzer' && !isAuctioneerPlayerIdentity())restoreHybridPlayerNav();",
    'normal player nav restoration'
)
app = replace_once(
    app,
    '            if (!activeAuction && !await appConfirm("Vuoi uscire dalla stanza e tornare alla Home?")) return;',
    '            if (!activeAuction && !await appConfirm("Vuoi uscire dalla stanza e tornare alla Home?")) return;\n            restoreHybridPlayerNav();',
    'session exit hybrid cleanup'
)

manual_render = r'''        function renderManualPlayerOptions(){
            const sel=document.getElementById('manual-player-select');
            const listBox=document.getElementById('manual-player-list');
            if(!sel)return;

            const previous=String(sel.value||'');
            const list=filterAndSortPlayers(manualAvailablePlayers(),'manual');

            sel.innerHTML=list.length
                ? '<option value="">Seleziona un giocatore...</option>'+
                  list.map(p=>`<option value="${escapeHtml(String(p.Id))}">[${escapeHtml(playerRole(p)||'-')}] ${escapeHtml(p.Nome||'')} · ${escapeHtml(p.Squadra||'')}</option>`).join('')
                : '<option value="">Nessun giocatore disponibile</option>';

            if(previous && list.some(p=>String(p.Id)===previous))sel.value=previous;

            if(listBox){
                if(!list.length){
                    listBox.innerHTML='<div class="manual-player-empty">Nessun giocatore disponibile</div>';
                }else{
                    listBox.innerHTML=list.map(p=>{
                        const id=String(p.Id);
                        const role=String(playerRole(p)||'-').toUpperCase();
                        const roleClass=['P','D','C','A'].includes(role)?` role-${role}`:'';
                        const selected=String(sel.value||'')===id?' selected':'';
                        return `<button type="button" class="manual-player-option${selected}" role="option" aria-selected="${selected?'true':'false'}" data-player-id="${escapeHtml(id)}" onclick="selectManualPlayerFromList(this.dataset.playerId)">
                            <span class="manual-player-role${roleClass}">${escapeHtml(role)}</span>
                            <span class="manual-player-copy"><strong>${escapeHtml(p.Nome||'--')}</strong><small>${escapeHtml(p.Squadra||'--')}</small></span>
                            <span class="manual-player-chevron" aria-hidden="true">›</span>
                        </button>`;
                    }).join('');
                }
            }

            updateManualAssignPreview();
        }

        function selectManualPlayerFromList(playerId){
            const sel=document.getElementById('manual-player-select');
            if(!sel)return;
            sel.value=String(playerId||'');
            document.querySelectorAll('#manual-player-list .manual-player-option').forEach(row=>{
                const active=String(row.dataset.playerId||'')===String(sel.value||'');
                row.classList.toggle('selected',active);
                row.setAttribute('aria-selected',active?'true':'false');
            });
            updateManualAssignPreview();
        }

        function updateManualAssignPreview(){'''
app = sub_once(
    app,
    r'        function renderManualPlayerOptions\(\)\{.*?\n        \}\n\n        function updateManualAssignPreview\(\)\{',
    manual_render,
    'manual player renderer',
    re.S
)

# Semantic theme tokens for player outcome text. Keep fallbacks for legacy themes.
replacements = {
    "winner.style.color='var(--accent-green)'":"winner.style.color='var(--theme-success,var(--accent-green))'",
    "winner.style.color='var(--accent-red)'":"winner.style.color='var(--theme-danger,var(--accent-red))'",
    "winner.style.color='var(--text-muted)'":"winner.style.color='var(--theme-muted,var(--text-muted))'",
    "winner.style.color=allowed?'var(--text-main)':'var(--text-muted)'":"winner.style.color=allowed?'var(--theme-text,var(--text-main))':'var(--theme-muted,var(--text-muted))'",
    "winner.style.color=currentWinner?(playerHasBidThisAuction?'var(--accent-green)':'var(--accent-red)'):'var(--text-muted)'":"winner.style.color=currentWinner?(playerHasBidThisAuction?'var(--theme-success,var(--accent-green))':'var(--theme-danger,var(--accent-red))'):'var(--theme-muted,var(--text-muted))'",
    "winner.style.color=currentWinner?'var(--accent-red)':'var(--text-muted)'":"winner.style.color=currentWinner?'var(--theme-danger,var(--accent-red))':'var(--theme-muted,var(--text-muted))'",
    "winnerEl.style.color='var(--accent-green)'":"winnerEl.style.color='var(--theme-success,var(--accent-green))'",
    "winnerEl.style.color=currentWinner?'var(--accent-red)':'var(--text-muted)'":"winnerEl.style.color=currentWinner?'var(--theme-danger,var(--accent-red))':'var(--theme-muted,var(--text-muted))'",
}
for old,new in replacements.items():
    app = app.replace(old,new)
write(app_path, app)

# -----------------------------------------------------------------------------
# theme-preload.js — apply the real saved theme tokens before first paint. This
# removes the wrong-theme flash on refresh/open and matches theme.js runtime.
# -----------------------------------------------------------------------------
preload_path = 'dev/scripts/theme-preload.js'
preload = r'''(function(){
  const KEY='liveasta_theme';
  const THEMES={
    broadcast:{base:'broadcast',bg:'#11151B',deep:'#0B0E12',card:'#1A2028',panel:'#151A21',hover:'#242C36',input:'#171D24',border:'#3A4654',text:'#F6F2E8',muted:'#B8B1A3',soft:'#8E887E',primary:'#C9A84E',primaryHover:'#B5933E',accent:'#D5B45A',number:'#D5B45A',danger:'#D84A55',success:'#2DA66F',meta:'#11151B'},
    stadium:{base:'stadium',bg:'#120018',deep:'#08000D',card:'#21002B',panel:'#180020',hover:'#350044',input:'#1B0024',border:'#B535FF',text:'#FFFFFF',muted:'#58F2E1',soft:'#C99BE8',primary:'#B535FF',primaryHover:'#9B1CFF',accent:'#50EAD8',number:'#FF338B',danger:'#FF338B',success:'#9AFF20',meta:'#120018'},
    carbon:{base:'carbon',bg:'#101214',deep:'#090B0C',card:'#191C1F',panel:'#14171A',hover:'#252A2E',input:'#171A1D',border:'#3A4248',text:'#F4F6F7',muted:'#AEB6BC',soft:'#7F898F',primary:'#46B7A8',primaryHover:'#369A8E',accent:'#E18A4A',number:'#E18A4A',danger:'#E2535F',success:'#46B77B',meta:'#101214'},
    'light-neutral':{base:'light-neutral',bg:'#F6F1E7',deep:'#E9E0D1',card:'#FFFDF9',panel:'#F9F5ED',hover:'#ECE5D9',input:'#FFFFFF',border:'#CFC3B2',text:'#25231F',muted:'#6B655D',soft:'#8B8379',primary:'#3B6F73',primaryHover:'#315D60',accent:'#B17A2B',number:'#A96F20',danger:'#B94750',success:'#2D8E63',meta:'#F6F1E7'},
    'light-blue':{base:'light-blue',bg:'#F7F2FA',deep:'#EEE3F3',card:'#FFFFFF',panel:'#FCF8FE',hover:'#F0E4F5',input:'#FFFFFF',border:'#CFA7DF',text:'#25002F',muted:'#674B70',soft:'#846B8C',primary:'#9D22E8',primaryHover:'#8512D0',accent:'#00AFA0',number:'#E60068',danger:'#E60068',success:'#61A900',meta:'#F7F2FA'},
    'light-sand':{base:'light-sand',bg:'#F3F5F6',deep:'#E4E8EA',card:'#FFFFFF',panel:'#F8F9FA',hover:'#E8ECEE',input:'#FFFFFF',border:'#C3CCD1',text:'#1D2529',muted:'#657178',soft:'#849097',primary:'#267E76',primaryHover:'#1F6962',accent:'#C86D32',number:'#B85F28',danger:'#BF4653',success:'#267E76',meta:'#F3F5F6'},
    'ocean-daily':{base:'light-blue',bg:'#ECF8F8',deep:'#D8EEEE',card:'#FFFFFF',panel:'#F4FBFB',hover:'#DCEFEF',input:'#FFFFFF',border:'#A9CCCC',text:'#123536',muted:'#527475',soft:'#769394',primary:'#087F82',primaryHover:'#066A6D',accent:'#E28B3E',number:'#087F82',danger:'#C94655',success:'#138B64',meta:'#ECF8F8'},
    'ocean-dark':{base:'carbon',bg:'#061819',deep:'#031011',card:'#0C2527',panel:'#081E20',hover:'#123436',input:'#092225',border:'#256266',text:'#F2FCFC',muted:'#9BC7C8',soft:'#6F999B',primary:'#20C7C9',primaryHover:'#12AAAC',accent:'#FF9A4A',number:'#46DBDD',danger:'#FF5968',success:'#36D39A',meta:'#061819'},
    'sunset-daily':{base:'light-sand',bg:'#FFF3EC',deep:'#F5E1D6',card:'#FFFDFB',panel:'#FFF8F3',hover:'#F5E5DB',input:'#FFFFFF',border:'#DDBEAD',text:'#3A211B',muted:'#795F56',soft:'#987C72',primary:'#C9572F',primaryHover:'#AA4626',accent:'#A84A7C',number:'#C9572F',danger:'#C33D4B',success:'#32855D',meta:'#FFF3EC'},
    'sunset-dark':{base:'carbon',bg:'#1B0D10',deep:'#100709',card:'#291319',panel:'#211015',hover:'#3A1C24',input:'#241116',border:'#70404B',text:'#FFF5F1',muted:'#D3ABA1',soft:'#A47C74',primary:'#FF7048',primaryHover:'#E95D37',accent:'#FFB347',number:'#FF8A63',danger:'#FF4E63',success:'#47C987',meta:'#1B0D10'},
    'royal-daily':{base:'light-neutral',bg:'#F6F2FC',deep:'#E9E1F5',card:'#FFFFFF',panel:'#FAF8FD',hover:'#EBE3F4',input:'#FFFFFF',border:'#CBBCE0',text:'#2B2038',muted:'#695C78',soft:'#8A7B99',primary:'#6D47A8',primaryHover:'#59378F',accent:'#C4932F',number:'#6D47A8',danger:'#C34458',success:'#2B8A62',meta:'#F6F2FC'},
    'royal-dark':{base:'carbon',bg:'#110B1D',deep:'#09060F',card:'#1C132C',panel:'#171025',hover:'#2A1D40',input:'#191128',border:'#554078',text:'#FBF7FF',muted:'#C0B1D2',soft:'#8F7EA4',primary:'#9B70E5',primaryHover:'#865AD3',accent:'#E1B857',number:'#B58AF0',danger:'#F05C70',success:'#4AC78D',meta:'#110B1D'}
  };
  const VARS={bg:'--theme-bg',deep:'--theme-bg-deep',card:'--theme-card',panel:'--theme-panel',hover:'--theme-hover',input:'--theme-input',border:'--theme-border',text:'--theme-text',muted:'--theme-muted',soft:'--theme-soft',primary:'--theme-primary',primaryHover:'--theme-primary-hover',accent:'--theme-accent',number:'--theme-number',danger:'--theme-danger',success:'--theme-success'};
  try{
    let name=localStorage.getItem(KEY)||'broadcast';
    if(!THEMES[name]){name='broadcast';localStorage.setItem(KEY,name);}
    const t=THEMES[name];
    const root=document.documentElement;
    root.setAttribute('data-live-theme',t.base||name);
    root.setAttribute('data-theme-choice',name);
    Object.entries(VARS).forEach(([key,cssVar])=>root.style.setProperty(cssVar,t[key],'important'));
    root.style.setProperty('background-color',t.meta,'important');
    const light=String(name).includes('daily')||String(name).startsWith('light-');
    root.style.colorScheme=light?'light':'dark';
    let meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.content=t.meta;
    let scheme=document.querySelector('meta[name="color-scheme"]');
    if(scheme)scheme.content=light?'light':'dark';
    let ms=document.querySelector('meta[name="msapplication-navbutton-color"]');
    if(ms)ms.content=t.meta;
  }catch(e){
    document.documentElement.setAttribute('data-live-theme','broadcast');
    document.documentElement.setAttribute('data-theme-choice','broadcast');
    document.documentElement.style.backgroundColor='#11151B';
  }
})();
'''
write(preload_path, preload)

# -----------------------------------------------------------------------------
# Static validation
# -----------------------------------------------------------------------------
checks = {
    index_path:[
        'v0.99 MGMT-05',
        'class="minimal-input liveasta-secret-input" placeholder="Password stanza"',
        'id="manual-player-list"',
        'core.css?dev=099-mgmt05',
        'app.js?dev=099-mgmt05'
    ],
    mg_path:['--filter-role-color:#ffda32','place-items:center'],
    ui_path:['manual-player-option','v0.99 MGMT-05 — canonical access/manual assignment details'],
    app_path:['selectManualPlayerFromList','Keep it on the authorised state until verification succeeds.','--theme-success'],
    preload_path:["'ocean-daily'","'sunset-daily'","'royal-daily'",'--theme-success']
}
for path, needles in checks.items():
    text=read(path)
    for needle in needles:
        if needle not in text:
            raise SystemExit(f'{path}: missing validation marker {needle!r}')

if 'grid-column:span 2!important;\n  order:-1!important;' in read(core_path):
    raise SystemExit('legacy Audio toolbar grid ownership still present')

print('MGMT-05 patch applied and statically validated')
