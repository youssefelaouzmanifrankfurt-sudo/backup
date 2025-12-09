// src/services/stockService.js
const storage = require('../utils/storage');
const logger = require('../utils/logger');
const { findBestMatch } = require('../utils/similarity');

class StockService {
    constructor() { 
        console.log("[SERVICE] StockService gestartet."); 
        this.cache = null; 
    }
    
    _load(forceReload = false) { 
        if (!this.cache || forceReload) {
            this.cache = storage.loadStock() || [];
        }
        return this.cache; 
    }

    _save(data) { 
        this.cache = data; 
        storage.saveStock(data); 
    }

    getAll() { return this._load(); }

    saveAll(data) {
        this._save(data);
    }

    findInStock(name) {
        let stock = this._load();
        if(!name) return null;
        
        const skuMatch = stock.find(i => i.sku && i.sku.toLowerCase() === name.toLowerCase());
        if (skuMatch) return skuMatch;

        const matchResult = findBestMatch(name, stock);
        if (matchResult.item && matchResult.score > 0.80) {
            return matchResult.item;
        }
        return null;
    }

    checkScanMatch(name) { return this.findInStock(name); }

    // NEU: Diese Methode hat gefehlt und ist für +/- Buttons nötig
    updateQuantity(id, delta) {
        let stock = this._load();
        const item = stock.find(i => i.id === id);
        if (item) {
            // Flexible Erkennung der alten Menge
            let currentQty = parseInt(item.quantity);
            if (isNaN(currentQty)) currentQty = parseInt(item.qty) || 0;

            let newQty = currentQty + parseInt(delta);
            item.quantity = newQty < 0 ? 0 : newQty;
            
            // Aufräumen: Wir nutzen nur noch 'quantity'
            if(item.qty !== undefined) delete item.qty; 

            this._save(stock);
        }
        return stock;
    }

    incrementQuantity(id) {
        return this.updateQuantity(id, 1);
    }

    createNewItem(name, details = {}) {
        let stock = this._load();
        
        const newItem = {
            id: "STOCK-" + Date.now(),
            title: name,
            // FIX: Frontend sendet 'qty', Backend speichert 'quantity'
            quantity: parseInt(details.qty) || parseInt(details.quantity) || 1,
            location: details.location || "Lager",
            // FIX: Frontend sendet 'price' (EK), Backend speichert 'price' (für View konsistent)
            price: parseFloat(details.price) || parseFloat(details.purchasePrice) || 0, 
            marketPrice: parseFloat(details.marketPrice) || 0,
            sku: details.sku || ("SKU-" + Date.now()),
            sourceUrl: details.sourceUrl || "",
            sourceName: details.sourceName || "",
            image: details.image || null,
            competitors: details.competitors || [],
            linkedAdId: details.linkedAdId || null,
            scannedAt: new Date().toLocaleString(),
            lastPriceCheck: details.lastPriceCheck || null
        };
        
        stock.push(newItem);
        this._save(stock);
        logger.log('info', `Neu im Lager: ${name}`);
        return stock;
    }

    updateDetails(id, data) {
        const stock = this._load();
        const item = stock.find(i => i.id === id);
        if (item) {
            if (data.title) item.title = data.title;
            if (data.location) item.location = data.location;
            
            // FIX: Mengen-Update (Frontend 'qty' -> Backend 'quantity')
            if (data.qty !== undefined) item.quantity = parseInt(data.qty);
            else if (data.quantity !== undefined) item.quantity = parseInt(data.quantity);

            // FIX: Preis-Update (Frontend 'price' -> Backend 'price')
            if (data.price !== undefined) item.price = parseFloat(data.price);
            
            if (data.marketPrice !== undefined) item.marketPrice = parseFloat(data.marketPrice);
            if (data.sku) item.sku = data.sku;
            if (data.sourceUrl) item.sourceUrl = data.sourceUrl;
            if (data.sourceName) item.sourceName = data.sourceName;
            if (data.image) item.image = data.image;
            if (data.competitors) item.competitors = data.competitors;
            if (data.linkedAdId !== undefined) item.linkedAdId = data.linkedAdId;
            
            // Aufräumen alter Felder
            if(item.qty !== undefined) delete item.qty;

            this._save(stock);
        }
        return stock;
    }

    delete(id) {
        let stock = this._load();
        const initialLength = stock.length;
        const newStock = stock.filter(i => i.id !== id);
        
        if (newStock.length !== initialLength) {
            this._save(newStock);
            return true;
        }
        return false;
    }
}

module.exports = new StockService();