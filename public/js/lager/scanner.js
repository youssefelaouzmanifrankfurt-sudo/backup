// public/js/lager/scanner.js
console.log("📷 Scanner-Modul geladen (V2.0 - Hardware Driver)");

window.ScannerModule = {
    html5QrCode: null,
    isRunning: false,
    activeElementId: null,

    // Prüft, ob Kamera verfügbar ist
    checkSupport: function() {
        if (typeof Html5Qrcode === 'undefined') {
            console.error("❌ Html5Qrcode Bibliothek fehlt! Bitte in EJS einbinden.");
            return false;
        }
        return true;
    },

    startCamera: async function(elementId, onScanSuccess) {
        if (!this.checkSupport()) return;
        
        // Verhindern, dass wir 2x starten
        if (this.isRunning) {
            console.log("⚠️ Scanner läuft bereits.");
            return;
        }

        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`⚠️ Scanner-Container #${elementId} nicht gefunden.`);
            return;
        }

        this.activeElementId = elementId;
        this.html5QrCode = new Html5Qrcode(elementId);
        
        // Config für Performance
        const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };
        
        try {
            // "environment" = Rückkamera
            await this.html5QrCode.start(
                { facingMode: "environment" }, 
                config, 
                (decodedText) => {
                    // Erfolgreicher Scan
                    console.log(`✅ RAW SCAN: ${decodedText}`);
                    this.playSound();
                    if(onScanSuccess) onScanSuccess(decodedText);
                },
                (errorMessage) => {
                    // Fehler beim Frame-Read sind normal, ignorieren wir.
                }
            );
            
            this.isRunning = true;
            element.classList.add('camera-active'); // Für CSS Styling
            console.log("✅ Kamera erfolgreich gestartet.");

        } catch (err) {
            console.error("❌ Kamera Start Fehler:", err);
            if(window.showToast) window.showToast("Kamera-Zugriff verweigert oder HTTPS fehlt.", "error");
            this.stopCamera();
        }
    },

    stopCamera: async function() {
        if (!this.html5QrCode) return;

        try {
            if(this.isRunning) {
                await this.html5QrCode.stop();
            }
            this.html5QrCode.clear();
            this.isRunning = false;
            console.log("🛑 Kamera gestoppt.");
            
            if(this.activeElementId) {
                const el = document.getElementById(this.activeElementId);
                if(el) {
                    el.classList.remove('camera-active');
                    el.innerHTML = ""; // Canvas Reste entfernen
                }
            }
        } catch (err) {
            console.error("Fehler beim Stoppen:", err);
        }
        this.html5QrCode = null;
    },

    playSound: function() {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => {}); // Fehler ignorieren, wenn User noch nicht interagiert hat
        if (navigator.vibrate) navigator.vibrate(100);
    }
};