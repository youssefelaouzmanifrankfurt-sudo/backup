// public/js/lager/workflow-search.js
console.log("🔍 Workflow SEARCH geladen");

window.WorkflowSearch = {
    process: function(items) {
        // Dieser Workflow kümmert sich um die Darstellung der Ergebnisse im "Terminal"
        
        const container = document.getElementById('price-results'); // Das ist der Bereich unter dem Scanner
        if (!container) return;

        container.style.display = 'block';
        container.innerHTML = ''; // Reset

        if (!items || items.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b;">Nichts gefunden.</div>';
            return;
        }

        console.log(`🔍 Zeige ${items.length} Suchergebnisse im Terminal.`);

        let html = '<div style="display:flex; flex-direction:column; gap:8px;">';

        items.forEach(item => {
            const title = item.title || "Unbekannt";
            
            // Info Zeile bauen (Preis oder Menge)
            let info = "";
            if(item.price) info = `${parseFloat(item.price).toFixed(2)} €`;
            else if(item.qty || item.quantity) info = `${item.qty || item.quantity} Stk.`;
            
            const source = item.source || "Lager";
            const imgUrl = item.image || '/img/placeholder.png'; 
            const id = item.id || item._id;
            
            // Klick auf Karte öffnet Details
            html += `
                <div class="search-result-card" onclick="window.WorkflowSearch.selectItem('${id}')" 
                     style="display:flex; align-items:center; background:#1e293b; padding:10px; border-radius:6px; border:1px solid #334155; cursor:pointer;">
                    
                    <div style="width:40px; height:40px; background:#0f172a; border-radius:4px; margin-right:10px; overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center;">
                        <img src="${imgUrl}" onerror="this.style.display='none'" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    
                    <div style="flex:1; overflow:hidden;">
                        <div style="font-weight:bold; color:white; font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${title}</div>
                        <div style="font-size:0.75rem; color:#94a3b8;">${source} • SKU: ${item.sku||'-'}</div>
                    </div>

                    <div style="font-weight:bold; color:#f59e0b; margin-left:10px;">${info}</div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
        
        if(window.showToast) window.showToast(`${items.length} Treffer gefunden`, 'success');
    },

    selectItem: function(id) {
        // Öffnet das Item im Detail-Modal
        if(window.openCreateModal) window.openCreateModal(id);
    }
};