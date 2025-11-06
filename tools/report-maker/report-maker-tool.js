document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const canvasContainer = document.getElementById('canvasContainer');
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');
    
    // Magnifier
    const magnifier = document.getElementById('magnifier');
    const magnifierCanvas = document.getElementById('magnifierCanvas');
    const magnifierCtx = magnifierCanvas.getContext('2d');
    
    const magnifierSize = 150;
    const magnificationFactor = 3;
    magnifierCanvas.width = magnifierSize;
    magnifierCanvas.height = magnifierSize;

    // Application State
    let image = null; // Currently displayed image
    let backImage = null; // Back side image (saved separately)
    let backRotationAngle = 0; // Back side rotation angle (saved)
    let rotationAngle = 0;
    let zoom = 1;
    let pan = { x: 0, y: 0 };
    let isPanning = false;
    let lastPanPos = { x: 0, y: 0 };
    
    // Calibration State
    let pixelsPerMm = 0;
    let calibrationPoints = []; // 0-1: width calibration, 2-9: measurements
    let measurements = { left: 0, right: 0, top: 0, bottom: 0 };
    let calibrationComplete = false;
    
    // Defect State
    let defectPoints = [];
    let defectMagnifications = [];
    
    // Front Side State
    let frontImage = null;
    let frontRotationAngle = 0;
    let frontDefectPoints = [];
    let frontDefectMagnifications = [];
    let isWorkingOnFront = false; // Track if we're working on front or back
    
    // Workflow State
    let currentState = 'idle'; // 'idle', 'rotating', 'calibrating', 'measuring', 'marking_defects', 'rotating_front', 'marking_front_defects'
    
    // DOM References
    const imageLoader = document.getElementById('imageLoader');
    const rotateButton = document.getElementById('rotateButton');
    const realWidthInput = document.getElementById('realWidth');
    const calibrateButton = document.getElementById('calibrateButton');
    const measureButton = document.getElementById('measureButton');
    const resetCalibrationButton = document.getElementById('resetCalibrationButton');
    const markDefectsButton = document.getElementById('markDefectsButton');
    const resetDefectsButton = document.getElementById('resetDefectsButton');
    const exportPdfButton = document.getElementById('exportPdfButton');
    const zoomSlider = document.getElementById('zoomSlider');
    const zoomValue = document.getElementById('zoomValue');
    const statusMessage = document.getElementById('statusMessage');
    const defectCount = document.getElementById('defectCount');
    
    // Front Side DOM References
    const frontSection = document.getElementById('frontSection');
    const frontImageLoader = document.getElementById('frontImageLoader');
    const rotateFrontButton = document.getElementById('rotateFrontButton');
    const markFrontDefectsButton = document.getElementById('markFrontDefectsButton');
    const resetFrontDefectsButton = document.getElementById('resetFrontDefectsButton');
    const frontDefectCount = document.getElementById('frontDefectCount');
    
    // Results
    const resLeft = document.getElementById('resLeft');
    const resRight = document.getElementById('resRight');
    const resTop = document.getElementById('resTop');
    const resBottom = document.getElementById('resBottom');
    const resHPercent = document.getElementById('resHPercent');
    const resVPercent = document.getElementById('resVPercent');

    // Step Indicators (may not exist if removed)
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const step4 = document.getElementById('step4');

    // ===== CANVAS SETUP =====
    function resizeCanvas() {
        canvas.width = canvasContainer.clientWidth;
        canvas.height = canvasContainer.clientHeight;
        if (image) {
            centerImage();
            draw();
        }
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

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

    // ===== IMAGE LOADING =====
    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            image = new Image();
            image.onload = () => {
                backImage = image; // Save back image separately
                isWorkingOnFront = false;
                resetAll();
                centerImage();
                draw();
                updateStatus("Image loaded. Click 'Set Rotation'.");
                rotateButton.disabled = false;
                updateStepIndicator(1, 'active');
            };
            image.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // ===== ROTATION =====
    rotateButton.addEventListener('click', () => {
        currentState = 'rotating';
        calibrationPoints = calibrationPoints.slice(0, 0); // Clear rotation points if any
        updateStatus("Click 2 points to define horizontal line.");
        updateCursor();
        draw();
    });

    // ===== CALIBRATION =====
    calibrateButton.addEventListener('click', () => {
        currentState = 'calibrating';
        calibrationPoints = calibrationPoints.slice(0, 2); // Keep rotation, clear rest
        pixelsPerMm = 0;
        updateStatus("Click LEFT edge of card.");
        updateCursor();
        draw();
    });

    measureButton.addEventListener('click', () => {
        currentState = 'measuring';
        calibrationPoints = calibrationPoints.slice(0, 4); // Keep rotation + calibration
        measurements = { left: 0, right: 0, top: 0, bottom: 0 };
        updateStatus("Click Point 1 (Left edge)");
        updateCursor();
        draw();
    });

    resetCalibrationButton.addEventListener('click', () => {
        calibrationPoints = calibrationPoints.slice(0, 2); // Keep rotation only
        measurements = { left: 0, right: 0, top: 0, bottom: 0 };
        pixelsPerMm = 0;
        calibrationComplete = false;
        currentState = 'idle';
        
        measureButton.disabled = true;
        markDefectsButton.disabled = true;
        
        resetResultsUI();
        updateStatus("Calibration reset. Click 'Calibrate'.");
        updateStepIndicator(2, 'pending');
        draw();
    });

    // ===== DEFECTS =====
    markDefectsButton.addEventListener('click', () => {
        currentState = 'marking_defects';
        defectPoints = [];
        defectMagnifications = [];
        updateDefectCount();
        updateStatus("Click on defects (max 8).");
        updateCursor();
    });

    resetDefectsButton.addEventListener('click', () => {
        defectPoints = [];
        defectMagnifications = [];
        currentState = 'idle';
        updateDefectCount();
        updateStatus("Defects reset.");
        updateStepIndicator(3, 'pending');
        exportPdfButton.disabled = true;
        draw();
    });

    // Front Side Event Listeners
    frontImageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                frontImage = img;
                isWorkingOnFront = true;
                image = frontImage; // Switch to front image
                rotationAngle = 0; // Reset rotation for front
                zoom = 1;
                pan = { x: 0, y: 0 };
                centerImage();
                draw();
                rotateFrontButton.disabled = false;
                updateStatus("Front image loaded. Set rotation.");
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    rotateFrontButton.addEventListener('click', () => {
        currentState = 'rotating_front';
        calibrationPoints = []; // Reuse for rotation points
        updateStatus("Click 2 points to set front rotation.");
        updateCursor();
    });

    markFrontDefectsButton.addEventListener('click', () => {
        currentState = 'marking_front_defects';
        frontDefectPoints = [];
        frontDefectMagnifications = [];
        updateFrontDefectCount();
        updateStatus("Mark defects on front (max 8).");
        updateCursor();
    });

    resetFrontDefectsButton.addEventListener('click', () => {
        frontDefectPoints = [];
        frontDefectMagnifications = [];
        currentState = 'idle';
        updateFrontDefectCount();
        updateStatus("Front defects reset.");
        draw();
    });

    // ===== CLICK HANDLING =====
    canvasContainer.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            handleLeftClick(e);
        } else if (e.button === 1 && image) {
            e.preventDefault();
            isPanning = true;
            lastPanPos = { x: e.clientX, y: e.clientY };
            updateCursor();
        }
    });

    function handleLeftClick(e) {
        const worldPos = screenToWorld(e.clientX, e.clientY);
        
        if (currentState === 'rotating') {
            calibrationPoints.push(worldPos);
            if (calibrationPoints.length === 2) {
                const p1 = calibrationPoints[0];
                const p2 = calibrationPoints[1];
                rotationAngle = -Math.atan2(p2.y - p1.y, p2.x - p1.x);
                backRotationAngle = rotationAngle; // Save back rotation angle
                currentState = 'idle';
                calibrateButton.disabled = false;
                updateStatus(`Rotation set to ${(rotationAngle * 180 / Math.PI).toFixed(2)}°. Now calibrate.`);
                updateStepIndicator(1, 'completed');
                updateStepIndicator(2, 'active');
                updateCursor();
            } else {
                updateStatus("Click second point.");
            }
            draw();
        }
        else if (currentState === 'calibrating') {
            calibrationPoints.push(worldPos);
            if (calibrationPoints.length === 3) {
                updateStatus("Click RIGHT edge of card.");
            } else if (calibrationPoints.length === 4) {
                calculateScale();
                currentState = 'idle';
                measureButton.disabled = false;
                updateStatus(`Calibration complete! Scale: ${pixelsPerMm.toFixed(2)} px/mm. Click 'Measure'.`);
                updateCursor();
            }
            draw();
        }
        else if (currentState === 'measuring') {
            calibrationPoints.push(worldPos);
            const measureIndex = calibrationPoints.length - 5;
            if (measureIndex < 7) {
                const steps = [
                    "Click Point 2 (Left edge)",
                    "Click Point 3 (Right edge)",
                    "Click Point 4 (Right edge)",
                    "Click Point 5 (Top edge)",
                    "Click Point 6 (Top edge)",
                    "Click Point 7 (Bottom edge)",
                    "Click Point 8 (Bottom edge)"
                ];
                updateStatus(steps[measureIndex]);
            } else {
                currentState = 'idle';
                calibrationComplete = true;
                measureButton.textContent = "Re-measure (8 clicks)";
                markDefectsButton.disabled = false;
                updateStatus("Measurement complete! Now mark defects.");
                updateStepIndicator(2, 'completed');
                updateStepIndicator(3, 'active');
                updateCursor();
            }
            updateMeasurements();
            draw();
        }
        else if (currentState === 'marking_defects') {
            if (defectPoints.length >= 8) {
                updateStatus("Maximum 8 defects reached!");
                return;
            }
            defectPoints.push(worldPos);
            const magnifiedData = captureMagnifiedArea(worldPos);
            defectMagnifications.push(magnifiedData);
            updateDefectCount();
            
            if (defectPoints.length >= 1) {
                // Show front section after first back defect
                frontSection.style.display = 'block';
                updateStepIndicator(4, 'active');
            }
            
            if (defectPoints.length >= 8) {
                currentState = 'idle';
                updateStatus("8 defects marked! Load front image or export PDF.");
                updateStepIndicator(3, 'completed');
                updateCursor();
            } else {
                updateStatus(`Defect ${defectPoints.length} marked. ${8 - defectPoints.length} remaining.`);
            }
            draw();
        }
        else if (currentState === 'rotating_front') {
            calibrationPoints.push(worldPos);
            if (calibrationPoints.length === 2) {
                const p1 = calibrationPoints[0];
                const p2 = calibrationPoints[1];
                frontRotationAngle = -Math.atan2(p2.y - p1.y, p2.x - p1.x);
                rotationAngle = frontRotationAngle; // Apply to current view
                currentState = 'idle';
                markFrontDefectsButton.disabled = false;
                updateStatus("Front rotation set. Mark front defects.");
                updateCursor();
                calibrationPoints = []; // Clear rotation points
            } else {
                updateStatus("Click second point for front rotation.");
            }
            draw();
        }
        else if (currentState === 'marking_front_defects') {
            if (frontDefectPoints.length >= 8) {
                updateStatus("Maximum 8 front defects reached!");
                return;
            }
            frontDefectPoints.push(worldPos);
            const magnifiedData = captureMagnifiedArea(worldPos);
            frontDefectMagnifications.push(magnifiedData);
            updateFrontDefectCount();
            
            if (frontDefectPoints.length >= 1) {
                exportPdfButton.disabled = false;
            }
            
            if (frontDefectPoints.length >= 8) {
                currentState = 'idle';
                updateStatus("8 front defects marked! Ready to export PDF.");
                updateCursor();
            } else {
                updateStatus(`Front defect ${frontDefectPoints.length} marked. ${8 - frontDefectPoints.length} remaining.`);
            }
            draw();
        }
    }

    // ===== CALCULATIONS =====
    function calculateScale() {
        const realWidth = parseFloat(realWidthInput.value);
        if (isNaN(realWidth) || realWidth <= 0) {
            updateStatus("Error: Invalid real width.");
            return;
        }
        const p1 = calibrationPoints[2];
        const p2 = calibrationPoints[3];
        const pixelDist = Math.abs(p2.x - p1.x);
        pixelsPerMm = pixelDist / realWidth;
    }

    function updateMeasurements() {
        if (pixelsPerMm === 0) return;
        const mPoints = calibrationPoints.slice(4);
        
        // Auto-align points after all 8 measurement points are placed
        if (mPoints.length === 8) {
            // Calculate center from all 8 points
            let centerX = 0, centerY = 0;
            mPoints.forEach(p => {
                centerX += p.x;
                centerY += p.y;
            });
            centerX /= 8;
            centerY /= 8;
            
            // Align horizontal measurement points (indices 0-3) to centerY
            // These measure left-right distance, so keep X, adjust Y
            mPoints[0].y = centerY;
            mPoints[1].y = centerY;
            mPoints[2].y = centerY;
            mPoints[3].y = centerY;
            
            // Align vertical measurement points (indices 4-7) to centerX
            // These measure top-bottom distance, so adjust X, keep Y
            mPoints[4].x = centerX;
            mPoints[5].x = centerX;
            mPoints[6].x = centerX;
            mPoints[7].x = centerX;
        }
        
        if (mPoints.length >= 2) {
            const dist = Math.abs(mPoints[1].x - mPoints[0].x) / pixelsPerMm;
            measurements.left = dist;
            resLeft.textContent = dist.toFixed(2);
        }
        if (mPoints.length >= 4) {
            const dist = Math.abs(mPoints[3].x - mPoints[2].x) / pixelsPerMm;
            measurements.right = dist;
            resRight.textContent = dist.toFixed(2);
        }
        if (mPoints.length >= 6) {
            const dist = Math.abs(mPoints[5].y - mPoints[4].y) / pixelsPerMm;
            measurements.top = dist;
            resTop.textContent = dist.toFixed(2);
        }
        if (mPoints.length >= 8) {
            const dist = Math.abs(mPoints[7].y - mPoints[6].y) / pixelsPerMm;
            measurements.bottom = dist;
            resBottom.textContent = dist.toFixed(2);
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
            resHPercent.textContent = `L: ${leftPercent.toFixed(1)}% / R: ${rightPercent.toFixed(1)}%`;
        }
        if (totalV > 0) {
            const topPercent = (top / totalV) * 100;
            const bottomPercent = (bottom / totalV) * 100;
            resVPercent.textContent = `T: ${topPercent.toFixed(1)}% / B: ${bottomPercent.toFixed(1)}%`;
        }
    }

    function calculateGrade(percentage) {
        if (percentage < 55) return 10;
        else if (percentage < 60) return 9;
        else if (percentage < 65) return 8;
        else if (percentage < 70) return 7;
        else if (percentage < 75) return 5;
        else return 0;
    }

    function getGradingInfo() {
        const { left, right, top, bottom } = measurements;
        const totalH = left + right;
        const totalV = top + bottom;
        
        const leftPercent = totalH > 0 ? (left / totalH) * 100 : 0;
        const rightPercent = totalH > 0 ? (right / totalH) * 100 : 0;
        const topPercent = totalV > 0 ? (top / totalV) * 100 : 0;
        const bottomPercent = totalV > 0 ? (bottom / totalV) * 100 : 0;
        
        // Use maximum percentage from each pair
        const maxHPercent = Math.max(leftPercent, rightPercent);
        const maxVPercent = Math.max(topPercent, bottomPercent);
        
        const gradeH = calculateGrade(maxHPercent);
        const gradeV = calculateGrade(maxVPercent);
        const totalGrade = Math.floor((gradeH + gradeV) / 2);
        
        return {
            leftPercent,
            rightPercent,
            topPercent,
            bottomPercent,
            maxHPercent,
            maxVPercent,
            gradeH,
            gradeV,
            totalGrade
        };
    }

    function captureMagnifiedArea(worldPos) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        const captureSize = 150;
        tempCanvas.width = captureSize;
        tempCanvas.height = captureSize;
        
        tempCtx.save();
        tempCtx.beginPath();
        tempCtx.arc(captureSize / 2, captureSize / 2, captureSize / 2, 0, Math.PI * 2);
        tempCtx.clip();
        tempCtx.translate(captureSize / 2, captureSize / 2);
        tempCtx.scale(magnificationFactor, magnificationFactor);
        tempCtx.rotate(rotationAngle);
        tempCtx.translate(-worldPos.x, -worldPos.y);
        tempCtx.drawImage(image, 0, 0);
        tempCtx.restore();
        
        return tempCanvas.toDataURL('image/png');
    }

    // ===== DRAWING =====
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
        
        drawCalibrationPoints();
        drawDefectPoints();
        
        ctx.restore();
    }

    function drawCalibrationPoints() {
        if (calibrationPoints.length === 0) return;
        
        const pointSize = 10 / zoom;
        ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
        
        calibrationPoints.forEach((p, i) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, pointSize / 2, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Draw measurement lines if completed
        if (calibrationPoints.length >= 12) {
            drawMeasurementLines();
        }
    }

    function drawMeasurementLines() {
        const mPoints = calibrationPoints.slice(4);
        const lineWidth = 2 / zoom;
        ctx.lineWidth = lineWidth;
        
        const pairs = [
            { points: [mPoints[0], mPoints[1]], color: '#FF0000', letter: 'A', label: measurements.left.toFixed(2) + ' mm', offsetY: -30 },
            { points: [mPoints[2], mPoints[3]], color: '#FFD700', letter: 'B', label: measurements.right.toFixed(2) + ' mm', offsetY: 30 },
            { points: [mPoints[4], mPoints[5]], color: '#00FF00', letter: 'C', label: measurements.top.toFixed(2) + ' mm', offsetX: -30 },
            { points: [mPoints[6], mPoints[7]], color: '#FFA500', letter: 'D', label: measurements.bottom.toFixed(2) + ' mm', offsetX: 30 }
        ];
        
        pairs.forEach(pair => {
            if (pair.points[0] && pair.points[1]) {
                ctx.strokeStyle = pair.color;
                ctx.beginPath();
                ctx.moveTo(pair.points[0].x, pair.points[0].y);
                ctx.lineTo(pair.points[1].x, pair.points[1].y);
                ctx.stroke();
                
                // Draw letter label offset from midpoint
                const midX = (pair.points[0].x + pair.points[1].x) / 2;
                const midY = (pair.points[0].y + pair.points[1].y) / 2;
                const fontSize = 20 / zoom;
                const offsetX = (pair.offsetX || 0) / zoom;
                const offsetY = (pair.offsetY || 0) / zoom;
                
                ctx.font = `bold ${fontSize}px Arial`;
                ctx.fillStyle = pair.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(pair.letter, midX + offsetX, midY + offsetY);
            }
        });
    }

    function drawDefectPoints() {
        // Draw the appropriate defect points based on which image is shown
        const pointsToDraw = isWorkingOnFront ? frontDefectPoints : defectPoints;
        
        if (pointsToDraw.length === 0) return;
        
        const pointSize = 12 / zoom;
        const circleRadius = 30 / zoom;
        const fontSize = 16 / zoom;
        
        ctx.font = `bold ${fontSize}px Arial`;
        
        pointsToDraw.forEach((p, i) => {
            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 3 / zoom;
            ctx.beginPath();
            ctx.arc(p.x, p.y, circleRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, pointSize / 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3 / zoom;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeText((i + 1).toString(), p.x, p.y);
            ctx.fillText((i + 1).toString(), p.x, p.y);
        });
    }

    // ===== ZOOM & PAN =====
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

    canvasContainer.addEventListener('contextmenu', (e) => e.preventDefault());

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

    // ===== MAGNIFIER =====
    function updateMagnifier(e) {
        const showMagnifier = currentState === 'rotating' || currentState === 'calibrating' || 
                             currentState === 'measuring' || currentState === 'marking_defects' ||
                             currentState === 'rotating_front' || currentState === 'marking_front_defects';
        if (!image || !showMagnifier) {
            hideMagnifier();
            return;
        }
        magnifier.style.display = 'block';
        positionMagnifier(e);
        drawMagnifier(e);
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
        magnifierCtx.restore();
        
        drawCrosshair();
    }

    function drawCrosshair() {
        const center = magnifierSize / 2;
        const crossSize = 10;
        magnifierCtx.strokeStyle = '#EF4444';
        magnifierCtx.lineWidth = 2;
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

    function hideMagnifier() {
        magnifier.style.display = 'none';
    }

    // ===== PDF EXPORT =====
    exportPdfButton.addEventListener('click', generatePdfReport);

    async function generatePdfReport() {
        if (!image || !calibrationComplete || defectPoints.length === 0) {
            updateStatus("Error: Complete calibration and mark at least 1 defect.");
            return;
        }

        updateStatus("Generating PDF report...");
        updateStepIndicator(4, 'active');

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const margin = 15;
        const usableWidth = pageWidth - (margin * 2);
        const halfWidth = usableWidth / 2;

        // ===== PAGE 1: CENTERING =====
        // Header with gradient effect (simulated with rectangles)
        pdf.setFillColor(34, 197, 94); // Green
        pdf.rect(0, 0, pageWidth, 20, 'F');
        
        pdf.setFontSize(20);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text('CENTERING ANALYSIS', pageWidth / 2, 13, { align: 'center' });
        pdf.setTextColor(0, 0, 0);

        // Generate calibration image (left 50%)
        const calibrationCanvas = await generateCalibrationCanvas();
        const calibrationImageData = calibrationCanvas.toDataURL('image/jpeg', 1.0);
        
        const imgHeight = (calibrationCanvas.height / calibrationCanvas.width) * halfWidth;
        const imgY = margin + 15;
        pdf.addImage(calibrationImageData, 'JPEG', margin, imgY, halfWidth, imgHeight);

        // Right side: Tables (50%)
        const rightX = margin + halfWidth + 5;
        let currentY = imgY;

        // Get grading info
        const grading = getGradingInfo();

        // Box for Centering Table
        pdf.setFillColor(240, 240, 240);
        pdf.roundedRect(rightX - 2, currentY - 2, halfWidth - 3, 38, 2, 2, 'F');
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(rightX - 2, currentY - 2, halfWidth - 3, 38, 2, 2, 'S');

        // Table 1: Centering Percentages with colors
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Centering Percentages', rightX + 2, currentY + 5);
        currentY += 12;

        pdf.setFontSize(11);
        pdf.setFont(undefined, 'normal');
        
        // A - Left (Red)
        pdf.setTextColor(255, 0, 0);
        pdf.text(`A (Left): ${grading.leftPercent.toFixed(1)}%`, rightX + 4, currentY);
        currentY += 6;
        
        // B - Right (Yellow/Gold)
        pdf.setTextColor(200, 150, 0);
        pdf.text(`B (Right): ${grading.rightPercent.toFixed(1)}%`, rightX + 4, currentY);
        currentY += 6;
        
        // C - Top (Green)
        pdf.setTextColor(0, 180, 0);
        pdf.text(`C (Top): ${grading.topPercent.toFixed(1)}%`, rightX + 4, currentY);
        currentY += 6;
        
        // D - Bottom (Orange)
        pdf.setTextColor(255, 140, 0);
        pdf.text(`D (Bottom): ${grading.bottomPercent.toFixed(1)}%`, rightX + 4, currentY);
        currentY += 12;

        // Reset color
        pdf.setTextColor(0, 0, 0);

        // Box for Grades Table
        pdf.setFillColor(34, 197, 94, 0.1);
        pdf.setFillColor(220, 252, 231);
        pdf.roundedRect(rightX - 2, currentY - 2, halfWidth - 3, 28, 2, 2, 'F');
        pdf.setDrawColor(34, 197, 94);
        pdf.roundedRect(rightX - 2, currentY - 2, halfWidth - 3, 28, 2, 2, 'S');

        // Table 2: Grades
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Grade Summary', rightX + 2, currentY + 5);
        currentY += 12;

        pdf.setFontSize(11);
        pdf.setFont(undefined, 'normal');
        pdf.text(`Horizontal: ${grading.gradeH}/10`, rightX + 4, currentY);
        currentY += 6;
        pdf.text(`Vertical: ${grading.gradeV}/10`, rightX + 4, currentY);
        currentY += 8;
        
        pdf.setFontSize(13);
        pdf.setFont(undefined, 'bold');
        pdf.setFillColor(34, 197, 94);
        pdf.setTextColor(255, 255, 255);
        pdf.roundedRect(rightX + 2, currentY - 4, halfWidth - 10, 8, 1, 1, 'F');
        pdf.text(`TOTAL GRADE: ${grading.totalGrade}/10`, rightX + (halfWidth - 10) / 2, currentY + 1, { align: 'center' });
        pdf.setTextColor(0, 0, 0);

        // ===== PAGE 2: FRONT DEFECTS =====
        if (frontImage && frontDefectPoints.length > 0) {
            pdf.addPage();
            
            // Header with gradient effect
            pdf.setFillColor(239, 68, 68); // Red
            pdf.rect(0, 0, pageWidth, 20, 'F');
            
            pdf.setFontSize(20);
            pdf.setFont(undefined, 'bold');
            pdf.setTextColor(255, 255, 255);
            pdf.text('DEFECT ANALYSIS - FRONT', pageWidth / 2, 13, { align: 'center' });
            pdf.setTextColor(0, 0, 0);

            // Generate front defects
            const frontDefectImageCanvas = await generateFrontDefectImageWithCircles();
            const frontThumbnailGridCanvas = await generateFrontDefectThumbnailGrid();

            const startY = margin + 15;
            
            // Left side: Main image with circles (50%)
            const frontLeftImgHeight = (frontDefectImageCanvas.height / frontDefectImageCanvas.width) * halfWidth;
            const frontDefectImageData = frontDefectImageCanvas.toDataURL('image/jpeg', 1.0);
            
            // Add border around image
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.5);
            pdf.rect(margin, startY, halfWidth, frontLeftImgHeight, 'S');
            pdf.addImage(frontDefectImageData, 'JPEG', margin, startY, halfWidth, frontLeftImgHeight);

            // Right side: Thumbnail grid (50%)
            const frontRightImgHeight = (frontThumbnailGridCanvas.height / frontThumbnailGridCanvas.width) * halfWidth;
            const frontGridImageData = frontThumbnailGridCanvas.toDataURL('image/jpeg', 1.0);
            pdf.addImage(frontGridImageData, 'JPEG', rightX, startY, halfWidth, frontRightImgHeight);

            // Add defect summary below with styled box
            const frontSummaryY = startY + Math.max(frontLeftImgHeight, frontRightImgHeight) + 10;
            
            // Get manual grade
            const frontGrade = parseFloat(document.getElementById('frontDefectGrade').value) || 10;
            
            pdf.setFillColor(254, 226, 226);
            pdf.roundedRect(margin, frontSummaryY - 5, usableWidth, 17, 2, 2, 'F');
            pdf.setDrawColor(239, 68, 68);
            pdf.roundedRect(margin, frontSummaryY - 5, usableWidth, 17, 2, 2, 'S');
            
            pdf.setFontSize(12);
            pdf.setFont(undefined, 'bold');
            pdf.text(`Total Front Defects Found: ${frontDefectPoints.length}`, margin + 5, frontSummaryY + 2);
            
            pdf.setFontSize(11);
            pdf.text(`Grade: ${frontGrade}/10`, margin + 5, frontSummaryY + 9);
        }

        // ===== PAGE 3: BACK DEFECTS =====
        pdf.addPage();
        
        // Header with gradient effect
        pdf.setFillColor(59, 130, 246); // Blue
        pdf.rect(0, 0, pageWidth, 20, 'F');
        
        pdf.setFontSize(20);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text('DEFECT ANALYSIS - BACK', pageWidth / 2, 13, { align: 'center' });
        pdf.setTextColor(0, 0, 0);

        // Generate both parts separately
        const defectImageCanvas = await generateDefectImageWithCircles();
        const thumbnailGridCanvas = await generateDefectThumbnailGrid();

        const startY = margin + 15;
        
        // Left side: Main image with circles (50%)
        const leftImgHeight = (defectImageCanvas.height / defectImageCanvas.width) * halfWidth;
        const defectImageData = defectImageCanvas.toDataURL('image/jpeg', 1.0);
        
        // Add border around image
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.5);
        pdf.rect(margin, startY, halfWidth, leftImgHeight, 'S');
        pdf.addImage(defectImageData, 'JPEG', margin, startY, halfWidth, leftImgHeight);

        // Right side: Thumbnail grid (50%)
        const rightImgHeight = (thumbnailGridCanvas.height / thumbnailGridCanvas.width) * halfWidth;
        const gridImageData = thumbnailGridCanvas.toDataURL('image/jpeg', 1.0);
        pdf.addImage(gridImageData, 'JPEG', rightX, startY, halfWidth, rightImgHeight);

        // Add defect summary below with styled box
        const summaryY = startY + Math.max(leftImgHeight, rightImgHeight) + 10;
        
        // Get manual grade
        const backGrade = parseFloat(document.getElementById('backDefectGrade').value) || 10;
        
        pdf.setFillColor(219, 234, 254);
        pdf.roundedRect(margin, summaryY - 5, usableWidth, 17, 2, 2, 'F');
        pdf.setDrawColor(59, 130, 246);
        pdf.roundedRect(margin, summaryY - 5, usableWidth, 17, 2, 2, 'S');
        
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text(`Total Back Defects Found: ${defectPoints.length}`, margin + 5, summaryY + 2);
        
        pdf.setFontSize(11);
        pdf.text(`Grade: ${backGrade}/10`, margin + 5, summaryY + 9);

        // ===== PAGE 4: FINAL SUMMARY =====
        pdf.addPage();
        
        // Header
        pdf.setFillColor(139, 92, 246); // Purple
        pdf.rect(0, 0, pageWidth, 20, 'F');
        
        pdf.setFontSize(20);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text('FINAL REPORT SUMMARY', pageWidth / 2, 13, { align: 'center' });
        pdf.setTextColor(0, 0, 0);
        
        let summaryY2 = margin + 25;
        
        // Centering Grade Box
        pdf.setFillColor(220, 252, 231);
        pdf.roundedRect(margin, summaryY2, usableWidth, 25, 3, 3, 'F');
        pdf.setDrawColor(34, 197, 94);
        pdf.setLineWidth(1);
        pdf.roundedRect(margin, summaryY2, usableWidth, 25, 3, 3, 'S');
        
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(34, 197, 94);
        pdf.text('CENTERING GRADE', margin + 5, summaryY2 + 8);
        
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Horizontal: ${grading.gradeH}/10`, margin + 10, summaryY2 + 16);
        pdf.text(`Vertical: ${grading.gradeV}/10`, margin + 60, summaryY2 + 16);
        pdf.text(`Total: ${grading.totalGrade}/10`, margin + 110, summaryY2 + 16);
        
        summaryY2 += 35;
        
        //FRONT DEFECTS GRADE Box
        if (frontImage && frontDefectPoints.length > 0) {
            const frontGradeVal = parseFloat(document.getElementById('frontDefectGrade').value) || 10;
            
            pdf.setFillColor(254, 226, 226);
            pdf.roundedRect(margin, summaryY2, usableWidth, 20, 3, 3, 'F');
            pdf.setDrawColor(239, 68, 68);
            pdf.setLineWidth(1);
            pdf.roundedRect(margin, summaryY2, usableWidth, 20, 3, 3, 'S');
            
            pdf.setFontSize(16);
            pdf.setFont(undefined, 'bold');
            pdf.setTextColor(239, 68, 68);
            pdf.text('FRONT DEFECTS GRADE', margin + 5, summaryY2 + 8);
            
            pdf.setFontSize(14);
            pdf.setFont(undefined, 'normal');
            pdf.setTextColor(0, 0, 0);
            pdf.text(`Defects: ${frontDefectPoints.length}`, margin + 10, summaryY2 + 15);
            pdf.text(`Grade: ${frontGradeVal}/10`, margin + 110, summaryY2 + 15);
            
            summaryY2 += 30;
        }
        
        //BACK DEFECTS GRADE Box
        const backGradeVal = parseFloat(document.getElementById('backDefectGrade').value) || 10;
        
        pdf.setFillColor(219, 234, 254);
        pdf.roundedRect(margin, summaryY2, usableWidth, 20, 3, 3, 'F');
        pdf.setDrawColor(59, 130, 246);
        pdf.setLineWidth(1);
        pdf.roundedRect(margin, summaryY2, usableWidth, 20, 3, 3, 'S');
        
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(59, 130, 246);
        pdf.text('BACK DEFECTS GRADE', margin + 5, summaryY2 + 8);
        
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Defects: ${defectPoints.length}`, margin + 10, summaryY2 + 15);
        pdf.text(`Grade: ${backGradeVal}/10`, margin + 110, summaryY2 + 15);
        
        summaryY2 += 35;
        
        // Calculate overall grade
        let totalScores = grading.totalGrade;
        let numScores = 1;
        
        if (frontImage && frontDefectPoints.length > 0) {
            totalScores += parseFloat(document.getElementById('frontDefectGrade').value) || 10;
            numScores++;
        }
        
        totalScores += parseFloat(document.getElementById('backDefectGrade').value) || 10;
        numScores++;
        
        const overallGrade = (totalScores / numScores).toFixed(1);
        
        // Overall Grade Box
        pdf.setFillColor(139, 92, 246);
        pdf.roundedRect(margin, summaryY2, usableWidth, 25, 3, 3, 'F');
        
        pdf.setFontSize(18);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text(`OVERALL GRADE: ${overallGrade}/10`, pageWidth / 2, summaryY2 + 16, { align: 'center' });
        pdf.setTextColor(0, 0, 0);

        // Save PDF
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        pdf.save(`report_${timestamp}.pdf`);

        updateStatus("PDF report generated successfully!");
        updateStepIndicator(4, 'completed');
    }

    async function generateCalibrationCanvas() {
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d', { alpha: false });

        if (backRotationAngle !== 0) {
            const cos = Math.abs(Math.cos(backRotationAngle));
            const sin = Math.abs(Math.sin(backRotationAngle));
            const newWidth = backImage.width * cos + backImage.height * sin;
            const newHeight = backImage.width * sin + backImage.height * cos;
            
            exportCanvas.width = newWidth;
            exportCanvas.height = newHeight;
            
            exportCtx.save();
            exportCtx.translate(newWidth / 2, newHeight / 2);
            exportCtx.rotate(backRotationAngle);
            exportCtx.drawImage(backImage, -backImage.width / 2, -backImage.height / 2);
            exportCtx.restore();
        } else {
            exportCanvas.width = backImage.width;
            exportCanvas.height = backImage.height;
            exportCtx.drawImage(backImage, 0, 0);
        }

        // Draw calibration reference points (first 4 points) in blue
        const calPoints = calibrationPoints.slice(0, 4);
        const calLineWidth = Math.max(2, Math.min(exportCanvas.width, exportCanvas.height) * 0.002);
        
        exportCtx.strokeStyle = '#0000FF';
        exportCtx.fillStyle = '#0000FF';
        exportCtx.lineWidth = calLineWidth;
        exportCtx.globalAlpha = 0.5;
        
        calPoints.forEach((point, idx) => {
            if (point) {
                let p = transformPointBack(point);
                const radius = calLineWidth * 3;
                
                // Draw circle
                exportCtx.beginPath();
                exportCtx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
                exportCtx.fill();
                
                // Draw cross
                exportCtx.beginPath();
                exportCtx.moveTo(p.x - radius * 1.5, p.y);
                exportCtx.lineTo(p.x + radius * 1.5, p.y);
                exportCtx.moveTo(p.x, p.y - radius * 1.5);
                exportCtx.lineTo(p.x, p.y + radius * 1.5);
                exportCtx.stroke();
            }
        });
        exportCtx.globalAlpha = 1.0;

        // Draw measurement lines
        const mPoints = calibrationPoints.slice(4);
        const lineWidth = Math.max(3, Math.min(exportCanvas.width, exportCanvas.height) * 0.003);
        
        const pairs = [
            { points: [mPoints[0], mPoints[1]], color: '#FF0000', letter: 'A', offsetY: -30 },
            { points: [mPoints[2], mPoints[3]], color: '#FFD700', letter: 'B', offsetY: 30 },
            { points: [mPoints[4], mPoints[5]], color: '#00FF00', letter: 'C', offsetX: -30 },
            { points: [mPoints[6], mPoints[7]], color: '#FFA500', letter: 'D', offsetX: 30 }
        ];

        pairs.forEach(pair => {
            if (pair.points[0] && pair.points[1]) {
                let p1 = transformPointBack(pair.points[0]);
                let p2 = transformPointBack(pair.points[1]);
                
                exportCtx.strokeStyle = pair.color;
                exportCtx.lineWidth = lineWidth;
                exportCtx.beginPath();
                exportCtx.moveTo(p1.x, p1.y);
                exportCtx.lineTo(p2.x, p2.y);
                exportCtx.stroke();
                
                // Draw circles at measurement points
                const circleRadius = lineWidth * 2.5;
                exportCtx.fillStyle = pair.color;
                exportCtx.globalAlpha = 0.7;
                exportCtx.beginPath();
                exportCtx.arc(p1.x, p1.y, circleRadius, 0, 2 * Math.PI);
                exportCtx.fill();
                exportCtx.beginPath();
                exportCtx.arc(p2.x, p2.y, circleRadius, 0, 2 * Math.PI);
                exportCtx.fill();
                exportCtx.globalAlpha = 1.0;
                
                // Draw letter label offset from midpoint
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                const fontSize = Math.max(20, Math.min(exportCanvas.width, exportCanvas.height) * 0.02);
                const offsetX = pair.offsetX || 0;
                const offsetY = pair.offsetY || 0;
                
                exportCtx.font = `bold ${fontSize}px Arial`;
                exportCtx.fillStyle = pair.color;
                exportCtx.textAlign = 'center';
                exportCtx.textBaseline = 'middle';
                exportCtx.fillText(pair.letter, midX + offsetX, midY + offsetY);
            }
        });

        return exportCanvas;
    }

    async function generateDefectImageWithCircles() {
        // Create main image with defect circles only (BACK SIDE)
        let mainImageCanvas = document.createElement('canvas');
        let mainImageCtx = mainImageCanvas.getContext('2d', { alpha: false });

        if (backRotationAngle !== 0) {
            const cos = Math.abs(Math.cos(backRotationAngle));
            const sin = Math.abs(Math.sin(backRotationAngle));
            const newWidth = backImage.width * cos + backImage.height * sin;
            const newHeight = backImage.width * sin + backImage.height * cos;
            
            mainImageCanvas.width = newWidth;
            mainImageCanvas.height = newHeight;
            
            mainImageCtx.save();
            mainImageCtx.translate(newWidth / 2, newHeight / 2);
            mainImageCtx.rotate(backRotationAngle);
            mainImageCtx.drawImage(backImage, -backImage.width / 2, -backImage.height / 2);
            mainImageCtx.restore();
        } else {
            mainImageCanvas.width = backImage.width;
            mainImageCanvas.height = backImage.height;
            mainImageCtx.drawImage(backImage, 0, 0);
        }

        // Draw defect circles
        const circleRadius = Math.max(30, Math.min(mainImageCanvas.width, mainImageCanvas.height) * 0.02);
        const circleLineWidth = Math.max(3, Math.min(mainImageCanvas.width, mainImageCanvas.height) * 0.003);

        defectPoints.forEach((p, i) => {
            const transformed = transformPointBack(p);
            
            mainImageCtx.strokeStyle = '#EF4444';
            mainImageCtx.lineWidth = circleLineWidth;
            mainImageCtx.beginPath();
            mainImageCtx.arc(transformed.x, transformed.y, circleRadius, 0, Math.PI * 2);
            mainImageCtx.stroke();
            
            const fontSize = Math.max(20, Math.min(mainImageCanvas.width, mainImageCanvas.height) * 0.025);
            mainImageCtx.font = `bold ${fontSize}px Arial`;
            mainImageCtx.textAlign = 'center';
            mainImageCtx.textBaseline = 'middle';
            mainImageCtx.strokeStyle = 'black';
            mainImageCtx.lineWidth = 4;
            mainImageCtx.strokeText((i + 1).toString(), transformed.x, transformed.y);
            mainImageCtx.fillStyle = 'white';
            mainImageCtx.fillText((i + 1).toString(), transformed.x, transformed.y);
        });

        return mainImageCanvas;
    }

    async function generateDefectThumbnailGrid() {
        // Create thumbnail grid only
        const thumbnailSize = 200;
        const padding = 20;
        const defectCount = defectMagnifications.length;
        const rows = Math.ceil(defectCount / 2);
        const cols = 2;
        
        const gridCanvas = document.createElement('canvas');
        const gridCtx = gridCanvas.getContext('2d', { alpha: false });
        
        gridCanvas.width = (thumbnailSize * cols) + (padding * (cols + 1));
        gridCanvas.height = (thumbnailSize * rows) + (padding * (rows + 1));
        
        gridCtx.fillStyle = 'white';
        gridCtx.fillRect(0, 0, gridCanvas.width, gridCanvas.height);

        // Load and draw thumbnails
        const imagePromises = defectMagnifications.map((dataUrl) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = dataUrl;
            });
        });

        const loadedImages = await Promise.all(imagePromises);
        
        loadedImages.forEach((img, index) => {
            const col = index % 2;
            const row = Math.floor(index / 2);
            const x = padding + (col * (thumbnailSize + padding));
            const y = padding + (row * (thumbnailSize + padding));
            
            gridCtx.strokeStyle = '#EF4444';
            gridCtx.lineWidth = 3;
            gridCtx.strokeRect(x - 2, y - 2, thumbnailSize + 4, thumbnailSize + 4);
            gridCtx.drawImage(img, x, y, thumbnailSize, thumbnailSize);
            
            gridCtx.fillStyle = 'white';
            gridCtx.strokeStyle = 'black';
            gridCtx.lineWidth = 3;
            gridCtx.font = 'bold 32px Arial';
            gridCtx.textAlign = 'center';
            gridCtx.textBaseline = 'middle';
            gridCtx.strokeText((index + 1).toString(), x + thumbnailSize / 2, y + thumbnailSize / 2);
            gridCtx.fillText((index + 1).toString(), x + thumbnailSize / 2, y + thumbnailSize / 2);
        });

        return gridCanvas;
    }

    // Front side generation functions
    async function generateFrontDefectImageWithCircles() {
        // Create main front image with defect circles
        let mainImageCanvas = document.createElement('canvas');
        let mainImageCtx = mainImageCanvas.getContext('2d', { alpha: false });

        if (frontRotationAngle !== 0) {
            const cos = Math.abs(Math.cos(frontRotationAngle));
            const sin = Math.abs(Math.sin(frontRotationAngle));
            const newWidth = frontImage.width * cos + frontImage.height * sin;
            const newHeight = frontImage.width * sin + frontImage.height * cos;
            
            mainImageCanvas.width = newWidth;
            mainImageCanvas.height = newHeight;
            
            mainImageCtx.save();
            mainImageCtx.translate(newWidth / 2, newHeight / 2);
            mainImageCtx.rotate(frontRotationAngle);
            mainImageCtx.drawImage(frontImage, -frontImage.width / 2, -frontImage.height / 2);
            mainImageCtx.restore();
        } else {
            mainImageCanvas.width = frontImage.width;
            mainImageCanvas.height = frontImage.height;
            mainImageCtx.drawImage(frontImage, 0, 0);
        }

        // Draw front defect circles
        const circleRadius = Math.max(30, Math.min(mainImageCanvas.width, mainImageCanvas.height) * 0.02);
        const circleLineWidth = Math.max(3, Math.min(mainImageCanvas.width, mainImageCanvas.height) * 0.003);

        frontDefectPoints.forEach((p, i) => {
            const transformed = transformPointFront(p);
            
            mainImageCtx.strokeStyle = '#EF4444';
            mainImageCtx.lineWidth = circleLineWidth;
            mainImageCtx.beginPath();
            mainImageCtx.arc(transformed.x, transformed.y, circleRadius, 0, Math.PI * 2);
            mainImageCtx.stroke();
            
            const fontSize = Math.max(20, Math.min(mainImageCanvas.width, mainImageCanvas.height) * 0.025);
            mainImageCtx.font = `bold ${fontSize}px Arial`;
            mainImageCtx.textAlign = 'center';
            mainImageCtx.textBaseline = 'middle';
            mainImageCtx.strokeStyle = 'black';
            mainImageCtx.lineWidth = 4;
            mainImageCtx.strokeText((i + 1).toString(), transformed.x, transformed.y);
            mainImageCtx.fillStyle = 'white';
            mainImageCtx.fillText((i + 1).toString(), transformed.x, transformed.y);
        });

        return mainImageCanvas;
    }

    async function generateFrontDefectThumbnailGrid() {
        // Create thumbnail grid for front defects
        const thumbnailSize = 200;
        const padding = 20;
        const defectCount = frontDefectMagnifications.length;
        const rows = Math.ceil(defectCount / 2);
        const cols = 2;
        
        const gridCanvas = document.createElement('canvas');
        const gridCtx = gridCanvas.getContext('2d', { alpha: false });
        
        gridCanvas.width = (thumbnailSize * cols) + (padding * (cols + 1));
        gridCanvas.height = (thumbnailSize * rows) + (padding * (rows + 1));
        
        gridCtx.fillStyle = 'white';
        gridCtx.fillRect(0, 0, gridCanvas.width, gridCanvas.height);

        // Load and draw thumbnails
        const imagePromises = frontDefectMagnifications.map((dataUrl) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = dataUrl;
            });
        });

        const loadedImages = await Promise.all(imagePromises);
        
        loadedImages.forEach((img, index) => {
            const col = index % 2;
            const row = Math.floor(index / 2);
            const x = padding + (col * (thumbnailSize + padding));
            const y = padding + (row * (thumbnailSize + padding));
            
            gridCtx.strokeStyle = '#EF4444';
            gridCtx.lineWidth = 3;
            gridCtx.strokeRect(x - 2, y - 2, thumbnailSize + 4, thumbnailSize + 4);
            gridCtx.drawImage(img, x, y, thumbnailSize, thumbnailSize);
            
            gridCtx.fillStyle = 'white';
            gridCtx.strokeStyle = 'black';
            gridCtx.lineWidth = 3;
            gridCtx.font = 'bold 32px Arial';
            gridCtx.textAlign = 'center';
            gridCtx.textBaseline = 'middle';
            gridCtx.strokeText((index + 1).toString(), x + thumbnailSize / 2, y + thumbnailSize / 2);
            gridCtx.fillText((index + 1).toString(), x + thumbnailSize / 2, y + thumbnailSize / 2);
        });

        return gridCanvas;
    }

    function transformPointBack(point) {
        // Transform back point based on back rotation
        if (backRotationAngle === 0) return { x: point.x, y: point.y };
        
        const centerX = backImage.width / 2;
        const centerY = backImage.height / 2;
        const dx = point.x - centerX;
        const dy = point.y - centerY;
        const cos = Math.cos(backRotationAngle);
        const sin = Math.sin(backRotationAngle);
        const rotatedX = dx * cos - dy * sin;
        const rotatedY = dx * sin + dy * cos;
        
        const canvasWidth = Math.abs(cos) * backImage.width + Math.abs(sin) * backImage.height;
        const canvasHeight = Math.abs(sin) * backImage.width + Math.abs(cos) * backImage.height;
        
        return {
            x: rotatedX + canvasWidth / 2,
            y: rotatedY + canvasHeight / 2
        };
    }

    function transformPointFront(point) {
        // Transform front point based on front rotation
        if (frontRotationAngle === 0) return { x: point.x, y: point.y };
        
        const centerX = frontImage.width / 2;
        const centerY = frontImage.height / 2;
        const dx = point.x - centerX;
        const dy = point.y - centerY;
        const cos = Math.cos(frontRotationAngle);
        const sin = Math.sin(frontRotationAngle);
        const rotatedX = dx * cos - dy * sin;
        const rotatedY = dx * sin + dy * cos;
        
        const canvasWidth = Math.abs(cos) * frontImage.width + Math.abs(sin) * frontImage.height;
        const canvasHeight = Math.abs(sin) * frontImage.width + Math.abs(cos) * frontImage.height;
        
        return {
            x: rotatedX + canvasWidth / 2,
            y: rotatedY + canvasHeight / 2
        };
    }

    async function generateDefectReportCanvas() {
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d', { alpha: false });

        const thumbnailSize = 200;
        const padding = 20;
        const defectCount = defectMagnifications.length;
        const rows = Math.ceil(defectCount / 2);
        const rightPanelWidth = (thumbnailSize * 2) + (padding * 3);
        const rightPanelHeight = (thumbnailSize * rows) + (padding * (rows + 1));

        // Create main image with defects
        let mainImageCanvas = document.createElement('canvas');
        let mainImageCtx = mainImageCanvas.getContext('2d', { alpha: false });

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

        // Draw defect circles
        const circleRadius = Math.max(30, Math.min(mainImageCanvas.width, mainImageCanvas.height) * 0.02);
        const circleLineWidth = Math.max(3, Math.min(mainImageCanvas.width, mainImageCanvas.height) * 0.003);

        defectPoints.forEach((p, i) => {
            const transformed = transformPoint(p);
            
            mainImageCtx.strokeStyle = '#EF4444';
            mainImageCtx.lineWidth = circleLineWidth;
            mainImageCtx.beginPath();
            mainImageCtx.arc(transformed.x, transformed.y, circleRadius, 0, Math.PI * 2);
            mainImageCtx.stroke();
            
            const fontSize = Math.max(20, Math.min(mainImageCanvas.width, mainImageCanvas.height) * 0.025);
            mainImageCtx.font = `bold ${fontSize}px Arial`;
            mainImageCtx.textAlign = 'center';
            mainImageCtx.textBaseline = 'middle';
            mainImageCtx.strokeStyle = 'black';
            mainImageCtx.lineWidth = 4;
            mainImageCtx.strokeText((i + 1).toString(), transformed.x, transformed.y);
            mainImageCtx.fillStyle = 'white';
            mainImageCtx.fillText((i + 1).toString(), transformed.x, transformed.y);
        });

        // Create composite canvas
        const finalHeight = Math.max(mainImageCanvas.height, rightPanelHeight);
        exportCanvas.width = mainImageCanvas.width + rightPanelWidth + padding;
        exportCanvas.height = finalHeight + (padding * 2);
        
        exportCtx.fillStyle = 'white';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        
        const mainImageY = (exportCanvas.height - mainImageCanvas.height) / 2;
        exportCtx.drawImage(mainImageCanvas, padding, mainImageY);

        // Load and draw thumbnails
        const gridStartX = mainImageCanvas.width + (padding * 2);
        const gridStartY = padding;
        
        const imagePromises = defectMagnifications.map((dataUrl) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = dataUrl;
            });
        });

        const loadedImages = await Promise.all(imagePromises);
        
        loadedImages.forEach((img, index) => {
            const col = index % 2;
            const row = Math.floor(index / 2);
            const x = gridStartX + (col * (thumbnailSize + padding));
            const y = gridStartY + (row * (thumbnailSize + padding));
            
            exportCtx.strokeStyle = '#EF4444';
            exportCtx.lineWidth = 3;
            exportCtx.strokeRect(x - 2, y - 2, thumbnailSize + 4, thumbnailSize + 4);
            exportCtx.drawImage(img, x, y, thumbnailSize, thumbnailSize);
            
            exportCtx.fillStyle = 'white';
            exportCtx.strokeStyle = 'black';
            exportCtx.lineWidth = 3;
            exportCtx.font = 'bold 32px Arial';
            exportCtx.textAlign = 'center';
            exportCtx.textBaseline = 'top';
            const labelX = x + (thumbnailSize / 2);
            const labelY = y + 5;
            exportCtx.strokeText((index + 1).toString(), labelX, labelY);
            exportCtx.fillText((index + 1).toString(), labelX, labelY);
        });

        return exportCanvas;
    }

    function transformPoint(p) {
        let drawX = p.x;
        let drawY = p.y;
        
        if (rotationAngle !== 0) {
            const cos = Math.cos(rotationAngle);
            const sin = Math.sin(rotationAngle);
            const centerX = image.width / 2;
            const centerY = image.height / 2;
            const relX = p.x - centerX;
            const relY = p.y - centerY;
            const rotatedX = relX * cos - relY * sin;
            const rotatedY = relX * sin + relY * cos;
            
            const canvasWidth = rotationAngle !== 0 ? 
                (image.width * Math.abs(Math.cos(rotationAngle)) + image.height * Math.abs(Math.sin(rotationAngle))) : 
                image.width;
            const canvasHeight = rotationAngle !== 0 ? 
                (image.width * Math.abs(Math.sin(rotationAngle)) + image.height * Math.abs(Math.cos(rotationAngle))) : 
                image.height;
            
            drawX = rotatedX + canvasWidth / 2;
            drawY = rotatedY + canvasHeight / 2;
        }
        
        return { x: drawX, y: drawY };
    }

    // ===== UTILITY =====
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

    function updateCursor() {
        if (currentState === 'rotating' || currentState === 'calibrating' || 
            currentState === 'measuring' || currentState === 'marking_defects') {
            canvasContainer.style.cursor = 'crosshair';
        } else if (isPanning) {
            canvasContainer.style.cursor = 'grabbing';
        } else if (image) {
            canvasContainer.style.cursor = 'grab';
        } else {
            canvasContainer.style.cursor = 'default';
        }
    }

    function updateStatus(message) {
        statusMessage.textContent = message;
    }

    function updateDefectCount() {
        defectCount.textContent = defectPoints.length;
    }

    function updateFrontDefectCount() {
        frontDefectCount.textContent = frontDefectPoints.length;
    }

    function resetResultsUI() {
        resLeft.textContent = "--";
        resRight.textContent = "--";
        resTop.textContent = "--";
        resBottom.textContent = "--";
        resHPercent.textContent = "--";
        resVPercent.textContent = "--";
    }

    function updateStepIndicator(step, status) {
        const indicators = [step1, step2, step3, step4];
        const indicator = indicators[step - 1];
        if (indicator) {
            indicator.classList.remove('step-pending', 'step-active', 'step-completed');
            indicator.classList.add(`step-${status}`);
        }
    }

    function resetAll() {
        rotationAngle = 0;
        calibrationPoints = [];
        defectPoints = [];
        defectMagnifications = [];
        measurements = { left: 0, right: 0, top: 0, bottom: 0 };
        pixelsPerMm = 0;
        calibrationComplete = false;
        currentState = 'idle';
        
        rotateButton.disabled = true;
        calibrateButton.disabled = true;
        measureButton.disabled = true;
        markDefectsButton.disabled = true;
        exportPdfButton.disabled = true;
        
        resetResultsUI();
        updateDefectCount();
        updateStepIndicator(1, 'pending');
        updateStepIndicator(2, 'pending');
        updateStepIndicator(3, 'pending');
        updateStepIndicator(4, 'pending');
        updateCursor();
    }
});
