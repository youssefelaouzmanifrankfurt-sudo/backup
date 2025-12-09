// public/js/lager/scanner.js
window.html5QrCode = null;

// --- KAMERA / FOTO SCAN (OCR) ---
window.triggerCamera = () => {
    // Klickt auf den versteckten File-Input
    // WICHTIG: Der Input im HTML muss capture="environment" haben!
    const inp = document.getElementById('cam-input');
    if(inp) inp.click();
};

window.startCropping = (inp) => {
    if(inp.files[0]) {
        const r = new FileReader();
        r.onload = (e) => {
            const imgEl = document.getElementById('image-to-crop');
            if(!imgEl) return;
            
            imgEl.src = e.target.result;
            document.getElementById('crop-modal').classList.add('active'); // 'active' statt 'open' für Konsistenz
            
            if(window.cropper) window.cropper.destroy();
            // Quadratischer Crop oder Free? Hier Free (NaN)
            window.cropper = new Cropper(imgEl, { viewMode:1, autoCropArea: 1 });
        };
        r.readAsDataURL(inp.files[0]);
    }
    inp.value='';
};

window.performOCR = () => {
    if(!window.cropper) return;
    const btn = document.getElementById('btn-ocr'); 
    const originalText = btn ? btn.innerText : "Scan";
    if(btn) btn.innerText = "⏳ Analysiere...";
    
    window.cropper.getCroppedCanvas().toBlob(async(b) => {
        const fd = new FormData(); 
        fd.append('image', b, 's.jpg');
        try {
            const r = await fetch('/api/scan-image', {method:'POST', body:fd});
            const d = await r.json();
            if(d.success) {
                if(window.socket) window.socket.emit('check-scan', d.model); 
            } else {
                alert("Text konnte nicht erkannt werden.");
            }
        } catch(e){ console.error(e); }
        
        if(window.closeAllModals) window.closeAllModals();
        if(btn) btn.innerText = originalText;
    }, 'image/jpeg');
};

window.triggerManualScan = () => {
    const val = document.getElementById('manual-code-input').value;
    if(val && window.socket) { 
        window.socket.emit('check-scan', val); 
        document.getElementById('manual-code-input').value = ""; 
    }
};

// --- QR CODE SCANNER (Handy Optimiert) ---
window.startQRScanner = async () => {
    const modal = document.getElementById('qr-scanner-modal');
    if(modal) modal.classList.add('active'); // Konsistente Klasse 'active' nutzen
    
    // Stoppe vorherige Instanzen falls vorhanden
    if(window.html5QrCode) {
        try { await window.html5QrCode.stop(); } catch(e){}
    }

    // Erstelle neue Instanz (nutzt ID "reader")
    window.html5QrCode = new Html5Qrcode("reader");
    
    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 }, // Quadratisch für Handy
        aspectRatio: 1.0 
    };

    // start() mit facingMode "environment" erzwingt Rückkamera
    try {
        await window.html5QrCode.start(
            { facingMode: "environment" }, 
            config,
            (decodedText) => {
                // Erfolg
                console.log("QR Scan:", decodedText);
                if(window.socket) window.socket.emit('check-scan', decodedText);
                
                // Audio Feedback
                const audio = new Audio('/sounds/notification.mp3');
                audio.play().catch(e => {});

                window.stopQRScanner();
            },
            (errorMessage) => {
                // Ignorieren (Scanning process)
            }
        );
    } catch (err) {
        console.error("Kamera Error:", err);
        alert("Kamera konnte nicht gestartet werden. Bitte Berechtigung prüfen.\n" + err);
        window.stopQRScanner();
    }
};

window.stopQRScanner = () => {
    if(window.html5QrCode) {
        window.html5QrCode.stop().then(() => {
            window.html5QrCode.clear();
        }).catch(err => console.log("Stop error:", err));
    }
    const modal = document.getElementById('qr-scanner-modal');
    if(modal) modal.classList.remove('active');
};