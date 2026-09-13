// LIVEASTA generic shared utilities — CLEAN-25
function safeReadLocalJson(key){
            try{
                const raw=localStorage.getItem(key);
                return raw?JSON.parse(raw):null;
            }catch(e){
                return null;
            }
        }

        function safeWriteLocalJson(key,value){
            try{
                localStorage.setItem(key,JSON.stringify(value));
                return true;
            }catch(e){
                return false;
            }
        }


function normalizeRoomCode(value) {
            return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 30);
        }

        function escapeHtml(v) {
            return String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
        }

