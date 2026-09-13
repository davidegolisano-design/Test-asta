// LIVEASTA team roster and bidding rules — CLEAN-34
// Characterized by tests/team-logic-smoke.mjs before extraction.
function teamPurchases(teamId) {
            return purchasesCache.filter(p => String(p.team_id) === String(teamId));
        }

function teamCounts(teamId) {
            const c = {P:0,D:0,C:0,A:0,Por:0,total:0};

            teamPurchases(teamId).forEach(p => {
                const role=String(p.role||'').trim();

                if(isMantraRoom()){
                    // in Mantra un "Por" veniva contato due volte:
                    // una tramite il conteggio diretto del ruolo e una tramite mantraRoleTokens().
                    // In Mantra contiamo il portiere UNA SOLA VOLTA dai token.
                    if(mantraRoleTokens(role).includes('Por')){
                        c.Por++;
                    }
                }else{
                    const classicRole=role.toUpperCase();
                    if(['P','D','C','A'].includes(classicRole)){
                        c[classicRole]++;
                    }
                }

                c.total++;
            });

            return c;
        }

function findTeamByName(name) {
            return teamsCache.find(t => String(t.name).toLowerCase() === String(name).toLowerCase());
        }

function maxBidForTeam(team, role) {
            if (!team) return 0;

            const counts = teamCounts(team.id);

            if(isMantraRoom()){
                const maxRoster=mantraRosterMax();
                if(counts.total>=maxRoster)return 0;

                const buyingKeeper=mantraRoleTokens(role).includes('Por');
                const keepersAfter=counts.Por+(buyingKeeper?1:0);
                const slotsAfter=Math.max(0,maxRoster-(counts.total+1));
                const keepersStillNeeded=Math.max(0,mantraMinGoalkeepers()-keepersAfter);

                // Non consentire un acquisto che renda matematicamente impossibile
                // chiudere la rosa con almeno 2 portieri.
                if(keepersStillNeeded>slotsAfter)return 0;

                const remainingAfterPurchase=slotsAfter;
                return Math.max(0,(parseInt(team.credits_remaining)||0)-remainingAfterPurchase);
            }

            const limits = roomLimits();
            const classicRole=String(role||'').toUpperCase();
            if (!classicRole || limits[classicRole] === undefined || counts[classicRole] >= limits[classicRole]) return 0;
            const remainingAfterPurchase = Math.max(0, totalRoomSlots() - (counts.total + 1));
            return Math.max(0, (parseInt(team.credits_remaining) || 0) - remainingAfterPurchase);
        }
