// public/js/lager/main.js

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 LAGER MAIN.JS Initialisiert (V8 - Architect Fix)");

    // Socket sicherstellen
    const socket = window.socket || (typeof io !== 'undefined' ? io() : null);
    if(!window.socket && socket) {
        window.socket = socket;
    }

    // Toast Helper (Benachrichtigungen)
    window.showToast = function(msg, type='info') {
        const existing = document.querySelectorAll('.toast-msg');
        existing.forEach(e => e.remove());

        const div = document.createElement('div');
        div.className = 'toast-msg';
        div.innerText = msg;
        div.style.position = 'fixed';
        div.style.bottom = '20px';
        div.style.right = '20px';
        div.style.padding = '15px';
        div.style.borderRadius = '5px';
        div.style.color = 'white';
        div.style.zIndex = '9999';
        div.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
        div.style.background = type === 'error' ? '#ef4444' : (type === 'success' ? '#10b981' : '#3b82f6');
        
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    };

    if(socket) {
        // 1. SCAN ERFOLGREICH (Einzeltreffer)
        // Hier delegieren wir sofort an den Controller, falls vorhanden.
        socket.on('scan-success', (item) => {
            if(window.ScanCtrl) {
                window.ScanCtrl.handleScanResponse([item]);
            } else {
                // Fallback, falls Controller fehlt
                window.showToast(`✅ Gescannt: ${item.title}`, 'success');
            }
        });

        // 2. SUCH ERGEBNISSE (Kann Liste oder Einzeltreffer sein)
        socket.on('price-search-results', (results) => {
            // SCHRITT A: Controller fragen
            if(window.ScanCtrl) {
                // handleScanResponse gibt 'true' zurück, wenn es die Aktion komplett erledigt hat (z.B. Popup geöffnet).
                // Gibt es 'false' zurück, sollen wir die Liste anzeigen.
                const handled = window.ScanCtrl.handleScanResponse(results);
                if(handled) return; 
            }

            // SCHRITT B: Liste rendern (wenn Controller nicht übernommen hat)
            if(!results || results.length === 0) {
                if(window.ScanCtrl) window.ScanCtrl.handleNotFound();
                else window.showToast("Nichts gefunden.", "error");
            } else {
                // Liste anzeigen
                if (window.renderPriceResults) {
                    window.renderPriceResults(results);
                }
            }
        });

        // 3. FEHLER VOM SERVER
        socket.on('scan-error', (msg) => {
            if(window.ScanCtrl && msg.includes('nicht gefunden')) {
                window.ScanCtrl.handleNotFound();
            } else {
                window.showToast(`❌ ${msg}`, 'error');
            }
        });
    }

    console.log("✅ Main Init fertig.");
});