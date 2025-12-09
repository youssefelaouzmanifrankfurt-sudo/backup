// src/socket/stock/index.js
const registerReaders = require('./reader');
const registerWriters = require('./writer');

// Services
const matchService = require('../../services/matchService');
const inventoryService = require('../../services/inventoryService'); 
const stockService = require('../../services/stockService');

// Optional: Versuche Actions zu laden für "markAsInStock"
let inventoryActions = null;
try {
    inventoryActions = require('../../services/inventory/actions');
} catch (e) {
    console.warn("⚠️ Inventory Actions nicht gefunden, automatisches 'In Stock' setzen deaktiviert.");
}

module.exports = (io, socket) => {
    // 1. Standard Reader/Writer laden
    registerReaders(io, socket);
    registerWriters(io, socket);

    // --- 2. SUCHE NACH PARTNER-ANZEIGE ---
    socket.on('search-db-for-link', (query) => {
        try {
            console.log(`🔍 [Match] Suche DB-Match für: "${query}"`);
            const results = matchService.findMatchesForStockItem(query);
            socket.emit('db-match-search-results', results);
        } catch (error) {
            console.error("❌ Fehler bei Suche:", error);
            socket.emit('db-match-search-results', []);
        }
    });

    // --- 3. VERBINDEN BESTÄTIGEN ---
    socket.on('confirm-link', async (data) => {
        try {
            const { stockId, adId } = data;

            // VALIDATION FIX: Verhindere "undefined" Verknüpfungen
            if (!adId || adId === 'undefined' || adId === 'null') {
                console.error("❌ Fehler: Versuch ungültige Ad-ID zu verknüpfen:", adId);
                return;
            }

            const stockItems = stockService.getAll();
            const item = stockItems.find(i => i.id === stockId);
            
            if (item) {
                // Alte Verknüpfung bereinigen
                if(item.adId) delete item.adId;
                
                // Neue setzen
                item.linkedAdId = adId; 
                stockService.saveAll(stockItems);

                // OPTIONAL: Auch in der Datenbank als "Auf Lager" markieren
                if (inventoryActions && inventoryActions.markAsInStock) {
                    inventoryActions.markAsInStock(adId, item.location || 'Lager');
                    console.log(`📦 DB-Status für ${adId} auf 'In Stock' gesetzt.`);
                }

                console.log(`🔗 Verbunden: Lager "${item.title}" <-> Ad "${adId}"`);
                io.emit('force-reload-stock'); 
                
                // Trigger Update für Clients die Datenbank offen haben
                if(inventoryService.getAll) {
                    io.emit('update-db-list', inventoryService.getAll());
                }
            }
        } catch (e) {
            console.error("❌ Fehler confirm-link:", e);
        }
    });

    // --- 4. VERBINDUNG TRENNEN ---
    socket.on('unlink-stock-item', async (id) => {
        try {
            const stockItems = stockService.getAll();
            const item = stockItems.find(i => i.id === id);
            
            if (item) {
                const oldAdId = item.linkedAdId || item.adId;

                delete item.linkedAdId;
                delete item.adId;
                stockService.saveAll(stockItems);

                // OPTIONAL: Status in DB zurücksetzen
                if (oldAdId && inventoryActions && inventoryActions.removeFromStock) {
                    inventoryActions.removeFromStock(oldAdId);
                    console.log(`📦 DB-Status für ${oldAdId} auf 'Out of Stock' gesetzt.`);
                }

                console.log(`⛓️‍💥 Verbindung getrennt: ${item.title}`);
                io.emit('force-reload-stock');
                
                if(inventoryService.getAll) {
                    io.emit('update-db-list', inventoryService.getAll());
                }
            }
        } catch (e) {
            console.error("❌ Fehler unlink:", e);
        }
    });

    // --- 5. NEU INSERIEREN ---
    socket.on('create-ad-from-stock', async (stockId) => {
        try {
            console.log(`🆕 Erstelle Anzeige aus Lager-ID: ${stockId}`);
            
            const stockItems = stockService.getAll();
            const sourceItem = stockItems.find(i => i.id === stockId);
            
            if(!sourceItem) return;

            const newAdId = "AD-" + Date.now(); 
            const newAd = {
                id: newAdId,
                title: sourceItem.title,
                description: "Automatisch erstellt aus Lagerbestand.\n\nZustand: Geprüft & Auf Lager.",
                price: sourceItem.marketPrice || sourceItem.price || 0,
                quantity: sourceItem.quantity || sourceItem.qty || 1,
                images: sourceItem.image ? [sourceItem.image] : [],
                status: "ACTIVE",
                platform: "Ebay Kleinanzeigen",
                date: new Date().toISOString(),
                inStock: true, // Direkt als Lagerware markieren
                stockLocation: sourceItem.location || ''
            };

            // Sicherstellen dass wir die Methode zum Hinzufügen haben
            if (inventoryService.add) {
                inventoryService.add(newAd);
            } else {
                // Fallback falls inventoryService nur ein Array-Wrapper ist
                const inv = inventoryService.getAll();
                if(Array.isArray(inv)) {
                    inv.push(newAd);
                    if(inventoryService.saveAll) inventoryService.saveAll(inv);
                }
            }
            
            sourceItem.linkedAdId = newAdId;
            stockService.saveAll(stockItems);

            console.log("✅ Anzeige erstellt & verknüpft:", newAdId);
            io.emit('force-reload-stock');
            
            if(inventoryService.getAll) {
                io.emit('update-db-list', inventoryService.getAll());
            }

        } catch (e) {
            console.error("❌ Fehler bei create-ad-from-stock:", e);
        }
    });
};