// public/js/lager/workflow-sell.js
console.log("🛒 Workflow SELL geladen");

window.WorkflowSell = {
    // Diese Funktion wird vom Controller aufgerufen, wenn ein Item gescannt wurde
    process: function(item) {
        if (!item) return;
        
        console.log("🛒 Starte Verkauf-Workflow für:", item.title);
        this.openConfirmationModal(item);
    },

    openConfirmationModal: function(item) {
        const modal = document.getElementById('sell-modal');
        const preview = document.getElementById('sell-preview');
        const btn = document.getElementById('btn-confirm-sell');
        
        if(!modal || !btn) {
            console.error("❌ Sell-Modal Elemente fehlen im HTML!");
            if(window.showToast) window.showToast("Fehler: Verkaufs-Modal fehlt", "error");
            return;
        }

        // Daten vorbereiten
        const qty = parseInt(item.qty || item.quantity || 0);
        const color = qty > 0 ? '#10b981' : '#ef4444'; // Grün wenn Bestand da, sonst Rot
        
        // Vorschau HTML
        preview.innerHTML = `
            <div style="font-size:0.9rem; color:#94a3b8;">SKU: ${item.sku || 'N/A'}</div>
            <div style="font-size:1.2rem; font-weight:bold; margin:5px 0; color:white;">${item.title}</div>
            <div style="margin-top:10px;">
                Aktueller Bestand: <span style="font-weight:bold; color:${color};">${qty} Stück</span>
            </div>
        `;
        
        modal.classList.add('active'); // Modal sichtbar machen

        // Button Logik (Wir klonen den Button, um alte Event-Listener sauber zu entfernen)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.onclick = () => {
            this.executeSale(item);
            modal.classList.remove('active');
        };
        
        // Fokus auf Bestätigen-Button (für schnelles Arbeiten mit Enter/Scanner)
        setTimeout(() => newBtn.focus(), 100);
    },

    executeSale: function(item) {
        const socket = window.socket;
        if (!socket) return window.showToast ? window.showToast("Keine Verbindung!", "error") : alert("Kein Socket!");

        const id = item.id || item._id;
        const currentQty = parseInt(item.qty || item.quantity || 0);
        
        // Neue Menge berechnen (-1)
        const newQty = currentQty - 1;

        console.log(`💸 Verkaufe 1x ${id}. Neuer Bestand: ${newQty}`);
        
        // An Server senden
        socket.emit('update-stock-item', { id: id, quantity: newQty });
        
        // Feedback (Sound & Toast)
        if(window.ScanCtrl && window.ScanCtrl.playSound) window.ScanCtrl.playSound('cash');
        if(window.showToast) window.showToast("Verkauf gebucht! (-1)", "success");
    }
};