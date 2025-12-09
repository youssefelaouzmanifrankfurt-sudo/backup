// public/js/lager/controller-search.js
console.log("🔎 CONTROLLER-SEARCH GELADEN (V12 - Dual Render Fix)");

// --- SUCHE STARTEN (Aus dem Modal) ---
window.startPriceSearch = function() {
    const socket = window.socket;
    if (!socket) return window.showToast ? window.showToast("Keine Verbindung!", "error") : alert("Kein Socket!");
    
    const query = document.getElementById('inp-title').value;
    if(!query || query.length < 2) {
        if(window.showToast) window.showToast("Bitte Titel eingeben", "warning");
        return; 
    }

    // Spinner im MODAL anzeigen (da wir von dort kommen)
    const list = document.getElementById('modal-price-results');
    if(list) {
        list.style.display = 'block';
        list.innerHTML = `<div style="padding:20px; text-align:center; color:#94a3b8;"><div class="spinner"></div><br>Durchsuche Händler nach "${query}"...</div>`;
    }
    
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

// --- ERGEBNISSE RENDERN (Smart Switch) ---
window.renderSearchResultsFromSocket = function(results) {
    console.log("💰 Search Render. Ergebnisse:", results ? results.length : 0);

    // 1. ZIEL BESTIMMEN
    // Wir prüfen, ob das Modal offen ist. Wenn ja, rendern wir DORT.
    // Wenn nein, rendern wir im Scan-Tab (Fallback).
    
    let list = null;
    const modal = document.getElementById('item-modal');
    
    if (modal && modal.classList.contains('active')) {
        // Modal ist offen -> Priorität!
        list = document.getElementById('modal-price-results');
    } 
    
    if (!list) {
        // Modal zu oder nicht gefunden -> Versuche Scan-Tab
        list = document.getElementById('price-results');
    }

    if(!list) {
        console.warn("⚠️ Kein Container für Suchergebnisse gefunden!");
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

// 45% REGEL
window.adoptResult = function(title, priceStr, url, source, img) {
    if(title) document.getElementById('inp-title').value = title;
    
    let marketPrice = parsePrice(priceStr);
    
    if(marketPrice > 0) {
        document.getElementById('inp-market-price').value = marketPrice.toFixed(2);
        const ek = marketPrice * 0.45;
        document.getElementById('inp-price').value = ek.toFixed(2);
    }

    if(img) document.getElementById('inp-image').value = img;
    document.getElementById('inp-source-url').value = url;
    document.getElementById('inp-source-name').value = source;

    addCompetitorToWatchlist(source, marketPrice, url);
    
    if(window.calcProfit) window.calcProfit();
    
    // Ergebnisse ausblenden (in beiden möglichen Containern)
    const list1 = document.getElementById('modal-price-results');
    const list2 = document.getElementById('price-results');
    if(list1) list1.style.display = 'none';
    if(list2) list2.style.display = 'none';
    
    if(window.showToast) window.showToast("Daten übernommen & EK (45%) berechnet", "success");
};

// --- HELPER ---

function parsePrice(priceStr) {
    if (typeof priceStr === 'number') return priceStr;
    if (!priceStr) return 0;
    return parseFloat(priceStr.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
}

function addCompetitorToWatchlist(name, price, url) {
    if(!window.tempCompetitors) window.tempCompetitors = [];
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

// WICHTIG: Globalen Alias setzen
window.renderPriceResults = window.renderSearchResultsFromSocket;