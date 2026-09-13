from pathlib import Path
import re


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing target: {label}')
    return text.replace(old, new, 1)

# app.js
p=Path('scripts/app.js')
s=p.read_text()

s=replace_once(
    s,
    """        function autoRandomSelectedRolesFromControl(){
            return ['P','D','C','A'].filter(role=>document.getElementById('auto-random-role-btn-'+role)?.getAttribute('aria-pressed')==='true');
        }""",
    """        function autoRandomSelectedRolesFromControl(){
            // Il Set mantiene l'ordine di attivazione dei pulsanti.
            return [...autoRandomRoles].filter(role=>
                ['P','D','C','A'].includes(role) &&
                document.getElementById('auto-random-role-btn-'+role)?.getAttribute('aria-pressed')==='true'
            );
        }""",
    'selected roles activation order'
)

s=replace_once(
    s,
    """        function autoRandomClassicSequenceOrder(){
            const configured=(typeof ensureNominationRoleOrder==='function')
                ? ensureNominationRoleOrder()
                : ['P','D','C','A'];
            return configured.filter(role=>autoRandomRoles.has(role));
        }""",
    """        function autoRandomClassicSequenceOrder(){
            // La sequenza AUTO RANDOM e' indipendente dalla banditura a turni:
            // coincide esattamente con l'ordine in cui i pulsanti ruolo sono stati attivati.
            return [...autoRandomRoles].filter(role=>['P','D','C','A'].includes(role));
        }""",
    'classic activation sequence'
)

s=replace_once(
    s,
    """            if(checked)autoRandomRoles.add(r); else autoRandomRoles.delete(r);""",
    """            if(checked){
                // Riattivare un ruolo lo sposta in fondo alla sequenza.
                autoRandomRoles.delete(r);
                autoRandomRoles.add(r);
            }else autoRandomRoles.delete(r);""",
    'classic activation move to end'
)

# READY player list: adaptive complete team names.
old="""                return `<div class=\"player-ready-team-row${absent?' absent':''}${done?' ready':''}${nominated?' nominator':''}\">\n                    <div class=\"player-ready-team-copy\">\n                        <strong>${escapeHtml(team.name||'Squadra')}</strong>\n                        ${nominated?'<small>HA BANDITO</small>':''}\n                    </div>"""
new="""                const teamName=String(team.name||'Squadra');
                const chars=[...teamName].length;
                const nameSize=chars>=30?'.52rem':chars>=26?'.56rem':chars>=22?'.60rem':chars>=18?'.66rem':chars>=14?'.72rem':'.80rem';
                return `<div class=\"player-ready-team-row${absent?' absent':''}${done?' ready':''}${nominated?' nominator':''}\">\n                    <div class=\"player-ready-team-copy\">\n                        <strong style=\"--ready-team-name-size:${nameSize}\">${escapeHtml(teamName)}</strong>\n                        ${nominated?'<small>HA BANDITO</small>':''}\n                    </div>"""
s=replace_once(s,old,new,'ready adaptive team name')
p.write_text(s)

# mantra-auction.js: preserve activation order when Mantra buttons are toggled too.
p=Path('scripts/mantra-auction.js')
s=p.read_text()
s=replace_once(
    s,
    """        return activeGroups().filter(role=>document.getElementById('auto-random-role-btn-'+role)?.getAttribute('aria-pressed')==='true');""",
    """        return [...autoRandomRoles].filter(role=>activeGroups().includes(role)&&document.getElementById('auto-random-role-btn-'+role)?.getAttribute('aria-pressed')==='true');""",
    'mantra selected activation order'
)
s=replace_once(
    s,
    """        if(checked)autoRandomRoles.add(r);else autoRandomRoles.delete(r);""",
    """        if(checked){autoRandomRoles.delete(r);autoRandomRoles.add(r);}else autoRandomRoles.delete(r);""",
    'mantra activation move to end'
)
p.write_text(s)

# ui.css: never truncate READY team names; JS chooses compact size, wrapping is fallback.
p=Path('styles/ui.css')
s=p.read_text()
marker='/* v1.0.116 — READY player names always fully visible */'
if marker not in s:
    s += """\n\n/* v1.0.116 — READY player names always fully visible */
#screen-player-buzzer .player-ready-team-copy{
  min-width:0!important;
  overflow:visible!important;
}
#screen-player-buzzer .player-ready-team-copy strong{
  font-size:var(--ready-team-name-size,.80rem)!important;
  white-space:normal!important;
  overflow:visible!important;
  text-overflow:clip!important;
  overflow-wrap:anywhere!important;
  word-break:normal!important;
  line-height:1.04!important;
  max-width:100%!important;
}
"""
p.write_text(s)

# cache bust
p=Path('index.html')
s=p.read_text()
for name,version in [('ui.css','116'),('app.js','116'),('mantra-auction.js','116')]:
    s,n=re.subn(rf'{re.escape(name)}\?v=\d+',f'{name}?v={version}',s,count=1)
    if n!=1: raise SystemExit(f'cache ref not found: {name}')
p.write_text(s)
