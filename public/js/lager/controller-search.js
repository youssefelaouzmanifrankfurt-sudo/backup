// public/js/lager/controller-search.js
console.log("🔎 CONTROLLER-SEARCH GELADEN (V6.3 - Architect Fix applied)");

// --- SUCHE STARTEN ---
window.startPriceSearch = function() {
    const socket = window.socket;
    if (!socket) return window.showToast ? window.showToast("Keine Verbindung!", "error") : alert("Kein Socket!");
    
    const query = document.getElementById('inp-title').value;
    if(!query || query.length < 2) return; 

    const list = document.getElementById('price-results');
    if(list) {
        list.style.display = 'block';
        list.innerHTML = `<div style="padding:20px; text-align:center; color:#94a3b8;"><div class="spinner"></div><br>Durchsuche Händler...</div>`;
    }
    
    // Globale Suche triggern
    console.log("🔍 Sende Suchanfrage:", query);
    socket.emit('search-external', { query: query, source: 'All' });
};

window.findSets = function() {
     const query = document.getElementById('inp-title').value;
     if(query) {
         document.getElementById('inp-title').value = query + " Set";
         window.startPriceSearch();
     }
};

// --- ERGEBNISSE RENDERN ---
window.renderSearchResultsFromSocket = function(results) {
    console.log("💰 Search Render aufgerufen. Ergebnisse:", results ? results.length : 0);
    const list = document.getElementById('price-results');
    if(!list) {
        console.warn("⚠️ Element #price-results nicht gefunden!");
        return;
    }

    // Sicherstellen, dass die Liste sichtbar ist
    list.style.display = 'block';

    if(!results || results.length === 0) {
        list.innerHTML = '<div style="padding:10px; text-align:center; color:#94a3b8;">Nichts gefunden.</div>';
        return;
    }

    let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
    
    results.forEach(res => {
        // Strings sicher machen für HTML Attribute
        const safeTitle = (res.title || "").replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeUrl = (res.link || res.url || "#").replace(/'/g, "\\'");
        const safeImg = (res.image || res.img || "").replace(/'/g, "\\'");
        const safePrice = res.price || "0,00 €";
        const sourceName = res.source || "Web";

        html += `
        <div class="search-result-card" style="display:flex; align-items:center; background:#0f172a; padding:10px; border-radius:6px; border:1px solid #334155;">
            <img src="${res.image || '/img/placeholder.png'}" 
                 onerror="this.style.display='none'"
                 style="width:40px; height:40px; object-fit:cover; border-radius:4px; margin-right:10px; background:#1e293b;">
            
            <div style="flex:1; overflow:hidden;">
                <a href="${safeUrl}" target="_blank" style="font-weight:bold; color:white; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; text-decoration:none;">
                    ${res.title} 🔗
                </a>
                <div style="color:#94a3b8; font-size:0.75rem;">${sourceName}</div>
            </div>

            <div style="text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                <div style="font-weight:bold; color:#f59e0b;">${safePrice}</div>
                
                <div style="display:flex; gap:5px;">
                    <button type="button" onclick="window.watchResult('${sourceName}', '${safePrice}', '${safeUrl}')" 
                        title="Nur beobachten"
                        style="background:#334155; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.8rem;">
                        👁
                    </button>

                    <button type="button" onclick="window.adoptResult('${safeTitle}', '${safePrice}', '${safeUrl}', '${sourceName}', '${safeImg}')"
                        title="Übernehmen (Auto 45% EK)"
                        style="background:#3b82f6; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.8rem;">
                        Übernehmen
                    </button>
                </div>
            </div>
        </div>`;
    });
    html += '</div>';
    list.innerHTML = html;
};

// --- LOGIK: BEOBACHTEN & ÜBERNEHMEN ---

window.watchResult = function(source, priceStr, url) {
    let val = parsePrice(priceStr);
    addCompetitorToWatchlist(source, val, url);
    if(window.showToast) window.showToast(`"${source}" beobachtet`, 'success');
};

// 45% REGEL HIER IMPLEMENTIERT
window.adoptResult = function(title, priceStr, url, source, img) {
    // 1. Titel setzen
    if(title) document.getElementById('inp-title').value = title;
    
    // 2. Preis parsen (Deutsch 1.000,00 -> Float 1000.00)
    let marketPrice = parsePrice(priceStr);
    
    // 3. Marktpreis & EK setzen
    if(marketPrice > 0) {
        document.getElementById('inp-market-price').value = marketPrice.toFixed(2);
        
        // AUTOMATISCH 45% BERECHNEN
        const ek = marketPrice * 0.45;
        document.getElementById('inp-price').value = ek.toFixed(2);
        
        console.log(`💰 Adopt: Markt ${marketPrice}€ -> EK (45%) ${ek.toFixed(2)}€`);
    }

    // 4. Metadaten
    if(img) document.getElementById('inp-image').value = img;
    document.getElementById('inp-source-url').value = url;
    document.getElementById('inp-source-name').value = source;

    // 5. Zur Watchlist hinzufügen (damit man Preisupdates bekommt)
    addCompetitorToWatchlist(source, marketPrice, url);
    
    // 6. UI Updates
    if(window.calcProfit) window.calcProfit();
    
    // Ergebnisse ausblenden für bessere Übersicht
    const list = document.getElementById('price-results');
    if(list) list.style.display = 'none';
    
    if(window.showToast) window.showToast("Daten übernommen & EK (45%) berechnet", "success");
};

// --- HELPER ---

// Robuster Parser für deutsche Preise (1.299,00 € -> 1299.00)
function parsePrice(priceStr) {
    if (typeof priceStr === 'number') return priceStr;
    if (!priceStr) return 0;
    // Entfernt Tausenderpunkte, ersetzt Komma durch Punkt, entfernt alles außer Zahlen/Punkt
    return parseFloat(priceStr.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
}

function addCompetitorToWatchlist(name, price, url) {
    if(!window.tempCompetitors) window.tempCompetitors = [];
    
    // Vermeide Duplikate
    const exists = window.tempCompetitors.find(c => c.url === url);
    if(!exists) {
        window.tempCompetitors.push({ name, price, url, lastCheck: new Date() });
    }
    
    if(window.renderCompetitorList) window.renderCompetitorList(window.tempCompetitors);
}

window.refreshCompetitor = function(index, url) {
     if (!window.socket) return;
     const el = document.getElementById(`comp-price-${index}`);
     if(el) el.innerHTML = "⏳"; 
     window.socket.emit('check-competitor-price', { index, url });
};

window.calcProfit = function() {
    const m = parseFloat(document.getElementById('inp-market-price').value)||0;
    const e = parseFloat(document.getElementById('inp-price').value)||0;
    const b = document.getElementById('profit-badge'); 
    
    if(b) {
        if (m > 0 && e > 0) {
            const p = m - e;
            const margin = (p / e) * 100;
            b.style.display = 'block';
            b.style.marginTop = '5px';
            b.innerHTML = `Gewinn: ${p.toFixed(2)}€ (${isFinite(margin) ? margin.toFixed(0) : 0}%)`;
            b.style.color = p >= 0 ? '#10b981' : '#ef4444';
            b.style.borderColor = p >= 0 ? '#10b981' : '#ef4444';
        } else {
            b.style.display = 'none';
        }
    }
};

// --- WICHTIGER FIX: Globalen Alias überschreiben ---
// Damit main.js weiß, dass es DIESE Funktion zum Rendern nutzen soll
window.renderPriceResults = window.renderSearchResultsFromSocket;