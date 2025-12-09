// src/services/priceService.js
const idealoScraper = require('../scrapers/idealoScraper');
const ottoScraper = require('../scrapers/ottoScraper');
const amazonScraper = require('../scrapers/amazonScraper');
const baurScraper = require('../scrapers/baurScraper'); // Wieder da!
const { findBestMatch } = require('../utils/similarity');

// Konfiguration
const MAX_RESULTS_TOTAL = 60; 

async function searchMarketPrices(query) {
    if (!query) return [];

    // Parallel suchen (Alle Quellen)
    const [idealo, otto, amazon, baur] = await Promise.all([
        idealoScraper.searchIdealo(query).catch(e => []),
        ottoScraper.searchOtto(query).catch(e => []),
        amazonScraper.searchAmazon(query).catch(e => []),
        baurScraper.searchBaur(query).catch(e => [])
    ]);

    // Ergebnisse normalisieren
    let allResults = [
        ...idealo.map(i => ({ ...i, source: 'Idealo' })),
        ...otto.map(i => ({ ...i, source: 'Otto' })),
        ...amazon.map(i => ({ ...i, source: 'Amazon' })),
        ...baur.map(i => ({ ...i, source: 'Baur' }))
    ];

    // Daten bereinigen
    allResults = allResults.map(item => {
        // Preis zu Zahl
        let price = item.price;
        if (typeof price === 'string') {
            price = parseFloat(price.replace(/[^0-9,]/g, '').replace(',', '.'));
        }
        
        // Bild zu 'image' normalisieren
        let image = item.image || item.img || '';
        
        return { 
            title: item.title,
            price: price || 0,
            image: image, // Einheitlicher Name!
            url: item.url,
            source: item.source
        };
    });

    // Filtern: Nur Ergebnisse mit Bild und Preis
    allResults = allResults.filter(i => i.price > 0 && i.image.length > 5);

    // Sortierung: Relevanz (Score) > Preis
    const scoredResults = allResults.map(item => {
        const match = findBestMatch(query, [item]); 
        return { ...item, score: match.score };
    });

    scoredResults.sort((a, b) => {
        // Zuerst nach Score (wenn Unterschied groß ist)
        if (Math.abs(a.score - b.score) > 0.15) return b.score - a.score;
        // Sonst nach Preis (günstiger zuerst)
        return a.price - b.price; 
    });

    return scoredResults.slice(0, MAX_RESULTS_TOTAL);
}

module.exports = { searchMarketPrices };