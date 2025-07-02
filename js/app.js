// Main Application Module
import { CONFIG, LOCKNUT_OUTSIDE_DIAMETER_SPACING, ACTUAL_CONDUIT_OD, CONDUIT_THROAT_DEPTHS, CONDUCTOR_SIZE_DEPTHS } from './modules/config.js';
import { fractionToString, get3DPosition, repositionConduitToFit, easeInOutCubic, canWallFitConduit, checkConduitFit } from './modules/utils.js';

// Application state
const state = {
    pulls: [],
    pullCounter: 1,
    currentBoxDimensions: { ...CONFIG.DEFAULT_BOX_DIMENSIONS },
    minimumBoxDimensions: { width: 0, height: 0, depth: 0 },
    
    // Three.js objects
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    pullBox3D: null,
    pullCurves3D: [],
    pullHoles3D: [],
    pullEndpoints3D: [],
    labels3D: [],
    
    // UI state
    is3DMode: true,
    isWireframeMode: false,
    showLabels: false,
    showDistanceLines: false,
    
    // Interaction state
    raycaster: null,
    mouse: null,
    draggedPoint3D: null,
    hoveredPoint: null,
    
    // ViewCube state
    viewCubeScene: null,
    viewCubeCamera: null,
    viewCubeMesh: null,
    viewCubeRenderer: null,
    viewCubeRaycaster: new THREE.Raycaster(),
    viewCubeMouse: new THREE.Vector2(),
    isDraggingViewCube: false,
    viewCubeDragStart: new THREE.Vector2(),
    viewCubePreviousMouse: new THREE.Vector2()
};

// Make the legacy global variables reference our state
window.locknutOutsideDiameterSpacing = LOCKNUT_OUTSIDE_DIAMETER_SPACING;
window.actualConduitOD = ACTUAL_CONDUIT_OD;
window.conduitThroatDepths = CONDUIT_THROAT_DEPTHS;
window.conductorSizeDepths = CONDUCTOR_SIZE_DEPTHS;
window.PIXELS_PER_INCH = CONFIG.PIXELS_PER_INCH;
window.currentBoxDimensions = state.currentBoxDimensions;
window.pulls = state.pulls;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Hide debug window and NEC warning on page load
    const debugDiv = document.getElementById('debug').parentElement;
    const necWarning = document.getElementById('necWarning');
    debugDiv.style.display = 'none';
    necWarning.style.display = 'none';
    
    // Initialize conductor size visibility
    toggleConductorSize();
    
    // Load pulls from localStorage
    loadPullsFromStorage();
    
    // Update pulls table
    updatePullsTable();
    
    // Initialize Three.js
    initThreeJS();
    document.getElementById('canvas-holder').innerHTML = '';
    document.getElementById('canvas-holder').appendChild(state.renderer.domElement);
    
    // Initialize ViewCube
    initViewCube();
    
    // Start animation
    animate3D();
    
    // Set up debug toggle
    document.getElementById('toggleDebug').addEventListener('change', function(e) {
        const debugDiv = document.getElementById('debug').parentElement;
        debugDiv.style.display = e.target.checked ? 'block' : 'none';
    });
}

// Three.js initialization
function initThreeJS() {
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0xf0f0f0);
    state.scene.fog = new THREE.Fog(0xf0f0f0, 500, 1500);
    
    const canvasWidth = 800;
    const canvasHeight = 600;
    state.camera = new THREE.PerspectiveCamera(75, canvasWidth / canvasHeight, 0.1, 1000);
    
    const boxWidth = state.currentBoxDimensions.width * CONFIG.PIXELS_PER_INCH;
    const boxHeight = state.currentBoxDimensions.height * CONFIG.PIXELS_PER_INCH;
    const fov = state.camera.fov * Math.PI / 180;
    const aspect = state.camera.aspect;
    
    const distanceForHeight = (boxHeight / 2) / Math.tan(fov / 2);
    const distanceForWidth = (boxWidth / 2) / Math.tan(fov / 2) / aspect;
    const distance = Math.max(distanceForHeight, distanceForWidth) * 1.3;
    
    state.camera.position.set(0, 0, distance);
    state.camera.lookAt(0, 0, 0);
    
    state.renderer = new THREE.WebGLRenderer({ antialias: true });
    state.renderer.setSize(canvasWidth, canvasHeight);
    state.renderer.shadowMap.enabled = true;
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    state.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(200, 300, 200);
    directionalLight.castShadow = true;
    state.scene.add(directionalLight);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-200, 200, -100);
    state.scene.add(directionalLight2);
    
    const pointLight = new THREE.PointLight(0xffffff, 0.2);
    pointLight.position.set(0, 400, 0);
    state.scene.add(pointLight);
    
    // Add orbit controls
    state.controls = new THREE.OrbitControls(state.camera, state.renderer.domElement);
    state.controls.enabled = false;
    state.controls.enableDamping = true;
    state.controls.dampingFactor = 0.05;
    
    // Set up raycaster
    state.raycaster = new THREE.Raycaster();
    state.mouse = new THREE.Vector2();
    
    // Create pull box
    createPullBox3D();
    
    // Add event listeners
    state.renderer.domElement.addEventListener('mousedown', on3DMouseDown, false);
    state.renderer.domElement.addEventListener('mousemove', on3DMouseMove, false);
    state.renderer.domElement.addEventListener('mouseup', on3DMouseUp, false);
    window.addEventListener('mouseup', on3DMouseUp, false);
}

// Animation loop
function animate3D() {
    if (!state.is3DMode) return;
    
    requestAnimationFrame(animate3D);
    
    if (state.controls.enabled) {
        state.controls.update();
    }
    
    state.renderer.render(state.scene, state.camera);
    
    if (state.viewCubeRenderer) {
        renderViewCube();
    }
}

// Placeholder functions - these would be imported from other modules in a full implementation
function createPullBox3D() {
    console.log('Creating 3D pull box...');
    // Implementation would be in visualization3D module
}

function initViewCube() {
    console.log('Initializing ViewCube...');
    // Implementation would be in viewCube module
}

function renderViewCube() {
    // Implementation would be in viewCube module
}

function loadPullsFromStorage() {
    const savedPulls = localStorage.getItem('pullBoxPulls');
    const savedCounter = localStorage.getItem('pullCounter');
    const savedDimensions = localStorage.getItem('boxDimensions');
    
    if (savedDimensions) {
        try {
            const dimensions = JSON.parse(savedDimensions);
            state.currentBoxDimensions = dimensions;
            document.getElementById('boxWidth').value = dimensions.width;
            document.getElementById('boxHeight').value = dimensions.height;
            document.getElementById('boxDepth').value = dimensions.depth;
        } catch (e) {
            console.error('Error loading box dimensions:', e);
        }
    }
    
    if (savedPulls) {
        try {
            state.pulls = JSON.parse(savedPulls);
            if (savedCounter) {
                state.pullCounter = parseInt(savedCounter);
            }
        } catch (e) {
            console.error('Error loading pulls:', e);
        }
    }
}

function updatePullsTable() {
    console.log('Updating pulls table...');
    // Implementation would be in uiUpdates module
}

function toggleConductorSize() {
    const entrySide = document.getElementById('entrySide').value;
    const exitSide = document.getElementById('exitSide').value;
    const conductorSizeSelect = document.getElementById('conductorSize');
    const conductorSizePlaceholder = document.getElementById('conductorSizePlaceholder');
    
    if (entrySide === 'rear' || exitSide === 'rear') {
        conductorSizeSelect.classList.remove('hidden');
        conductorSizePlaceholder.classList.add('hidden');
        conductorSizeSelect.selectedIndex = -1;
    } else {
        conductorSizeSelect.classList.add('hidden');
        conductorSizePlaceholder.classList.remove('hidden');
        conductorSizeSelect.value = '16';
    }
}

// Mouse event handlers
function on3DMouseDown(event) {
    console.log('3D mouse down');
    // Implementation would be in interaction3D module
}

function on3DMouseMove(event) {
    console.log('3D mouse move');
    // Implementation would be in interaction3D module
}

function on3DMouseUp(event) {
    console.log('3D mouse up');
    // Implementation would be in interaction3D module
}

// Public API functions
function addPull() {
    console.log('Adding pull...');
    // Implementation would be in dataManager module
}

function clearAllPulls() {
    if (state.pulls.length > 0 && confirm('Are you sure you want to clear all pulls?')) {
        state.pulls = [];
        state.pullCounter = 1;
        localStorage.removeItem('pullBoxPulls');
        localStorage.removeItem('pullCounter');
        updatePullsTable();
        // calculatePullBox();
        // update3DPulls();
    }
}

function updateBoxDimensions() {
    console.log('Updating box dimensions...');
    // Implementation would be in dataManager module
}

// Export functions to window for HTML onclick handlers
window.app = {
    addPull,
    clearAllPulls,
    updateBoxDimensions,
    toggleConductorSize
};