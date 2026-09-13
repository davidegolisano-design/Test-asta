// LIVEASTA room capacity rules — CLEAN-31
function roomLimits(room = currentRoom) {
            return {
                P: Math.max(0, parseInt(room?.limit_p ?? 3) || 0),
                D: Math.max(0, parseInt(room?.limit_d ?? 8) || 0),
                C: Math.max(0, parseInt(room?.limit_c ?? 8) || 0),
                A: Math.max(0, parseInt(room?.limit_a ?? 6) || 0)
            };
        }

function totalRoomSlots(room = currentRoom) {
            if(isMantraRoom(room))return mantraRosterMax(room);
            const l = roomLimits(room); return l.P + l.D + l.C + l.A;
        }
