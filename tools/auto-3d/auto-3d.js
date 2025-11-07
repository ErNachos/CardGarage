// Auto 3D Creator - Pokemon Card
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const state = {
    frontOriginal: null,
    backOriginal: null,
    frontProcessed: null,
    backProcessed: null,
    scene: null,
    camera: null,
    renderer: null
};

document.addEventListener('DOMContentLoaded', () => {
    log('Auto 3D Creator ready');
    document.getElementById('frontLoader').addEventListener('change', e => loadImage(e, 'front'));
    document.getElementById('backLoader').addEventListener('change', e => loadImage(e, 'back'));
    document.getElementById('processBtn').addEventListener('click', processImages);
    document.getElementById('generate3DBtn').addEventListener('click', generate3D);
    document.getElementById('exportGLB').addEventListener('click', () => exportModel('glb'));
});

function loadImage(e, side) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
            if (side === 'front') state.frontOriginal = img;
            else state.backOriginal = img;
            drawPreview(img, side);
            if (state.frontOriginal) document.getElementById('processBtn').disabled = false;
            log(`Loaded ${side}: ${img.width}x${img.height}px`);
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}

function drawPreview(img, side) {
    const canvas = document.getElementById(side + 'Canvas');
    canvas.width = 300;
    canvas.height = (img.height / img.width) * 300;
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
}

async function processImages() {
    log('Processing...');
    if (state.frontOriginal) {
        state.frontProcessed = await process(state.frontOriginal);
        drawPreview(state.frontProcessed, 'front');
    }
    if (state.backOriginal) {
        state.backProcessed = await process(state.backOriginal);
        drawPreview(state.backProcessed, 'back');
    }
    document.getElementById('generate3DBtn').disabled = false;
    log('Done!');
}

async function process(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    
    let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            if ((data[i] + data[i+1] + data[i+2]) / 3 > 30) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        }
    }
    
    const result = document.createElement('canvas');
    result.width = maxX - minX;
    result.height = maxY - minY;
    result.getContext('2d').drawImage(canvas, minX, minY, result.width, result.height, 0, 0, result.width, result.height);
    return result;
}

async function generate3D() {
    log('Generating 3D...');
    const container = document.getElementById('viewer3D');
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0xf0f0f0);
    state.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    state.camera.position.z = 150;
    state.renderer = new THREE.WebGLRenderer({antialias: true});
    state.renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = '';
    container.appendChild(state.renderer.domElement);
    
    const controls = new OrbitControls(state.camera, state.renderer.domElement);
    const shape = new THREE.Shape();
    const w = 63, h = 88;
    shape.moveTo(-w/2, -h/2);
    shape.lineTo(w/2, -h/2);
    shape.lineTo(w/2, h/2);
    shape.lineTo(-w/2, h/2);
    shape.lineTo(-w/2, -h/2);
    
    const geom = new THREE.ExtrudeGeometry(shape, {depth: 0.3, bevelEnabled: false});
    const tex = new THREE.CanvasTexture(state.frontProcessed);
    const mat = new THREE.MeshBasicMaterial({map: tex});
    const mesh = new THREE.Mesh(geom, mat);
    state.scene.add(mesh);
    
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        state.renderer.render(state.scene, state.camera);
    }
    animate();
    
    document.getElementById('viewer3DContainer').style.display = 'block';
    document.getElementById('exportPanel').style.display = 'block';
    log('3D ready!');
}

function exportModel(format) {
    log('Exporting ' + format);
    const exporter = new GLTFExporter();
    exporter.parse(state.scene, result => {
        const blob = new Blob([result], {type: 'application/octet-stream'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'card.glb';
        a.click();
        log('Downloaded!');
    }, {binary: true});
}

function log(msg) {
    const c = document.getElementById('console');
    c.innerHTML += new Date().toLocaleTimeString() + ' ' + msg + '\n';
    c.scrollTop = c.scrollHeight;
    console.log(msg);
}
