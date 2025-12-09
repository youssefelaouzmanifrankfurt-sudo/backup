// src/services/inventory/store.js
const storage = require('../../utils/storage');

// Lädt DB und filtert kaputte Einträge raus
const getAll = () => {
    const raw = storage.loadDB();
    if (!Array.isArray(raw)) return [];
    
    // Filter: Nur Items behalten, die nicht null sind UND eine ID haben
    const clean = raw.filter(item => item && item.id);
    
    // Falls wir Müll gefunden haben, speichern wir die saubere Version direkt zurück
    if (clean.length !== raw.length) {
        console.log(`[STORE] Datenbank bereinigt: ${raw.length - clean.length} defekte Einträge entfernt.`);
        saveAll(clean);
    }
    
    return clean;
};

const saveAll = (items) => storage.saveDB(items);

const deleteItem = (id) => {
    let db = getAll();
    const initialLength = db.length;
    db = db.filter(i => i.id !== id);
    
    if (db.length !== initialLength) {
        saveAll(db);
        return db;
    }
    return db; // Nichts passiert
};

const replaceAll = (items) => { 
    saveAll(items); 
    return items; 
};

module.exports = { getAll, saveAll, deleteItem, replaceAll };