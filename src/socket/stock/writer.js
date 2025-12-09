// src/socket/stock/writer.js
const stockService = require('../../services/stockService');
const inventoryService = require('../../services/inventoryService');
const importService = require('../../services/importService');
const logger = require('../../utils/logger'); // Logger nutzen!

module.exports = (io, socket) => {

    // 1. Erstellen
    socket.on('create-new-stock', (data) => {
        try {
            console.log("📝 Empfange 'create-new-stock':", data.title);
            const sku = data.sku || ("LAGER-" + Math.floor(Math.random() * 10000));
            
            stockService.createNewItem(data.title, { 
                ...data, 
                sku, 
                marketPrice: data.marketPrice || 0,
                lastPriceCheck: new Date().toLocaleDateString()
            });
            
            // Bestätigung an ALLE Clients senden
            io.emit('force-reload-stock');
            
        } catch (e) {
            logger.log('error', 'Fehler beim Erstellen: ' + e.message);
        }
    });

    // 2. Update
    socket.on('update-stock-details', (d) => { 
        try {
            console.log("📝 Empfange 'update-stock-details':", d.id);
            stockService.updateDetails(d.id, d); 
            io.emit('force-reload-stock'); 
        } catch (e) {
            logger.log('error', 'Fehler beim Update: ' + e.message);
        }
    });

    // 3. Löschen
    socket.on('delete-stock-item', (id) => {
        try {
            const item = stockService.getAll().find(i => i.id === id);
            if (item && item.linkedAdId) {
                inventoryService.removeFromStock(item.linkedAdId);
                io.emit('update-db-list', inventoryService.getAll());
            }
            stockService.delete(id);
            io.emit('force-reload-stock');
        } catch (e) {
            logger.log('error', 'Fehler beim Löschen: ' + e.message);
        }
    });

    // Rest der Handler (unverändert aber sicherheitshalber mit try-catch umhüllt)
    socket.on('update-stock-qty', (data) => {
        try {
            const updatedStock = stockService.updateQuantity(data.id, data.delta);
            const item = updatedStock.find(i => i.id === data.id);
            if (item && item.linkedAdId) {
                if (item.quantity <= 0) inventoryService.removeFromStock(item.linkedAdId);
                else inventoryService.markAsInStock(item.linkedAdId);
                io.emit('update-db-list', inventoryService.getAll());
            }
            io.emit('force-reload-stock');
        } catch(e) { console.error(e); }
    });
};