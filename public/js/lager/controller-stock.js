// public/js/lager/controller-stock.js
console.log("🛠️ Controller Stock Loaded (V11 - Full Logic)");

// --- EINKAUFSPREIS AUTOMATIK (45% Regel) ---
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

// Event Listeners für Auto-Calc
document.addEventListener("DOMContentLoaded", () => {
    const mp = document.getElementById('inp-market-price');
    if(mp) {
        mp.addEventListener('input', window.autoCalcEK);
        mp.addEventListener('change', window.autoCalcEK);
    }
});

// --- MODAL: ANLEGEN / BEARBEITEN ---
window.openCreateModal = function(id = null) {
    console.log("📝 Öffne Modal. ID:", id); // Debug

    // 1. Formular leeren
    const fields = ['edit-id', 'inp-title', 'inp-sku', 'inp-market-price', 'inp-price', 
                    'inp-location', 'inp-source-url', 'inp-source-name', 'inp-image'];
    
    fields.forEach(fid => {
        const el = document.getElementById(fid);
        if(el) el.value = "";
    });
    
    // Defaults setzen
    if(document.getElementById('inp-qty')) document.getElementById('inp-qty').value = "1";
    if(document.getElementById('profit-badge')) document.getElementById('profit-badge').style.display = 'none';
    
    // Listen leeren
    window.tempCompetitors = [];
    if(window.renderCompetitorList) window.renderCompetitorList([]);
    const resultsDiv = document.getElementById('price-results');
    if(resultsDiv) {
        resultsDiv.innerHTML = '';
        resultsDiv.style.display = 'none';
    }

    // 2. Falls ID übergeben -> Daten laden (BEARBEITEN)
    if (id) {
        window.currentEditId = id;
        // Wir suchen im lokalen Cache (View speichert Items meist nicht global, also holen wir sie uns notfalls)
        // Hinweis: View.js sollte items global verfügbar machen oder wir greifen auf window.lastStockItems zu falls vorhanden
        const items = window.currentStockItems || []; // Muss in controller-core gesetzt werden
        const item = items.find(i => i.id === id);
        
        if (item) {
            document.getElementById('edit-id').value = item.id;
            document.getElementById('inp-title').value = item.title || "";
            document.getElementById('inp-sku').value = item.sku || "";
            document.getElementById('inp-location').value = item.location || "";
            
            // Preis Logik (Legacy Support)
            let ek = parseFloat(item.price) || 0;
            let market = parseFloat(item.marketPrice) || 0;
            
            if (market === 0 && ek > 0) {
                market = ek; 
                ek = market * 0.45;
            }

            document.getElementById('inp-market-price').value = market > 0 ? market.toFixed(2) : "";
            document.getElementById('inp-price').value = ek > 0 ? ek.toFixed(2) : "";
            
            // Menge
            let qty = parseInt(item.qty);
            if(isNaN(qty)) qty = parseInt(item.quantity) || 1;
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
        window.currentEditId = null; // NEU ANLEGEN MODUS
    }
    
    // 3. Modal anzeigen
    const modal = document.getElementById('item-modal');
    if(modal) {
        modal.classList.add('active');
        // Fokus auf Titel
        setTimeout(() => {
            const t = document.getElementById('inp-title');
            if(t) t.focus();
        }, 100);
    } else {
        console.error("❌ Modal #item-modal nicht gefunden! Prüfe lager.ejs");
    }
};

// --- SPEICHERN ---
window.saveItem = function() {
    const id = document.getElementById('edit-id').value;
    const title = document.getElementById('inp-title').value;

    if (!title) {
        if(window.showToast) window.showToast("Bitte einen Namen eingeben!", "error");
        else alert("Name fehlt!");
        return;
    }

    const data = {
        title: title,
        sku: document.getElementById('inp-sku').value,
        marketPrice: parseFloat(document.getElementById('inp-market-price').value) || 0,
        price: parseFloat(document.getElementById('inp-price').value) || 0, // EK
        location: document.getElementById('inp-location').value,
        qty: parseInt(document.getElementById('inp-qty').value) || 1,
        image: document.getElementById('inp-image').value,
        sourceUrl: document.getElementById('inp-source-url').value,
        sourceName: document.getElementById('inp-source-name').value,
        competitors: window.tempCompetitors || [],
        id: id 
    };

    if (window.socket) {
        if (id) {
            window.socket.emit('update-stock-details', data);
            if(window.showToast) window.showToast("Artikel aktualisiert", "success");
        } else {
            window.socket.emit('create-new-stock', data);
            if(window.showToast) window.showToast("Artikel angelegt", "success");
        }
        window.closeAllModals();
        // Wechsel zurück zum Bestand-Tab
        if(window.switchTab) window.switchTab('tab-stock');
    } else {
        alert("Keine Server-Verbindung!");
    }
};

window.deleteItemWithId = (id) => {
    if(confirm("Wirklich löschen?")) {
        if(window.socket) window.socket.emit('delete-stock-item', id);
        window.closeAllModals();
    }
};

// --- GLOBAL UTILS ---
window.closeAllModals = function() {
    document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('active'));
    // Scanner stoppen falls er im Modal lief
    if(window.ScannerModule && window.ScannerModule.stopCamera) window.ScannerModule.stopCamera(); 
    if(window.ScanCtrl && window.ScanCtrl.stopQR) window.ScanCtrl.stopQR();
};

window.removeCompetitor = (i) => { 
    if(window.tempCompetitors) {
        window.tempCompetitors.splice(i,1);
        if(window.renderCompetitorList) window.renderCompetitorList(window.tempCompetitors);
    }
};