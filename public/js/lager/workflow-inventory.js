// public/js/lager/workflow-inventory.js
console.log("📦 Workflow INVENTORY geladen");

window.WorkflowInventory = {
    process: function(item) {
        if (!item) return;
        console.log("📦 Starte Inventur-Workflow für:", item.title);

        // Wir nutzen das existierende Bearbeiten-Modal aus controller-stock.js
        if (window.openCreateModal) {
            
            // Scanner kurz pausieren, damit er nicht im Hintergrund weiter scannt
            if(window.ScanCtrl && window.ScanCtrl.stopQR) window.ScanCtrl.stopQR();
            
            // Modal mit Item-ID öffnen (lädt Daten via controller-stock.js)
            window.openCreateModal(item.id || item._id);
            
            // Fokus direkt auf das Mengen-Feld setzen für schnelle Korrektur
            setTimeout(() => {
                const qtyField = document.getElementById('inp-qty');
                if(qtyField) {
                    qtyField.focus();
                    qtyField.select(); // Inhalt markieren, damit man direkt überschreiben kann (z.B. "5" tippen ersetzt die "1")
                }
                
                if(window.showToast) window.showToast("Inventur: Bitte Menge prüfen", "info");
            }, 300);
        } else {
            console.error("❌ window.openCreateModal fehlt! Ist controller-stock.js geladen?");
        }
    }
};