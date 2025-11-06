import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

document.addEventListener('DOMContentLoaded', () => {
    // ================== DOM ELEMENTS ==================
    
    // Canvases
    const frontCanvas = document.getElementById('frontCanvas');
    const backCanvas = document.getElementById('backCanvas');
    const frontCtx = frontCanvas.getContext('2d');
    const backCtx = backCanvas.getContext('2d');
    
    // Sections
    const frontSection = document.getElementById('frontSection');
    const backSection = document.getElementById('backSection');
    const viewer3DContainer = document.getElementById('viewer3DContainer');
    
    // Controls
    const frontImageLoader = document.getElementById('frontImageLoader');
    const backImageLoader = document.getElementById('backImageLoader');
    const frontStatus = document.getElementById('frontStatus');
    const backStatus = document.getElementById('backStatus');
    
    const tabFront = document.getElementById('tabFront');
    const tabBack = document.getElementById('tabBack');
    const currentSideIndicator = document.getElementById('currentSideIndicator');
    const zoomSlider = document.getElementById('zoomSlider');
    const zoomValue = document.getElementById('zoomValue');
    
    const generate3DStatus = document.getElementById('generate3DStatus');
    
    const startAlignButton = document.getElementById('startAlignButton');
    const resetAlignButton = document.getElementById('resetAlignButton');
    const alignAngle = document.getElementById('alignAngle');
    const alignPoint1 = document.getElementById('alignPoint1');
    const alignPoint2 = document.getElementById('alignPoint2');
    
    const pickColorButton = document.getElementById('pickColorButton');
    const colorPicker = document.getElementById('colorPicker');
    const tolerance = document.getElementById('tolerance');
    const toleranceValue = document.getElementById('toleranceValue');
    const minSpotSize = document.getElementById('minSpotSize');
    const minSpotSizeValue = document.getElementById('minSpotSizeValue');
    const cutButton = document.getElementById('cutButton');
    const undoCutButton = document.getElementById('undoCutButton');
    
    const refineSection = document.getElementById('refineSection');
    const toggleEraserButton = document.getElementById('toggleEraserButton');
    const eraserControls = document.getElementById('eraserControls');
    const eraserSize = document.getElementById('eraserSize');
    const eraserSizeValue = document.getElementById('eraserSizeValue');
    const showOutlines = document.getElementById('showOutlines');
    
    const magnifierCanvas = document.getElementById('magnifierCanvas');
    const magnifierCtx = magnifierCanvas.getContext('2d');
    magnifierCanvas.width = 150;
    magnifierCanvas.height = 150;
    
    const generate3DButton = document.getElementById('generate3DButton');
    const exportSection = document.getElementById('exportSection');
    const exportGLB = document.getElementById('exportGLB');
    const exportOBJ = document.getElementById('exportOBJ');
    const resetAll = document.getElementById('resetAll');
    
    const statusMessage = document.getElementById('statusMessage');
    
    // ================== STATE MANAGEMENT ==================
    
    let currentSide = 'front'; // 'front' or 'back'
    let selectedColor = { r: 255, g: 255, b: 255 };
    let currentTolerance = 10;
    let currentMinSpotSize = 100; // Minimum spot size to keep
    let zoomLevel = 1.0;
    let panX = 0;
    let panY = 0;
    let isPickingColor = false; // Color picker mode
    let isAlignMode = false; // Alignment mode (only active when button pressed)
    let isEraserMode = false; // Eraser mode
    let currentEraserSize = 20; // Eraser brush size
    let showPixelOutlines = false; // Show pixel cluster outlines
    let isErasing = false; // Currently erasing
    let eraserImageData = null; // Buffer per operazioni gomma più veloci
    let lastEraseX = -1; // Ultima posizione X per interpolazione
    let lastEraseY = -1; // Ultima posizione Y per interpolazione
    
    // State for each side
    const state = {
        front: {
            originalImage: null,
            alignedImage: null,
            croppedImageData: null,
            beforeCropImage: null, // Backup before crop
            alignPoints: [],
            rotationAngle: 0,
            hasAlignment: false,
            hasCrop: false
        },
        back: {
            originalImage: null,
            alignedImage: null,
            croppedImageData: null,
            beforeCropImage: null, // Backup before crop
            alignPoints: [],
            rotationAngle: 0,
            hasAlignment: false,
            hasCrop: false
        }
    };
    
    // 3D Model
    let scene, camera, renderer, controls, cardMesh;
    
    // ================== INITIALIZATION ==================
    
    function init() {
        resizeCanvases();
        window.addEventListener('resize', resizeCanvases);
        
        // Event Listeners
        frontImageLoader.addEventListener('change', (e) => handleImageUpload(e, 'front'));
        backImageLoader.addEventListener('change', (e) => handleImageUpload(e, 'back'));
        
        // Tab buttons
        tabFront.addEventListener('click', () => switchTab('front'));
        tabBack.addEventListener('click', () => switchTab('back'));
        
        // Zoom
        zoomSlider.addEventListener('input', handleZoomChange);
        
        frontCanvas.addEventListener('click', (e) => handleCanvasClick(e, 'front'));
        backCanvas.addEventListener('click', (e) => handleCanvasClick(e, 'back'));
        
        // Magnifier on hover
        frontCanvas.addEventListener('mousemove', handleCanvasHover);
        backCanvas.addEventListener('mousemove', handleCanvasHover);
        frontCanvas.addEventListener('mouseleave', hideMagnifier);
        backCanvas.addEventListener('mouseleave', hideMagnifier);
        
        // Mouse interactions
        frontCanvas.addEventListener('mousedown', handleMouseDown);
        backCanvas.addEventListener('mousedown', handleMouseDown);
        frontCanvas.addEventListener('mousemove', handleMouseMove);
        backCanvas.addEventListener('mousemove', handleMouseMove);
        frontCanvas.addEventListener('mouseup', handleMouseUp);
        backCanvas.addEventListener('mouseup', handleMouseUp);
        frontCanvas.addEventListener('mouseleave', handleMouseUp);
        backCanvas.addEventListener('mouseleave', handleMouseUp);
        
        // Prevent context menu
        frontCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
        backCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        startAlignButton.addEventListener('click', startAlignment);
        resetAlignButton.addEventListener('click', resetAlignPoints);
        
        pickColorButton.addEventListener('click', toggleColorPicker);
        colorPicker.addEventListener('change', updateColorFromPicker);
        tolerance.addEventListener('input', updateTolerance);
        minSpotSize.addEventListener('input', updateMinSpotSize);
        cutButton.addEventListener('click', performCut);
        undoCutButton.addEventListener('click', undoCut);
        
        toggleEraserButton.addEventListener('click', toggleEraser);
        eraserSize.addEventListener('input', updateEraserSize);
        showOutlines.addEventListener('change', toggleOutlines);
        
        generate3DButton.addEventListener('click', generate3DModel);
        exportGLB.addEventListener('click', () => exportModel('glb'));
        exportOBJ.addEventListener('click', () => exportModel('obj'));
        resetAll.addEventListener('click', resetTool);
    }
    
    function resizeCanvases() {
        const width = frontSection.clientWidth;
        const height = frontSection.clientHeight;
        
        frontCanvas.width = width;
        frontCanvas.height = height;
        backCanvas.width = width;
        backCanvas.height = height;
        
        redrawAll();
    }
    
    function switchTab(side) {
        currentSide = side;
        
        // Update tab buttons
        if (side === 'front') {
            tabFront.classList.add('active');
            tabBack.classList.remove('active');
            currentSideIndicator.textContent = 'FRONTE';
        } else {
            tabBack.classList.add('active');
            tabFront.classList.remove('active');
            currentSideIndicator.textContent = 'RETRO';
        }
        
        updateUI();
        updateStatusMessage();
    }
    
    function handleZoomChange(e) {
        zoomLevel = e.target.value / 100;
        zoomValue.textContent = e.target.value;
        drawImage(currentSide);
    }
    
    // ================== IMAGE LOADING ==================
    
    function handleImageUpload(e, side) {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) {
            showStatus('Seleziona un file immagine valido', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                state[side].originalImage = img;
                state[side].alignedImage = null;
                state[side].croppedImageData = null;
                state[side].alignPoints = [];
                state[side].hasAlignment = false;
                state[side].hasCrop = false;
                
                if (side === 'front') {
                    frontStatus.textContent = '✅ Caricato';
                    frontStatus.className = 'text-xs text-green-600 font-semibold';
                } else {
                    backStatus.textContent = '✅ Caricato';
                    backStatus.className = 'text-xs text-green-600 font-semibold';
                }
                
                drawImage(side);
                checkGenerate3DReady();
                updateStatusMessage();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    function drawImage(side) {
        const canvas = side === 'front' ? frontCanvas : backCanvas;
        const ctx = side === 'front' ? frontCtx : backCtx;
        const img = state[side].alignedImage || state[side].originalImage;
        
        if (!img) return;
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Calculate dimensions maintaining aspect ratio (90% of canvas size)
        const containerRatio = canvas.width / canvas.height;
        const imageRatio = img.width / img.height;
        
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
        
        // Apply zoom and pan
        drawWidth *= zoomLevel;
        drawHeight *= zoomLevel;
        offsetX = offsetX * zoomLevel + panX;
        offsetY = offsetY * zoomLevel + panY;
        
        // Save draw data for coordinate transformations
        canvas.imageDrawData = { drawWidth, drawHeight, offsetX, offsetY };
        
        // Clear and draw
        ctx.fillStyle = '#374151';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        ctx.restore();
        
        // Draw align points if any
        if (state[side].alignPoints.length > 0) {
            ctx.fillStyle = '#ff0000';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            
            state[side].alignPoints.forEach((pt, idx) => {
                const screenX = offsetX + (pt.x / img.width) * drawWidth;
                const screenY = offsetY + (pt.y / img.height) * drawHeight;
                
                ctx.beginPath();
                ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                ctx.fillStyle = '#ffffff';
                ctx.font = '14px Arial';
                ctx.fillText(String(idx + 1), screenX - 4, screenY + 5);
                ctx.fillStyle = '#ff0000';
            });
            
            // Draw line between points
            if (state[side].alignPoints.length === 2) {
                const p1 = state[side].alignPoints[0];
                const p2 = state[side].alignPoints[1];
                const screenX1 = offsetX + (p1.x / img.width) * drawWidth;
                const screenY1 = offsetY + (p1.y / img.height) * drawHeight;
                const screenX2 = offsetX + (p2.x / img.width) * drawWidth;
                const screenY2 = offsetY + (p2.y / img.height) * drawHeight;
                
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(screenX1, screenY1);
                ctx.lineTo(screenX2, screenY2);
                ctx.stroke();
            }
        }
        
        // Draw pixel cluster outlines if enabled and has crop
        if (showPixelOutlines && state[side].hasCrop && state[side].croppedImageData) {
            drawPixelOutlines(ctx, state[side].croppedImageData, offsetX, offsetY, drawWidth, drawHeight);
        }
    }
    
    function drawPixelOutlines(ctx, sourceCanvas, offsetX, offsetY, drawWidth, drawHeight) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = sourceCanvas.width;
        tempCanvas.height = sourceCanvas.height;
        tempCtx.drawImage(sourceCanvas, 0, 0);
        
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        // Find edges (pixels adjacent to transparent pixels)
        ctx.save();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        
        const scaleX = drawWidth / sourceCanvas.width;
        const scaleY = drawHeight / sourceCanvas.height;
        
        for (let y = 1; y < tempCanvas.height - 1; y++) {
            for (let x = 1; x < tempCanvas.width - 1; x++) {
                const idx = (y * tempCanvas.width + x) * 4;
                const alpha = data[idx + 3];
                
                if (alpha > 0) {
                    // Check neighbors for transparency
                    const neighbors = [
                        data[((y - 1) * tempCanvas.width + x) * 4 + 3], // top
                        data[((y + 1) * tempCanvas.width + x) * 4 + 3], // bottom
                        data[(y * tempCanvas.width + (x - 1)) * 4 + 3], // left
                        data[(y * tempCanvas.width + (x + 1)) * 4 + 3]  // right
                    ];
                    
                    if (neighbors.some(n => n === 0)) {
                        // This is an edge pixel
                        const screenX = offsetX + x * scaleX;
                        const screenY = offsetY + y * scaleY;
                        ctx.fillRect(screenX, screenY, Math.max(1, scaleX), Math.max(1, scaleY));
                    }
                }
            }
        }
        
        ctx.restore();
    }
    
    function redrawAll() {
        drawImage('front');
        drawImage('back');
    }
    
    // ================== MAGNIFIER GLASS ==================
    
    function handleCanvasHover(e) {
        // Show magnifier always (for alignment and color picking)
        const canvas = e.target;
        const side = canvas === frontCanvas ? 'front' : 'back';
        const img = state[side].alignedImage || state[side].originalImage;
        
        if (!img) return;
        
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        
        // Get image coordinates
        const drawData = canvas.imageDrawData;
        if (!drawData) return;
        
        const { drawWidth, drawHeight, offsetX, offsetY } = drawData;
        const relX = (canvasX - offsetX) / drawWidth;
        const relY = (canvasY - offsetY) / drawHeight;
        
        if (relX < 0 || relX > 1 || relY < 0 || relY > 1) {
            hideMagnifier();
            return;
        }
        
        const imgX = Math.floor(relX * img.width);
        const imgY = Math.floor(relY * img.height);
        
        // Show magnifier
        showMagnifier(e.clientX, e.clientY, img, imgX, imgY);
    }
    
    function showMagnifier(screenX, screenY, img, imgX, imgY) {
        magnifierCanvas.style.display = 'block';
        magnifierCanvas.style.left = (screenX + 20) + 'px';
        magnifierCanvas.style.top = (screenY + 20) + 'px';
        
        const magnification = 5;
        const sourceSize = 30;
        const halfSource = sourceSize / 2;
        
        // Create temp canvas to get image data
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);
        
        // Clear magnifier
        magnifierCtx.clearRect(0, 0, magnifierCanvas.width, magnifierCanvas.height);
        
        // Draw magnified area
        const sx = Math.max(0, imgX - halfSource);
        const sy = Math.max(0, imgY - halfSource);
        const sw = Math.min(sourceSize, img.width - sx);
        const sh = Math.min(sourceSize, img.height - sy);
        
        magnifierCtx.imageSmoothingEnabled = false;
        magnifierCtx.drawImage(
            tempCanvas,
            sx, sy, sw, sh,
            0, 0, magnifierCanvas.width, magnifierCanvas.height
        );
        
        // Draw outer circle border
        magnifierCtx.strokeStyle = '#8b5cf6';
        magnifierCtx.lineWidth = 4;
        magnifierCtx.beginPath();
        magnifierCtx.arc(magnifierCanvas.width / 2, magnifierCanvas.height / 2, magnifierCanvas.width / 2 - 2, 0, Math.PI * 2);
        magnifierCtx.stroke();
        
        // Draw crosshair
        magnifierCtx.strokeStyle = isPickingColor ? '#ff0000' : '#00ff00';
        magnifierCtx.lineWidth = 2;
        const centerX = magnifierCanvas.width / 2;
        const centerY = magnifierCanvas.height / 2;
        
        magnifierCtx.beginPath();
        magnifierCtx.moveTo(centerX, centerY - 15);
        magnifierCtx.lineTo(centerX, centerY + 15);
        magnifierCtx.moveTo(centerX - 15, centerY);
        magnifierCtx.lineTo(centerX + 15, centerY);
        magnifierCtx.stroke();
        
        // Draw small circle at center
        magnifierCtx.beginPath();
        magnifierCtx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        magnifierCtx.fillStyle = isPickingColor ? '#ff0000' : '#00ff00';
        magnifierCtx.fill();
        
        // Draw color info
        const imageData = tempCtx.getImageData(imgX, imgY, 1, 1);
        const pixel = imageData.data;
        const hexColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
        
        magnifierCtx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        magnifierCtx.fillRect(0, magnifierCanvas.height - 30, magnifierCanvas.width, 30);
        magnifierCtx.fillStyle = '#ffffff';
        magnifierCtx.font = 'bold 11px monospace';
        magnifierCtx.textAlign = 'center';
        magnifierCtx.fillText(hexColor, centerX, magnifierCanvas.height - 15);
        magnifierCtx.font = '9px monospace';
        magnifierCtx.fillText(`RGB(${pixel[0]},${pixel[1]},${pixel[2]})`, centerX, magnifierCanvas.height - 5);
    }
    
    function hideMagnifier() {
        magnifierCanvas.style.display = 'none';
    }
    
    // ================== MOUSE INTERACTIONS ==================
    
    function handleMouseDown(e) {
        // Eraser mode with left click
        if (isEraserMode && e.button === 0) {
            isErasing = true;
            const canvas = e.target;
            const side = canvas === frontCanvas ? 'front' : 'back';
            if (side === currentSide && state[side].croppedImageData) {
                // Inizializza buffer immagine
                const ctx = state[side].croppedImageData.getContext('2d');
                eraserImageData = ctx.getImageData(0, 0, state[side].croppedImageData.width, state[side].croppedImageData.height);
                lastEraseX = -1;
                lastEraseY = -1;
                eraseAt(e);
            }
            e.preventDefault();
            return;
        }
    }
    
    function handleMouseMove(e) {
        if (isErasing) {
            eraseAt(e);
            e.preventDefault();
            return;
        }
    }
    
    function handleMouseUp() {
        if (isErasing && eraserImageData) {
            // Applica modifiche finali
            const side = currentSide;
            const ctx = state[side].croppedImageData.getContext('2d');
            ctx.putImageData(eraserImageData, 0, 0);
            
            // Aggiorna immagine visualizzata
            const resultImg = new Image();
            resultImg.onload = () => {
                if (state[side].alignedImage) {
                    state[side].alignedImage = resultImg;
                } else {
                    state[side].originalImage = resultImg;
                }
                drawImage(side);
            };
            resultImg.src = state[side].croppedImageData.toDataURL();
            
            eraserImageData = null;
            lastEraseX = -1;
            lastEraseY = -1;
        }
        isErasing = false;
    }
    
    // ================== ERASER TOOL ==================
    
    function toggleEraser() {
        isEraserMode = !isEraserMode;
        
        if (isEraserMode) {
            toggleEraserButton.textContent = '❌ Disattiva Gomma';
            toggleEraserButton.classList.remove('btn-secondary');
            toggleEraserButton.classList.add('btn-primary');
            eraserControls.style.display = 'block';
            showStatus('Modalità gomma attiva - Clicca e trascina per cancellare', 'info');
            frontCanvas.style.cursor = 'crosshair';
            backCanvas.style.cursor = 'crosshair';
        } else {
            toggleEraserButton.textContent = '🖌️ Attiva Gomma';
            toggleEraserButton.classList.remove('btn-primary');
            toggleEraserButton.classList.add('btn-secondary');
            eraserControls.style.display = 'none';
            showStatus('Modalità gomma disattivata', 'info');
            frontCanvas.style.cursor = 'default';
            backCanvas.style.cursor = 'default';
        }
    }
    
    function updateEraserSize() {
        currentEraserSize = parseInt(eraserSize.value);
        eraserSizeValue.textContent = currentEraserSize;
    }
    
    function toggleOutlines() {
        showPixelOutlines = showOutlines.checked;
        drawImage(currentSide);
    }
    
    function eraseAt(e) {
        const canvas = e.target;
        const side = canvas === frontCanvas ? 'front' : 'back';
        
        if (side !== currentSide) return;
        if (!state[side].croppedImageData || !eraserImageData) return;
        
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        
        const drawData = canvas.imageDrawData;
        if (!drawData) return;
        
        const { drawWidth, drawHeight, offsetX, offsetY } = drawData;
        const relX = (canvasX - offsetX) / drawWidth;
        const relY = (canvasY - offsetY) / drawHeight;
        
        if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return;
        
        const croppedCanvas = state[side].croppedImageData;
        const imgX = Math.floor(relX * croppedCanvas.width);
        const imgY = Math.floor(relY * croppedCanvas.height);
        
        // Interpolazione tra ultimo punto e punto corrente per evitare buchi
        if (lastEraseX !== -1 && lastEraseY !== -1) {
            const dx = imgX - lastEraseX;
            const dy = imgY - lastEraseY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const steps = Math.max(1, Math.ceil(distance / 2)); // Più passi = più fluido
            
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const interpX = Math.round(lastEraseX + dx * t);
                const interpY = Math.round(lastEraseY + dy * t);
                eraseCircle(interpX, interpY, eraserImageData, croppedCanvas.width, croppedCanvas.height);
            }
        } else {
            eraseCircle(imgX, imgY, eraserImageData, croppedCanvas.width, croppedCanvas.height);
        }
        
        lastEraseX = imgX;
        lastEraseY = imgY;
        
        // Aggiorna visualizzazione in tempo reale (più veloce perché non rigenera l'immagine)
        const ctx = croppedCanvas.getContext('2d');
        ctx.putImageData(eraserImageData, 0, 0);
        drawImage(side);
    }
    
    function eraseCircle(centerX, centerY, imageData, width, height) {
        const data = imageData.data;
        const radius = currentEraserSize / 2;
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy <= radius * radius) {
                    const px = centerX + dx;
                    const py = centerY + dy;
                    
                    if (px >= 0 && px < width && py >= 0 && py < height) {
                        const idx = (py * width + px) * 4;
                        data[idx + 3] = 0; // Set alpha to 0
                    }
                }
            }
        }
    }
    
    // ================== ALIGNMENT ==================
    
    function handleCanvasClick(e, side) {
        const canvas = side === 'front' ? frontCanvas : backCanvas;
        const img = state[side].alignedImage || state[side].originalImage;
        
        if (!img) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const { drawWidth, drawHeight, offsetX, offsetY } = canvas.imageDrawData;
        
        if (x < offsetX || x > offsetX + drawWidth || y < offsetY || y > offsetY + drawHeight) {
            return;
        }
        
        // Calculate image coordinates
        const imageX = Math.floor((x - offsetX) / drawWidth * img.width);
        const imageY = Math.floor((y - offsetY) / drawHeight * img.height);
        
        // If in color picking mode, select the color
        if (isPickingColor && currentSide === side) {
            selectColorAt(imageX, imageY, side);
            return;
        }
        
        // If in alignment mode and selecting align points
        if (isAlignMode && currentSide === side && state[side].alignPoints.length < 2) {
            state[side].alignPoints.push({ x: imageX, y: imageY });
            
            alignPoint1.textContent = state[side].alignPoints[0] ? `P1: (${state[side].alignPoints[0].x}, ${state[side].alignPoints[0].y})` : 'P1: -';
            alignPoint2.textContent = state[side].alignPoints[1] ? `P2: (${state[side].alignPoints[1].x}, ${state[side].alignPoints[1].y})` : 'P2: -';
            
            if (state[side].alignPoints.length === 2) {
                const p1 = state[side].alignPoints[0];
                const p2 = state[side].alignPoints[1];
                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                state[side].rotationAngle = -angle;
                alignAngle.textContent = `Angolo: ${(angle * 180 / Math.PI).toFixed(2)}°`;
                
                // Automatically apply alignment after second point
                applyAlignment();
            }
            
            drawImage(side);
            return;
        }
        
        // Otherwise, don't do anything (removed automatic color selection)
    }
    
    function startAlignment() {
        if (!state[currentSide].originalImage) {
            showStatus('Carica prima un\'immagine!', 'error');
            return;
        }
        
        isAlignMode = true;
        startAlignButton.textContent = '⏸️ Calibrazione Attiva...';
        startAlignButton.classList.remove('btn-primary');
        startAlignButton.classList.add('btn-warning');
        startAlignButton.disabled = true;
        
        showStatus('Modalità calibrazione attiva - Clicca su 2 punti orizzontali', 'info');
        
        // Change cursor
        frontCanvas.style.cursor = 'crosshair';
        backCanvas.style.cursor = 'crosshair';
    }
    
    function resetAlignPoints() {
        state[currentSide].alignPoints = [];
        state[currentSide].rotationAngle = 0;
        alignPoint1.textContent = 'P1: -';
        alignPoint2.textContent = 'P2: -';
        alignAngle.textContent = 'Angolo: -';
        
        // Reset alignment mode
        isAlignMode = false;
        startAlignButton.textContent = '🔄 Avvia Calibrazione Rotazione';
        startAlignButton.classList.remove('btn-warning');
        startAlignButton.classList.add('btn-primary');
        startAlignButton.disabled = false;
        
        // Reset cursor if not in other modes
        if (!isPickingColor && !isEraserMode) {
            frontCanvas.style.cursor = 'default';
            backCanvas.style.cursor = 'default';
        }
        
        drawImage(currentSide);
    }
    
    function applyAlignment() {
        const side = currentSide;
        const originalImg = state[side].originalImage;
        const angle = state[side].rotationAngle;
        
        if (!originalImg || state[side].alignPoints.length !== 2) return;
        
        showStatus('Applicazione rotazione ad alta qualità...', 'info');
        
        // Create rotated image with higher quality
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d', { alpha: true, willReadFrequently: false });
        
        // Calculate new dimensions with padding to avoid clipping
        const cos = Math.abs(Math.cos(angle));
        const sin = Math.abs(Math.sin(angle));
        const newWidth = Math.ceil(originalImg.width * cos + originalImg.height * sin);
        const newHeight = Math.ceil(originalImg.width * sin + originalImg.height * cos);
        
        // Use 2x resolution for better quality
        tempCanvas.width = newWidth * 2;
        tempCanvas.height = newHeight * 2;
        
        // Enable high quality rendering
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        
        tempCtx.save();
        tempCtx.scale(2, 2); // Scale up for better quality
        tempCtx.translate(newWidth / 2, newHeight / 2);
        tempCtx.rotate(angle);
        tempCtx.drawImage(originalImg, -originalImg.width / 2, -originalImg.height / 2, originalImg.width, originalImg.height);
        tempCtx.restore();
        
        // Convert to image with high quality
        const alignedImg = new Image();
        alignedImg.onload = () => {
            state[side].alignedImage = alignedImg;
            state[side].hasAlignment = true;
            state[side].alignPoints = [];
            
            // Reset alignment mode
            isAlignMode = false;
            startAlignButton.textContent = '🔄 Avvia Calibrazione Rotazione';
            startAlignButton.classList.remove('btn-warning');
            startAlignButton.classList.add('btn-primary');
            startAlignButton.disabled = false;
            
            // Reset cursor if not in other modes
            if (!isPickingColor && !isEraserMode) {
                frontCanvas.style.cursor = 'default';
                backCanvas.style.cursor = 'default';
            }
            
            alignPoint1.textContent = 'P1: -';
            alignPoint2.textContent = 'P2: -';
            alignAngle.textContent = 'Angolo: -';
            
            drawImage(side);
            updateStatusMessage();
            cutButton.disabled = false;
            showStatus('Rotazione applicata automaticamente!', 'success');
        };
        alignedImg.src = tempCanvas.toDataURL('image/png');
    }
    
    // ================== COLOR SELECTION & CROPPING ==================
    
    function toggleColorPicker() {
        isPickingColor = !isPickingColor;
        
        if (isPickingColor) {
            pickColorButton.textContent = '❌ Annulla Rilevamento';
            pickColorButton.classList.remove('btn-secondary');
            pickColorButton.classList.add('btn-primary');
            showStatus('Clicca sull\'immagine per rilevare il colore dello sfondo', 'info');
            // Show cursor change
            frontCanvas.style.cursor = 'crosshair';
            backCanvas.style.cursor = 'crosshair';
        } else {
            pickColorButton.textContent = '🎨 Rileva Colore dall\'Immagine';
            pickColorButton.classList.remove('btn-primary');
            pickColorButton.classList.add('btn-secondary');
            showStatus('Rilevamento colore annullato', 'info');
            frontCanvas.style.cursor = 'default';
            backCanvas.style.cursor = 'default';
            hideMagnifier();
        }
    }
    
    function selectColorAt(x, y, side) {
        const img = state[side].alignedImage || state[side].originalImage;
        if (!img) return;
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);
        
        const imageData = tempCtx.getImageData(x, y, 1, 1);
        const pixel = imageData.data;
        
        selectedColor = {
            r: pixel[0],
            g: pixel[1],
            b: pixel[2]
        };
        
        const hexColor = rgbToHex(selectedColor.r, selectedColor.g, selectedColor.b);
        colorPicker.value = hexColor;
        colorPickerValue.textContent = hexColor;
        
        // Turn off picking mode after selection
        isPickingColor = false;
        pickColorButton.textContent = '🎨 Rileva Colore dall\'Immagine';
        pickColorButton.classList.remove('btn-primary');
        pickColorButton.classList.add('btn-secondary');
        frontCanvas.style.cursor = 'default';
        backCanvas.style.cursor = 'default';
        hideMagnifier();
        
        showStatus(`Colore rilevato: ${hexColor} - Ora puoi ritagliare!`, 'success');
    }
    
    function updateColorFromPicker() {
        const hex = colorPicker.value;
        const rgb = hexToRgb(hex);
        selectedColor = rgb;
        colorPickerValue.textContent = hex;
        showStatus(`Colore impostato: ${hex}`, 'info');
    }
    
    function updateTolerance() {
        currentTolerance = parseInt(tolerance.value);
        toleranceValue.textContent = currentTolerance;
    }
    
    function updateMinSpotSize() {
        currentMinSpotSize = parseInt(minSpotSize.value);
        minSpotSizeValue.textContent = currentMinSpotSize;
    }
    
    function performCut() {
        const side = currentSide;
        const img = state[side].alignedImage || state[side].originalImage;
        
        if (!img) return;
        
        // Save backup before cutting
        state[side].beforeCropImage = img;
        
        showStatus('⏳ Elaborazione ritaglio...', 'info');
        cutButton.disabled = true;
        
        // Delay to let UI update
        setTimeout(() => {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            tempCtx.drawImage(img, 0, 0);
            
            const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
            const data = imageData.data;
            
            // Flood fill from edges to remove only external background
            const visited = new Uint8Array(img.width * img.height);
            const queue = [];
            
            // Add all edge pixels to queue
            for (let x = 0; x < img.width; x++) {
                queue.push({ x, y: 0 });
                queue.push({ x, y: img.height - 1 });
            }
            for (let y = 1; y < img.height - 1; y++) {
                queue.push({ x: 0, y });
                queue.push({ x: img.width - 1, y });
            }
            
            let processedPixels = 0;
            const totalEdgePixels = queue.length;
            let lastProgressUpdate = 0;
            
            // Flood fill algorithm con chunking ottimizzato
            function processChunk() {
                const startTime = performance.now();
                let pixelsInChunk = 0;
                const maxPixelsPerChunk = 5000; // Limita anche il numero di pixel per chunk
                
                while (queue.length > 0 && (performance.now() - startTime) < 10 && pixelsInChunk < maxPixelsPerChunk) {
                    const { x, y } = queue.shift();
                    const idx = y * img.width + x;
                    
                    if (x < 0 || x >= img.width || y < 0 || y >= img.height || visited[idx]) {
                        continue;
                    }
                    
                    const pixelIdx = idx * 4;
                    const r = data[pixelIdx];
                    const g = data[pixelIdx + 1];
                    const b = data[pixelIdx + 2];
                    
                    const diff = Math.sqrt(
                        Math.pow(r - selectedColor.r, 2) +
                        Math.pow(g - selectedColor.g, 2) +
                        Math.pow(b - selectedColor.b, 2)
                    );
                    
                    if (diff > currentTolerance) {
                        continue;
                    }
                    
                    visited[idx] = 1;
                    data[pixelIdx + 3] = 0; // Set alpha to 0
                    processedPixels++;
                    pixelsInChunk++;
                    
                    // Add neighbors to queue
                    queue.push({ x: x + 1, y });
                    queue.push({ x: x - 1, y });
                    queue.push({ x, y: y + 1 });
                    queue.push({ x, y: y - 1 });
                }
                
                if (queue.length > 0) {
                    // Update progress ogni 250ms per ridurre overhead
                    const now = performance.now();
                    if (now - lastProgressUpdate > 250) {
                        const progress = Math.min(95, Math.floor((processedPixels / (totalEdgePixels * 10)) * 100));
                        showStatus(`⏳ Elaborazione: ${progress}%`, 'info');
                        lastProgressUpdate = now;
                    }
                    requestAnimationFrame(processChunk);
                } else {
                    finalizeCut();
                }
            }
            
            function finalizeCut() {
                showStatus('🔧 Pulizia e ottimizzazione...', 'info');
                
                // Delay per permettere l'aggiornamento dell'UI
                setTimeout(() => {
                    tempCtx.putImageData(imageData, 0, 0);
                    
                    // Remove small isolated spots (noise removal)
                    const cleanedCanvas = removeSmallSpots(tempCanvas, currentMinSpotSize);
                    
                    // Auto-crop to content
                    const cropped = autoCropCanvas(cleanedCanvas);
                    
                    state[side].croppedImageData = cropped;
                    state[side].hasCrop = true;
                    
                    // Check if we need to resize to match other side
                    checkAndMatchDimensions();
                    
                    // Draw result
                    const resultImg = new Image();
                    resultImg.onload = () => {
                        if (state[side].alignedImage) {
                            state[side].alignedImage = resultImg;
                        } else {
                            state[side].originalImage = resultImg;
                        }
                        drawImage(side);
                        checkGenerate3DReady();
                        updateStatusMessage();
                        
                        // Show undo button and refine section
                        undoCutButton.style.display = 'block';
                        refineSection.style.display = 'block';
                        cutButton.disabled = false;
                        showStatus('✅ Ritaglio completato!', 'success');
                    };
                    resultImg.src = cropped.toDataURL();
                }, 50);
            }
            
            processChunk();
        }, 50);
    }
    
    function undoCut() {
        const side = currentSide;
        
        if (!state[side].beforeCropImage) {
            showStatus('Nessun ritaglio da annullare', 'warning');
            return;
        }
        
        // Restore image before crop
        if (state[side].hasAlignment) {
            state[side].alignedImage = state[side].beforeCropImage;
        } else {
            state[side].originalImage = state[side].beforeCropImage;
        }
        
        // Clear crop state
        state[side].croppedImageData = null;
        state[side].hasCrop = false;
        state[side].beforeCropImage = null;
        
        // Redraw
        drawImage(side);
        checkGenerate3DReady();
        updateStatusMessage();
        
        // Hide undo button if no backup
        if (!state.front.beforeCropImage && !state.back.beforeCropImage) {
            undoCutButton.style.display = 'none';
        }
        
        showStatus('Ritaglio annullato!', 'success');
    }
    
    function removeSmallSpots(canvas, minSize) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        
        const visited = new Uint8Array(width * height);
        const groups = [];
        
        // Find all connected components (ottimizzato)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const alphaIdx = idx * 4 + 3;
                
                if (data[alphaIdx] > 0 && !visited[idx]) {
                    // Start flood fill to find group (limita dimensione queue)
                    const group = [];
                    const queue = [{ x, y }];
                    let queuePos = 0; // Use index instead of shift for performance
                    
                    while (queuePos < queue.length && queuePos < 50000) { // Limit max iterations
                        const pos = queue[queuePos++];
                        const pIdx = pos.y * width + pos.x;
                        
                        if (pos.x < 0 || pos.x >= width || pos.y < 0 || pos.y >= height || visited[pIdx]) {
                            continue;
                        }
                        
                        const pAlphaIdx = pIdx * 4 + 3;
                        if (data[pAlphaIdx] === 0) continue;
                        
                        visited[pIdx] = 1;
                        group.push(pIdx);
                        
                        // Add neighbors (check bounds first)
                        if (pos.x + 1 < width) queue.push({ x: pos.x + 1, y: pos.y });
                        if (pos.x - 1 >= 0) queue.push({ x: pos.x - 1, y: pos.y });
                        if (pos.y + 1 < height) queue.push({ x: pos.x, y: pos.y + 1 });
                        if (pos.y - 1 >= 0) queue.push({ x: pos.x, y: pos.y - 1 });
                    }
                    
                    groups.push(group);
                }
            }
        }
        
        // Remove small groups
        for (const group of groups) {
            if (group.length < minSize) {
                for (const idx of group) {
                    data[idx * 4 + 3] = 0; // Make transparent
                }
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }
    
    function checkAndMatchDimensions() {
        // If both sides are cropped, make them same size
        if (state.front.croppedImageData && state.back.croppedImageData) {
            const frontCanvas = state.front.croppedImageData;
            const backCanvas = state.back.croppedImageData;
            
            const maxWidth = Math.max(frontCanvas.width, backCanvas.width);
            const maxHeight = Math.max(frontCanvas.height, backCanvas.height);
            
            // Resize both to same dimensions with padding
            state.front.croppedImageData = padCanvasToSize(frontCanvas, maxWidth, maxHeight);
            state.back.croppedImageData = padCanvasToSize(backCanvas, maxWidth, maxHeight);
            
            showStatus('Dimensioni uniformate: ' + maxWidth + 'x' + maxHeight + ' px', 'success');
        }
    }
    
    function padCanvasToSize(sourceCanvas, targetWidth, targetHeight) {
        if (sourceCanvas.width === targetWidth && sourceCanvas.height === targetHeight) {
            return sourceCanvas;
        }
        
        const paddedCanvas = document.createElement('canvas');
        const paddedCtx = paddedCanvas.getContext('2d');
        paddedCanvas.width = targetWidth;
        paddedCanvas.height = targetHeight;
        
        // Center the image
        const offsetX = Math.floor((targetWidth - sourceCanvas.width) / 2);
        const offsetY = Math.floor((targetHeight - sourceCanvas.height) / 2);
        
        // Draw source canvas centered
        paddedCtx.drawImage(sourceCanvas, offsetX, offsetY);
        
        return paddedCanvas;
    }
    
    function autoCropCanvas(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
        
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const alpha = data[(y * canvas.width + x) * 4 + 3];
                if (alpha > 0) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        
        const croppedWidth = maxX - minX + 1;
        const croppedHeight = maxY - minY + 1;
        
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = croppedWidth;
        croppedCanvas.height = croppedHeight;
        const croppedCtx = croppedCanvas.getContext('2d');
        
        croppedCtx.drawImage(canvas, minX, minY, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);
        
        return croppedCanvas;
    }
    
    // ================== 3D MODEL GENERATION ==================
    
    function checkGenerate3DReady() {
        const frontDone = state.front.hasCrop;
        const backDone = state.back.hasCrop;
        
        if (frontDone && backDone) {
            generate3DButton.disabled = false;
            generate3DStatus.textContent = '✅ Pronto per generare!';
            generate3DStatus.className = 'text-xs text-green-600 font-semibold text-center';
        } else if (frontDone || backDone) {
            generate3DButton.disabled = true;
            generate3DStatus.textContent = `✅ ${frontDone ? 'Fronte' : 'Retro'} fatto | ⚠️ ${frontDone ? 'Retro' : 'Fronte'} mancante`;
            generate3DStatus.className = 'text-xs text-yellow-600 font-semibold text-center';
        } else {
            generate3DButton.disabled = true;
            generate3DStatus.textContent = '⚠️ Ritaglia entrambi i lati prima';
            generate3DStatus.className = 'text-xs text-gray-500 text-center';
        }
    }
    
    function generate3DModel() {
        if (!state.front.croppedImageData || !state.back.croppedImageData) {
            showStatus('Completa il ritaglio di entrambi i lati prima!', 'error');
            return;
        }
        
        showStatus('Generazione modello 3D in corso...', 'info');
        
        // Hide canvases, show 3D viewer
        frontSection.style.display = 'none';
        backSection.style.display = 'none';
        viewer3DContainer.style.display = 'block';
        
        // Initialize Three.js scene
        init3DScene();
        
        exportSection.style.display = 'block';
        showStatus('Modello 3D generato! Ruota con il mouse.', 'success');
    }
    
    function init3DScene() {
        const container = document.getElementById('viewer3D');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);
        
        // Camera
        camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 100;
        
        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);
        
        // Controls
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        scene.add(directionalLight);
        
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight2.position.set(-50, -50, -50);
        scene.add(directionalLight2);
        
        // Create card geometry
        createCardMesh();
        
        // Animation loop
        animate();
        
        // Handle window resize
        window.addEventListener('resize', onWindowResize);
    }
    
    function createCardMesh() {
        const frontCanvas = state.front.croppedImageData;
        const backCanvas = state.back.croppedImageData;
        
        // Trova dimensioni massime per mantenere proporzioni
        const maxWidth = Math.max(frontCanvas.width, backCanvas.width);
        const maxHeight = Math.max(frontCanvas.height, backCanvas.height);
        
        // Ridimensiona entrambe le texture alla dimensione massima (così riempiono uniformemente)
        const targetResolution = 2048; // Limite risoluzione per ridurre dimensioni file
        let finalWidth = maxWidth;
        let finalHeight = maxHeight;
        
        // Se troppo grande, scala proporzionalmente
        if (maxWidth > targetResolution || maxHeight > targetResolution) {
            const scale = Math.min(targetResolution / maxWidth, targetResolution / maxHeight);
            finalWidth = Math.floor(maxWidth * scale);
            finalHeight = Math.floor(maxHeight * scale);
            showStatus(`Ridimensionamento texture a ${finalWidth}x${finalHeight} per ottimizzare dimensioni...`, 'info');
        }
        
        // Crea canvas ridimensionati per entrambe le facce
        const resizedFrontCanvas = resizeCanvas(frontCanvas, finalWidth, finalHeight);
        const resizedBackCanvas = resizeCanvas(backCanvas, finalWidth, finalHeight);
        
        // Scala per il modello 3D
        const cardWidth = finalWidth / 10; // Scale down
        const cardHeight = finalHeight / 10;
        const cardThickness = 0.03; // 0.3mm in scene units
        
        // Crea texture da canvas ridimensionati
        const frontTexture = new THREE.CanvasTexture(resizedFrontCanvas);
        const backTexture = new THREE.CanvasTexture(resizedBackCanvas);
        
        frontTexture.minFilter = THREE.LinearFilter;
        backTexture.minFilter = THREE.LinearFilter;
        frontTexture.magFilter = THREE.LinearFilter;
        backTexture.magFilter = THREE.LinearFilter;
        
        frontTexture.wrapS = THREE.ClampToEdgeWrapping;
        frontTexture.wrapT = THREE.ClampToEdgeWrapping;
        backTexture.wrapS = THREE.ClampToEdgeWrapping;
        backTexture.wrapT = THREE.ClampToEdgeWrapping;
        
        // Create materials for each face
        const materials = [
            new THREE.MeshStandardMaterial({ color: 0xcccccc }), // Right
            new THREE.MeshStandardMaterial({ color: 0xcccccc }), // Left
            new THREE.MeshStandardMaterial({ color: 0xcccccc }), // Top
            new THREE.MeshStandardMaterial({ color: 0xcccccc }), // Bottom
            new THREE.MeshStandardMaterial({ 
                map: frontTexture,
                side: THREE.FrontSide
            }), // Front
            new THREE.MeshStandardMaterial({ 
                map: backTexture,
                side: THREE.FrontSide
            }) // Back
        ];
        
        // Create box geometry
        const geometry = new THREE.BoxGeometry(cardWidth, cardHeight, cardThickness);
        
        // Create mesh
        cardMesh = new THREE.Mesh(geometry, materials);
        scene.add(cardMesh);
        
        // Add wireframe helper
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x8b5cf6, linewidth: 2 }));
        cardMesh.add(line);
    }
    
    // Funzione helper per ridimensionare canvas stirando per riempire completamente
    function resizeCanvas(sourceCanvas, targetWidth, targetHeight) {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        
        // Abilita antialiasing per migliore qualità
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Stira l'immagine per riempire completamente il canvas target (stretch to fill)
        // Questo riempie tutta la faccia senza bordi neri
        ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
        
        return canvas;
    }
    
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    
    function onWindowResize() {
        const container = document.getElementById('viewer3D');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }
    
    // ================== EXPORT ==================
    
    function exportModel(format) {
        if (!cardMesh) {
            showStatus('Genera prima il modello 3D!', 'error');
            return;
        }
        
        if (format === 'glb') {
            exportGLTF();
        } else if (format === 'obj') {
            exportOBJWithMTL();
        }
    }
    
    function exportGLTF() {
        if (!scene || !cardMesh) {
            showStatus('Errore: modello 3D non disponibile', 'error');
            return;
        }
        
        showStatus('Esportazione in corso...', 'info');
        
        // Force render before export
        renderer.render(scene, camera);
        
        const exporter = new GLTFExporter();
        
        // Export only the card mesh (not lights and camera)
        const exportScene = new THREE.Scene();
        exportScene.add(cardMesh.clone());
        
        // Opzioni di export ottimizzate per ridurre dimensioni
        const exportOptions = {
            binary: true, // GLB format (più compatto)
            maxTextureSize: 2048, // Limita dimensione texture
            embedImages: true, // Incorpora immagini nel file
            includeCustomExtensions: false,
            truncateDrawRange: true,
            forcePowerOfTwoTextures: false,
            // Comprimi texture come JPEG per ridurre dimensioni
            onlyVisible: true
        };
        
        exporter.parse(
            exportScene,
            (result) => {
                try {
                    if (result instanceof ArrayBuffer) {
                        // Binary GLB format
                        const sizeInMB = (result.byteLength / (1024 * 1024)).toFixed(2);
                        downloadBinaryFile(result, 'card_3d_model.glb', 'model/gltf-binary');
                        showStatus(`✅ Modello GLB scaricato (${sizeInMB} MB)!`, 'success');
                    } else {
                        // JSON GLTF format
                        const output = JSON.stringify(result, null, 2);
                        downloadFile(output, 'card_3d_model.gltf', 'application/json');
                        showStatus('✅ Modello GLTF scaricato con successo!', 'success');
                    }
                } catch (error) {
                    console.error('Errore durante il download:', error);
                    showStatus('❌ Errore durante il download del file', 'error');
                }
            },
            (error) => {
                console.error('Errore durante l\'esportazione:', error);
                showStatus('❌ Errore durante l\'esportazione: ' + error.message, 'error');
            },
            exportOptions
        );
    }
    
    function exportOBJWithMTL() {
        // Simple OBJ export (requires additional library for full MTL support)
        // For now, export as GLB which is more complete
        showStatus('Esporta come GLB per texture complete. OBJ esportato senza texture.', 'warning');
        
        // Export geometry only
        let objContent = '# Card 3D Model\n';
        objContent += 'o Card\n';
        
        const geometry = cardMesh.geometry;
        const position = geometry.attributes.position;
        
        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            const z = position.getZ(i);
            objContent += `v ${x} ${y} ${z}\n`;
        }
        
        downloadFile(objContent, 'card_3d_model.obj', 'text/plain');
        showStatus('Modello OBJ esportato (solo geometria)!', 'success');
    }
    
    function downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    function downloadBinaryFile(buffer, filename, type) {
        const blob = new Blob([buffer], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // ================== UTILITY FUNCTIONS ==================
    
    function updateUI() {
        const currentState = state[currentSide];
        
        if (currentState.alignPoints.length > 0) {
            alignPoint1.textContent = currentState.alignPoints[0] ? 
                `P1: (${currentState.alignPoints[0].x}, ${currentState.alignPoints[0].y})` : 'P1: -';
            alignPoint2.textContent = currentState.alignPoints[1] ? 
                `P2: (${currentState.alignPoints[1].x}, ${currentState.alignPoints[1].y})` : 'P2: -';
            
            if (currentState.alignPoints.length === 2) {
                const p1 = currentState.alignPoints[0];
                const p2 = currentState.alignPoints[1];
                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                alignAngle.textContent = `Angolo: ${(angle * 180 / Math.PI).toFixed(2)}°`;
                applyAlignButton.disabled = false;
            }
        } else {
            alignPoint1.textContent = 'P1: -';
            alignPoint2.textContent = 'P2: -';
            alignAngle.textContent = 'Angolo: -';
            applyAlignButton.disabled = true;
        }
        
        cutButton.disabled = !(currentState.originalImage || currentState.alignedImage);
    }
    
    function updateStatusMessage() {
        const frontLoaded = state.front.originalImage !== null;
        const backLoaded = state.back.originalImage !== null;
        const currentState = state[currentSide];
        
        if (!frontLoaded && !backLoaded) {
            showStatus('<strong>PASSO 1:</strong> Carica le immagini fronte e retro qui sotto ⬇️', 'info');
        } else if (!frontLoaded || !backLoaded) {
            const missing = !frontLoaded ? 'FRONTE' : 'RETRO';
            showStatus(`<strong>PASSO 1:</strong> Carica ancora l'immagine ${missing} ⬇️`, 'warning');
        } else if (!currentState.hasCrop) {
            const sideName = currentSide === 'front' ? 'FRONTE' : 'RETRO';
            if (currentState.alignPoints.length === 0) {
                showStatus(`<strong>PASSO 2:</strong> (Opzionale) Allinea ${sideName} con 2 click, oppure vai al <strong>PASSO 3</strong> ⬇️`, 'info');
            } else if (currentState.alignPoints.length < 2) {
                showStatus(`<strong>PASSO 2:</strong> Clicca il secondo punto per l'allineamento ${sideName}`, 'info');
            } else {
                showStatus(`<strong>PASSO 2:</strong> Premi "Applica Allineamento" o vai al <strong>PASSO 3</strong> ⬇️`, 'info');
            }
        } else {
            const frontDone = state.front.hasCrop;
            const backDone = state.back.hasCrop;
            if (frontDone && backDone) {
                showStatus('<strong>PASSO 4:</strong> Ottimo! Ora genera il modello 3D ⬇️', 'success');
            } else {
                const missing = !frontDone ? 'FRONTE' : 'RETRO';
                showStatus(`<strong>PASSO 3:</strong> Seleziona tab ${missing} e ritaglia anche quel lato ⬇️`, 'warning');
            }
        }
    }
    
    function showStatus(message, type = 'info') {
        statusMessage.innerHTML = message;
        statusMessage.className = 'p-3 rounded-md text-sm border-l-4';
        
        switch (type) {
            case 'success':
                statusMessage.className += ' bg-green-50 border-green-500 text-green-700';
                break;
            case 'error':
                statusMessage.className += ' bg-red-50 border-red-500 text-red-700';
                break;
            case 'warning':
                statusMessage.className += ' bg-yellow-50 border-yellow-500 text-yellow-700';
                break;
            default:
                statusMessage.className += ' bg-purple-50 border-purple-500 text-purple-700';
        }
    }
    
    function rgbToHex(r, g, b) {
        return "#" + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }).join('');
    }
    
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    function resetTool() {
        // Reset state
        state.front = {
            originalImage: null,
            alignedImage: null,
            croppedImageData: null,
            alignPoints: [],
            rotationAngle: 0,
            hasAlignment: false,
            hasCrop: false
        };
        state.back = {
            originalImage: null,
            alignedImage: null,
            croppedImageData: null,
            alignPoints: [],
            rotationAngle: 0,
            hasAlignment: false,
            hasCrop: false
        };
        
        // Reset UI
        frontStatus.textContent = '❌ Mancante';
        frontStatus.className = 'text-xs text-gray-500';
        backStatus.textContent = '❌ Mancante';
        backStatus.className = 'text-xs text-gray-500';
        
        frontImageLoader.value = '';
        backImageLoader.value = '';
        
        resetAlignPoints();
        
        cutButton.disabled = true;
        generate3DButton.disabled = true;
        
        // Show canvases, hide 3D
        frontSection.style.display = 'block';
        backSection.style.display = 'block';
        viewer3DContainer.style.display = 'none';
        exportSection.style.display = 'none';
        
        // Clear renderer
        if (renderer) {
            const container = document.getElementById('viewer3D');
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
            renderer.dispose();
            renderer = null;
        }
        
        // Clear canvases
        frontCtx.clearRect(0, 0, frontCanvas.width, frontCanvas.height);
        backCtx.clearRect(0, 0, backCanvas.width, backCanvas.height);
        
        showStatus('Tool resettato. Carica nuove immagini per iniziare.', 'info');
    }
    
    // ================== START ==================
    
    init();
});
