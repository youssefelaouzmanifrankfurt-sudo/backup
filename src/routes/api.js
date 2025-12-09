// src/routes/api.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const QRCode = require('qrcode');
const upload = multer({ dest: 'uploads/' });

// Imports
const ocrService = require('../services/ocrService');
const { toggleDebugMode, getStatus } = require('../scrapers/chat/connection');
const logger = require('../utils/logger');
const systemState = require('../utils/state');

// --- API ROUTES ---

// Boot Status abfragen
router.get('/boot-status', (req, res) => res.json(systemState));

// QR Code generieren
router.get('/qr/:text', async (req, res) => {
    try { 
        const url = await QRCode.toDataURL(req.params.text);
        res.json({ url }); 
    } catch (e) { 
        res.status(500).json({ error: 'QR Error' }); 
    }
});

// Browser Steuerung
router.get('/browser/status', (req, res) => {
    res.json(getStatus());
});

router.post('/browser/toggle', async (req, res) => {
    try {
        const { visible } = req.body; 
        const result = await toggleDebugMode(visible);
        logger.log('info', "Browser Modus gewechselt.");
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Bild-Scan (OCR)
router.post('/scan-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Kein Bild' });
        
        // Text erkennen
        const modelName = await ocrService.processImage(req.file.path);

        if(modelName === "Unbekannt" || modelName.length < 2) {
             return res.json({ success: false, error: "Kein Text erkannt. Bitte Bild drehen oder näher ran." });
        }

        res.json({ success: true, model: modelName });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: e.message }); 
    }
});

module.exports = router;