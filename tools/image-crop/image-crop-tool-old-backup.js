document.addEventListener('DOMContentLoaded', () => {
    // Elementi DOM
    const canvasContainer = document.getElementById('canvasContainer');
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');
    const previewCanvas = document.getElementById('previewCanvas');
    const previewCtx = previewCanvas.getContext('2d');
    
    // Controlli
    const imageLoader = document.getElementById('imageLoader');
    const colorPicker = document.getElementById('colorPicker');
    const tolerance = document.getElementById('tolerance');
    const toleranceValue = document.getElementById('toleranceValue');
    const processButton = document.getElementById('processButton');
    const downloadPNG = document.getElementById('downloadPNG');
    const downloadJPG = document.getElementById('downloadJPG');
    const resetButton = document.getElementById('resetButton');
    const statusMessage = document.getElementById('statusMessage');
    
    // Sezioni UI
    const colorSection = document.getElementById('colorSection');
    const previewSection = document.getElementById('previewSection');
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    // Informazioni qualità
    const qualityInfo = document.getElementById('qualityInfo');
    const originalSize = document.getElementById('originalSize');
    const processedSize = document.getElementById('processedSize');
    
    // Controlli rotazione manuale pre-ritaglio
    const manualRotationSection = document.getElementById('manualRotationSection');
    const enableManualRotation = document.getElementById('enableManualRotation');
    const manualRotationControlsNew = document.getElementById('manualRotationControls');
    const rotationStatus = document.getElementById('rotationStatus');
    const point1Display = document.getElementById('point1Display');
    const point2Display = document.getElementById('point2Display');
    const angleDisplay = document.getElementById('angleDisplay');
    const applyRotationButton = document.getElementById('applyRotationButton');
    const resetRotationButton = document.getElementById('resetRotationButton');
    
    // Stato dell'applicazione
    let originalImage = null;
    let processedImageData = null;
    let selectedColor = { r: 255, g: 255, b: 255 }; // Bianco di default
    let currentTolerance = 10;
    
    // Stato rotazione manuale
    let manualRotationEnabled = false;
    let rotationPoints = [];
    let calculatedAngle = 0;
    let isSelectingPoints = false;
    
    // Stato lente di ingrandimento
    let magnifierEnabled = false;
    let magnifierSize = 150;
    let magnifierZoom = 4;
    let mouseX = 0;
    let mouseY = 0;
    
    // Ridimensiona canvas
    function resizeCanvas() {
        canvas.width = canvasContainer.clientWidth;
        canvas.height = canvasContainer.clientHeight;
        
        if (originalImage) {
            drawImage();
        }
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // --- 1. Caricamento Immagine ---
    
    imageLoader.addEventListener('change', handleImageUpload);
    
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Verifica che sia un'immagine
        if (!file.type.startsWith('image/')) {
            showNotification('Seleziona un file immagine valido');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            originalImage = new Image();
            originalImage.onload = () => {
                // Assicurati che l'immagine sia caricata completamente
                if (originalImage.complete && originalImage.naturalHeight !== 0) {
                    resetTool();
                    drawImage();
                    updateQualityInfo(); // Aggiorna informazioni qualità
                    manualRotationSection.style.display = 'block';
                    colorSection.style.display = 'block';
                    processButton.disabled = false;
                    updateStatus("Immagine caricata! Qualità originale preservata. Puoi raddrizzare l'immagine o procedere direttamente al ritaglio.");
                } else {
                    showNotification('Errore nel caricamento dell\'immagine');
                }
            };
            originalImage.onerror = () => {
                showNotification('Errore nel caricamento dell\'immagine');
            };
            originalImage.src = event.target.result;
        };
        reader.onerror = () => {
            showNotification('Errore nella lettura del file');
        };
        reader.readAsDataURL(file);
    }
    
    function drawImage() {
        if (!originalImage) return;
        
        // Calcola dimensioni mantenendo proporzioni
        const containerRatio = canvas.width / canvas.height;
        const imageRatio = originalImage.width / originalImage.height;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (imageRatio > containerRatio) {
            drawWidth = canvas.width * 0.9;
            drawHeight = drawWidth / imageRatio;
            offsetX = (canvas.width - drawWidth) / 2;
            offsetY = (canvas.height - drawHeight) / 2;
        } else {
            drawHeight = canvas.height * 0.9;
            drawWidth = drawHeight * imageRatio;
            offsetX = (canvas.width - drawWidth) / 2;
            offsetY = (canvas.height - drawHeight) / 2;
        }
        
        // Salva le dimensioni per uso futuro
        canvas.imageDrawData = { drawWidth, drawHeight, offsetX, offsetY };
        
        // Configura rendering di alta qualità
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Pulisci e disegna
        ctx.fillStyle = '#374151';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalImage, offsetX, offsetY, drawWidth, drawHeight);
    }
    
    // --- 2. Selezione Colore ---
    
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseenter', () => magnifierEnabled = true);
    canvas.addEventListener('mouseleave', () => {
        magnifierEnabled = false;
        redrawCurrentView();
    });
    tolerance.addEventListener('input', updateTolerance);
    colorPicker.addEventListener('change', updateColorFromPicker);
    
    // Event listeners per rotazione manuale pre-ritaglio
    enableManualRotation.addEventListener('change', toggleManualRotation);
    applyRotationButton.addEventListener('click', applyManualRotation);
    resetRotationButton.addEventListener('click', resetRotationPoints);
    
    function handleCanvasClick(e) {
        if (!originalImage) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Converti coordinate canvas in coordinate immagine
        const { drawWidth, drawHeight, offsetX, offsetY } = canvas.imageDrawData;
        
        if (x < offsetX || x > offsetX + drawWidth || y < offsetY || y > offsetY + drawHeight) {
            return; // Click fuori dall'immagine
        }
        
        // Calcola coordinate relative all'immagine
        const imageX = Math.floor((x - offsetX) / drawWidth * originalImage.width);
        const imageY = Math.floor((y - offsetY) / drawHeight * originalImage.height);
        
        // Se stiamo selezionando punti per la rotazione manuale
        if (isSelectingPoints) {
            handleRotationPointSelection(imageX, imageY, x, y);
            return;
        }
        
        // Altrimenti, selezione colore normale
        // Ottieni il colore del pixel
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = originalImage.width;
        tempCanvas.height = originalImage.height;
        tempCtx.drawImage(originalImage, 0, 0);
        
        const imageData = tempCtx.getImageData(imageX, imageY, 1, 1);
        const pixel = imageData.data;
        
        selectedColor = {
            r: pixel[0],
            g: pixel[1],
            b: pixel[2]
        };
        
        // Aggiorna il color picker
        const hexColor = rgbToHex(selectedColor.r, selectedColor.g, selectedColor.b);
        colorPicker.value = hexColor;
        
        updateStatus(`Colore selezionato: RGB(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}). Clicca "Rimuovi Sfondo" per procedere.`);
    }
    
    function handleMouseMove(e) {
        if (!originalImage) return;
        
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
        
        // Aggiorna la lente di ingrandimento se siamo in modalità selezione punti
        if (isSelectingPoints && magnifierEnabled) {
            redrawCurrentView();
        }
    }
    
    function updateTolerance() {
        currentTolerance = parseInt(tolerance.value);
        toleranceValue.textContent = currentTolerance;
    }
    
    function updateColorFromPicker() {
        const hex = colorPicker.value;
        selectedColor = hexToRgb(hex);
        updateStatus(`Colore impostato: RGB(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}). Clicca "Rimuovi Sfondo" per procedere.`);
    }
    
    // --- 2.5 Rotazione Manuale Pre-Ritaglio ---
    
    function toggleManualRotation() {
        manualRotationEnabled = enableManualRotation.checked;
        manualRotationControlsNew.style.display = manualRotationEnabled ? 'block' : 'none';
        
        if (manualRotationEnabled) {
            resetRotationPoints();
            updateStatus("Modalità rotazione manuale attivata. Clicca su due punti che dovrebbero essere orizzontali.");
            canvas.style.cursor = 'crosshair';
            isSelectingPoints = true;
        } else {
            isSelectingPoints = false;
            canvas.style.cursor = 'crosshair';
            redrawCurrentView();
            updateStatus("Modalità rotazione manuale disattivata. Puoi procedere al ritaglio.");
        }
    }
    
    function resetRotationPoints() {
        rotationPoints = [];
        calculatedAngle = 0;
        applyRotationButton.disabled = true;
        point1Display.textContent = "Punto 1: -";
        point2Display.textContent = "Punto 2: -";
        angleDisplay.textContent = "Angolo calcolato: -";
        rotationStatus.textContent = "Clicca il primo punto sulla linea da raddrizzare";
        redrawCurrentView();
    }
    
    function handleRotationPointSelection(imageX, imageY, canvasX, canvasY) {
        if (rotationPoints.length < 2) {
            // Aggiungi punto
            rotationPoints.push({
                imageX: imageX,
                imageY: imageY,
                canvasX: canvasX,
                canvasY: canvasY
            });
            
            // Aggiorna display
            if (rotationPoints.length === 1) {
                point1Display.textContent = `Punto 1: (${imageX}, ${imageY})`;
                rotationStatus.textContent = "Clicca il secondo punto sulla stessa linea";
            } else if (rotationPoints.length === 2) {
                point2Display.textContent = `Punto 2: (${imageX}, ${imageY})`;
                
                // Calcola angolo
                const point1 = rotationPoints[0];
                const point2 = rotationPoints[1];
                calculatedAngle = calculateAngleBetweenPoints(point1, point2);
                
                angleDisplay.textContent = `Angolo calcolato: ${calculatedAngle.toFixed(2)}°`;
                rotationStatus.textContent = "Punti selezionati! Clicca 'Applica Rotazione' per procedere.";
                applyRotationButton.disabled = false;
                isSelectingPoints = false;
                canvas.style.cursor = 'default';
            }
            
            // Ridisegna con i punti
            redrawCurrentView();
        }
    }
    
    function calculateAngleBetweenPoints(point1, point2) {
        const deltaX = point2.imageX - point1.imageX;
        const deltaY = point2.imageY - point1.imageY;
        
        // Calcola l'angolo in radianti e convertilo in gradi
        const angleRad = Math.atan2(deltaY, deltaX);
        const angleDeg = angleRad * (180 / Math.PI);
        
        // Ritorna l'angolo corretto per rendere orizzontale la linea
        return angleDeg;
    }
    
    function redrawImage() {
        if (!originalImage) return;
        drawImage();
    }
    
    function redrawCurrentView() {
        if (!originalImage) return;
        
        if (isSelectingPoints) {
            redrawImageWithPoints();
        } else {
            drawImage();
        }
        
        // Disegna la lente di ingrandimento se abilitata
        if (magnifierEnabled && isSelectingPoints) {
            drawMagnifier();
        }
    }
    
    function drawMagnifier() {
        if (!originalImage || !canvas.imageDrawData) return;
        
        const { drawWidth, drawHeight, offsetX, offsetY } = canvas.imageDrawData;
        
        // Verifica se il mouse è sopra l'immagine
        if (mouseX < offsetX || mouseX > offsetX + drawWidth || 
            mouseY < offsetY || mouseY > offsetY + drawHeight) {
            return;
        }
        
        // Calcola coordinate nell'immagine originale
        const imageX = (mouseX - offsetX) / drawWidth * originalImage.width;
        const imageY = (mouseY - offsetY) / drawHeight * originalImage.height;
        
        // Crea canvas temporaneo per catturare l'area dell'immagine
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = originalImage.width;
        tempCanvas.height = originalImage.height;
        tempCtx.drawImage(originalImage, 0, 0);
        
        // Dimensioni dell'area da catturare
        const captureSize = magnifierSize / magnifierZoom;
        const captureX = Math.max(0, imageX - captureSize / 2);
        const captureY = Math.max(0, imageY - captureSize / 2);
        const captureW = Math.min(captureSize, originalImage.width - captureX);
        const captureH = Math.min(captureSize, originalImage.height - captureY);
        
        // Posizione della lente (evita bordi)
        let lensX = mouseX + 20;
        let lensY = mouseY - magnifierSize - 20;
        
        if (lensX + magnifierSize > canvas.width) {
            lensX = mouseX - magnifierSize - 20;
        }
        if (lensY < 0) {
            lensY = mouseY + 20;
        }
        
        // Disegna sfondo della lente
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(lensX + magnifierSize/2, lensY + magnifierSize/2, magnifierSize/2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Clip per la forma circolare
        ctx.beginPath();
        ctx.arc(lensX + magnifierSize/2, lensY + magnifierSize/2, magnifierSize/2 - 2, 0, 2 * Math.PI);
        ctx.clip();
        
        // Disegna l'immagine ingrandita
        try {
            const imageData = tempCtx.getImageData(captureX, captureY, captureW, captureH);
            const zoomedCanvas = document.createElement('canvas');
            const zoomedCtx = zoomedCanvas.getContext('2d');
            zoomedCanvas.width = captureW;
            zoomedCanvas.height = captureH;
            zoomedCtx.putImageData(imageData, 0, 0);
            
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(zoomedCanvas, 
                lensX, lensY, 
                magnifierSize - 4, magnifierSize - 4);
        } catch (e) {
            // In caso di errore, disegna solo il cerchio vuoto
        }
        
        ctx.restore();
        
        // Disegna crosshair al centro
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        const centerX = lensX + magnifierSize/2;
        const centerY = lensY + magnifierSize/2;
        
        ctx.beginPath();
        ctx.moveTo(centerX - 10, centerY);
        ctx.lineTo(centerX + 10, centerY);
        ctx.moveTo(centerX, centerY - 10);
        ctx.lineTo(centerX, centerY + 10);
        ctx.stroke();
        
        // Disegna coordinate
        ctx.fillStyle = '#000000';
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(`(${Math.round(imageX)}, ${Math.round(imageY)})`, 
            centerX, lensY + magnifierSize + 15);
    }
    
    function redrawImageWithPoints() {
        if (!originalImage) return;
        
        drawImage();
        
        // Disegna i punti selezionati
        const { drawWidth, drawHeight, offsetX, offsetY } = canvas.imageDrawData;
        
        ctx.strokeStyle = '#ff0000';
        ctx.fillStyle = '#ff0000';
        ctx.lineWidth = 3;
        
        // Disegna i punti
        rotationPoints.forEach((point, index) => {
            const canvasX = point.canvasX;
            const canvasY = point.canvasY;
            
            // Disegna cerchio per il punto
            ctx.beginPath();
            ctx.arc(canvasX, canvasY, 8, 0, 2 * Math.PI);
            ctx.fill();
            
            // Disegna numero del punto
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText((index + 1).toString(), canvasX, canvasY + 4);
            ctx.fillStyle = '#ff0000';
        });
        
        // Disegna linea tra i punti se abbiamo entrambi
        if (rotationPoints.length === 2) {
            ctx.beginPath();
            ctx.moveTo(rotationPoints[0].canvasX, rotationPoints[0].canvasY);
            ctx.lineTo(rotationPoints[1].canvasX, rotationPoints[1].canvasY);
            ctx.stroke();
            
            // Disegna linea orizzontale di riferimento
            ctx.strokeStyle = '#00ff00';
            ctx.setLineDash([10, 5]);
            const centerY = (rotationPoints[0].canvasY + rotationPoints[1].canvasY) / 2;
            ctx.beginPath();
            ctx.moveTo(offsetX, centerY);
            ctx.lineTo(offsetX + drawWidth, centerY);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
    
    async function applyManualRotation() {
        if (rotationPoints.length !== 2 || !originalImage) return;
        
        updateStatus("Applicazione rotazione manuale...");
        applyRotationButton.disabled = true;
        showProgress(true);
        
        try {
            // Crea canvas temporaneo per la rotazione con qualità preservata
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = originalImage.width;
            tempCanvas.height = originalImage.height;
            
            // Configura per massima qualità
            tempCtx.imageSmoothingEnabled = true;
            tempCtx.imageSmoothingQuality = 'high';
            
            tempCtx.drawImage(originalImage, 0, 0);
            
            // Ottieni image data originale
            const originalImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            
            // Applica rotazione
            const rotatedImageData = await straightenImage(originalImageData, calculatedAngle);
            
            // Crea nuova immagine ruotata con qualità preservata
            const rotatedCanvas = document.createElement('canvas');
            const rotatedCtx = rotatedCanvas.getContext('2d');
            rotatedCanvas.width = rotatedImageData.width;
            rotatedCanvas.height = rotatedImageData.height;
            
            // Configura per massima qualità
            rotatedCtx.imageSmoothingEnabled = false; // Per pixel-perfect results
            rotatedCtx.putImageData(rotatedImageData, 0, 0);
            
            // Aggiorna l'immagine originale con quella ruotata
            originalImage = new Image();
            originalImage.onload = () => {
                // Reset dello stato di rotazione
                manualRotationEnabled = false;
                enableManualRotation.checked = false;
                toggleManualRotation();
                
                // Ridisegna l'immagine ruotata
                drawImage();
                updateStatus(`Rotazione applicata (${calculatedAngle.toFixed(1)}°)! Qualità preservata. Ora puoi procedere al ritaglio.`);
                showProgress(false);
                applyRotationButton.disabled = false;
            };
            // Usa PNG per preservare la qualità durante la rotazione
            originalImage.src = rotatedCanvas.toDataURL('image/png');
            
        } catch (error) {
            console.error('Errore durante la rotazione manuale:', error);
            updateStatus("Errore durante la rotazione. Riprova.");
            showProgress(false);
            applyRotationButton.disabled = false;
        }
    }
    
    // --- 3. Processamento Immagine ---
    
    processButton.addEventListener('click', processImage);
    
    async function processImage() {
        if (!originalImage || !selectedColor) return;
        
        updateStatus("Elaborazione in corso...");
        processButton.disabled = true;
        showProgress(true);
        
        try {
            // Crea canvas temporaneo per elaborazione
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = originalImage.width;
            tempCanvas.height = originalImage.height;
            tempCtx.drawImage(originalImage, 0, 0);
            
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            
            // Applica algoritmo flood fill per rimuovere il colore
            await removeBackgroundColor(imageData, selectedColor, currentTolerance);
            
            // Salva risultato
            processedImageData = imageData;
            tempCtx.putImageData(imageData, 0, 0);
            
            // Aggiorna informazioni qualità
            updateQualityInfo();
            
            // Mostra anteprima
            showPreview(tempCanvas);
            
            // Mostra sezione download direttamente
            previewSection.style.display = 'block';
            downloadPNG.disabled = false;
            downloadJPG.disabled = false;
            
            updateStatus("Ritaglio completato! Puoi scaricare il risultato finale.");
            
        } catch (error) {
            console.error('Errore durante l\'elaborazione:', error);
            updateStatus("Errore durante l'elaborazione. Riprova.");
        } finally {
            processButton.disabled = false;
            showProgress(false);
        }
    }
    
    async function removeBackgroundColor(imageData, targetColor, tolerance) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const totalPixels = width * height;
        let processedPixels = 0;
        
        // Crea mappa dei pixel da rimuovere
        const pixelsToRemove = new Set();
        
        // Funzione per calcolare la distanza del colore
        function colorDistance(r1, g1, b1, r2, g2, b2) {
            return Math.sqrt(
                Math.pow(r1 - r2, 2) + 
                Math.pow(g1 - g2, 2) + 
                Math.pow(b1 - b2, 2)
            );
        }
        
        // Prima passata: identifica tutti i pixel da rimuovere
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                
                const distance = colorDistance(r, g, b, targetColor.r, targetColor.g, targetColor.b);
                
                if (distance <= tolerance) {
                    pixelsToRemove.add(index);
                }
                
                processedPixels++;
                if (processedPixels % 10000 === 0) {
                    updateProgress((processedPixels / totalPixels) * 50); // Prima metà del progresso
                    await new Promise(resolve => setTimeout(resolve, 1)); // Non bloccare UI
                }
            }
        }
        
        // Seconda passata: applica flood fill per pixel connessi
        const visited = new Set();
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // su, giù, sinistra, destra
        
        function floodFill(startX, startY) {
            const stack = [[startX, startY]];
            const connected = new Set();
            
            while (stack.length > 0) {
                const [x, y] = stack.pop();
                
                if (x < 0 || x >= width || y < 0 || y >= height) continue;
                
                const index = (y * width + x) * 4;
                const key = `${x},${y}`;
                
                if (visited.has(key)) continue;
                visited.add(key);
                
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                
                const distance = colorDistance(r, g, b, targetColor.r, targetColor.g, targetColor.b);
                
                if (distance <= tolerance) {
                    connected.add(index);
                    
                    // Aggiungi pixel adiacenti allo stack
                    for (const [dx, dy] of directions) {
                        stack.push([x + dx, y + dy]);
                    }
                }
            }
            
            return connected;
        }
        
        // Trova il pixel più grande connesso (probabilmente lo sfondo)
        let largestConnectedComponent = new Set();
        
        for (const pixelIndex of pixelsToRemove) {
            const x = (pixelIndex / 4) % width;
            const y = Math.floor((pixelIndex / 4) / width);
            const key = `${x},${y}`;
            
            if (!visited.has(key)) {
                const component = floodFill(x, y);
                if (component.size > largestConnectedComponent.size) {
                    largestConnectedComponent = component;
                }
            }
        }
        
        // Terza passata: rimuovi solo il componente più grande (lo sfondo)
        let removedPixels = 0;
        for (const index of largestConnectedComponent) {
            data[index + 3] = 0; // Imposta alpha a 0 (trasparente)
            removedPixels++;
            
            if (removedPixels % 1000 === 0) {
                updateProgress(50 + (removedPixels / largestConnectedComponent.size) * 50);
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }
        
        updateProgress(100);
    }
    
    // --- Funzioni di Supporto per Rotazione Manuale ---
    
    async function straightenImage(imageData, angleInDegrees) {
        const angleInRadians = angleInDegrees * Math.PI / 180;
        const cos = Math.cos(-angleInRadians);
        const sin = Math.sin(-angleInRadians);
        
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        
        // Calcola dimensioni della nuova immagine ruotata
        const corners = [
            { x: 0, y: 0 },
            { x: width, y: 0 },
            { x: width, y: height },
            { x: 0, y: height }
        ];
        
        const rotatedCorners = corners.map(corner => ({
            x: corner.x * cos - corner.y * sin,
            y: corner.x * sin + corner.y * cos
        }));
        
        const minX = Math.min(...rotatedCorners.map(c => c.x));
        const maxX = Math.max(...rotatedCorners.map(c => c.x));
        const minY = Math.min(...rotatedCorners.map(c => c.y));
        const maxY = Math.max(...rotatedCorners.map(c => c.y));
        
        const newWidth = Math.ceil(maxX - minX);
        const newHeight = Math.ceil(maxY - minY);
        const offsetX = -minX;
        const offsetY = -minY;
        
        // Crea nuova image data
        const newImageData = new ImageData(newWidth, newHeight);
        const newData = newImageData.data;
        
        // Applica rotazione con interpolazione bilineare
        for (let y = 0; y < newHeight; y++) {
            for (let x = 0; x < newWidth; x++) {
                // Coordinate nella nuova immagine
                const rotatedX = x - offsetX;
                const rotatedY = y - offsetY;
                
                // Coordinate originali (rotazione inversa)
                const originalX = rotatedX * cos + rotatedY * sin;
                const originalY = -rotatedX * sin + rotatedY * cos;
                
                // Interpolazione bilineare
                const pixel = improvedBilinearInterpolation(data, width, height, originalX, originalY);
                
                const newIndex = (y * newWidth + x) * 4;
                newData[newIndex] = pixel.r;
                newData[newIndex + 1] = pixel.g;
                newData[newIndex + 2] = pixel.b;
                newData[newIndex + 3] = pixel.a;
            }
            
            if (y % 30 === 0) {
                updateProgress((y / newHeight) * 100);
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }
        
        // Ritaglia l'area utile
        const croppedImageData = improvedCropTransparentBorders(newImageData);
        
        updateProgress(100);
        return croppedImageData;
    }
    
    function improvedBilinearInterpolation(data, width, height, x, y) {
        // Controllo limiti con margine di sicurezza
        if (x < 0 || x >= width - 1 || y < 0 || y >= height - 1) {
            return { r: 0, g: 0, b: 0, a: 0 };
        }
        
        const x1 = Math.floor(x);
        const y1 = Math.floor(y);
        const x2 = Math.min(x1 + 1, width - 1);
        const y2 = Math.min(y1 + 1, height - 1);
        
        const fx = x - x1;
        const fy = y - y1;
        
        const getPixel = (px, py) => {
            const index = (py * width + px) * 4;
            return {
                r: data[index] || 0,
                g: data[index + 1] || 0,
                b: data[index + 2] || 0,
                a: data[index + 3] || 0
            };
        };
        
        const p11 = getPixel(x1, y1);
        const p21 = getPixel(x2, y1);
        const p12 = getPixel(x1, y2);
        const p22 = getPixel(x2, y2);
        
        // Interpolazione migliorata con controllo della trasparenza
        const interpolate = (channel) => {
            // Se tutti i pixel sono trasparenti, ritorna trasparente
            if (p11.a === 0 && p21.a === 0 && p12.a === 0 && p22.a === 0) {
                return 0;
            }
            
            // Peso basato sulla trasparenza
            const w11 = p11.a / 255;
            const w21 = p21.a / 255;
            const w12 = p12.a / 255;
            const w22 = p22.a / 255;
            
            const i1 = (p11[channel] * w11 * (1 - fx) + p21[channel] * w21 * fx);
            const i2 = (p12[channel] * w12 * (1 - fx) + p22[channel] * w22 * fx);
            const totalWeight1 = w11 * (1 - fx) + w21 * fx;
            const totalWeight2 = w12 * (1 - fx) + w22 * fx;
            
            if (totalWeight1 + totalWeight2 === 0) return 0;
            
            return (i1 * (1 - fy) + i2 * fy) / (totalWeight1 * (1 - fy) + totalWeight2 * fy);
        };
        
        // Interpolazione alpha separata
        const alphaInterpolate = () => {
            const i1 = p11.a * (1 - fx) + p21.a * fx;
            const i2 = p12.a * (1 - fx) + p22.a * fx;
            return i1 * (1 - fy) + i2 * fy;
        };
        
        return {
            r: Math.round(Math.max(0, Math.min(255, interpolate('r')))),
            g: Math.round(Math.max(0, Math.min(255, interpolate('g')))),
            b: Math.round(Math.max(0, Math.min(255, interpolate('b')))),
            a: Math.round(Math.max(0, Math.min(255, alphaInterpolate())))
        };
    }
    
    function improvedCropTransparentBorders(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        let minX = width, maxX = 0, minY = height, maxY = 0;
        let hasContent = false;
        
        // Trova i limiti dell'area non trasparente con soglia più bassa
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                if (data[index + 3] > 5) { // Soglia molto bassa per catturare anti-aliasing
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                    hasContent = true;
                }
            }
        }
        
        if (!hasContent) {
            // Se non c'è contenuto, ritorna immagine minimale
            return new ImageData(1, 1);
        }
        
        // Aggiungi margine molto piccolo solo se necessario
        const margin = 2;
        minX = Math.max(0, minX - margin);
        maxX = Math.min(width - 1, maxX + margin);
        minY = Math.max(0, minY - margin);
        maxY = Math.min(height - 1, maxY + margin);
        
        const cropWidth = maxX - minX + 1;
        const cropHeight = maxY - minY + 1;
        
        if (cropWidth <= 0 || cropHeight <= 0) {
            return new ImageData(1, 1);
        }
        
        const croppedImageData = new ImageData(cropWidth, cropHeight);
        const croppedData = croppedImageData.data;
        
        for (let y = 0; y < cropHeight; y++) {
            for (let x = 0; x < cropWidth; x++) {
                const srcIndex = ((minY + y) * width + (minX + x)) * 4;
                const dstIndex = (y * cropWidth + x) * 4;
                
                croppedData[dstIndex] = data[srcIndex];
                croppedData[dstIndex + 1] = data[srcIndex + 1];
                croppedData[dstIndex + 2] = data[srcIndex + 2];
                croppedData[dstIndex + 3] = data[srcIndex + 3];
            }
        }
        
        return croppedImageData;
    }
    
    function showPreview(sourceCanvas) {
        // Ridimensiona anteprima per adattarsi al pannello
        const maxWidth = 300;
        const maxHeight = 200;
        
        const sourceRatio = sourceCanvas.width / sourceCanvas.height;
        let previewWidth, previewHeight;
        
        if (sourceRatio > maxWidth / maxHeight) {
            previewWidth = maxWidth;
            previewHeight = maxWidth / sourceRatio;
        } else {
            previewHeight = maxHeight;
            previewWidth = maxHeight * sourceRatio;
        }
        
        previewCanvas.width = previewWidth;
        previewCanvas.height = previewHeight;
        previewCanvas.style.display = 'block';
        
        // Configura qualità alta per il preview
        previewCtx.imageSmoothingEnabled = true;
        previewCtx.imageSmoothingQuality = 'high';
        
        // Disegna con sfondo a scacchiera per mostrare trasparenza
        drawTransparencyBackground(previewCtx, previewWidth, previewHeight);
        previewCtx.drawImage(sourceCanvas, 0, 0, previewWidth, previewHeight);
    }
    
    function drawTransparencyBackground(ctx, width, height) {
        const squareSize = 10;
        for (let x = 0; x < width; x += squareSize) {
            for (let y = 0; y < height; y += squareSize) {
                ctx.fillStyle = (Math.floor(x / squareSize) + Math.floor(y / squareSize)) % 2 === 0 ? '#ffffff' : '#cccccc';
                ctx.fillRect(x, y, squareSize, squareSize);
            }
        }
    }
    
    // --- 4. Download ---
    
    downloadPNG.addEventListener('click', () => downloadImage('png'));
    downloadJPG.addEventListener('click', () => downloadImage('jpg'));
    resetButton.addEventListener('click', resetTool);
    
    // --- Auto-crop trasparenze ---
    
    function autoCropTransparent(imageData) {
        const { data, width, height } = imageData;
        
        // Trova i bordi del contenuto non trasparente
        let minX = width, minY = height, maxX = -1, maxY = -1;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const alpha = data[(y * width + x) * 4 + 3];
                if (alpha > 0) { // Pixel non trasparente
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        
        // Se non c'è contenuto visibile, restituisci l'originale
        if (maxX === -1) {
            return imageData;
        }
        
        // Calcola dimensioni ritagliate
        const cropWidth = maxX - minX + 1;
        const cropHeight = maxY - minY + 1;
        
        // Crea nuova ImageData ritagliata
        const croppedImageData = new ImageData(cropWidth, cropHeight);
        const croppedData = croppedImageData.data;
        
        // Copia i pixel nell'area ritagliata
        for (let y = 0; y < cropHeight; y++) {
            for (let x = 0; x < cropWidth; x++) {
                const sourceIndex = ((minY + y) * width + (minX + x)) * 4;
                const targetIndex = (y * cropWidth + x) * 4;
                
                croppedData[targetIndex] = data[sourceIndex];         // R
                croppedData[targetIndex + 1] = data[sourceIndex + 1]; // G
                croppedData[targetIndex + 2] = data[sourceIndex + 2]; // B
                croppedData[targetIndex + 3] = data[sourceIndex + 3]; // A
            }
        }
        
        return croppedImageData;
    }
    
    function downloadImage(format) {
        const imageDataToUse = processedImageData;
        if (!imageDataToUse) return;
        
        let finalImageData = imageDataToUse;
        
        // Per PNG, applica auto-crop per rimuovere parti trasparenti
        if (format === 'png') {
            finalImageData = autoCropTransparent(imageDataToUse);
            console.log(`Auto-crop applicato: ${imageDataToUse.width}x${imageDataToUse.height} → ${finalImageData.width}x${finalImageData.height}`);
        }
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = finalImageData.width;
        tempCanvas.height = finalImageData.height;
        
        // Disabilita smoothing per mantenere la qualità pixel-perfect
        tempCtx.imageSmoothingEnabled = false;
        
        if (format === 'jpg') {
            // Per JPG, aggiungi sfondo bianco (mantieni dimensioni originali)
            tempCtx.fillStyle = '#ffffff';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        }
        
        tempCtx.putImageData(finalImageData, 0, 0);
        
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        link.download = `immagine_ritagliata_${timestamp}.${format}`;
        
        // Usa qualità massima per preservare i dettagli
        if (format === 'jpg') {
            link.href = tempCanvas.toDataURL('image/jpeg', 1.0); // Qualità massima per JPG
        } else {
            link.href = tempCanvas.toDataURL('image/png'); // PNG è lossless e auto-ritagliato
        }
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        updateStatus(`Immagine ${format.toUpperCase()} scaricata con successo!`);
    }
    
    // --- 5. Utility ---
    
    function resetTool() {
        processedImageData = null;
        selectedColor = { r: 255, g: 255, b: 255 };
        
        // Reset informazioni qualità
        updateQualityInfo();
        
        // Reset rotazione manuale
        manualRotationEnabled = false;
        rotationPoints = [];
        calculatedAngle = 0;
        isSelectingPoints = false;
        
        colorPicker.value = '#ffffff';
        tolerance.value = 10;
        currentTolerance = 10;
        toleranceValue.textContent = '10';
        
        // Reset controlli rotazione manuale
        enableManualRotation.checked = false;
        manualRotationControlsNew.style.display = 'none';
        applyRotationButton.disabled = true;
        resetRotationPoints();
        
        previewSection.style.display = 'none';
        previewCanvas.style.display = 'none';
        downloadPNG.disabled = true;
        downloadJPG.disabled = true;
        
        canvas.style.cursor = 'crosshair';
        
        if (originalImage) {
            drawImage();
            updateStatus("Tool resettato. Puoi raddrizzare l'immagine o selezionare un colore da rimuovere.");
        } else {
            manualRotationSection.style.display = 'none';
            colorSection.style.display = 'none';
            updateStatus("Carica un'immagine per iniziare il ritaglio.");
        }
    }
    
    function updateStatus(message) {
        statusMessage.textContent = message;
    }
    
    function updateQualityInfo() {
        if (originalImage && processedImageData) {
            const originalMB = (originalImage.width * originalImage.height * 4 / (1024 * 1024)).toFixed(2);
            const processedMB = (processedImageData.width * processedImageData.height * 4 / (1024 * 1024)).toFixed(2);
            
            // Calcola dimensioni dopo auto-crop per PNG
            const autoCroppedData = autoCropTransparent(processedImageData);
            const croppedMB = (autoCroppedData.width * autoCroppedData.height * 4 / (1024 * 1024)).toFixed(2);
            
            originalSize.textContent = `• Immagine originale: ${originalImage.width}x${originalImage.height} (~${originalMB}MB)`;
            processedSize.textContent = `• PNG finale: ${autoCroppedData.width}x${autoCroppedData.height} (~${croppedMB}MB)`;
            
            qualityInfo.style.display = 'block';
        } else if (originalImage) {
            const originalMB = (originalImage.width * originalImage.height * 4 / (1024 * 1024)).toFixed(2);
            originalSize.textContent = `• Immagine originale: ${originalImage.width}x${originalImage.height} (~${originalMB}MB)`;
            processedSize.textContent = `• PNG finale: In attesa...`;
            qualityInfo.style.display = 'block';
        } else {
            qualityInfo.style.display = 'none';
        }
    }
    
    function showProgress(show) {
        progressContainer.style.display = show ? 'block' : 'none';
        if (!show) {
            updateProgress(0);
        }
    }
    
    function updateProgress(percent) {
        progressFill.style.width = `${percent}%`;
        progressText.textContent = `${Math.round(percent)}%`;
    }
    
    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
});