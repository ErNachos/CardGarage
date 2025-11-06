// Auto 3D Creator Tool - Manual Mode
// Versione manuale con controlli separati per ogni fase

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';

// ==================== STATE MANAGEMENT ====================
const state = {
    frontImage: null,
    backImage: null,
    frontCanvas: null,
    backCanvas: null,
    frontOriginal: null, // Per undo
    backOriginal: null,  // Per undo
    frontRotated: false,
    backRotated: false,
    frontBgRemoved: false,
    backBgRemoved: false,
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    cardMesh: null,
    eraserActive: false,
    eraserSize: 20
};

// Zoom state per ogni canvas
const zoomState = {
    front: { scale: 1, offsetX: 0, offsetY: 0, isDragging: false, lastX: 0, lastY: 0 },
    back: { scale: 1, offsetX: 0, offsetY: 0, isDragging: false, lastX: 0, lastY: 0 }
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    console.log('🎨 Auto 3D Creator (Manual Mode) initialized');
});

function initializeEventListeners() {
    // Image loaders
    document.getElementById('frontImageLoader').addEventListener('change', handleFrontImageLoad);
    document.getElementById('backImageLoader').addEventListener('change', handleBackImageLoad);
    
    // Front controls
    document.getElementById('rotateFrontButton').addEventListener('click', () => rotateImage('front'));
    document.getElementById('undoRotateFrontButton').addEventListener('click', () => undoRotation('front'));
    document.getElementById('removeBgFrontButton').addEventListener('click', () => removeBackground('front'));
    document.getElementById('frontTolerance').addEventListener('input', (e) => {
        document.getElementById('frontToleranceValue').textContent = e.target.value;
    });
    
    // Back controls
    document.getElementById('rotateBackButton').addEventListener('click', () => rotateImage('back'));
    document.getElementById('undoRotateBackButton').addEventListener('click', () => undoRotation('back'));
    document.getElementById('removeBgBackButton').addEventListener('click', () => removeBackground('back'));
    document.getElementById('backTolerance').addEventListener('input', (e) => {
        document.getElementById('backToleranceValue').textContent = e.target.value;
    });
    
    // Eraser tool
    document.getElementById('toggleEraserButton').addEventListener('click', toggleEraser);
    document.getElementById('eraserSize').addEventListener('input', (e) => {
        state.eraserSize = parseInt(e.target.value);
        document.getElementById('eraserSizeValue').textContent = e.target.value;
    });
    
    // Generate 3D
    document.getElementById('generate3DButton').addEventListener('click', generate3DModel);
    
    // Export buttons
    document.getElementById('exportGLB').addEventListener('click', () => exportModel('glb'));
    document.getElementById('exportOBJ').addEventListener('click', () => exportModel('obj'));
    
    // Zoom controls - Front
    document.getElementById('zoomInFront').addEventListener('click', () => zoomCanvas('front', 0.2));
    document.getElementById('zoomOutFront').addEventListener('click', () => zoomCanvas('front', -0.2));
    document.getElementById('resetZoomFront').addEventListener('click', () => resetZoom('front'));
    
    // Zoom controls - Back
    document.getElementById('zoomInBack').addEventListener('click', () => zoomCanvas('back', 0.2));
    document.getElementById('zoomOutBack').addEventListener('click', () => zoomCanvas('back', -0.2));
    document.getElementById('resetZoomBack').addEventListener('click', () => resetZoom('back'));
    
    // Canvas pan & eraser
    setupCanvasInteraction('front');
    setupCanvasInteraction('back');
}

// ==================== IMAGE LOADING ====================
async function handleFrontImageLoad(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📸 Loading front image:', file.name);
    updateStatus('processing', 'Caricamento immagine fronte...');
    
    try {
        const img = await loadImageFromFile(file);
        state.frontImage = img;
        state.frontOriginal = img; // Salva originale per undo
        
        // Display image
        const canvas = document.getElementById('frontCanvas');
        displayImageOnCanvas(img, canvas);
        state.frontCanvas = canvas;
        
        // Show zoom controls
        document.getElementById('frontZoomControls').style.display = 'flex';
        
        // Enable controls
        document.getElementById('rotateFrontButton').disabled = false;
        document.getElementById('removeBgFrontButton').disabled = false;
        
        // Update status
        document.getElementById('frontStatus').className = 'status-indicator status-success';
        updateStatus('success', 'Immagine fronte caricata! Puoi ruotarla o rimuovere lo sfondo.');
        
        checkReadyToGenerate();
    } catch (error) {
        console.error('❌ Error loading front image:', error);
        updateStatus('error', 'Errore nel caricamento dell\'immagine fronte');
    }
}

async function handleBackImageLoad(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📸 Loading back image:', file.name);
    updateStatus('processing', 'Caricamento immagine retro...');
    
    try {
        const img = await loadImageFromFile(file);
        state.backImage = img;
        state.backOriginal = img; // Salva originale per undo
        
        // Display image
        const canvas = document.getElementById('backCanvas');
        displayImageOnCanvas(img, canvas);
        state.backCanvas = canvas;
        
        // Hide placeholder
        document.getElementById('backPlaceholder').style.display = 'none';
        
        // Show controls
        document.getElementById('backControls').style.display = 'block';
        document.getElementById('backZoomControls').style.display = 'flex';
        
        // Enable controls
        document.getElementById('rotateBackButton').disabled = false;
        document.getElementById('removeBgBackButton').disabled = false;
        
        // Update status
        document.getElementById('backStatus').className = 'status-indicator status-success';
        updateStatus('success', 'Immagine retro caricata! Puoi ruotarla o rimuovere lo sfondo.');
        
        checkReadyToGenerate();
    } catch (error) {
        console.error('❌ Error loading back image:', error);
        updateStatus('error', 'Errore nel caricamento dell\'immagine retro');
    }
}

function loadImageFromFile(file) {
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

function displayImageOnCanvas(img, canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
}

// ==================== ROTATION ====================
async function rotateImage(side) {
    console.log(`🔄 Auto-rotating ${side} image...`);
    const canvas = side === 'front' ? state.frontCanvas : state.backCanvas;
    const processingDiv = side === 'front' ? 'frontProcessing' : 'backProcessing';
    
    document.getElementById(processingDiv).style.display = 'flex';
    updateStatus('processing', `Rilevamento orientamento ${side}...`);
    
    try {
        // Rileva angolo ottimale
        const angle = await detectOptimalRotation(canvas);
        console.log(`✓ Optimal angle for ${side}: ${angle}°`);
        
        // Ruota immagine
        const rotatedCanvas = rotateCanvas(canvas, angle);
        
        // Aggiorna canvas
        const ctx = canvas.getContext('2d');
        canvas.width = rotatedCanvas.width;
        canvas.height = rotatedCanvas.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(rotatedCanvas, 0, 0);
        
        // Update state
        if (side === 'front') {
            state.frontRotated = true;
        } else {
            state.backRotated = true;
        }
        
        // Show undo button
        document.getElementById(`undoRotate${side.charAt(0).toUpperCase() + side.slice(1)}Button`).style.display = 'block';
        
        updateStatus('success', `Immagine ${side} ruotata di ${angle}°`);
        checkReadyToGenerate();
    } catch (error) {
        console.error(`❌ Error rotating ${side}:`, error);
        updateStatus('error', `Errore nella rotazione ${side}`);
    } finally {
        document.getElementById(processingDiv).style.display = 'none';
    }
}

async function undoRotation(side) {
    console.log(`↶ Undoing rotation for ${side}...`);
    
    const original = side === 'front' ? state.frontOriginal : state.backOriginal;
    const canvas = side === 'front' ? state.frontCanvas : state.backCanvas;
    
    displayImageOnCanvas(original, canvas);
    
    // Update state
    if (side === 'front') {
        state.frontRotated = false;
        state.frontImage = original;
    } else {
        state.backRotated = false;
        state.backImage = original;
    }
    
    // Hide undo button
    document.getElementById(`undoRotate${side.charAt(0).toUpperCase() + side.slice(1)}Button`).style.display = 'none';
    
    updateStatus('success', `Rotazione ${side} annullata`);
    checkReadyToGenerate();
}

function detectOptimalRotation(canvas) {
    return new Promise((resolve) => {
        console.log('🔍 Detecting optimal rotation...');
        
        // Ridimensiona per performance
        const maxDim = 800;
        const scale = Math.min(1, maxDim / Math.max(canvas.width, canvas.height));
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width * scale;
        tempCanvas.height = canvas.height * scale;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
        
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        let bestAngle = 0;
        let bestScore = 0;
        
        // Testa angoli da -10° a +10°
        for (let angle = -10; angle <= 10; angle += 1) {
            const score = calculateEdgeScore(data, tempCanvas.width, tempCanvas.height, angle);
            if (score > bestScore) {
                bestScore = score;
                bestAngle = angle;
            }
        }
        
        console.log(`✓ Best rotation: ${bestAngle}° (score: ${bestScore.toFixed(2)})`);
        resolve(bestAngle);
    });
}

function calculateEdgeScore(data, width, height, angle) {
    // Calcola score basato su segmenti orizzontali
    // (simulazione semplificata dell'algoritmo di rilevamento bordi)
    let horizontalEdges = 0;
    const threshold = 30;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            const nextIdx = (y * width + (x + 1)) * 4;
            
            const diff = Math.abs(data[idx] - data[nextIdx]) +
                        Math.abs(data[idx + 1] - data[nextIdx + 1]) +
                        Math.abs(data[idx + 2] - data[nextIdx + 2]);
            
            if (diff > threshold) {
                horizontalEdges++;
            }
        }
    }
    
    return horizontalEdges;
}

function rotateCanvas(sourceCanvas, angle) {
    const radians = (angle * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    
    const newWidth = Math.abs(sourceCanvas.width * cos) + Math.abs(sourceCanvas.height * sin);
    const newHeight = Math.abs(sourceCanvas.width * sin) + Math.abs(sourceCanvas.height * cos);
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    const ctx = tempCanvas.getContext('2d');
    
    ctx.translate(newWidth / 2, newHeight / 2);
    ctx.rotate(radians);
    ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);
    
    return tempCanvas;
}

// ==================== BACKGROUND REMOVAL ====================
async function removeBackground(side) {
    console.log(`✂️ Removing background from ${side}...`);
    const canvas = side === 'front' ? state.frontCanvas : state.backCanvas;
    const tolerance = parseInt(document.getElementById(`${side}Tolerance`).value);
    const processingDiv = side === 'front' ? 'frontProcessing' : 'backProcessing';
    
    document.getElementById(processingDiv).style.display = 'flex';
    updateStatus('processing', `Rimozione sfondo ${side} (tolleranza: ${tolerance})...`);
    
    try {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Flood fill da tutti i bordi
        floodFillFromEdges(imageData, tolerance);
        
        ctx.putImageData(imageData, 0, 0);
        
        // Update state
        if (side === 'front') {
            state.frontBgRemoved = true;
        } else {
            state.backBgRemoved = true;
        }
        
        // Show eraser tool
        document.getElementById('eraserSection').style.display = 'block';
        
        updateStatus('success', `Sfondo ${side} rimosso con tolleranza ${tolerance}`);
        checkReadyToGenerate();
    } catch (error) {
        console.error(`❌ Error removing background from ${side}:`, error);
        updateStatus('error', `Errore nella rimozione sfondo ${side}`);
    } finally {
        document.getElementById(processingDiv).style.display = 'none';
    }
}

function floodFillFromEdges(imageData, tolerance) {
    const { data, width, height } = imageData;
    const visited = new Set();
    const queue = [];
    
    // Aggiungi tutti i pixel dei bordi alla queue
    for (let x = 0; x < width; x++) {
        queue.push({ x, y: 0 }); // Top
        queue.push({ x, y: height - 1 }); // Bottom
    }
    for (let y = 1; y < height - 1; y++) {
        queue.push({ x: 0, y }); // Left
        queue.push({ x: width - 1, y }); // Right
    }
    
    let processed = 0;
    const maxPixels = width * height * 0.5; // Massimo 50% dei pixel
    
    while (queue.length > 0 && processed < maxPixels) {
        const { x, y } = queue.shift();
        const key = `${x},${y}`;
        
        if (visited.has(key)) continue;
        visited.add(key);
        processed++;
        
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        
        // Se già trasparente, skip
        if (a < 128) continue;
        
        // Rendi trasparente
        data[idx + 3] = 0;
        
        // Aggiungi vicini se simili
        const neighbors = [
            { x: x - 1, y },
            { x: x + 1, y },
            { x, y: y - 1 },
            { x, y: y + 1 }
        ];
        
        for (const neighbor of neighbors) {
            if (neighbor.x < 0 || neighbor.x >= width || neighbor.y < 0 || neighbor.y >= height) continue;
            
            const nKey = `${neighbor.x},${neighbor.y}`;
            if (visited.has(nKey)) continue;
            
            const nIdx = (neighbor.y * width + neighbor.x) * 4;
            const nR = data[nIdx];
            const nG = data[nIdx + 1];
            const nB = data[nIdx + 2];
            
            const colorDiff = Math.abs(r - nR) + Math.abs(g - nG) + Math.abs(b - nB);
            
            if (colorDiff <= tolerance) {
                queue.push(neighbor);
            }
        }
    }
    
    console.log(`✓ Processed ${processed} pixels`);
}

// ==================== ERASER TOOL ====================
function toggleEraser() {
    state.eraserActive = !state.eraserActive;
    const button = document.getElementById('toggleEraserButton');
    const controls = document.getElementById('eraserControls');
    
    if (state.eraserActive) {
        button.textContent = '✓ Gomma Attiva';
        button.classList.add('bg-green-500', 'text-white');
        button.classList.remove('btn-secondary');
        controls.style.display = 'block';
        updateStatus('success', 'Gomma attiva - Clicca e trascina sulle anteprime');
    } else {
        button.textContent = '✏️ Attiva Gomma';
        button.classList.remove('bg-green-500', 'text-white');
        button.classList.add('btn-secondary');
        controls.style.display = 'none';
        updateStatus('success', 'Gomma disattivata');
    }
}

function setupCanvasInteraction(side) {
    const canvas = document.getElementById(`${side}Canvas`);
    const zoom = zoomState[side];
    
    let isDrawing = false;
    
    canvas.addEventListener('mousedown', (e) => {
        if (state.eraserActive) {
            isDrawing = true;
            eraseAtPoint(canvas, e.offsetX, e.offsetY, side);
        } else {
            zoom.isDragging = true;
            zoom.lastX = e.clientX;
            zoom.lastY = e.clientY;
            canvas.style.cursor = 'grabbing';
        }
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (state.eraserActive && isDrawing) {
            eraseAtPoint(canvas, e.offsetX, e.offsetY, side);
        } else if (zoom.isDragging) {
            const dx = e.clientX - zoom.lastX;
            const dy = e.clientY - zoom.lastY;
            zoom.offsetX += dx;
            zoom.offsetY += dy;
            zoom.lastX = e.clientX;
            zoom.lastY = e.clientY;
            redrawCanvas(side);
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        isDrawing = false;
        zoom.isDragging = false;
        canvas.style.cursor = state.eraserActive ? 'crosshair' : 'move';
    });
    
    canvas.addEventListener('mouseleave', () => {
        isDrawing = false;
        zoom.isDragging = false;
        canvas.style.cursor = state.eraserActive ? 'crosshair' : 'move';
    });
    
    // Wheel zoom
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        zoomCanvas(side, delta);
    });
}

function eraseAtPoint(canvas, x, y, side) {
    const ctx = canvas.getContext('2d');
    const zoom = zoomState[side];
    
    // Converti coordinate schermo in coordinate canvas
    const canvasX = (x - zoom.offsetX) / zoom.scale;
    const canvasY = (y - zoom.offsetY) / zoom.scale;
    
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, state.eraserSize / zoom.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// ==================== ZOOM & PAN ====================
function zoomCanvas(side, delta) {
    const zoom = zoomState[side];
    zoom.scale = Math.max(0.1, Math.min(5, zoom.scale + delta));
    console.log(`🔍 Zoom ${side}: ${zoom.scale.toFixed(2)}x`);
    redrawCanvas(side);
}

function resetZoom(side) {
    const zoom = zoomState[side];
    zoom.scale = 1;
    zoom.offsetX = 0;
    zoom.offsetY = 0;
    console.log(`🔄 Reset zoom ${side}`);
    redrawCanvas(side);
}

function redrawCanvas(side) {
    const canvas = document.getElementById(`${side}Canvas`);
    const zoom = zoomState[side];
    
    // Salva contenuto attuale
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0);
    
    // Ridisegna con zoom/pan
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(zoom.offsetX, zoom.offsetY);
    ctx.scale(zoom.scale, zoom.scale);
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();
}

// ==================== 3D GENERATION ====================
async function generate3DModel() {
    console.log('🎯 Generating 3D model...');
    updateStatus('processing', 'Generazione modello 3D in corso...');
    
    try {
        // Normalize shapes
        const { frontCanvas, backCanvas } = normalizeShapes();
        
        // Create 3D scene
        init3DScene();
        
        // Create card mesh
        const mesh = createCardMesh(frontCanvas, backCanvas);
        state.scene.add(mesh);
        state.cardMesh = mesh;
        
        // Show viewer
        document.getElementById('viewer3DContainer').style.display = 'block';
        
        // Enable export
        document.getElementById('exportGLB').disabled = false;
        document.getElementById('exportOBJ').disabled = false;
        document.getElementById('exportSection').style.display = 'block';
        
        // Animate
        animate();
        
        updateStatus('success', 'Modello 3D generato con successo!');
    } catch (error) {
        console.error('❌ Error generating 3D model:', error);
        updateStatus('error', 'Errore nella generazione del modello 3D');
    }
}

function normalizeShapes() {
    const frontCanvas = state.frontCanvas;
    const backCanvas = state.backCanvas;
    
    if (!backCanvas || !state.backImage) {
        // Solo fronte
        return { frontCanvas, backCanvas: null };
    }
    
    // Trova dimensioni massime
    const maxWidth = Math.max(frontCanvas.width, backCanvas.width);
    const maxHeight = Math.max(frontCanvas.height, backCanvas.height);
    
    console.log(`📏 Normalizing to ${maxWidth}x${maxHeight}`);
    
    // Crea canvas normalizzati
    const normalizedFront = document.createElement('canvas');
    normalizedFront.width = maxWidth;
    normalizedFront.height = maxHeight;
    const frontCtx = normalizedFront.getContext('2d');
    frontCtx.drawImage(frontCanvas, 
        (maxWidth - frontCanvas.width) / 2, 
        (maxHeight - frontCanvas.height) / 2);
    
    const normalizedBack = document.createElement('canvas');
    normalizedBack.width = maxWidth;
    normalizedBack.height = maxHeight;
    const backCtx = normalizedBack.getContext('2d');
    backCtx.drawImage(backCanvas, 
        (maxWidth - backCanvas.width) / 2, 
        (maxHeight - backCanvas.height) / 2);
    
    return { frontCanvas: normalizedFront, backCanvas: normalizedBack };
}

function init3DScene() {
    const container = document.getElementById('viewer3D');
    
    // Scene
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0xf0f0f0);
    
    // Camera
    state.camera = new THREE.PerspectiveCamera(
        45,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    state.camera.position.set(0, 0, 150);
    
    // Renderer
    state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    state.renderer.setSize(container.clientWidth, container.clientHeight);
    state.renderer.setPixelRatio(window.devicePixelRatio);
    container.innerHTML = '';
    container.appendChild(state.renderer.domElement);
    
    // Controls
    state.controls = new OrbitControls(state.camera, state.renderer.domElement);
    state.controls.enableDamping = true;
    state.controls.dampingFactor = 0.05;
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    state.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    state.scene.add(directionalLight);
}

function createCardMesh(frontCanvas, backCanvas) {
    const cardWidth = 85.6;  // Poker card width in mm
    const cardHeight = 53.98; // Poker card height in mm
    const cardThickness = 0.3;
    
    const geometry = new THREE.BoxGeometry(cardWidth, cardHeight, cardThickness);
    
    // Create textures
    const frontTexture = new THREE.CanvasTexture(frontCanvas);
    frontTexture.needsUpdate = true;
    
    const materials = [];
    
    // Front
    materials.push(new THREE.MeshStandardMaterial({ 
        map: frontTexture,
        side: THREE.FrontSide
    }));
    
    // Back
    if (backCanvas) {
        const backTexture = new THREE.CanvasTexture(backCanvas);
        backTexture.needsUpdate = true;
        materials.push(new THREE.MeshStandardMaterial({ 
            map: backTexture,
            side: THREE.FrontSide
        }));
    } else {
        materials.push(new THREE.MeshStandardMaterial({ 
            color: 0xcccccc,
            side: THREE.FrontSide
        }));
    }
    
    // Edges (white)
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
    console.log(`💾 Exporting model as ${format.toUpperCase()}...`);
    updateStatus('processing', `Esportazione ${format.toUpperCase()} in corso...`);
    
    try {
        if (format === 'glb') {
            const exporter = new GLTFExporter();
            exporter.parse(
                state.scene,
                (gltf) => {
                    const blob = new Blob([gltf], { type: 'application/octet-stream' });
                    downloadBlob(blob, 'card-3d-model.glb');
                    updateStatus('success', 'Modello GLB scaricato con successo!');
                },
                { binary: true }
            );
        } else if (format === 'obj') {
            const exporter = new OBJExporter();
            const obj = exporter.parse(state.scene);
            const blob = new Blob([obj], { type: 'text/plain' });
            downloadBlob(blob, 'card-3d-model.obj');
            updateStatus('success', 'Modello OBJ scaricato con successo!');
        }
    } catch (error) {
        console.error(`❌ Error exporting ${format}:`, error);
        updateStatus('error', `Errore nell'esportazione ${format.toUpperCase()}`);
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

// ==================== UI HELPERS ====================
function updateStatus(type, message) {
    const statusIndicator = document.getElementById('globalStatus');
    const statusMessage = document.getElementById('statusMessage');
    
    statusIndicator.className = `status-indicator status-${type}`;
    statusMessage.textContent = message;
    
    console.log(`📊 Status: ${type} - ${message}`);
}

function checkReadyToGenerate() {
    const frontReady = state.frontCanvas !== null;
    const button = document.getElementById('generate3DButton');
    const info = document.getElementById('generate3DInfo');
    
    if (frontReady) {
        button.disabled = false;
        info.textContent = state.backCanvas 
            ? 'Pronto per generare il modello 3D completo!' 
            : 'Pronto (solo fronte)';
    } else {
        button.disabled = true;
        info.textContent = 'Completa almeno il fronte';
    }
}

export { state };
