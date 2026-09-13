// LIVEASTA Classic / Mantra role domain helpers — CLEAN-24
const MANTRA_ROLE_ORDER=['Por','Dc','B','Dd','Ds','E','M','C','W','T','A','Pc'];

        function roomGameMode(room=currentRoom){
            return String(room?.game_mode||'classic').toLowerCase()==='mantra'?'mantra':'classic';
        }

        function isMantraRoom(room=currentRoom){
            return roomGameMode(room)==='mantra';
        }

        function normalizeMantraRole(value){
            const raw=String(value??'').trim();
            if(!raw)return '';
            const parts=raw
                .replace(/\s+/g,'')
                .split(/[;,/|+-]+/)
                .filter(Boolean)
                .map(x=>{
                    const low=x.toLowerCase();
                    const map={por:'Por',p:'Por',dc:'Dc',b:'B',dd:'Dd',ds:'Ds',e:'E',m:'M',c:'C',w:'W',t:'T',a:'A',pc:'Pc'};
                    return map[low]||x;
                });
            return [...new Set(parts)].join(';');
        }

        function mantraRoleTokens(value){
            return normalizeMantraRole(value).split(';').filter(Boolean);
        }

        function mantraRoleFromPlayer(player){
            if(!player)return '';
            return normalizeMantraRole(
                player.RM ??
                player.Rm ??
                player.rm ??
                player['R M'] ??
                player['Ruolo Mantra'] ??
                player['Ruolo mantra'] ??
                player.RuoloMantra ??
                player.Mantra ??
                ''
            );
        }

        function playerRole(player,room=currentRoom){
            if(!player)return '';
            if(roomGameMode(room)==='mantra'){
                return mantraRoleFromPlayer(player);
            }
            return String(player.R??player.Ruolo??'').trim().toUpperCase();
        }

        function playerIsGoalkeeper(playerOrRole,room=currentRoom){
            const role=typeof playerOrRole==='object'?playerRole(playerOrRole,room):String(playerOrRole||'');
            if(roomGameMode(room)==='mantra')return mantraRoleTokens(role).includes('Por');
            return role.toUpperCase()==='P';
        }

        function mantraRosterMax(room=currentRoom){
            return Math.max(23,Math.min(90,parseInt(room?.mantra_max_roster??30)||30));
        }

        function mantraRosterMin(room=currentRoom){
            return Math.max(23,Math.min(90,parseInt(room?.mantra_min_roster??23)||23));
        }

        function mantraMinGoalkeepers(room=currentRoom){
            return Math.max(2,Math.min(15,parseInt(room?.mantra_min_goalkeepers??2)||2));
        }

        function listoneHasMantraRoles(list=playersList){
            return Array.isArray(list) && list.some(p=>!!mantraRoleFromPlayer(p));
        }

        function activeRoleLabel(role){
            return isMantraRoom()?normalizeMantraRole(role):String(role||'').toUpperCase();
        }

        function mantraRoleMatches(player,role){
            if(!role || role==='ALL')return true;
            return mantraRoleTokens(playerRole(player)).includes(String(role));
        }

