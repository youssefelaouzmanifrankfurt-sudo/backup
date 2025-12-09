// src/scrapers/baurScraper.js
const { getBrowser } = require('./chat/connection');
const logger = require('../utils/logger');

/**
 * Hilfsfunktion: Versucht Cookie-Banner zu klicken
 */
async function handleCookies(page) {
    try {
        const clicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a.btn, [role="button"], #onetrust-accept-btn-handler'));
            const acceptBtn = buttons.find(b => 
                /akzeptieren|zustimmen|verstanden|alle auswählen|ok/i.test(b.innerText) && b.offsetParent !== null
            );
            if (acceptBtn) {
                acceptBtn.click();
                return true;
            }
            return false;
        });
        if (clicked) await new Promise(r => setTimeout(r, 1000));
    } catch (e) {}
}

async function searchBaur(query) {
    const browser = await getBrowser();
    if (!browser) return [];
    
    let page = null;
    try {
        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        const searchUrl = `https://www.baur.de/s/${encodeURIComponent(query)}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await handleCookies(page);

        const results = await page.evaluate(() => {
            const data = [];
            
            // Helper: Universelle Preis-Formatierung (für JSON Zahlen UND HTML Text)
            const formatPrice = (input) => {
                if (!input) return "0,00 €";
                let str = input.toString().trim();

                // Fall 1: Reine Zahl (z.B. 1399.99 aus JSON) -> Konvertiere zu DE Format
                if (/^\d+(\.\d+)?$/.test(str)) {
                    str = parseFloat(str).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }

                // Fall 2: Wenn Währung fehlt, anhängen
                if (!str.includes('€') && !str.includes('EUR')) {
                    str += ' €';
                }
                return str;
            };

            // STRATEGIE 1: JSON-LD (Daten im Hintergrund - am zuverlässigsten)
            try {
                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                scripts.forEach(script => {
                    try {
                        const json = JSON.parse(script.innerText);
                        if (json['@type'] === 'ItemList' && Array.isArray(json.itemListElement)) {
                            json.itemListElement.forEach(item => {
                                const product = item.item || item;
                                if (product && (product.name || product.url)) {
                                    let price = '0';
                                    if (product.offers) {
                                        price = product.offers.price || product.offers.lowPrice || '0';
                                    }
                                    data.push({
                                        title: product.name,
                                        price: formatPrice(price),
                                        img: product.image || '',
                                        url: product.url,
                                        source: 'Baur'
                                    });
                                }
                            });
                        }
                    } catch(e) {}
                });
            } catch(e) {}

            // Wenn wir hier schon Daten haben, fertig!
            if (data.length > 0) return data;

            // STRATEGIE 2: HTML Selektoren (Fallback)
            const items = document.querySelectorAll('article, .product-tile, [data-test="product-tile"]');
            items.forEach(item => {
                const titleEl = item.querySelector('.product-tile__name, h3, .product-name');
                // Deine HTML Codes zeigten .price-value
                const priceEl = item.querySelector('.price-value, .product-price__regular, .product-price__reduced');
                const imgEl = item.querySelector('img');
                const linkEl = item.querySelector('a');
                
                if (titleEl && priceEl && linkEl) {
                    // Hier steht oft "1.399,00 €" -> formatPrice lässt es so
                    let price = formatPrice(priceEl.innerText.trim());
                    let imgSrc = imgEl ? (imgEl.dataset.src || imgEl.src) : '';
                    data.push({
                        title: titleEl.innerText.trim(),
                        price: price,
                        img: imgSrc,
                        url: linkEl.href,
                        source: 'Baur'
                    });
                }
            });
            return data;
        });
        return results.slice(0, 25);
    } catch(e) {
        logger.log('error', '[Baur Search] ' + e.message);
        return [];
    } finally {
        if(page) await page.close().catch(()=>{});
    }
}

async function scrapeBaurDetails(url) {
    const browser = await getBrowser();
    let page = null;
    
    try {
        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await handleCookies(page);

        const details = await page.evaluate(() => {
            const getText = (s) => document.querySelector(s)?.innerText.trim() || '';
            const formatPrice = (input) => {
                if (!input) return "0,00 €";
                let str = input.toString().trim();
                // Bereinige evtl. versteckte Texte wie "UVP"
                str = str.replace(/UVP/i, '').replace(/-/g, '').trim();
                
                if (!str.includes('€') && !str.includes('EUR')) str += ' €';
                return str;
            };
            
            const title = getText('h1');
            
            // Preis-Selektor anpassen auf dein Beispiel
            let priceRaw = getText('.price-value') || getText('.product-price__regular') || getText('.product-price__reduced') || getText('[data-test="product-price"]');
            let price = formatPrice(priceRaw);

            const descEl = document.querySelector('.product-description') || document.querySelector('[itemprop="description"]');
            const description = descEl ? descEl.innerText.trim() : '';

            const images = [];
            document.querySelectorAll('.gallery__image, .product-gallery img').forEach(img => {
                if(img.src) images.push(img.src.split('?')[0]);
            });

            const techData = [];
            document.querySelectorAll('.product-details-table tr').forEach(row => {
                const cols = row.querySelectorAll('td');
                if(cols.length === 2) techData.push(`${cols[0].innerText}: ${cols[1].innerText}`);
            });

            let energyLabel = 'Unbekannt';
            const eLabelImg = document.querySelector('img[alt*="Energieeffizienz"], img[src*="energy"]');
            if(eLabelImg) energyLabel = eLabelImg.src;

            return { title, price, description, images, techData, energyLabel, url: document.location.href };
        });

        if(details.energyLabel !== 'Unbekannt') {
             if(!details.images.includes(details.energyLabel)) details.images.push(details.energyLabel);
        }

        return details;

    } catch(e) {
        logger.log('error', '[Baur Details] ' + e.message);
        return null;
    } finally {
        if(page) await page.close().catch(()=>{});
    }
}

async function scrapeBaurPrice(url) {
    const data = await scrapeBaurDetails(url);
    return data ? data.price : "0,00 €";
}

module.exports = { searchBaur, scrapeBaurPrice, scrapeBaurDetails };