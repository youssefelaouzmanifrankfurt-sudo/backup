// public/js/lager/controller-core.js
console.log("🚨 CONTROLLER-CORE GESTARTET");

// --- 1. GLOBALE STATUS-VARIABLEN ---
window.lastStockItems = [];
window.currentEditId = null;
window.tempCompetitors = [];

// --- 2. SOCKET VERBINDUNG ---
const socket = window.socket || (typeof io !== 'undefined' ? io() : null);

if (!socket) {
    console.error("❌ KRITISCHER FEHLER: Socket IO nicht verfügbar.");
    alert("Systemfehler: Keine Verbindung zum Server.");
} else {
    console.log("✅ Socket verbunden (Core).");
    window.socket = socket;

    // --- EVENT LISTENERS ---
    
    // 1. Initial Connect
    socket.on('connect', () => {
        console.log("🔌 Core: Verbunden! Lade Lagerbestand...");
        socket.emit('get-stock');
    });

    socket.on('disconnect', () => {
        console.warn("🔌 Core: Verbindung verloren!");
    });

    // 2. Lagerbestand Update
    socket.on('update-stock', (items) => {
        console.log(`📦 Core: ${items ? items.length : 0} Items empfangen.`);
        window.lastStockItems = items || [];
        
        // UI Update triggern (in ui.js definiert)
        if (typeof window.renderStock === 'function') {
            window.renderStock(window.lastStockItems);
            
            // Statistik Update
            const statEl = document.getElementById('stat-total');
            if(statEl) statEl.innerText = window.lastStockItems.length;
        } else {
            console.warn("⚠️ UI: renderStock() fehlt!");
        }
    });

    socket.on('force-reload-stock', () => {
        console.log("🔄 Core: Server erzwingt Reload.");
        socket.emit('get-stock');
    });

    // 3. Preis-Suchergebnisse
    socket.on('price-search-results', (results) => {
        console.log("💰 Core: Preisergebnisse empfangen", results);
        // An search controller oder UI delegieren
        if(typeof window.renderPriceResults === 'function') {
            window.renderPriceResults(results);
        } else {
            // Fallback: Manuelles Rendering
            const list = document.getElementById('price-results');
            if(list) {
                list.style.display = 'block';
                list.innerHTML = results.length ? '' : '<div style="padding:10px;">Nichts gefunden.</div>';
                results.forEach(res => {
                    // Einfaches Fallback-Rendering falls ui.js versagt
                    const btn = `<button onclick="window.applyPrice('${res.price}')">Wählen</button>`;
                    list.innerHTML += `<div style="padding:5px; border-bottom:1px solid #333;">${res.title} - <b>${res.price}</b> ${btn}</div>`;
                });
            }
        }
    });

    // 4. Konkurrenten-Preis Update
    socket.on('competitor-price-result', (res) => {
        if (window.tempCompetitors && window.tempCompetitors[res.index]) {
            window.tempCompetitors[res.index].price = res.price;
            if(typeof window.renderCompetitorList === 'function') {
                window.renderCompetitorList(window.tempCompetitors);
            }
        }
    });

    // 5. Matching Ergebnisse
    socket.on('db-match-search-results', (candidates) => {
        console.log("🔗 Core: Matching Kandidaten empfangen", candidates);
        const list = document.getElementById('match-list');
        if(!list) return;
        
        list.innerHTML = '';
        if(!candidates || candidates.length === 0) {
            list.innerHTML = '<div style="padding:20px; text-align:center;">Keine Anzeige gefunden.</div>';
            return;
        }

        candidates.forEach(cand => {
            const div = document.createElement('div');
            div.className = 'match-item';
            div.style.padding = "10px";
            div.style.borderBottom = "1px solid #475569";
            div.style.display = "flex";
            div.style.justifyContent = "space-between";
            div.style.alignItems = "center";
            div.innerHTML = `
                <div style="flex:1;">
                    <div class="match-title" style="color:white; font-weight:bold;">${cand.title}</div>
                    <div style="font-size:0.8em; color:#94a3b8;">ID: ${cand.id} | Status: ${cand.status}</div>
                </div>
                <button onclick="window.confirmLink('${cand.id}')" style="background:#10b981; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer;">Verbinden</button>
            `;
            list.appendChild(div);
        });
    });
}