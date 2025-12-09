// public/js/lager/controller-stock.js
console.log("🛠️ Controller Stock Loaded (V6.2 - Smart Legacy Fix)");

// --- EINKAUFSPREIS AUTOMATIK ---
window.autoCalcEK = function() {
    const marketInp = document.getElementById('inp-market-price');
    const ekInp = document.getElementById('inp-price');
    
    if (marketInp && ekInp) {
        const marketVal = parseFloat(marketInp.value) || 0;
        if (marketVal > 0) {
            const ek = marketVal * 0.45;
            ekInp.value = ek.toFixed(2);
            if(window.calcProfit) window.calcProfit();
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const mp = document.getElementById('inp-market-price');
    if(mp) {
        mp.addEventListener('input', window.autoCalcEK);
        mp.addEventListener('change', window.autoCalcEK);
    }
});

// --- MODAL ÖFFNEN ---
window.openCreateModal = function(id = null) {
    // Reset Form
    ['edit-id', 'inp-title', 'inp-sku', 'inp-market-price', 'inp-price', 
     'inp-location', 'inp-source-url', 'inp-source-name', 'inp-image'].forEach(fieldId => {
        const el = document.getElementById(fieldId);
        if(el) el.value = "";
    });
    
    document.getElementById('inp-qty').value = "1";
    if(document.getElementById('profit-badge')) document.getElementById('profit-badge').style.display = 'none';
    window.tempCompetitors = [];
    if(window.renderCompetitorList) window.renderCompetitorList([]);

    // EDIT MODUS
    if (id) {
        window.currentEditId = id;
        const items = window.lastStockItems || [];
        const item = items.find(i => i.id === id);
        
        if (item) {
            document.getElementById('edit-id').value = item.id;
            document.getElementById('inp-title').value = item.title || "";
            document.getElementById('inp-sku').value = item.sku || "";
            document.getElementById('inp-location').value = item.location || "";
            
            // SMART LEGACY FIX AUCH IM MODAL:
            let ek = parseFloat(item.price) || 0;
            let market = parseFloat(item.marketPrice) || 0;
            
            // Wenn altes Format erkannt wird (Kein Marktpreis, aber Preis da):
            if (market === 0 && ek > 0) {
                market = ek;       // Der alte Preis war der Marktpreis
                ek = market * 0.45; // EK neu berechnen
            }

            document.getElementById('inp-market-price').value = market > 0 ? market.toFixed(2) : "";
            document.getElementById('inp-price').value = ek > 0 ? ek.toFixed(2) : "";

            // Menge Fix
            let qty = parseInt(item.qty);
            if(isNaN(qty)) qty = parseInt(item.quantity);
            if(isNaN(qty)) qty = 1;
            document.getElementById('inp-qty').value = qty;

            document.getElementById('inp-image').value = item.image || "";
            document.getElementById('inp-source-url').value = item.sourceUrl || "";
            document.getElementById('inp-source-name').value = item.sourceName || "";
            
            if (item.competitors) {
                window.tempCompetitors = JSON.parse(JSON.stringify(item.competitors));
                if(window.renderCompetitorList) window.renderCompetitorList(window.tempCompetitors);
            }
            if(window.calcProfit) window.calcProfit();
        }
    } else {
        window.currentEditId = null;
    }
    
    const modal = document.getElementById('item-modal');
    if(modal) modal.classList.add('active');
};

// --- SPEICHERN ---
window.saveItem = function() {
    const id = document.getElementById('edit-id').value;
    const title = document.getElementById('inp-title').value;

    if (!title) return window.showToast("Bitte einen Namen eingeben!", "error");

    const data = {
        title: title,
        sku: document.getElementById('inp-sku').value,
        marketPrice: parseFloat(document.getElementById('inp-market-price').value) || 0,
        price: parseFloat(document.getElementById('inp-price').value) || 0, // EK
        location: document.getElementById('inp-location').value,
        qty: parseInt(document.getElementById('inp-qty').value) || 1, // Speichert sicher als 'qty'
        image: document.getElementById('inp-image').value,
        sourceUrl: document.getElementById('inp-source-url').value,
        sourceName: document.getElementById('inp-source-name').value,
        competitors: window.tempCompetitors || [],
        id: id 
    };

    if (window.socket) {
        if (id) {
            window.socket.emit('update-stock-details', data);
            window.showToast("Artikel aktualisiert", "success");
        } else {
            window.socket.emit('create-new-stock', data);
            window.showToast("Artikel angelegt", "success");
        }
        window.closeAllModals();
    } else {
        alert("Verbindungsfehler!");
    }
};

window.deleteItemWithId = (id) => {
    if(confirm("Löschen?")) {
        if(window.socket) window.socket.emit('delete-stock-item', id);
    }
};

window.closeAllModals = function() {
    document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('active'));
};

// Minimal Helpers falls search controller fehlt
window.removeCompetitor = (i) => { if(window.tempCompetitors) window.tempCompetitors.splice(i,1); };
window.applyCompetitor = (p,u,s) => {};