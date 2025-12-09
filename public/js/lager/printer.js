// public/js/lager/printer.js
console.log("🖨️ Printer Module Loaded");

window.openPrintModal = async (id) => {
    const items = window.lastStockItems || [];
    const item = items.find(i => i.id === id);
    
    if(!item) {
        return alert("Fehler: Artikeldaten nicht gefunden.");
    }
    
    const codeContent = item.sku || item.id; 
    
    try {
        const res = await fetch(`/api/qr/${encodeURIComponent(codeContent)}`);
        const data = await res.json();
        
        if(data.url) {
            const img = document.getElementById('print-qr');
            const title = document.getElementById('print-title');
            const sku = document.getElementById('print-sku');
            const modal = document.getElementById('print-modal');

            if(img) img.src = data.url;
            if(title) title.innerText = (item.title || "").substring(0, 30);
            if(sku) sku.innerText = item.sku || item.id;
            
            if(modal) modal.classList.add('active');
        }
    } catch(e) { 
        console.error(e);
        alert("Fehler beim Generieren des QR Codes."); 
    }
};

window.printLabel = () => {
    const area = document.getElementById('print-area');
    if(!area) return;
    
    const content = area.innerHTML;
    const win = window.open('', '', 'height=400,width=400');
    
    win.document.write('<html><head><title>Label</title><style>body{font-family:sans-serif;text-align:center;margin:0;padding:20px;}img{width:100%;max-width:200px;}</style></head><body>' + content + '</body></html>');
    win.document.close();
    
    setTimeout(() => {
        win.focus();
        win.print();
        win.close();
    }, 250);
};