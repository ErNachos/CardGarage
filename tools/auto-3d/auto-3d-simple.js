// Auto 3D Creator - Simple & Effective Version 3.0
// Focus: Semplicità, Precisione, Controllo Utente

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';

// ==================== STATE ====================
const state = {
    frontImage: null,
    backImage: null,
    frontCanvas: null,
    backCanvas: null,
    frontOriginal: null,
    backOriginal: null,
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    cardMesh: null
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎴 Auto 3D Creator v3.0 - Simple & Effective');
    initEventListeners();
});

function initEventListeners() {
    // Image loading
    document.getElementById('frontImageLoader').addEventListener('change', (e) => loadImage(e, 'front'));
    document.getElementById('backImageLoader').addEventListener('change', (e) => loadImage(e, 'back'));
    
    // Rotation
    document.getElementById('rotateFrontCW').addEventListener('click', () => manualRotate('front', -1));
    document.getElementById('rotateFrontCCW').addEventListener('click', () => manualRotate('front', 1));
    document.getElementById('autoRotateFront').addEventListener('click', () => autoRotate('front'));
    document.getElementById('undoRotateFront').addEventListener('click', () => undoRotation('front'));
    
    document.getElementById('rotateBackCW').addEventListener('click', () => manualRotate('back', -1));
    document.getElementById('rotateBackCCW').addEventListener('click', () => manualRotate('back', 1));
    document.getElementById('autoRotateBack').addEventListener('click', () => autoRotate('back'));
    document.getElementById('undoRotateBack').addEventListener('click', () => undoRotation('back'));
    
    // Background removal - Click mode
    document.getElementById('removeBgFront').addEventListener('click', () => enableBackgroundPicker('front'));
    document.getElementById('removeBgBack').addEventListener('click', () => enableBackgroundPicker('back'));
    
    // Tolerance sliders
    document.getElementById('frontTolerance').addEventListener('input', (e) => {
        document.getElementById('frontToleranceValue').textContent = e.target.value;
    });
    document.getElementById('backTolerance').addEventListener('input', (e) => {
        document.getElementById('backToleranceValue').textContent = e.target.value;
    });
    
    // 3D Generation
    document.getElementById('generate3D').addEventListener('click', generate3D);
    
    // Export
    document.getElementById('exportGLB').addEventListener('click', () => exportModel('glb'));
    document.getElementById('exportOBJ').addEventListener('click', () => exportModel('obj'));
}

// ==================== IMAGE LOADING ====================
async function loadImage(event, side) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log(`📸 Loading ${side} image:`, file.name);
    showStatus(`Caricamento ${side}...`, 'info');
    
    try {
        const img = await fileToImage(file);
        
        if (side === 'front') {
            state.frontImage = img;
            state.frontOriginal = img;
            state.frontCanvas = document.getElementById('frontCanvas');
            drawImageOnCanvas(img, state.frontCanvas);
            document.getElementById('frontControls').style.display = 'block';
            showStatus('Immagine fronte caricata! Puoi ruotarla o rimuovere lo sfondo.', 'success');
        } else {
            state.backImage = img;
            state.backOriginal = img;
            state.backCanvas = document.getElementById('backCanvas');
            drawImageOnCanvas(img, state.backCanvas);
            document.getElementById('backControls').style.display = 'block';
            document.getElementById('backPlaceholder').style.display = 'none';
            showStatus('Immagine retro caricata! Puoi ruotarla o rimuovere lo sfondo.', 'success');
        }
        
        checkReadyFor3D();
    } catch (error) {
        console.error(`❌ Error loading ${side}:`, error);
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

// ==================== ROTATION ====================
function manualRotate(side, direction) {
    const angle = direction; // ±1 degree
    const canvas = side === 'front' ? state.frontCanvas : state.backCanvas;
    
    console.log(`🔄 Manual rotate ${side}: ${angle > 0 ? 'CCW' : 'CW'} ${Math.abs(angle)}°`);
    
    const rotated = rotateCanvas(canvas, angle);
    canvas.width = rotated.width;
    canvas.height = rotated.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(rotated, 0, 0);
    
    // Show undo button
    document.getElementById(`undoRotate${side === 'front' ? 'Front' : 'Back'}`).style.display = 'inline-block';
    
    showStatus(`${side} ruotato di ${angle}°`, 'success');
}

async function autoRotate(side) {
    const canvas = side === 'front' ? state.frontCanvas : state.backCanvas;
    
    console.log(`🤖 Auto-rotating ${side}...`);
    showStatus(`Auto-rotazione ${side} in corso...`, 'info');
    
    try {
        // Trova il contorno della carta
        const angle = detectCardAngle(canvas);
        console.log(`✓ Detected angle: ${angle.toFixed(2)}°`);
        
        if (Math.abs(angle) < 0.5) {
            showStatus(`${side} già dritto (${angle.toFixed(2)}°)`, 'success');
            return;
        }
        
        // Ruota
        const rotated = rotateCanvas(canvas, -angle); // Negativo per correggere
        canvas.width = rotated.width;
        canvas.height = rotated.height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(rotated, 0, 0);
        
        // Show undo
        document.getElementById(`undoRotate${side === 'front' ? 'Front' : 'Back'}`).style.display = 'inline-block';
        
        showStatus(`${side} raddrizzato (corretto ${angle.toFixed(1)}°)`, 'success');
    } catch (error) {
        console.error(`❌ Auto-rotation error:`, error);
        showStatus(`Errore auto-rotazione ${side}`, 'error');
    }
}

function detectCardAngle(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // 1. Trova tutti i pixel NON trasparenti (la carta)
    const cardPixels = [];
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const alpha = data[idx + 3];
            
            if (alpha > 128) { // Pixel opaco = parte della carta
                cardPixels.push({ x, y });
            }
        }
    }
    
    if (cardPixels.length < 100) {
        console.warn('⚠️ Too few card pixels found');
        return 0;
    }
    
    // 2. Trova il rettangolo orientato minimo (minAreaRect)
    // Semplificazione: usa Principal Component Analysis (PCA)
    const angle = calculateRotationAnglePCA(cardPixels);
    
    return angle;
}

function calculateRotationAnglePCA(points) {
    // Calcola il centroide
    let sumX = 0, sumY = 0;
    for (const p of points) {
        sumX += p.x;
        sumY += p.y;
    }
    const centerX = sumX / points.length;
    const centerY = sumY / points.length;
    
    // Calcola la matrice di covarianza
    let covXX = 0, covXY = 0, covYY = 0;
    for (const p of points) {
        const dx = p.x - centerX;
        const dy = p.y - centerY;
        covXX += dx * dx;
        covXY += dx * dy;
        covYY += dy * dy;
    }
    covXX /= points.length;
    covXY /= points.length;
    covYY /= points.length;
    
    // Calcola l'angolo del primo autovettore (direzione principale)
    const angle = 0.5 * Math.atan2(2 * covXY, covXX - covYY);
    const degrees = angle * 180 / Math.PI;
    
    // Normalizza tra -45° e +45° (assumiamo mai più di 45° di rotazione)
    let normalized = degrees;
    if (normalized > 45) normalized -= 90;
    if (normalized < -45) normalized += 90;
    
    return normalized;
}

function rotateCanvas(sourceCanvas, angleDegrees) {
    const radians = (angleDegrees * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    
    // Calcola nuove dimensioni
    const newWidth = Math.abs(sourceCanvas.width * cos) + Math.abs(sourceCanvas.height * sin);
    const newHeight = Math.abs(sourceCanvas.width * sin) + Math.abs(sourceCanvas.height * cos);
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    const ctx = tempCanvas.getContext('2d');
    
    // Trasla al centro, ruota, disegna
    ctx.translate(newWidth / 2, newHeight / 2);
    ctx.rotate(radians);
    ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);
    
    return tempCanvas;
}

function undoRotation(side) {
    console.log(`↶ Undo rotation ${side}`);
    
    const original = side === 'front' ? state.frontOriginal : state.backOriginal;
    const canvas = side === 'front' ? state.frontCanvas : state.backCanvas;
    
    drawImageOnCanvas(original, canvas);
    
    // Hide undo button
    document.getElementById(`undoRotate${side === 'front' ? 'Front' : 'Back'}`).style.display = 'none';
    
    showStatus(`Rotazione ${side} annullata`, 'success');
}

// ==================== BACKGROUND REMOVAL ====================
function enableBackgroundPicker(side) {
    const canvas = side === 'front' ? state.frontCanvas : state.backCanvas;
    const tolerance = parseInt(document.getElementById(`${side}Tolerance`).value);
    
    showStatus(`Clicca sullo sfondo da rimuovere (tolleranza: ${tolerance})`, 'info');
    
    // Aggiungi event listener per click
    const clickHandler = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
        const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
        
        console.log(`🖱️ Background color picked at (${x}, ${y})`);
        
        // Rimuovi lo sfondo
        removeBackgroundColor(canvas, x, y, tolerance);
        
        // Rimuovi listener
        canvas.removeEventListener('click', clickHandler);
        canvas.style.cursor = 'default';
        
        showStatus(`Sfondo ${side} rimosso`, 'success');
    };
    
    canvas.addEventListener('click', clickHandler);
    canvas.style.cursor = 'crosshair';
}

function removeBackgroundColor(canvas, clickX, clickY, tolerance) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Ottieni il colore cliccato
    const clickIdx = (clickY * canvas.width + clickX) * 4;
    const targetR = data[clickIdx];
    const targetG = data[clickIdx + 1];
    const targetB = data[clickIdx + 2];
    
    console.log(`🎨 Target color: RGB(${targetR}, ${targetG}, ${targetB}), Tolerance: ${tolerance}`);
    
    let removedPixels = 0;
    
    // Rimuovi tutti i pixel simili al colore target
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const colorDiff = Math.abs(r - targetR) + Math.abs(g - targetG) + Math.abs(b - targetB);
        
        if (colorDiff <= tolerance) {
            data[i + 3] = 0; // Rendi trasparente
            removedPixels++;
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    console.log(`✓ Removed ${removedPixels} pixels (${((removedPixels / (canvas.width * canvas.height)) * 100).toFixed(1)}%)`);
}

// ==================== 3D GENERATION ====================
async function generate3D() {
    console.log('🎯 Generating 3D model...');
    showStatus('Generazione modello 3D...', 'info');
    
    try {
        // Inizializza scena 3D
        init3DScene();
        
        // Crea mesh della carta
        const mesh = createCardMesh(state.frontCanvas, state.backCanvas);
        state.scene.add(mesh);
        state.cardMesh = mesh;
        
        // Mostra viewer
        document.getElementById('viewer3D').style.display = 'block';
        document.getElementById('exportSection').style.display = 'block';
        document.getElementById('exportGLB').disabled = false;
        document.getElementById('exportOBJ').disabled = false;
        
        // Avvia animazione
        animate();
        
        showStatus('Modello 3D generato!', 'success');
    } catch (error) {
        console.error('❌ 3D generation error:', error);
        showStatus('Errore generazione 3D', 'error');
    }
}

function init3DScene() {
    const container = document.getElementById('viewer3D');
    
    // Scene
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0xf5f5f5);
    
    // Camera
    state.camera = new THREE.PerspectiveCamera(
        50,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    state.camera.position.set(0, 0, 120);
    
    // Renderer
    state.renderer = new THREE.WebGLRenderer({ antialias: true });
    state.renderer.setSize(container.clientWidth, container.clientHeight);
    state.renderer.setPixelRatio(window.devicePixelRatio);
    container.innerHTML = '';
    container.appendChild(state.renderer.domElement);
    
    // Controls
    state.controls = new OrbitControls(state.camera, state.renderer.domElement);
    state.controls.enableDamping = true;
    
    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    state.scene.add(ambient);
    
    const directional = new THREE.DirectionalLight(0xffffff, 0.5);
    directional.position.set(5, 5, 5);
    state.scene.add(directional);
}

function createCardMesh(frontCanvas, backCanvas) {
    // Dimensioni standard carta Pokémon: 63mm x 88mm
    const width = 63;
    const height = 88;
    const thickness = 0.3;
    
    const geometry = new THREE.BoxGeometry(width, height, thickness);
    
    // Textures
    const frontTexture = new THREE.CanvasTexture(frontCanvas);
    frontTexture.needsUpdate = true;
    
    const materials = [];
    
    // Front (index 0)
    materials.push(new THREE.MeshStandardMaterial({
        map: frontTexture,
        side: THREE.FrontSide,
        transparent: true
    }));
    
    // Back (index 1)
    if (backCanvas && state.backImage) {
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
    console.log(`💾 Exporting ${format.toUpperCase()}...`);
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
        console.error(`❌ Export error:`, error);
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

// ==================== UI HELPERS ====================
function showStatus(message, type) {
    const statusEl = document.getElementById('statusMessage');
    const indicator = document.getElementById('statusIndicator');
    
    statusEl.textContent = message;
    indicator.className = `status-indicator status-${type}`;
    
    console.log(`📊 ${type.toUpperCase()}: ${message}`);
}

function checkReadyFor3D() {
    const ready = state.frontCanvas !== null;
    document.getElementById('generate3D').disabled = !ready;
}
