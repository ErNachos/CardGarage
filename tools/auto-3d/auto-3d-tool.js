import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

document.addEventListener('DOMContentLoaded', () => {
    // ================== DOM ELEMENTS ==================
    
    // File inputs
    const frontImageLoader = document.getElementById('frontImageLoader');
    const backImageLoader = document.getElementById('backImageLoader');
    
    // Status indicators
    const frontStatus = document.getElementById('frontStatus');
    const backStatus = document.getElementById('backStatus');
    const globalStatus = document.getElementById('globalStatus');
    
    // Controls
    const processButton = document.getElementById('processButton');
    const colorTolerance = document.getElementById('colorTolerance');
    const colorToleranceValue = document.getElementById('colorToleranceValue');
    const edgeSensitivity = document.getElementById('edgeSensitivity');
    const edgeSensitivityValue = document.getElementById('edgeSensitivityValue');
    const autoRotation = document.getElementById('autoRotation');
    
    // Canvases
    const frontCanvas = document.getElementById('frontCanvas');
    const backCanvas = document.getElementById('backCanvas');
    const frontCtx = frontCanvas.getContext('2d');
    const backCtx = backCanvas.getContext('2d');
    
    // Processing overlays
    const frontProcessing = document.getElementById('frontProcessing');
    const backProcessing = document.getElementById('backProcessing');
    
    // Progress tracking
    const progressSection = document.getElementById('progressSection');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const stepAnalysis = document.getElementById('stepAnalysis');
    const stepOrientation = document.getElementById('stepOrientation');
    const stepBackground = document.getElementById('stepBackground');
    const stepNormalization = document.getElementById('stepNormalization');
    const step3D = document.getElementById('step3D');
    
    // 3D and export
    const viewer3DContainer = document.getElementById('viewer3DContainer');
    const exportSection = document.getElementById('exportSection');
    const exportGLB = document.getElementById('exportGLB');
    const exportOBJ = document.getElementById('exportOBJ');
    
    // Status and debug
    const statusMessage = document.getElementById('statusMessage');
    const debugInfo = document.getElementById('debugInfo');
    const backPlaceholder = document.getElementById('backPlaceholder');
    
    // Success modal
    const successModal = document.getElementById('successModal');
    
    // ================== STATE MANAGEMENT ==================
    
    const state = {
        frontImage: null,
        backImage: null,
        processedFrontImage: null,
        processedBackImage: null,
        frontShape: null,
        backShape: null,
        normalizedShape: null,
        model3D: null,
        processing: false
    };
    
    // 3D Scene
    let scene, camera, renderer, controls, cardMesh;
    
    // ================== INITIALIZATION ==================
    
    function init() {
        setupEventListeners();
        setupCanvases();
        updateSettings();
    }
    
    function setupEventListeners() {
        frontImageLoader.addEventListener('change', (e) => handleImageUpload(e, 'front'));
        backImageLoader.addEventListener('change', (e) => handleImageUpload(e, 'back'));
        
        processButton.addEventListener('click', startAutoProcessing);
        
        colorTolerance.addEventListener('input', updateSettings);
        edgeSensitivity.addEventListener('input', updateSettings);
        
        exportGLB.addEventListener('click', () => exportModel('glb'));
        exportOBJ.addEventListener('click', () => exportModel('obj'));
        
        window.addEventListener('resize', resizeCanvases);
    }
    
    function setupCanvases() {
        resizeCanvases();
    }
    
    function resizeCanvases() {
        const containerWidth = 300; // Fixed width for preview
        const containerHeight = 200; // Fixed height for preview
        
        frontCanvas.width = containerWidth;
        frontCanvas.height = containerHeight;
        backCanvas.width = containerWidth;
        backCanvas.height = containerHeight;
        
        drawPreviews();
    }
    
    function updateSettings() {
        colorToleranceValue.textContent = colorTolerance.value;
        edgeSensitivityValue.textContent = edgeSensitivity.value;
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
                state[side + 'Image'] = img;
                
                // Update status
                const statusEl = side === 'front' ? frontStatus : backStatus;
                statusEl.className = 'status-indicator status-success';
                
                if (side === 'back') {
                    backPlaceholder.style.display = 'none';
                }
                
                // Check if we can enable processing
                checkProcessReady();
                drawPreviews();
                
                showStatus(`Immagine ${side} caricata con successo`, 'success');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    function checkProcessReady() {
        const ready = state.frontImage !== null;
        processButton.disabled = !ready;
        
        if (ready) {
            globalStatus.className = 'status-indicator status-success';
            showStatus('Pronto per la generazione automatica!', 'success');
        }
    }
    
    function drawPreviews() {
        // Draw front preview
        if (state.frontImage) {
            drawImageOnCanvas(state.processedFrontImage || state.frontImage, frontCanvas, frontCtx);
        }
        
        // Draw back preview
        if (state.backImage) {
            drawImageOnCanvas(state.processedBackImage || state.backImage, backCanvas, backCtx);
        }
    }
    
    function drawImageOnCanvas(img, canvas, ctx) {
        if (!img) return;
        
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Calculate aspect ratio and fit
        const imgAspect = img.width / img.height;
        const canvasAspect = canvas.width / canvas.height;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (imgAspect > canvasAspect) {
            drawWidth = canvas.width * 0.9;
            drawHeight = drawWidth / imgAspect;
            offsetX = (canvas.width - drawWidth) / 2;
            offsetY = (canvas.height - drawHeight) / 2;
        } else {
            drawHeight = canvas.height * 0.9;
            drawWidth = drawHeight * imgAspect;
            offsetX = (canvas.width - drawWidth) / 2;
            offsetY = (canvas.height - drawHeight) / 2;
        }
        
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    }
    
    // ================== AUTO PROCESSING PIPELINE ==================
    
    async function startAutoProcessing() {
        if (state.processing) return;
        
        state.processing = true;
        processButton.disabled = true;
        progressSection.style.display = 'block';
        
        // Set timeout to prevent infinite blocking
        const timeout = setTimeout(() => {
            if (state.processing) {
                console.error('Processing timeout reached');
                showStatus('Timeout: Elaborazione interrotta dopo 60 secondi', 'error');
                globalStatus.className = 'status-indicator status-error';
                state.processing = false;
                processButton.disabled = false;
                frontProcessing.style.display = 'none';
                backProcessing.style.display = 'none';
            }
        }, 60000); // 60 second timeout
        
        try {
            // Show processing overlays
            frontProcessing.style.display = 'flex';
            if (state.backImage) {
                backProcessing.style.display = 'flex';
            }
            
            globalStatus.className = 'status-indicator status-processing';
            showStatus('Avvio elaborazione automatica...', 'info');
            
            // Step 1: Analysis
            await processStep('analysis', 'Analisi delle immagini...', async () => {
                await analyzeImages();
            });
            
            // Step 2: Auto-orientation
            await processStep('orientation', 'Auto-orientamento...', async () => {
                await autoOrientImages();
            });
            
            // Step 3: Background removal
            await processStep('background', 'Rimozione automatica sfondo...', async () => {
                await removeBackgroundAuto();
            });
            
            // Step 4: Normalization
            await processStep('normalization', 'Normalizzazione forme...', async () => {
                await normalizeShapes();
            });
            
            // Step 5: 3D Generation
            await processStep('3d', 'Generazione modello 3D...', async () => {
                await generate3DModel();
            });
            
            // Complete
            clearTimeout(timeout);
            completeProcessing();
            
        } catch (error) {
            clearTimeout(timeout);
            console.error('Processing error:', error);
            showStatus('Errore durante l\'elaborazione: ' + error.message, 'error');
            globalStatus.className = 'status-indicator status-error';
        } finally {
            state.processing = false;
            processButton.disabled = false;
            frontProcessing.style.display = 'none';
            backProcessing.style.display = 'none';
        }
    }
    
    async function processStep(stepName, message, processor) {
        const stepElement = document.getElementById('step' + stepName.charAt(0).toUpperCase() + stepName.slice(1));
        
        stepElement.className = 'status-indicator status-processing';
        showStatus(message, 'info');
        
        await new Promise(resolve => setTimeout(resolve, 100)); // UI update delay
        
        try {
            console.log(`Starting step: ${stepName}`);
            await processor();
            console.log(`Completed step: ${stepName}`);
            stepElement.className = 'status-indicator status-success';
        } catch (error) {
            console.error(`Error in step ${stepName}:`, error);
            stepElement.className = 'status-indicator status-error';
            throw error;
        }
        
        // Update progress
        const completedSteps = document.querySelectorAll('.status-success').length;
        const totalSteps = 5;
        const progress = (completedSteps / totalSteps) * 100;
        progressFill.style.width = progress + '%';
        progressText.textContent = `${Math.round(progress)}% completato`;
        console.log(`Progress: ${progress}% (${completedSteps}/${totalSteps} steps)`);
    }
    
    // ================== AUTO-ORIENTATION ALGORITHM ==================
    
    async function analyzeImages() {
        debugInfo.textContent = 'Analyzing image properties...';
        
        // Basic analysis - just verify images are loaded
        if (!state.frontImage) {
            throw new Error('Immagine fronte non trovata');
        }
        
        const frontInfo = {
            width: state.frontImage.width,
            height: state.frontImage.height,
            aspect: state.frontImage.width / state.frontImage.height
        };
        
        debugInfo.textContent = `Front: ${frontInfo.width}x${frontInfo.height}`;
        
        if (state.backImage) {
            const backInfo = {
                width: state.backImage.width,
                height: state.backImage.height,
                aspect: state.backImage.width / state.backImage.height
            };
            debugInfo.textContent += ` | Back: ${backInfo.width}x${backInfo.height}`;
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    async function autoOrientImages() {
        if (!autoRotation.checked) {
            debugInfo.textContent = 'Auto-rotation disabled';
            return;
        }
        
        // Process front image
        const frontAngle = await detectOptimalRotation(state.frontImage);
        if (Math.abs(frontAngle) > 0.5) { // Only rotate if significant angle
            state.processedFrontImage = await rotateImage(state.frontImage, frontAngle);
            debugInfo.textContent = `Front rotated: ${(frontAngle * 180 / Math.PI).toFixed(1)}°`;
        } else {
            state.processedFrontImage = state.frontImage;
            debugInfo.textContent = 'Front already aligned';
        }
        
        // Process back image if present
        if (state.backImage) {
            const backAngle = await detectOptimalRotation(state.backImage);
            if (Math.abs(backAngle) > 0.5) {
                state.processedBackImage = await rotateImage(state.backImage, backAngle);
                debugInfo.textContent += ` | Back: ${(backAngle * 180 / Math.PI).toFixed(1)}°`;
            } else {
                state.processedBackImage = state.backImage;
                debugInfo.textContent += ' | Back aligned';
            }
        }
        
        drawPreviews();
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    async function detectOptimalRotation(image) {
        return new Promise((resolve) => {
            console.log('Starting rotation detection...');
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Reduce image size for faster processing
            const maxSize = 800;
            const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
            canvas.width = Math.floor(image.width * scale);
            canvas.height = Math.floor(image.height * scale);
            
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            const edgeThreshold = parseInt(edgeSensitivity.value);
            let bestAngle = 0;
            let maxScore = 0;
            
            console.log(`Testing angles for ${canvas.width}x${canvas.height} image...`);
            
            // Reduce angle sampling for faster processing
            for (let angle = -10; angle <= 10; angle += 1.0) {
                const score = calculateOrientationScore(data, canvas.width, canvas.height, angle * Math.PI / 180, edgeThreshold);
                if (score > maxScore) {
                    maxScore = score;
                    bestAngle = angle * Math.PI / 180;
                }
            }
            
            console.log(`Best angle found: ${(bestAngle * 180 / Math.PI).toFixed(2)}° (score: ${maxScore})`);
            resolve(bestAngle);
        });
    }
    
    function calculateOrientationScore(imageData, width, height, testAngle, minSegmentLength) {
        let score = 0;
        const cos = Math.cos(-testAngle);
        const sin = Math.sin(-testAngle);
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Scan horizontal lines for edge consistency
        for (let y = Math.floor(height * 0.1); y < height * 0.9; y += 5) {
            let segmentLength = 0;
            let edgeCount = 0;
            
            for (let x = 1; x < width - 1; x++) {
                // Transform coordinates
                const transformedX = cos * (x - centerX) - sin * (y - centerY) + centerX;
                const transformedY = sin * (x - centerX) + cos * (y - centerY) + centerY;
                
                if (transformedX >= 0 && transformedX < width - 1 && transformedY >= 0 && transformedY < height - 1) {
                    const pixelIndex = (Math.floor(transformedY) * width + Math.floor(transformedX)) * 4;
                    const nextPixelIndex = (Math.floor(transformedY) * width + Math.floor(transformedX) + 1) * 4;
                    
                    // Calculate color difference
                    const diff = Math.abs(imageData[pixelIndex] - imageData[nextPixelIndex]) +
                                Math.abs(imageData[pixelIndex + 1] - imageData[nextPixelIndex + 1]) +
                                Math.abs(imageData[pixelIndex + 2] - imageData[nextPixelIndex + 2]);
                    
                    if (diff > 30) { // Edge detected
                        segmentLength++;
                        if (segmentLength >= minSegmentLength) {
                            edgeCount++;
                            segmentLength = 0; // Reset for next segment
                        }
                    } else {
                        segmentLength = 0;
                    }
                }
            }
            
            score += edgeCount;
        }
        
        return score;
    }
    
    async function rotateImage(image, angle) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const cos = Math.abs(Math.cos(angle));
            const sin = Math.abs(Math.sin(angle));
            const newWidth = Math.ceil(image.width * cos + image.height * sin);
            const newHeight = Math.ceil(image.width * sin + image.height * cos);
            
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            ctx.save();
            ctx.translate(newWidth / 2, newHeight / 2);
            ctx.rotate(angle);
            ctx.drawImage(image, -image.width / 2, -image.height / 2);
            ctx.restore();
            
            const rotatedImage = new Image();
            rotatedImage.onload = () => resolve(rotatedImage);
            rotatedImage.src = canvas.toDataURL();
        });
    }
    
    // ================== BACKGROUND REMOVAL ALGORITHM ==================
    
    async function removeBackgroundAuto() {
        const tolerance = parseInt(colorTolerance.value);
        
        // Process front image
        const frontImage = state.processedFrontImage || state.frontImage;
        state.processedFrontImage = await removeBackgroundFromImage(frontImage, tolerance);
        state.frontShape = await extractShape(state.processedFrontImage);
        
        // Process back image if present
        if (state.backImage) {
            const backImage = state.processedBackImage || state.backImage;
            state.processedBackImage = await removeBackgroundFromImage(backImage, tolerance);
            state.backShape = await extractShape(state.processedBackImage);
        }
        
        drawPreviews();
        debugInfo.textContent = `Background removed (tolerance: ${tolerance})`;
        await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    async function removeBackgroundFromImage(image, tolerance) {
        return new Promise((resolve) => {
            console.log('Starting background removal...');
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Sample background color from corners
            const bgColor = sampleBackgroundColor(data, canvas.width, canvas.height);
            console.log('Background color:', bgColor);
            
            // Remove background using flood fill from edges
            const visited = new Uint8Array(canvas.width * canvas.height);
            const queue = [];
            
            // Add edge pixels to queue (reduce sampling for performance)
            const step = Math.max(1, Math.floor(Math.min(canvas.width, canvas.height) / 100));
            
            for (let x = 0; x < canvas.width; x += step) {
                queue.push({x, y: 0});
                queue.push({x, y: canvas.height - 1});
            }
            for (let y = step; y < canvas.height - step; y += step) {
                queue.push({x: 0, y});
                queue.push({x: canvas.width - 1, y});
            }
            
            console.log(`Starting flood fill with ${queue.length} edge points...`);
            
            // Optimize flood fill
            let processedPixels = 0;
            while (queue.length > 0 && processedPixels < canvas.width * canvas.height * 0.5) {
                const {x, y} = queue.shift();
                const idx = y * canvas.width + x;
                
                if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height || visited[idx]) {
                    continue;
                }
                
                const pixelIdx = idx * 4;
                const r = data[pixelIdx];
                const g = data[pixelIdx + 1];
                const b = data[pixelIdx + 2];
                
                const diff = Math.sqrt(
                    Math.pow(r - bgColor.r, 2) +
                    Math.pow(g - bgColor.g, 2) +
                    Math.pow(b - bgColor.b, 2)
                );
                
                if (diff > tolerance) {
                    continue;
                }
                
                visited[idx] = 1;
                data[pixelIdx + 3] = 0; // Make transparent
                processedPixels++;
                
                // Add neighbors (less frequently for performance)
                if (processedPixels % 10 === 0) {
                    queue.push({x: x + 1, y});
                    queue.push({x: x - 1, y});
                    queue.push({x, y: y + 1});
                    queue.push({x, y: y - 1});
                } else {
                    queue.push({x: x + 1, y});
                    queue.push({x: x - 1, y});
                }
            }
            
            console.log(`Processed ${processedPixels} pixels`);
            
            ctx.putImageData(imageData, 0, 0);
            
            // Auto-crop to content
            const cropped = autoCropCanvas(canvas);
            
            const resultImage = new Image();
            resultImage.onload = () => {
                console.log('Background removal complete');
                resolve(resultImage);
            };
            resultImage.src = cropped.toDataURL();
        });
    }
    
    function sampleBackgroundColor(data, width, height) {
        const samples = [];
        const sampleSize = 10;
        
        // Sample from corners
        for (let i = 0; i < sampleSize; i++) {
            for (let j = 0; j < sampleSize; j++) {
                const idx = (j * width + i) * 4;
                samples.push({
                    r: data[idx],
                    g: data[idx + 1],
                    b: data[idx + 2]
                });
            }
        }
        
        // Return average color
        const avg = samples.reduce((acc, color) => ({
            r: acc.r + color.r,
            g: acc.g + color.g,
            b: acc.b + color.b
        }), {r: 0, g: 0, b: 0});
        
        return {
            r: Math.round(avg.r / samples.length),
            g: Math.round(avg.g / samples.length),
            b: Math.round(avg.b / samples.length)
        };
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
    
    async function extractShape(image) {
        // Extract shape data for normalization
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        
        return {
            canvas: canvas,
            width: image.width,
            height: image.height
        };
    }
    
    // ================== SHAPE NORMALIZATION ==================
    
    async function normalizeShapes() {
        console.log('Starting shape normalization...');
        
        if (!state.frontShape) {
            throw new Error('Forma fronte non trovata');
        }
        
        console.log('Front shape:', state.frontShape);
        
        if (state.backShape) {
            console.log('Back shape:', state.backShape);
            
            // Use front shape as reference and adapt back
            const maxWidth = Math.max(state.frontShape.width, state.backShape.width);
            const maxHeight = Math.max(state.frontShape.height, state.backShape.height);
            
            state.normalizedShape = {
                width: maxWidth,
                height: maxHeight
            };
            
            console.log('Normalizing to:', state.normalizedShape);
            
            // Resize both to same dimensions
            state.processedFrontImage = await resizeImageToShape(state.processedFrontImage, maxWidth, maxHeight);
            state.processedBackImage = await resizeImageToShape(state.processedBackImage, maxWidth, maxHeight);
            
            debugInfo.textContent = `Normalized to: ${maxWidth}x${maxHeight}`;
        } else {
            // Only front image
            state.normalizedShape = {
                width: state.frontShape.width,
                height: state.frontShape.height
            };
            console.log('Using front shape only:', state.normalizedShape);
            debugInfo.textContent = `Using front shape: ${state.frontShape.width}x${state.frontShape.height}`;
        }
        
        console.log('Shape normalization complete');
        drawPreviews();
        await new Promise(resolve => setTimeout(resolve, 400));
    }
    
    async function resizeImageToShape(image, targetWidth, targetHeight) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            
            // Center the image
            const offsetX = Math.floor((targetWidth - image.width) / 2);
            const offsetY = Math.floor((targetHeight - image.height) / 2);
            
            ctx.drawImage(image, offsetX, offsetY);
            
            const resizedImage = new Image();
            resizedImage.onload = () => resolve(resizedImage);
            resizedImage.src = canvas.toDataURL();
        });
    }
    
    // ================== 3D MODEL GENERATION ==================
    
    async function generate3DModel() {
        console.log('Starting 3D model generation...');
        
        if (!state.processedFrontImage) {
            throw new Error('Immagine fronte processata non trovata');
        }
        
        debugInfo.textContent = 'Initializing 3D scene...';
        
        try {
            // Show 3D viewer
            viewer3DContainer.style.display = 'block';
            
            // Initialize Three.js scene
            init3DScene();
            
            // Create card mesh
            await createCardMesh();
            
            state.model3D = cardMesh;
            debugInfo.textContent = '3D model ready';
            
            console.log('3D model generation complete');
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error('3D generation error:', error);
            throw new Error(`Errore generazione 3D: ${error.message}`);
        }
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
        
        // Animation loop
        animate();
        
        // Handle window resize
        window.addEventListener('resize', onWindowResize);
    }
    
    async function createCardMesh() {
        console.log('Creating card mesh...');
        
        const frontImage = state.processedFrontImage;
        const backImage = state.processedBackImage;
        
        const shape = state.normalizedShape;
        
        if (!shape) {
            throw new Error('Shape not normalized');
        }
        
        console.log(`Creating mesh with shape: ${shape.width}x${shape.height}`);
        
        // Create textures
        const frontTexture = new THREE.CanvasTexture(imageToCanvas(frontImage));
        const backTexture = backImage ? 
            new THREE.CanvasTexture(imageToCanvas(backImage)) :
            new THREE.MeshStandardMaterial({ color: 0xcccccc });
        
        frontTexture.minFilter = THREE.LinearFilter;
        frontTexture.magFilter = THREE.LinearFilter;
        frontTexture.wrapS = THREE.ClampToEdgeWrapping;
        frontTexture.wrapT = THREE.ClampToEdgeWrapping;
        
        if (backTexture instanceof THREE.CanvasTexture) {
            backTexture.minFilter = THREE.LinearFilter;
            backTexture.magFilter = THREE.LinearFilter;
            backTexture.wrapS = THREE.ClampToEdgeWrapping;
            backTexture.wrapT = THREE.ClampToEdgeWrapping;
        }
        
        // Scale for 3D model
        const cardWidth = shape.width / 10;
        const cardHeight = shape.height / 10;
        const cardThickness = 0.03; // 0.3mm
        
        console.log(`Card dimensions: ${cardWidth}x${cardHeight}x${cardThickness}`);
        
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
            backTexture instanceof THREE.CanvasTexture ?
                new THREE.MeshStandardMaterial({ 
                    map: backTexture,
                    side: THREE.FrontSide
                }) : backTexture // Back
        ];
        
        // Create geometry
        const geometry = new THREE.BoxGeometry(cardWidth, cardHeight, cardThickness);
        
        // Create mesh
        cardMesh = new THREE.Mesh(geometry, materials);
        scene.add(cardMesh);
        
        // Add wireframe
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ 
            color: 0x059669, 
            linewidth: 2 
        }));
        cardMesh.add(line);
        
        console.log('Card mesh created successfully');
    }
    
    function imageToCanvas(image) {
        // Synchronous function since we don't need to wait for anything
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        return canvas;
    }
    
    function animate() {
        requestAnimationFrame(animate);
        if (controls) controls.update();
        if (renderer && scene && camera) renderer.render(scene, camera);
    }
    
    function onWindowResize() {
        const container = document.getElementById('viewer3D');
        if (!container) return;
        
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        if (camera) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }
        if (renderer) {
            renderer.setSize(width, height);
        }
    }
    
    // ================== COMPLETION AND EXPORT ==================
    
    function completeProcessing() {
        progressFill.style.width = '100%';
        progressText.textContent = '100% completato';
        globalStatus.className = 'status-indicator status-success';
        showStatus('Modello 3D generato con successo!', 'success');
        
        // Enable export
        exportSection.style.display = 'block';
        exportGLB.disabled = false;
        exportOBJ.disabled = false;
        
        // Show success modal
        successModal.style.display = 'flex';
        
        debugInfo.textContent = 'Processing complete';
    }
    
    async function exportModel(format) {
        if (!state.model3D) {
            showStatus('Modello 3D non disponibile', 'error');
            return;
        }
        
        if (format === 'glb') {
            await exportGLTF();
        } else if (format === 'obj') {
            exportOBJSimple();
        }
    }
    
    async function exportGLTF() {
        showStatus('Esportazione GLB in corso...', 'info');
        
        const exporter = new GLTFExporter();
        
        const exportScene = new THREE.Scene();
        exportScene.add(cardMesh.clone());
        
        const options = {
            binary: true,
            maxTextureSize: 2048,
            embedImages: true
        };
        
        exporter.parse(
            exportScene,
            (result) => {
                if (result instanceof ArrayBuffer) {
                    const sizeInMB = (result.byteLength / (1024 * 1024)).toFixed(2);
                    downloadBinaryFile(result, 'auto_3d_card.glb', 'model/gltf-binary');
                    showStatus(`GLB scaricato (${sizeInMB} MB)!`, 'success');
                }
            },
            (error) => {
                console.error('Export error:', error);
                showStatus('Errore durante l\'esportazione GLB', 'error');
            },
            options
        );
    }
    
    function exportOBJSimple() {
        showStatus('Esportazione OBJ (solo geometria)...', 'info');
        
        let objContent = '# Auto 3D Card Model\n';
        objContent += 'o Card\n';
        
        const geometry = cardMesh.geometry;
        const position = geometry.attributes.position;
        
        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            const z = position.getZ(i);
            objContent += `v ${x} ${y} ${z}\n`;
        }
        
        downloadFile(objContent, 'auto_3d_card.obj', 'text/plain');
        showStatus('OBJ esportato!', 'success');
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
    
    function showStatus(message, type = 'info') {
        statusMessage.textContent = message;
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
    
    // ================== GLOBAL FUNCTIONS ==================
    
    window.goBack = function() {
        if (window.electronAPI) {
            window.electronAPI.navigateToTool('homepage');
        } else {
            window.location.href = '../../index.html';
        }
    };
    
    window.closeSuccessModal = function() {
        successModal.style.display = 'none';
    };
    
    window.downloadGLB = function() {
        exportGLTF();
        closeSuccessModal();
    };
    
    // ================== START ==================
    
    init();
});