// public/js/scraper.js
const socket = io();
let currentPage = 1;
let currentQuery = "";
let currentSource = "Otto"; // Standard

// HELPER: Ist es eine URL?
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// 1. SUCHE ODER DIREKT-LINK AUSFÜHREN
function searchProduct() {
    const inputField = document.getElementById('search-input');
    const query = inputField.value.trim();
    const source = document.getElementById('source-select').value;
    
    if(!query) return;

    // --- NEU: DIREKT-LINK ERKENNUNG ---
    if (isValidUrl(query)) {
        console.log("🔗 Direkt-Link erkannt:", query);
        
        // UI Feedback
        document.getElementById('results-grid').innerHTML = '';
        inputField.value = ''; // Feld leeren
        inputField.placeholder = "Link wird analysiert...";
        
        // Direkt die Analyse starten (bypassed die Suche)
        selectProduct(query);
        return;
    }
    // ----------------------------------
    
    currentQuery = query;
    currentSource = source;
    currentPage = 1; 
    
    document.getElementById('results-grid').innerHTML = '';
    document.getElementById('loader').classList.add('active');
    document.getElementById('btn-load-more').style.display = 'none';
    
    // Anfrage an Server
    socket.emit('search-external', { query, source });
}

document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchProduct();
});

// 2. ERGEBNISSE EMPFANGEN
socket.on('external-search-results', (data) => {
    document.getElementById('loader').classList.remove('active');
    renderResults(data.results);
    
    // Load More Button anzeigen wenn viele Ergebnisse (nur bei Einzelsuche)
    if (data.results.length >= 15 && currentSource !== 'All') {
        document.getElementById('btn-load-more').style.display = 'block';
    }
});

// 3. MEHR LADEN (Pagination)
socket.on('external-search-more-results', (data) => {
    currentPage = data.page;
    document.getElementById('btn-load-more').innerText = "⬇ Mehr laden";
    renderResults(data.results); 
    
    if (data.results.length < 1) {
        document.getElementById('btn-load-more').style.display = 'none';
    }
});

function loadMore() {
    const btn = document.getElementById('btn-load-more');
    btn.innerText = "Lade...";
    socket.emit('search-more-external', { query: currentQuery, page: currentPage, source: currentSource });
}

// 4. RENDER HELPER (Mit Match-Badge)
function renderResults(items) {
    const grid = document.getElementById('results-grid');
    if(items.length === 0 && currentPage === 1) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#444;">Keine Ergebnisse gefunden.</div>';
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.position = 'relative'; 
        
        let imgUrl = item.img || item.image || 'https://via.placeholder.com/200?text=No+Img';

        // Match-Badge Logik
        let scoreBadge = '';
        if (item.score && item.score > 0) {
            const scorePct = Math.round(item.score * 100);
            const color = scorePct > 80 ? '#10b981' : (scorePct > 50 ? '#f59e0b' : '#666');
            
            scoreBadge = `
                <div style="position:absolute; top:10px; right:10px; background:${color}; color:black; 
                            padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:bold; 
                            z-index:10; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
                    ${scorePct}% Match
                </div>
            `;
        }

        card.innerHTML = `
            ${scoreBadge}
            <div class="p-img-wrap">
                <img src="${imgUrl}" class="p-img" onerror="this.src='https://via.placeholder.com/200?text=Error'">
            </div>
            <div class="p-body">
                <div class="p-source" style="color:${getSourceColor(item.source)}">${item.source}</div>
                <div class="p-title" title="${item.title}">${item.title}</div>
                <div class="p-price">${item.price}</div>
                <button class="btn-compare" onclick="selectProduct('${item.link}')">🔍 Vergleichen</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function getSourceColor(source) {
    if(source === 'Idealo') return '#f59e0b';
    if(source === 'Amazon') return '#ffffff';
    if(source === 'Otto') return '#ef4444';
    if(source === 'Baur') return '#3b82f6';
    if(source === 'Expert') return '#0ea5e9';
    return '#888';
}

// --- MODAL LOGIK (Vergleich) ---
let currentExternalProduct = null;

function selectProduct(url) {
    document.getElementById('compare-modal').classList.add('open');
    // Zeige Lade-Animation im Modal
    document.getElementById('modal-content').innerHTML = `
        <div style="text-align:center; padding:40px;">
            <div class="loader active" style="margin:0 auto 20px auto;"></div>
            <div style="color:#888;">Analysiere Produktseite...</div>
            <div style="font-size:0.8rem; color:#444; margin-top:5px; word-break:break-all;">${url}</div>
        </div>
    `;
    document.getElementById('btn-save').style.display = 'none';
    
    // Event senden
    socket.emit('select-external-product', url);
}

socket.on('comparison-result', (data) => {
    currentExternalProduct = data.external;
    const local = data.localMatch;
    const score = data.score;
    // Score auf ganze Zahl runden für Anzeige
    const scoreVal = Math.round(score * 100);
    let scoreColor = scoreVal > 80 ? '#10b981' : (scoreVal > 50 ? '#f59e0b' : '#ef4444');

    let techHtml = "";
    if(data.external.techData) {
        let content = Array.isArray(data.external.techData) ? data.external.techData.join('<br>') : data.external.techData;
        techHtml = `<div style="margin-top:10px; font-size:0.8rem; color:#888; max-height:100px; overflow:auto;">${content}</div>`;
    }
    
    let mainImg = (data.external.images && data.external.images.length) ? data.external.images[0] : '';

    const html = `
        <div class="c-col">
            <div style="color:#888; font-weight:bold;">EXTERN (${data.external.source})</div>
            <img src="${mainImg}" class="c-img">
            <div class="c-title">${data.external.title}</div>
            
            <label style="font-size:0.8rem; color:#666;">Verkaufspreis festlegen:</label>
            <input type="text" id="custom-price-input" value="${data.external.price}" 
                   style="width:100%; padding:8px; font-weight:bold; font-size:1.1rem; border:2px solid #ddd; border-radius:6px; margin-bottom:10px;">
            
            ${techHtml}
        </div>

        <div class="score-circle" style="border-color:${scoreColor}">
            <div class="score-val" style="color:${scoreColor}">${scoreVal}%</div>
            <div class="score-label">Match</div>
        </div>

        <div class="c-col">
            <div style="color:#888; font-weight:bold;">DEINE DB</div>
            ${local ? `
                <img src="${local.images ? local.images[0] : ''}" class="c-img">
                <div class="c-title">${local.title}</div>
                <div class="c-price">${local.price}</div>
            ` : '<div style="padding:20px; border:2px dashed #333; color:#666;">Kein Match in DB</div>'}
        </div>
    `;
    
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('btn-save').style.display = 'block';
});

function closeModal() { document.getElementById('compare-modal').classList.remove('open'); }

function saveProduct() {
    if(currentExternalProduct) {
        const newPrice = document.getElementById('custom-price-input').value;
        if (newPrice) {
            currentExternalProduct.price = newPrice;
        }
        socket.emit('save-external-product', currentExternalProduct);
    }
}

socket.on('import-success', () => { closeModal(); alert("✅ Produkt importiert!"); });
socket.on('scrape-error', (msg) => { closeModal(); alert("❌ Fehler: " + msg); });
socket.on('error', (msg) => { closeModal(); alert("❌ Fehler: " + msg); }); // Fallback

// Auto Start (Deep Link via URL Parameter)
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    if (query) {
        document.getElementById('search-input').value = query;
        setTimeout(() => searchProduct(), 500);
        window.history.replaceState({}, document.title, "/scraper");
    }
});