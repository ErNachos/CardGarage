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
    let pixelsPerMm = 0;
    let points = []; // 0-1: calibrazione, 2-9: misurazione
    let measurements = { left: 0, right: 0, top: 0, bottom: 0 };
    let currentState = 'idle'; // 'idle', 'rotating', 'calibrating', 'calibrated', 'measuring', 'measured'
    
    // Stato Zoom/Pan
    let zoom = 1;
    let pan = { x: 0, y: 0 };
    let rotationAngle = 0;
    let isPanning = false;
    let lastPanPos = { x: 0, y: 0 };

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

    const imageLoader = document.getElementById('imageLoader');
    const realWidthInput = document.getElementById('realWidth');
    const rotateButton = document.getElementById('rotateButton');
    const calibrateButton = document.getElementById('calibrateButton');
    const measureButton = document.getElementById('measureButton');
    const resetPointsButton = document.getElementById('resetPointsButton');
    const saveImageButton = document.getElementById('saveImageButton');
    const zoomSlider = document.getElementById('zoomSlider');
    const zoomValue = document.getElementById('zoomValue');
    const statusMessage = document.getElementById('statusMessage');

    // Risultati
    const resLeft = document.getElementById('resLeft');
    const resRight = document.getElementById('resRight');
    const resTop = document.getElementById('resTop');
    const resBottom = document.getElementById('resBottom');
    const resHPercent = document.getElementById('resHPercent');
    const resVPercent = document.getElementById('resVPercent');
    const resPoints = document.getElementById('resPoints');

    // Istruzioni per i click
    const rotationSteps = [
        "Clicca il primo punto per definire l'orizzontale (es. angolo alto-sinistro).",
        "Clicca il secondo punto per definire l'orizzontale (es. angolo alto-destro)."
    ];
    const calibrationSteps = [
        "Clicca il bordo SINISTRO della carta.",
        "Clicca il bordo DESTRO della carta."
    ];
    const measurementSteps = [
        "Clicca Punto 1 (Bordo Sinistro)",
        "Clicca Punto 2 (Bordo Sinistro)",
        "Clicca Punto 3 (Bordo Destro)",
        "Clicca Punto 4 (Bordo Destro)",
        "Clicca Punto 5 (Bordo Superiore)",
        "Clicca Punto 6 (Bordo Superiore)",
        "Clicca Punto 7 (Bordo Inferiore)",
        "Clicca Punto 8 (Bordo Inferiore)"
    ];

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
                calibrateButton.disabled = true;
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

    window.addEventListener('resize', () => {
        resizeCanvas();
    });

    // --- 2. Reset ---

    function resetAll() {
        pixelsPerMm = 0;
        points = [];
        measurements = { left: 0, right: 0, top: 0, bottom: 0 };
        currentState = 'idle';
        rotationAngle = 0;
        
        rotateButton.disabled = true;
        calibrateButton.disabled = true;
        measureButton.disabled = true;
        saveImageButton.disabled = true;
        measureButton.textContent = "Avvia Misurazione (8 click)";
        
        resetResultsUI();
        updatePointsListUI();
        updateCursor();
        
        if (image) {
            centerImage();
        }
        draw();
    }

    function resetMeasurementPoints() {
        if (points.length > 2) {
            points = points.slice(0, 2);
        } else if (currentState !== 'calibrating' && currentState !== 'rotating') {
            points = [];
        }

        measurements = { left: 0, right: 0, top: 0, bottom: 0 };
        currentState = 'calibrated';
        
        measureButton.disabled = false;
        measureButton.textContent = "Avvia Misurazione (8 click)";

        resetResultsUI();
        updatePointsListUI();
        updateStatus("Punti di misurazione resettati. Clicca 'Avvia Misurazione'.");
        draw();
    }
    
    resetPointsButton.addEventListener('click', resetMeasurementPoints);
    saveImageButton.addEventListener('click', saveImageWithPoints);

    function resetResultsUI() {
        resLeft.textContent = "--";
        resRight.textContent = "--";
        resTop.textContent = "--";
        resBottom.textContent = "--";
        resHPercent.textContent = "--";
        resVPercent.textContent = "--";
    }

    // --- 3. Calibrazione e Misurazione ---

    rotateButton.addEventListener('click', () => {
        currentState = 'rotating';
        points = [];
        pixelsPerMm = 0;
        rotationAngle = 0;
        calibrateButton.disabled = true;
        measureButton.disabled = true;
        updateStatus(rotationSteps[0]);
        updateCursor();
        draw();
    });

    calibrateButton.addEventListener('click', () => {
        currentState = 'calibrating';
        points = [];
        pixelsPerMm = 0;
        measureButton.disabled = true;
        updateStatus(calibrationSteps[0]);
        updateCursor();
        draw();
    });

    measureButton.addEventListener('click', () => {
        currentState = 'measuring';
        points = points.slice(0, 2);
        
        measureButton.disabled = true;
        updateStatus(measurementSteps[0]);
        updateCursor();
        draw();
    });

    // --- 4. Gestione Click su Canvas ---

    canvasContainer.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Click Sinistro
            if (currentState === 'calibrating' || currentState === 'measuring' || currentState === 'rotating') {
                handlePointClick(e);
            }
        } else if (e.button === 1 && image) { // Click Centrale (Rotella)
            e.preventDefault();
            isPanning = true;
            lastPanPos = { x: e.clientX, y: e.clientY };
            updateCursor();
        }
    });

    function handlePointClick(e) {
        const worldPos = screenToWorld(e.clientX, e.clientY);
        points.push(worldPos);
        
        updatePointsListUI();
        draw();

        if (currentState === 'rotating') {
            if (points.length === 1) {
                updateStatus(rotationSteps[1]);
            } else if (points.length === 2) {
                const p1 = points[0];
                const p2 = points[1];
                rotationAngle = -Math.atan2(p2.y - p1.y, p2.x - p1.x);
                
                currentState = 'idle';
                points = [];
                calibrateButton.disabled = false;
                updateStatus(`Rotazione impostata a ${(rotationAngle * 180 / Math.PI).toFixed(2)}°. Ora avvia calibrazione.`);
                updateCursor();
                updatePointsListUI();
                draw();
            }
        } else if (currentState === 'calibrating') {
            if (points.length === 1) {
                updateStatus(calibrationSteps[1]);
            } else if (points.length === 2) {
                calculateScale();
                currentState = 'calibrated';
                measureButton.disabled = false;
                updateStatus(`Calibrazione completata! Scala: ${pixelsPerMm.toFixed(2)} px/mm. Clicca 'Avvia Misurazione'.`);
                updateCursor();
                draw();
            }
        } else if (currentState === 'measuring') {
            const measurePointIndex = points.length - 3;
            
            if (measurePointIndex < 7) {
                updateStatus(measurementSteps[measurePointIndex + 1]);
            } else {
                currentState = 'measured';
                measureButton.textContent = "Rifai Misurazione (8 click)";
                measureButton.disabled = false;
                saveImageButton.disabled = false;
                updateStatus("Misurazione completata! Vedi risultati.");
                updateCursor();
            }
            updateMeasurements();
        }
    }

    function calculateScale() {
        if (points.length < 2) return;
        
        const realWidth = parseFloat(realWidthInput.value);
        if (isNaN(realWidth) || realWidth <= 0) {
            updateStatus("Errore: Larghezza reale non valida.");
            return;
        }
        
        const p1 = points[0];
        const p2 = points[1];
        const pixelDist = Math.abs(p2.x - p1.x);
        
        pixelsPerMm = pixelDist / realWidth;
    }

    function updateMeasurements() {
        if (pixelsPerMm === 0) return;

        const mPoints = points.slice(2);

        if (mPoints.length >= 2) {
            const dist = Math.abs(mPoints[1].x - mPoints[0].x) / pixelsPerMm;
            measurements.left = dist;
            resLeft.textContent = dist.toFixed(2) + " mm";
        }
        if (mPoints.length >= 4) {
            const dist = Math.abs(mPoints[3].x - mPoints[2].x) / pixelsPerMm;
            measurements.right = dist;
            resRight.textContent = dist.toFixed(2) + " mm";
        }
        if (mPoints.length >= 6) {
            const dist = Math.abs(mPoints[5].y - mPoints[4].y) / pixelsPerMm;
            measurements.top = dist;
            resTop.textContent = dist.toFixed(2) + " mm";
        }
        if (mPoints.length >= 8) {
            const dist = Math.abs(mPoints[7].y - mPoints[6].y) / pixelsPerMm;
            measurements.bottom = dist;
            resBottom.textContent = dist.toFixed(2) + " mm";
        }
        
        calculatePercentages();
    }

    function calculatePercentages() {
        const { left, right, top, bottom } = measurements;
        const totalH = left + right;
        const totalV = top + bottom;

        if (totalH > 0) {
            const leftPercent = (left / totalH) * 100;
            const rightPercent = (right / totalH) * 100;
            resHPercent.textContent = `S: ${leftPercent.toFixed(1)}% / D: ${rightPercent.toFixed(1)}%`;
        } else {
            resHPercent.textContent = "--";
        }

        if (totalV > 0) {
            const topPercent = (top / totalV) * 100;
            const bottomPercent = (bottom / totalV) * 100;
            resVPercent.textContent = `A: ${topPercent.toFixed(1)}% / B: ${bottomPercent.toFixed(1)}%`;
        } else {
            resVPercent.textContent = "--";
        }
    }
    
    function updatePointsListUI() {
        let text = `Angolo: ${(rotationAngle * 180 / Math.PI).toFixed(2)}°\n\n`;
        
        if (currentState === 'rotating') {
            text += "Punti Rotazione:\n";
            text += points.slice(0, 2).map((p, i) => ` R${i+1}: (${p.x.toFixed(0)}, ${p.y.toFixed(0)})`).join('\n');
        }

        text += "\nCalibrazione:\n";
        if (currentState !== 'rotating') {
            text += points.slice(0, 2).map((p, i) => ` C${i+1}: (${p.x.toFixed(0)}, ${p.y.toFixed(0)})`).join('\n');
        }
        
        text += "\n\nMisure:\n";
        if (currentState !== 'rotating') {
            text += points.slice(2).map((p, i) => ` P${i+1}: (${p.x.toFixed(0)}, ${p.y.toFixed(0)})`).join('\n');
        }
        resPoints.textContent = text;
    }

    // --- 5. Zoom e Pan ---

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

    // --- 6. Utility di Disegno e Stato ---

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

        drawPoints();
        drawLinesAndLabels();
        
        ctx.restore();
        
        drawParallelLines();
    }

    // Colori per le coppie di punti
    const pairColors = {
        pair1: '#FF0000', // Rosso
        pair2: '#FFD700', // Giallo
        pair3: '#00FF00', // Verde
        pair4: '#FFA500'  // Arancione
    };

    function drawPoints() {
        const pointSize = 10 / zoom;
        const fontSize = 14 / zoom;
        ctx.font = `bold ${fontSize}px Arial`;
        
        let pointsToDraw = [];
        let labels = [];

        if (currentState === 'rotating') {
            pointsToDraw = points;
            labels = points.map((p, i) => `R${i+1}`);
        } else if (currentState === 'calibrating') {
            pointsToDraw = points;
            labels = points.map((p, i) => `C${i+1}`);
        } else if (currentState === 'measuring' || currentState === 'measured') {
            pointsToDraw = points.slice(2);
            labels = pointsToDraw.map((p, i) => `${i+1}`);
        }
        
        pointsToDraw.forEach((p, i) => {
            let pairColor = '#EF4444';
            if (currentState === 'measuring' || currentState === 'measured') {
                const pairIndex = Math.floor(i/2);
                switch(pairIndex) {
                    case 0: pairColor = pairColors.pair1; break;
                    case 1: pairColor = pairColors.pair2; break;
                    case 2: pairColor = pairColors.pair3; break;
                    case 3: pairColor = pairColors.pair4; break;
                }
            }
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, pointSize / 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = pairColor;
            ctx.beginPath();
            ctx.arc(p.x, p.y, pointSize / 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'white';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4 / zoom;
            ctx.fillText(labels[i], p.x + pointSize, p.y + pointSize);
            ctx.shadowBlur = 0;
        });
    }
    
    function drawParallelLines() {
        if (currentState !== 'measuring' && currentState !== 'measured') return;
        if (points.length < 3) return;
        
        const mPoints = points.slice(2);
        const lineLength = 25;
        const lineWidth = 2;
        
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.lineWidth = lineWidth;
        
        mPoints.forEach((point, i) => {
            const pairIndex = Math.floor(i/2);
            let pairColor = '#EF4444';
            switch(pairIndex) {
                case 0: pairColor = pairColors.pair1; break;
                case 1: pairColor = pairColors.pair2; break;
                case 2: pairColor = pairColors.pair3; break;
                case 3: pairColor = pairColors.pair4; break;
            }
            
            ctx.strokeStyle = pairColor;
            
            const cos = Math.cos(rotationAngle);
            const sin = Math.sin(rotationAngle);
            
            const rotatedX = point.x * cos - point.y * sin;
            const rotatedY = point.x * sin + point.y * cos;
            
            const screenX = rotatedX * zoom + pan.x;
            const screenY = rotatedY * zoom + pan.y;
            
            if (pairIndex === 0 || pairIndex === 1) {
                drawSingleVerticalLine(ctx, screenX, screenY, lineLength);
            } else {
                drawSingleHorizontalLine(ctx, screenX, screenY, lineLength);
            }
        });
        
        ctx.restore();
    }
    
    function drawSingleVerticalLine(ctx, centerX, centerY, lineLength) {
        const halfLength = lineLength / 2;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - halfLength);
        ctx.lineTo(centerX, centerY + halfLength);
        ctx.stroke();
    }
    
    function drawSingleHorizontalLine(ctx, centerX, centerY, lineLength) {
        const halfLength = lineLength / 2;
        
        ctx.beginPath();
        ctx.moveTo(centerX - halfLength, centerY);
        ctx.lineTo(centerX + halfLength, centerY);
        ctx.stroke();
    }
    
    function drawLinesAndLabels() {
        if (pixelsPerMm === 0 || (currentState !== 'measuring' && currentState !== 'measured')) {
            return;
        }
        
        const mPoints = points.slice(2);
        
        if (mPoints.length >= 2) {
            drawMeasurementLine(mPoints[0], mPoints[1], measurements.left, 'x', pairColors.pair1);
        }
        if (mPoints.length >= 4) {
            drawMeasurementLine(mPoints[2], mPoints[3], measurements.right, 'x', pairColors.pair2);
        }
        if (mPoints.length >= 6) {
            drawMeasurementLine(mPoints[4], mPoints[5], measurements.top, 'y', pairColors.pair3);
        }
        if (mPoints.length >= 8) {
            drawMeasurementLine(mPoints[6], mPoints[7], measurements.bottom, 'y', pairColors.pair4);
        }

        if (currentState === 'measured') {
            const padding = 10 / zoom;
            const lineHeight = 20 / zoom;
            const fontSize = 14 / zoom;
            let y = padding;

            ctx.save();
            ctx.rotate(-rotationAngle);
            ctx.font = `bold ${fontSize}px Arial`;

            function drawTextLine(text, color, x, y) {
                const textWidth = ctx.measureText(text).width;
                const padding = 5 / zoom;
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(x - padding, y - fontSize, textWidth + padding * 2, fontSize + padding);
                
                ctx.fillStyle = color;
                ctx.fillText(text, x, y);
                return y + lineHeight;
            }

            y = drawTextLine(`Tratto A: ${measurements.left.toFixed(2)}mm (${(measurements.left/(measurements.left + measurements.right)*100).toFixed(1)}%)`, pairColors.pair1, padding, y);
            y = drawTextLine(`Tratto B: ${measurements.right.toFixed(2)}mm (${(measurements.right/(measurements.left + measurements.right)*100).toFixed(1)}%)`, pairColors.pair2, padding, y);
            y = drawTextLine(`Tratto C: ${measurements.top.toFixed(2)}mm (${(measurements.top/(measurements.top + measurements.bottom)*100).toFixed(1)}%)`, pairColors.pair3, padding, y);
            y = drawTextLine(`Tratto D: ${measurements.bottom.toFixed(2)}mm (${(measurements.bottom/(measurements.top + measurements.bottom)*100).toFixed(1)}%)`, pairColors.pair4, padding, y);

            ctx.restore();
        }
    }
    
    function drawMeasurementLine(p1, p2, mmValue, axis, color = 'red') {
        const fontSize = 14 / zoom;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.lineWidth = 2 / zoom;
        ctx.strokeStyle = color;
        
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        
        const label = `${mmValue.toFixed(2)} mm`;
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        
        const textWidth = ctx.measureText(label).width;
        const textPadding = 4 / zoom;

        ctx.save();
        ctx.translate(midX, midY);
        if (axis === 'y') {
            ctx.rotate(-Math.PI / 2);
        }
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(-textWidth / 2 - textPadding, -fontSize, textWidth + textPadding * 2, fontSize + textPadding * 2);
        
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, textPadding / 2);
        
        ctx.restore();
    }

    function updateStatus(message) {
        statusMessage.textContent = message;
    }

    function updateCursor() {
        if (currentState === 'calibrating' || currentState === 'measuring' || currentState === 'rotating') {
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

    // --- SALVATAGGIO IMMAGINE ---
    
    function saveImageWithPoints() {
        if (!image || currentState !== 'measured') {
            updateStatus("Errore: Completa prima la misurazione per salvare l'immagine.");
            return;
        }
        
        const saveCanvas = document.createElement('canvas');
        const saveCtx = saveCanvas.getContext('2d');
        
        saveCanvas.width = image.width;
        saveCanvas.height = image.height;
        
        saveCtx.drawImage(image, 0, 0);
        
        if (rotationAngle !== 0) {
            const rotatedCanvas = document.createElement('canvas');
            const rotatedCtx = rotatedCanvas.getContext('2d');
            
            const cos = Math.abs(Math.cos(rotationAngle));
            const sin = Math.abs(Math.sin(rotationAngle));
            const newWidth = image.width * cos + image.height * sin;
            const newHeight = image.width * sin + image.height * cos;
            
            rotatedCanvas.width = newWidth;
            rotatedCanvas.height = newHeight;
            
            rotatedCtx.translate(newWidth / 2, newHeight / 2);
            rotatedCtx.rotate(rotationAngle);
            rotatedCtx.drawImage(image, -image.width / 2, -image.height / 2);
            
            saveCanvas.width = newWidth;
            saveCanvas.height = newHeight;
            saveCtx.drawImage(rotatedCanvas, 0, 0);
        }
        
        drawPointsForSave(saveCtx, saveCanvas.width, saveCanvas.height);
        drawParallelLinesForSave(saveCtx, saveCanvas.width, saveCanvas.height);
        drawLabelsForSave(saveCtx, saveCanvas.width, saveCanvas.height);
        
        downloadCanvas(saveCanvas);
        
        updateStatus("Immagine salvata con successo!");
    }
    
    function drawPointsForSave(ctx, canvasWidth, canvasHeight) {
        if (points.length < 10) return;
        
        const mPoints = points.slice(2);
        const pointSize = Math.max(8, Math.min(canvasWidth, canvasHeight) * 0.01);
        const fontSize = pointSize * 1.5;
        
        ctx.font = `bold ${fontSize}px Arial`;
        
        mPoints.forEach((p, i) => {
            const pairIndex = Math.floor(i/2);
            let pairColor = '#EF4444';
            switch(pairIndex) {
                case 0: pairColor = pairColors.pair1; break;
                case 1: pairColor = pairColors.pair2; break;
                case 2: pairColor = pairColors.pair3; break;
                case 3: pairColor = pairColors.pair4; break;
            }
            
            let drawX = p.x;
            let drawY = p.y;
            
            if (rotationAngle !== 0) {
                const cos = Math.cos(rotationAngle);
                const sin = Math.sin(rotationAngle);
                const centerX = image.width / 2;
                const centerY = image.height / 2;
                
                const relX = p.x - centerX;
                const relY = p.y - centerY;
                drawX = relX * cos - relY * sin + canvasWidth / 2;
                drawY = relX * sin + relY * cos + canvasHeight / 2;
            }
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(drawX, drawY, pointSize, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.fillStyle = pairColor;
            ctx.beginPath();
            ctx.arc(drawX, drawY, pointSize * 0.6, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeText((i + 1).toString(), drawX, drawY);
            ctx.fillText((i + 1).toString(), drawX, drawY);
        });
    }
    
    function drawParallelLinesForSave(ctx, canvasWidth, canvasHeight) {
        if (points.length < 10) return;
        
        const mPoints = points.slice(2);
        const lineLength = Math.max(30, Math.min(canvasWidth, canvasHeight) * 0.04);
        const lineWidth = Math.max(2, Math.min(canvasWidth, canvasHeight) * 0.002);
        
        ctx.lineWidth = lineWidth;
        
        for (let i = 0; i < 4; i++) {
            if (mPoints.length >= (i + 1) * 2) {
                const p1 = mPoints[i * 2];
                const p2 = mPoints[i * 2 + 1];
                
                let pairColor = '#EF4444';
                switch(i) {
                    case 0: pairColor = pairColors.pair1; break;
                    case 1: pairColor = pairColors.pair2; break;
                    case 2: pairColor = pairColors.pair3; break;
                    case 3: pairColor = pairColors.pair4; break;
                }
                
                ctx.strokeStyle = pairColor;
                
                [p1, p2].forEach(point => {
                    let drawX = point.x;
                    let drawY = point.y;
                    
                    if (rotationAngle !== 0) {
                        const cos = Math.cos(rotationAngle);
                        const sin = Math.sin(rotationAngle);
                        const centerX = image.width / 2;
                        const centerY = image.height / 2;
                        
                        const relX = point.x - centerX;
                        const relY = point.y - centerY;
                        drawX = relX * cos - relY * sin + canvasWidth / 2;
                        drawY = relX * sin + relY * cos + canvasHeight / 2;
                    }
                    
                    if (i === 0 || i === 1) {
                        drawSingleVerticalLineForSave(ctx, drawX, drawY, lineLength);
                    } else {
                        drawSingleHorizontalLineForSave(ctx, drawX, drawY, lineLength);
                    }
                });
            }
        }
    }
    
    function drawSingleVerticalLineForSave(ctx, centerX, centerY, lineLength) {
        const halfLength = lineLength / 2;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - halfLength);
        ctx.lineTo(centerX, centerY + halfLength);
        ctx.stroke();
    }
    
    function drawSingleHorizontalLineForSave(ctx, centerX, centerY, lineLength) {
        const halfLength = lineLength / 2;
        
        ctx.beginPath();
        ctx.moveTo(centerX - halfLength, centerY);
        ctx.lineTo(centerX + halfLength, centerY);
        ctx.stroke();
    }
    
    function drawLabelsForSave(ctx, canvasWidth, canvasHeight) {
        if (points.length < 10) return;
        
        const mPoints = points.slice(2);
        const fontSize = Math.max(16, Math.min(canvasWidth, canvasHeight) * 0.02);
        
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const labels = ['TRATTO A', 'TRATTO B', 'TRATTO C', 'TRATTO D'];
        const colors = [pairColors.pair1, pairColors.pair2, pairColors.pair3, pairColors.pair4];
        
        for (let i = 0; i < 4; i++) {
            if (mPoints.length >= (i + 1) * 2) {
                const p1 = mPoints[i * 2];
                const p2 = mPoints[i * 2 + 1];
                
                let midX = (p1.x + p2.x) / 2;
                let midY = (p1.y + p2.y) / 2;
                
                if (rotationAngle !== 0) {
                    const cos = Math.cos(rotationAngle);
                    const sin = Math.sin(rotationAngle);
                    const centerX = image.width / 2;
                    const centerY = image.height / 2;
                    
                    const relX = midX - centerX;
                    const relY = midY - centerY;
                    midX = relX * cos - relY * sin + canvasWidth / 2;
                    midY = relX * sin + relY * cos + canvasHeight / 2;
                }
                
                const offset = fontSize * 2;
                if (i === 0 || i === 1) {
                    midY += (i === 0) ? -offset : offset;
                } else {
                    midX += (i === 2) ? -offset : offset;
                }
                
                const textWidth = ctx.measureText(labels[i]).width;
                const padding = fontSize * 0.3;
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.fillRect(midX - textWidth/2 - padding, midY - fontSize/2 - padding, 
                           textWidth + padding * 2, fontSize + padding * 2);
                
                ctx.strokeStyle = colors[i];
                ctx.lineWidth = 3;
                ctx.strokeRect(midX - textWidth/2 - padding, midY - fontSize/2 - padding, 
                             textWidth + padding * 2, fontSize + padding * 2);
                
                ctx.fillStyle = colors[i];
                ctx.fillText(labels[i], midX, midY);
            }
        }
    }
    
    function downloadCanvas(canvas) {
        const link = document.createElement('a');
        link.download = `misurazione_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- LENTE DI INGRANDIMENTO ---
    
    function updateMagnifier(e) {
        if (!image || (currentState !== 'calibrating' && currentState !== 'measuring' && currentState !== 'rotating')) {
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
        const rect = canvasContainer.getBoundingClientRect();
        
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
        
        const captureSize = magnifierSize / (magnificationFactor * zoom);
        
        magnifierCtx.save();
        
        magnifierCtx.beginPath();
        magnifierCtx.arc(magnifierSize / 2, magnifierSize / 2, magnifierSize / 2, 0, Math.PI * 2);
        magnifierCtx.clip();
        
        magnifierCtx.translate(magnifierSize / 2, magnifierSize / 2);
        magnifierCtx.scale(magnificationFactor * zoom, magnificationFactor * zoom);
        magnifierCtx.rotate(rotationAngle);
        magnifierCtx.translate(-worldPos.x, -worldPos.y);
        
        magnifierCtx.drawImage(image, 0, 0);
        
        drawPointsInMagnifier();
        
        magnifierCtx.restore();
        
        drawCrosshair();
    }
    
    function drawPointsInMagnifier() {
        if (points.length === 0) return;
        
        const pointSize = 6 / (magnificationFactor * zoom);
        const fontSize = 8 / (magnificationFactor * zoom);
        magnifierCtx.font = `bold ${fontSize}px Arial`;
        
        let pointsToDraw = [];
        let labels = [];
        let colors = [];

        if (currentState === 'rotating') {
            pointsToDraw = points;
            labels = points.map((p, i) => `R${i+1}`);
            colors = points.map(() => '#EF4444');
        } else if (currentState === 'calibrating') {
            pointsToDraw = points;
            labels = points.map((p, i) => `C${i+1}`);
            colors = points.map(() => '#EF4444');
        } else if (currentState === 'measuring') {
            pointsToDraw = points.slice(2);
            labels = pointsToDraw.map((p, i) => `${i+1}`);
            colors = pointsToDraw.map((p, i) => {
                const pairIndex = Math.floor(i/2);
                switch(pairIndex) {
                    case 0: return pairColors.pair1;
                    case 1: return pairColors.pair2;
                    case 2: return pairColors.pair3;
                    case 3: return pairColors.pair4;
                    default: return '#EF4444';
                }
            });
        }
        
        pointsToDraw.forEach((p, i) => {
            magnifierCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            magnifierCtx.beginPath();
            magnifierCtx.arc(p.x, p.y, pointSize / 2, 0, Math.PI * 2);
            magnifierCtx.fill();
            
            magnifierCtx.fillStyle = colors[i];
            magnifierCtx.beginPath();
            magnifierCtx.arc(p.x, p.y, pointSize / 3, 0, Math.PI * 2);
            magnifierCtx.fill();
            
            magnifierCtx.fillStyle = 'white';
            magnifierCtx.shadowColor = 'black';
            magnifierCtx.shadowBlur = 2 / (magnificationFactor * zoom);
            magnifierCtx.fillText(labels[i], p.x + pointSize, p.y + pointSize);
            magnifierCtx.shadowBlur = 0;
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
});