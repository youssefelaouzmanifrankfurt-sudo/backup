// public/js/lager/main.js

document.addEventListener("DOMContentLoaded", () => {
    console.log("🏰 LAGER MAIN.JS (V9 - Tab Router)");

    const socket = window.socket || (typeof io !== 'undefined' ? io() : null);
    if(socket) window.socket = socket;

    // --- 1. TAB SYSTEM INITIALISIEREN ---
    initTabs();

    // --- 2. SOCKET EVENTS ---
    if(socket) {
        socket.on('price-search-results', (results) => {
            // Logik-Weiche: Wer darf das Ergebnis verarbeiten?
            
            // A: Scan Controller (hat Vorrang wenn Scan-Tab aktiv)
            if(isTabActive('tab-scan') && window.ScanCtrl) {
                const handled = window.ScanCtrl.handleScanResponse(results);
                if(handled) return; // Controller hat es erledigt (z.B. Popup)
            }

            // B: Standard Liste (Fallback)
            // Wir rendern die Ergebnisse in BEIDE Listen-Container (falls vorhanden),
            // damit es egal ist, wo man gerade ist.
            if(window.renderPriceResults) window.renderPriceResults(results);
        });

        socket.on('scan-error', (msg) => {
            if(isTabActive('tab-scan') && window.ScanCtrl) {
                window.ScanCtrl.handleNotFound();
            } else {
                window.showToast(msg, 'error');
            }
        });

        socket.on('scan-success', (item) => {
            if(isTabActive('tab-scan') && window.ScanCtrl) {
                window.ScanCtrl.handleScanResponse([item]);
            } else {
                window.showToast(`Gefunden: ${item.title}`, 'success');
            }
        });
    }
});

// --- TAB ROUTER LOGIC ---

function initTabs() {
    // Standard Tab setzen
    switchTab('tab-stock');

    // Global verfügbar machen
    window.switchTab = switchTab;
}

function switchTab(tabId) {
    console.log(`🔀 Tab Wechsel zu: ${tabId}`);

    // 1. Alle Tabs ausblenden
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    
    // 2. Buttons resetten
    document.querySelectorAll('.nav-tab-btn').forEach(btn => btn.classList.remove('active'));

    // 3. Ziel-Tab anzeigen
    const target = document.getElementById(tabId);
    if(target) target.style.display = 'block';

    // 4. Button aktivieren (Matching über data-target oder ID Logik)
    // Wir suchen den Button, der diesen Tab aufruft
    const btn = document.querySelector(`button[onclick*="'${tabId}'"]`);
    if(btn) btn.classList.add('active');

    // 5. CONTROLLER EVENT HOOKS
    // Hier steuern wir die "Kosten" (Scanner, Listener etc.)
    
    if (tabId === 'tab-scan') {
        if(window.ScanCtrl) window.ScanCtrl.onTabShow();
    } else {
        if(window.ScanCtrl) window.ScanCtrl.onTabHide();
    }
}

function isTabActive(tabId) {
    const el = document.getElementById(tabId);
    return el && el.style.display !== 'none';
}

// Toast Helper (bleibt gleich)
window.showToast = function(msg, type='info') {
    const d = document.createElement('div');
    d.className = `toast-msg ${type}`;
    d.innerText = msg;
    d.style.cssText = "position:fixed; bottom:20px; right:20px; padding:15px; background:#333; color:white; border-radius:8px; z-index:9999;";
    if(type==='error') d.style.background = '#ef4444';
    if(type==='success') d.style.background = '#10b981';
    document.body.appendChild(d);
    setTimeout(()=>d.remove(), 3000);
};