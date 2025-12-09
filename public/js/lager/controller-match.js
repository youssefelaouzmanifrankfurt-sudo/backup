// public/js/lager/controller-match.js
console.log("🔗 CONTROLLER-MATCH GELADEN (V4.1)");

window.openLinkModal = function(id, title) {
    const idField = document.getElementById('match-stock-id');
    const searchField = document.getElementById('match-search-inp');
    const modal = document.getElementById('match-modal');

    if(idField) idField.value = id;
    if(searchField) searchField.value = title || ""; 
    
    const list = document.getElementById('match-list');
    if(list) list.innerHTML = '';
    
    if(modal) modal.classList.add('active');
    
    if(title) window.searchForMatch();
};

window.searchForMatch = function() {
    if (!window.socket) return;

    const q = document.getElementById('match-search-inp').value;
    if(!q) return;

    const list = document.getElementById('match-list');
    if(list) {
        list.innerHTML = `
            <div style="padding:20px;text-align:center; color:#94a3b8;">
                <div class="spinner"></div><br>
                Suche nach "<b>${q}</b>"...
            </div>
        `;
    }
    window.socket.emit('search-db-for-link', q);
};

window.renderMatchResults = function(items) {
    const list = document.getElementById('match-list');
    if(!list) return;

    if(!items || items.length === 0) {
        list.innerHTML = `
            <div style="text-align:center; padding:20px;">
                <p style="color:#94a3b8;">Keine Treffer.</p>
                <button onclick="window.createAdFromStock()" class="btn-secondary" style="margin-top:10px;">
                    + Als neu anlegen
                </button>
            </div>`;
        return;
    }

    let html = '';
    items.forEach(item => {
        const validId = item.id || item._id; 
        const scorePct = Math.round((item.score || 0) * 100);
        const scoreColor = scorePct > 80 ? '#10b981' : (scorePct > 50 ? '#f59e0b' : '#94a3b8');

        html += `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:12px; margin-bottom:8px; border-radius:6px; border:1px solid #334155;">
            <div style="flex:1; overflow:hidden;">
                <div style="font-weight:bold; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title}</div>
                <div style="font-size:0.8rem; color:#94a3b8;">
                    ${item.price}€ | Match: <span style="color:${scoreColor}">${scorePct}%</span>
                </div>
            </div>
            <button onclick="window.confirmLink('${validId}')" style="background:#3b82f6; color:white; border:none; padding:8px 12px; border-radius:6px; margin-left:10px; cursor:pointer;">
                Link
            </button>
        </div>
        `;
    });
    list.innerHTML = html;
};

window.confirmLink = function(adId) {
    const stockId = document.getElementById('match-stock-id').value;
    if(stockId && adId && window.socket) {
        window.socket.emit('confirm-link', { stockId, adId });
        if(window.closeAllModals) window.closeAllModals();
    }
};

window.unlinkItem = function(id) {
    if(confirm("Verbindung trennen?")) {
        if(window.socket) window.socket.emit('unlink-stock-item', id);
    }
};

window.createAdFromStock = function() {
    const stockId = document.getElementById('match-stock-id').value;
    if(stockId && window.socket) {
         window.socket.emit('create-ad-from-stock', stockId);
         if(window.closeAllModals) window.closeAllModals();
    }
};