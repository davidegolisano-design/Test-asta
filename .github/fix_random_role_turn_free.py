from pathlib import Path
import re

# Random automatico: Classic P/D/C/A exact roles, Mantra five families, ALL global.
p=Path('scripts/mantra-auction.js')
s=p.read_text()
old="""    autoRandomCandidates=function(){
        const allMode=autoRandomRoles.has('ALL');
        if(allMode){
            return getAvailablePlayers().filter(player=>{
                if(isMantraRoom())return groupsForRole(playerRole(player)).some(group=>autoRandomHasBidderForRole(group));
                const role=String(playerRole(player)||'').toUpperCase();
                return autoRandomHasBidderForRole(role);
            });
        }
        const allowed=new Set([...autoRandomRoles].map(r=>String(r).toUpperCase()).filter(r=>activeGroups().includes(r)));
        if(!allowed.size)return [];
        return getAvailablePlayers().filter(player=>groupsForRole(playerRole(player)).some(group=>allowed.has(group)&&autoRandomHasBidderForRole(group)));
    };"""
new="""    autoRandomCandidates=function(){
        const allMode=autoRandomRoles.has('ALL');

        if(!isMantraRoom()){
            const available=getAvailablePlayers();
            if(allMode){
                return available.filter(player=>{
                    const role=String(playerRole(player)||'').toUpperCase();
                    return ['P','D','C','A'].includes(role) && autoRandomHasBidderForRole(role);
                });
            }
            const allowed=new Set([...autoRandomRoles]
                .map(r=>String(r).toUpperCase())
                .filter(r=>['P','D','C','A'].includes(r)));
            if(!allowed.size)return [];
            return available.filter(player=>{
                const role=String(playerRole(player)||'').toUpperCase();
                return allowed.has(role) && autoRandomHasBidderForRole(role);
            });
        }

        if(allMode){
            return getAvailablePlayers().filter(player=>
                groupsForRole(playerRole(player)).some(group=>autoRandomHasBidderForRole(group))
            );
        }
        const allowed=new Set([...autoRandomRoles]
            .map(r=>String(r).toUpperCase())
            .filter(r=>GROUPS.includes(r)));
        if(!allowed.size)return [];
        return getAvailablePlayers().filter(player=>
            groupsForRole(playerRole(player)).some(group=>allowed.has(group)&&autoRandomHasBidderForRole(group))
        );
    };"""
if old not in s:
    raise SystemExit('autoRandomCandidates target not found')
p.write_text(s.replace(old,new,1))

# Turno libero Classic: ALL means unlocked role filters, not a literal role.
p=Path('scripts/list-filters.js')
s=p.read_text()
old="const locked=view==='nomination'&&!isMantraRoom()?String(nominationState.role):'';"
new="const locked=view==='nomination'&&!isMantraRoom()&&String(nominationState.role)!=='ALL'?String(nominationState.role):'';"
if old not in s:
    raise SystemExit('nomination locked target not found')
s=s.replace(old,new,1)
old="const matchesRole=view==='nomination'&&!isMantraRoom()?item.tokens.includes(String(nominationState.role)):item.tokens.some(r=>state.roles.includes(r));"
new="const nominationLocked=view==='nomination'&&!isMantraRoom()&&String(nominationState.role)!=='ALL';\n        const matchesRole=nominationLocked?item.tokens.includes(String(nominationState.role)):item.tokens.some(r=>state.roles.includes(r));"
if old not in s:
    raise SystemExit('nomination matchesRole target not found')
p.write_text(s.replace(old,new,1))

# Cache bust only. Home display stays v1.0.
p=Path('index.html')
s=p.read_text()
s,n1=re.subn(r'list-filters\.js\?v=\d+', 'list-filters.js?v=112', s, count=1)
s,n2=re.subn(r'mantra-auction\.js\?v=\d+', 'mantra-auction.js?v=112', s, count=1)
if n1!=1 or n2!=1:
    raise SystemExit(f'cache refs not found: list={n1}, mantra={n2}')
p.write_text(s)
