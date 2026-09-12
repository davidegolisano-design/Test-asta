from pathlib import Path
import re

root = Path('.')
index_path = root / 'dev/index.html'
ui_path = root / 'dev/styles/ui.css'
mg_old_path = root / 'dev/styles/management-system.css'
mg_path = root / 'dev/styles/management.css'
management_js_path = root / 'dev/scripts/management.js'

index = index_path.read_text(encoding='utf-8')

screen = r'''<div id="screen-room-control" class="screen">
    <div class="mg-page control-grid">
        <header class="mg-header">
            <div class="mg-header-main">
                <button class="btn btn-secondary mg-back" type="button" onclick="closeRoomControl()">← Asta</button>
                <div class="mg-heading">
                    <h1>Gestione asta</h1>
                    <div class="room-pill mg-room-pill" id="control-room-pill">STANZA <b>--</b></div>
                </div>
            </div>
            <div class="mg-header-actions">
                <button class="btn btn-secondary audio-toolbar-btn control-action-audio" type="button" onclick="openAudioMixer()">🔊 Audio</button>
                <button class="btn btn-danger control-action-reset" type="button" onclick="resetRoomRuntimeState()">⟳ Reset</button>
                <button class="btn btn-secondary control-action-import-csv" type="button" onclick="openCsvRosterImport()">↑ Importa</button>
                <button class="btn btn-green control-action-csv" type="button" onclick="exportRoseCSV()">Esporta</button>
            </div>
        </header>

        <main class="mg-content">
            <section class="mg-section mg-section-room" aria-labelledby="mg-room-title">
                <div class="mg-section-head">
                    <div><span class="mg-kicker">STANZA</span><h2 id="mg-room-title">Regole e configurazione</h2></div>
                    <p>Accesso, tempi e composizione delle rose.</p>
                </div>

                <article class="mg-card room-rules-card mg-span-2">
                    <div class="mg-room-layout">
                        <div class="mg-subcard">
                            <div class="mg-subcard-head"><h3>Accesso stanza</h3><span id="control-game-mode-badge" class="room-system-badge">CLASSIC</span></div>
                            <div class="mg-fields mg-fields-2 mg-access-fields">
                                <label><span class="field-label">Nome stanza</span><input id="control-room-name" class="minimal-input"></label>
                                <label><span class="field-label">Password</span><input id="control-room-password" class="minimal-input"></label>
                            </div>
                        </div>

                        <div class="mg-subcard">
                            <div class="mg-subcard-head"><h3>Tempi asta</h3></div>
                            <div class="mg-fields mg-fields-timers">
                                <label><span class="field-label">Timer asta</span><input id="control-room-timer" type="number" class="minimal-input" min="1" max="60"></label>
                                <label><span class="field-label">Blocco rilanci</span><input id="control-bid-cooldown" type="number" class="minimal-input" min="0.1" max="5" step="0.1" inputmode="decimal" value="0.5"></label>
                                <label><span class="field-label">Pre-asta</span><input id="control-room-prep" type="number" class="minimal-input" min="1" max="15"></label>
                                <label><span class="field-label">Busta chiusa</span><input id="control-sealed-timer" type="number" class="minimal-input" min="5" max="180" value="30"></label>
                                <label><span class="field-label">Apertura buste</span><input id="control-sealed-reveal-timer" type="number" class="minimal-input" min="1" max="30" value="5"></label>
                            </div>
                        </div>

                        <div class="mg-subcard mg-roster-rules">
                            <div class="mg-subcard-head"><h3>Composizione rosa</h3></div>
                            <div id="control-classic-limits" class="mg-fields mg-role-limits setup-grid-4">
                                <label><span class="field-label">Portieri</span><input id="control-limit-P" type="number" class="minimal-input" min="0"></label>
                                <label><span class="field-label">Difensori</span><input id="control-limit-D" type="number" class="minimal-input" min="0"></label>
                                <label><span class="field-label">Centrocampisti</span><input id="control-limit-C" type="number" class="minimal-input" min="0"></label>
                                <label><span class="field-label">Attaccanti</span><input id="control-limit-A" type="number" class="minimal-input" min="0"></label>
                            </div>
                            <div id="control-mantra-rules" class="mantra-control-rules" style="display:none;">
                                <div class="mantra-rule-summary"><b>MANTRA · Rosa libera</b><span>Minimo 23 giocatori · almeno 2 Por · nessun limite Dc/Dd/Ds/B/E/M/C/W/T/A/Pc.</span></div>
                                <div class="mg-fields mg-fields-2">
                                    <label><span class="field-label">Rosa massima</span><input id="control-mantra-max-roster" type="number" class="minimal-input" min="23" max="90" value="30" inputmode="numeric"></label>
                                    <div><span class="field-label">Vincoli minimi</span><div class="mantra-fixed-rule">23 giocatori · 2 portieri</div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="mg-card-actions"><button class="btn btn-green" type="button" onclick="saveRoomConfig()">Salva impostazioni</button></div>
                </article>
            </section>

            <section class="mg-section mg-section-auction" aria-labelledby="mg-auction-title">
                <div class="mg-section-head">
                    <div><span class="mg-kicker">MODALITÀ ASTA</span><h2 id="mg-auction-title">Comportamenti e automatismi</h2></div>
                    <p>Attiva solo ciò che serve alla sessione.</p>
                </div>
                <div class="mg-grid-2">
                    <article class="mg-card self-raise-control-card mg-setting-card">
                        <div class="mg-setting-head">
                            <div><h3>Autorilancio</h3><p>Consente al miglior offerente di rilanciare nuovamente su se stesso.</p></div>
                            <button id="self-raise-toggle" class="mg-switch self-raise-switch" type="button" role="switch" aria-checked="true" aria-label="Autorilancio" onclick="toggleSelfRaiseFromUI(event)">Autorilancio</button>
                        </div>
                        <input id="self-raise-enabled" type="checkbox" tabindex="-1" aria-hidden="true" hidden>
                        <span id="self-raise-control-badge" class="mg-legacy-state">ATTIVO</span>
                        <div id="self-raise-control-status" class="mg-status-text" aria-live="polite">Autorilancio consentito.</div>
                    </article>

                    <article class="mg-card ready-control-card mg-setting-card">
                        <div class="mg-setting-head">
                            <div><h3>Ready prima dell'asta</h3><p>Le squadre rispondono READY o SKIP prima del countdown.</p></div>
                            <button id="ready-toggle-btn" class="mg-switch" type="button" role="switch" aria-checked="false" aria-label="Ready prima dell'asta" onclick="toggleReadyMode()">Attiva READY</button>
                        </div>
                        <span id="ready-control-badge" class="mg-legacy-state">DISATTIVO</span>
                        <div id="ready-control-status" class="mg-status-text" aria-live="polite">Modalità disattivata</div>
                    </article>

                    <article class="mg-card auto-random-control-card mg-setting-card">
                        <div class="mg-setting-head">
                            <div><h3>Random automatico</h3><p>Estrae automaticamente tra i ruoli selezionati.</p></div>
                            <label class="mg-switch-label" title="Attiva random automatico">
                                <input id="auto-random-enabled" type="checkbox" onchange="setAutoRandomEnabled(this.checked)">
                                <span class="mg-switch-ui" aria-hidden="true"></span>
                                <span class="sr-only">Random automatico</span>
                            </label>
                        </div>
                        <div class="mg-role-choice" aria-label="Ruoli random automatico">
                            <label class="mg-role-chip role-P"><input id="auto-random-role-P" type="checkbox" onchange="setAutoRandomRole('P',this.checked)"><span>P</span></label>
                            <label class="mg-role-chip role-D"><input id="auto-random-role-D" type="checkbox" onchange="setAutoRandomRole('D',this.checked)"><span>D</span></label>
                            <label class="mg-role-chip role-C"><input id="auto-random-role-C" type="checkbox" onchange="setAutoRandomRole('C',this.checked)"><span>C</span></label>
                            <label class="mg-role-chip role-A"><input id="auto-random-role-A" type="checkbox" onchange="setAutoRandomRole('A',this.checked)"><span>A</span></label>
                        </div>
                        <div id="auto-random-status" class="mg-status-text auto-random-status">DISATTIVO</div>
                    </article>

                    <article class="mg-card nomination-control-card mg-setting-card mg-span-2">
                        <div class="mg-setting-head">
                            <div><h3>Banditura giocatori a turni</h3><p id="nomination-control-note">Si completa un ruolo alla volta. Chi ha completato il reparto viene saltato automaticamente.</p></div>
                            <button id="nomination-toggle-btn" class="mg-switch" type="button" role="switch" aria-checked="false" aria-label="Banditura giocatori a turni" onclick="toggleNominationMode()">Attiva banditura a turni</button>
                        </div>
                        <span id="nomination-control-badge" class="mg-legacy-state">DISATTIVA</span>
                        <div id="nomination-control-status" class="mg-status-text nomination-control-status">Modalità disattivata</div>

                        <div class="mg-nomination-details">
                            <label class="mg-inline-setting nomination-auto-bid-one-option">
                                <span class="nomination-auto-bid-one-copy"><b>Offerta 1 banditore</b><small>Il giocatore bandito parte da 1 credito assegnato alla squadra che ha bandito.</small></span>
                                <span class="mg-switch-label">
                                    <input id="nomination-auto-bid-one" type="checkbox" onchange="setNominationAutoBidOne(this.checked)">
                                    <span class="mg-switch-ui" aria-hidden="true"></span>
                                </span>
                            </label>
                            <div class="nomination-turn-nav mg-two-actions">
                                <button class="btn btn-secondary" type="button" onclick="moveNominationTurn(-1)">← Turno precedente</button>
                                <button class="btn btn-secondary" type="button" onclick="moveNominationTurn(1)">Turno successivo →</button>
                            </div>
                            <div class="nomination-order-box">
                                <div class="nomination-order-head">
                                    <div><b>Ordine al tavolo</b><small>Disponi le squadre nell'ordine di banditura.</small></div>
                                    <button class="btn btn-secondary" type="button" onclick="resetNominationOrder()">Ripristina</button>
                                </div>
                                <div id="nomination-order-list" class="nomination-order-list"></div>
                            </div>
                            <div class="mg-card-actions nomination-control-actions">
                                <button class="btn btn-secondary" type="button" onclick="recalculateNominationTurn()">Ricalcola turno</button>
                            </div>
                        </div>
                    </article>
                </div>
            </section>

            <section class="mg-section mg-section-participants" aria-labelledby="mg-participants-title">
                <div class="mg-section-head">
                    <div><span class="mg-kicker">PARTECIPANTI E DATI</span><h2 id="mg-participants-title">Squadre e rose</h2></div>
                    <p>Stato collegamenti, partecipanti e storico acquisti.</p>
                </div>
                <div class="mg-grid-2">
                    <article class="mg-card online-players-card">
                        <div class="mg-card-head"><div><h3>Giocatori online</h3><p>Presenza corrente nella stanza.</p></div><span id="online-player-count" class="mg-count">0 online</span></div>
                        <div id="online-player-list" class="online-player-list"><div class="online-empty">Nessun giocatore online</div></div>
                    </article>

                    <article class="mg-card auctioneer-player-control-card mg-setting-card">
                        <div class="mg-setting-head">
                            <div><h3>Banditore giocatore</h3><p>Il banditore partecipa usando una delle squadre libere.</p></div>
                            <button id="auctioneer-player-toggle-btn" class="mg-switch" type="button" role="switch" aria-checked="false" aria-label="Banditore giocatore" onclick="toggleAuctioneerPlayerMode()">Attiva banditore giocatore</button>
                        </div>
                        <span id="auctioneer-player-badge" class="mg-legacy-state">DISATTIVO</span>
                        <label class="mg-field"><span class="field-label">Squadra del banditore</span><select id="auctioneer-player-team-select" class="minimal-input" onchange="changeAuctioneerPlayerTeam()"></select></label>
                        <div id="auctioneer-player-status" class="mg-status-text auctioneer-player-status">Modalità disattivata.</div>
                    </article>

                    <article class="mg-card teams-card mg-span-2">
                        <div class="mg-card-head"><div><h3>Squadre</h3><p>Crediti, slot, PIN e assegnazioni manuali.</p></div><span id="control-team-count" class="mg-count"></span></div>
                        <div class="team-create-row mg-create-team">
                            <input id="control-new-team-name" class="minimal-input" type="text" maxlength="40" placeholder="Nome nuova squadra" autocomplete="off" onkeydown="if(event.key==='Enter')createTeamControl()">
                            <button class="btn btn-green" type="button" onclick="createTeamControl()">+ Aggiungi squadra</button>
                        </div>
                        <div class="control-table-wrap"><table class="control-table teams-control-table">
                            <thead><tr id="control-teams-head-row"><th>Squadra</th><th>Crediti</th><th>P</th><th>D</th><th>C</th><th>A</th><th>Tot.</th><th>PIN</th><th>Azioni</th></tr></thead>
                            <tbody id="control-teams-body"></tbody>
                        </table></div>
                    </article>

                    <article class="mg-card purchases-card mg-span-2">
                        <div class="mg-card-head purchases-collapsible-head">
                            <button type="button" class="collapsed-toggle purchases-toggle" id="control-purchases-toggle" onclick="toggleControlPurchases()"><span>Acquisti / Rose · <span id="control-purchase-count">0 acquisti</span></span><span class="chev">⌄</span></button>
                            <button type="button" class="btn btn-danger" onclick="restoreAllAuctionHistory('gestione')">Annulla / ripristina tutto</button>
                        </div>
                        <div id="control-purchases-content" class="control-purchases-content collapsed">
                            <div class="control-purchases-search-row"><div id="list-filters-purchases" class="unified-list-filters"></div>
                                <input id="control-purchases-search" class="minimal-input" type="search" placeholder="Cerca giocatore o squadra..." autocomplete="off" oninput="controlPurchasesSearch=this.value;renderControlPurchases()">
                            </div>
                            <div class="control-table-wrap"><table class="control-table purchases-control-table">
                                <thead><tr><th>Giocatore</th><th>R</th><th>Squadra</th><th>Prezzo</th><th>Azioni</th></tr></thead>
                                <tbody id="control-purchases-body"></tbody>
                            </table></div>
                        </div>
                    </article>
                </div>
            </section>
        </main>

        <div id="audio-mixer-modal" class="audio-mixer-overlay" onclick="if(event.target===this)closeAudioMixer()">
            <div class="control-card audio-mixer-card">
                <div class="control-title audio-modal-head">
                    <div><h3 style="margin:0;">🔊 Audio asta</h3><div class="audio-mixer-subtitle">Bilancia effetti e voce delle offerte</div></div>
                    <div class="audio-modal-actions"><label class="voice-switch"><input id="voice-bids-enabled" type="checkbox" onchange="saveAudioSettings()"><span>Voce offerte</span></label><button class="audio-close-btn" type="button" onclick="closeAudioMixer()">×</button></div>
                </div>
                <div class="audio-mixer-grid">
                    <div class="audio-channel"><div class="audio-channel-head"><b>Preparazione</b><button onclick="testAuctionAudio('audio-prep')" type="button">▶</button></div><input id="vol-audio-prep" type="range" min="0" max="100" oninput="updateAudioLabel(this);saveAudioSettings()"><span class="audio-percent">70%</span></div>
                    <div class="audio-channel"><div class="audio-channel-head"><b>Fischio inizio</b><button onclick="testAuctionAudio('audio-start')" type="button">▶</button></div><input id="vol-audio-start" type="range" min="0" max="100" oninput="updateAudioLabel(this);saveAudioSettings()"><span class="audio-percent">100%</span></div>
                    <div class="audio-channel"><div class="audio-channel-head"><b>Rilancio</b><button onclick="testAuctionAudio('audio-buzz')" type="button">▶</button></div><input id="vol-audio-buzz" type="range" min="0" max="100" oninput="updateAudioLabel(this);saveAudioSettings()"><span class="audio-percent">20%</span></div>
                    <div class="audio-channel"><div class="audio-channel-head"><b>Fine asta</b><button onclick="testAuctionAudio('audio-end')" type="button">▶</button></div><input id="vol-audio-end" type="range" min="0" max="100" oninput="updateAudioLabel(this);saveAudioSettings()"><span class="audio-percent">80%</span></div>
                    <div class="audio-channel voice-channel"><div class="audio-channel-head"><b>Volume voce</b><button onclick="testBidVoice()" type="button">▶</button></div><input id="vol-bid-voice" type="range" min="0" max="100" oninput="updateAudioLabel(this);saveAudioSettings()"><span class="audio-percent">100%</span></div>
                    <div class="audio-channel voice-channel"><div class="audio-channel-head"><b>Velocità voce</b><button onclick="testBidVoice()" type="button">▶</button></div><input id="rate-bid-voice" type="range" min="80" max="140" step="5" oninput="updateAudioLabel(this,true);saveAudioSettings()"><span class="audio-percent">1.40×</span></div>
                    <div class="audio-channel final3-channel"><div class="audio-channel-head"><b>Ultimi 3 sec. asta</b><button onclick="testFinalCountdownAudio()" type="button">▶</button></div><select id="auction-final3-mode" class="audio-mode-select" onchange="saveAudioSettings()"><option value="beep">Suono 3-2-1</option><option value="voice">Voce “3, 2, 1”</option><option value="off">Nessun suono</option></select><small class="audio-mode-note">Solo durante l’asta attiva, non nella preparazione.</small></div>
                </div>
                <div class="audio-routing-section"><div class="audio-routing-head"><div><b>Distribuzione audio</b><div class="audio-routing-subtitle">Modalità <strong>IN PRESENZA</strong> · predefinita. Audio solo sul banditore, giocatori silenziosi.</div></div><button class="btn btn-secondary btn-small" type="button" onclick="unmuteAllAudioTargets()">Audio a tutti</button></div><div class="audio-routing-help">Spunta <b>LEVA AUDIO</b> sui dispositivi che non devono riprodurre effetti e voce delle offerte.</div><div id="audio-routing-targets" class="audio-routing-targets"></div><div id="audio-routing-status" class="audio-routing-status"></div></div>
            </div>
        </div>
    </div>
</div>'''

start = index.index('<div id="screen-room-control"')
end = index.index('    <div id="csv-roster-import-overlay"', start)
index = index[:start] + screen + '\n\n' + index[end:]

# Remove previous management overlay stylesheet and add the single canonical management stylesheet.
index = re.sub(r'\s*<link rel="stylesheet" href="\./styles/management-system\.css\?[^\"]+">', '', index)
ui_link = re.search(r'<link rel="stylesheet" href="\./styles/ui\.css\?[^\"]+">', index)
if not ui_link:
    raise SystemExit('ui.css link not found')
index = index[:ui_link.end()] + '\n    <link rel="stylesheet" href="./styles/management.css?dev=096-mgmt02">' + index[ui_link.end():]

# Version/cache markers for application UI change.
index = index.replace('LIVEASTA DEV · v0.95 MGMT-01', 'LIVEASTA DEV · v0.96 MGMT-02')
index = index.replace('AMBIENTE DEV · v0.95 MGMT-01', 'AMBIENTE DEV · v0.96 MGMT-02')
index = re.sub(r'(?<![\w.])v0\.95(?![\w.])', 'v0.96', index)
index = index.replace('ui.css?dev=094-clean40a', 'ui.css?dev=096-mgmt02')
index = index.replace('management.js?dev=095-mgmt01', 'management.js?dev=096-mgmt02')
index = index.replace('management.js?dev=094-clean40a', 'management.js?dev=096-mgmt02')
index_path.write_text(index, encoding='utf-8')

# Remove the old isolated management-design block from ui.css. It is replaced by management.css.
ui = ui_path.read_text(encoding='utf-8')
marker = '/* === liveasta-global-coherence-=== */'
if ui.startswith('/* === management-design-=== */') and marker in ui:
    ui = ui[ui.index(marker):]
ui_path.write_text(ui, encoding='utf-8')

management_css = r'''/* LIVEASTA DEV — canonical Gestione UI · v0.96 MGMT-02
   This file owns only #screen-room-control. Auction/business logic stays in app.js. */

#screen-room-control{
  --mg-bg:var(--theme-bg,var(--bg-main,#0d1117));
  --mg-card:var(--theme-card,var(--bg-card,#171e28));
  --mg-panel:var(--theme-panel,var(--bg-hover,#202938));
  --mg-input:var(--theme-input,var(--bg-input,#111821));
  --mg-hover:var(--theme-hover,var(--bg-hover,#202938));
  --mg-border:var(--theme-border,var(--border-color,#334155));
  --mg-text:var(--theme-text,var(--text-main,#f8fafc));
  --mg-muted:var(--theme-muted,var(--text-muted,#b8c2cf));
  --mg-soft:var(--theme-soft,var(--mg-muted));
  --mg-primary:var(--theme-primary,var(--accent-blue,#3ddc97));
  --mg-primary-hover:var(--theme-primary-hover,var(--accent-blue-hover,#25c982));
  --mg-primary-ink:var(--theme-bg-deep,#0d1117);
  --mg-danger:var(--theme-danger,var(--accent-red,#ff5d73));
  width:100%; height:100dvh; padding:0; overflow-x:hidden; overflow-y:auto;
  justify-content:flex-start; align-items:stretch; text-align:left;
  background:var(--mg-bg); color:var(--mg-text); scrollbar-gutter:stable;
}
#screen-room-control *{box-sizing:border-box;}
#screen-room-control .mg-page{width:100%; min-height:100%;}
#screen-room-control .mg-header{position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; gap:18px; padding:14px max(18px,calc((100vw - 1240px)/2)); background:color-mix(in srgb,var(--mg-card) 94%,transparent); border-bottom:1px solid var(--mg-border); backdrop-filter:blur(14px);}
#screen-room-control .mg-header-main{display:flex; align-items:center; gap:12px; min-width:0;}
#screen-room-control .mg-heading{display:flex; align-items:center; gap:12px; min-width:0;}
#screen-room-control .mg-heading h1{margin:0; font-size:20px; line-height:1.15; letter-spacing:0; text-transform:none; color:var(--mg-text); white-space:nowrap;}
#screen-room-control .mg-room-pill{margin:0; min-height:34px; padding:7px 11px; border:1px solid var(--mg-border); border-radius:999px; background:var(--mg-panel); color:var(--mg-muted); font-size:11px; letter-spacing:.08em; white-space:nowrap;}
#screen-room-control .mg-room-pill b{color:var(--mg-primary);}
#screen-room-control .mg-header-actions{display:grid; grid-template-columns:repeat(4,max-content); gap:8px;}
#screen-room-control .mg-content{width:min(1240px,100%); margin:0 auto; padding:22px 18px 44px; display:flex; flex-direction:column; gap:30px;}
#screen-room-control .mg-section{display:flex; flex-direction:column; gap:12px;}
#screen-room-control .mg-section-head{display:flex; align-items:end; justify-content:space-between; gap:20px; padding:0 2px;}
#screen-room-control .mg-section-head>div{min-width:0;}
#screen-room-control .mg-kicker{display:block; margin-bottom:3px; color:var(--mg-primary); font-size:11px; font-weight:900; letter-spacing:.12em;}
#screen-room-control .mg-section-head h2{margin:0; font-size:20px; line-height:1.2; letter-spacing:0; text-transform:none; color:var(--mg-text);}
#screen-room-control .mg-section-head p{margin:0; max-width:440px; color:var(--mg-muted); font-size:13px; line-height:1.45; text-align:right;}
#screen-room-control .mg-grid-2{display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; align-items:start;}
#screen-room-control .mg-span-2{grid-column:1/-1;}

#screen-room-control .mg-card{min-width:0; padding:16px; background:var(--mg-card); border:1px solid var(--mg-border); border-radius:14px; box-shadow:none;}
#screen-room-control .mg-card-head,#screen-room-control .mg-setting-head,#screen-room-control .mg-subcard-head{display:flex; align-items:flex-start; justify-content:space-between; gap:14px;}
#screen-room-control :is(.mg-card-head,.mg-setting-head,.mg-subcard-head) h3{margin:0; color:var(--mg-text); font-size:16px; line-height:1.3; letter-spacing:0; text-transform:none;}
#screen-room-control :is(.mg-card-head,.mg-setting-head) p{margin:4px 0 0; color:var(--mg-muted); font-size:12px; line-height:1.45;}
#screen-room-control .mg-setting-head>div,#screen-room-control .mg-card-head>div{min-width:0; flex:1 1 auto;}
#screen-room-control .mg-status-text{margin-top:10px; color:var(--mg-muted); font-size:12px; line-height:1.45;}
#screen-room-control .mg-legacy-state{display:none!important;}
#screen-room-control .mg-count{flex:none; color:var(--mg-primary); font-weight:900; font-size:14px; white-space:nowrap;}
#screen-room-control .mg-card-actions{display:flex; justify-content:flex-end; gap:8px; margin-top:14px;}

#screen-room-control .mg-room-layout{display:grid; grid-template-columns:1fr 1.35fr; gap:12px;}
#screen-room-control .mg-subcard{min-width:0; padding:14px; background:var(--mg-input); border:1px solid var(--mg-border); border-radius:11px;}
#screen-room-control .mg-roster-rules{grid-column:1/-1;}
#screen-room-control .mg-fields{display:grid; gap:10px; margin-top:12px;}
#screen-room-control .mg-fields-2{grid-template-columns:repeat(2,minmax(0,1fr));}
#screen-room-control .mg-fields-timers{grid-template-columns:repeat(3,minmax(0,1fr));}
#screen-room-control .mg-role-limits{grid-template-columns:repeat(4,minmax(0,1fr));}
#screen-room-control .field-label{display:block; min-height:0; margin:0 0 5px; color:var(--mg-muted); font-size:12px; font-weight:600; line-height:1.25; text-transform:none; letter-spacing:0;}
#screen-room-control :is(input:not([type=checkbox]):not([type=range]),select,textarea,.minimal-input){width:100%; min-width:0; height:40px; min-height:40px; margin:0; padding:8px 10px; border:1px solid var(--mg-border); border-radius:9px; outline:none; background:var(--mg-card); color:var(--mg-text); font:600 14px/1.2 Inter,system-ui,sans-serif; text-align:left; box-shadow:none;}
#screen-room-control :is(input,select,textarea):focus{border-color:var(--mg-primary); box-shadow:0 0 0 2px color-mix(in srgb,var(--mg-primary) 22%,transparent);}
#screen-room-control .room-system-badge{display:inline-flex; align-items:center; justify-content:center; min-height:30px; padding:5px 10px; border:1px solid var(--mg-border); border-radius:999px; background:var(--mg-card); color:var(--mg-text); font-size:11px; font-weight:900;}
#screen-room-control .mantra-rule-summary{display:flex; flex-direction:column; gap:4px; margin-top:12px; color:var(--mg-muted); font-size:12px;}
#screen-room-control .mantra-rule-summary b{color:var(--mg-text);}
#screen-room-control .mantra-fixed-rule{height:40px; display:flex; align-items:center; padding:0 10px; border:1px solid var(--mg-border); border-radius:9px; color:var(--mg-muted); background:var(--mg-card); font-size:13px;}

#screen-room-control .btn{min-height:38px; width:auto; margin:0; padding:8px 12px; border:1px solid var(--mg-border); border-radius:9px; background:var(--mg-hover); color:var(--mg-text); font:800 13px/1.2 Inter,system-ui,sans-serif; letter-spacing:0; text-transform:none; box-shadow:none; cursor:pointer; transition:transform .08s ease,background .14s ease,border-color .14s ease,opacity .14s ease;}
#screen-room-control .btn:hover:not(:disabled){background:color-mix(in srgb,var(--mg-primary) 9%,var(--mg-hover)); border-color:color-mix(in srgb,var(--mg-primary) 45%,var(--mg-border));}
#screen-room-control .btn:active:not(:disabled){transform:translateY(1px) scale(.985);}
#screen-room-control .btn-green{background:var(--mg-primary); color:var(--mg-primary-ink); border-color:var(--mg-primary);}
#screen-room-control .btn-green:hover:not(:disabled){background:var(--mg-primary-hover); border-color:var(--mg-primary-hover);}
#screen-room-control .btn-secondary{background:var(--mg-hover); color:var(--mg-text); border-color:var(--mg-border);}
#screen-room-control .btn-danger{background:color-mix(in srgb,var(--mg-danger) 11%,var(--mg-card)); color:var(--mg-danger); border-color:color-mix(in srgb,var(--mg-danger) 42%,var(--mg-border));}
#screen-room-control .btn:disabled{opacity:.55; cursor:not-allowed; transform:none;}
#screen-room-control .mg-back{flex:none;}

#screen-room-control .mg-switch{position:relative; flex:0 0 52px; width:52px; min-width:52px; height:30px; min-height:30px; padding:0; margin:0; border:1px solid var(--mg-border); border-radius:999px; background:color-mix(in srgb,var(--mg-muted) 30%,var(--mg-hover)); color:transparent; font-size:0; overflow:hidden; box-shadow:none; cursor:pointer; transition:background .16s ease,border-color .16s ease,transform .08s ease;}
#screen-room-control .mg-switch::after{content:''; position:absolute; top:3px; left:3px; width:22px; height:22px; border-radius:50%; background:var(--mg-card); box-shadow:0 1px 3px rgba(0,0,0,.25); transition:transform .16s ease,background .16s ease;}
#screen-room-control .mg-switch[aria-checked="true"]{background:var(--mg-primary); border-color:var(--mg-primary);}
#screen-room-control .mg-switch[aria-checked="true"]::after{transform:translateX(22px); background:var(--mg-primary-ink);}
#screen-room-control .mg-switch:active{transform:scale(.96);}
#screen-room-control .mg-switch-label{position:relative; flex:0 0 52px; width:52px; height:30px; display:inline-block; cursor:pointer;}
#screen-room-control .mg-switch-label>input{position:absolute; opacity:0; pointer-events:none; width:1px; height:1px;}
#screen-room-control .mg-switch-ui{position:absolute; inset:0; border:1px solid var(--mg-border); border-radius:999px; background:color-mix(in srgb,var(--mg-muted) 30%,var(--mg-hover)); transition:background .16s ease,border-color .16s ease,transform .08s ease;}
#screen-room-control .mg-switch-ui::after{content:''; position:absolute; top:3px; left:3px; width:22px; height:22px; border-radius:50%; background:var(--mg-card); box-shadow:0 1px 3px rgba(0,0,0,.25); transition:transform .16s ease,background .16s ease;}
#screen-room-control .mg-switch-label>input:checked + .mg-switch-ui{background:var(--mg-primary); border-color:var(--mg-primary);}
#screen-room-control .mg-switch-label>input:checked + .mg-switch-ui::after{transform:translateX(22px); background:var(--mg-primary-ink);}
#screen-room-control .mg-switch-label:active .mg-switch-ui{transform:scale(.96);}
#screen-room-control .sr-only{position:absolute!important; width:1px!important; height:1px!important; padding:0!important; margin:-1px!important; overflow:hidden!important; clip:rect(0,0,0,0)!important; white-space:nowrap!important; border:0!important;}

#screen-room-control .mg-role-choice{display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-top:12px;}
#screen-room-control .mg-role-chip{position:relative; min-height:42px; display:flex; align-items:center; justify-content:center; border:1px solid var(--mg-border); border-radius:9px; background:var(--mg-input); cursor:pointer; transition:transform .08s ease,border-color .14s ease,background .14s ease;}
#screen-room-control .mg-role-chip input{position:absolute; opacity:0; pointer-events:none;}
#screen-room-control .mg-role-chip span{font-weight:900; font-size:15px;}
#screen-room-control .mg-role-chip.role-P span{color:#eab308;} #screen-room-control .mg-role-chip.role-D span{color:#22c55e;} #screen-room-control .mg-role-chip.role-C span{color:#3b82f6;} #screen-room-control .mg-role-chip.role-A span{color:#ef4444;}
#screen-room-control .mg-role-chip:has(input:checked){border-color:currentColor; background:color-mix(in srgb,currentColor 10%,var(--mg-input)); box-shadow:inset 0 0 0 1px currentColor;}
#screen-room-control .mg-role-chip.role-P{color:#eab308;} #screen-room-control .mg-role-chip.role-D{color:#22c55e;} #screen-room-control .mg-role-chip.role-C{color:#3b82f6;} #screen-room-control .mg-role-chip.role-A{color:#ef4444;}
#screen-room-control .mg-role-chip:active{transform:scale(.98);}

#screen-room-control .mg-inline-setting{display:flex; align-items:center; justify-content:space-between; gap:16px; margin-top:12px; padding:12px; border:1px solid var(--mg-border); border-radius:10px; background:var(--mg-input);}
#screen-room-control .nomination-auto-bid-one-copy{min-width:0; display:flex; flex-direction:column; gap:3px;}
#screen-room-control .nomination-auto-bid-one-copy b{color:var(--mg-text); font-size:13px;}
#screen-room-control .nomination-auto-bid-one-copy small{color:var(--mg-muted); font-size:11px; line-height:1.35;}
#screen-room-control .mg-nomination-details{margin-top:12px;}
#screen-room-control .nomination-control-card:has(#nomination-toggle-btn[aria-checked="false"]) .mg-nomination-details{display:none;}
#screen-room-control .mg-two-actions{display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px;}
#screen-room-control .mg-two-actions .btn{width:100%;}
#screen-room-control .nomination-order-box{margin-top:10px; padding:12px; border:1px solid var(--mg-border); border-radius:10px; background:var(--mg-input);}
#screen-room-control .nomination-order-head{display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px;}
#screen-room-control .nomination-order-head>div{display:flex; flex-direction:column; gap:2px; min-width:0;}
#screen-room-control .nomination-order-head b{font-size:13px; color:var(--mg-text);}
#screen-room-control .nomination-order-head small{font-size:11px; color:var(--mg-muted);}
#screen-room-control .nomination-order-list{display:flex; flex-direction:column; gap:6px;}
#screen-room-control .nomination-order-row{min-height:42px; display:grid; grid-template-columns:34px minmax(0,1fr) 38px 38px; gap:7px; align-items:center; padding:6px 7px; border:1px solid var(--mg-border); border-radius:9px; background:var(--mg-card); color:var(--mg-text);}
#screen-room-control .nomination-order-row.current{border-color:var(--mg-primary); background:color-mix(in srgb,var(--mg-primary) 8%,var(--mg-card));}
#screen-room-control .nomination-order-pos{display:grid; place-items:center; width:30px; height:30px; border-radius:50%; background:var(--mg-hover); font-size:12px; font-weight:900;}
#screen-room-control .nomination-order-name{min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; font-weight:800;}
#screen-room-control .nomination-order-move{width:36px; height:34px; min-height:34px; padding:0; border:1px solid var(--mg-border); border-radius:8px; background:var(--mg-hover); color:var(--mg-text); font-size:16px;}

#screen-room-control .online-player-list{display:flex; flex-wrap:wrap; gap:7px; margin-top:12px; min-height:30px;}
#screen-room-control .online-player-chip,#screen-room-control .online-team-pill{display:inline-flex; align-items:center; gap:7px; min-height:30px; padding:5px 9px; border:1px solid var(--mg-border); border-radius:999px; background:var(--mg-input); color:var(--mg-text); font-size:12px; font-weight:800;}
#screen-room-control .online-empty{color:var(--mg-muted); font-size:12px;}
#screen-room-control .mg-field{display:block; margin-top:12px;}

#screen-room-control .mg-create-team{display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; margin:12px 0;}
#screen-room-control .control-table-wrap{width:100%; overflow-x:auto; border:1px solid var(--mg-border); border-radius:10px; background:var(--mg-input);}
#screen-room-control .control-table{width:100%; border-collapse:collapse; table-layout:auto; font-size:12px;}
#screen-room-control .control-table th{padding:9px 8px; background:var(--mg-panel); color:var(--mg-muted); border-bottom:1px solid var(--mg-border); font-size:10px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; white-space:nowrap;}
#screen-room-control .control-table td{padding:8px; border-bottom:1px solid var(--mg-border); color:var(--mg-text); vertical-align:middle; white-space:nowrap;}
#screen-room-control .control-table tbody tr:last-child td{border-bottom:0;}
#screen-room-control .teams-control-table input{height:36px; min-height:36px; padding:6px 8px; font-size:13px;}
#screen-room-control .control-teams-actions{display:flex; gap:6px; justify-content:flex-end;}
#screen-room-control .control-teams-actions .btn{min-height:34px; padding:6px 8px; font-size:11px;}
#screen-room-control .team-pin-status,#screen-room-control [data-label="PIN"]{font-size:11px;}

#screen-room-control .purchases-collapsible-head{align-items:center;}
#screen-room-control .purchases-toggle{flex:1 1 auto; display:flex; justify-content:space-between; align-items:center; min-height:40px; text-align:left;}
#screen-room-control .purchases-collapsible-head>.btn-danger{flex:none;}
#screen-room-control .control-purchases-content{margin-top:12px;}
#screen-room-control .control-purchases-content.collapsed{display:none;}
#screen-room-control .control-purchases-search-row{display:flex; flex-direction:column; gap:8px; margin-bottom:10px;}
#screen-room-control #control-purchases-search{height:38px; min-height:38px;}
#screen-room-control .purchases-card .control-table-wrap{overflow:visible; max-height:none;}

#screen-room-control .audio-mixer-overlay{z-index:100;}
#screen-room-control .audio-mixer-card{background:var(--mg-card); color:var(--mg-text); border-color:var(--mg-border);}

@media(max-width:760px){
  #screen-room-control{scrollbar-gutter:auto;}
  #screen-room-control .mg-header{position:static; flex-direction:column; align-items:stretch; gap:10px; padding:12px;}
  #screen-room-control .mg-header-main{align-items:flex-start;}
  #screen-room-control .mg-heading{flex:1 1 auto; flex-direction:column; align-items:flex-start; gap:5px;}
  #screen-room-control .mg-heading h1{font-size:19px;}
  #screen-room-control .mg-room-pill{min-height:26px; padding:4px 8px; font-size:10px;}
  #screen-room-control .mg-back{min-width:68px;}
  #screen-room-control .mg-header-actions{grid-template-columns:repeat(4,minmax(0,1fr));}
  #screen-room-control .mg-header-actions .btn{width:100%; padding:8px 5px; font-size:11px;}
  #screen-room-control .mg-content{padding:18px 12px 36px; gap:26px;}
  #screen-room-control .mg-section-head{align-items:flex-start; flex-direction:column; gap:4px;}
  #screen-room-control .mg-section-head p{text-align:left; font-size:12px;}
  #screen-room-control .mg-section-head h2{font-size:18px;}
  #screen-room-control .mg-grid-2{grid-template-columns:1fr;}
  #screen-room-control .mg-span-2{grid-column:auto;}
  #screen-room-control .mg-card{padding:14px; border-radius:12px;}
  #screen-room-control .mg-room-layout{grid-template-columns:1fr;}
  #screen-room-control .mg-roster-rules{grid-column:auto;}
  #screen-room-control .mg-fields-timers{grid-template-columns:repeat(2,minmax(0,1fr));}
  #screen-room-control .mg-fields-timers>label:last-child:nth-child(odd){grid-column:1/-1;}
  #screen-room-control .mg-role-limits{grid-template-columns:repeat(2,minmax(0,1fr));}
  #screen-room-control .mg-fields-2{grid-template-columns:1fr;}
  #screen-room-control :is(input:not([type=checkbox]):not([type=range]),select,textarea,.minimal-input){font-size:16px;}
  #screen-room-control .mg-setting-head p,#screen-room-control .mg-card-head p{font-size:12px;}
  #screen-room-control .mg-status-text{font-size:11px;}
  #screen-room-control .mg-card-actions .btn{width:100%;}
  #screen-room-control .mg-create-team{grid-template-columns:1fr;}
  #screen-room-control .mg-create-team .btn{width:100%;}
  #screen-room-control .nomination-order-row{grid-template-columns:32px minmax(0,1fr) 36px 36px;}
  #screen-room-control .nomination-order-name{font-size:12px;}

  #screen-room-control .teams-card .control-table-wrap{overflow:visible; border:0; background:transparent;}
  #screen-room-control .teams-control-table{display:block; width:100%;}
  #screen-room-control .teams-control-table thead{display:none;}
  #screen-room-control .teams-control-table tbody{display:flex; flex-direction:column; gap:8px;}
  #screen-room-control .teams-control-table tbody tr{display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; padding:10px; border:1px solid var(--mg-border); border-radius:10px; background:var(--mg-input);}
  #screen-room-control .teams-control-table tbody td{display:flex; flex-direction:column; justify-content:flex-start; gap:3px; min-width:0; padding:0; border:0; white-space:normal; font-size:13px;}
  #screen-room-control .teams-control-table tbody td::before{content:attr(data-label); color:var(--mg-muted); font-size:10px; font-weight:700; line-height:1.1;}
  #screen-room-control .teams-control-table tbody td:nth-child(1){grid-column:span 3;}
  #screen-room-control .teams-control-table tbody td:nth-child(2){grid-column:span 1;}
  #screen-room-control .teams-control-table tbody td:nth-child(8){grid-column:span 4;}
  #screen-room-control .teams-control-table tbody td:nth-child(9){grid-column:1/-1;}
  #screen-room-control .teams-control-table tbody td:nth-child(9)::before{display:none;}
  #screen-room-control .control-teams-actions{display:grid; grid-template-columns:1.5fr 1fr 1fr; gap:6px;}
  #screen-room-control .control-teams-actions .btn{width:100%; min-width:0; min-height:36px; white-space:normal;}
  #screen-room-control .teams-control-table input{height:38px; min-height:38px;}

  #screen-room-control .purchases-card .control-table-wrap{border:0; background:transparent;}
  #screen-room-control .purchases-control-table{display:block; width:100%;}
  #screen-room-control .purchases-control-table thead{display:none;}
  #screen-room-control .purchases-control-table tbody{display:flex; flex-direction:column; gap:6px;}
  #screen-room-control .purchases-control-table tbody tr{display:grid; grid-template-columns:minmax(0,1.5fr) 34px minmax(0,1fr) 38px auto; gap:6px; align-items:center; padding:8px; border:1px solid var(--mg-border); border-radius:9px; background:var(--mg-input);}
  #screen-room-control .purchases-control-table tbody td{min-width:0; padding:0; border:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px;}
  #screen-room-control .purchases-control-table tbody td:last-child{overflow:visible;}
  #screen-room-control .purchases-control-table .btn{min-height:34px; padding:6px 8px; font-size:10px;}
  #screen-room-control .purchases-collapsible-head{display:grid; grid-template-columns:1fr; gap:8px;}
  #screen-room-control .purchases-collapsible-head>.btn-danger{width:100%;}
}

@media(max-width:430px){
  #screen-room-control .mg-header-actions{grid-template-columns:repeat(2,minmax(0,1fr));}
  #screen-room-control .mg-role-choice{gap:6px;}
  #screen-room-control .mg-inline-setting{padding:10px;}
  #screen-room-control .control-teams-actions{grid-template-columns:1fr 1fr;}
  #screen-room-control .control-teams-actions .manual-assign-btn{grid-column:1/-1;}
  #screen-room-control .purchases-control-table tbody tr{grid-template-columns:minmax(0,1.35fr) 32px minmax(0,.9fr) 34px auto;}
}

@media(prefers-reduced-motion:reduce){
  #screen-room-control *{transition:none!important;}
}
'''
mg_path.write_text(management_css, encoding='utf-8')
if mg_old_path.exists():
    mg_old_path.unlink()

management_js = r'''/* LIVEASTA DEV — Gestione compatibility cleanup only. UI structure is owned by index.html + management.css. */
(function(){
  'use strict';
  function cleanupOldManagement(){
    const root=document.getElementById('screen-room-control');
    if(!root)return;
    root.classList.remove('v092-mobile-management','mg-system');
    root.querySelectorAll('.v087-collapsed,.v090-collapsed').forEach(el=>el.classList.remove('v087-collapsed','v090-collapsed'));
    root.querySelectorAll('.v087-collapse-btn,.v091-collapse-btn,.v092-collapse-btn,.mg-section-label').forEach(el=>el.remove());
    root.querySelectorAll('[data-v087-collapsible]').forEach(el=>el.removeAttribute('data-v087-collapsible'));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cleanupOldManagement,{once:true});
  else cleanupOldManagement();
})();
'''
management_js_path.write_text(management_js, encoding='utf-8')

# Hard validation: required runtime IDs exist exactly once.
required_ids = [
'control-room-pill','control-room-name','control-room-password','control-room-timer','control-bid-cooldown','control-room-prep','control-sealed-timer','control-sealed-reveal-timer','control-game-mode-badge','control-classic-limits','control-limit-P','control-limit-D','control-limit-C','control-limit-A','control-mantra-rules','control-mantra-max-roster','self-raise-enabled','self-raise-toggle','self-raise-control-badge','self-raise-control-status','ready-toggle-btn','ready-control-badge','ready-control-status','auto-random-enabled','auto-random-role-P','auto-random-role-D','auto-random-role-C','auto-random-role-A','auto-random-status','nomination-toggle-btn','nomination-control-badge','nomination-control-status','nomination-auto-bid-one','nomination-order-list','auctioneer-player-toggle-btn','auctioneer-player-badge','auctioneer-player-team-select','auctioneer-player-status','online-player-count','online-player-list','control-team-count','control-new-team-name','control-teams-head-row','control-teams-body','control-purchases-toggle','control-purchase-count','control-purchases-content','list-filters-purchases','control-purchases-search','control-purchases-body','audio-mixer-modal','voice-bids-enabled','vol-audio-prep','vol-audio-start','vol-audio-buzz','vol-audio-end','vol-bid-voice','rate-bid-voice','auction-final3-mode','audio-routing-targets','audio-routing-status']
for id_ in required_ids:
    count = index.count(f'id="{id_}"')
    if count != 1:
        raise SystemExit(f'ID validation failed: {id_} count={count}')
if 'management-system.css' in index:
    raise SystemExit('old management-system.css link still present')
if 'mg-section-label' in index:
    raise SystemExit('runtime-injected section label leaked into markup')
print('management rebuild applied and validated')
