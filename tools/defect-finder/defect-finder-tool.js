document.addEventListener('DOMContentLoaded', () => {
    // Elementi DOM
    const canvasContainer = document.getElementById('canvasContainer');
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');
    
    // Lente di ingrandimento
    const magnifier = document.getElementById('magnifier');
    const magnifierCanvas = document.getElementById('magnifierCanvas');
    const magnifierCtx = magnifierCanvas.getContext('2d');
    
    // Configurazione lente
    const magnifierSize = 150;
    const magnificationFactor = 3;
    magnifierCanvas.width = magnifierSize;
    magnifierCanvas.height = magnifierSize;

    // Stato dell'applicazione
    let image = null;
    let rotationPoints = []; // 2 punti per rotazione
    let defectPoints = []; // max 8 difetti
    let defectMagnifications = []; // array di imageData salvati per ogni difetto
    let currentState = 'idle'; // 'idle', 'rotating', 'marking'
    let rotationAngle = 0;
    
    // Stato Zoom/Pan
    let zoom = 1;
    let pan = { x: 0, y: 0 };
    let isPanning = false;
    let lastPanPos = { x: 0, y: 0 };

    // Riferimenti DOM
    const imageLoader = document.getElementById('imageLoader');
    const rotateButton = document.getElementById('rotateButton');
    const markDefectsButton = document.getElementById('markDefectsButton');
    const resetDefectsButton = document.getElementById('resetDefectsButton');
    const exportImageButton = document.getElementById('exportImageButton');
    const exportDefectsButton = document.getElementById('exportDefectsButton');
    const zoomSlider = document.getElementById('zoomSlider');
    const zoomValue = document.getElementById('zoomValue');
    const statusMessage = document.getElementById('statusMessage');
    const defectCount = document.getElementById('defectCount');
    const defectPreviewGrid = document.getElementById('defectPreviewGrid');

    // NUOVA FUNZIONE per ridimensionare la canvas
    function resizeCanvas() {
        canvas.width = canvasContainer.clientWidth;
        canvas.height = canvasContainer.clientHeight;
        
        if (image) {
            centerImage(); 
            draw();
        }
    }
    
    // Imposta la dimensione iniziale
    resizeCanvas();

    // Ridimensiona quando la finestra cambia
    window.addEventListener('resize', () => {
        resizeCanvas();
    });

    // --- 1. Gestione Immagine ---
    imageLoader.addEventListener('change', handleImageUpload);

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            image = new Image();
            image.onload = () => {
                resetAll();
                centerImage();
                draw();
                updateStatus("Immagine caricata. Clicca 'Imposta Rotazione'.");
                rotateButton.disabled = false;
            };
            image.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function centerImage() {
        zoom = Math.min(
            canvasContainer.clientWidth / (image.width * 1.05),
            canvasContainer.clientHeight / (image.height * 1.05)
        );
        
        pan.x = (canvasContainer.clientWidth - image.width * zoom) / 2;
        pan.y = (canvasContainer.clientHeight - image.height * zoom) / 2;
        
        zoomSlider.value = zoom * 100;
        zoomValue.textContent = Math.round(zoom * 100);
    }

    // --- 2. Reset ---
    function resetAll() {
        rotationPoints = [];
        defectPoints = [];
        defectMagnifications = [];
        currentState = 'idle';
        rotationAngle = 0;
        
        rotateButton.disabled = true;
        markDefectsButton.disabled = true;
        exportImageButton.disabled = true;
        exportDefectsButton.disabled = true;
        
        updateDefectCount();
        updateDefectPreview();
        updateCursor();
        
        if (image) {
            centerImage();
        }
        draw();
    }

    function resetDefects() {
        defectPoints = [];
        defectMagnifications = [];
        currentState = 'idle';
        
        markDefectsButton.disabled = false;
        exportImageButton.disabled = true;
        exportDefectsButton.disabled = true;
        
        updateDefectCount();
        updateDefectPreview();
        updateStatus("Difetti resettati. Clicca 'Inizia a Marcare'.");
        draw();
    }

    resetDefectsButton.addEventListener('click', resetDefects);

    // --- 3. Rotazione ---
    rotateButton.addEventListener('click', () => {
        currentState = 'rotating';
        rotationPoints = [];
        rotationAngle = 0;
        markDefectsButton.disabled = true;
        updateStatus("Clicca il primo punto per definire l'orizzontale.");
        updateCursor();
        draw();
    });

    // --- 4. Marcatura Difetti ---
    markDefectsButton.addEventListener('click', () => {
        currentState = 'marking';
        markDefectsButton.disabled = true;
        updateStatus("Clicca sui difetti (max 8). La lente ti guiderà.");
        updateCursor();
    });

    // --- 5. Gestione Click su Canvas ---
    canvasContainer.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Click Sinistro
            if (currentState === 'rotating') {
                handleRotationClick(e);
            } else if (currentState === 'marking') {
                handleDefectClick(e);
            }
        } else if (e.button === 1 && image) { // Click Centrale (Rotella)
            e.preventDefault();
            isPanning = true;
            lastPanPos = { x: e.clientX, y: e.clientY };
            updateCursor();
        }
    });

    function handleRotationClick(e) {
        const worldPos = screenToWorld(e.clientX, e.clientY);
        rotationPoints.push(worldPos);
        
        if (rotationPoints.length === 1) {
            updateStatus("Clicca il secondo punto per definire l'orizzontale.");
        } else if (rotationPoints.length === 2) {
            const p1 = rotationPoints[0];
            const p2 = rotationPoints[1];
            rotationAngle = -Math.atan2(p2.y - p1.y, p2.x - p1.x);
            
            currentState = 'idle';
            markDefectsButton.disabled = false;
            updateStatus(`Rotazione impostata a ${(rotationAngle * 180 / Math.PI).toFixed(2)}°. Ora marca i difetti.`);
            updateCursor();
        }
        draw();
    }

    function handleDefectClick(e) {
        if (defectPoints.length >= 8) {
            updateStatus("Massimo 8 difetti raggiunti!");
            return;
        }

        const worldPos = screenToWorld(e.clientX, e.clientY);
        defectPoints.push(worldPos);
        
        // Salva l'area ingrandita SENZA crosshair
        const magnifiedData = captureMagnifiedArea(worldPos);
        defectMagnifications.push(magnifiedData);
        
        updateDefectCount();
        updateDefectPreview();
        
        // Abilita sempre l'esportazione se c'è almeno 1 difetto
        exportImageButton.disabled = false;
        exportDefectsButton.disabled = false;
        
        if (defectPoints.length >= 8) {
            currentState = 'idle';
            markDefectsButton.disabled = false;
            markDefectsButton.textContent = "Rifai Marcatura";
            updateStatus("8 difetti marcati! Puoi esportare ora.");
            updateCursor();
        } else {
            updateStatus(`Difetto ${defectPoints.length} marcato. Continua (${8 - defectPoints.length} rimanenti).`);
        }
        
        draw();
    }

    function captureMagnifiedArea(worldPos) {
        // Crea una canvas temporanea per catturare l'area ingrandita
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Dimensione dell'area da catturare (150x150 px a 3x zoom)
        const captureSize = 150;
        tempCanvas.width = captureSize;
        tempCanvas.height = captureSize;
        
        // Area da catturare nell'immagine originale
        const sourceSize = captureSize / magnificationFactor;
        
        tempCtx.save();
        
        // Crea clip circolare
        tempCtx.beginPath();
        tempCtx.arc(captureSize / 2, captureSize / 2, captureSize / 2, 0, Math.PI * 2);
        tempCtx.clip();
        
        // Disegna l'immagine centrata sul punto del difetto
        tempCtx.translate(captureSize / 2, captureSize / 2);
        tempCtx.scale(magnificationFactor, magnificationFactor);
        tempCtx.rotate(rotationAngle);
        tempCtx.translate(-worldPos.x, -worldPos.y);
        
        tempCtx.drawImage(image, 0, 0);
        
        tempCtx.restore();
        
        // Ritorna l'imageData
        return tempCanvas.toDataURL('image/png');
    }

    function updateDefectCount() {
        defectCount.textContent = defectPoints.length;
    }

    function updateDefectPreview() {
        defectPreviewGrid.innerHTML = '';
        
        defectMagnifications.forEach((dataUrl, index) => {
            const img = document.createElement('img');
            img.src = dataUrl;
            img.className = 'defect-thumbnail';
            img.title = `Difetto ${index + 1}`;
            img.addEventListener('click', () => {
                // Zoom sul difetto quando si clicca sulla miniatura
                const defect = defectPoints[index];
                focusOnPoint(defect);
            });
            defectPreviewGrid.appendChild(img);
        });
    }

    function focusOnPoint(point) {
        // Centra la vista sul punto specificato
        zoom = 3; // Zoom al 300%
        
        const cos = Math.cos(rotationAngle);
        const sin = Math.sin(rotationAngle);
        const rotatedX = point.x * cos - point.y * sin;
        const rotatedY = point.x * sin + point.y * cos;
        
        pan.x = canvasContainer.clientWidth / 2 - rotatedX * zoom;
        pan.y = canvasContainer.clientHeight / 2 - rotatedY * zoom;
        
        zoomSlider.value = zoom * 100;
        zoomValue.textContent = Math.round(zoom * 100);
        
        draw();
    }

    // --- 6. Zoom e Pan ---
    canvasContainer.addEventListener('mousemove', (e) => {
        updateMagnifier(e);
        
        if (!isPanning || !image) return;
        
        const dx = e.clientX - lastPanPos.x;
        const dy = e.clientY - lastPanPos.y;
        
        pan.x += dx;
        pan.y += dy;
        
        lastPanPos = { x: e.clientX, y: e.clientY };
        draw();
    });

    canvasContainer.addEventListener('mouseup', (e) => {
        if (e.button === 1 && isPanning) {
            isPanning = false;
            updateCursor();
        }
    });

    canvasContainer.addEventListener('mouseout', () => {
        isPanning = false;
        hideMagnifier();
        updateCursor();
    });
    
    canvasContainer.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    zoomSlider.addEventListener('input', (e) => {
        const newZoom = parseInt(e.target.value) / 100;
        zoomValue.textContent = e.target.value;
        
        const oldZoom = zoom;
        zoom = newZoom;
        
        const rect = canvasContainer.getBoundingClientRect();
        const viewportCenterX = rect.width / 2;
        const viewportCenterY = rect.height / 2;
        
        pan.x = viewportCenterX - (viewportCenterX - pan.x) * (newZoom / oldZoom);
        pan.y = viewportCenterY - (viewportCenterY - pan.y) * (newZoom / oldZoom);

        draw();
    });

    canvasContainer.addEventListener('wheel', (e) => {
        if (!image) return;
        e.preventDefault();

        const oldZoom = zoom;
        const zoomAmount = 1.1;

        if (e.deltaY < 0) {
            zoom *= zoomAmount;
        } else {
            zoom /= zoomAmount;
        }

        const minZoom = parseFloat(zoomSlider.min) / 100;
        const maxZoom = parseFloat(zoomSlider.max) / 100;
        zoom = Math.max(minZoom, Math.min(maxZoom, zoom));

        if (zoom === oldZoom) return;

        zoomSlider.value = zoom * 100;
        zoomValue.textContent = Math.round(zoom * 100);

        const rect = canvasContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        pan.x = mouseX - (mouseX - pan.x) * (zoom / oldZoom);
        pan.y = mouseY - (mouseY - pan.y) * (zoom / oldZoom);

        draw();
    });

    // --- 7. Disegno ---
    function draw() {
        if (!ctx) return;
        
        ctx.fillStyle = '#374151';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);
        ctx.rotate(rotationAngle);
        
        if (image) {
            ctx.drawImage(image, 0, 0);
        }

        drawRotationPoints();
        drawDefectPoints();
        
        ctx.restore();
    }

    function drawRotationPoints() {
        if (rotationPoints.length === 0) return;
        
        const pointSize = 10 / zoom;
        const fontSize = 14 / zoom;
        ctx.font = `bold ${fontSize}px Arial`;
        
        rotationPoints.forEach((p, i) => {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.8)'; // blue
            ctx.beginPath();
            ctx.arc(p.x, p.y, pointSize / 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'white';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4 / zoom;
            ctx.fillText(`R${i+1}`, p.x + pointSize, p.y + pointSize);
            ctx.shadowBlur = 0;
        });

        if (rotationPoints.length === 2) {
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
            ctx.lineWidth = 2 / zoom;
            ctx.setLineDash([5 / zoom, 5 / zoom]);
            ctx.beginPath();
            ctx.moveTo(rotationPoints[0].x, rotationPoints[0].y);
            ctx.lineTo(rotationPoints[1].x, rotationPoints[1].y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    function drawDefectPoints() {
        if (defectPoints.length === 0) return;
        
        const pointSize = 12 / zoom;
        const fontSize = 16 / zoom;
        const circleRadius = 30 / zoom; // raggio del cerchio rosso
        
        ctx.font = `bold ${fontSize}px Arial`;
        
        defectPoints.forEach((p, i) => {
            // Cerchio rosso esterno
            ctx.strokeStyle = '#EF4444'; // red-500
            ctx.lineWidth = 3 / zoom;
            ctx.beginPath();
            ctx.arc(p.x, p.y, circleRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Punto centrale
            ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, pointSize / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Numero
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3 / zoom;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeText((i + 1).toString(), p.x, p.y);
            ctx.fillText((i + 1).toString(), p.x, p.y);
        });
    }

    // --- 8. Utility ---
    function updateStatus(message) {
        statusMessage.textContent = message;
    }

    function updateCursor() {
        if (currentState === 'rotating' || currentState === 'marking') {
            canvasContainer.style.cursor = 'crosshair';
        } else if (isPanning) {
            canvasContainer.style.cursor = 'grabbing';
        } else if (image) {
            canvasContainer.style.cursor = 'grab';
        } else {
            canvasContainer.style.cursor = 'default';
        }
    }

    function screenToWorld(clientX, clientY) {
        const rect = canvasContainer.getBoundingClientRect();
        const screenX = clientX - rect.left;
        const screenY = clientY - rect.top;
        
        const unPannedX = screenX - pan.x;
        const unPannedY = screenY - pan.y;
        
        const unZoomedX = unPannedX / zoom;
        const unZoomedY = unPannedY / zoom;

        const cosA = Math.cos(-rotationAngle);
        const sinA = Math.sin(-rotationAngle);
        
        const worldX = unZoomedX * cosA - unZoomedY * sinA;
        const worldY = unZoomedX * sinA + unZoomedY * cosA;
        
        return { x: worldX, y: worldY };
    }

    // --- 9. Lente di Ingrandimento ---
    function updateMagnifier(e) {
        if (!image || (currentState !== 'rotating' && currentState !== 'marking')) {
            hideMagnifier();
            return;
        }
        
        showMagnifier(e);
        drawMagnifier(e);
    }
    
    function showMagnifier(e) {
        magnifier.style.display = 'block';
        positionMagnifier(e);
    }
    
    function hideMagnifier() {
        magnifier.style.display = 'none';
    }
    
    function positionMagnifier(e) {
        const offset = 20;
        
        let x = e.clientX + offset;
        let y = e.clientY - magnifierSize - offset;
        
        if (x + magnifierSize > window.innerWidth) {
            x = e.clientX - magnifierSize - offset;
        }
        if (y < 0) {
            y = e.clientY + offset;
        }
        
        magnifier.style.left = x + 'px';
        magnifier.style.top = y + 'px';
    }
    
    function drawMagnifier(e) {
        if (!image) return;
        
        magnifierCtx.fillStyle = '#f3f4f6';
        magnifierCtx.fillRect(0, 0, magnifierSize, magnifierSize);
        
        const worldPos = screenToWorld(e.clientX, e.clientY);
        
        magnifierCtx.save();
        
        magnifierCtx.beginPath();
        magnifierCtx.arc(magnifierSize / 2, magnifierSize / 2, magnifierSize / 2, 0, Math.PI * 2);
        magnifierCtx.clip();
        
        magnifierCtx.translate(magnifierSize / 2, magnifierSize / 2);
        magnifierCtx.scale(magnificationFactor, magnificationFactor);
        magnifierCtx.rotate(rotationAngle);
        magnifierCtx.translate(-worldPos.x, -worldPos.y);
        
        magnifierCtx.drawImage(image, 0, 0);
        
        drawPointsInMagnifier();
        
        magnifierCtx.restore();
        
        drawCrosshair();
    }
    
    function drawPointsInMagnifier() {
        const pointSize = 6 / magnificationFactor;
        const fontSize = 8 / magnificationFactor;
        magnifierCtx.font = `bold ${fontSize}px Arial`;
        
        // Disegna punti di rotazione
        rotationPoints.forEach((p, i) => {
            magnifierCtx.fillStyle = 'rgba(59, 130, 246, 0.8)';
            magnifierCtx.beginPath();
            magnifierCtx.arc(p.x, p.y, pointSize / 2, 0, Math.PI * 2);
            magnifierCtx.fill();
        });
        
        // Disegna punti difetti
        defectPoints.forEach((p, i) => {
            const circleRadius = 30 / magnificationFactor;
            
            magnifierCtx.strokeStyle = '#EF4444';
            magnifierCtx.lineWidth = 2 / magnificationFactor;
            magnifierCtx.beginPath();
            magnifierCtx.arc(p.x, p.y, circleRadius, 0, Math.PI * 2);
            magnifierCtx.stroke();
            
            magnifierCtx.fillStyle = 'rgba(239, 68, 68, 0.8)';
            magnifierCtx.beginPath();
            magnifierCtx.arc(p.x, p.y, pointSize / 2, 0, Math.PI * 2);
            magnifierCtx.fill();
        });
    }
    
    function drawCrosshair() {
        const center = magnifierSize / 2;
        const crossSize = 10;
        
        magnifierCtx.strokeStyle = '#EF4444';
        magnifierCtx.lineWidth = 2;
        magnifierCtx.setLineDash([]);
        
        magnifierCtx.beginPath();
        magnifierCtx.moveTo(center - crossSize, center);
        magnifierCtx.lineTo(center + crossSize, center);
        magnifierCtx.stroke();
        
        magnifierCtx.beginPath();
        magnifierCtx.moveTo(center, center - crossSize);
        magnifierCtx.lineTo(center, center + crossSize);
        magnifierCtx.stroke();
        
        magnifierCtx.strokeStyle = '#3B82F6';
        magnifierCtx.lineWidth = 1;
        magnifierCtx.beginPath();
        magnifierCtx.arc(center, center, 3, 0, Math.PI * 2);
        magnifierCtx.stroke();
    }

    // --- 10. Esportazione ---
    exportImageButton.addEventListener('click', exportImageWithCircles);
    exportDefectsButton.addEventListener('click', exportCompositeImage);

    function exportImageWithCircles() {
        if (!image || defectPoints.length === 0) {
            updateStatus("Errore: Nessun difetto da esportare.");
            return;
        }
        
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d', { alpha: false });
        
        // Applica rotazione se necessaria
        if (rotationAngle !== 0) {
            const cos = Math.abs(Math.cos(rotationAngle));
            const sin = Math.abs(Math.sin(rotationAngle));
            const newWidth = image.width * cos + image.height * sin;
            const newHeight = image.width * sin + image.height * cos;
            
            exportCanvas.width = newWidth;
            exportCanvas.height = newHeight;
            
            exportCtx.save();
            exportCtx.translate(newWidth / 2, newHeight / 2);
            exportCtx.rotate(rotationAngle);
            exportCtx.drawImage(image, -image.width / 2, -image.height / 2);
            exportCtx.restore();
        } else {
            exportCanvas.width = image.width;
            exportCanvas.height = image.height;
            exportCtx.drawImage(image, 0, 0);
        }
        
        // Disegna cerchi rossi sui difetti
        const circleRadius = Math.max(30, Math.min(exportCanvas.width, exportCanvas.height) * 0.02);
        const circleLineWidth = Math.max(3, Math.min(exportCanvas.width, exportCanvas.height) * 0.003);
        
        defectPoints.forEach((p, i) => {
            let drawX = p.x;
            let drawY = p.y;
            
            if (rotationAngle !== 0) {
                const cos = Math.cos(rotationAngle);
                const sin = Math.sin(rotationAngle);
                const centerX = image.width / 2;
                const centerY = image.height / 2;
                
                // Coordinate relative al centro
                const relX = p.x - centerX;
                const relY = p.y - centerY;
                
                // Applica rotazione
                const rotatedX = relX * cos - relY * sin;
                const rotatedY = relX * sin + relY * cos;
                
                // Converti a coordinate del canvas
                drawX = rotatedX + exportCanvas.width / 2;
                drawY = rotatedY + exportCanvas.height / 2;
            }
            
            // Cerchio rosso
            exportCtx.strokeStyle = '#EF4444';
            exportCtx.lineWidth = circleLineWidth;
            exportCtx.beginPath();
            exportCtx.arc(drawX, drawY, circleRadius, 0, Math.PI * 2);
            exportCtx.stroke();
            
            // Numero
            const fontSize = Math.max(20, Math.min(exportCanvas.width, exportCanvas.height) * 0.025);
            exportCtx.font = `bold ${fontSize}px Arial`;
            exportCtx.textAlign = 'center';
            exportCtx.textBaseline = 'middle';
            
            // Contorno nero per il numero
            exportCtx.strokeStyle = 'black';
            exportCtx.lineWidth = 4;
            exportCtx.strokeText((i + 1).toString(), drawX, drawY);
            
            // Numero bianco
            exportCtx.fillStyle = 'white';
            exportCtx.fillText((i + 1).toString(), drawX, drawY);
        });
        
        downloadCanvasHighQuality(exportCanvas, 'difetti_marcati');
        updateStatus("Image with circles exported in high quality!");
    }

    function exportCompositeImage() {
        if (defectMagnifications.length === 0) {
            updateStatus("Error: No defects to export.");
            return;
        }
        
        // Calcola dimensioni immagine composita
        const thumbnailSize = 200; // Dimensione delle miniature
        const padding = 20;
        const defectCount = defectMagnifications.length;
        
        // Layout: immagine principale a sinistra, difetti a destra in griglia 2 colonne
        const rows = Math.ceil(defectCount / 2);
        const rightPanelWidth = (thumbnailSize * 2) + (padding * 3);
        const rightPanelHeight = (thumbnailSize * rows) + (padding * (rows + 1));
        
        // Prepara immagine rotata con cerchi
        let mainImageCanvas = document.createElement('canvas');
        let mainImageCtx = mainImageCanvas.getContext('2d', { alpha: false });
        
        // Prima disegna l'immagine (con o senza rotazione)
        if (rotationAngle !== 0) {
            const cos = Math.abs(Math.cos(rotationAngle));
            const sin = Math.abs(Math.sin(rotationAngle));
            const newWidth = image.width * cos + image.height * sin;
            const newHeight = image.width * sin + image.height * cos;
            
            mainImageCanvas.width = newWidth;
            mainImageCanvas.height = newHeight;
            
            mainImageCtx.save();
            mainImageCtx.translate(newWidth / 2, newHeight / 2);
            mainImageCtx.rotate(rotationAngle);
            mainImageCtx.drawImage(image, -image.width / 2, -image.height / 2);
            mainImageCtx.restore();
        } else {
            mainImageCanvas.width = image.width;
            mainImageCanvas.height = image.height;
            mainImageCtx.drawImage(image, 0, 0);
        }
        
        // Ora disegna i cerchi con le coordinate trasformate
        const circleRadius = Math.max(30, Math.min(mainImageCanvas.width, mainImageCanvas.height) * 0.02);
        const circleLineWidth = Math.max(3, Math.min(mainImageCanvas.width, mainImageCanvas.height) * 0.003);
        
        defectPoints.forEach((p, i) => {
            let drawX = p.x;
            let drawY = p.y;
            
            if (rotationAngle !== 0) {
                // Trasforma le coordinate del punto come se fosse ruotato insieme all'immagine
                const cos = Math.cos(rotationAngle);
                const sin = Math.sin(rotationAngle);
                const centerX = image.width / 2;
                const centerY = image.height / 2;
                
                // Coordinate relative al centro dell'immagine originale
                const relX = p.x - centerX;
                const relY = p.y - centerY;
                
                // Applica rotazione
                const rotatedX = relX * cos - relY * sin;
                const rotatedY = relX * sin + relY * cos;
                
                // Converti a coordinate del canvas ruotato
                drawX = rotatedX + mainImageCanvas.width / 2;
                drawY = rotatedY + mainImageCanvas.height / 2;
            }
            
            // Cerchio rosso
            mainImageCtx.strokeStyle = '#EF4444';
            mainImageCtx.lineWidth = circleLineWidth;
            mainImageCtx.beginPath();
            mainImageCtx.arc(drawX, drawY, circleRadius, 0, Math.PI * 2);
            mainImageCtx.stroke();
            
            // Numero
            const fontSize = Math.max(20, Math.min(mainImageCanvas.width, mainImageCanvas.height) * 0.025);
            mainImageCtx.font = `bold ${fontSize}px Arial`;
            mainImageCtx.textAlign = 'center';
            mainImageCtx.textBaseline = 'middle';
            
            mainImageCtx.strokeStyle = 'black';
            mainImageCtx.lineWidth = 4;
            mainImageCtx.strokeText((i + 1).toString(), drawX, drawY);
            
            mainImageCtx.fillStyle = 'white';
            mainImageCtx.fillText((i + 1).toString(), drawX, drawY);
        });
        
        // Crea canvas finale composito
        const finalHeight = Math.max(mainImageCanvas.height, rightPanelHeight);
        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = mainImageCanvas.width + rightPanelWidth + padding;
        compositeCanvas.height = finalHeight + (padding * 2);
        
        const compositeCtx = compositeCanvas.getContext('2d', { alpha: false });
        
        // Sfondo bianco
        compositeCtx.fillStyle = 'white';
        compositeCtx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);
        
        // Disegna immagine principale centrata verticalmente
        const mainImageY = (compositeCanvas.height - mainImageCanvas.height) / 2;
        compositeCtx.drawImage(mainImageCanvas, padding, mainImageY);
        
        // Disegna difetti in griglia 2 colonne
        const gridStartX = mainImageCanvas.width + (padding * 2);
        const gridStartY = padding;
        
        // Carica tutte le immagini prima di disegnare
        const imagePromises = defectMagnifications.map((dataUrl) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = dataUrl;
            });
        });
        
        Promise.all(imagePromises).then((loadedImages) => {
            loadedImages.forEach((img, index) => {
                const col = index % 2;
                const row = Math.floor(index / 2);
                
                const x = gridStartX + (col * (thumbnailSize + padding));
                const y = gridStartY + (row * (thumbnailSize + padding));
                
                // Disegna bordo
                compositeCtx.strokeStyle = '#EF4444';
                compositeCtx.lineWidth = 3;
                compositeCtx.strokeRect(x - 2, y - 2, thumbnailSize + 4, thumbnailSize + 4);
                
                // Disegna miniatura
                compositeCtx.drawImage(img, x, y, thumbnailSize, thumbnailSize);
                
                // Disegna solo il numero (senza testo)
                compositeCtx.fillStyle = 'white';
                compositeCtx.strokeStyle = 'black';
                compositeCtx.lineWidth = 3;
                compositeCtx.font = 'bold 32px Arial';
                compositeCtx.textAlign = 'center';
                compositeCtx.textBaseline = 'top';
                
                const labelText = `${index + 1}`;
                const labelX = x + (thumbnailSize / 2);
                const labelY = y + 5;
                
                compositeCtx.strokeText(labelText, labelX, labelY);
                compositeCtx.fillText(labelText, labelX, labelY);
            });
            
            // Salva dopo che tutto è stato disegnato
            downloadCanvasHighQuality(compositeCanvas, 'defect_report');
            updateStatus("Complete report exported in high quality!");
        });
    }

    function downloadCanvasHighQuality(canvas, prefix) {
        // Usa qualità massima per PNG (1.0 = 100%)
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `${prefix}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
            link.href = url;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
        }, 'image/png', 1.0);
    }

    function downloadCanvas(canvas, prefix) {
        const link = document.createElement('a');
        link.download = `${prefix}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
