// src/services/chat/sender.js
const chatController = require('../../scrapers/chatController');
const logger = require('../../utils/logger');

// Funktion zum Senden einer Nachricht
async function sendMessage(chatId, text) {
    try {
        // 1. Controller aufrufen (steuert den Browser/Scraper)
        const result = await chatController.sendMessage(chatId, text);
        
        // 2. Ergebnis zurückgeben (erwartet { chatId, messages, success })
        return result;
    } catch (e) {
        logger.log('error', 'Fehler beim Senden der Nachricht: ' + e.message);
        return null;
    }
}

module.exports = { sendMessage };