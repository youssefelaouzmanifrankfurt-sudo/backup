// public/js/lager/controller-scan.js

console.log("🚀 SCAN CONTROLLER V8 (Architect Fix: Robust Workflow)");

window.ScanCtrl = {
    currentMode: 'search', // 'search' | 'sell' | 'inventory' | 'insert'
    html5QrCode: null,
    cropper: null,
    lastCode: null,

    init: function() {
        // Init OCR Listeners (Bild-Upload)
        const inputs = ['global-cam-input', 'cam-input'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                // Event Listener bereinigen (Klonen trick), um Mehrfach-Aufrufe zu verhindern
                const newEl = el.cloneNode(true);
                el.parentNode.replaceChild(newEl, el);
                newEl.addEventListener('change', (e) => this.handleImageSelect(e));
            }
        });

        // Init Manueller Input (Enter-Taste)
        const manualInput = document.getElementById('main-scan-input');
        if(manualInput) {
            manualInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.triggerManual();
            });
            // Fokus nur auf Desktop automatisch setzen (Mobile Keyboards stören sonst)
            if(window.innerWidth > 768) manualInput.focus();
        }
    },

    // --- 1. MODUS WAHL ---
    setMode: function(mode) {
        this.currentMode = mode;
        
        // Buttons Visuell aktualisieren
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`mode-${mode}`);
        if(activeBtn) activeBtn.classList.add('active');

        // Input Placeholder anpassen
        const inp = document.getElementById('main-scan-input');
        if(inp) {
            inp.value = '';
            inp.focus();
            const placeholders = {
                'insert': "Barcode (SKU) oder Foto (Name)...",
                'sell': "Verkauf scannen...",
                'inventory': "Inventur Scan...",
                'search': "EAN / Code scannen..."
            };
            inp.placeholder = placeholders[mode] || "Code scannen...";
        }

        const labels = {
            'search': '🔍 Such-Modus',
            'sell': '🛒 Verkaufs-Modus',
            'inventory': '📦 Inventur-Modus',
            'insert': '➕ Inserier-Modus'
        };
        window.showToast(`Modus: ${labels[mode]}`, 'info');
    },

    // --- 2. SCAN INPUTS ---
    
    // Manuelle Eingabe
    triggerManual: function() {
        const inputMain = document.getElementById('main-scan-input');
        const inputModal = document.getElementById('manual-code-input');
        
        let code = '';
        if(inputMain && inputMain.value.trim()) {
            code = inputMain.value.trim();
            inputMain.value = '';
        } else if (inputModal && inputModal.value.trim()) {
            code = inputModal.value.trim();
            inputModal.value = '';
        }

        if(!code) return;
        this.processScanResult(code, 'barcode'); 
    },

    // QR Scanner (Kamera)
    startQR: async function() {
        const modal = document.getElementById('qr-scanner-modal');
        if(!modal) {
            alert("Fehler: QR Modal (#qr-scanner-modal) fehlt im HTML!");
            return;
        }
        modal.classList.add('active');

        // Aufräumen alter Instanzen
        if(this.html5QrCode) {
            try { 
                await this.html5QrCode.stop(); 
                await this.html5QrCode.clear();
            } catch(e){ console.log("Scanner Cleanup Info:", e); }
        }

        this.html5QrCode = new Html5Qrcode("reader");

        try {
            await this.html5QrCode.start(
                { facingMode: "environment" }, 
                { fps: 10, qrbox: {width: 250, height: 250}, aspectRatio: 1.0 },
                (decodedText) => {
                    this.playSound('success');
                    console.log("QR Erkannt:", decodedText);
                    this.processScanResult(decodedText, 'barcode');
                    this.stopQR();
                },
                (err) => { /* Scanning... */ }
            );
        } catch(e) {
            console.error("Kamera Start Fehler:", e);
            window.showToast("Kamera Fehler (HTTPS nötig?)", "error");
            this.stopQR();
        }
    },

    stopQR: function() {
        if(this.html5QrCode) {
            this.html5QrCode.stop().then(() => {
                this.html5QrCode.clear();
            }).catch(e => console.log("Stop error:", e));
        }
        const modal = document.getElementById('qr-scanner-modal');
        if(modal) modal.classList.remove('active');
    },

    // --- 3. OCR (FOTO SCAN) ---
    triggerOCR: function() { 
        // Klickt den versteckten Input
        const el = document.getElementById('global-cam-input') || document.getElementById('cam-input');
        if(el) el.click(); 
    },
    
    handleImageSelect: function(e) {
        if(e.target.files && e.target.files[0]) {
            const r = new FileReader();
            r.onload = (evt) => {
                const imgEl = document.getElementById('image-to-crop');
                if(!imgEl) return;
                imgEl.src = evt.target.result;
                
                // Crop Modal öffnen
                const cropModal = document.getElementById('crop-modal');
                if(cropModal) cropModal.classList.add('active');
                
                if(this.cropper) this.cropper.destroy();
                this.cropper = new Cropper(imgEl, { viewMode: 1, autoCropArea: 0.8 });
            };
            r.readAsDataURL(e.target.files[0]);
        }
        e.target.value = ''; // Reset für nächsten Upload
    },

    performOCRUpload: function() {
        if(!this.cropper) return;
        const btn = document.getElementById('btn-ocr');
        if(btn) btn.innerText = "⏳ Analysiere...";

        this.cropper.getCroppedCanvas().toBlob(async (blob) => {
            const fd = new FormData();
            fd.append('image', blob, 'scan.jpg');
            try {
                const res = await fetch('/api/scan-image', { method:'POST', body:fd });
                const data = await res.json();
                
                if(data.success && data.model) {
                    this.playSound('success');
                    // Wichtig: Quelle als 'text' markieren für Inserier-Logik
                    this.processScanResult(data.model, 'text'); 
                    
                    if(window.closeAllModals) window.closeAllModals();
                } else {
                    window.showToast("Kein Text erkannt", "error");
                }
            } catch(e) { console.error(e); }
            if(btn) btn.innerText = "Text scannen";
        }, 'image/jpeg');
    },

    // --- 4. ZENTRALE KOMMUNIKATION ---
    processScanResult: function(code, source = 'barcode') {
        this.lastCode = code;
        
        // SPECIAL: Inserieren-Modus braucht keinen Server-Check
        if(this.currentMode === 'insert') {
            this.openInsertFlow(code, source);
            return;
        }

        if(!window.socket) {
            window.showToast("Keine Server-Verbindung!", "error");
            return;
        }
        
        console.log(`📡 Sende Scan (${source}): ${code}`);
        window.socket.emit('check-scan', code);
    },

    // --- 5. LOGIK WEICHE (DER FIX) ---
    /**
     * Diese Funktion wird von main.js aufgerufen, wenn der Server antwortet.
     * @returns {boolean} true = Controller hat übernommen, false = UI soll Liste zeigen
     */
    handleScanResponse: function(results) {
        // Fall A: Nichts gefunden
        if (!results || results.length === 0) {
            this.handleNotFound();
            return true; // Fehler behandelt
        }

        // Fall B: Such-Modus -> Immer Liste anzeigen
        if (this.currentMode === 'search') {
            return false; // -> main.js rendert Liste
        }

        // Fall C: Workflow Modus (Verkauf / Inventur)
        // C1: Genau ein Treffer -> Perfekt, wir führen die Aktion aus!
        if (results.length === 1) {
            const item = results[0];
            this.executeWorkflowAction(item);
            return true; // Aktion ausgeführt, keine Liste nötig
        }

        // C2: Mehrere Treffer -> Unsicher!
        if (results.length > 1) {
            this.playSound('error');
            window.showToast(`⚠️ ${results.length} Treffer. Bitte manuell wählen!`, 'warning');
            // Wir geben false zurück -> main.js zeigt die Liste an.
            // Der User klickt dann manuell auf "Verkaufen" oder "Bearbeiten" in der Tabelle.
            return false; 
        }

        return false;
    },

    // Führt die eigentliche Aktion aus
    executeWorkflowAction: function(item) {
        switch(this.currentMode) {
            case 'sell':
                this.openSellModal(item);
                break;
                
            case 'inventory':
                this.openInventoryFlow(item);
                break;
                
            case 'insert':
                // Sollte theoretisch hier nicht ankommen, da oben abgefangen
                window.showToast("Artikel existiert bereits!", "warning");
                break;
                
            default:
                break;
        }
    },

    handleNotFound: function() {
        this.playSound('error');
        // Komfort-Funktion: Direktes Anlegen vorschlagen
        if(confirm(`Code "${this.lastCode}" unbekannt.\n\nNeu anlegen?`)) {
            this.setMode('insert');
            this.openInsertFlow(this.lastCode, 'barcode');
        }
    },

    // --- 6. ACTIONS (MODALS) ---

    // A: Inserieren Helper
    openInsertFlow: function(code, source) {
        window.showToast("🆕 Artikel anlegen...", "info");
        if(window.openCreateModal) {
            window.openCreateModal(); // Leeres Modal
            
            // Felder zeitverzögert füllen (damit Modal erst offen ist)
            setTimeout(() => {
                const titleField = document.getElementById('inp-title');
                const skuField = document.getElementById('inp-sku');

                if (source === 'text') {
                    // OCR -> Titel füllen
                    if(titleField) titleField.value = code;
                } else {
                    // Barcode -> SKU füllen
                    if(skuField) skuField.value = code;
                }
            }, 300);
        }
    },

    // B: Verkaufs Modal
    openSellModal: function(item) {
        const modal = document.getElementById('sell-modal');
        const preview = document.getElementById('sell-preview');
        const btn = document.getElementById('btn-confirm-sell');
        
        if(!modal || !btn) return;

        // Vorschau Rendern
        preview.innerHTML = `
            <div style="font-size:0.9em; color:#94a3b8; margin-bottom:5px;">${item.sku || 'Keine SKU'}</div>
            <strong style="font-size:1.1em; display:block; margin-bottom:10px;">${item.title}</strong>
            Status: <span style="color:${item.quantity > 0 ? '#10b981' : '#ef4444'}">
                ${item.quantity || 0} an Lager
            </span>
        `;
        
        modal.classList.add('active');
        
        // Button neu binden (clean event listeners)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.onclick = () => {
            this.executeSale(item);
            modal.classList.remove('active');
        };
        // Fokus auf Button für schnelles Enter-Drücken
        setTimeout(() => newBtn.focus(), 100); 
    },

    executeSale: function(item) {
        const id = item._id || item.id;
        if(window.socket) {
             let oldQty = parseInt(item.qty || item.quantity || 0);
             let newQty = oldQty > 0 ? oldQty - 1 : 0;
             
             // Update an Server
             window.socket.emit('update-stock-item', { id: id, quantity: newQty });
             
             this.playSound('cash');
             window.showToast(`💰 Verkauft! Neuer Bestand: ${newQty}`, "success");
        }
    },

    // C: Inventur Helper
    openInventoryFlow: function(item) {
        const id = item._id || item.id;
        window.showToast(`📝 Inventur für: ${item.title}`, "info");
        
        // Öffnet das existierende Bearbeiten-Modal
        if(window.openCreateModal) window.openCreateModal(id);
    },

    playSound: function(type) {
        const audio = new Audio('/sounds/notification.mp3'); 
        // Vibrate Feedback auf Handys
        if(type === 'error' && navigator.vibrate) navigator.vibrate([100,50,100]);
        if(type === 'cash' && navigator.vibrate) navigator.vibrate(200);
        audio.play().catch(e=>{});
    }
};

// --- BRIDGE FÜR ALTE ONCLICK HANDLER ---
// Damit Buttons im HTML wie `onclick="startQRScanner()"` weiter funktionieren
window.triggerManualScan = () => window.ScanCtrl.triggerManual();
window.startQRScanner = () => window.ScanCtrl.startQR();
window.stopQRScanner = () => window.ScanCtrl.stopQR();
window.triggerCamera = () => window.ScanCtrl.triggerOCR();
window.handleImageCrop = (e) => window.ScanCtrl.handleImageSelect({target: e});
window.performOCR = () => window.ScanCtrl.performOCRUpload();

// Auto-Start
document.addEventListener("DOMContentLoaded", () => {
    window.ScanCtrl.init();
});