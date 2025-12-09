// src/socket/external/search.js
const logger = require('../../utils/logger');
const smartSearchService = require('../../services/smartSearchService');

/**
 * Handle external search requests safely.
 * Prevents server crashes by wrapping logic in try/catch.
 */
module.exports = (socket) => {
    socket.on('search-external', async (data) => {
        try {
            // 1. INPUT VALIDIERUNG
            if (!data || !data.query) {
                socket.emit('scan-error', 'Kein Suchbegriff empfangen.');
                return;
            }

            const query = (data.query || "").trim();
            const source = data.source || 'All';
            const reqId = Date.now().toString().slice(-4); // Short ID for logs

            logger.log('info', `🔍 [${reqId}] SOCKET Search: "${query}" (Source: ${source})`);

            // 2. SUCHE AUSFÜHREN (Mit Timeout-Schutz)
            let results = [];
            
            // Wir prüfen, ob der Service existiert, um "Undefined"-Crashes zu vermeiden
            if (smartSearchService && typeof smartSearchService.search === 'function') {
                try {
                    // Suche starten
                    results = await smartSearchService.search(query, source);
                } catch (serviceErr) {
                    logger.log('error', `❌ [${reqId}] Service Error: ${serviceErr.message}`);
                    // Wir werfen den Fehler nicht weiter, sondern geben leere Ergebnisse zurück
                    // damit der User wenigstens Feedback bekommt.
                    socket.emit('scan-error', `Fehler bei der Suche: ${serviceErr.message}`);
                    socket.emit('price-search-results', []); 
                    return;
                }
            } else {
                logger.log('error', `❌ [${reqId}] SmartSearchService.search ist keine Funktion!`);
                socket.emit('scan-error', 'Interner Server-Fehler: Suchdienst nicht verfügbar.');
                return;
            }

            // 3. ERGEBNISSE SENDEN
            if (!Array.isArray(results)) results = [];
            
            logger.log('info', `✅ [${reqId}] Sende ${results.length} Ergebnisse an Client.`);
            socket.emit('price-search-results', results);

        } catch (fatalErr) {
            // 4. FATAL ERROR HANDLER (Verhindert Server-Absturz!)
            console.error("🔥 CRITICAL SERVER CRASH PREVENTED:", fatalErr);
            if (logger && logger.log) {
                logger.log('error', `🔥 FATAL SOCKET ERROR: ${fatalErr.message}`);
            }
            
            // Dem Client sagen, dass was schief lief, damit der Spinner aufhört
            socket.emit('scan-error', 'Kritischer Fehler bei der Verarbeitung.');
            socket.emit('price-search-results', []);
        }
    });
};