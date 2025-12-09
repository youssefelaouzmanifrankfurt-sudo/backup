// src/services/matchService.js
const inventoryService = require('./inventoryService');

// Helper: Text reinigen (Kleinbuchstaben, Sonderzeichen weg)
function cleanText(str) {
    if (!str) return "";
    return str.toString().toLowerCase().replace(/[^a-z0-9äöüß ]/g, '');
}

// Helper: Score berechnen
function calculateScore(searchQuery, targetTitle) {
    const s1 = cleanText(searchQuery);
    const s2 = cleanText(targetTitle);

    if (!s1 || !s2) return 0;

    // 1. Exakter Treffer (Teilstring)
    if (s2.includes(s1)) return 1.0;

    // 2. Wort-Treffer (Token Matching)
    const words1 = s1.split(' ').filter(w => w.length > 1);
    const words2 = s2.split(' ');
    
    let matches = 0;
    words1.forEach(w1 => {
        if (words2.some(w2 => w2.includes(w1))) matches++;
    });

    if (words1.length === 0) return 0;
    return matches / words1.length; // Prozentuale Übereinstimmung der Wörter
}

// Helper: Bestes Bild finden
function getBestImage(adItem) {
    if (!adItem) return null;
    if (Array.isArray(adItem.images) && adItem.images.length > 0) return adItem.images[0];
    if (adItem.img && adItem.img.length > 5) return adItem.img;
    if (adItem.image && adItem.image.length > 5) return adItem.image;
    return null; 
}

function findMatchesForStockItem(stockItemTitle) {
    if (!stockItemTitle) return [];

    const inventory = inventoryService.getAll();

    const candidates = inventory.map(ad => {
        // --- FIX: ID Detection ---
        // Wir prüfen auf .id UND ._id, falls die DB unterschiedliche Formate nutzt
        const validId = ad.id || ad._id;
        
        // Wenn gar keine ID da ist, ist der Eintrag nutzlos -> null zurückgeben
        if(!validId) return null;

        const score = calculateScore(stockItemTitle, ad.title);
        
        return {
            id: validId,  // Hier steht jetzt garantiert eine ID
            title: ad.title,
            price: ad.price,
            image: getBestImage(ad),
            status: ad.status,
            score: score
        };
    })
    // Null-Werte (Einträge ohne ID) rausfiltern
    .filter(item => item !== null);

    // Filtern & Sortieren
    return candidates
        .filter(c => c.score > 0.1) 
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); // Zeige maximal 10 Ergebnisse
}

module.exports = {
    findMatchesForStockItem
};