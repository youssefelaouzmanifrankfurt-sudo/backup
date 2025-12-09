// public/js/lager/view.js
console.log("🎨 View Module geladen (V6.4 - Aggressive Repair)");

// --- HELPER: Währung formatieren ---
const formatEuro = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
});

window.View = {
    // --- HAUPTTABELLE RENDERN ---
    renderStock: (items) => {
        const tbody = document.getElementById('stock-body');
        const statTotal = document.getElementById('stat-total');
        const statValue = document.getElementById('stat-total-value');
        
        if (tbody) tbody.innerHTML = '';

        // Statistik Update
        if (statTotal) statTotal.innerText = items ? items.length : 0;
        
        let totalValue = 0;

        if (!items || !Array.isArray(items) || items.length === 0) {
            if(tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align:center; padding:40px; color:#94a3b8;">
                            <div style="font-size:2rem; margin-bottom:10px;">📦</div>
                            Keine Artikel im Lager gefunden.
                        </td>
                    </tr>`;
            }
            if(statValue) statValue.innerText = "0,00 €";
            return;
        }

        items.forEach(item => {
            if (!item || !item.id) return;

            // --- 1. INTELLIGENTE DATEN-REPARATUR (V6.4) ---
            
            // Menge: 
            let qty = parseInt(item.qty);
            if (isNaN(qty)) qty = parseInt(item.quantity);
            if (isNaN(qty)) qty = 1; // Default 1, damit Lagerbestand angezeigt wird

            let priceEK = parseFloat(item.price) || 0; 
            let priceMarket = parseFloat(item.marketPrice) || 0;

            // FALL A: Altes Format (Marktpreis ist 0, aber Preis ist da)
            // Beispiel: Früher war "Preis" = 100€ (Verkauf). Jetzt rechnen wir das um.
            if (priceMarket === 0 && priceEK > 0) {
                priceMarket = priceEK;        
                priceEK = priceMarket * 0.45; 
            }
            // FALL B: Neues Format, aber EK vergessen/0 (Das ist dein aktueller Fall!)
            // Beispiel: Marktpreis = 459€, aber EK = 0€. Wir setzen EK automatisch auf 45%.
            else if (priceMarket > 0 && priceEK === 0) {
                priceEK = priceMarket * 0.45;
            }
            
            // Gesamtwert für Statistik (EK * Menge)
            totalValue += (qty * priceEK);

            // --- 2. HTML BAUEN ---
            const tr = document.createElement('tr');
            tr.className = "stock-row"; 
            tr.style.borderBottom = "1px solid #334155";
            
            // Such-Daten speichern
            tr.dataset.search = (item.title + " " + item.sku + " " + item.location).toLowerCase();

            // Status Badge
            let statusBadge = '';
            if (qty <= 0) {
                statusBadge = '<span style="background:rgba(239,68,68,0.2); color:#ef4444; padding:2px 8px; border-radius:4px; font-size:0.8em;">Ausverkauft</span>';
            } else if (qty < 2) {
                statusBadge = '<span style="background:rgba(251,191,36,0.2); color:#fbbf24; padding:2px 8px; border-radius:4px; font-size:0.8em;">Knapp</span>';
            } else {
                statusBadge = '<span style="background:rgba(16,185,129,0.2); color:#34d399; padding:2px 8px; border-radius:4px; font-size:0.8em;">Auf Lager</span>';
            }

            // Profit Anzeige (Markt - EK)
            let profitDisplay = '';
            if (priceMarket > 0) {
                const profit = priceMarket - priceEK;
                const profitColor = profit >= 0 ? '#10b981' : '#ef4444'; 
                profitDisplay = `
                    <div style="font-size:0.75rem; color:${profitColor}; margin-top:2px;">
                        Gewinn: ${formatEuro.format(profit)}
                    </div>`;
            } else {
                profitDisplay = `<div style="font-size:0.75rem; color:#64748b;">-</div>`;
            }

            // Online Status
            const isLinked = item.adId || item.linkedAdId;
            let linkStatusHtml = '';
            let actionButtons = '';

            if (isLinked) {
                linkStatusHtml = `<div style="font-size:0.75em; color:#34d399; margin-top:4px;">🟢 Online</div>`;
                actionButtons += `<button onclick="window.unlinkItem('${item.id}')" title="Trennen" style="background:none; border:none; cursor:pointer; font-size:1.1rem; margin-right:5px;">🔗❌</button>`;
            } else {
                linkStatusHtml = `<div style="font-size:0.75em; color:#94a3b8; margin-top:4px;">⚪ Offline</div>`;
                const safeTitle = (item.title || '').replace(/'/g, "\\'");
                actionButtons += `<button onclick="window.openLinkModal('${item.id}', '${safeTitle}')" title="Verbinden" style="background:none; border:none; cursor:pointer; font-size:1.1rem; margin-right:5px;">🔗</button>`;
            }

            // Bild
            let imgHtml = '';
            if (item.image) {
                imgHtml = `<img src="${item.image}" alt="img" style="width:40px; height:40px; object-fit:cover; border-radius:6px; border:1px solid #475569; margin-right:10px;">`;
            } else {
                imgHtml = `<div style="width:40px; height:40px; background:#1e293b; border-radius:6px; border:1px solid #334155; margin-right:10px; display:flex; align-items:center; justify-content:center; color:#475569;">📷</div>`;
            }

            // Zelle befüllen
            tr.innerHTML = `
                <td style="padding:12px;">
                    <div style="display:flex; align-items:center;">
                        ${imgHtml}
                        <div style="overflow:hidden;">
                            <div style="font-weight:bold; font-size:0.95rem; color:#f8fafc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:250px;">
                                ${item.title || 'Ohne Titel'}
                            </div>
                            <div style="font-size:0.75em; color:#94a3b8; font-family:monospace;">SKU: ${item.sku || '-'}</div>
                        </div>
                    </div>
                </td>
                
                <td style="padding:12px; color:#cbd5e1;">📍 ${item.location || '-'}</td>
                
                <td style="padding:12px;">
                    <span style="font-weight:bold; font-size:1rem; color:white; background:#0f172a; padding:2px 8px; border-radius:4px; border:1px solid #334155;">${qty}</span>
                </td>
                
                <td style="padding:12px; color:#cbd5e1;">
                    <div>${formatEuro.format(priceEK)}</div>
                    <div style="font-size:0.7em; color:#64748b;">(EK)</div>
                </td>
                
                <td style="padding:12px;">
                    <div style="font-weight:bold; color:white;">${formatEuro.format(priceMarket)}</div>
                    ${profitDisplay}
                </td>
                
                <td style="padding:12px;">
                    ${statusBadge}
                    ${linkStatusHtml}
                </td>
                
                <td style="padding:12px; text-align:right; white-space:nowrap;">
                    ${actionButtons}
                    <button onclick="window.openCreateModal('${item.id}')" title="Bearbeiten" style="background:none; border:none; cursor:pointer; font-size:1.1rem; margin-right:5px;">✏️</button>
                    <button onclick="window.openPrintModal('${item.id}')" title="Drucken" style="background:none; border:none; cursor:pointer; font-size:1.1rem; margin-right:5px;">🖨️</button>
                    <button onclick="window.deleteItemWithId('${item.id}')" title="Löschen" style="background:none; border:none; cursor:pointer; font-size:1.1rem; color:#ef4444;">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Statistik
        if(statValue) statValue.innerText = formatEuro.format(totalValue);
    },

    // --- LIVE FILTER ---
    filterStock: () => {
        const input = document.getElementById('inp-search');
        if(!input) return;
        
        const term = input.value.toLowerCase();
        const rows = document.querySelectorAll('#stock-body tr');
        let visibleCount = 0;

        rows.forEach(row => {
            const searchData = row.dataset.search || "";
            if (searchData.includes(term)) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        const statTotal = document.getElementById('stat-total');
        if(statTotal && rows.length > 0) statTotal.innerText = visibleCount;
    },

    // --- PLATZHALTER (Logik ist in Controllern) ---
    renderPriceResults: (results) => { const c = document.getElementById('price-results'); if(c) c.innerHTML=''; },
    renderSuggestions: (results) => {},
    renderCompetitorList: (list) => { 
        const c = document.getElementById('competitor-list'); 
        if(c) c.innerHTML = (!list||list.length===0) ? '<div style="color:#64748b;font-size:0.8rem;">Leer.</div>' : list.map(x=>`<div>${x.name}</div>`).join('');
    }
};

// GLOBALE ALIASE
window.renderStock = window.View.renderStock;
window.renderPriceResults = window.View.renderPriceResults;
window.renderSuggestions = window.View.renderSuggestions;
window.renderCompetitorList = window.View.renderCompetitorList;