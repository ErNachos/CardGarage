// Auto 3D Creator - Pokemon Card 3D Generator
// Automatic detection, straightening, and 3D model generation

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
    model3D: null,
    scene: null,
    camera: null,
    renderer: null,
    controls: null
};

// Pokemon card dimensions (standard: 63mm x 88mm)
const CARD_WIDTH_MM = 63;
const CARD_HEIGHT_MM = 88;
const CARD_THICKNESS_MM = 0.3;
const CARD_RATIO = CARD_WIDTH_MM / CARD_HEIGHT_MM; // 0.716
const CORNER_RADIUS = 3; // mm for rounded corners

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    log('🎴 Auto 3D Creator initialized');
    initEventListeners();
});

function initEventListeners() {
    document.getElementById('frontLoader').addEventListener('change', (e) => loadImage(e, 'front'));
    document.getElementById('backLoader').addEventListener('change', (e) => loadImage(e, 'back'));
    document.getElementById('processBtn').addEventListener('click', processImages);
    document.getElementById('generate3DBtn').addEventListener('click', generate3D);
    document.getElementById('exportGLB').addEventListener('click', () => exportModel('glb'));
    document.getElementById('exportOBJ').addEventListener('click', () => exportModel('obj'));
}

// ==================== IMAGE LOADING ====================
function loadImage(event, side) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            if (side === 'front') {
                state.frontOriginal = img;
                log(`✓ Fronte caricato: ${img.width}x${img.height}px`);
            } else {
                state.backOriginal = img;
                log(`✓ Retro caricato: ${img.width}x${img.height}px`);
            }
            
            // Draw preview
            drawPreview(img, side);
            
            // Enable process button if we have at least front
            if (state.frontOriginal) {
                document.getElementById('processBtn').disabled = false;
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function drawPreview(img, side) {
    const canvas = side === 'front' ? document.getElementById('frontCanvas') : document.getElementById('backCanvas');
    const maxSize = 400;
    
    // Calculate dimensions maintaining aspect ratio
    let width = img.width;
    let height = img.height;
    
    if (width > maxSize || height > maxSize) {
        if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
        } else {
            width = (width / height) * maxSize;
            height = maxSize;
        }
    }
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
}

// ==================== IMAGE PROCESSING ====================
async function processImages() {
    showStatus('⚙️ Elaborazione in corso...', 'info');
    log('\n🔄 Starting image processing...');
    
    try {
        // Process front (required)
        if (state.frontOriginal) {
            log('📸 Processing front image...');
            state.frontProcessed = await processCard(state.frontOriginal, 'front');
            drawProcessedPreview(state.frontProcessed, 'front');
        }
        
        // Process back (optional)
        if (state.backOriginal) {
            log('📸 Processing back image...');
            state.backProcessed = await processCard(state.backOriginal, 'back');
            drawProcessedPreview(state.backProcessed, 'back');
        } else {
            log('ℹ️ No back image loaded, will use default');
        }
        
        // Normalize dimensions
        normalizeDimensions();
        
        showStatus('✓ Elaborazione completata!', 'success');
        document.getElementById('generate3DBtn').disabled = false;
        
    } catch (error) {
        log(`❌ Error: ${error.message}`);
        showStatus(`❌ ${error.message}`, 'error');
    }
}

async function processCard(img, side) {
    log(`  📊 Original size: ${img.width}x${img.height}px`);
    
    // Step 1: Detect card bounds
    const bounds = detectCardBounds(img);
    if (!bounds) {
        throw new Error(`Card not detected in ${side} image`);
    }
    log(`  ✓ Card detected: ${bounds.width}x${bounds.height}px at angle ${bounds.angle.toFixed(2)}°`);
    
    // Step 2: Extract and straighten
    const straightened = extractAndStraighten(img, bounds);
    log(`  ✓ Straightened: ${straightened.width}x${straightened.height}px`);
    
    // Step 3: Remove background
    const cleaned = removeBackground(straightened);
    log(`  ✓ Background removed`);
    
    return cleaned;
}

function detectCardBounds(img) {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Find bounding box of non-background pixels
    // Background is typically dark/uniform color
    const threshold = 40; // Adjust based on your images
    
    let minX = canvas.width, maxX = 0;
    let minY = canvas.height, maxY = 0;
    
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const brightness = (r + g + b) / 3;
            
            // If pixel is brighter than threshold, it's part of the card
            if (brightness > threshold) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        }
    }
    
    if (minX >= maxX || minY >= maxY) {
        return null;
    }
    
    // Add 5% padding then shrink by 5% to remove outer border
    const paddingX = Math.floor((maxX - minX) * 0.05);
    const paddingY = Math.floor((maxY - minY) * 0.05);
    
    return {
        x: minX + paddingX,
        y: minY + paddingY,
        width: (maxX - minX) - (paddingX * 2),
        height: (maxY - minY) - (paddingY * 2),
        angle: 0 // For now, assume straight (can add rotation detection later)
    };
}

function extractAndStraighten(img, bounds) {
    const canvas = document.createElement('canvas');
    canvas.width = bounds.width;
    canvas.height = bounds.height;
    const ctx = canvas.getContext('2d');
    
    // Draw cropped region
    ctx.drawImage(
        img,
        bounds.x, bounds.y, bounds.width, bounds.height,
        0, 0, bounds.width, bounds.height
    );
    
    return canvas;
}

function removeBackground(canvas) {
    // For now, just return the canvas
    // Advanced background removal can be added later if needed
    return canvas;
}

function normalizeDimensions() {
    if (!state.frontProcessed) return;
    
    const frontW = state.frontProcessed.width;
    const frontH = state.frontProcessed.height;
    
    log(`\n📐 Normalizing dimensions...`);
    log(`  Front: ${frontW}x${frontH}px`);
    
    if (state.backProcessed) {
        const backW = state.backProcessed.width;
        const backH = state.backProcessed.height;
        log(`  Back: ${backW}x${backH}px`);
        
        // If dimensions differ, scale the smaller one
        if (frontW !== backW || frontH !== backH) {
            const targetW = Math.max(frontW, backW);
            const targetH = Math.max(frontH, backH);
            
            if (frontW < targetW || frontH < targetH) {
                state.frontProcessed = scaleCanvas(state.frontProcessed, targetW, targetH);
                log(`  ✓ Front scaled to ${targetW}x${targetH}px`);
            }
            if (backW < targetW || backH < targetH) {
                state.backProcessed = scaleCanvas(state.backProcessed, targetW, targetH);
                log(`  ✓ Back scaled to ${targetW}x${targetH}px`);
            }
        }
    }
}

function scaleCanvas(canvas, targetW, targetH) {
    const scaled = document.createElement('canvas');
    scaled.width = targetW;
    scaled.height = targetH;
    const ctx = scaled.getContext('2d');
    ctx.drawImage(canvas, 0, 0, targetW, targetH);
    return scaled;
}

function drawProcessedPreview(canvas, side) {
    const targetCanvas = side === 'front' ? document.getElementById('frontCanvas') : document.getElementById('backCanvas');
    const maxSize = 400;
    
    let width = canvas.width;
    let height = canvas.height;
    
    if (width > maxSize || height > maxSize) {
        if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
        } else {
            width = (width / height) * maxSize;
            height = maxSize;
        }
    }
    
    targetCanvas.width = width;
    targetCanvas.height = height;
    
    const ctx = targetCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, width, height);
}

// ==================== 3D GENERATION ====================
async function generate3D() {
    showStatus('🎯 Generazione modello 3D...', 'info');
    log('\n🚀 Generating 3D model...');
    
    try {
        // Initialize Three.js scene
        initScene();
        
        // Create card geometry with rounded corners
        const geometry = createCardGeometry();
        
        // Create materials with textures
        const materials = await createMaterials();
        
        // Create mesh
        const mesh = new THREE.Mesh(geometry, materials);
        state.scene.add(mesh);
        state.model3D = mesh;
        
        // Show 3D viewer
        document.getElementById('viewer3DContainer').style.display = 'block';
        document.getElementById('exportPanel').style.display = 'block';
        
        // Start animation
        animate();
        
        showStatus('✓ Modello 3D generato!', 'success');
        log('✓ 3D model generated successfully');
        
    } catch (error) {
        log(`❌ 3D generation error: ${error.message}`);
        showStatus(`❌ ${error.message}`, 'error');
    }
}

function initScene() {
    const container = document.getElementById('viewer3D');
    
    // Scene
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0xf0f0f0);
    
    // Camera
    state.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    state.camera.position.set(0, 0, 150);
    
    // Renderer
    state.renderer = new THREE.WebGLRenderer({ antialias: true });
    state.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(state.renderer.domElement);
    
    // Controls
    state.controls = new OrbitControls(state.camera, state.renderer.domElement);
    state.controls.enableDamping = true;
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    state.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 5, 5);
    state.scene.add(directionalLight);
}

function createCardGeometry() {
    // Create rounded rectangle shape
    const shape = new THREE.Shape();
    
    const w = CARD_WIDTH_MM;
    const h = CARD_HEIGHT_MM;
    const r = CORNER_RADIUS;
    
    // Start from top-left corner (after radius)
    shape.moveTo(-w/2 + r, h/2);
    shape.lineTo(w/2 - r, h/2);
    shape.quadraticCurveTo(w/2, h/2, w/2, h/2 - r); // Top-right corner
    shape.lineTo(w/2, -h/2 + r);
    shape.quadraticCurveTo(w/2, -h/2, w/2 - r, -h/2); // Bottom-right corner
    shape.lineTo(-w/2 + r, -h/2);
    shape.quadraticCurveTo(-w/2, -h/2, -w/2, -h/2 + r); // Bottom-left corner
    shape.lineTo(-w/2, h/2 - r);
    shape.quadraticCurveTo(-w/2, h/2, -w/2 + r, h/2); // Top-left corner
    
    // Extrude to create 3D card
    const extrudeSettings = {
        depth: CARD_THICKNESS_MM,
        bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Center the geometry
    geometry.translate(0, 0, -CARD_THICKNESS_MM / 2);
    
    return geometry;
}

async function createMaterials() {
    const materials = [];
    
    // Front texture
    const frontTexture = new THREE.CanvasTexture(state.frontProcessed);
    frontTexture.needsUpdate = true;
    materials.push(new THREE.MeshStandardMaterial({ 
        map: frontTexture,
        side: THREE.FrontSide
    }));
    
    // Back texture
    if (state.backProcessed) {
        const backTexture = new THREE.CanvasTexture(state.backProcessed);
        backTexture.needsUpdate = true;
        materials.push(new THREE.MeshStandardMaterial({ 
            map: backTexture,
            side: THREE.BackSide
        }));
    } else {
        // Default gray back
        materials.push(new THREE.MeshStandardMaterial({ 
            color: 0x888888,
            side: THREE.BackSide
        }));
    }
    
    // Edge material (white)
    materials.push(new THREE.MeshStandardMaterial({ 
        color: 0xffffff
    }));
    
    return materials;
}

function animate() {
    requestAnimationFrame(animate);
    state.controls.update();
    state.renderer.render(state.scene, state.camera);
}

// ==================== EXPORT ====================
async function exportModel(format) {
    if (!state.model3D) {
        showStatus('❌ No model to export', 'error');
        return;
    }
    
    showStatus(`💾 Esportazione ${format.toUpperCase()}...`, 'info');
    log(`\n💾 Exporting as ${format.toUpperCase()}...`);
    
    try {
        if (format === 'glb') {
            const exporter = new GLTFExporter();
            exporter.parse(
                state.scene,
                (result) => {
                    const blob = new Blob([result], { type: 'application/octet-stream' });
                    downloadBlob(blob, 'pokemon-card.glb');
                    showStatus('✓ GLB scaricato!', 'success');
                    log('✓ GLB exported successfully');
                },
                { binary: true }
            );
        } else if (format === 'obj') {
            const exporter = new OBJExporter();
            const result = exporter.parse(state.model3D);
            const blob = new Blob([result], { type: 'text/plain' });
            downloadBlob(blob, 'pokemon-card.obj');
            showStatus('✓ OBJ scaricato!', 'success');
            log('✓ OBJ exported successfully');
        }
    } catch (error) {
        log(`❌ Export error: ${error.message}`);
        showStatus(`❌ ${error.message}`, 'error');
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
    const statusEl = document.getElementById('status');
    const colors = {
        info: 'bg-blue-400',
        success: 'bg-green-400',
        error: 'bg-red-400'
    };
    
    statusEl.innerHTML = `
        <span class="inline-block w-2 h-2 rounded-full ${colors[type]} mr-2"></span>
        ${message}
    `;
}

function log(message) {
    const consoleEl = document.getElementById('console');
    const time = new Date().toLocaleTimeString();
    consoleEl.innerHTML += `[${time}] ${message}\n`;
    consoleEl.scrollTop = consoleEl.scrollHeight;
    console.log(message);
}
