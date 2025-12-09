// src/services/importService.js
const storage = require('../utils/storage');
const ottoScraper = require('../scrapers/ottoScraper');
const amazonScraper = require('../scrapers/amazonScraper');
const baurScraper = require('../scrapers/baurScraper');
const logger = require('../utils/logger');

const PRICE_FACTOR = 2.2; 

function parsePrice(input) {
    if (!input) return 0;
    let clean = String(input).replace(/[^0-9.,]/g, '');
    clean = clean.replace(',', '.');
    return parseFloat(clean) || 0;
}

const SCRAPERS = [
    { id: 'otto', check: (url) => url.includes('otto.de'), scraper: ottoScraper.scrapeOttoDetails },
    { id: 'amazon', check: (url) => url.includes('amazon'), scraper: amazonScraper.scrapeAmazonDetails },
    { id: 'baur', check: (url) => url.includes('baur.de'), scraper: async (url) => ({ price: await baurScraper.scrapeBaurPrice(url) }) }
];

// NEU: Einzelne URL live prüfen
async function scrapeUrlPrice(url) {
    const handler = SCRAPERS.find(s => s.check(url));
    if (handler) {
        try {
            const data = await handler.scraper(url);
            let price = data ? (data.price || 0) : 0;
            return parsePrice(price);
        } catch (e) {
            return 0;
        }
    }
    return 0;
}

async function createImportFromStock(stockItem) {
    if (!stockItem) return null;

    let description = "Automatisch erstellt aus Lagerbestand.";
    let images = stockItem.image ? [stockItem.image] : [];
    let sourceName = "Lagerbestand";

    if (stockItem.sourceUrl) {
        const handler = SCRAPERS.find(s => s.check(stockItem.sourceUrl));
        if (handler) {
            try {
                const details = await handler.scraper(stockItem.sourceUrl);
                if (details) {
                    if (details.description) description = details.description;
                    if (details.images && details.images.length > 0) images = details.images;
                    sourceName += ` (${handler.id})`;
                }
            } catch (e) {}
        }
    }

    const ekPrice = parsePrice(stockItem.purchasePrice);
    const vkPrice = ekPrice > 0 ? (ekPrice * PRICE_FACTOR).toFixed(2) : "VB";

    const newImport = {
        id: "IMP-" + Date.now(),
        title: stockItem.title,
        description: description,
        price: vkPrice,
        purchasePrice: ekPrice,
        images: images,
        source: sourceName,
        url: stockItem.sourceUrl || "",
        scannedAt: new Date().toLocaleDateString(),
        stockId: stockItem.id 
    };

    const importedList = storage.loadExternal();
    importedList.push(newImport);
    storage.saveExternal(importedList);

    return newImport;
}

module.exports = {
    createImportFromStock,
    scrapeUrlPrice // Exportieren für den Socket!
};