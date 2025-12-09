// public/js/lager/controller-scan.js
console.log("🚀 SCAN CONTROLLER V13 (Router Mode)");

window.ScanCtrl = {
    currentMode: 'search', // Modus: search | sell | inventory | insert
    cropper: null,         
    lastCode: null,        

    // --- LIFECYCLE (Wird beim Tab-Wechsel aufgerufen) ---
    onTabShow: function() {
        console.log("👁️ Scan-Tab aktiv");
        this.initOCRListener();
        this.startQR();
        
        // Fokus auf Input setzen
        setTimeout(() => { 
            const el = document.getElementById('terminal-input');
            if(el) el.focus();
        }, 200);
    },

    onTabHide: function() {
        console.log("🙈 Scan-Tab inaktiv");
        this.stopQR();
    },

    // --- MODUS WAHL ---
    setMode: function(mode) {
        this.currentMode = mode;
        
        // Buttons umschalten (Visuell)
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        const btn = document.getElementById(`mode-${mode}`);
        if(btn) btn.classList.add('active');

        // Placeholder Text anpassen
        const inp = document.getElementById('terminal-input');
        if(inp) {
            inp.value = '';
            inp.focus();
            const texts = {
                'search': '🔍 Suche (Name, EAN)...',
                'sell': '🛒 Verkauf scannen...',
                'inventory': '📦 Inventur scannen...',
                'insert': '➕ Neu scannen oder tippen...'
            };
            inp.placeholder = texts[mode] || "Code scannen...";
        }
        
        if(window.showToast) window.showToast(`Modus: ${mode.toUpperCase()}`, 'info');
    },

    // --- INPUT VERARBEITUNG ---
    triggerManual: function() {
        const inp = document.getElementById('terminal-input');
        if(inp && inp.value.trim()) {
            this.handleScanInput(inp.value.trim(), 'manual');
            inp.value = ''; // Input leeren nach Absenden
        }
    },

    handleScanInput: function(code, source) {
        console.log(`⚡ INPUT: ${code} (${source}) MODE: ${this.currentMode}`);
        this.lastCode = code;

        // 1. NEU ANLEGEN (Shortcut) -> Sofort Modal öffnen
        if(this.currentMode === 'insert') {
            this.openInsertFlow(code, source);
            return;
        }

        // 2. SERVER CHECK (Für Search, Sell, Inventory)
        if(window.socket) {
            window.socket.emit('check-scan', code);
        } else {
            if(window.showToast) window.showToast("Keine Verbindung", "error");
        }
    },

    // --- ROUTER: SERVER ANTWORT VERTEILEN ---
    handleScanResponse: function(results) {
        // Sicherheitscheck: Nur wenn Scan-Tab sichtbar ist
        if(document.getElementById('tab-scan').style.display === 'none') return false;

        // A: Nichts gefunden
        if(!results || results.length === 0) {
            this.handleNotFound();
            return true;
        }

        // B: Such-Modus (Zeigt immer Liste, auch bei 1 Treffer)
        if(this.currentMode === 'search') {
            if(window.WorkflowSearch) window.WorkflowSearch.process(results);
            else console.error("❌ WorkflowSearch fehlt!");
            return true;
        }

        // C: Workflow (Verkauf / Inventur) -> Braucht EINDEUTIGEN Treffer
        if(results.length === 1) {
            const item = results[0];
            
            if(this.currentMode === 'sell') {
                if(window.WorkflowSell) window.WorkflowSell.process(item);
                else console.error("❌ WorkflowSell fehlt!");
            } 
            else if(this.currentMode === 'inventory') {
                if(window.WorkflowInventory) window.WorkflowInventory.process(item);
                else console.error("❌ WorkflowInventory fehlt!");
            }
            return true; // Erledigt
        } 
        
        // D: Zu viele Treffer für Workflow -> Liste zeigen zur Auswahl
        window.showToast(`⚠️ ${results.length} Treffer. Bitte präziser suchen.`, 'warning');
        if(window.WorkflowSearch) window.WorkflowSearch.process(results);
        
        return false;
    },

    // --- HELPER & MODALS ---
    handleNotFound: function() {
        this.playSound('error');
        const container = document.getElementById('price-results');
        if(container) {
            container.innerHTML = `
                <div style="padding:20px; text-align:center; border:2px dashed #ef4444; border-radius:8px; color:#ef4444; margin-top:20px;">
                    <div style="font-size:2rem; margin-bottom:10px;">🤷‍♂️</div>
                    <h3>Nicht gefunden: "${this.lastCode}"</h3>
                    <button class="btn-primary" onclick="window.ScanCtrl.openInsertFlow('${this.lastCode}', 'manual')">
                        + Als Neu anlegen
                    </button>
                </div>`;
        }
    },

    openInsertFlow: function(code, source) {
        if(window.openCreateModal) {
            window.openCreateModal(); // Leeres Modal
            setTimeout(() => {
                const t = document.getElementById('inp-title');
                const s = document.getElementById('inp-sku');
                // Logik: OCR/Lang -> Titel, Kurz -> SKU
                if(source === 'text' || code.length > 15) { if(t) t.value = code; } 
                else { if(s) s.value = code; }
            }, 300);
        }
    },

    // --- HARDWARE / OCR ---
    startQR: function() {
        if(window.ScannerModule) {
            window.ScannerModule.startCamera('reader-container', (code) => {
                this.handleScanInput(code, 'qr');
            });
        }
    },
    stopQR: function() {
        if(window.ScannerModule) window.ScannerModule.stopCamera();
    },
    
    // OCR Init & Trigger
    triggerOCR: function() {
        const el = document.getElementById('global-cam-input');
        if(el) el.click();
    },
    initOCRListener: function() {
        const el = document.getElementById('global-cam-input');
        if(el && !el.dataset.init) {
            el.dataset.init="true";
            el.addEventListener('change', (e) => this.handleImageSelect(e));
        }
    },
    handleImageSelect: function(e) { 
        if(e.target.files && e.target.files[0]) {
            const r = new FileReader();
            r.onload = (evt) => {
                const img = document.getElementById('image-to-crop');
                const m = document.getElementById('crop-modal');
                if(img && m) { 
                    img.src=evt.target.result; 
                    m.classList.add('active'); 
                    if(this.cropper) this.cropper.destroy();
                    this.cropper = new Cropper(img, {viewMode:1, autoCropArea:0.8}); 
                }
            };
            r.readAsDataURL(e.target.files[0]);
        }
        e.target.value='';
    },
    performOCRUpload: function() { 
        if(!this.cropper) return;
        const btn = document.getElementById('btn-ocr-confirm');
        if(btn) btn.innerText = "⏳ ...";
        this.cropper.getCroppedCanvas().toBlob(async (blob) => {
            const fd = new FormData(); fd.append('image', blob, 'scan.jpg');
            try {
                const res = await fetch('/api/scan-image', {method:'POST', body:fd});
                const data = await res.json();
                if(data.success && data.model) {
                    this.handleScanInput(data.model, 'text');
                    document.getElementById('crop-modal').classList.remove('active');
                } else { window.showToast("Nichts erkannt", "error"); }
            } catch(e) { console.error(e); }
            if(btn) btn.innerText = "Text scannen";
        });
    },
    playSound: function(type) {
        const audio = new Audio('/sounds/notification.mp3');
        if(type==='cash') audio.playbackRate=1.5;
        audio.play().catch(e=>{});
        if(navigator.vibrate) navigator.vibrate(type==='error'?[50,50,50]:100);
    }
};

// Enter Key Support
document.addEventListener('keypress', (e) => {
    if(e.key === 'Enter' && document.activeElement.id === 'terminal-input') {
        window.ScanCtrl.triggerManual();
    }
});