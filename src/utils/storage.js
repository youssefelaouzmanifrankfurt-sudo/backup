// src/utils/storage.js
const fs = require('fs');
const path = require('path');

// Wir nutzen den Port zur Identifikation (definiert in den .bat Dateien)
// Port 3000 = IMMER Master (C: Laufwerk)
// Andere Ports = IMMER Client (Z: Laufwerk)
const PORT = process.env.PORT || 3000;
const IS_MASTER = (String(PORT) === '3000');

// Konfiguration der Pfade
const SERVER_DATA_DIR = 'C:\\weeeeeee_data';
const CLIENT_DATA_DIR = 'Z:\\'; 

// Wähle den korrekten Pfad basierend auf der Rolle
const ACTIVE_PATH = IS_MASTER ? SERVER_DATA_DIR : CLIENT_DATA_DIR;

const MODE = IS_MASTER ? "SERVER (Master)" : "CLIENT (Worker)";

console.log("------------------------------------------------");
console.log(`[STORAGE] Modus:       ${MODE}`);
console.log(`[STORAGE] Speicherort: ${ACTIVE_PATH}`);
console.log("------------------------------------------------");

// Dateinamen
const DB_PATH = path.join(ACTIVE_PATH, 'inventory.json');
const HISTORY_PATH = path.join(ACTIVE_PATH, 'history.json');
const STOCK_PATH = path.join(ACTIVE_PATH, 'stock.json');
const TASKS_PATH = path.join(ACTIVE_PATH, 'tasks.json');
const SETTINGS_PATH = path.join(ACTIVE_PATH, 'settings.json');
const IMPORTS_PATH = path.join(ACTIVE_PATH, 'imported.json');

// Helper: Initiale Datei erstellen (Nur Master darf schreiben wenn sie fehlt!)
function ensureFile(filePath, defaultData = []) {
    // Wenn wir Master sind, erstellen wir den Ordner falls er fehlt
    if (IS_MASTER && !fs.existsSync(ACTIVE_PATH)) {
        try { fs.mkdirSync(ACTIVE_PATH, { recursive: true }); } catch(e) {}
    }

    if (!fs.existsSync(filePath)) {
        if (IS_MASTER) {
            // Master erstellt die leere Datei
            try {
                fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
            } catch (e) {
                console.error("[STORAGE] Fehler beim Erstellen von " + filePath, e.message);
            }
        } else {
            // Client wartet (darf nicht erstellen, um Konflikte zu vermeiden)
            console.warn(`[STORAGE] Warte auf Master-DB: ${filePath} nicht gefunden.`);
            return defaultData; 
        }
    }
    
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return data ? JSON.parse(data) : defaultData;
    } catch (e) {
        console.error("[STORAGE] Lesefehler: " + filePath, e.message);
        return defaultData;
    }
}

function saveFile(filePath, data) {
    try {
        // Backup Logic (nur Master macht Backups, ca. bei jedem 20. Speichern)
        if (IS_MASTER && Math.random() > 0.95) {
            fs.copyFileSync(filePath, filePath + '.bak');
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error("[STORAGE] Schreibfehler: " + filePath, e.message);
        return false;
    }
}

// --- PUBLIC API ---

module.exports = {
    getDbPath: () => DB_PATH,
    getDataDir: () => ACTIVE_PATH,

    // Datenbanken laden
    loadDB: () => ensureFile(DB_PATH),
    saveDB: (data) => saveFile(DB_PATH, data),

    loadHistory: () => ensureFile(HISTORY_PATH),
    saveHistory: (data) => saveFile(HISTORY_PATH, data),

    loadStock: () => ensureFile(STOCK_PATH),
    saveStock: (data) => saveFile(STOCK_PATH, data),

    loadTasks: () => ensureFile(TASKS_PATH),
    saveTasks: (data) => saveFile(TASKS_PATH, data),

    loadSettings: () => ensureFile(SETTINGS_PATH, {}),
    saveSettings: (data) => saveFile(SETTINGS_PATH, data),
    
    loadExternal: () => ensureFile(IMPORTS_PATH),
    saveExternal: (data) => saveFile(IMPORTS_PATH, data)
};