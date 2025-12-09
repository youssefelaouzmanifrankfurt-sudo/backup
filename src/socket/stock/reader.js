// src/socket/stock/reader.js
const stockService = require('../../services/stockService');
const inventoryService = require('../../services/inventoryService');
const matchService = require('../../services/matchService');
const importService = require('../../services/importService');
const priceService = require('../../services/priceService'); 
const { getBestImage } = require('./helpers');

module.exports = (io, socket) => {
    
    // 1. LAGERBESTAND LADEN
    socket.on('get-stock', () => {
        try {
            const stock = stockService.getAll();
            
            if (!stock || stock.length === 0) {
                console.log("📦 [SERVER] Stock ist leer (stock.json).");
            }

            const inventory = inventoryService.getAll();
            
            // Map für schnelleren Zugriff auf Inventar
            const inventoryMap = new Map(inventory.map(ad => {
                const validId = ad.id || ad._id;
                return [validId, ad];
            }));

            const enrichedStock = stock.map(item => {
                let adStatus = 'OFFLINE';
                let displayImage = item.image;
                let linkedAd = null;

                if (item.linkedAdId && inventoryMap.has(item.linkedAdId)) {
                    linkedAd = inventoryMap.get(item.linkedAdId);
                } else if (item.title && !item.linkedAdId) {
                    linkedAd = inventory.find(ad => ad.title && ad.title.toLowerCase() === item.title.toLowerCase());
                }

                if (linkedAd) {
                    adStatus = linkedAd.status || 'ACTIVE';
                    if (!displayImage) displayImage = getBestImage(linkedAd);
                }

                let trafficStatus = 'grey'; 
                const qty = parseInt(item.quantity) || parseInt(item.qty) || 0;
                const isOnline = (item.linkedAdId || linkedAd);

                if (qty > 0 && isOnline) trafficStatus = 'green';
                else if (qty > 0 && !isOnline) trafficStatus = 'yellow';
                else if (qty <= 0 && isOnline) trafficStatus = 'red';

                return { 
                    ...item, 
                    onlineStatus: adStatus, 
                    isLinked: !!item.linkedAdId,
                    image: displayImage, 
                    trafficStatus 
                };
            });
            
            socket.emit('update-stock', enrichedStock);
        } catch (e) {
            console.error("❌ Fehler bei get-stock:", e);
            socket.emit('update-stock', []);
        }
    });

    // 2. PREIS SUCHE (Extern) - FIX
    socket.on('search-external', async (data) => {
        const { query, source } = data;
        console.log(`🔎 [SERVER] Suche Preis für "${query}"...`);
        
        try {
            // FIX: Prüfen auf die korrekte Methode 'searchMarketPrices'
            if(priceService && priceService.searchMarketPrices) {
                // Wir übergeben nur 'query', da searchMarketPrices alle Quellen parallel durchsucht
                const results = await priceService.searchMarketPrices(query);
                console.log(`✅ ${results.length} Ergebnisse gefunden.`);
                socket.emit('price-search-results', results);
            } else {
                console.warn("⚠️ PriceService Export falsch benannt oder nicht geladen.");
                socket.emit('price-search-results', []);
            }
        } catch (e) {
            console.error("❌ Fehler bei Preissuche:", e);
            socket.emit('price-search-results', []);
        }
    });

    // 3. Live Preis-Check für Watchlist
    socket.on('check-competitor-price', async (data) => {
        try {
            const price = await importService.scrapeUrlPrice(data.url);
            socket.emit('competitor-price-result', { 
                index: data.index, 
                price: price, 
                url: data.url 
            });
        } catch(e) {
            console.error("⚠️ Fehler bei Competitor Check:", e.message);
            socket.emit('competitor-price-result', { 
                index: data.index, 
                price: 0, 
                url: data.url,
                error: true
            });
        }
    });

    // 4. Manueller DB-Match Request
    socket.on('request-db-match', (stockId) => {
        const items = stockService.getAll();
        const item = items ? items.find(i => i.id === stockId) : null;
        if (!item) return;
        
        const candidates = matchService.findMatchesForStockItem(item.title);
        socket.emit('db-match-result', { found: true, stockId, candidates });
    });
};