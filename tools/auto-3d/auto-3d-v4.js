// Auto 3D Creator v4.0 - Contour Detection Approach
// 1. Trova rettangolo carta tramite edge detection
// 2. Estrai solo il rettangolo (crop)
// 3. Ruota per allineamento
// 4. Genera 3D

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';

// ==================== STATE ====================
const state = {
    frontOriginal: null,
    backOriginal: null,
    frontProcessed: null,
    backProcessed: null,
    frontCanvas: null,
    backCanvas: null,
    scene: null,
    camera: null,
    renderer: null,
    controls: null
};

// Proporzioni carta Pokémon: 63mm x 88mm = 0.716:1
const CARD_RATIO = 63 / 88;
const RATIO_TOLERANCE = 0.25; // ±25% tolleranza

// Contrasto configurabile
let contrastThreshold = 50; // Default medio (30-100)

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎴 Auto 3D Creator v4.1 - Color Segmentation + MinAreaRect');
    initEventListeners();
});

function initEventListeners() {
    document.getElementById('frontImageLoader').addEventListener('change', (e) => loadImage(e, 'front'));
    document.getElementById('backImageLoader').addEventListener('change', (e) => loadImage(e, 'back'));
    
    // Contrast slider
    document.getElementById('contrastSlider').addEventListener('input', (e) => {
        contrastThreshold = parseInt(e.target.value);
        document.getElementById('contrastValue').textContent = e.target.value;
    });
    
    document.getElementById('detectFront').addEventListener('click', () => detectAndCrop('front'));
    document.getElementById('detectBack').addEventListener('click', () => detectAndCrop('back'));
    
    document.getElementById('generate3D').addEventListener('click', generate3D);
    document.getElementById('exportGLB').addEventListener('click', () => exportModel('glb'));
    document.getElementById('exportOBJ').addEventListener('click', () => exportModel('obj'));
}

// ==================== IMAGE LOADING ====================
async function loadImage(event, side) {
    const file = event.target.files[0];
    if (!file) return;
    
    showStatus(`Caricamento ${side}...`, 'info');
    
    try {
        const img = await fileToImage(file);
        
        if (side === 'front') {
            state.frontOriginal = img;
            state.frontCanvas = document.getElementById('frontCanvas');
            drawImageOnCanvas(img, state.frontCanvas);
            document.getElementById('frontControls').style.display = 'block';
            showStatus('Immagine fronte caricata! Clicca "Rileva e Ritaglia"', 'success');
        } else {
            state.backOriginal = img;
            state.backCanvas = document.getElementById('backCanvas');
            drawImageOnCanvas(img, state.backCanvas);
            document.getElementById('backControls').style.display = 'block';
            document.getElementById('backPlaceholder').style.display = 'none';
            showStatus('Immagine retro caricata! Clicca "Rileva e Ritaglia"', 'success');
        }
        
        checkReadyFor3D();
    } catch (error) {
        console.error(`Error loading ${side}:`, error);
        showStatus(`Errore caricamento ${side}`, 'error');
    }
}

function fileToImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function drawImageOnCanvas(img, canvas) {
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
}

// ==================== CARD DETECTION (COLOR SEGMENTATION) ====================
async function detectAndCrop(side) {
    const sourceImage = side === 'front' ? state.frontOriginal : state.backOriginal;
    const canvas = side === 'front' ? state.frontCanvas : state.backCanvas;
    
    showStatus(`🔍 Rilevamento carta ${side}...`, 'info');
    console.log(`\n🔍 Starting card detection for ${side}...`);
    console.log(`   Contrast threshold: ${contrastThreshold}`);
    
    try {
        // Step 1: Disegna immagine su canvas temporaneo
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = sourceImage.width;
        tempCanvas.height = sourceImage.height;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(sourceImage, 0, 0);
        
        // Step 2: Segmentazione colore (trova pixel della carta vs sfondo nero)
        console.log('🎨 Step 1: Color segmentation (finding non-black pixels)...');
        const cardMask = segmentByColor(tempCanvas, contrastThreshold);
        
        // Step 3: Morphological operations (chiudi angoli smussati)
        console.log('� Step 2: Morphological closing (filling rounded corners)...');
        const closedMask = morphologicalClose(cardMask, 5); // 5px kernel
        
        // Step 4: Trova tutti i punti della carta
        console.log('📍 Step 3: Extracting card pixels...');
        const cardPoints = extractPoints(closedMask);
        
        if (cardPoints.length < 1000) {
            throw new Error('Troppo pochi pixel della carta trovati! Aumenta il contrasto o verifica lo sfondo.');
        }
        
        console.log(`   Found ${cardPoints.length} card pixels`);
        
        // Step 5: Calcola il rettangolo ruotato minimo
        console.log('📏 Step 4: Computing minimum area rectangle...');
        const rotatedRect = getMinAreaRect(cardPoints, -10, 10, 0.5); // ±10°, step 0.5°
        
        if (!rotatedRect) {
            throw new Error('Impossibile calcolare il rettangolo della carta!');
        }
        
        console.log(`   Rectangle: ${rotatedRect.width.toFixed(0)}x${rotatedRect.height.toFixed(0)}px, angle: ${rotatedRect.angle.toFixed(2)}°`);
        
        // Step 6: Verifica proporzioni
        const ratio = rotatedRect.width / rotatedRect.height;
        const expectedRatio = CARD_RATIO;
        const ratioDiff = Math.abs(ratio - expectedRatio);
        
        console.log(`   Ratio: ${ratio.toFixed(3)} (expected: ${expectedRatio.toFixed(3)}, diff: ${ratioDiff.toFixed(3)})`);
        
        if (ratioDiff > RATIO_TOLERANCE) {
            console.warn(`⚠️ Ratio fuori tolleranza! Carta potrebbe essere rilevata male.`);
        }
        
        // Step 7: Estrai e raddrizza
        console.log('✂️ Step 5: Extracting and straightening...');
        const croppedCanvas = extractAndStraightenV2(tempCanvas, rotatedRect);
        
        // Step 8: Aggiorna canvas
        canvas.width = croppedCanvas.width;
        canvas.height = croppedCanvas.height;
        canvas.getContext('2d').drawImage(croppedCanvas, 0, 0);
        
        if (side === 'front') {
            state.frontProcessed = croppedCanvas;
        } else {
            state.backProcessed = croppedCanvas;
        }
        
        showStatus(`✓ Carta ${side} rilevata e ritagliata!`, 'success');
        checkReadyFor3D();
        
    } catch (error) {
        console.error(`❌ Detection error:`, error);
        showStatus(error.message, 'error');
    }
}

// Segmentazione per colore: trova pixel NON-NERI (= carta)
function segmentByColor(canvas, threshold) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    const mask = new Uint8Array(width * height);
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Luminosità (brightness)
        const brightness = (r + g + b) / 3;
        
        // Se brightness > threshold → è carta (non nero)
        if (brightness > threshold) {
            mask[i / 4] = 255; // Bianco = carta
        } else {
            mask[i / 4] = 0;   // Nero = sfondo
        }
    }
    
    return { data: mask, width, height };
}

// Morphological closing: riempie buchi piccoli (angoli smussati)
function morphologicalClose(mask, kernelSize) {
    // Dilate + Erode
    const dilated = dilate(mask, kernelSize);
    const closed = erode(dilated, kernelSize);
    return closed;
}

function dilate(mask, size) {
    const { data, width, height } = mask;
    const result = new Uint8Array(width * height);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            
            // Cerca pixel bianco nel kernel
            let hasWhite = false;
            for (let ky = -size; ky <= size; ky++) {
                for (let kx = -size; kx <= size; kx++) {
                    const nx = x + kx;
                    const ny = y + ky;
                    
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nIdx = ny * width + nx;
                        if (data[nIdx] === 255) {
                            hasWhite = true;
                            break;
                        }
                    }
                }
                if (hasWhite) break;
            }
            
            result[idx] = hasWhite ? 255 : 0;
        }
    }
    
    return { data: result, width, height };
}

function erode(mask, size) {
    const { data, width, height } = mask;
    const result = new Uint8Array(width * height);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            
            // Verifica se TUTTI i pixel nel kernel sono bianchi
            let allWhite = true;
            for (let ky = -size; ky <= size; ky++) {
                for (let kx = -size; kx <= size; kx++) {
                    const nx = x + kx;
                    const ny = y + ky;
                    
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nIdx = ny * width + nx;
                        if (data[nIdx] === 0) {
                            allWhite = false;
                            break;
                        }
                    }
                }
                if (!allWhite) break;
            }
            
            result[idx] = allWhite ? 255 : 0;
        }
    }
    
    return { data: result, width, height };
}

// Estrai tutti i punti bianchi (carta)
function extractPoints(mask) {
    const { data, width, height } = mask;
    const points = [];
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (data[idx] === 255) {
                points.push({ x, y });
            }
        }
    }
    
    return points;
}

// ==================== EDGE DETECTION ====================
function detectEdges(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    // Convert to grayscale
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        gray[i / 4] = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
    }
    
    // Sobel edge detection (TOLLERANZA AUMENTATA)
    const edges = new Uint8Array(width * height);
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let gx = 0, gy = 0;
            
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = (y + ky) * width + (x + kx);
                    const kernelIdx = (ky + 1) * 3 + (kx + 1);
                    gx += gray[idx] * sobelX[kernelIdx];
                    gy += gray[idx] * sobelY[kernelIdx];
                }
            }
            
            const magnitude = Math.sqrt(gx * gx + gy * gy);
            // RIDOTTO DA 50 A 30 per maggiore sensibilità
            edges[y * width + x] = magnitude > 30 ? 255 : 0;
        }
    }
    
    return { data: edges, width, height };
}

// ==================== CONTOUR FINDING ====================
function findContours(edges) {
    const { data, width, height } = edges;
    const visited = new Uint8Array(width * height);
    const contours = [];
    
    // Trova tutti i contorni (blob di pixel bianchi connessi)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            
            if (data[idx] === 255 && !visited[idx]) {
                const contour = traceContour(data, width, height, x, y, visited);
                
                if (contour.length > 100) { // Filtro contorni troppo piccoli
                    contours.push(contour);
                }
            }
        }
    }
    
    return contours;
}

function traceContour(data, width, height, startX, startY, visited) {
    const contour = [];
    const stack = [{ x: startX, y: startY }];
    
    while (stack.length > 0) {
        const { x, y } = stack.pop();
        const idx = y * width + x;
        
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        if (visited[idx] || data[idx] !== 255) continue;
        
        visited[idx] = 1;
        contour.push({ x, y });
        
        // Aggiungi vicini
        stack.push({ x: x + 1, y });
        stack.push({ x: x - 1, y });
        stack.push({ x, y: y + 1 });
        stack.push({ x, y: y - 1 });
    }
    
    return contour;
}

// ==================== FIND CARD RECTANGLE (WITH ROTATION) ====================
function findCardContour(contours, imgWidth, imgHeight) {
    let bestContour = null;
    let bestScore = 0;
    
    for (const contour of contours) {
        if (contour.length < 100) continue; // Skip troppo piccoli
        
        // Calcola il RETTANGOLO RUOTATO minimo (minAreaRect)
        const rotatedRect = getMinAreaRect(contour);
        
        if (!rotatedRect) continue;
        
        const { width, height, angle, center, area } = rotatedRect;
        
        // Calcola ratio (prova sia width/height che height/width)
        const ratio1 = width / height;
        const ratio2 = height / width;
        
        // Prendi il ratio più vicino a CARD_RATIO (0.716)
        const ratioDiff1 = Math.abs(ratio1 - CARD_RATIO);
        const ratioDiff2 = Math.abs(ratio2 - CARD_RATIO);
        const bestRatioDiff = Math.min(ratioDiff1, ratioDiff2);
        const actualRatio = ratioDiff1 < ratioDiff2 ? ratio1 : ratio2;
        
        // TOLLERANZA AUMENTATA a 0.25 (±25%)
        const isCardRatio = bestRatioDiff < 0.25;
        
        // Verifica dimensione
        const minArea = (imgWidth * imgHeight) * 0.08; // Ridotto a 8%
        const maxArea = (imgWidth * imgHeight) * 0.95; // Aumentato a 95%
        const isGoodSize = area > minArea && area < maxArea;
        
        // Score
        const areaScore = area / (imgWidth * imgHeight);
        const ratioScore = 1 - (bestRatioDiff / 0.25);
        const score = isCardRatio && isGoodSize ? (areaScore * 0.6 + ratioScore * 0.4) : 0;
        
        console.log(`  Contour: ${contour.length} points, rect: ${width.toFixed(0)}x${height.toFixed(0)}, angle: ${angle.toFixed(1)}°, ratio: ${actualRatio.toFixed(3)}, score: ${score.toFixed(3)}`);
        
        if (score > bestScore) {
            bestScore = score;
            bestContour = {
                points: contour,
                rotatedRect,
                width,
                height,
                angle,
                center,
                area,
                ratio: actualRatio
            };
        }
    }
    
    return bestContour;
}

// Calcola il rettangolo orientato minimo (Rotating Calipers algorithm semplificato)
function getMinAreaRect(points) {
    if (points.length < 3) return null;
    
    // Trova convex hull prima (semplificato: usa tutti i punti se pochi)
    const hull = points.length > 500 ? samplePoints(points, 500) : points;
    
    // Calcola centroide
    let cx = 0, cy = 0;
    for (const p of hull) {
        cx += p.x;
        cy += p.y;
    }
    cx /= hull.length;
    cy /= hull.length;
    
    // Prova angoli da -45° a +45° (carta non può essere più ruotata)
    let minArea = Infinity;
    let bestRect = null;
    
    for (let angleDeg = -45; angleDeg <= 45; angleDeg += 0.5) {
        const angleRad = (angleDeg * Math.PI) / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        
        // Ruota tutti i punti
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const p of hull) {
            // Ruota punto attorno al centroide
            const dx = p.x - cx;
            const dy = p.y - cy;
            const rx = dx * cos - dy * sin;
            const ry = dx * sin + dy * cos;
            
            minX = Math.min(minX, rx);
            maxX = Math.max(maxX, rx);
            minY = Math.min(minY, ry);
            maxY = Math.max(maxY, ry);
        }
        
        const width = maxX - minX;
        const height = maxY - minY;
        const area = width * height;
        
        if (area < minArea) {
            minArea = area;
            bestRect = {
                width,
                height,
                angle: angleDeg,
                center: { x: cx, y: cy },
                area
            };
        }
    }
    
    return bestRect;
}

function samplePoints(points, maxPoints) {
    const step = Math.ceil(points.length / maxPoints);
    const sampled = [];
    for (let i = 0; i < points.length; i += step) {
        sampled.push(points[i]);
    }
    return sampled;
}

// ==================== EXTRACT & STRAIGHTEN (V2 - FOR COLOR SEGMENTATION) ====================
function extractAndStraightenV2(sourceCanvas, rotatedRect) {
    const { center, width, height, angle } = rotatedRect;
    
    console.log(`✂️ Extracting rotated rectangle: ${width.toFixed(0)}x${height.toFixed(0)} at ${angle.toFixed(1)}°`);
    
    // Crea canvas temporaneo
    const maxDim = Math.max(sourceCanvas.width, sourceCanvas.height) * 1.5;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = maxDim;
    tempCanvas.height = maxDim;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Disegna l'immagine originale centrata
    const offsetX = (maxDim - sourceCanvas.width) / 2;
    const offsetY = (maxDim - sourceCanvas.height) / 2;
    tempCtx.drawImage(sourceCanvas, offsetX, offsetY);
    
    // Centro della carta nel canvas temporaneo
    const centerInTemp = {
        x: center.x + offsetX,
        y: center.y + offsetY
    };
    
    // Ruota il canvas per raddrizzare la carta
    tempCtx.save();
    tempCtx.translate(centerInTemp.x, centerInTemp.y);
    tempCtx.rotate((-angle * Math.PI) / 180);
    tempCtx.translate(-centerInTemp.x, -centerInTemp.y);
    
    // Crea canvas finale con dimensioni carta
    const extractedCanvas = document.createElement('canvas');
    
    // Determina orientamento (verticale preferito)
    const isVertical = height > width;
    
    if (isVertical) {
        extractedCanvas.width = Math.round(width);
        extractedCanvas.height = Math.round(height);
    } else {
        // Orizzontale → ruotiamo 90° per renderla verticale
        extractedCanvas.width = Math.round(height);
        extractedCanvas.height = Math.round(width);
    }
    
    const ctx = extractedCanvas.getContext('2d');
    
    if (isVertical) {
        // Estrai direttamente
        ctx.drawImage(
            tempCanvas,
            centerInTemp.x - width / 2,
            centerInTemp.y - height / 2,
            width,
            height,
            0,
            0,
            extractedCanvas.width,
            extractedCanvas.height
        );
    } else {
        // Estrai e ruota 90°
        const tempExtract = document.createElement('canvas');
        tempExtract.width = Math.round(width);
        tempExtract.height = Math.round(height);
        const tempExtractCtx = tempExtract.getContext('2d');
        
        tempExtractCtx.drawImage(
            tempCanvas,
            centerInTemp.x - width / 2,
            centerInTemp.y - height / 2,
            width,
            height,
            0,
            0,
            tempExtract.width,
            tempExtract.height
        );
        
        // Ruota 90° per renderla verticale
        ctx.translate(extractedCanvas.width / 2, extractedCanvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(tempExtract, -tempExtract.width / 2, -tempExtract.height / 2);
    }
    
    tempCtx.restore();
    
    console.log(`✓ Extracted: ${extractedCanvas.width}x${extractedCanvas.height} (${isVertical ? 'vertical' : 'horizontal→vertical'})`);
    
    return extractedCanvas;
}

// ==================== EXTRACT & STRAIGHTEN (OLD - FOR EDGE DETECTION) ====================
function extractAndStraighten(sourceCanvas, cardContour) {
    const { rotatedRect, width, height, angle, center } = cardContour;
    
    console.log(`✂️ Extracting rotated rectangle: ${width.toFixed(0)}x${height.toFixed(0)} at ${angle.toFixed(1)}°`);
    
    // Crea canvas temporaneo abbastanza grande
    const maxDim = Math.max(sourceCanvas.width, sourceCanvas.height) * 1.5;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = maxDim;
    tempCanvas.height = maxDim;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Disegna l'immagine originale centrata
    const offsetX = (maxDim - sourceCanvas.width) / 2;
    const offsetY = (maxDim - sourceCanvas.height) / 2;
    tempCtx.drawImage(sourceCanvas, offsetX, offsetY);
    
    // Ruota attorno al centro della carta per raddrizzare
    const centerInTemp = {
        x: center.x + offsetX,
        y: center.y + offsetY
    };
    
    tempCtx.save();
    tempCtx.translate(centerInTemp.x, centerInTemp.y);
    tempCtx.rotate((-angle * Math.PI) / 180); // Ruota nell'opposto per raddrizzare
    
    // Estrai il rettangolo raddrizzato
    const extractedCanvas = document.createElement('canvas');
    
    // Determina se è verticale o orizzontale
    const isVertical = height > width;
    
    if (isVertical) {
        extractedCanvas.width = width;
        extractedCanvas.height = height;
    } else {
        // Se orizzontale, ruota 90° per renderla verticale
        extractedCanvas.width = height;
        extractedCanvas.height = width;
    }
    
    const ctx = extractedCanvas.getContext('2d');
    
    // Copia la porzione raddrizzata
    if (isVertical) {
        const sx = centerInTemp.x - width / 2;
        const sy = centerInTemp.y - height / 2;
        
        tempCtx.restore();
        tempCtx.save();
        tempCtx.translate(centerInTemp.x, centerInTemp.y);
        tempCtx.rotate((-angle * Math.PI) / 180);
        
        // Ottieni i dati dell'immagine ruotata
        const rotatedImageData = tempCtx.getImageData(
            -width / 2,
            -height / 2,
            width,
            height
        );
        
        ctx.putImageData(rotatedImageData, 0, 0);
    } else {
        // Orizzontale → estrai e ruota 90°
        tempCtx.restore();
        tempCtx.save();
        tempCtx.translate(centerInTemp.x, centerInTemp.y);
        tempCtx.rotate((-angle * Math.PI) / 180);
        
        const rotatedImageData = tempCtx.getImageData(
            -width / 2,
            -height / 2,
            width,
            height
        );
        
        // Crea canvas temp per la rotazione 90°
        const temp90 = document.createElement('canvas');
        temp90.width = width;
        temp90.height = height;
        temp90.getContext('2d').putImageData(rotatedImageData, 0, 0);
        
        // Ruota 90° per renderla verticale
        ctx.translate(extractedCanvas.width / 2, extractedCanvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(temp90, -width / 2, -height / 2);
    }
    
    tempCtx.restore();
    
    console.log(`✓ Extracted and straightened: ${extractedCanvas.width}x${extractedCanvas.height} (${isVertical ? 'was vertical' : 'was horizontal → rotated 90°'})`);
    
    return extractedCanvas;
}

// ==================== 3D GENERATION ====================
async function generate3D() {
    showStatus('Generazione modello 3D...', 'info');
    
    try {
        init3DScene();
        
        const frontCanvas = state.frontProcessed || state.frontCanvas;
        const backCanvas = state.backProcessed || state.backCanvas;
        
        const mesh = createCardMesh(frontCanvas, backCanvas);
        state.scene.add(mesh);
        
        document.getElementById('viewer3D').style.display = 'block';
        document.getElementById('exportSection').style.display = 'block';
        document.getElementById('exportGLB').disabled = false;
        document.getElementById('exportOBJ').disabled = false;
        
        animate();
        
        showStatus('Modello 3D generato!', 'success');
    } catch (error) {
        console.error('3D generation error:', error);
        showStatus('Errore generazione 3D', 'error');
    }
}

function init3DScene() {
    const container = document.getElementById('viewer3D');
    
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0xf5f5f5);
    
    state.camera = new THREE.PerspectiveCamera(
        50,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    state.camera.position.set(0, 0, 120);
    
    state.renderer = new THREE.WebGLRenderer({ antialias: true });
    state.renderer.setSize(container.clientWidth, container.clientHeight);
    state.renderer.setPixelRatio(window.devicePixelRatio);
    container.innerHTML = '';
    container.appendChild(state.renderer.domElement);
    
    state.controls = new OrbitControls(state.camera, state.renderer.domElement);
    state.controls.enableDamping = true;
    
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    state.scene.add(ambient);
    
    const directional = new THREE.DirectionalLight(0xffffff, 0.5);
    directional.position.set(5, 5, 5);
    state.scene.add(directional);
}

function createCardMesh(frontCanvas, backCanvas) {
    const width = 63;
    const height = 88;
    const thickness = 0.3;
    
    const geometry = new THREE.BoxGeometry(width, height, thickness);
    
    const frontTexture = new THREE.CanvasTexture(frontCanvas);
    frontTexture.needsUpdate = true;
    
    const materials = [];
    
    materials.push(new THREE.MeshStandardMaterial({
        map: frontTexture,
        side: THREE.FrontSide,
        transparent: true
    }));
    
    if (backCanvas && state.backProcessed) {
        const backTexture = new THREE.CanvasTexture(backCanvas);
        backTexture.needsUpdate = true;
        materials.push(new THREE.MeshStandardMaterial({
            map: backTexture,
            side: THREE.FrontSide,
            transparent: true
        }));
    } else {
        materials.push(new THREE.MeshStandardMaterial({
            color: 0xdddddd,
            side: THREE.FrontSide
        }));
    }
    
    for (let i = 0; i < 4; i++) {
        materials.push(new THREE.MeshStandardMaterial({ color: 0xffffff }));
    }
    
    const mesh = new THREE.Mesh(geometry, materials);
    return mesh;
}

function animate() {
    requestAnimationFrame(animate);
    state.controls.update();
    state.renderer.render(state.scene, state.camera);
}

// ==================== EXPORT ====================
async function exportModel(format) {
    showStatus(`Esportazione ${format.toUpperCase()}...`, 'info');
    
    try {
        if (format === 'glb') {
            const exporter = new GLTFExporter();
            exporter.parse(
                state.scene,
                (gltf) => {
                    const blob = new Blob([gltf], { type: 'application/octet-stream' });
                    downloadBlob(blob, 'pokemon-card.glb');
                    showStatus('GLB scaricato!', 'success');
                },
                { binary: true }
            );
        } else if (format === 'obj') {
            const exporter = new OBJExporter();
            const obj = exporter.parse(state.scene);
            const blob = new Blob([obj], { type: 'text/plain' });
            downloadBlob(blob, 'pokemon-card.obj');
            showStatus('OBJ scaricato!', 'success');
        }
    } catch (error) {
        console.error('Export error:', error);
        showStatus(`Errore esportazione ${format.toUpperCase()}`, 'error');
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ==================== UI ====================
function showStatus(message, type) {
    document.getElementById('statusMessage').textContent = message;
    document.getElementById('statusIndicator').className = `status-indicator status-${type}`;
    console.log(`📊 ${type.toUpperCase()}: ${message}`);
}

function checkReadyFor3D() {
    const ready = (state.frontProcessed !== null) || (state.frontCanvas !== null && state.frontOriginal !== null);
    document.getElementById('generate3D').disabled = !ready;
}
