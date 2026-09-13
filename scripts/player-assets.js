// LIVEASTA player image / asset utilities — CLEAN-23
const LIVEASTA_ASSET_BASE = '.';
        function genericPlayerImage(role = '') {
            const r=String(role||'').trim();
            return (r.toUpperCase()==='P' || mantraRoleTokens(r).includes('Por'))
                ? `${LIVEASTA_ASSET_BASE}/assets/players/generic-goalkeeper.webp`
                : `${LIVEASTA_ASSET_BASE}/assets/players/generic-player.webp`;
        }
        function playerImageUrl(id, role = '') {
            const clean = String(id ?? '').trim();
            return clean ? `${LIVEASTA_ASSET_BASE}/assets/players/${encodeURIComponent(clean)}.webp` : genericPlayerImage(role);
        }
        function setPlayerImage(img, id, role = '') {
            if (!img) return;
            img.dataset.role = String(role || '').trim().toUpperCase();
            img.dataset.localFallback = '0';
            img.src = playerImageUrl(id, role);
        }
        function playerImageFallback(img) {
            if (!img) return;
            const role = img.dataset.role || '';
            const fallback = genericPlayerImage(role);
            if (img.dataset.localFallback === '1' && (img.getAttribute('src') || '').endsWith(fallback)) return;
            img.dataset.localFallback = '1';
            img.src = fallback;
        }

