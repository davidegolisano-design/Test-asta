// One image policy for live boards, Ready, restored sessions and roster previews.
const LIVEASTA_ASSET_BASE = '.';

function genericPlayerImage(role = '') {
    const r = String(role || '').trim();
    return (r.toUpperCase() === 'P' || mantraRoleTokens(r).includes('Por'))
        ? `${LIVEASTA_ASSET_BASE}/assets/players/generic-goalkeeper.webp`
        : `${LIVEASTA_ASSET_BASE}/assets/players/generic-player.webp`;
}

// Inventory/audit tools check the actual file, independently of room grants.
function playerMiniatureAssetUrl(id, role = '') {
    const clean = String(id ?? '').trim();
    return clean ? `${LIVEASTA_ASSET_BASE}/assets/players/${encodeURIComponent(clean)}.webp` : genericPlayerImage(role);
}

function playerImageUrl(id, role = '') {
    return window.liveastaPremium?.has('miniatures')
        ? playerMiniatureAssetUrl(id, role)
        : genericPlayerImage(role);
}

function setPlayerImage(img, id, role = '') {
    if (!img) return;
    img.dataset.playerImageId = String(id ?? '').trim();
    img.dataset.role = String(role || '').trim().toUpperCase();
    const source = playerImageUrl(id, role);
    // Polling/repainting must not retry a missing miniature or reload the image.
    if (img.dataset.playerImageSource === source) {
        if (img.dataset.localFallback === '1') playerImageFallback(img);
        return;
    }
    img.dataset.playerImageSource = source;
    img.dataset.localFallback = '0';
    img.src = source;
}

function playerImageFallback(img) {
    if (!img) return;
    const fallback = genericPlayerImage(img.dataset.role || '');
    img.dataset.localFallback = '1';
    if (img.getAttribute('src') === fallback) return;
    img.src = fallback;
}

window.addEventListener('liveasta:premium-change', () => {
    document.querySelectorAll('img[data-player-image-id]').forEach(img => {
        setPlayerImage(img, img.dataset.playerImageId, img.dataset.role);
    });
});
