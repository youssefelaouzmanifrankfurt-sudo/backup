// public/js/lager/controller-scan.js
console.log("🚀 SCAN CONTROLLER V11 (Connected)");

window.ScanCtrl = {
    currentMode: 'search', 
    cropper: null,         
    lastCode: null,        

    // --- LIFECYCLE ---
    onTabShow: function() {
        console.log("👁️ Scan-Tab aktiv");
        this.initOCRListener();
        this.startQR();
        
        // Input Fokus
        setTimeout(() => {
            const el = document.getElementById('terminal-input');
            if(el) el.focus();
        }, 200);
    },

    onTabHide: function() {
        console.log("🙈 Scan-Tab inaktiv");
        this.stopQR();
    },

    initOCRListener: function() {
        const fileInput = document.getElementById('global-cam-input');
        if(fileInput && !fileInput.dataset.init) {
            fileInput.dataset.init = "true";
            fileInput.addEventListener('change', (e) => this.handleImageSelect(e));
        }
    },

    // --- MODI ---
    setMode: function(mode) {
        this.currentMode = mode;
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        const btn = document.getElementById(`mode-${mode}`);
        if(btn) btn.classList.add('active');

        // Placeholder Logik
        const inp = document.getElementById('terminal-input');
        if(inp) {
            inp.value = '';
            inp.focus();
            if(mode === 'insert') inp.placeholder = "Neu+: Code scannen oder Name tippen...";
            else if(mode === 'sell') inp.placeholder = "Verkauf: Code scannen...";
            else inp.placeholder = "Code scannen...";
        }
    },

    // --- SCANNER ---
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

    // --- OCR ---
    triggerOCR: function() {
        const el = document.getElementById('global-cam-input');
        if(el) el.click();
        else console.error("Element #global-cam-input fehlt in lager.ejs!");
    },

    handleImageSelect: function(e) {
        if(e.target.files && e.target.files[0]) {
            const r = new FileReader();
            r.onload = (evt) => {
                const imgEl = document.getElementById('image-to-crop');
                const modal = document.getElementById('crop-modal');
                
                if(imgEl && modal) {
                    imgEl.src = evt.target.result;
                    modal.classList.add('active');
                    
                    if(this.cropper) this.cropper.destroy();
                    this.cropper = new Cropper(imgEl, { viewMode: 1, autoCropArea: 0.8 });
                }
            };
            r.readAsDataURL(e.target.files[0]);
        }
        e.target.value = '';
    },

    performOCRUpload: function() {
        if(!this.cropper) return;
        const btn = document.getElementById('btn-ocr-confirm');
        if(btn) btn.innerText = "⏳ ...";

        this.cropper.getCroppedCanvas().toBlob(async (blob) => {
            const fd = new FormData();
            fd.append('image', blob, 'scan.jpg');
            
            try {
                // Mock oder Echter Call
                const res = await fetch('/api/scan-image', { method:'POST', body:fd });
                const data = await res.json();
                
                if(data.success && data.model) {
                    this.handleScanInput(data.model, 'text'); // Als Text verarbeiten
                    document.getElementById('crop-modal').classList.remove('active');
                } else {
                    window.showToast("Nichts erkannt", "error");
                }
            } catch(e) { console.error(e); window.showToast("OCR Fehler", "error"); }
            
            if(btn) btn.innerText = "Text scannen";
        }, 'image/jpeg');
    },

    // --- INPUT HANDLER ---
    triggerManual: function() {
        const inp = document.getElementById('terminal-input');
        if(inp && inp.value.trim()) {
            this.handleScanInput(inp.value.trim(), 'manual');
            inp.value = '';
        }
    },

    handleScanInput: function(code, source) {
        console.log(`INPUT: ${code} (${source}) MODE: ${this.currentMode}`);
        this.lastCode = code;

        // INSERT SHORTCUT
        if(this.currentMode === 'insert') {
            this.openInsertFlow(code, source);
            return;
        }

        // SERVER CHECK
        if(window.socket) window.socket.emit('check-scan', code);
    },

    // --- ACTIONS ---
    handleScanResponse: function(results) {
        if(document.getElementById('tab-scan').style.display === 'none') return false;

        if(!results || results.length === 0) {
            this.handleNotFound();
            return true;
        }

        if(this.currentMode === 'search') return false; // Liste zeigen

        if(results.length === 1) {
            const item = results[0];
            if(this.currentMode === 'sell') this.openSellModal(item);
            if(this.currentMode === 'inventory') this.openInventoryFlow(item);
            return true;
        } 
        
        window.showToast("Mehrere Treffer. Bitte wählen.", "warning");
        return false;
    },

    handleNotFound: function() {
        const container = document.getElementById('price-results');
        if(container) {
            container.innerHTML = `
                <div style="padding:20px; text-align:center; border:2px dashed #ef4444; border-radius:8px; color:#ef4444;">
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
                
                // Logik: Längerer Text -> Wahrscheinlich Titel (OCR), Kurzer -> SKU
                if(source === 'text' || code.length > 15) {
                    if(t) t.value = code;
                } else {
                    if(s) s.value = code;
                }
            }, 300);
        }
    },

    openSellModal: function(item) {
        const modal = document.getElementById('sell-modal');
        const prev = document.getElementById('sell-preview');
        const btn = document.getElementById('btn-confirm-sell');
        
        if(modal && prev) {
            prev.innerHTML = `<b>${item.title}</b><br>Bestand: ${item.qty || item.quantity}`;
            modal.classList.add('active');
            
            // One-Time Listener
            btn.onclick = () => {
                if(window.socket) {
                    const newQ = (parseInt(item.qty)||0) - 1;
                    window.socket.emit('update-stock-item', {id: item.id || item._id, quantity: newQ});
                    window.showToast("Verkauft!", "success");
                }
                modal.classList.remove('active');
            };
        }
    },

    openInventoryFlow: function(item) {
        if(window.openCreateModal) window.openCreateModal(item.id || item._id);
    }
};

// Enter Key Support
document.addEventListener('keypress', (e) => {
    if(e.key === 'Enter' && document.activeElement.id === 'terminal-input') {
        window.ScanCtrl.triggerManual();
    }
});