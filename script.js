let pulls = [];
let pullCounter = 1;

// Available wire colors for selection
const wireColors = [
    { name: 'Blue', hex: '#0066ff' },
    { name: 'Red', hex: '#ff0000' },
    { name: 'Green', hex: '#00ff00' },
    { name: 'Yellow', hex: '#ffff00' },
    { name: 'Orange', hex: '#ff8800' },
    { name: 'Purple', hex: '#8800ff' },
    { name: 'Pink', hex: '#ff00ff' },
    { name: 'White', hex: '#ffffff' },
    { name: 'Black', hex: '#000000' }
];

// Locknut outside diameter spacing in inches (per NEC)
const locknutODSpacing = {
    0.5: 1.375,    // ½" conduit
    0.75: 1.75,    // ¾" conduit
    1: 2.375,      // 1" conduit (approximated)
    1.25: 2.625,   // 1-1/4" conduit
    1.5: 2.875,    // 1-1/2" conduit
    2: 3.5,        // 2" conduit
    2.5: 3.875,    // 2-1/2" conduit
    3: 4.5,        // 3" conduit
    3.5: 5.125,    // 3-1/2" conduit
    4: 5.625,      // 4" conduit
    5: 7,          // 5" conduit
    6: 8.25        // 6" conduit
};

// Actual conduit outside diameters in inches
const actualConduitOD = {
    0.5: 0.875,      // ½" conduit = 7/8"
    0.75: 1.0625,    // ¾" conduit = 1-1/16"
    1: 1.3125,       // 1" conduit = 1-5/16"
    1.25: 1.6875,    // 1-1/4" conduit = 1-11/16"
    1.5: 1.9375,     // 1-1/2" conduit = 1-15/16"
    2: 2.375,        // 2" conduit = 2-3/8"
    2.5: 2.875,      // 2-1/2" conduit = 2-7/8"
    3: 3.25,         // 3" conduit = 3-1/4"
    3.5: 4,          // 3-1/2" conduit = 4"
    4: 4.5,          // 4" conduit = 4-1/2"
    5: 5.5625,       // 5" conduit = 5-9/16"
    6: 6.625         // 6" conduit = 6-5/8"
};

const conduitThroatDepths = {
    0.5: 0.54,     // ½" conduit
    0.75: 0.55,    // ¾" conduit
    1: 0.57,       // 1" conduit
    1.25: 0.69,    // 1-1/4" conduit
    1.5: 0.74,     // 1-1/2" conduit
    2: 0.82,       // 2" conduit
    2.5: 0.99,     // 2-1/2" conduit
    3: 0.99,       // 3" conduit
    3.5: 1.00,     // 3-1/2" conduit
    4: 1.04,       // 4" conduit
    5: 1.25,       // 5" conduit
    6: 1.25        // 6" conduit
};

// Box dimensions in inches (converted to pixels for display)
let currentBoxDimensions = {
    width: 12,
    height: 12,
    depth: 6
};
let minimumBoxDimensions = {
    width: 0,
    height: 0,
    depth: 0
};
const PIXELS_PER_INCH = 25; // Scale factor for visualization

// Three.js variables
let scene, camera, renderer, controls;
let pullBox3D;
let pullCurves3D = [];
let pullHoles3D = []; // Store holes in the box
let ambientLight, directionalLight, directionalLight2, pointLight; // Global light references
let is3DMode = true; // Always start in 3D mode
let isWireframeMode = false;
let viewMode = 'solid'; // 'solid', 'wireframe', 'orthogonal'
let showLabels = false; // Labels off by default
let labels3D = []; // Store label sprites
let showDistanceLines = false; // Distance lines off by default
let preventOverlap = false; // Prevent locknut overlap off by default
let showPullArrows = true; // Pull ID arrows on by default
let pullArrows3D = []; // Store pull arrow sprites
let raycaster, mouse;
let draggedPoint3D = null;
let pullEndpoints3D = [];
let hoveredPoint = null;

// Simple mode feature configuration
const simpleModeFeatures = {
    showConductorSize: true,        // Show conductor size column and input
    showDistanceCalculations: true, // Show distance between raceways columns
    showColorPicker: false,         // Show wire color picker in table
    showWireColorColumn: false,     // Show wire color column in table
    showPullArrows: true,           // Show pull ID arrows in 3D view
    showAdvancedControls: false,    // Show advanced 3D controls (wireframe, labels, etc.)
    enableConduitDragging: true,    // Allow dragging conduits in 3D view
    showDebugInfo: false,          // Show debug information panel
    showBoxDimensions: true,       // Show box dimensions controls
    showCalcMethodToggle: true     // Show parallel/non-parallel calculation method toggle
};

// Apply simple mode feature styling
function applySimpleModeFeatures() {
    const simpleTable = document.getElementById('simplePullsTable');
    const simpleBoxDimensions = document.querySelector('#simple-interface .bg-white:last-of-type'); // The box dimensions section
    
    if (simpleTable) {
        // Remove all feature classes first
        simpleTable.classList.remove('simple-hide-conductor', 'simple-hide-distance');
        
        // Apply classes based on feature flags
        if (!simpleModeFeatures.showConductorSize) {
            simpleTable.classList.add('simple-hide-conductor');
        }
        if (!simpleModeFeatures.showDistanceCalculations) {
            simpleTable.classList.add('simple-hide-distance');
        }
    }
    
    // Show/hide box dimensions section
    if (simpleBoxDimensions) {
        if (simpleModeFeatures.showBoxDimensions) {
            simpleBoxDimensions.style.display = 'block';
        } else {
            simpleBoxDimensions.style.display = 'none';
        }
        
        // Show/hide calculation method toggle within box dimensions
        const simpleCalcToggle = simpleBoxDimensions.querySelector('.flex.items-center.space-x-2');
        if (simpleCalcToggle) {
            if (simpleModeFeatures.showCalcMethodToggle) {
                simpleCalcToggle.style.display = 'flex';
            } else {
                simpleCalcToggle.style.display = 'none';
            }
        }
    }
}

// ViewCube variables
let viewCubeScene, viewCubeCamera, viewCubeMesh;
let viewCubeRenderer;
let viewCubeRaycaster = new THREE.Raycaster();
let viewCubeMouse = new THREE.Vector2();
let isDraggingViewCube = false;
let viewCubeSize = 120; // Size in pixels
let viewCubeDragStart = new THREE.Vector2();
let viewCubePreviousMouse = new THREE.Vector2();

// Hide debug window and NEC warning on page load
window.onload = function() {
    const debugDiv = document.getElementById('debug').parentElement;
    const necWarning = document.getElementById('necWarning');
    debugDiv.style.display = 'none'; // Hide by default
    necWarning.style.display = 'none'; // Hide NEC warning by default
    toggleConductorSize(); // Initialize conductor size visibility
    
    // Load pulls from localStorage
    loadPullsFromStorage();
    
    updatePullsTable(); // Ensure table is updated on load
    
    // Button listeners are now added when creating the buttons
};

// Save pulls and box dimensions to localStorage
function savePullsToStorage() {
    // Create a clean copy of pulls without Three.js object references
    const cleanPulls = pulls.map(pull => ({
        id: pull.id,
        entrySide: pull.entrySide,
        exitSide: pull.exitSide,
        conduitSize: pull.conduitSize,
        conductorSize: pull.conductorSize,
        customEntryPoint3D: pull.customEntryPoint3D,
        customExitPoint3D: pull.customExitPoint3D,
        lastBoxWidth: pull.lastBoxWidth,
        lastBoxHeight: pull.lastBoxHeight,
        lastBoxDepth: pull.lastBoxDepth,
        color: pull.color
    }));
    
    localStorage.setItem('pullBoxPulls', JSON.stringify(cleanPulls));
    localStorage.setItem('pullCounter', pullCounter.toString());
    localStorage.setItem('boxDimensions', JSON.stringify(currentBoxDimensions));
    localStorage.setItem('viewMode', viewMode);
}

// Load pulls and box dimensions from localStorage
function loadPullsFromStorage() {
    const savedPulls = localStorage.getItem('pullBoxPulls');
    const savedCounter = localStorage.getItem('pullCounter');
    const savedDimensions = localStorage.getItem('boxDimensions');
    
    // Load box dimensions
    if (savedDimensions) {
        try {
            const dimensions = JSON.parse(savedDimensions);
            currentBoxDimensions = dimensions;
            // Update the input fields
            document.getElementById('boxWidth').value = dimensions.width;
            document.getElementById('boxHeight').value = dimensions.height;
            document.getElementById('boxDepth').value = dimensions.depth;
            
            // Recreate the 3D box with loaded dimensions
            if (scene && camera) {
                createPullBox3D();
                
                // Use the same camera positioning as resetView
                const boxWidth = dimensions.width * PIXELS_PER_INCH;
                const boxHeight = dimensions.height * PIXELS_PER_INCH;
                const boxDepth = dimensions.depth * PIXELS_PER_INCH;
                const fov = camera.fov * Math.PI / 180;
                const aspect = camera.aspect;
                
                // Need to ensure both width and height fit in view
                const distanceForHeight = (boxHeight / 2) / Math.tan(fov / 2);
                const distanceForWidth = (boxWidth / 2) / Math.tan(fov / 2) / aspect;
                
                // Use the larger distance to ensure entire box fits
                const distance = Math.max(distanceForHeight, distanceForWidth) * 1.3; // 1.3 for 30% padding
                camera.position.set(0, 0, distance);
                camera.lookAt(0, 0, 0);
                
                // Update camera far plane to prevent clipping
                const maxDimension = Math.max(boxWidth, boxHeight, boxDepth);
                camera.far = Math.max(1000, distance + maxDimension * 2);
                camera.updateProjectionMatrix();
                
                if (controls) {
                    controls.target.set(0, 0, 0);
                    controls.update();
                }
            }
        } catch (e) {
            console.error('Error loading box dimensions from storage:', e);
        }
    }
    
    // Load pulls
    if (savedPulls) {
        try {
            pulls = JSON.parse(savedPulls);
            if (savedCounter) {
                pullCounter = parseInt(savedCounter);
            }
            
            // Add color property to existing pulls that don't have it (backward compatibility)
            pulls.forEach(pull => {
                if (!pull.color) {
                    pull.color = wireColors[0].hex; // Default to blue
                }
            });
            
            // Recreate 3D visualization with loaded pulls
            if (pulls.length > 0) {
                calculatePullBox();
                if (is3DMode) {
                    update3DPulls();
                    updateConduitColors();
                }
            }
        } catch (e) {
            console.error('Error loading pulls from storage:', e);
            pulls = [];
            pullCounter = 1;
        }
    }
    
    // Load view mode
    const savedViewMode = localStorage.getItem('viewMode');
    if (savedViewMode && ['solid', 'wireframe', 'orthogonal'].includes(savedViewMode)) {
        viewMode = savedViewMode;
        // Apply the loaded view mode
        applyViewMode();
    }
}

// Clear all pulls
function clearAllPulls() {
    const shouldClear = pulls.length > 0 ? confirm('Are you sure you want to clear all pulls?') : confirm('Are you sure you want to reset the box dimensions?');
    
    if (shouldClear) {
        pulls = [];
        pullCounter = 1;
        localStorage.removeItem('pullBoxPulls');
        localStorage.removeItem('pullCounter');
        
        // Reset box dimensions to 12x12x6
        currentBoxDimensions = { width: 12, height: 12, depth: 6 };
        document.getElementById('boxWidth').value = 12;
        document.getElementById('boxHeight').value = 12;
        document.getElementById('boxDepth').value = 6;
        
        // Save new dimensions to localStorage
        localStorage.setItem('boxDimensions', JSON.stringify(currentBoxDimensions));
        
        // Preserve current view mode
        localStorage.setItem('viewMode', viewMode);
        
        // Clear the NEC warning
        const necWarning = document.getElementById('necWarning');
        if (necWarning) {
            necWarning.style.display = 'none';
        }
        
        // Recreate the 3D box with new dimensions and restore view
        if (scene && camera) {
            createPullBox3D();
            
            // If in orthogonal mode, restore the orthogonal view
            if (viewMode === 'orthogonal') {
                switchToOrthogonalView();
            } else {
                // Only reset view for 3D modes (solid/wireframe)
                resetView();
                // Zoom out one more level for better default view
                zoomCamera(1.3);
            }
        }
        
        updatePullsTable();
        calculatePullBox();
        if (is3DMode) {
            update3DPulls();
            updateConduitColors();
        }
    }
}

// Reset to front view
function resetView() {
    // Always show front view
    const boxWidth = currentBoxDimensions.width * PIXELS_PER_INCH;
    const boxHeight = currentBoxDimensions.height * PIXELS_PER_INCH;
    const boxDepth = currentBoxDimensions.depth * PIXELS_PER_INCH;
    const fov = camera.fov * Math.PI / 180;
    const aspect = camera.aspect;
    
    // Need to ensure both width and height fit in view
    const distanceForHeight = (boxHeight / 2) / Math.tan(fov / 2);
    const distanceForWidth = (boxWidth / 2) / Math.tan(fov / 2) / aspect;
    
    // Use the larger distance to ensure entire box fits
    const distance = Math.max(distanceForHeight, distanceForWidth) * 1.3; // 1.3 for 30% padding
    camera.position.set(0, 0, distance);
    camera.lookAt(0, 0, 0);
    
    // Update camera far plane to prevent clipping
    const maxDimension = Math.max(boxWidth, boxHeight, boxDepth);
    camera.far = Math.max(1000, distance + maxDimension * 2);
    camera.updateProjectionMatrix();
    
    controls.target.set(0, 0, 0);
    controls.update();
}

// Toggle between solid, wireframe, and orthogonal modes
function toggleWireframeMode() {
    const button = document.getElementById('toggleWireframe');
    
    // Cycle through modes: solid -> wireframe -> orthogonal -> solid
    switch (viewMode) {
        case 'solid':
            viewMode = 'wireframe';
            isWireframeMode = true;
            button.innerHTML = '<i class="fas fa-cube"></i>';
            button.title = 'Switch to 2D Orthogonal View';
            break;
        case 'wireframe':
            viewMode = 'orthogonal';
            isWireframeMode = false;
            button.innerHTML = '<i class="fas fa-vector-square"></i>';
            button.title = 'Switch to Solid 3D View';
            switchToOrthogonalView();
            break;
        case 'orthogonal':
            viewMode = 'solid';
            isWireframeMode = false;
            button.innerHTML = '<i class="fas fa-border-all"></i>';
            button.title = 'Switch to Wireframe View';
            switchTo3DView();
            break;
    }
    
    // Recreate the box with the new mode
    createPullBox3D();
    // Recreate all pulls to restore cylinders
    update3DPulls();
    updateConduitColors();
    
    // Save the new view mode to localStorage
    localStorage.setItem('viewMode', viewMode);
}

// Apply view mode without cycling (for loading from storage)
function applyViewMode() {
    const button = document.getElementById('toggleWireframe');
    
    switch (viewMode) {
        case 'solid':
            isWireframeMode = false;
            button.innerHTML = '<i class="fas fa-border-all"></i>';
            button.title = 'Switch to Wireframe View';
            // Already in 3D mode by default
            break;
        case 'wireframe':
            isWireframeMode = true;
            button.innerHTML = '<i class="fas fa-cube"></i>';
            button.title = 'Switch to 2D Orthogonal View';
            // Stay in 3D mode but with wireframe
            break;
        case 'orthogonal':
            isWireframeMode = false;
            button.innerHTML = '<i class="fas fa-vector-square"></i>';
            button.title = 'Switch to Solid 3D View';
            switchToOrthogonalView();
            break;
    }
    
    // Recreate the box with the loaded mode
    createPullBox3D();
    // Recreate all pulls to restore cylinders
    update3DPulls();
    updateConduitColors();
}

// Switch to orthogonal (2D) view
function switchToOrthogonalView() {
    // Create orthographic camera
    const canvasHolder = document.getElementById('canvas-holder');
    const canvasWidth = canvasHolder.clientWidth;
    const canvasHeight = canvasHolder.clientHeight;
    
    // Calculate the size needed to fit the box
    const boxWidth = currentBoxDimensions.width * PIXELS_PER_INCH;
    const boxHeight = currentBoxDimensions.height * PIXELS_PER_INCH;
    const boxDepth = currentBoxDimensions.depth * PIXELS_PER_INCH;
    const maxDimension = Math.max(boxWidth, boxHeight, boxDepth);
    const frustumSize = maxDimension * 1.4; // Increased padding for better view
    
    // Calculate dynamic far plane that scales with box size
    const dynamicFar = Math.max(2000, maxDimension * 10);
    
    // Create orthographic camera with dynamic far plane
    const aspect = canvasWidth / canvasHeight;
    const left = -frustumSize * aspect / 2;
    const right = frustumSize * aspect / 2;
    const top = frustumSize / 2;
    const bottom = -frustumSize / 2;
    
    camera = new THREE.OrthographicCamera(left, right, top, bottom, 0.1, dynamicFar);
    
    // Position camera to front view with adequate distance
    const cameraDistance = Math.max(1000, maxDimension * 2);
    camera.position.set(0, 0, cameraDistance);
    camera.lookAt(0, 0, 0);
    
    // Disable orbit controls rotation for 2D view but enable panning and zooming
    controls.enableRotate = false;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.enabled = true;
    controls.object = camera;
    controls.update();
    
    // Set flat lighting for technical drawing view
    set2DLighting();
    
    // Set cursor to default initially (will change to move when hovering over box)
    renderer.domElement.style.cursor = 'default';
}

// Switch back to 3D perspective view
function switchTo3DView() {
    // Calculate proper camera parameters based on box size
    const canvasHolder = document.getElementById('canvas-holder');
    const canvasWidth = canvasHolder.clientWidth;
    const canvasHeight = canvasHolder.clientHeight;
    
    const boxWidth = currentBoxDimensions.width * PIXELS_PER_INCH;
    const boxHeight = currentBoxDimensions.height * PIXELS_PER_INCH;
    const boxDepth = currentBoxDimensions.depth * PIXELS_PER_INCH;
    const maxDimension = Math.max(boxWidth, boxHeight, boxDepth);
    
    // Calculate dynamic far plane that scales with box size
    const dynamicFar = Math.max(2000, maxDimension * 10);
    
    camera = new THREE.PerspectiveCamera(75, canvasWidth / canvasHeight, 0.1, dynamicFar);
    
    // Position camera in front view (same as resetView function)
    const fov = camera.fov * Math.PI / 180;
    const aspect = camera.aspect;
    const distanceForHeight = (boxHeight / 2) / Math.tan(fov / 2);
    const distanceForWidth = (boxWidth / 2) / Math.tan(fov / 2) / aspect;
    const distance = Math.max(distanceForHeight, distanceForWidth) * 1.5; // 1.5 for better padding
    
    camera.position.set(0, 0, distance);
    camera.lookAt(0, 0, 0);
    
    // Re-enable orbit controls rotation for 3D view
    controls.enableRotate = true;
    controls.object = camera;
    controls.target.set(0, 0, 0);
    controls.update();
    
    // Update lighting scale for current box size and restore normal 3D lighting
    updateLightingScale();
    set3DLighting();
    
    // Reset cursor to pointer (enable dragging cursor)
    renderer.domElement.style.cursor = 'pointer';
}

// Set flat lighting for 2D technical drawing view
function set2DLighting() {
    if (ambientLight) ambientLight.intensity = 1.0; // Full ambient light
    if (directionalLight) directionalLight.intensity = 0; // No directional shadows
    if (directionalLight2) directionalLight2.intensity = 0; // No secondary light
    if (pointLight) pointLight.intensity = 0; // No point highlights
}

// Set normal 3D lighting with shadows and highlights
function set3DLighting() {
    if (ambientLight) ambientLight.intensity = 0.6; // Normal ambient
    if (directionalLight) directionalLight.intensity = 0.6; // Normal directional
    if (directionalLight2) directionalLight2.intensity = 0.3; // Normal secondary
    if (pointLight) pointLight.intensity = 0.2; // Normal point
}

// Update light positions and shadow bounds to scale with box size
function updateLightingScale() {
    const boxWidth = currentBoxDimensions.width * PIXELS_PER_INCH;
    const boxHeight = currentBoxDimensions.height * PIXELS_PER_INCH;
    const boxDepth = currentBoxDimensions.depth * PIXELS_PER_INCH;
    const maxDimension = Math.max(boxWidth, boxHeight, boxDepth);
    
    // Position lights at a fixed distance relative to box size (not too far)
    const lightDistance = maxDimension * 1.5; // Much closer relative positioning
    const shadowSize = Math.max(1000, maxDimension * 2);
    const dynamicFar = Math.max(2000, maxDimension * 10);
    
    // Update main directional light position - maintain relative angle but scale distance
    if (directionalLight) {
        directionalLight.position.set(lightDistance * 0.4, lightDistance * 0.6, lightDistance * 0.4);
        directionalLight.shadow.camera.far = dynamicFar;
        directionalLight.shadow.camera.left = -shadowSize;
        directionalLight.shadow.camera.right = shadowSize;
        directionalLight.shadow.camera.top = shadowSize;
        directionalLight.shadow.camera.bottom = -shadowSize;
        directionalLight.shadow.camera.updateProjectionMatrix();
    }
    
    // Update secondary directional light position
    if (directionalLight2) {
        directionalLight2.position.set(-lightDistance * 0.4, lightDistance * 0.4, -lightDistance * 0.2);
    }
    
    // Update point light position
    if (pointLight) {
        pointLight.position.set(0, lightDistance * 0.8, 0);
    }
    
    // Update light intensities based on new scale (only if in 3D mode)
    if (viewMode !== 'orthogonal') {
        set3DLighting();
    }
}

// Toggle labels on/off
function toggleLabels() {
    showLabels = !showLabels;
    const button = document.getElementById('toggleLabels');
    
    if (showLabels) {
        button.style.backgroundColor = 'rgba(200, 200, 200, 0.9)';
        addLabels3D();
    } else {
        button.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        removeLabels3D();
    }
}

// Toggle distance lines
function toggleDistanceLines() {
    showDistanceLines = !showDistanceLines;
    const button = document.getElementById('toggleDistanceLines');
    
    if (showDistanceLines) {
        button.style.backgroundColor = 'rgba(200, 200, 200, 0.9)';
    } else {
        button.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    }
    
    // Update all wire paths to show straight lines or curves
    update3DPulls();
}

// Toggle prevent overlap mode
function togglePreventOverlap() {
    preventOverlap = !preventOverlap;
    const button = document.getElementById('preventOverlap');
    
    if (preventOverlap) {
        button.style.backgroundColor = 'rgba(200, 200, 200, 0.9)';
        button.innerHTML = '<i class="fas fa-magnet"></i>';
    } else {
        button.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        button.innerHTML = '<i class="fas fa-magnet"></i>';
    }
}

function togglePullArrows() {
    showPullArrows = !showPullArrows;
    const button = document.getElementById('togglePullArrows');
    
    if (showPullArrows) {
        button.style.backgroundColor = 'rgba(200, 200, 200, 0.9)';
        button.innerHTML = '<i class="fas fa-arrow-right"></i>';
    } else {
        button.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        button.innerHTML = '<i class="fas fa-arrow-left"></i>';
    }
    
    // Update 3D visualization
    update3DPulls();
}

// Check if position would cause overlap with other conduits
function wouldCauseOverlap(position, draggedPull, pointType, side) {
    const conduitSize = draggedPull.conduitSize;
    const outsideDiameter = locknutODSpacing[conduitSize] || conduitSize + 0.5;
    const outerRadius = (outsideDiameter / 2) * PIXELS_PER_INCH;
    
    // Check against all other conduits on the same wall
    for (const pull of pulls) {
        if (pull === draggedPull) continue; // Skip self
        
        // Get positions of other conduits on the same wall
        const otherPositions = [];
        
        // Check entry point if it's on the same wall
        const entryPos = pull.customEntryPoint3D || get3DPosition(pull.entrySide, 
            currentBoxDimensions.width * PIXELS_PER_INCH,
            currentBoxDimensions.height * PIXELS_PER_INCH, 
            currentBoxDimensions.depth * PIXELS_PER_INCH);
        if (pull.entrySide === side) {
            otherPositions.push({ pos: entryPos, size: pull.conduitSize });
        }
        
        // Check exit point if it's on the same wall
        const exitPos = pull.customExitPoint3D || get3DPosition(pull.exitSide,
            currentBoxDimensions.width * PIXELS_PER_INCH,
            currentBoxDimensions.height * PIXELS_PER_INCH, 
            currentBoxDimensions.depth * PIXELS_PER_INCH);
        if (pull.exitSide === side) {
            otherPositions.push({ pos: exitPos, size: pull.conduitSize });
        }
        
        // Check for overlaps with each position
        for (const other of otherPositions) {
            const otherOutsideDiameter = locknutODSpacing[other.size] || other.size + 0.5;
            const otherOuterRadius = (otherOutsideDiameter / 2) * PIXELS_PER_INCH;
            const minDistance = outerRadius + otherOuterRadius;
            
            const dx = position.x - other.pos.x;
            const dy = position.y - other.pos.y;
            // For conduits on the same wall, only use 2D distance (ignore Z depth)
            const currentDistance = Math.sqrt(dx*dx + dy*dy);
            
            if (currentDistance < minDistance) {
                return true; // Would cause overlap
            }
        }
    }
    
    return false; // No overlap
}

// Reposition conduit to fit within box boundaries
function repositionConduitToFit(side, conduitSize, currentPoint, boxWidth, boxHeight, boxDepth) {
    const outsideDiameter = locknutODSpacing[conduitSize] || conduitSize + 0.5;
    const outerRadius = (outsideDiameter / 2) * PIXELS_PER_INCH;
    
    let newPoint = { ...currentPoint };
    
    switch(side) {
        case 'left':
        case 'right':
            // Constrain y and z coordinates
            newPoint.y = Math.max(-(boxHeight * PIXELS_PER_INCH)/2 + outerRadius, 
                         Math.min((boxHeight * PIXELS_PER_INCH)/2 - outerRadius, newPoint.y));
            newPoint.z = Math.max(-(boxDepth * PIXELS_PER_INCH)/2 + outerRadius, 
                         Math.min((boxDepth * PIXELS_PER_INCH)/2 - outerRadius, newPoint.z));
            // Update x to match new wall position
            newPoint.x = (side === 'left' ? -boxWidth/2 : boxWidth/2) * PIXELS_PER_INCH;
            break;
        case 'top':
        case 'bottom':
            // Constrain x and z coordinates
            newPoint.x = Math.max(-(boxWidth * PIXELS_PER_INCH)/2 + outerRadius, 
                         Math.min((boxWidth * PIXELS_PER_INCH)/2 - outerRadius, newPoint.x));
            newPoint.z = Math.max(-(boxDepth * PIXELS_PER_INCH)/2 + outerRadius, 
                         Math.min((boxDepth * PIXELS_PER_INCH)/2 - outerRadius, newPoint.z));
            // Update y to match new wall position
            newPoint.y = (side === 'top' ? boxHeight/2 : -boxHeight/2) * PIXELS_PER_INCH;
            break;
        case 'rear':
            // Constrain x and y coordinates
            newPoint.x = Math.max(-(boxWidth * PIXELS_PER_INCH)/2 + outerRadius, 
                         Math.min((boxWidth * PIXELS_PER_INCH)/2 - outerRadius, newPoint.x));
            newPoint.y = Math.max(-(boxHeight * PIXELS_PER_INCH)/2 + outerRadius, 
                         Math.min((boxHeight * PIXELS_PER_INCH)/2 - outerRadius, newPoint.y));
            // Update z to match new wall position
            newPoint.z = (-boxDepth/2) * PIXELS_PER_INCH;
            break;
    }
    
    return newPoint;
}

// Check if box can physically fit all conduits even with repositioning
function canBoxFitAllConduits(width, height, depth, pulls) {
    // Check if box is large enough for each conduit
    for (const pull of pulls) {
        const od = locknutODSpacing[pull.conduitSize] || pull.conduitSize + 0.5;
        
        // Check entry side
        if (!canWallFitConduit(pull.entrySide, od, width, height, depth)) {
            return { canFit: false, pullId: pull.id, side: pull.entrySide, conduitSize: pull.conduitSize, od: od };
        }
        
        // Check exit side
        if (!canWallFitConduit(pull.exitSide, od, width, height, depth)) {
            return { canFit: false, pullId: pull.id, side: pull.exitSide, conduitSize: pull.conduitSize, od: od };
        }
    }
    
    return { canFit: true };
}

// Check if a wall can fit a conduit
function canWallFitConduit(side, outsideDiameter, width, height, depth) {
    switch(side) {
        case 'left':
        case 'right':
            return height >= outsideDiameter && depth >= outsideDiameter;
        case 'top':
        case 'bottom':
            return width >= outsideDiameter && depth >= outsideDiameter;
        case 'rear':
            return width >= outsideDiameter && height >= outsideDiameter;
    }
    return false;
}

// Update box dimensions
function updateBoxDimensions(mode = 'advanced') {
    // Determine element IDs based on mode
    const prefix = mode === 'simple' ? 'simple' : '';
    const widthId = prefix ? `${prefix}BoxWidth` : 'boxWidth';
    const heightId = prefix ? `${prefix}BoxHeight` : 'boxHeight';
    const depthId = prefix ? `${prefix}BoxDepth` : 'boxDepth';
    
    const width = parseFloat(document.getElementById(widthId).value);
    const height = parseFloat(document.getElementById(heightId).value);
    const depth = parseFloat(document.getElementById(depthId).value);
    
    if (width > 0 && height > 0 && depth > 0) {
        // First check if box is physically large enough for all conduits
        const fitCheck = canBoxFitAllConduits(width, height, depth, pulls);
        if (!fitCheck.canFit) {
            alert(`Cannot resize box: Pull #${fitCheck.pullId} with ${fitCheck.conduitSize}" conduit (${fitCheck.od}" OD) cannot fit on the ${fitCheck.side} wall of a ${width}" × ${height}" × ${depth}" box.`);
            
            // Reset input values
            document.getElementById(widthId).value = currentBoxDimensions.width;
            document.getElementById(heightId).value = currentBoxDimensions.height;
            document.getElementById(depthId).value = currentBoxDimensions.depth;
            return;
        }
        
        const originalDimensions = { ...currentBoxDimensions };
        currentBoxDimensions = { width, height, depth };
        
        // Reposition conduits that would be too close to edges
        const repositionedPulls = [];
        for (const pull of pulls) {
            let needsRepositioning = false;
            let newEntryPoint = pull.customEntryPoint3D || get3DPosition(pull.entrySide, width * PIXELS_PER_INCH, height * PIXELS_PER_INCH, depth * PIXELS_PER_INCH);
            let newExitPoint = pull.customExitPoint3D || get3DPosition(pull.exitSide, width * PIXELS_PER_INCH, height * PIXELS_PER_INCH, depth * PIXELS_PER_INCH);
            
            // Check if entry point needs repositioning
            if (!checkConduitFit(pull.entrySide, pull.conduitSize, newEntryPoint)) {
                newEntryPoint = repositionConduitToFit(pull.entrySide, pull.conduitSize, newEntryPoint, width, height, depth);
                needsRepositioning = true;
            }
            
            // Check if exit point needs repositioning
            if (!checkConduitFit(pull.exitSide, pull.conduitSize, newExitPoint)) {
                newExitPoint = repositionConduitToFit(pull.exitSide, pull.conduitSize, newExitPoint, width, height, depth);
                needsRepositioning = true;
            }
            
            if (needsRepositioning) {
                repositionedPulls.push({
                    pullId: pull.id,
                    newEntryPoint: newEntryPoint,
                    newExitPoint: newExitPoint
                });
            }
        }
        
        // Apply repositioned points to pulls that needed adjustment
        for (const reposition of repositionedPulls) {
            const pull = pulls.find(p => p.id === reposition.pullId);
            if (pull) {
                pull.customEntryPoint3D = reposition.newEntryPoint;
                pull.customExitPoint3D = reposition.newExitPoint;
            }
        }
        
        // Update custom points to match new box dimensions
        pulls.forEach(pull => {
            // Check if this pull was already repositioned
            const wasRepositioned = repositionedPulls.some(r => r.pullId === pull.id);
            
            if (!wasRepositioned) {
                // If pull has custom points, scale them to new box dimensions
                if (pull.customEntryPoint3D) {
                const oldBoxWidth = pull.lastBoxWidth || 12 * PIXELS_PER_INCH;
                const oldBoxHeight = pull.lastBoxHeight || 12 * PIXELS_PER_INCH;
                const oldBoxDepth = pull.lastBoxDepth || 4 * PIXELS_PER_INCH;
                
                // Scale custom points proportionally
                if (pull.entrySide === 'left' || pull.entrySide === 'right') {
                    pull.customEntryPoint3D.y *= (height * PIXELS_PER_INCH) / oldBoxHeight;
                    pull.customEntryPoint3D.z *= (depth * PIXELS_PER_INCH) / oldBoxDepth;
                    pull.customEntryPoint3D.x = (pull.entrySide === 'left' ? -width/2 : width/2) * PIXELS_PER_INCH;
                } else if (pull.entrySide === 'top' || pull.entrySide === 'bottom') {
                    pull.customEntryPoint3D.x *= (width * PIXELS_PER_INCH) / oldBoxWidth;
                    pull.customEntryPoint3D.z *= (depth * PIXELS_PER_INCH) / oldBoxDepth;
                    pull.customEntryPoint3D.y = (pull.entrySide === 'top' ? height/2 : -height/2) * PIXELS_PER_INCH;
                } else if (pull.entrySide === 'rear') {
                    pull.customEntryPoint3D.x *= (width * PIXELS_PER_INCH) / oldBoxWidth;
                    pull.customEntryPoint3D.y *= (height * PIXELS_PER_INCH) / oldBoxHeight;
                    pull.customEntryPoint3D.z = (-depth/2) * PIXELS_PER_INCH;
                }
            }
            
            if (pull.customExitPoint3D) {
                const oldBoxWidth = pull.lastBoxWidth || 12 * PIXELS_PER_INCH;
                const oldBoxHeight = pull.lastBoxHeight || 12 * PIXELS_PER_INCH;
                const oldBoxDepth = pull.lastBoxDepth || 4 * PIXELS_PER_INCH;
                
                // Scale custom points proportionally
                if (pull.exitSide === 'left' || pull.exitSide === 'right') {
                    pull.customExitPoint3D.y *= (height * PIXELS_PER_INCH) / oldBoxHeight;
                    pull.customExitPoint3D.z *= (depth * PIXELS_PER_INCH) / oldBoxDepth;
                    pull.customExitPoint3D.x = (pull.exitSide === 'left' ? -width/2 : width/2) * PIXELS_PER_INCH;
                } else if (pull.exitSide === 'top' || pull.exitSide === 'bottom') {
                    pull.customExitPoint3D.x *= (width * PIXELS_PER_INCH) / oldBoxWidth;
                    pull.customExitPoint3D.z *= (depth * PIXELS_PER_INCH) / oldBoxDepth;
                    pull.customExitPoint3D.y = (pull.exitSide === 'top' ? height/2 : -height/2) * PIXELS_PER_INCH;
                } else if (pull.exitSide === 'rear') {
                    pull.customExitPoint3D.x *= (width * PIXELS_PER_INCH) / oldBoxWidth;
                    pull.customExitPoint3D.y *= (height * PIXELS_PER_INCH) / oldBoxHeight;
                    pull.customExitPoint3D.z = (-depth/2) * PIXELS_PER_INCH;
                }
            }
            }
            
            // Store current box dimensions for next resize
            pull.lastBoxWidth = width * PIXELS_PER_INCH;
            pull.lastBoxHeight = height * PIXELS_PER_INCH;
            pull.lastBoxDepth = depth * PIXELS_PER_INCH;
        });
        
        // Save to localStorage after all updates
        savePullsToStorage();
        
        // Recreate the 3D box with new dimensions
        createPullBox3D();
        // Update all pulls to match new box
        update3DPulls();
        
        // Update lighting scale to match new box dimensions
        updateLightingScale();
        
        // Adjust camera position based on new box size and view mode
        if (viewMode === 'orthogonal') {
            // For orthogonal view, recreate the orthographic camera with proper frustum
            switchToOrthogonalView();
        } else {
            // For perspective cameras (solid/wireframe), adjust position
            const currentDistance = camera.position.length();
            const currentDirection = camera.position.clone().normalize();
            
            // Calculate new distance based on box size
            const boxWidth = width * PIXELS_PER_INCH;
            const boxHeight = height * PIXELS_PER_INCH;
            const fov = camera.fov * Math.PI / 180;
            const aspect = camera.aspect;
            
            const distanceForHeight = (boxHeight / 2) / Math.tan(fov / 2);
            const distanceForWidth = (boxWidth / 2) / Math.tan(fov / 2) / aspect;
            const newDistance = Math.max(distanceForHeight, distanceForWidth) * 1.3;
            
            // Apply new distance while keeping the same viewing angle
            camera.position.copy(currentDirection.multiplyScalar(newDistance));
            camera.lookAt(0, 0, 0);
            
            // Update camera far plane to ensure no clipping for larger boxes
            const maxDimension = Math.max(boxWidth, boxHeight, depth * PIXELS_PER_INCH);
            camera.far = Math.max(1000, newDistance + maxDimension * 2);
            camera.updateProjectionMatrix();
        }
        
        // Synchronize the other interface's input values
        syncBoxDimensionInputs(mode);
        
        // Check if new dimensions meet minimum requirements
        checkBoxSizeCompliance();
    }
}

// Synchronize box dimension inputs between advanced and simple modes
function syncBoxDimensionInputs(currentMode) {
    const targetMode = currentMode === 'simple' ? 'advanced' : 'simple';
    const targetPrefix = targetMode === 'simple' ? 'simple' : '';
    
    const targetWidthId = targetPrefix ? `${targetPrefix}BoxWidth` : 'boxWidth';
    const targetHeightId = targetPrefix ? `${targetPrefix}BoxHeight` : 'boxHeight';
    const targetDepthId = targetPrefix ? `${targetPrefix}BoxDepth` : 'boxDepth';
    
    // Update the other interface's inputs with current dimensions
    const targetWidthInput = document.getElementById(targetWidthId);
    const targetHeightInput = document.getElementById(targetHeightId);
    const targetDepthInput = document.getElementById(targetDepthId);
    
    if (targetWidthInput) targetWidthInput.value = currentBoxDimensions.width;
    if (targetHeightInput) targetHeightInput.value = currentBoxDimensions.height;
    if (targetDepthInput) targetDepthInput.value = currentBoxDimensions.depth;
}

// Synchronize calculation method toggles between advanced and simple modes
function syncCalcMethodToggles(changedToggleId) {
    const advancedToggle = document.getElementById('calcMethodToggle');
    const simpleToggle = document.getElementById('simpleCalcMethodToggle');
    
    if (!advancedToggle || !simpleToggle) return;
    
    if (changedToggleId === 'calcMethodToggle') {
        simpleToggle.checked = advancedToggle.checked;
    } else if (changedToggleId === 'simpleCalcMethodToggle') {
        advancedToggle.checked = simpleToggle.checked;
    }
}

// Auto-increase box dimensions to accommodate conduit if needed
function autoIncreaseBoxForConduit(side, conduitSize) {
    const outsideDiameter = locknutODSpacing[conduitSize] || conduitSize + 0.5;
    const requiredRadius = outsideDiameter / 2;
    const minRequiredDimension = requiredRadius * 2; // Full diameter
    
    let dimensionUpdated = false;
    
    switch(side) {
        case 'left':
        case 'right':
            // Check if depth needs to be increased
            if (currentBoxDimensions.depth < minRequiredDimension) {
                currentBoxDimensions.depth = Math.ceil(minRequiredDimension / 2) * 2; // Round up to nearest even number
                document.getElementById('boxDepth').value = currentBoxDimensions.depth;
                dimensionUpdated = true;
            }
            break;
        case 'top':
        case 'bottom':
            // Check if depth needs to be increased
            if (currentBoxDimensions.depth < minRequiredDimension) {
                currentBoxDimensions.depth = Math.ceil(minRequiredDimension / 2) * 2; // Round up to nearest even number
                document.getElementById('boxDepth').value = currentBoxDimensions.depth;
                dimensionUpdated = true;
            }
            break;
        case 'rear':
            // Rear wall conduits don't typically affect depth since they're positioned on the rear face
            // No auto-increase needed for rear wall
            break;
    }
    
    if (dimensionUpdated) {
        updateBoxDimensions(); // Update the 3D visualization
        console.log(`Auto-increased box depth to ${currentBoxDimensions.depth}" to accommodate ${conduitSize}" conduit on ${side} wall`);
    }
    
    return dimensionUpdated;
}

// Check if conduit fits within wall boundaries
function checkConduitFit(side, conduitSize, customPoint = null) {
    const outsideDiameter = locknutODSpacing[conduitSize] || conduitSize + 0.5;
    const outerRadius = outsideDiameter / 2; // in inches
    
    // Get wall dimensions
    const width = currentBoxDimensions.width;
    const height = currentBoxDimensions.height;
    const depth = currentBoxDimensions.depth;
    
    // Get position (default center or custom)
    let position = { x: 0, y: 0, z: 0 };
    if (customPoint) {
        position = {
            x: customPoint.x / PIXELS_PER_INCH,
            y: customPoint.y / PIXELS_PER_INCH,
            z: customPoint.z / PIXELS_PER_INCH
        };
    }
    
    // Check boundaries based on side
    switch(side) {
        case 'left':
        case 'right':
            // Check vertical boundaries
            if (Math.abs(position.y) + outerRadius > height / 2) return false;
            // Check depth boundaries
            if (Math.abs(position.z) + outerRadius > depth / 2) return false;
            break;
        case 'top':
        case 'bottom':
            // Check horizontal boundaries
            if (Math.abs(position.x) + outerRadius > width / 2) return false;
            // Check depth boundaries
            if (Math.abs(position.z) + outerRadius > depth / 2) return false;
            break;
        case 'rear':
            // Check horizontal boundaries
            if (Math.abs(position.x) + outerRadius > width / 2) return false;
            // Check vertical boundaries
            if (Math.abs(position.y) + outerRadius > height / 2) return false;
            break;
    }
    
    return true;
}

// Toggle conductor size dropdown and label visibility
function toggleConductorSize(mode = 'advanced') {
    // Determine element IDs based on mode
    const prefix = mode === 'simple' ? 'simple' : '';
    const entrySideId = prefix ? `${prefix}EntrySide` : 'entrySide';
    const exitSideId = prefix ? `${prefix}ExitSide` : 'exitSide';
    const conductorSizeId = prefix ? `${prefix}ConductorSize` : 'conductorSize';
    const conductorNotApplicableId = prefix ? `${prefix}ConductorNotApplicable` : 'conductorNotApplicable';
    
    const entrySide = document.getElementById(entrySideId).value;
    const exitSide = document.getElementById(exitSideId).value;
    const conductorSizeSelect = document.getElementById(conductorSizeId);
    const conductorNotApplicable = document.getElementById(conductorNotApplicableId);
    
    if (entrySide === 'rear' || exitSide === 'rear') {
        if (conductorSizeSelect) {
            conductorSizeSelect.classList.remove('hidden');
            conductorSizeSelect.selectedIndex = -1; // No default selection
        }
        if (conductorNotApplicable) {
            conductorNotApplicable.classList.add('hidden');
        }
    } else {
        if (conductorSizeSelect) {
            conductorSizeSelect.classList.add('hidden');
            conductorSizeSelect.value = '16'; // Default to 16 AWG if not relevant
        }
        if (conductorNotApplicable) {
            conductorNotApplicable.classList.remove('hidden');
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Three.js and display it immediately
    initThreeJS();
    document.getElementById('canvas-holder').innerHTML = '';
    document.getElementById('canvas-holder').appendChild(renderer.domElement);
    
    // Initialize ViewCube after main canvas is added to DOM
    initViewCube();
    
    is3DMode = true;
    animate3D();
    
    // Update conduit colors after initial setup
    setTimeout(() => {
        updateConduitColors();
    }, 100);
    
    // Add window resize event listener
    window.addEventListener('resize', handleResize);
});

// Three.js initialization
function initThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    // No fog - it causes large boxes to fade out and become invisible
    // scene.fog = new THREE.Fog(0xf0f0f0, 500, 1500);
    
    // Get canvas container dimensions
    const canvasHolder = document.getElementById('canvas-holder');
    const canvasWidth = canvasHolder.clientWidth;
    const canvasHeight = canvasHolder.clientHeight || canvasWidth * 0.75; // Default to 4:3 aspect ratio
    // Calculate proper camera parameters based on box size
    const boxWidth = currentBoxDimensions.width * PIXELS_PER_INCH;
    const boxHeight = currentBoxDimensions.height * PIXELS_PER_INCH;
    const boxDepth = currentBoxDimensions.depth * PIXELS_PER_INCH;
    const maxDimension = Math.max(boxWidth, boxHeight, boxDepth);
    
    // Calculate dynamic far plane that scales with box size
    const dynamicFar = Math.max(2000, maxDimension * 10);
    
    camera = new THREE.PerspectiveCamera(75, canvasWidth / canvasHeight, 0.1, dynamicFar);
    
    // Position camera for front view (matching resetView function)
    const fov = camera.fov * Math.PI / 180;
    const aspect = camera.aspect;
    
    // Need to ensure both width and height fit in view
    const distanceForHeight = (boxHeight / 2) / Math.tan(fov / 2);
    const distanceForWidth = (boxWidth / 2) / Math.tan(fov / 2) / aspect;
    
    // Use the larger distance to ensure entire box fits
    const distance = Math.max(distanceForHeight, distanceForWidth) * 1.5; // 1.5 for better padding
    camera.position.set(0, 0, distance);
    camera.lookAt(0, 0, 0);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(canvasWidth, canvasHeight);
    renderer.shadowMap.enabled = true;
    
    // Add lights that scale with box size
    ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // Position lights at a reasonable distance relative to box size
    const lightDistance = maxDimension * 1.5;
    const shadowSize = Math.max(1000, maxDimension * 2);
    
    // Main directional light
    directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(lightDistance * 0.4, lightDistance * 0.6, lightDistance * 0.4);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = dynamicFar;
    directionalLight.shadow.camera.left = -shadowSize;
    directionalLight.shadow.camera.right = shadowSize;
    directionalLight.shadow.camera.top = shadowSize;
    directionalLight.shadow.camera.bottom = -shadowSize;
    scene.add(directionalLight);
    
    // Add a second light from the opposite side for better definition
    directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-lightDistance * 0.4, lightDistance * 0.4, -lightDistance * 0.2);
    scene.add(directionalLight2);
    
    // Add a point light for highlights
    pointLight = new THREE.PointLight(0xffffff, 0.2);
    pointLight.position.set(0, lightDistance * 0.8, 0);
    scene.add(pointLight);
    
    // Initialize with normal 3D lighting
    set3DLighting();
    
    // Add orbit controls - only for touch/mobile navigation
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enabled = true; // Enable for desktop panning
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    controls.enablePan = true; // Enable panning
    controls.enableZoom = false; // Disable mouse wheel zoom
    controls.enableRotate = false; // Disable rotation (use ViewCube instead)
    controls.mouseButtons = { // Enable left mouse button for panning
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: null,  
        RIGHT: null
    };
    controls.touches = { // Keep touch controls
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
    };
    controls.update();
    
    // Set up raycaster for 3D mouse interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Create pull box
    createPullBox3D();
    
    // Add event listeners for 3D dragging (mouse and touch)
    renderer.domElement.addEventListener('mousedown', on3DMouseDown, false);
    renderer.domElement.addEventListener('mousemove', on3DMouseMove, false);
    renderer.domElement.addEventListener('mouseup', on3DMouseUp, false);
    // Touch events for mobile
    renderer.domElement.addEventListener('touchstart', on3DMouseDown, false);
    renderer.domElement.addEventListener('touchmove', on3DMouseMove, false);
    renderer.domElement.addEventListener('touchend', on3DMouseUp, false);
    // Also listen on window to catch mouseup/touchend outside canvas
    window.addEventListener('mouseup', on3DMouseUp, false);
    window.addEventListener('touchend', on3DMouseUp, false);
}

function createPullBox3D() {
    // Remove existing box if any
    if (pullBox3D) {
        scene.remove(pullBox3D);
    }
    
    // Convert inches to pixels for display
    const boxWidth = currentBoxDimensions.width * PIXELS_PER_INCH;
    const boxHeight = currentBoxDimensions.height * PIXELS_PER_INCH;
    const boxDepth = currentBoxDimensions.depth * PIXELS_PER_INCH;
    const wallThickness = 0.125 * PIXELS_PER_INCH; // 1/8 inch wall thickness
    
    // Create a group for the box
    pullBox3D = new THREE.Group();
    
    if (isWireframeMode) {
        // Create wireframe box (open front)
        const hw = boxWidth/2, hh = boxHeight/2, hd = boxDepth/2;
        
        // Create edges using LineSegments for the open box
        const edges = [];
        
        // Back rectangle
        edges.push(-hw, -hh, -hd, hw, -hh, -hd);
        edges.push(hw, -hh, -hd, hw, hh, -hd);
        edges.push(hw, hh, -hd, -hw, hh, -hd);
        edges.push(-hw, hh, -hd, -hw, -hh, -hd);
        
        // Front edges (open face) - just the outline
        edges.push(-hw, -hh, hd, hw, -hh, hd);
        edges.push(hw, -hh, hd, hw, hh, hd);
        edges.push(hw, hh, hd, -hw, hh, hd);
        edges.push(-hw, hh, hd, -hw, -hh, hd);
        
        // Connecting edges
        edges.push(-hw, -hh, -hd, -hw, -hh, hd);
        edges.push(hw, -hh, -hd, hw, -hh, hd);
        edges.push(hw, hh, -hd, hw, hh, hd);
        edges.push(-hw, hh, -hd, -hw, hh, hd);
        
        const edgeGeometry = new THREE.BufferGeometry();
        edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edges, 3));
        
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const wireframeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        pullBox3D.add(wireframeLines);
        
        scene.add(pullBox3D);
        
        // Add labels if enabled
        if (showLabels) {
            addLabels3D();
        }
        return;
    }
    
    // Metal material for the walls
    const metalMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x808080,
        specular: 0x444444,
        shininess: 30,
        side: THREE.DoubleSide
    });
    
    // Create individual walls (no front wall)
    // Back wall
    const backWallGeometry = new THREE.BoxGeometry(boxWidth, boxHeight, wallThickness);
    const backWall = new THREE.Mesh(backWallGeometry, metalMaterial);
    backWall.position.z = -boxDepth/2 + wallThickness/2;
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    pullBox3D.add(backWall);
    
    // Left wall
    const leftWallGeometry = new THREE.BoxGeometry(wallThickness, boxHeight, boxDepth);
    const leftWall = new THREE.Mesh(leftWallGeometry, metalMaterial);
    leftWall.position.x = -boxWidth/2 + wallThickness/2;
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    pullBox3D.add(leftWall);
    
    // Right wall
    const rightWallGeometry = new THREE.BoxGeometry(wallThickness, boxHeight, boxDepth);
    const rightWall = new THREE.Mesh(rightWallGeometry, metalMaterial);
    rightWall.position.x = boxWidth/2 - wallThickness/2;
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    pullBox3D.add(rightWall);
    
    // Top wall
    const topWallGeometry = new THREE.BoxGeometry(boxWidth, wallThickness, boxDepth);
    const topWall = new THREE.Mesh(topWallGeometry, metalMaterial);
    topWall.position.y = boxHeight/2 - wallThickness/2;
    topWall.castShadow = true;
    topWall.receiveShadow = true;
    pullBox3D.add(topWall);
    
    // Bottom wall
    const bottomWallGeometry = new THREE.BoxGeometry(boxWidth, wallThickness, boxDepth);
    const bottomWall = new THREE.Mesh(bottomWallGeometry, metalMaterial);
    bottomWall.position.y = -boxHeight/2 + wallThickness/2;
    bottomWall.castShadow = true;
    bottomWall.receiveShadow = true;
    pullBox3D.add(bottomWall);
    
    // Add edge lines for better definition
    const hw = boxWidth/2, hh = boxHeight/2, hd = boxDepth/2;
    
    // Create edges using LineSegments for the open box
    const edges = [];
    
    // Back rectangle
    edges.push(-hw, -hh, -hd, hw, -hh, -hd);
    edges.push(hw, -hh, -hd, hw, hh, -hd);
    edges.push(hw, hh, -hd, -hw, hh, -hd);
    edges.push(-hw, hh, -hd, -hw, -hh, -hd);
    
    // Front edges (open face)
    edges.push(-hw, -hh, hd, hw, -hh, hd);
    edges.push(hw, -hh, hd, hw, hh, hd);
    edges.push(hw, hh, hd, -hw, hh, hd);
    edges.push(-hw, hh, hd, -hw, -hh, hd);
    
    // Connecting edges
    edges.push(-hw, -hh, -hd, -hw, -hh, hd);
    edges.push(hw, -hh, -hd, hw, -hh, hd);
    edges.push(hw, hh, -hd, hw, hh, hd);
    edges.push(-hw, hh, -hd, -hw, hh, hd);
    
    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edges, 3));
    
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x404040, linewidth: 2 });
    const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    pullBox3D.add(edgeLines);
    
    scene.add(pullBox3D);
    
    // Add labels if enabled
    if (showLabels) {
        addLabels3D();
    }
}

function addLabels3D() {
    // Remove existing labels first
    removeLabels3D();
    // Create text labels using canvas
    function createTextSprite(text, color = '#000000') {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;
        
        context.fillStyle = 'rgba(255, 255, 255, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.font = 'Bold 48px Arial';
        context.fillStyle = color;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 128, 64);
        
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            depthTest: false,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(40, 20, 1);
        
        return sprite;
    }
    
    // Get current box dimensions
    const boxWidth = currentBoxDimensions.width * PIXELS_PER_INCH;
    const boxHeight = currentBoxDimensions.height * PIXELS_PER_INCH;
    const boxDepth = currentBoxDimensions.depth * PIXELS_PER_INCH;
    
    // Add labels for each side with positions based on box dimensions
    const leftLabel = createTextSprite('LEFT');
    leftLabel.position.set(-boxWidth/2 - 30, 0, 0);
    pullBox3D.add(leftLabel);
    labels3D.push(leftLabel);
    
    const rightLabel = createTextSprite('RIGHT');
    rightLabel.position.set(boxWidth/2 + 30, 0, 0);
    pullBox3D.add(rightLabel);
    labels3D.push(rightLabel);
    
    const topLabel = createTextSprite('TOP');
    topLabel.position.set(0, boxHeight/2 + 20, 0);
    pullBox3D.add(topLabel);
    labels3D.push(topLabel);
    
    const bottomLabel = createTextSprite('BOTTOM');
    bottomLabel.position.set(0, -boxHeight/2 - 20, 0);
    pullBox3D.add(bottomLabel);
    labels3D.push(bottomLabel);
    
    const rearLabel = createTextSprite('REAR');
    rearLabel.position.set(0, 0, -boxDepth/2 - 20);
    pullBox3D.add(rearLabel);
    labels3D.push(rearLabel);
}

function removeLabels3D() {
    labels3D.forEach(label => {
        if (label.parent) {
            label.parent.remove(label);
        }
        label.geometry?.dispose();
        label.material?.dispose();
    });
    labels3D = [];
}


function animate3D() {
    if (!is3DMode) return;
    
    requestAnimationFrame(animate3D);
    controls.update();
    renderer.render(scene, camera);
    
    // Render ViewCube on top
    if (viewCubeRenderer) {
        renderViewCube();
    }
}

function update3DPulls() {
    // Remove existing pull curves
    pullCurves3D.forEach(obj => scene.remove(obj));
    pullCurves3D = [];
    pullEndpoints3D = [];
    
    // Remove existing holes
    pullHoles3D.forEach(hole => {
        if (hole.parent) hole.parent.remove(hole);
    });
    pullHoles3D = [];
    
    // Remove existing pull arrows
    pullArrows3D.forEach(arrow => scene.remove(arrow));
    pullArrows3D = [];
    
    // Add new pull curves
    pulls.forEach((pull, index) => {
        draw3DPull(pull, index);
    });
}


// Update just the wire path for a specific pull
function updateWirePath(pull) {
    if (!pull.wireMesh) return;
    
    const boxWidth = currentBoxDimensions.width * PIXELS_PER_INCH;
    const boxHeight = currentBoxDimensions.height * PIXELS_PER_INCH;
    const boxDepth = currentBoxDimensions.depth * PIXELS_PER_INCH;
    
    // Get 3D positions for entry and exit points (on wall surface)
    const entryPos = pull.customEntryPoint3D || get3DPosition(pull.entrySide, boxWidth, boxHeight, boxDepth);
    const exitPos = pull.customExitPoint3D || get3DPosition(pull.exitSide, boxWidth, boxHeight, boxDepth);
    
    // Calculate inner points (1 inch inside the box from wall surface)
    const inchInside = 1 * PIXELS_PER_INCH;
    const entryInner = { ...entryPos };
    const exitInner = { ...exitPos };
    
    // Adjust inner points based on which wall they're on
    switch(pull.entrySide) {
        case 'left': entryInner.x += inchInside; break;
        case 'right': entryInner.x -= inchInside; break;
        case 'top': entryInner.y -= inchInside; break;
        case 'bottom': entryInner.y += inchInside; break;
        case 'rear': entryInner.z += inchInside; break;
    }
    
    switch(pull.exitSide) {
        case 'left': exitInner.x += inchInside; break;
        case 'right': exitInner.x -= inchInside; break;
        case 'top': exitInner.y -= inchInside; break;
        case 'bottom': exitInner.y += inchInside; break;
        case 'rear': exitInner.z += inchInside; break;
    }
    
    // Create intermediate points for smooth entry into cylinders
    const entryIntermediate = { ...entryInner };
    const exitIntermediate = { ...exitInner };
    const straightSection = 0.5 * PIXELS_PER_INCH;
    const gentleCurveOffset = 3 * PIXELS_PER_INCH;
    
    // Calculate all the control points (same logic as in draw3DPull)
    switch(pull.entrySide) {
        case 'left': entryIntermediate.x += straightSection; break;
        case 'right': entryIntermediate.x -= straightSection; break;
        case 'top': entryIntermediate.y -= straightSection; break;
        case 'bottom': entryIntermediate.y += straightSection; break;
        case 'rear': entryIntermediate.z += straightSection; break;
    }
    
    switch(pull.exitSide) {
        case 'left': exitIntermediate.x += straightSection; break;
        case 'right': exitIntermediate.x -= straightSection; break;
        case 'top': exitIntermediate.y -= straightSection; break;
        case 'bottom': exitIntermediate.y += straightSection; break;
        case 'rear': exitIntermediate.z += straightSection; break;
    }
    
    const entryControl = { ...entryInner };
    const exitControl = { ...exitInner };
    
    switch(pull.entrySide) {
        case 'left': entryControl.x += gentleCurveOffset; break;
        case 'right': entryControl.x -= gentleCurveOffset; break;
        case 'top': entryControl.y -= gentleCurveOffset; break;
        case 'bottom': entryControl.y += gentleCurveOffset; break;
        case 'rear': entryControl.z += gentleCurveOffset; break;
    }
    
    switch(pull.exitSide) {
        case 'left': exitControl.x += gentleCurveOffset; break;
        case 'right': exitControl.x -= gentleCurveOffset; break;
        case 'top': exitControl.y -= gentleCurveOffset; break;
        case 'bottom': exitControl.y += gentleCurveOffset; break;
        case 'rear': exitControl.z += gentleCurveOffset; break;
    }
    
    const blendFactor = 0.3;
    const centerX = (entryControl.x + exitControl.x) / 2;
    const centerY = (entryControl.y + exitControl.y) / 2;
    const centerZ = (entryControl.z + exitControl.z) / 2;
    
    entryControl.x = entryControl.x + (centerX - entryControl.x) * blendFactor;
    entryControl.y = entryControl.y + (centerY - entryControl.y) * blendFactor;
    entryControl.z = entryControl.z + (centerZ - entryControl.z) * blendFactor;
    
    exitControl.x = exitControl.x + (centerX - exitControl.x) * blendFactor;
    exitControl.y = exitControl.y + (centerY - exitControl.y) * blendFactor;
    exitControl.z = exitControl.z + (centerZ - exitControl.z) * blendFactor;
    
    // Create wire path based on distance mode and pull type
    let curve;
    
    if (showDistanceLines) {
        // In distance mode, create a straight line from cylinder edge to edge
        const od = locknutODSpacing[pull.conduitSize] || pull.conduitSize + 0.5;
        const radius = (od / 2) * PIXELS_PER_INCH;
        
        // Calculate vector between centers
        const vec1 = new THREE.Vector3(entryPos.x, entryPos.y, entryPos.z);
        const vec2 = new THREE.Vector3(exitPos.x, exitPos.y, exitPos.z);
        const direction = vec2.clone().sub(vec1).normalize();
        
        // Calculate edge points (closest points on cylinder edges)
        const edge1 = vec1.clone().add(direction.clone().multiplyScalar(radius));
        const edge2 = vec2.clone().sub(direction.clone().multiplyScalar(radius));
        
        // Create straight line curve
        curve = new THREE.CatmullRomCurve3([
            edge1,
            edge2
        ], false);
    } else {
        // Normal mode - create curved path through cylinders
        curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(entryInner.x, entryInner.y, entryInner.z),
            new THREE.Vector3(entryIntermediate.x, entryIntermediate.y, entryIntermediate.z),
            new THREE.Vector3(entryControl.x, entryControl.y, entryControl.z),
            new THREE.Vector3(centerX, centerY, centerZ),
            new THREE.Vector3(exitControl.x, exitControl.y, exitControl.z),
            new THREE.Vector3(exitIntermediate.x, exitIntermediate.y, exitIntermediate.z),
            new THREE.Vector3(exitInner.x, exitInner.y, exitInner.z)
        ], false, 'catmullrom', 0.5);
    }
    
    // Update the tube geometry
    const newTubeGeometry = new THREE.TubeGeometry(curve, 50, 3, 8, false);
    pull.wireMesh.geometry.dispose(); // Clean up old geometry
    pull.wireMesh.geometry = newTubeGeometry;
}

// Create a hole appearance in the box wall
function createHole(position, side, conduitSize) {
    const actualOD = actualConduitOD[conduitSize] || conduitSize; // Get actual OD, fallback to nominal
    const holeRadius = (actualOD / 2) * PIXELS_PER_INCH; // Use actual conduit OD
    const outsideDiameter = locknutODSpacing[conduitSize] || conduitSize + 0.5; // Default to conduit + 0.5" if not found
    const outerRadius = (outsideDiameter / 2) * PIXELS_PER_INCH; // Actual outside radius
    const wallThickness = 0.125 * PIXELS_PER_INCH; // 1/8 inch wall thickness
    const throatDepth = conduitThroatDepths[conduitSize] || 1.0; // Default to 1" if not found
    const cylinderLength = wallThickness + (throatDepth * PIXELS_PER_INCH) + PIXELS_PER_INCH; // Wall thickness + throat depth inside + 1" outside
    
    // Create a group for the hole components
    const holeGroup = new THREE.Group();
    
    // Create invisible outer cylinder for collision detection (actual OD)
    const outerCylinderGeometry = new THREE.CylinderGeometry(
        outerRadius, // top radius (actual OD)
        outerRadius, // bottom radius (actual OD)
        cylinderLength * 1.1, // slightly longer
        16, // fewer segments since it's invisible
        1,
        true
    );
    
    // Invisible material for outer cylinder
    const invisibleMaterial = new THREE.MeshBasicMaterial({ 
        visible: false,
        transparent: true,
        opacity: 0
    });
    
    const outerCylinder = new THREE.Mesh(outerCylinderGeometry, invisibleMaterial);
    outerCylinder.userData = { type: 'conduitOD', conduitSize: conduitSize };
    
    // Create hollow cylinder that passes through the wall (visible)
    const cylinderGeometry = new THREE.CylinderGeometry(
        holeRadius, // top radius
        holeRadius, // bottom radius
        cylinderLength, // height (length)
        32, // radial segments
        1, // height segments
        true // open ended - this makes it hollow
    );
    
    // Metal material for the cylinder
    const cylinderMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x404040,
        specular: 0x222222,
        shininess: 50,
        side: THREE.DoubleSide // Render both sides
    });
    
    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinder.castShadow = true;
    cylinder.receiveShadow = true;
    
    // Create center fill cylinder matching background
    const fillRadius = holeRadius * 0.98; // Slightly smaller to show ring edge
    const fillGeometry = new THREE.CylinderGeometry(
        fillRadius,
        fillRadius,
        cylinderLength, // Same length as outer cylinder
        32,
        1,
        false // closed ended
    );
    const fillMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xf0f0f0 // Match scene background color
    });
    const centerFill = new THREE.Mesh(fillGeometry, fillMaterial);
    
    // Add semi-transparent ring to show actual OD when debugging
    const odRingGeometry = new THREE.RingGeometry(holeRadius, outerRadius, 32);
    const odRingMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000,
        transparent: true,
        opacity: 0.1, // Very subtle
        side: THREE.DoubleSide
    });
    const odRing = new THREE.Mesh(odRingGeometry, odRingMaterial);
    
    // Add components to group
    holeGroup.add(outerCylinder);
    holeGroup.add(cylinder);
    holeGroup.add(centerFill);
    holeGroup.add(odRing);
    
    // Position the group
    holeGroup.position.copy(position);
    
    // Adjust cylinder position to maintain 1" protrusion on outside
    // The offset needed is: (1" - throatDepth) / 2
    const positionOffset = (PIXELS_PER_INCH - (throatDepth * PIXELS_PER_INCH)) / 2;
    
    // Orient all components based on which wall it's on and apply position offset
    switch(side) {
        case 'left':
            outerCylinder.rotation.z = Math.PI / 2;
            cylinder.rotation.z = Math.PI / 2;
            centerFill.rotation.z = Math.PI / 2;
            odRing.rotation.y = Math.PI / 2;
            // Move outward (negative X) to maintain 1" outside protrusion
            holeGroup.position.x -= positionOffset;
            break;
        case 'right':
            outerCylinder.rotation.z = Math.PI / 2;
            cylinder.rotation.z = Math.PI / 2;
            centerFill.rotation.z = Math.PI / 2;
            odRing.rotation.y = Math.PI / 2;
            // Move outward (positive X) to maintain 1" outside protrusion
            holeGroup.position.x += positionOffset;
            break;
        case 'top':
            // Already in correct orientation (vertical)
            odRing.rotation.x = Math.PI / 2;
            // Move outward (positive Y) to maintain 1" outside protrusion
            holeGroup.position.y += positionOffset;
            break;
        case 'bottom':
            // Already in correct orientation (vertical)
            odRing.rotation.x = Math.PI / 2;
            // Move outward (negative Y) to maintain 1" outside protrusion
            holeGroup.position.y -= positionOffset;
            break;
        case 'rear':
            outerCylinder.rotation.x = Math.PI / 2;
            cylinder.rotation.x = Math.PI / 2;
            centerFill.rotation.x = Math.PI / 2;
            // odRing already in correct orientation
            // Move outward (positive Z) to maintain 1" outside protrusion
            holeGroup.position.z += positionOffset;
            break;
    }
    
    return holeGroup;
}


function draw3DPull(pull, index) {
    const boxWidth = currentBoxDimensions.width * PIXELS_PER_INCH;
    const boxHeight = currentBoxDimensions.height * PIXELS_PER_INCH;
    const boxDepth = currentBoxDimensions.depth * PIXELS_PER_INCH;
    
    // Get 3D positions for entry and exit points (on wall surface)
    const entryPos = pull.customEntryPoint3D || get3DPosition(pull.entrySide, boxWidth, boxHeight, boxDepth);
    const exitPos = pull.customExitPoint3D || get3DPosition(pull.exitSide, boxWidth, boxHeight, boxDepth);
    
    // Calculate inner points (1 inch inside the box from wall surface)
    const inchInside = 1 * PIXELS_PER_INCH;
    const entryInner = { ...entryPos };
    const exitInner = { ...exitPos };
    
    // Adjust inner points based on which wall they're on
    switch(pull.entrySide) {
        case 'left': entryInner.x += inchInside; break;
        case 'right': entryInner.x -= inchInside; break;
        case 'top': entryInner.y -= inchInside; break;
        case 'bottom': entryInner.y += inchInside; break;
        case 'rear': entryInner.z += inchInside; break;
    }
    
    switch(pull.exitSide) {
        case 'left': exitInner.x += inchInside; break;
        case 'right': exitInner.x -= inchInside; break;
        case 'top': exitInner.y -= inchInside; break;
        case 'bottom': exitInner.y += inchInside; break;
        case 'rear': exitInner.z += inchInside; break;
    }
    
    // Create intermediate points for smooth entry into cylinders
    const entryIntermediate = { ...entryInner };
    const exitIntermediate = { ...exitInner };
    const straightSection = 0.5 * PIXELS_PER_INCH; // Length of straight section
    const gentleCurveOffset = 3 * PIXELS_PER_INCH; // Much deeper into box for gentler curve
    
    // First point: straight section from entry
    switch(pull.entrySide) {
        case 'left': entryIntermediate.x += straightSection; break;
        case 'right': entryIntermediate.x -= straightSection; break;
        case 'top': entryIntermediate.y -= straightSection; break;
        case 'bottom': entryIntermediate.y += straightSection; break;
        case 'rear': entryIntermediate.z += straightSection; break;
    }
    
    // First point: straight section from exit
    switch(pull.exitSide) {
        case 'left': exitIntermediate.x += straightSection; break;
        case 'right': exitIntermediate.x -= straightSection; break;
        case 'top': exitIntermediate.y -= straightSection; break;
        case 'bottom': exitIntermediate.y += straightSection; break;
        case 'rear': exitIntermediate.z += straightSection; break;
    }
    
    // Create control points much deeper in the box for gradual curves
    const entryControl = { ...entryInner };
    const exitControl = { ...exitInner };
    
    switch(pull.entrySide) {
        case 'left': entryControl.x += gentleCurveOffset; break;
        case 'right': entryControl.x -= gentleCurveOffset; break;
        case 'top': entryControl.y -= gentleCurveOffset; break;
        case 'bottom': entryControl.y += gentleCurveOffset; break;
        case 'rear': entryControl.z += gentleCurveOffset; break;
    }
    
    switch(pull.exitSide) {
        case 'left': exitControl.x += gentleCurveOffset; break;
        case 'right': exitControl.x -= gentleCurveOffset; break;
        case 'top': exitControl.y -= gentleCurveOffset; break;
        case 'bottom': exitControl.y += gentleCurveOffset; break;
        case 'rear': exitControl.z += gentleCurveOffset; break;
    }
    
    // Blend the control points toward center for smoother transition
    const blendFactor = 0.3; // How much to move control points toward center
    const centerX = (entryControl.x + exitControl.x) / 2;
    const centerY = (entryControl.y + exitControl.y) / 2;
    const centerZ = (entryControl.z + exitControl.z) / 2;
    
    entryControl.x = entryControl.x + (centerX - entryControl.x) * blendFactor;
    entryControl.y = entryControl.y + (centerY - entryControl.y) * blendFactor;
    entryControl.z = entryControl.z + (centerZ - entryControl.z) * blendFactor;
    
    exitControl.x = exitControl.x + (centerX - exitControl.x) * blendFactor;
    exitControl.y = exitControl.y + (centerY - exitControl.y) * blendFactor;
    exitControl.z = exitControl.z + (centerZ - exitControl.z) * blendFactor;
    
    // Create wire path based on distance mode and pull type
    let curve;
    
    if (showDistanceLines) {
        // In distance mode, create a straight line from cylinder edge to edge
        const od = locknutODSpacing[pull.conduitSize] || pull.conduitSize + 0.5;
        const radius = (od / 2) * PIXELS_PER_INCH;
        
        // Calculate vector between centers
        const vec1 = new THREE.Vector3(entryPos.x, entryPos.y, entryPos.z);
        const vec2 = new THREE.Vector3(exitPos.x, exitPos.y, exitPos.z);
        const direction = vec2.clone().sub(vec1).normalize();
        
        // Calculate edge points (closest points on cylinder edges)
        const edge1 = vec1.clone().add(direction.clone().multiplyScalar(radius));
        const edge2 = vec2.clone().sub(direction.clone().multiplyScalar(radius));
        
        // Create straight line curve
        curve = new THREE.CatmullRomCurve3([
            edge1,
            edge2
        ], false);
    } else {
        // Check if this is an angle pull (different walls, not straight through)
        const isAnglePull = (pull.entrySide !== pull.exitSide) && 
                           !((pull.entrySide === 'left' && pull.exitSide === 'right') ||
                             (pull.entrySide === 'right' && pull.exitSide === 'left') ||
                             (pull.entrySide === 'top' && pull.exitSide === 'bottom') ||
                             (pull.entrySide === 'bottom' && pull.exitSide === 'top'));
        
        if (isAnglePull) {
            // Create right angle path: entry -> corner -> exit
            const cornerPoint = new THREE.Vector3();
            
            // Calculate corner - wire routing depends on rear wall involvement
            
            if (pull.entrySide === 'rear' || pull.exitSide === 'rear') {
                // Rear wall pulls: first move along side wall, then turn toward rear
                if (pull.entrySide === 'rear') {
                    // Entry from rear: go from rear to exit's X,Y position, then turn to side wall
                    if (pull.exitSide === 'left' || pull.exitSide === 'right') {
                        // Rear to left/right: go to exit's Y position on rear wall, then turn
                        cornerPoint.set(entryInner.x, exitInner.y, entryInner.z);
                    } else {
                        // Rear to top/bottom: go to exit's X position on rear wall, then turn
                        cornerPoint.set(exitInner.x, entryInner.y, entryInner.z);
                    }
                } else {
                    // Exit to rear: go straight out from side wall toward rear exit, then turn back
                    if (pull.entrySide === 'left' || pull.entrySide === 'right') {
                        // Left/right to rear: go straight out to rear exit's X,Y position, then turn back
                        cornerPoint.set(exitInner.x, exitInner.y, entryInner.z);
                    } else {
                        // Top/bottom to rear: go straight out to rear exit's X,Y position, then turn back  
                        cornerPoint.set(exitInner.x, exitInner.y, entryInner.z);
                    }
                }
            } else {
                // Standard angle pulls between side walls
                if (pull.entrySide === 'left') {
                    // Go right until directly under/above the exit, then turn
                    cornerPoint.set(exitInner.x, entryInner.y, (entryInner.z + exitInner.z) / 2);
                } else if (pull.entrySide === 'right') {
                    // Go left until directly under/above the exit, then turn
                    cornerPoint.set(exitInner.x, entryInner.y, (entryInner.z + exitInner.z) / 2);
                } else if (pull.entrySide === 'top') {
                    // Go down until directly beside the exit, then turn
                    cornerPoint.set(entryInner.x, exitInner.y, (entryInner.z + exitInner.z) / 2);
                } else if (pull.entrySide === 'bottom') {
                    // Go up until directly beside the exit, then turn
                    cornerPoint.set(entryInner.x, exitInner.y, (entryInner.z + exitInner.z) / 2);
                } else {
                    // Fallback to center
                    cornerPoint.set((entryInner.x + exitInner.x) / 2, (entryInner.y + exitInner.y) / 2, (entryInner.z + exitInner.z) / 2);
                }
            }
            
            if (pull.entrySide === 'rear' || pull.exitSide === 'rear') {
                // For rear wall pulls, use original curved path formula
                curve = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(entryInner.x, entryInner.y, entryInner.z),
                    new THREE.Vector3(entryIntermediate.x, entryIntermediate.y, entryIntermediate.z),
                    new THREE.Vector3(entryControl.x, entryControl.y, entryControl.z),
                    new THREE.Vector3(centerX, centerY, centerZ),
                    new THREE.Vector3(exitControl.x, exitControl.y, exitControl.z),
                    new THREE.Vector3(exitIntermediate.x, exitIntermediate.y, exitIntermediate.z),
                    new THREE.Vector3(exitInner.x, exitInner.y, exitInner.z)
                ], false, 'catmullrom', 0.5);
            } else {
                // Standard angle pulls between side walls
                curve = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(entryInner.x, entryInner.y, entryInner.z),
                    cornerPoint,
                    new THREE.Vector3(exitInner.x, exitInner.y, exitInner.z)
                ], false, 'catmullrom', 0.35);
            }
        } else {
            // Check if this is a U-pull (same wall)
            const isUPull = (pull.entrySide === pull.exitSide);
            
            if (isUPull) {
                // Create U-shaped path: entry -> down -> across -> up -> exit
                let uDepth = Math.max(6 * pull.conduitSize * PIXELS_PER_INCH, 3 * PIXELS_PER_INCH); // Minimum 3", or 6x conduit size
                const separation = Math.abs(pull.entrySide === 'left' || pull.entrySide === 'right' ? 
                    entryInner.y - exitInner.y : entryInner.x - exitInner.x);
                let totalDepth = uDepth + (separation * 0.3); // Extra depth based on separation
                
                // For rear wall U-pulls, limit depth to box depth minus safety margin
                if (pull.entrySide === 'rear') {
                    const boxDepth = currentBoxDimensions.depth * PIXELS_PER_INCH;
                    const maxAllowedDepth = boxDepth * 0.8; // Use 80% of box depth for safety
                    totalDepth = Math.min(totalDepth, maxAllowedDepth);
                }
                
                // For side U-pulls, ensure wires don't extend beyond box dimensions
                if (pull.entrySide !== 'rear') {
                    const boxWidth = currentBoxDimensions.width * PIXELS_PER_INCH;
                    const boxHeight = currentBoxDimensions.height * PIXELS_PER_INCH;
                    const safetyMargin = 3.5 * PIXELS_PER_INCH; // 3.5" safety margin (reduced by 3")
                    
                    // Calculate the furthest point that needs to be considered for the U-pull
                    const entryPos = pull.customEntryPoint3D || get3DPosition(pull.entrySide, boxWidth, boxHeight, boxDepth);
                    const exitPos = pull.customExitPoint3D || get3DPosition(pull.exitSide, boxWidth, boxHeight, boxDepth);
                    
                    if (pull.entrySide === 'left') {
                        // Find the furthest point from the wall (either entry or exit)
                        const furthestX = Math.max(entryPos.x, exitPos.x);
                        const rightWallX = boxWidth / 2;
                        const maxAllowedDepth = rightWallX - furthestX - safetyMargin;
                        totalDepth = Math.min(totalDepth, Math.max(maxAllowedDepth, 1 * PIXELS_PER_INCH));
                    } else if (pull.entrySide === 'right') {
                        // Find the furthest point from the wall (either entry or exit)
                        const furthestX = Math.min(entryPos.x, exitPos.x);
                        const leftWallX = -boxWidth / 2;
                        const maxAllowedDepth = furthestX - leftWallX - safetyMargin;
                        totalDepth = Math.min(totalDepth, Math.max(maxAllowedDepth, 1 * PIXELS_PER_INCH));
                    } else if (pull.entrySide === 'top') {
                        // Find the furthest point from the wall (either entry or exit)
                        const furthestY = Math.min(entryPos.y, exitPos.y);
                        const bottomWallY = -boxHeight / 2;
                        const maxAllowedDepth = furthestY - bottomWallY - safetyMargin;
                        totalDepth = Math.min(totalDepth, Math.max(maxAllowedDepth, 1 * PIXELS_PER_INCH));
                    } else if (pull.entrySide === 'bottom') {
                        // Find the furthest point from the wall (either entry or exit)
                        const furthestY = Math.max(entryPos.y, exitPos.y);
                        const topWallY = boxHeight / 2;
                        const maxAllowedDepth = topWallY - furthestY - safetyMargin;
                        totalDepth = Math.min(totalDepth, Math.max(maxAllowedDepth, 1 * PIXELS_PER_INCH));
                    }
                }
                
                // Calculate direction into the box
                let uPoint1, uPoint2;
                
                if (pull.entrySide === 'left') {
                    uPoint1 = new THREE.Vector3(entryInner.x + totalDepth, entryInner.y, entryInner.z);
                    uPoint2 = new THREE.Vector3(exitInner.x + totalDepth, exitInner.y, exitInner.z);
                } else if (pull.entrySide === 'right') {
                    uPoint1 = new THREE.Vector3(entryInner.x - totalDepth, entryInner.y, entryInner.z);
                    uPoint2 = new THREE.Vector3(exitInner.x - totalDepth, exitInner.y, exitInner.z);
                } else if (pull.entrySide === 'top') {
                    uPoint1 = new THREE.Vector3(entryInner.x, entryInner.y - totalDepth, entryInner.z);
                    uPoint2 = new THREE.Vector3(exitInner.x, exitInner.y - totalDepth, exitInner.z);
                } else if (pull.entrySide === 'bottom') {
                    uPoint1 = new THREE.Vector3(entryInner.x, entryInner.y + totalDepth, entryInner.z);
                    uPoint2 = new THREE.Vector3(exitInner.x, exitInner.y + totalDepth, exitInner.z);
                } else {
                    // Fallback for rear wall
                    uPoint1 = new THREE.Vector3(entryInner.x, entryInner.y, entryInner.z + totalDepth);
                    uPoint2 = new THREE.Vector3(exitInner.x, exitInner.y, exitInner.z + totalDepth);
                }
                
                curve = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(entryInner.x, entryInner.y, entryInner.z),
                    uPoint1,
                    uPoint2,
                    new THREE.Vector3(exitInner.x, exitInner.y, exitInner.z)
                ], false, 'catmullrom', 0.25);
            } else {
                // Normal mode - create curved path through cylinders
                curve = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(entryInner.x, entryInner.y, entryInner.z),
                    new THREE.Vector3(entryIntermediate.x, entryIntermediate.y, entryIntermediate.z),
                    new THREE.Vector3(entryControl.x, entryControl.y, entryControl.z),
                    new THREE.Vector3(centerX, centerY, centerZ),
                    new THREE.Vector3(exitControl.x, exitControl.y, exitControl.z),
                    new THREE.Vector3(exitIntermediate.x, exitIntermediate.y, exitIntermediate.z),
                    new THREE.Vector3(exitInner.x, exitInner.y, exitInner.z)
                ], false, 'catmullrom', 0.5);
            }
        }
    }
    
    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 5 });
    const curveObject = new THREE.Line(geometry, material);
    
    // Create pull ID arrows if enabled
    if (showPullArrows) {
        createPullArrows(pull, index);
    }
    
    // Create a tube geometry for better visibility (like a wire/conduit)
    const tubeGeometry = new THREE.TubeGeometry(curve, 50, 3, 8, false);
    const hexColor = pull.color || '#0066ff';
    const colorValue = parseInt(hexColor.replace('#', ''), 16);
    const emissiveValue = Math.floor(colorValue * 0.7); // Darker emissive color
    const tubeMaterial = new THREE.MeshPhongMaterial({ 
        color: colorValue, 
        emissive: emissiveValue,
        emissiveIntensity: 0.2
    });
    const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
    tubeMesh.castShadow = true;
    tubeMesh.receiveShadow = true;
    
    scene.add(tubeMesh);
    pullCurves3D.push(tubeMesh);
    // Store reference to wire mesh in pull object
    pull.wireMesh = tubeMesh;
    
    // Create holes at entry and exit points
    const entryHole = createHole(new THREE.Vector3(entryPos.x, entryPos.y, entryPos.z), pull.entrySide, pull.conduitSize);
    // Add userData to make the hole draggable
    entryHole.userData = { type: 'entry', pullIndex: index, pull: pull, isDraggable: true };
    pullBox3D.add(entryHole);
    pullHoles3D.push(entryHole);
    pull.entryHole = entryHole;
    // Add to pullEndpoints3D to make it interactive
    pullEndpoints3D.push(entryHole);
    
    const exitHole = createHole(new THREE.Vector3(exitPos.x, exitPos.y, exitPos.z), pull.exitSide, pull.conduitSize);
    // Add userData to make the hole draggable
    exitHole.userData = { type: 'exit', pullIndex: index, pull: pull, isDraggable: true };
    pullBox3D.add(exitHole);
    pullHoles3D.push(exitHole);
    pull.exitHole = exitHole;
    // Add to pullEndpoints3D to make it interactive
    pullEndpoints3D.push(exitHole);
}

function get3DPosition(side, boxWidth, boxHeight, boxDepth) {
    switch (side) {
        case 'left': return { x: -boxWidth / 2, y: 0, z: 0 };
        case 'right': return { x: boxWidth / 2, y: 0, z: 0 };
        case 'top': return { x: 0, y: boxHeight / 2, z: 0 };
        case 'bottom': return { x: 0, y: -boxHeight / 2, z: 0 };
        case 'rear': return { x: 0, y: 0, z: -boxDepth / 2 };
        default: return { x: 0, y: 0, z: 0 };
    }
}

// Create arrow sprites with pull ID labels
function createPullArrows(pull, index) {
    const boxWidth = currentBoxDimensions.width * PIXELS_PER_INCH;
    const boxHeight = currentBoxDimensions.height * PIXELS_PER_INCH;
    const boxDepth = currentBoxDimensions.depth * PIXELS_PER_INCH;
    
    const entryPos = pull.customEntryPoint3D || get3DPosition(pull.entrySide, boxWidth, boxHeight, boxDepth);
    const exitPos = pull.customExitPoint3D || get3DPosition(pull.exitSide, boxWidth, boxHeight, boxDepth);
    
    // Always create entry arrow (pointing into conduit)
    createArrowSprite(entryPos, pull.entrySide, `P-${pull.id}`, true, pull.color, pull);
    
    // Always create exit arrow (pointing out of conduit)
    createArrowSprite(exitPos, pull.exitSide, `P-${pull.id}`, false, pull.color, pull);
}

// Create individual arrow sprite
function createArrowSprite(position, side, label, isEntry, color, pull) {
    // Create canvas for arrow and text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // For top/bottom walls, swap width and height to rotate the canvas
    if (side === 'top' || side === 'bottom') {
        canvas.width = 40;
        canvas.height = 120;
    } else {
        canvas.width = 120;
        canvas.height = 40;
    }
    
    // Set background
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#333';
    context.lineWidth = 2;
    context.strokeRect(0, 0, canvas.width, canvas.height);
    
    // Draw arrow based on direction
    context.fillStyle = color || '#0066ff';
    context.strokeStyle = '#333';
    context.lineWidth = 2;
    
    const centerX = canvas.width / 2;
    let centerY = canvas.height / 2;
    let textY = canvas.height / 2;
    let textX = canvas.width / 2;
    let arrowX = canvas.width / 2;
    const arrowSize = 8;
    
    // For bottom wall, shift content down in the canvas to avoid conduit
    if (side === 'bottom') {
        centerY = canvas.height * 0.4; // Arrow position (higher)
        textY = canvas.height * 0.75;  // Text position (lower than arrow)
    }
    // For rear wall, separate arrow and text horizontally
    else if (side === 'rear') {
        arrowX = canvas.width * 0.25;  // Arrow on left side
        textX = canvas.width * 0.75;   // Text on right side
        centerY = canvas.height / 2;   // Keep vertical center
        textY = canvas.height / 2;     // Keep vertical center
    }
    
    // For angle pulls (side-to-rear or rear-to-side), reverse arrow direction on rear wall
    let adjustedIsEntry = isEntry;
    if (side === 'rear' && pull) {
        const isAnglePull = (pull.entrySide === 'rear' && pull.exitSide !== 'rear') || 
                           (pull.exitSide === 'rear' && pull.entrySide !== 'rear');
        if (isAnglePull) {
            adjustedIsEntry = !isEntry; // Reverse the direction
        }
    }
    
    // Draw arrow pointing in/out based on entry/exit and side
    context.beginPath();
    if (adjustedIsEntry) {
        // Entry arrow points into the box
        switch (side) {
            case 'left':
                context.moveTo(35, centerY);
                context.lineTo(20, centerY - arrowSize);
                context.lineTo(20, centerY + arrowSize);
                break;
            case 'right':
                context.moveTo(85, centerY);
                context.lineTo(100, centerY - arrowSize);
                context.lineTo(100, centerY + arrowSize);
                break;
            case 'top':
                context.moveTo(centerX, 25);
                context.lineTo(centerX - arrowSize, 10);
                context.lineTo(centerX + arrowSize, 10);
                break;
            case 'bottom':
                context.moveTo(centerX, centerY);
                context.lineTo(centerX - arrowSize, centerY + 15);
                context.lineTo(centerX + arrowSize, centerY + 15);
                break;
            case 'rear':
                context.moveTo(arrowX, centerY - arrowSize);
                context.lineTo(arrowX - arrowSize, centerY);
                context.lineTo(arrowX + arrowSize, centerY);
                break;
        }
    } else {
        // Exit arrow points out of the box
        switch (side) {
            case 'left':
                context.moveTo(20, centerY);
                context.lineTo(35, centerY - arrowSize);
                context.lineTo(35, centerY + arrowSize);
                break;
            case 'right':
                context.moveTo(100, centerY);
                context.lineTo(85, centerY - arrowSize);
                context.lineTo(85, centerY + arrowSize);
                break;
            case 'top':
                context.moveTo(centerX, 10);
                context.lineTo(centerX - arrowSize, 25);
                context.lineTo(centerX + arrowSize, 25);
                break;
            case 'bottom':
                context.moveTo(centerX, centerY + 15);
                context.lineTo(centerX - arrowSize, centerY);
                context.lineTo(centerX + arrowSize, centerY);
                break;
            case 'rear':
                context.moveTo(arrowX, centerY);
                context.lineTo(arrowX - arrowSize, centerY - arrowSize);
                context.lineTo(arrowX + arrowSize, centerY - arrowSize);
                break;
        }
    }
    context.closePath();
    context.fill();
    context.stroke();
    
    // Add text label (canvas is already oriented correctly)
    context.fillStyle = '#333';
    context.font = 'bold 14px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, textX, textY);
    
    // Create sprite
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    
    // Position sprite offset from conduit position
    const offset = 40; // Distance from wall
    let spritePos = { ...position };
    
    switch (side) {
        case 'left':
            spritePos.x -= offset;
            break;
        case 'right':
            spritePos.x += offset;
            break;
        case 'top':
            spritePos.y += offset;
            break;
        case 'bottom':
            spritePos.y -= offset;
            break;
        case 'rear':
            spritePos.z += offset; // Move towards front of box instead of behind
            spritePos.y -= 20; // Move down a bit to avoid wire overlap
            break;
    }
    
    sprite.position.set(spritePos.x, spritePos.y, spritePos.z);
    
    // Adjust sprite scale based on canvas orientation
    if (side === 'top' || side === 'bottom') {
        sprite.scale.set(20, 60, 1); // Rotated: narrow width, tall height
    } else {
        sprite.scale.set(60, 20, 1); // Normal: wide width, short height
    }
    
    // Add to scene and tracking array
    scene.add(sprite);
    pullArrows3D.push(sprite);
}

// Removed 2D drawing functions - now using only 3D

// Removed 2D mouse functions - now using only 3D interaction

// Check for overlapping conduits and return array of overlapping pull pairs
function checkConduitOverlaps() {
    const overlappingPairs = [];
    const boxWidth = currentBoxDimensions.width * PIXELS_PER_INCH;
    const boxHeight = currentBoxDimensions.height * PIXELS_PER_INCH;
    const boxDepth = currentBoxDimensions.depth * PIXELS_PER_INCH;
    
    for (let i = 0; i < pulls.length; i++) {
        for (let j = i + 1; j < pulls.length; j++) {
            const pull1 = pulls[i];
            const pull2 = pulls[j];
            
            // Check entry-entry overlap
            if (pull1.entrySide === pull2.entrySide) {
                const pos1 = pull1.customEntryPoint3D || get3DPosition(pull1.entrySide, boxWidth, boxHeight, boxDepth);
                const pos2 = pull2.customEntryPoint3D || get3DPosition(pull2.entrySide, boxWidth, boxHeight, boxDepth);
                const od1 = locknutODSpacing[pull1.conduitSize] || pull1.conduitSize + 0.5;
                const od2 = locknutODSpacing[pull2.conduitSize] || pull2.conduitSize + 0.5;
                const distance = Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2) + Math.pow(pos1.z - pos2.z, 2)) / PIXELS_PER_INCH;
                const minDistance = (od1 + od2) / 2;
                
                if (distance < minDistance) {
                    overlappingPairs.push({ pull1: pull1, pull2: pull2, type: 'entry-entry' });
                }
            }
            
            // Check exit-exit overlap
            if (pull1.exitSide === pull2.exitSide) {
                const pos1 = pull1.customExitPoint3D || get3DPosition(pull1.exitSide, boxWidth, boxHeight, boxDepth);
                const pos2 = pull2.customExitPoint3D || get3DPosition(pull2.exitSide, boxWidth, boxHeight, boxDepth);
                const od1 = locknutODSpacing[pull1.conduitSize] || pull1.conduitSize + 0.5;
                const od2 = locknutODSpacing[pull2.conduitSize] || pull2.conduitSize + 0.5;
                const distance = Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2) + Math.pow(pos1.z - pos2.z, 2)) / PIXELS_PER_INCH;
                const minDistance = (od1 + od2) / 2;
                
                if (distance < minDistance) {
                    overlappingPairs.push({ pull1: pull1, pull2: pull2, type: 'exit-exit' });
                }
            }
            
            // Check entry-exit overlap
            if (pull1.entrySide === pull2.exitSide) {
                const pos1 = pull1.customEntryPoint3D || get3DPosition(pull1.entrySide, boxWidth, boxHeight, boxDepth);
                const pos2 = pull2.customExitPoint3D || get3DPosition(pull2.exitSide, boxWidth, boxHeight, boxDepth);
                const od1 = locknutODSpacing[pull1.conduitSize] || pull1.conduitSize + 0.5;
                const od2 = locknutODSpacing[pull2.conduitSize] || pull2.conduitSize + 0.5;
                const distance = Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2) + Math.pow(pos1.z - pos2.z, 2)) / PIXELS_PER_INCH;
                const minDistance = (od1 + od2) / 2;
                
                if (distance < minDistance) {
                    overlappingPairs.push({ pull1: pull1, pull2: pull2, type: 'entry-exit' });
                }
            }
            
            // Check exit-entry overlap
            if (pull1.exitSide === pull2.entrySide) {
                const pos1 = pull1.customExitPoint3D || get3DPosition(pull1.exitSide, boxWidth, boxHeight, boxDepth);
                const pos2 = pull2.customEntryPoint3D || get3DPosition(pull2.entrySide, boxWidth, boxHeight, boxDepth);
                const od1 = locknutODSpacing[pull1.conduitSize] || pull1.conduitSize + 0.5;
                const od2 = locknutODSpacing[pull2.conduitSize] || pull2.conduitSize + 0.5;
                const distance = Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2) + Math.pow(pos1.z - pos2.z, 2)) / PIXELS_PER_INCH;
                const minDistance = (od1 + od2) / 2;
                
                if (distance < minDistance) {
                    overlappingPairs.push({ pull1: pull1, pull2: pull2, type: 'exit-entry' });
                }
            }
        }
    }
    
    return overlappingPairs;
}

// Update conduit colors based on overlaps
function updateConduitColors() {
    if (!is3DMode) return;
    
    // First, reset all conduits to normal color
    pulls.forEach(pull => {
        if (pull.entryHole) {
            // The cylinder is the second child (index 1) in the holeGroup
            // Index 0 is outerCylinder, index 1 is the main cylinder, index 2 is centerFill, index 3 is odRing
            const cylinder = pull.entryHole.children[1];
            if (cylinder && cylinder.material) {
                cylinder.material.color.setHex(0x404040); // Normal gray color
            }
        }
        if (pull.exitHole) {
            const cylinder = pull.exitHole.children[1];
            if (cylinder && cylinder.material) {
                cylinder.material.color.setHex(0x404040); // Normal gray color
            }
        }
    });
    
    // Check for overlaps and set red color
    const overlappingPairs = checkConduitOverlaps();
    console.log('Overlapping pairs found:', overlappingPairs.length); // Debug log
    
    overlappingPairs.forEach((pair, index) => {
        console.log(`Overlap ${index + 1}: Pull ${pair.pull1.id} and Pull ${pair.pull2.id}, type: ${pair.type}`);
        
        // Only color the specific overlapping cylinders based on overlap type
        switch(pair.type) {
            case 'entry-entry':
                // Only color the entry cylinders
                if (pair.pull1.entryHole) {
                    const cylinder = pair.pull1.entryHole.children[1];
                    if (cylinder && cylinder.material) {
                        cylinder.material.color.setHex(0xff0000); // Red color
                    }
                }
                if (pair.pull2.entryHole) {
                    const cylinder = pair.pull2.entryHole.children[1];
                    if (cylinder && cylinder.material) {
                        cylinder.material.color.setHex(0xff0000); // Red color
                    }
                }
                break;
                
            case 'exit-exit':
                // Only color the exit cylinders
                if (pair.pull1.exitHole) {
                    const cylinder = pair.pull1.exitHole.children[1];
                    if (cylinder && cylinder.material) {
                        cylinder.material.color.setHex(0xff0000); // Red color
                    }
                }
                if (pair.pull2.exitHole) {
                    const cylinder = pair.pull2.exitHole.children[1];
                    if (cylinder && cylinder.material) {
                        cylinder.material.color.setHex(0xff0000); // Red color
                    }
                }
                break;
                
            case 'entry-exit':
                // Color pull1's entry and pull2's exit
                if (pair.pull1.entryHole) {
                    const cylinder = pair.pull1.entryHole.children[1];
                    if (cylinder && cylinder.material) {
                        cylinder.material.color.setHex(0xff0000); // Red color
                    }
                }
                if (pair.pull2.exitHole) {
                    const cylinder = pair.pull2.exitHole.children[1];
                    if (cylinder && cylinder.material) {
                        cylinder.material.color.setHex(0xff0000); // Red color
                    }
                }
                break;
                
            case 'exit-entry':
                // Color pull1's exit and pull2's entry
                if (pair.pull1.exitHole) {
                    const cylinder = pair.pull1.exitHole.children[1];
                    if (cylinder && cylinder.material) {
                        cylinder.material.color.setHex(0xff0000); // Red color
                    }
                }
                if (pair.pull2.entryHole) {
                    const cylinder = pair.pull2.entryHole.children[1];
                    if (cylinder && cylinder.material) {
                        cylinder.material.color.setHex(0xff0000); // Red color
                    }
                }
                break;
        }
    });
}

// Pull Management
function addPull(mode = 'advanced') {
    // Determine element IDs based on mode
    const prefix = mode === 'simple' ? 'simple' : '';
    const entrySideId = prefix ? `${prefix}EntrySide` : 'entrySide';
    const exitSideId = prefix ? `${prefix}ExitSide` : 'exitSide';
    const conduitSizeId = prefix ? `${prefix}ConduitSize` : 'conduitSize';
    const conductorSizeId = prefix ? `${prefix}ConductorSize` : 'conductorSize';
    const warningDivId = prefix ? `${prefix}PullWarning` : 'pullWarning';
    const warningTextId = prefix ? `${prefix}PullWarningText` : 'pullWarningText';
    
    const entrySide = document.getElementById(entrySideId).value;
    const exitSide = document.getElementById(exitSideId).value;
    const conduitSize = parseFloat(document.getElementById(conduitSizeId).value);
    const conductorSizeSelect = document.getElementById(conductorSizeId);
    const conductorSize = (entrySide === 'rear' || exitSide === 'rear') ? conductorSizeSelect.value : '16';
    const warningDiv = document.getElementById(warningDivId);
    const warningText = document.getElementById(warningTextId);

    if (!conduitSize || conduitSize <= 0) {
        alert('Please enter a valid conduit size.');
        return;
    }

    // Validate conductor size for rear pulls with a dialogue box
    if ((entrySide === 'rear' || exitSide === 'rear') && (!conductorSize || conductorSize === '')) {
        console.log('Validation triggered - entrySide:', entrySide, 'exitSide:', exitSide, 'conductorSize:', conductorSize, 'selectedIndex:', conductorSizeSelect.selectedIndex);
        if (!confirm('Please select a conductor size for pulls to or from the rear. Click OK to return and choose a size, or Cancel to abort.')) {
            return; // Cancel aborts the action
        }
        return; // Return to prompt user to select a size
    }
    
    // Auto-increase box dimensions if conduit doesn't fit on entry side
    if (!checkConduitFit(entrySide, conduitSize)) {
        autoIncreaseBoxForConduit(entrySide, conduitSize);
    }
    
    // Auto-increase box dimensions if conduit doesn't fit on exit side
    if (!checkConduitFit(exitSide, conduitSize)) {
        autoIncreaseBoxForConduit(exitSide, conduitSize);
    }

    let pull = {
        id: pullCounter,
        entrySide,
        exitSide,
        conduitSize,
        conductorSize,
        customEntryPoint3D: null,
        customExitPoint3D: null,
        color: wireColors[(pullCounter - 1) % wireColors.length].hex // Cycle through colors
    };

    // For U-pulls in 3D, set default points with an offset
    if (entrySide === exitSide) {
        const offset = 0.8 * PIXELS_PER_INCH; // 0.8 inch offset
        const boxWidth = currentBoxDimensions.width * PIXELS_PER_INCH;
        const boxHeight = currentBoxDimensions.height * PIXELS_PER_INCH;
        const boxDepth = currentBoxDimensions.depth * PIXELS_PER_INCH;
        
        switch (entrySide) {
            case 'left':
                pull.customEntryPoint3D = { x: -boxWidth/2, y: -offset/2, z: 0 };
                pull.customExitPoint3D = { x: -boxWidth/2, y: offset/2, z: 0 };
                break;
            case 'right':
                pull.customEntryPoint3D = { x: boxWidth/2, y: -offset/2, z: 0 };
                pull.customExitPoint3D = { x: boxWidth/2, y: offset/2, z: 0 };
                break;
            case 'top':
                pull.customEntryPoint3D = { x: -offset/2, y: boxHeight/2, z: 0 };
                pull.customExitPoint3D = { x: offset/2, y: boxHeight/2, z: 0 };
                break;
            case 'bottom':
                pull.customEntryPoint3D = { x: -offset/2, y: -boxHeight/2, z: 0 };
                pull.customExitPoint3D = { x: offset/2, y: -boxHeight/2, z: 0 };
                break;
            case 'rear':
                pull.customEntryPoint3D = { x: -offset/2, y: 0, z: -boxDepth/2 };
                pull.customExitPoint3D = { x: offset/2, y: 0, z: -boxDepth/2 };
                break;
        }
    }

    pulls.push(pull);
    savePullsToStorage(); // Save to localStorage
    updatePullsTable();
    calculatePullBox();
    // Update 3D visualization if in 3D mode
    if (is3DMode) {
        update3DPulls();
        updateConduitColors();
    }
    pullCounter++;
}

// Mobile version of addPull function
function addPullMobile() {
    const entrySide = document.getElementById('entrySideMobile').value;
    const exitSide = document.getElementById('exitSideMobile').value;
    const conduitSize = parseFloat(document.getElementById('conduitSizeMobile').value);
    const conductorSizeSelect = document.getElementById('conductorSizeMobile');
    const conductorSize = (entrySide === 'rear' || exitSide === 'rear') ? conductorSizeSelect.value : '16';
    const warningDiv = document.getElementById('pullWarning');
    const warningText = document.getElementById('pullWarningText');

    if (!conduitSize || conduitSize <= 0) {
        alert('Please enter a valid conduit size.');
        return;
    }

    // Validate conductor size for rear pulls with a dialogue box
    if ((entrySide === 'rear' || exitSide === 'rear') && (!conductorSize || conductorSize === '')) {
        if (!confirm('Please select a conductor size for pulls to or from the rear. Click OK to return and choose a size, or Cancel to abort.')) {
            return; // Cancel aborts the action
        }
        return; // Return to prompt user to select a size
    }
    
    // Auto-increase box dimensions if conduit doesn't fit on entry side
    if (!checkConduitFit(entrySide, conduitSize)) {
        autoIncreaseBoxForConduit(entrySide, conduitSize);
    }
    
    // Auto-increase box dimensions if conduit doesn't fit on exit side
    if (!checkConduitFit(exitSide, conduitSize)) {
        autoIncreaseBoxForConduit(exitSide, conduitSize);
    }

    const pull = {
        id: pullCounter,
        number: pullCounter,
        entrySide,
        exitSide,
        conduitSize,
        conductorSize,
        customEntryPoint3D: null,
        customExitPoint3D: null,
        color: wireColors[(pullCounter - 1) % wireColors.length].hex // Cycle through colors
    };

    // Set custom 3D positions if on same wall
    if (entrySide === exitSide) {
        const offset = 0.8 * PIXELS_PER_INCH; // 0.8 inch offset
        const boxWidth = currentBoxDimensions.width * PIXELS_PER_INCH;
        const boxHeight = currentBoxDimensions.height * PIXELS_PER_INCH;
        const boxDepth = currentBoxDimensions.depth * PIXELS_PER_INCH;
        
        switch (entrySide) {
            case 'left':
                pull.customEntryPoint3D = { x: -boxWidth/2, y: -offset/2, z: 0 };
                pull.customExitPoint3D = { x: -boxWidth/2, y: offset/2, z: 0 };
                break;
            case 'right':
                pull.customEntryPoint3D = { x: boxWidth/2, y: -offset/2, z: 0 };
                pull.customExitPoint3D = { x: boxWidth/2, y: offset/2, z: 0 };
                break;
            case 'top':
                pull.customEntryPoint3D = { x: -offset/2, y: boxHeight/2, z: 0 };
                pull.customExitPoint3D = { x: offset/2, y: boxHeight/2, z: 0 };
                break;
            case 'bottom':
                pull.customEntryPoint3D = { x: -offset/2, y: -boxHeight/2, z: 0 };
                pull.customExitPoint3D = { x: offset/2, y: -boxHeight/2, z: 0 };
                break;
            case 'rear':
                pull.customEntryPoint3D = { x: -offset/2, y: 0, z: -boxDepth/2 };
                pull.customExitPoint3D = { x: offset/2, y: 0, z: -boxDepth/2 };
                break;
        }
    }

    pulls.push(pull);
    savePullsToStorage(); // Save to localStorage
    updatePullsTable();
    calculatePullBox();
    // Update 3D visualization if in 3D mode
    if (is3DMode) {
        update3DPulls();
        updateConduitColors();
    }
    pullCounter++;
}

// Mobile version of toggleConductorSize function
function toggleConductorSizeMobile() {
    const entrySide = document.getElementById('entrySideMobile').value;
    const exitSide = document.getElementById('exitSideMobile').value;
    const conductorSizeSelect = document.getElementById('conductorSizeMobile');
    const conductorSizePlaceholder = document.getElementById('conductorSizeMobilePlaceholder');
    
    if (entrySide === 'rear' || exitSide === 'rear') {
        conductorSizeSelect.classList.remove('hidden');
        conductorSizePlaceholder.classList.add('hidden');
        conductorSizeSelect.selectedIndex = -1; // No default selection
    } else {
        conductorSizeSelect.classList.add('hidden');
        conductorSizePlaceholder.classList.remove('hidden');
        conductorSizeSelect.value = '16'; // Default to 16 AWG if not relevant
    }
}

// Calculate the minimum distance for a pull
function calculatePullDistance(pull) {
    const boxWidth = currentBoxDimensions.width * PIXELS_PER_INCH;
    const boxHeight = currentBoxDimensions.height * PIXELS_PER_INCH;
    const boxDepth = currentBoxDimensions.depth * PIXELS_PER_INCH;
    
    const entryPos = pull.customEntryPoint3D || get3DPosition(pull.entrySide, boxWidth, boxHeight, boxDepth);
    const exitPos = pull.customExitPoint3D || get3DPosition(pull.exitSide, boxWidth, boxHeight, boxDepth);
    
    // Get cylinder radius
    const od = locknutODSpacing[pull.conduitSize] || pull.conduitSize + 0.5;
    const radius = (od / 2) * PIXELS_PER_INCH;
    
    // Calculate vector between centers
    const vec1 = new THREE.Vector3(entryPos.x, entryPos.y, entryPos.z);
    const vec2 = new THREE.Vector3(exitPos.x, exitPos.y, exitPos.z);
    const direction = vec2.clone().sub(vec1).normalize();
    
    // Calculate edge points
    const edge1 = vec1.clone().add(direction.clone().multiplyScalar(radius));
    const edge2 = vec2.clone().sub(direction.clone().multiplyScalar(radius));
    
    // Calculate distance in inches
    const distancePixels = edge1.distanceTo(edge2);
    return distancePixels / PIXELS_PER_INCH;
}

function removePull(id) {
    pulls = pulls.filter(pull => pull.id !== id);
    savePullsToStorage(); // Save to localStorage
    updatePullsTable();
    calculatePullBox();
    // Update 3D visualization if in 3D mode
    if (is3DMode) {
        update3DPulls();
        updateConduitColors();
    }
}

function updatePullsTable() {
    const tbody = document.getElementById('pullsBody');
    const simpleTbody = document.getElementById('simplePullsBody');
    const pullsList = document.querySelector('.pulls-list');
    const hasRear = pulls.some(pull => pull.entrySide === 'rear' || pull.exitSide === 'rear');
    
    // Clear both tables
    tbody.innerHTML = '';
    if (simpleTbody) {
        simpleTbody.innerHTML = '';
    }
    pullsList.innerHTML = '';
    pulls.forEach(pull => {
        const actualDistance = calculatePullDistance(pull);
        const minimumRequired = pull.conduitSize * 6;
        const isDistanceTooSmall = actualDistance < minimumRequired;
        // Mobile stacked view (default)
        const item = document.createElement('div');
        item.className = 'pull-item';
        if (hasRear) item.classList.add('has-rear');
        item.innerHTML = `
            <div>
                <span class="font-medium">Pull #:</span> 
                <span class="flex items-center gap-2" style="align-items: center;">
                    <div class="color-picker">
                        <div class="color-square" style="background-color: ${pull.color};" onclick="toggleColorPicker(${pull.id}, this)"></div>
                        <div class="color-grid" id="colorGrid${pull.id}">
                            ${wireColors.map(color => `<div class="color-option" style="background-color: ${color.hex};" onclick="selectColor(${pull.id}, '${color.hex}')"></div>`).join('')}
                        </div>
                    </div>
                    <span>${pull.id}</span>
                </span>
            </div>
            <div><span class="font-medium">Entry Side:</span> <span>${pull.entrySide}</span></div>
            <div><span class="font-medium">Exit Side:</span> <span>${pull.exitSide}</span></div>
            <div><span class="font-medium">Conduit Size (in):</span> <span>${fractionToString(pull.conduitSize)}"</span></div>
            <div class="conductor-mobile"><span class="font-medium">Conductor Size:</span> <span>${pull.entrySide === 'rear' || pull.exitSide === 'rear' ? pull.conductorSize : '-'}</span></div>
            <div><span class="font-medium">Distance Between Raceways:</span> <span${isDistanceTooSmall ? ' style="background-color: red; color: white; padding: 2px 6px; border-radius: 3px;"' : ''}>${actualDistance.toFixed(2)}"</span></div>
            <div><span class="font-medium">Minimum Required Distance:</span> <span>${(pull.conduitSize * 6).toFixed(2)}"</span></div>
            <div><span class="font-medium">Action:</span> <span><button onclick="removePull(${pull.id})" class="text-red-600 hover:text-red-800"><i class="fas fa-times mr-1"></i>Remove</button></span></div>
        `;
        pullsList.appendChild(item);

        // Desktop table view
        const row = document.createElement('tr');
        row.className = 'pull-row';
        row.innerHTML = `
            <td class="border p-2">
                <div class="flex items-center gap-2" style="align-items: center;">
                    <div class="color-picker">
                        <div class="color-square" style="background-color: ${pull.color};" onclick="toggleColorPicker(${pull.id}, this)"></div>
                        <div class="color-grid" id="colorGridDesktop${pull.id}">
                            ${wireColors.map(color => `<div class="color-option" style="background-color: ${color.hex};" onclick="selectColor(${pull.id}, '${color.hex}')"></div>`).join('')}
                        </div>
                    </div>
                    <span>${pull.id}</span>
                </div>
            </td>
            <td class="border p-2">${pull.entrySide}</td>
            <td class="border p-2">${pull.exitSide}</td>
            <td class="border p-2">${fractionToString(pull.conduitSize)}"</td>
            <td class="border p-2">${pull.entrySide === 'rear' || pull.exitSide === 'rear' ? pull.conductorSize : '-'}</td>
            <td class="border p-2"${isDistanceTooSmall ? ' style="background-color: red; color: white;"' : ''}>${actualDistance.toFixed(2)}"</td>
            <td class="border p-2">${(pull.conduitSize * 6).toFixed(2)}"</td>
            <td class="border p-2"><button onclick="removePull(${pull.id})" class="text-red-600 hover:text-red-800"><i class="fas fa-times mr-1"></i>Remove</button></td>
        `;
        tbody.appendChild(row);
        
        // Simple table view (with feature flags)
        if (simpleTbody) {
            const simpleRow = document.createElement('tr');
            simpleRow.className = 'pull-row';
            
            let rowHTML = `
                <td class="border p-2">
                    <div class="flex items-center gap-2" style="align-items: center;">`;
            
            // Color picker - only show if enabled in simple mode
            if (simpleModeFeatures.showColorPicker) {
                rowHTML += `
                        <div class="color-picker">
                            <div class="color-square" style="background-color: ${pull.color};" onclick="toggleColorPicker(${pull.id}, this)"></div>
                            <div class="color-grid" id="colorGridSimple${pull.id}">
                                ${wireColors.map(color => `<div class="color-option" style="background-color: ${color.hex};" onclick="selectColor(${pull.id}, '${color.hex}')"></div>`).join('')}
                            </div>
                        </div>`;
            }
            
            rowHTML += `
                        <span>${pull.id}</span>
                    </div>
                </td>
                <td class="border p-2">${pull.entrySide}</td>
                <td class="border p-2">${pull.exitSide}</td>
                <td class="border p-2">${fractionToString(pull.conduitSize)}"</td>`;
            
            // Conductor size - only show if enabled in simple mode
            if (simpleModeFeatures.showConductorSize) {
                rowHTML += `<td class="border p-2 conductor-column">${pull.entrySide === 'rear' || pull.exitSide === 'rear' ? pull.conductorSize : '-'}</td>`;
            }
            
            // Distance calculations - only show if enabled in simple mode
            if (simpleModeFeatures.showDistanceCalculations) {
                rowHTML += `
                <td class="border p-2 distance-column"${isDistanceTooSmall ? ' style="background-color: red; color: white;"' : ''}>${actualDistance.toFixed(2)}"</td>
                <td class="border p-2 distance-column">${(pull.conduitSize * 6).toFixed(2)}"</td>`;
            }
            
            rowHTML += `<td class="border p-2"><button onclick="removePull(${pull.id})" class="text-red-600 hover:text-red-800"><i class="fas fa-times mr-1"></i>Remove</button></td>`;
            
            simpleRow.innerHTML = rowHTML;
            simpleTbody.appendChild(simpleRow);
        }
    });
    
    // Apply simple mode feature styling after updating table
    applySimpleModeFeatures();
}

// Color picker functionality
function toggleColorPicker(pullId, element) {
    // Close any other open color pickers
    document.querySelectorAll('.color-grid').forEach(grid => {
        if (grid.id !== `colorGrid${pullId}` && grid.id !== `colorGridDesktop${pullId}`) {
            grid.classList.remove('show');
        }
    });
    
    // Find the corresponding color grid
    const colorGrid = element.parentElement.querySelector('.color-grid');
    if (colorGrid) {
        colorGrid.classList.toggle('show');
    }
}

function selectColor(pullId, colorHex) {
    // Find the pull and update its color
    const pull = pulls.find(p => p.id === pullId);
    if (pull) {
        pull.color = colorHex;
        
        // Update the color squares in the UI
        document.querySelectorAll(`[onclick*="toggleColorPicker(${pullId}"]`).forEach(square => {
            square.style.backgroundColor = colorHex;
        });
        
        // Close the color picker
        document.querySelectorAll('.color-grid').forEach(grid => {
            grid.classList.remove('show');
        });
        
        // Update the 3D visualization
        update3DPulls();
        
        // Save to localStorage
        savePullsToStorage();
    }
}

// Close color picker when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.color-picker')) {
        document.querySelectorAll('.color-grid').forEach(grid => {
            grid.classList.remove('show');
        });
    }
});

// Convert decimal to fraction string for display
function fractionToString(decimal) {
    const fractions = {
        0.5: '1/2',
        0.75: '3/4',
        1: '1',
        1.25: '1-1/4',
        1.5: '1-1/2',
        2: '2',
        2.5: '2-1/2',
        3: '3',
        3.5: '3-1/2',
        4: '4',
        5: '5',
        6: '6'
    };
    return fractions[decimal] || decimal.toString();
}

// Calculation Logic
function calculatePullBox() {
    if (pulls.length === 0) {
        document.getElementById('result').textContent = 'Add pulls to calculate minimum pull box size.';
        document.getElementById('debug').textContent = '';
        
        // Clear minimum dimensions
        minimumBoxDimensions = { width: 0, height: 0, depth: 0 };
        
        // Clear the NEC warning
        const necWarning = document.getElementById('necWarning');
        if (necWarning) {
            necWarning.style.display = 'none';
        }
        
        return;
    }

    let debugLog = '';

    // Step 1: Horizontal Straight Pulls
    const hStraightPulls = pulls.filter(p => 
        (p.entrySide === 'left' && p.exitSide === 'right') || 
        (p.entrySide === 'right' && p.exitSide === 'left')
    );
    const maxHStraight = Math.max(...hStraightPulls.map(p => p.conduitSize), 0);
    const minHStraightCalc = maxHStraight * 8;
    debugLog += `Step 1: Minimum horizontal straight pull calc = ${maxHStraight} x 8 = ${minHStraightCalc} in\n`;

    // Step 2: Vertical Straight Pulls
    const vStraightPulls = pulls.filter(p => 
        (p.entrySide === 'top' && p.exitSide === 'bottom') || 
        (p.entrySide === 'bottom' && p.exitSide === 'top')
    );
    const maxVStraight = Math.max(...vStraightPulls.map(p => p.conduitSize), 0);
    const minVStraightCalc = maxVStraight * 8;
    debugLog += `Step 2: Minimum vertical straight pull calc = ${maxVStraight} x 8 = ${minVStraightCalc} in\n`;

    // Helper function for angle/u-pull calculations
    function calculateSide(side, validPulls) {
        const sidePulls = pulls.filter(p => validPulls(p, side)).map((p, i) => ({ ...p, originalIndex: i }));
        if (sidePulls.length === 0) return 0;

        const maxPull = sidePulls.reduce((max, p) => p.conduitSize > max.conduitSize ? p : max, sidePulls[0]);
        const maxSize = maxPull.conduitSize;
        let additionalConduits = [];

        sidePulls.forEach(p => {
            if (p !== maxPull) {
                // For non-max pulls, add once for entry/exit
                additionalConduits.push(p.conduitSize);
                // For U-pulls, add second time for the other opening
                if (p.entrySide === p.exitSide && p.entrySide === side) {
                    additionalConduits.push(p.conduitSize);
                }
            }
        });

        // If max pull is a U-pull, add it once more (since it's already counted once in the 6x factor)
        if (maxPull.entrySide === maxPull.exitSide && maxPull.entrySide === side) {
            additionalConduits.push(maxPull.conduitSize);
        }

        const calc = 6 * maxSize + additionalConduits.reduce((sum, size) => sum + size, 0);
        debugLog += `Relevant pulls for ${side}: ${sidePulls.map(p => `Pull ${p.id} (${fractionToString(p.conduitSize)}")`).join(', ')}\n`;
        debugLog += `Largest pull: Pull ${maxPull.id} (${fractionToString(maxSize)}"), U-pull: ${maxPull.entrySide === maxPull.exitSide}\n`;
        debugLog += `Calculation: (6 x ${maxSize}) + ${additionalConduits.map(size => fractionToString(size)).join(' + ')} = ${calc} in\n`;
        return calc;
    }

    // Helper function for alternate angle pull calculations using locknut OD spacing (excludes U-pulls)
    function calculateSideAlternate(side, validPulls) {
        const sidePulls = pulls.filter(p => validPulls(p, side) && !(p.entrySide === p.exitSide)).map((p, i) => ({ ...p, originalIndex: i }));
        if (sidePulls.length === 0) return 0;

        const maxPull = sidePulls.reduce((max, p) => p.conduitSize > max.conduitSize ? p : max, sidePulls[0]);
        const maxSize = maxPull.conduitSize;
        let additionalConduits = [];

        sidePulls.forEach(p => {
            if (p !== maxPull) {
                // For non-max angle pulls, add once for entry/exit
                additionalConduits.push(p.conduitSize);
            }
        });

        const calc = 6 * maxSize + additionalConduits.reduce((sum, size) => sum + (locknutODSpacing[size] || size + 0.5), 0);
        debugLog += `Relevant pulls for ${side}: ${sidePulls.map(p => `Pull ${p.id} (${fractionToString(p.conduitSize)}")`).join(', ')}\n`;
        debugLog += `Largest pull: Pull ${maxPull.id} (${fractionToString(maxSize)}"), U-pull: ${maxPull.entrySide === maxPull.exitSide}\n`;
        debugLog += `Calculation: (6 x ${maxSize}) + ${additionalConduits.map(size => locknutODSpacing[size] || size + 0.5).join(' + ')} = ${calc} in\n`;
        return calc;
    }

    // Step 3: Left Side Angle/U-Pulls
    const leftPullsFilter = (p, side) => 
        (p.entrySide === side && p.exitSide !== 'right') || 
        (p.exitSide === side && p.entrySide !== 'right') || 
        (p.entrySide === side && p.exitSide === side);
    const minLeftCalc = calculateSide('left', leftPullsFilter);
    debugLog += `Step 3: Minimum left side angle/u-pull calc = ${minLeftCalc} in\n`;

    // Step 3a: Alternate Left Side Angle/U-Pulls
    const minLeftCalcAlt = calculateSideAlternate('left', leftPullsFilter);
    debugLog += `Step 3a: Alternate left side angle/u-pull calc = ${minLeftCalcAlt} in\n`;

    // Step 4: Right Side Angle/U-Pulls
    const rightPullsFilter = (p, side) => 
        (p.entrySide === side && p.exitSide !== 'left') || 
        (p.exitSide === side && p.entrySide !== 'left') || 
        (p.entrySide === side && p.exitSide === side);
    const minRightCalc = calculateSide('right', rightPullsFilter);
    debugLog += `Step 4: Minimum right side angle/u-pull calc = ${minRightCalc} in\n`;

    // Step 4a: Alternate Right Side Angle/U-Pulls
    const minRightCalcAlt = calculateSideAlternate('right', rightPullsFilter);
    debugLog += `Step 4a: Alternate right side angle/u-pull calc = ${minRightCalcAlt} in\n`;

    // Step 5: Top Side Angle/U-Pulls
    const topPullsFilter = (p, side) => 
        (p.entrySide === side && p.exitSide !== 'bottom') || 
        (p.exitSide === side && p.entrySide !== 'bottom') || 
        (p.entrySide === side && p.exitSide === side);
    const minTopCalc = calculateSide('top', topPullsFilter);
    debugLog += `Step 5: Minimum top side angle/u-pull calc = ${minTopCalc} in\n`;

    // Step 5a: Alternate Top Side Angle/U-Pulls
    const minTopCalcAlt = calculateSideAlternate('top', topPullsFilter);
    debugLog += `Step 5a: Alternate top side angle/u-pull calc = ${minTopCalcAlt} in\n`;

    // Step 6: Bottom Side Angle/U-Pulls
    const bottomPullsFilter = (p, side) => 
        (p.entrySide === side && p.exitSide !== 'top') || 
        (p.exitSide === side && p.entrySide !== 'top') || 
        (p.entrySide === side && p.exitSide === side);
    const minBottomCalc = calculateSide('bottom', bottomPullsFilter);
    debugLog += `Step 6: Minimum bottom side angle/u-pull calc = ${minBottomCalc} in\n`;

    // Step 6a: Alternate Bottom Side Angle/U-Pulls
    const minBottomCalcAlt = calculateSideAlternate('bottom', bottomPullsFilter);
    debugLog += `Step 6a: Alternate bottom side angle/u-pull calc = ${minBottomCalcAlt} in\n`;

    // Step 7: Rear Wall Wire Bending Space (#7)
    const rearPulls = pulls.filter(p => 
        (p.entrySide === 'rear' && p.exitSide !== 'rear') || 
        (p.exitSide === 'rear' && p.entrySide !== 'rear') || 
        (p.entrySide === 'rear' && p.exitSide === 'rear')
    );
    const conductorDepths = {
        '16': 1.5, '14': 1.5, '12': 1.5, '10': 1.5, '8': 1.5, '6': 1.5,
        '4': 2, '3': 2,
        '2': 2.5,
        '1': 3,
        '1/0': 3.5, '2/0': 3.5,
        '3/0': 4, '4/0': 4,
        '250': 4.5,
        '300': 5, '350': 5,
        '400': 6, '500': 6,
        '600': 8, '750': 8, '900': 8,
        '1000': 10, '1250': 10,
        '1500': 12, '1750': 12, '2000': 12
    };
    const rearAnglePullMinDepth = Math.max(...rearPulls.map(p => conductorDepths[p.conductorSize] || 0), 0);
    debugLog += `Step 7: Rear angle pull minimum depth = ${rearAnglePullMinDepth} in\n`;

    // Step 8: Left Wall Lockring Height (#8)
    const leftWallConduits = pulls.filter(p => p.entrySide === 'left' || p.exitSide === 'left');
    const leftWallLockringHeight = leftWallConduits.reduce((sum, p) => sum + (locknutODSpacing[p.conduitSize] || p.conduitSize + 0.5), 0);
    debugLog += `Step 8: Left wall minimum lockring height = ${leftWallLockringHeight} in\n`;

    // Step 9: Right Wall Lockring Height (#9)
    const rightWallConduits = pulls.filter(p => p.entrySide === 'right' || p.exitSide === 'right');
    const rightWallLockringHeight = rightWallConduits.reduce((sum, p) => sum + (locknutODSpacing[p.conduitSize] || p.conduitSize + 0.5), 0);
    debugLog += `Step 9: Right wall minimum lockring height = ${rightWallLockringHeight} in\n`;

    // Step 10: Top Wall Lockring Width (#10)
    const topWallConduits = pulls.filter(p => p.entrySide === 'top' || p.exitSide === 'top');
    const topWallLockringWidth = topWallConduits.reduce((sum, p) => sum + (locknutODSpacing[p.conduitSize] || p.conduitSize + 0.5), 0);
    debugLog += `Step 10: Top wall minimum lockring width = ${topWallLockringWidth} in\n`;

    // Step 11: Bottom Wall Lockring Width (#11)
    const bottomWallConduits = pulls.filter(p => p.entrySide === 'bottom' || p.exitSide === 'bottom');
    const bottomWallLockringWidth = bottomWallConduits.reduce((sum, p) => sum + (locknutODSpacing[p.conduitSize] || p.conduitSize + 0.5), 0);
    debugLog += `Step 11: Bottom wall minimum lockring width = ${bottomWallLockringWidth} in\n`;

    // Step 12: Rear Wall Lockring Width (#12)
    const rearWallHorizontalConduits = pulls.filter(p => 
        (p.entrySide === 'rear' && ['left', 'right'].includes(p.exitSide)) ||
        (p.exitSide === 'rear' && ['left', 'right'].includes(p.entrySide))
    );
    const rearWallLockringWidth = rearWallHorizontalConduits.reduce((sum, p) => sum + (locknutODSpacing[p.conduitSize] || p.conduitSize + 0.5), 0);
    debugLog += `Step 12: Rear wall minimum lockring width = ${rearWallLockringWidth} in\n`;

    // Step 13: Rear Wall Lockring Height (#13)
    const rearWallVerticalConduits = pulls.filter(p => 
        (p.entrySide === 'rear' && ['top', 'bottom'].includes(p.exitSide)) ||
        (p.exitSide === 'rear' && ['top', 'bottom'].includes(p.entrySide))
    );
    const rearWallLockringHeight = rearWallVerticalConduits.reduce((sum, p) => sum + (locknutODSpacing[p.conduitSize] || p.conduitSize + 0.5), 0);
    debugLog += `Step 13: Rear wall minimum lockring height = ${rearWallLockringHeight} in\n`;

    // Step 14: Minimum Lockring Depth (#14)
    const nonRearConduits = pulls.filter(p => 
        ['left', 'right', 'top', 'bottom'].includes(p.entrySide) || 
        ['left', 'right', 'top', 'bottom'].includes(p.exitSide)
    );
    const minimumLockringDepth = Math.max(...nonRearConduits.map(p => locknutODSpacing[p.conduitSize] || p.conduitSize + 0.5), 0);
    debugLog += `Step 14: Minimum lockring depth = ${minimumLockringDepth} in\n`;

    // Step 15: Minimum Pull Distance Height (#15)
    const verticalPullDistancePulls = pulls.filter(p => 
        (p.entrySide === 'left' && p.exitSide === 'left') ||
        (p.entrySide === 'right' && p.exitSide === 'right') ||
        (p.entrySide === 'rear' && ['top', 'bottom'].includes(p.exitSide)) ||
        (p.exitSide === 'rear' && ['top', 'bottom'].includes(p.entrySide))
    );
    let minimumPullDistanceHeight = 0;
    if (verticalPullDistancePulls.length > 0) {
        const pullDistanceHeights = verticalPullDistancePulls.map(p => {
            const entryLocknut = locknutODSpacing[p.conduitSize] || p.conduitSize + 0.5;
            const exitLocknut = locknutODSpacing[p.conduitSize] || p.conduitSize + 0.5;
            return p.conduitSize * 6 + entryLocknut + exitLocknut;
        });
        minimumPullDistanceHeight = Math.max(...pullDistanceHeights);
    }
    debugLog += `Step 15: Minimum pull distance height = ${minimumPullDistanceHeight} in\n`;

    // Step 16: Minimum Pull Distance Width (#16)
    const horizontalPullDistancePulls = pulls.filter(p => 
        (p.entrySide === 'top' && p.exitSide === 'top') ||
        (p.entrySide === 'bottom' && p.exitSide === 'bottom') ||
        (p.entrySide === 'rear' && p.exitSide === 'rear') ||
        (p.entrySide === 'rear' && ['left', 'right'].includes(p.exitSide)) ||
        (p.exitSide === 'rear' && ['left', 'right'].includes(p.entrySide))
    );
    let minimumPullDistanceWidth = 0;
    if (horizontalPullDistancePulls.length > 0) {
        const pullDistanceWidths = horizontalPullDistancePulls.map(p => {
            const entryLocknut = locknutODSpacing[p.conduitSize] || p.conduitSize + 0.5;
            const exitLocknut = locknutODSpacing[p.conduitSize] || p.conduitSize + 0.5;
            return p.conduitSize * 6 + entryLocknut + exitLocknut;
        });
        minimumPullDistanceWidth = Math.max(...pullDistanceWidths);
    }
    debugLog += `Step 16: Minimum pull distance width = ${minimumPullDistanceWidth} in\n`;

    // Step 17: Parallel U-Pull Spacing Width (#17)
    const widthUPullWalls = ['top', 'bottom'];
    let parallelUPullSpacingWidth = 0;
    
    for (const wall of widthUPullWalls) {
        const wallUPulls = pulls.filter(p => p.entrySide === wall && p.exitSide === wall);
        if (wallUPulls.length > 0) {
            const largestConduit = Math.max(...wallUPulls.map(p => p.conduitSize));
            const sixTimesLargest = largestConduit * 6;
            const totalLockringSpacing = wallUPulls.reduce((sum, p) => sum + (locknutODSpacing[p.conduitSize] || p.conduitSize + 0.5), 0) * 2;
            const wallUPullWidth = sixTimesLargest + totalLockringSpacing;
            parallelUPullSpacingWidth = Math.max(parallelUPullSpacingWidth, wallUPullWidth);
        }
    }
    
    // Use parallel U-pull spacing as adjusted pull distance width
    const adjustedPullDistanceWidth = Math.max(minimumPullDistanceWidth, parallelUPullSpacingWidth);
    debugLog += `Step 17: Parallel U-pull spacing width = ${parallelUPullSpacingWidth} in (max with pull distance width: max(${minimumPullDistanceWidth}, ${parallelUPullSpacingWidth}) = ${adjustedPullDistanceWidth} in)\n`;

    // Step 18a: Parallel U-Pull Spacing Height (Option 2 only) (#18a)
    const heightUPullWalls = ['left', 'right'];
    let parallelUPullSpacingHeight = 0;
    
    for (const wall of heightUPullWalls) {
        const wallUPulls = pulls.filter(p => p.entrySide === wall && p.exitSide === wall);
        if (wallUPulls.length > 0) {
            const largestConduit = Math.max(...wallUPulls.map(p => p.conduitSize));
            const sixTimesLargest = largestConduit * 6;
            const totalLockringSpacing = wallUPulls.reduce((sum, p) => sum + (locknutODSpacing[p.conduitSize] || p.conduitSize + 0.5), 0) * 2;
            const wallUPullHeight = sixTimesLargest + totalLockringSpacing;
            parallelUPullSpacingHeight = Math.max(parallelUPullSpacingHeight, wallUPullHeight);
            debugLog += `  ${wall} wall: largest=${largestConduit}", 6x=${sixTimesLargest}", lockring total=${totalLockringSpacing/2}×2=${totalLockringSpacing}", total=${wallUPullHeight}"\n`;
        }
    }
    
    // Use parallel U-pull spacing as adjusted pull distance height for Option 2
    const adjustedPullDistanceHeightAlt = Math.max(minimumPullDistanceHeight, parallelUPullSpacingHeight);
    debugLog += `Step 18a: Parallel U-pull spacing height (Option 2) = ${parallelUPullSpacingHeight} in (max with pull distance height: max(${minimumPullDistanceHeight}, ${parallelUPullSpacingHeight}) = ${adjustedPullDistanceHeightAlt} in)\n`;

    // Step 19a: Calculate rear/rear U-pull height spacing (Option 2 only) (#19a)
    const rearUPulls = pulls.filter(p => p.entrySide === 'rear' && p.exitSide === 'rear');
    const rearUPullHeightAlt = rearUPulls.reduce((sum, p) => sum + (locknutODSpacing[p.conduitSize] || p.conduitSize + 0.5), 0);
    debugLog += `Step 19a: Rear/rear U-pull height (Option 2) = ${rearUPullHeightAlt} in (${rearUPulls.length} rear/rear U-pulls)\n`;

    // Step 18: Height U-Pull Spacing (Option 1) - Left/Right Wall U-Pulls
    const heightUPullWallsOption1 = ['left', 'right'];
    let heightUPullSpacingOption1 = 0;
    
    for (const wall of heightUPullWallsOption1) {
        const wallUPulls = pulls.filter(p => p.entrySide === wall && p.exitSide === wall);
        if (wallUPulls.length > 0) {
            const largestConduit = Math.max(...wallUPulls.map(p => p.conduitSize));
            const sixTimesLargest = largestConduit * 6;
            const largestLocknutOD = locknutODSpacing[largestConduit] || largestConduit + 0.5;
            const totalLocknutSpacing = wallUPulls.reduce((sum, p) => sum + (locknutODSpacing[p.conduitSize] || p.conduitSize + 0.5), 0) * 2; // 2 per U-pull
            const wallUPullHeight = sixTimesLargest + totalLocknutSpacing - largestLocknutOD;
            heightUPullSpacingOption1 = Math.max(heightUPullSpacingOption1, wallUPullHeight);
            debugLog += `  ${wall} wall: largest=${largestConduit}", 6x=${sixTimesLargest}", total locknut=${totalLocknutSpacing}", minus largest=${largestLocknutOD}", result=${wallUPullHeight}"\n`;
        }
    }
    
    const adjustedPullDistanceHeight = Math.max(minimumPullDistanceHeight, heightUPullSpacingOption1);
    debugLog += `Step 18: Height U-pull spacing (Option 1) = ${heightUPullSpacingOption1} in (max with pull distance: max(${minimumPullDistanceHeight}, ${heightUPullSpacingOption1}) = ${adjustedPullDistanceHeight} in)\n`;

    // Step 19: Width U-Pull Spacing (Option 1) - Top/Bottom/Rear Wall U-Pulls
    const widthUPullWallsOption1 = ['top', 'bottom', 'rear'];
    let widthUPullSpacingOption1 = 0;
    
    for (const wall of widthUPullWallsOption1) {
        const wallUPulls = pulls.filter(p => p.entrySide === wall && p.exitSide === wall);
        if (wallUPulls.length > 0) {
            const largestConduit = Math.max(...wallUPulls.map(p => p.conduitSize));
            const sixTimesLargest = largestConduit * 6;
            const largestLocknutOD = locknutODSpacing[largestConduit] || largestConduit + 0.5;
            const totalLocknutSpacing = wallUPulls.reduce((sum, p) => sum + (locknutODSpacing[p.conduitSize] || p.conduitSize + 0.5), 0) * 2; // 2 per U-pull
            const wallUPullWidth = sixTimesLargest + totalLocknutSpacing - largestLocknutOD;
            widthUPullSpacingOption1 = Math.max(widthUPullSpacingOption1, wallUPullWidth);
            debugLog += `  ${wall} wall: largest=${largestConduit}", 6x=${sixTimesLargest}", total locknut=${totalLocknutSpacing}", minus largest=${largestLocknutOD}", result=${wallUPullWidth}"\n`;
        }
    }
    
    const rearUPullHeight = widthUPullSpacingOption1; // For compatibility with existing code
    debugLog += `Step 19: Width U-pull spacing (Option 1) = ${widthUPullSpacingOption1} in\n`;

    // Step 20: Establish Minimum Pull Can Width
    const widthCalcs = [
        { name: 'Horizontal Straight', value: minHStraightCalc },
        { name: 'Left Angle/U-Pull', value: minLeftCalc },
        { name: 'Right Angle/U-Pull', value: minRightCalc },
        { name: 'Top Wall Lockring', value: topWallLockringWidth },
        { name: 'Bottom Wall Lockring', value: bottomWallLockringWidth },
        { name: 'Rear Wall Lockring', value: rearWallLockringWidth },
        { name: 'Pull Distance (with parallel U-pull spacing)', value: adjustedPullDistanceWidth }
    ];
    const minWidth = Math.max(...widthCalcs.map(c => c.value));
    const widthWinner = widthCalcs.find(c => c.value === minWidth);
    debugLog += `Step 20: Minimum pull can width comparison:\n`;
    widthCalcs.forEach(calc => debugLog += `  ${calc.name}: ${calc.value} in\n`);
    debugLog += `  Winner: ${widthWinner.name} = ${minWidth} in\n`;

    // Step 21: Establish Minimum Pull Can Height
    const heightCalcs = [
        { name: 'Vertical Straight', value: minVStraightCalc },
        { name: 'Top Angle/U-Pull', value: minTopCalc },
        { name: 'Bottom Angle/U-Pull', value: minBottomCalc },
        { name: 'Left Wall Lockring', value: leftWallLockringHeight },
        { name: 'Right Wall Lockring', value: rightWallLockringHeight },
        { name: 'Rear Wall Lockring Height', value: rearWallLockringHeight },
        { name: 'Rear U-Pull Height', value: rearUPullHeight },
        { name: 'Pull Distance (with parallel U-pull spacing)', value: adjustedPullDistanceHeight }
    ];
    const minHeight = Math.max(...heightCalcs.map(c => c.value));
    const heightWinner = heightCalcs.find(c => c.value === minHeight);
    debugLog += `Step 21: Minimum pull can height comparison:\n`;
    heightCalcs.forEach(calc => debugLog += `  ${calc.name}: ${calc.value} in\n`);
    debugLog += `  Winner: ${heightWinner.name} = ${minHeight} in\n`;

    // Step 20a: Alternate Minimum Pull Can Width (using hybrid approach)
    const widthCalcsAlt = [
        { name: 'Horizontal Straight', value: minHStraightCalc },
        { name: 'Left Angle (Alt) + U-Pull', value: Math.max(minLeftCalcAlt, minLeftCalc) },
        { name: 'Right Angle (Alt) + U-Pull', value: Math.max(minRightCalcAlt, minRightCalc) },
        { name: 'Top Wall Lockring', value: topWallLockringWidth },
        { name: 'Bottom Wall Lockring', value: bottomWallLockringWidth },
        { name: 'Rear Wall Lockring', value: rearWallLockringWidth },
        { name: 'Pull Distance (with parallel U-pull spacing)', value: adjustedPullDistanceWidth }
    ];
    const minWidthAlt = Math.max(...widthCalcsAlt.map(c => c.value));
    const widthWinnerAlt = widthCalcsAlt.find(c => c.value === minWidthAlt);
    debugLog += `Step 20a: Alternate minimum pull can width comparison (using locknut OD):\n`;
    widthCalcsAlt.forEach(calc => debugLog += `  ${calc.name}: ${calc.value} in\n`);
    debugLog += `  Winner: ${widthWinnerAlt.name} = ${minWidthAlt} in\n`;

    // Step 21a: Alternate Minimum Pull Can Height (using hybrid approach)
    const heightCalcsAlt = [
        { name: 'Vertical Straight', value: minVStraightCalc },
        { name: 'Top Angle (Alt) + U-Pull', value: Math.max(minTopCalcAlt, minTopCalc) },
        { name: 'Bottom Angle (Alt) + U-Pull', value: Math.max(minBottomCalcAlt, minBottomCalc) },
        { name: 'Left Wall Lockring', value: leftWallLockringHeight },
        { name: 'Right Wall Lockring', value: rightWallLockringHeight },
        { name: 'Rear Wall Lockring Height', value: rearWallLockringHeight },
        { name: 'Rear U-Pull Height (Alt)', value: rearUPullHeightAlt },
        { name: 'Pull Distance (with parallel U-pull spacing Alt)', value: adjustedPullDistanceHeightAlt }
    ];
    const minHeightAlt = Math.max(...heightCalcsAlt.map(c => c.value));
    const heightWinnerAlt = heightCalcsAlt.find(c => c.value === minHeightAlt);
    debugLog += `Step 21a: Alternate minimum pull can height comparison (using locknut OD):\n`;
    heightCalcsAlt.forEach(calc => debugLog += `  ${calc.name}: ${calc.value} in\n`);
    debugLog += `  Winner: ${heightWinnerAlt.name} = ${minHeightAlt} in\n`;

    // Step 22: Establish Minimum Pull Can Depth
    const depthCalcs = [
        { name: 'Rear Angle Pull Depth', value: rearAnglePullMinDepth },
        { name: 'Minimum Lockring Depth', value: minimumLockringDepth }
    ];
    const minDepth = Math.max(...depthCalcs.map(c => c.value));
    const depthWinner = depthCalcs.find(c => c.value === minDepth);
    debugLog += `Step 22: Minimum pull can depth comparison:\n`;
    depthCalcs.forEach(calc => debugLog += `  ${calc.name}: ${calc.value} in\n`);
    debugLog += `  Winner: ${depthWinner.name} = ${minDepth} in\n`;

    // Step 23: Final Result - Check which calculation method is selected
    const advancedToggle = document.getElementById('calcMethodToggle')?.checked;
    const simpleToggle = document.getElementById('simpleCalcMethodToggle')?.checked;
    const useOption2 = advancedToggle || simpleToggle; // Use parallel if either toggle is checked
    
    let finalMinWidth, finalMinHeight, finalMinDepth;
    if (useOption2) {
        // Use alternate calculations (Option 2)
        finalMinWidth = minWidthAlt;
        finalMinHeight = minHeightAlt;
        finalMinDepth = minDepth; // Depth calculation stays the same
        debugLog += `Step 23: Using Option 2 calculations (locknut OD spacing)\n`;
    } else {
        // Use standard calculations (Option 1)
        finalMinWidth = minWidth;
        finalMinHeight = minHeight;
        finalMinDepth = minDepth;
        debugLog += `Step 23: Using Option 1 calculations (nominal conduit sizes)\n`;
    }
    
    const width = finalMinWidth > 0 ? `${fractionToString(finalMinWidth)}"` : "No Code Minimum";
    const height = finalMinHeight > 0 ? `${fractionToString(finalMinHeight)}"` : "No Code Minimum";
    const depth = finalMinDepth > 0 ? `${fractionToString(finalMinDepth)}"` : "No Code Minimum";
    const result = `Width: ${width}\n\nHeight: ${height}\n\nDepth: ${depth}`;
    debugLog += `Step 24: Final pull box size = ${finalMinWidth > 0 ? fractionToString(finalMinWidth) : 0} x ${finalMinHeight > 0 ? fractionToString(finalMinHeight) : 0} x ${finalMinDepth > 0 ? fractionToString(finalMinDepth) : 0}\n`;

    // Store minimum dimensions for comparison
    minimumBoxDimensions.width = finalMinWidth;
    minimumBoxDimensions.height = finalMinHeight;
    minimumBoxDimensions.depth = finalMinDepth;

    document.getElementById('result').textContent = result;
    document.getElementById('debug').textContent = debugLog;
    
    // Check if current box meets minimum requirements
    checkBoxSizeCompliance();
}

// Function to check if current box meets minimum size requirements
function checkBoxSizeCompliance() {
    const necWarning = document.getElementById('necWarning');
    const violations = [];
    
    // Check each dimension
    if (minimumBoxDimensions.width > 0 && currentBoxDimensions.width < minimumBoxDimensions.width) {
        violations.push(`Width: ${currentBoxDimensions.width}" < ${fractionToString(minimumBoxDimensions.width)}" minimum`);
    }
    if (minimumBoxDimensions.height > 0 && currentBoxDimensions.height < minimumBoxDimensions.height) {
        violations.push(`Height: ${currentBoxDimensions.height}" < ${fractionToString(minimumBoxDimensions.height)}" minimum`);
    }
    if (minimumBoxDimensions.depth > 0 && currentBoxDimensions.depth < minimumBoxDimensions.depth) {
        violations.push(`Depth: ${currentBoxDimensions.depth}" < ${fractionToString(minimumBoxDimensions.depth)}" minimum`);
    }
    
    // Show warning if any violations exist
    if (violations.length > 0) {
        necWarning.innerHTML = `<strong>Warning:</strong> Current box dimensions do not meet NEC minimum requirements:<br>` + 
            violations.join('<br>') + 
            `<br><br>Please increase box dimensions to meet code requirements.<br>` +
            `<div class="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">` +
            `<button onclick="setToMinimumDimensions()" class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"><i class="fas fa-expand-arrows-alt mr-2"></i>Set to Minimum Dimensions</button>` +
            `<label class="flex items-center space-x-2 text-sm">` +
            `<input type="checkbox" id="autoArrangeConduits" class="rounded">` +
            `<span>Auto-arrange conduits</span>` +
            `</label>` +
            `</div>`;
        necWarning.style.display = 'block';
    } else {
        necWarning.style.display = 'none';
        // Reset auto-arrange checkbox when warning is hidden
        const autoArrangeCheckbox = document.getElementById('autoArrangeConduits');
        if (autoArrangeCheckbox) {
            autoArrangeCheckbox.checked = false;
        }
    }
}

// Function to automatically set box dimensions to minimum requirements
function setToMinimumDimensions() {
    // Store auto-arrange checkbox state BEFORE updating box dimensions
    const autoArrangeCheckbox = document.getElementById('autoArrangeConduits');
    const shouldAutoArrange = autoArrangeCheckbox && autoArrangeCheckbox.checked;
    console.log('Auto-arrange checkbox found:', !!autoArrangeCheckbox);
    console.log('Auto-arrange checkbox checked:', autoArrangeCheckbox ? autoArrangeCheckbox.checked : 'N/A');
    console.log('Will auto-arrange:', shouldAutoArrange);
    
    // Helper function to round up to nearest even number
    function roundUpToEven(value) {
        const rounded = Math.ceil(value);
        return rounded % 2 === 0 ? rounded : rounded + 1;
    }
    
    // Update input fields with rounded values
    if (minimumBoxDimensions.width > 0) {
        document.getElementById('boxWidth').value = roundUpToEven(minimumBoxDimensions.width);
    }
    if (minimumBoxDimensions.height > 0) {
        document.getElementById('boxHeight').value = roundUpToEven(minimumBoxDimensions.height);
    }
    if (minimumBoxDimensions.depth > 0) {
        document.getElementById('boxDepth').value = roundUpToEven(minimumBoxDimensions.depth);
    }
    
    // Apply the changes
    updateBoxDimensions();
    
    // Now check if auto-arrange should run (using stored state)
    if (shouldAutoArrange) {
        console.log('Starting auto-arrange...');
        autoArrangeConduits();
    } else {
        console.log('Auto-arrange skipped - checkbox was not checked');
    }
    
    // Update the pulls table to recalculate distances and colors
    updatePullsTable();
    
    // Update conduit colors in 3D view
    if (is3DMode) {
        updateConduitColors();
    }
}

// Function to automatically arrange conduits for optimal spacing
function autoArrangeConduits() {
    if (pulls.length === 0) return;
    
    console.log('Auto-arranging', pulls.length, 'conduits to maximize individual pull distances...');
    
    const boxWidth = currentBoxDimensions.width * PIXELS_PER_INCH;
    const boxHeight = currentBoxDimensions.height * PIXELS_PER_INCH;
    const boxDepth = currentBoxDimensions.depth * PIXELS_PER_INCH;
    
    // Group different pull types for special handling
    const anglePulls = pulls.filter(pull => isAnglePull(pull.entrySide, pull.exitSide));
    const sideToRearPulls = pulls.filter(pull => isSideToRearPull(pull.entrySide, pull.exitSide));
    const sidewallUPulls = pulls.filter(pull => isSidewallUPull(pull.entrySide, pull.exitSide));
    const rearToRearPulls = pulls.filter(pull => isRearToRearPull(pull.entrySide, pull.exitSide));
    const straightPulls = pulls.filter(pull => isStraightPull(pull.entrySide, pull.exitSide));
    const otherPulls = pulls.filter(pull => 
        !isAnglePull(pull.entrySide, pull.exitSide) && 
        !isSideToRearPull(pull.entrySide, pull.exitSide) && 
        !isSidewallUPull(pull.entrySide, pull.exitSide) && 
        !isRearToRearPull(pull.entrySide, pull.exitSide) &&
        !isStraightPull(pull.entrySide, pull.exitSide)
    );
    
    // Handle angle pulls with clustering strategy
    if (anglePulls.length > 0) {
        console.log(`Found ${anglePulls.length} angle pulls - using clustering strategy`);
        optimizeAnglePullsWithClustering(anglePulls, boxWidth, boxHeight, boxDepth);
    }
    
    // Handle side-to-rear pulls with linear packing strategy
    if (sideToRearPulls.length > 0) {
        console.log(`Found ${sideToRearPulls.length} side-to-rear pulls - using linear packing strategy`);
        optimizeSideToRearPullsWithLinearPacking(sideToRearPulls, boxWidth, boxHeight, boxDepth);
    }
    
    // Handle sidewall U-pulls with spread strategy
    if (sidewallUPulls.length > 0) {
        console.log(`Found ${sidewallUPulls.length} sidewall U-pulls - using spread strategy`);
        optimizeSidewallUPullsWithSpreadStrategy(sidewallUPulls, boxWidth, boxHeight, boxDepth);
    }
    
    // Handle rear-to-rear U-pulls with linear packing strategy
    if (rearToRearPulls.length > 0) {
        console.log(`Found ${rearToRearPulls.length} rear-to-rear U-pulls - using linear packing strategy`);
        optimizeRearToRearPullsWithLinearPacking(rearToRearPulls, boxWidth, boxHeight, boxDepth);
    }
    
    // Handle straight pulls with linear alignment strategy
    if (straightPulls.length > 0) {
        console.log(`Found ${straightPulls.length} straight pulls - using linear alignment strategy`);
        optimizeStraightPullsWithLinearAlignment(straightPulls, boxWidth, boxHeight, boxDepth);
    }
    
    // Handle other pulls individually
    otherPulls.forEach((pull, index) => {
        console.log(`Optimizing pull ${pull.id}: ${pull.entrySide} to ${pull.exitSide}`);
        
        // Create custom points if they don't exist
        if (!pull.customEntryPoint3D) {
            pull.customEntryPoint3D = get3DPosition(pull.entrySide, boxWidth, boxHeight, boxDepth);
        }
        if (!pull.customExitPoint3D) {
            pull.customExitPoint3D = get3DPosition(pull.exitSide, boxWidth, boxHeight, boxDepth);
        }
        
        // Get optimal positions for maximum distance between entry and exit
        const optimizedPositions = getOptimalPullPositions(pull, index);
        
        if (optimizedPositions.entry) {
            pull.customEntryPoint3D = optimizedPositions.entry;
        }
        if (optimizedPositions.exit) {
            pull.customExitPoint3D = optimizedPositions.exit;
        }
    });
    
    // Update 3D visualization
    update3DPulls();
    updateConduitColors();
    
    // Save the new positions to localStorage
    savePullsToStorage();
    
    console.log('Auto-arrange complete - maximized individual pull distances');
}

// Helper function to determine if a pull is a side-to-rear pull
function isSideToRearPull(entrySide, exitSide) {
    const sideToRearPulls = [
        ['left', 'rear'], ['rear', 'left'],
        ['right', 'rear'], ['rear', 'right'],
        ['top', 'rear'], ['rear', 'top'],
        ['bottom', 'rear'], ['rear', 'bottom']
    ];
    
    return sideToRearPulls.some(([entry, exit]) => 
        entrySide === entry && exitSide === exit
    );
}

// Helper function to determine if a pull is a sidewall U-pull
function isSidewallUPull(entrySide, exitSide) {
    // U-pulls on side walls (excluding rear/rear)
    const sidewallUPulls = ['left', 'right', 'top', 'bottom'];
    return entrySide === exitSide && sidewallUPulls.includes(entrySide);
}

// Helper function to determine if a pull is a rear-to-rear U-pull
function isRearToRearPull(entrySide, exitSide) {
    // U-pulls on rear wall only
    return entrySide === 'rear' && exitSide === 'rear';
}

function isStraightPull(entrySide, exitSide) {
    // Straight pulls between opposite walls
    const straightPulls = [
        ['left', 'right'], ['right', 'left'],
        ['top', 'bottom'], ['bottom', 'top']
    ];
    
    return straightPulls.some(([entry, exit]) => 
        entrySide === entry && exitSide === exit
    );
}

// Helper function to determine if a pull is an angle pull
function isAnglePull(entrySide, exitSide) {
    // U-pulls (same side)
    if (entrySide === exitSide) {
        return false;
    }
    
    // Straight pulls (opposite sides)
    const straightPulls = [
        ['left', 'right'], ['right', 'left'],
        ['top', 'bottom'], ['bottom', 'top'],
        ['front', 'rear'], ['rear', 'front']
    ];
    
    // Side-to-rear pulls (should be treated as individual pulls, not angle pulls)
    const sideToRearPulls = [
        ['left', 'rear'], ['rear', 'left'],
        ['right', 'rear'], ['rear', 'right'],
        ['top', 'rear'], ['rear', 'top'],
        ['bottom', 'rear'], ['rear', 'bottom'],
        ['left', 'front'], ['front', 'left'],
        ['right', 'front'], ['front', 'right'],
        ['top', 'front'], ['front', 'top'],
        ['bottom', 'front'], ['front', 'bottom']
    ];
    
    // Check if it's a straight pull
    const isStraightPull = straightPulls.some(([entry, exit]) => 
        entrySide === entry && exitSide === exit
    );
    
    // Check if it's a side-to-rear pull
    const isSideToRearPull = sideToRearPulls.some(([entry, exit]) => 
        entrySide === entry && exitSide === exit
    );
    
    // Only true angle pulls (side-to-side corners) should use clustering
    return !isStraightPull && !isSideToRearPull;
}

// Function to optimize angle pulls using clustering strategy
function optimizeAnglePullsWithClustering(anglePulls, boxWidth, boxHeight, boxDepth) {
    // Group angle pulls by their entry-exit combination
    const angleGroups = {};
    anglePulls.forEach(pull => {
        const key = `${pull.entrySide}-${pull.exitSide}`;
        if (!angleGroups[key]) {
            angleGroups[key] = [];
        }
        angleGroups[key].push(pull);
    });
    
    // Optimize each group of similar angle pulls
    Object.keys(angleGroups).forEach(angleType => {
        const groupPulls = angleGroups[angleType];
        console.log(`Clustering ${groupPulls.length} ${angleType} angle pulls...`);
        
        if (groupPulls.length === 1) {
            // Single pull - use individual optimization
            const pull = groupPulls[0];
            const optimizedPositions = getOptimalPullPositions(pull, 0);
            if (optimizedPositions.entry) {
                pull.customEntryPoint3D = optimizedPositions.entry;
            }
            if (optimizedPositions.exit) {
                pull.customExitPoint3D = optimizedPositions.exit;
            }
        } else {
            // Multiple pulls - use clustering
            clusterAnglePullGroup(groupPulls, boxWidth, boxHeight, boxDepth);
        }
    });
}

// Function to cluster a group of similar angle pulls (e.g., all left/top pulls)
function clusterAnglePullGroup(groupPulls, boxWidth, boxHeight, boxDepth) {
    const firstPull = groupPulls[0];
    const entryWall = firstPull.entrySide;
    const exitWall = firstPull.exitSide;
    
    console.log(`Clustering ${groupPulls.length} ${entryWall}/${exitWall} pulls for maximum raceway distances`);
    
    // Determine optimal clustering corner for this angle type
    const clusterStrategy = getClusterStrategy(entryWall, exitWall, boxWidth, boxHeight, boxDepth);
    
    // Sort pulls by size (largest first) for better packing
    groupPulls.sort((a, b) => parseFloat(b.conduitSize) - parseFloat(a.conduitSize));
    
    // Position conduits in a tight cluster
    groupPulls.forEach((pull, index) => {
        const positions = getClusteredPositions(pull, index, clusterStrategy, groupPulls, boxWidth, boxHeight, boxDepth);
        pull.customEntryPoint3D = positions.entry;
        pull.customExitPoint3D = positions.exit;
    });
}

// Function to determine the best clustering strategy for an angle pull type
function getClusterStrategy(entryWall, exitWall, boxWidth, boxHeight, boxDepth) {
    // For each angle pull type, determine where to cluster for maximum distance
    const strategies = {
        'left-top': { 
            entryCorner: 'bottom', // Bottom of left wall
            exitCorner: 'right'    // Right side of top wall
        },
        'top-left': {
            entryCorner: 'right',  // Right side of top wall  
            exitCorner: 'bottom'   // Bottom of left wall
        },
        'top-right': {
            entryCorner: 'left',   // Left side of top wall
            exitCorner: 'bottom'   // Bottom of right wall
        },
        'right-top': {
            entryCorner: 'bottom', // Bottom of right wall
            exitCorner: 'left'     // Left side of top wall
        },
        'right-bottom': {
            entryCorner: 'top',    // Top of right wall
            exitCorner: 'left'     // Left side of bottom wall
        },
        'bottom-right': {
            entryCorner: 'left',   // Left side of bottom wall
            exitCorner: 'top'      // Top of right wall
        },
        'bottom-left': {
            entryCorner: 'right',  // Right side of bottom wall
            exitCorner: 'top'      // Top of left wall
        },
        'left-bottom': {
            entryCorner: 'top',    // Top of left wall
            exitCorner: 'right'    // Right side of bottom wall
        }
    };
    
    const key = `${entryWall}-${exitWall}`;
    return strategies[key] || { entryCorner: 'center', exitCorner: 'center' };
}

// Function to get clustered positions for a conduit in a group
function getClusteredPositions(pull, index, strategy, groupPulls, boxWidth, boxHeight, boxDepth) {
    const od = locknutODSpacing[pull.conduitSize] || pull.conduitSize + 0.5;
    const radius = (od * PIXELS_PER_INCH) / 2;
    const spacing = od * PIXELS_PER_INCH; // Full locknut OD spacing to prevent overlap
    
    console.log(`Pull ${pull.id} (index ${index}): conduitSize=${pull.conduitSize}", od=${od}", spacing=${spacing/PIXELS_PER_INCH}"`);
    
    // Calculate dynamic buffer based on largest conduit in the group
    const largestConduitSize = Math.max(...groupPulls.map(p => parseFloat(p.conduitSize)));
    const largestOD = locknutODSpacing[largestConduitSize] || largestConduitSize + 0.5;
    const dynamicBuffer = (largestOD * PIXELS_PER_INCH) / 2; // Half the largest locknut OD
    
    console.log(`  Group largest conduit: ${largestConduitSize}", buffer: ${(dynamicBuffer/PIXELS_PER_INCH).toFixed(2)}"`);
    
    // Get extreme starting positions for the walls with dynamic buffer
    const entryStart = getWallExtremePosition(pull.entrySide, strategy.entryCorner, dynamicBuffer, boxWidth, boxHeight, boxDepth);
    const exitStart = getWallExtremePosition(pull.exitSide, strategy.exitCorner, dynamicBuffer, boxWidth, boxHeight, boxDepth);
    
    // Pack conduits linearly from the extreme positions
    const entryPos = getLinearPackedPosition(entryStart, pull.entrySide, strategy.entryCorner, index, spacing, boxWidth, boxHeight, boxDepth);
    const exitPos = getLinearPackedPosition(exitStart, pull.exitSide, strategy.exitCorner, index, spacing, boxWidth, boxHeight, boxDepth);
    
    console.log(`  Entry: start=(${(entryStart.x/PIXELS_PER_INCH).toFixed(1)}, ${(entryStart.y/PIXELS_PER_INCH).toFixed(1)}) -> final=(${(entryPos.x/PIXELS_PER_INCH).toFixed(1)}, ${(entryPos.y/PIXELS_PER_INCH).toFixed(1)})`);
    console.log(`  Exit: start=(${(exitStart.x/PIXELS_PER_INCH).toFixed(1)}, ${(exitStart.y/PIXELS_PER_INCH).toFixed(1)}) -> final=(${(exitPos.x/PIXELS_PER_INCH).toFixed(1)}, ${(exitPos.y/PIXELS_PER_INCH).toFixed(1)})`);
    
    // Lightly constrain positions to stay within wall bounds (trust our linear packing)
    const entryConstrained = lightConstrainToWall(entryPos, pull.entrySide, radius, boxWidth, boxHeight, boxDepth);
    const exitConstrained = lightConstrainToWall(exitPos, pull.exitSide, radius, boxWidth, boxHeight, boxDepth);
    
    return {
        entry: entryConstrained,
        exit: exitConstrained
    };
}

// Helper function to get extreme positions on walls (far edges)
function getWallExtremePosition(wall, corner, buffer, boxWidth, boxHeight, boxDepth) {
    // Use dynamic buffer based on conduit size
    
    const positions = {
        'left': {
            'top': { x: -boxWidth/2, y: boxHeight/2 - buffer, z: 0 },      // Top of left wall
            'bottom': { x: -boxWidth/2, y: -boxHeight/2 + buffer, z: 0 },  // Bottom of left wall
            'center': { x: -boxWidth/2, y: 0, z: 0 }
        },
        'right': {
            'top': { x: boxWidth/2, y: boxHeight/2 - buffer, z: 0 },       // Top of right wall
            'bottom': { x: boxWidth/2, y: -boxHeight/2 + buffer, z: 0 },   // Bottom of right wall
            'center': { x: boxWidth/2, y: 0, z: 0 }
        },
        'top': {
            'left': { x: -boxWidth/2 + buffer, y: boxHeight/2, z: 0 },     // Left of top wall
            'right': { x: boxWidth/2 - buffer, y: boxHeight/2, z: 0 },     // Right of top wall
            'center': { x: 0, y: boxHeight/2, z: 0 }
        },
        'bottom': {
            'left': { x: -boxWidth/2 + buffer, y: -boxHeight/2, z: 0 },    // Left of bottom wall
            'right': { x: boxWidth/2 - buffer, y: -boxHeight/2, z: 0 },    // Right of bottom wall
            'center': { x: 0, y: -boxHeight/2, z: 0 }
        }
    };
    
    return positions[wall]?.[corner] || { x: 0, y: 0, z: 0 };
}

// Helper function to pack conduits linearly from a starting position
function getLinearPackedPosition(startPos, wall, corner, index, spacing, boxWidth, boxHeight, boxDepth) {
    // Clone starting position
    const position = { ...startPos };
    
    // Determine movement direction based on wall and corner combination
    switch (wall) {
        case 'left':
            if (corner === 'bottom') {
                position.y += index * spacing; // Move up from bottom
            } else if (corner === 'top') {
                position.y -= index * spacing; // Move down from top
            }
            break;
            
        case 'right':
            if (corner === 'bottom') {
                position.y += index * spacing; // Move up from bottom
            } else if (corner === 'top') {
                position.y -= index * spacing; // Move down from top
            }
            break;
            
        case 'top':
            if (corner === 'right') {
                position.x -= index * spacing; // Move left from right
            } else if (corner === 'left') {
                position.x += index * spacing; // Move right from left
            }
            break;
            
        case 'bottom':
            if (corner === 'left') {
                position.x += index * spacing; // Move right from left
            } else if (corner === 'right') {
                position.x -= index * spacing; // Move left from right
            }
            break;
    }
    
    return position;
}

// Helper function to lightly constrain positions (only if outside box)
function lightConstrainToWall(position, wall, radius, boxWidth, boxHeight, boxDepth) {
    const constrained = { ...position };
    
    // Only constrain if the conduit would actually go outside the box bounds
    switch (wall) {
        case 'left':
            constrained.x = -boxWidth/2; // Keep on left wall
            constrained.y = Math.max(-boxHeight/2 + radius, Math.min(boxHeight/2 - radius, position.y));
            break;
        case 'right':
            constrained.x = boxWidth/2; // Keep on right wall
            constrained.y = Math.max(-boxHeight/2 + radius, Math.min(boxHeight/2 - radius, position.y));
            break;
        case 'top':
            constrained.y = boxHeight/2; // Keep on top wall
            constrained.x = Math.max(-boxWidth/2 + radius, Math.min(boxWidth/2 - radius, position.x));
            break;
        case 'bottom':
            constrained.y = -boxHeight/2; // Keep on bottom wall
            constrained.x = Math.max(-boxWidth/2 + radius, Math.min(boxWidth/2 - radius, position.x));
            break;
    }
    
    return constrained;
}

// Helper function to constrain positions to wall boundaries (original - more aggressive)
function constrainToWall(position, wall, radius, boxWidth, boxHeight, boxDepth) {
    const bounds = {
        'left': { 
            x: -boxWidth/2, 
            yMin: -boxHeight/2 + radius, yMax: boxHeight/2 - radius,
            zMin: -boxDepth/2 + radius, zMax: boxDepth/2 - radius
        },
        'right': { 
            x: boxWidth/2, 
            yMin: -boxHeight/2 + radius, yMax: boxHeight/2 - radius,
            zMin: -boxDepth/2 + radius, zMax: boxDepth/2 - radius
        },
        'top': { 
            y: boxHeight/2,
            xMin: -boxWidth/2 + radius, xMax: boxWidth/2 - radius,
            zMin: -boxDepth/2 + radius, zMax: boxDepth/2 - radius
        },
        'bottom': { 
            y: -boxHeight/2,
            xMin: -boxWidth/2 + radius, xMax: boxWidth/2 - radius,
            zMin: -boxDepth/2 + radius, zMax: boxDepth/2 - radius
        }
    };
    
    const bound = bounds[wall];
    if (!bound) return position;
    
    const constrained = { ...position };
    
    if (wall === 'left' || wall === 'right') {
        constrained.x = bound.x;
        constrained.y = Math.max(bound.yMin, Math.min(bound.yMax, position.y));
        constrained.z = Math.max(bound.zMin, Math.min(bound.zMax, position.z));
    } else if (wall === 'top' || wall === 'bottom') {
        constrained.y = bound.y;
        constrained.x = Math.max(bound.xMin, Math.min(bound.xMax, position.x));
        constrained.z = Math.max(bound.zMin, Math.min(bound.zMax, position.z));
    }
    
    return constrained;
}

// Function to get optimal positions for a single pull to maximize its distance
function getOptimalPullPositions(targetPull, pullIndex) {
    const boxWidth = currentBoxDimensions.width * PIXELS_PER_INCH;
    const boxHeight = currentBoxDimensions.height * PIXELS_PER_INCH;
    const boxDepth = currentBoxDimensions.depth * PIXELS_PER_INCH;
    
    const targetLocknutOD = locknutODSpacing[targetPull.conduitSize] || targetPull.conduitSize + 0.5;
    const targetRadius = (targetLocknutOD * PIXELS_PER_INCH) / 2;
    
    // Get available space on each wall for this pull
    const entryOptions = getAvailablePositionsOnWall(targetPull.entrySide, targetPull, pullIndex, targetRadius);
    const exitOptions = getAvailablePositionsOnWall(targetPull.exitSide, targetPull, pullIndex, targetRadius);
    
    // Find combination that maximizes distance between entry and exit
    let maxDistance = 0;
    let bestEntry = null;
    let bestExit = null;
    
    entryOptions.forEach(entryPos => {
        exitOptions.forEach(exitPos => {
            // Calculate actual raceway distance (edge-to-edge) like calculatePullDistance()
            const vec1 = new THREE.Vector3(entryPos.x, entryPos.y, entryPos.z);
            const vec2 = new THREE.Vector3(exitPos.x, exitPos.y, exitPos.z);
            const direction = vec2.clone().sub(vec1).normalize();
            
            // Calculate edge points accounting for conduit radius
            const edge1 = vec1.clone().add(direction.clone().multiplyScalar(targetRadius));
            const edge2 = vec2.clone().sub(direction.clone().multiplyScalar(targetRadius));
            
            // Distance between raceway edges (not centers)
            const distance = edge1.distanceTo(edge2);
            
            if (distance > maxDistance) {
                maxDistance = distance;
                bestEntry = entryPos;
                bestExit = exitPos;
            }
        });
    });
    
    console.log(`Pull ${targetPull.id}: Found max distance of ${(maxDistance / PIXELS_PER_INCH).toFixed(2)}" between entry and exit`);
    
    return {
        entry: bestEntry,
        exit: bestExit,
        distance: maxDistance
    };
}

// Function to get available positions on a wall while avoiding overlaps
function getAvailablePositionsOnWall(wall, targetPull, targetPullIndex, targetRadius) {
    const boxWidth = currentBoxDimensions.width * PIXELS_PER_INCH;
    const boxHeight = currentBoxDimensions.height * PIXELS_PER_INCH;
    const boxDepth = currentBoxDimensions.depth * PIXELS_PER_INCH;
    
    
    const positions = [];
    const gridSteps = 5; // Use fixed number of grid steps for simplicity
    
    // Generate positions based on wall orientation, staying within bounds
    switch (wall) {
        case 'left':
        case 'right':
            // Y: -boxHeight/2 to +boxHeight/2, Z: -boxDepth/2 to +boxDepth/2
            const yMin = -boxHeight/2 + targetRadius;
            const yMax = boxHeight/2 - targetRadius;
            const zMin = -boxDepth/2 + targetRadius;
            const zMax = boxDepth/2 - targetRadius;
            
            for (let i = 0; i < gridSteps; i++) {
                for (let j = 0; j < gridSteps; j++) {
                    const y = yMin + (yMax - yMin) * i / (gridSteps - 1);
                    const z = zMin + (zMax - zMin) * j / (gridSteps - 1);
                    
                    const position = {
                        x: wall === 'left' ? -boxWidth/2 : boxWidth/2,
                        y: Math.max(yMin, Math.min(yMax, y)),
                        z: Math.max(zMin, Math.min(zMax, z))
                    };
                    if (isPositionValid(position, wall, targetPull, targetPullIndex, targetRadius)) {
                        positions.push(position);
                    }
                }
            }
            break;
            
        case 'top':
        case 'bottom':
            // X: -boxWidth/2 to +boxWidth/2, Z: -boxDepth/2 to +boxDepth/2
            const xMin = -boxWidth/2 + targetRadius;
            const xMax = boxWidth/2 - targetRadius;
            const zMin2 = -boxDepth/2 + targetRadius;
            const zMax2 = boxDepth/2 - targetRadius;
            
            for (let i = 0; i < gridSteps; i++) {
                for (let j = 0; j < gridSteps; j++) {
                    const x = xMin + (xMax - xMin) * i / (gridSteps - 1);
                    const z = zMin2 + (zMax2 - zMin2) * j / (gridSteps - 1);
                    
                    const position = {
                        x: Math.max(xMin, Math.min(xMax, x)),
                        y: wall === 'top' ? boxHeight/2 : -boxHeight/2,
                        z: Math.max(zMin2, Math.min(zMax2, z))
                    };
                    if (isPositionValid(position, wall, targetPull, targetPullIndex, targetRadius)) {
                        positions.push(position);
                    }
                }
            }
            break;
            
        case 'rear':
            // X: -boxWidth/2 to +boxWidth/2, Y: -boxHeight/2 to +boxHeight/2
            const xMin3 = -boxWidth/2 + targetRadius;
            const xMax3 = boxWidth/2 - targetRadius;
            const yMin3 = -boxHeight/2 + targetRadius;
            const yMax3 = boxHeight/2 - targetRadius;
            
            for (let i = 0; i < gridSteps; i++) {
                for (let j = 0; j < gridSteps; j++) {
                    const x = xMin3 + (xMax3 - xMin3) * i / (gridSteps - 1);
                    const y = yMin3 + (yMax3 - yMin3) * j / (gridSteps - 1);
                    
                    const position = {
                        x: Math.max(xMin3, Math.min(xMax3, x)),
                        y: Math.max(yMin3, Math.min(yMax3, y)),
                        z: -boxDepth/2
                    };
                    if (isPositionValid(position, wall, targetPull, targetPullIndex, targetRadius)) {
                        positions.push(position);
                    }
                }
            }
            break;
    }
    
    return positions;
}

// Function to check if a position is valid (no overlaps with other conduits)
function isPositionValid(position, wall, targetPull, targetPullIndex, targetRadius) {
    // Check against all other pulls
    for (let i = 0; i < pulls.length; i++) {
        if (i === targetPullIndex) continue; // Skip self
        
        const otherPull = pulls[i];
        const otherLocknutOD = locknutODSpacing[otherPull.conduitSize] || otherPull.conduitSize + 0.5;
        const otherRadius = (otherLocknutOD * PIXELS_PER_INCH) / 2;
        const minDistance = targetRadius + otherRadius;
        
        // Check entry point overlap
        if (otherPull.customEntryPoint3D && otherPull.entrySide === wall) {
            const distance = Math.sqrt(
                Math.pow(position.x - otherPull.customEntryPoint3D.x, 2) +
                Math.pow(position.y - otherPull.customEntryPoint3D.y, 2) +
                Math.pow(position.z - otherPull.customEntryPoint3D.z, 2)
            );
            if (distance < minDistance) return false;
        }
        
        // Check exit point overlap
        if (otherPull.customExitPoint3D && otherPull.exitSide === wall) {
            const distance = Math.sqrt(
                Math.pow(position.x - otherPull.customExitPoint3D.x, 2) +
                Math.pow(position.y - otherPull.customExitPoint3D.y, 2) +
                Math.pow(position.z - otherPull.customExitPoint3D.z, 2)
            );
            if (distance < minDistance) return false;
        }
    }
    
    return true;
}

// Function to optimize side-to-rear pulls using linear packing strategy
function optimizeSideToRearPullsWithLinearPacking(sideToRearPulls, boxWidth, boxHeight, boxDepth) {
    // Group side-to-rear pulls by their entry wall
    const wallGroups = {};
    sideToRearPulls.forEach(pull => {
        // Determine the wall that needs linear packing (the side wall, not rear)
        const packingWall = (pull.entrySide === 'rear') ? pull.exitSide : pull.entrySide;
        const key = packingWall; // left, right, top, or bottom
        if (!wallGroups[key]) {
            wallGroups[key] = [];
        }
        wallGroups[key].push(pull);
    });
    
    // Optimize each wall group with linear packing
    Object.keys(wallGroups).forEach(wall => {
        const groupPulls = wallGroups[wall];
        console.log(`Linear packing ${groupPulls.length} pulls on ${wall} wall...`);
        
        if (groupPulls.length === 1) {
            // Single pull - use individual optimization
            const pull = groupPulls[0];
            const optimizedPositions = getOptimalPullPositions(pull, 0);
            if (optimizedPositions.entry) {
                pull.customEntryPoint3D = optimizedPositions.entry;
            }
            if (optimizedPositions.exit) {
                pull.customExitPoint3D = optimizedPositions.exit;
            }
        } else {
            // Multiple pulls - use linear packing on the side wall
            linearPackSideToRearGroup(groupPulls, wall, boxWidth, boxHeight, boxDepth);
        }
    });
}

// Function to linearly pack a group of side-to-rear pulls on a specific wall
function linearPackSideToRearGroup(groupPulls, packingWall, boxWidth, boxHeight, boxDepth) {
    console.log(`  Packing ${groupPulls.length} conduits on ${packingWall} wall`);
    
    // Calculate spacing for linear packing
    const largestConduitSize = Math.max(...groupPulls.map(p => parseFloat(p.conduitSize)));
    const largestOD = locknutODSpacing[largestConduitSize] || largestConduitSize + 0.5;
    const spacing = largestOD * PIXELS_PER_INCH; // Use largest locknut OD for spacing
    const dynamicBuffer = spacing / 2; // Half the largest locknut OD
    
    console.log(`  Largest conduit: ${largestConduitSize}", spacing: ${(spacing/PIXELS_PER_INCH).toFixed(2)}", buffer: ${(dynamicBuffer/PIXELS_PER_INCH).toFixed(2)}"`);
    
    groupPulls.forEach((pull, index) => {
        console.log(`  Processing pull ${pull.id}: ${pull.entrySide} to ${pull.exitSide}`);
        
        // Determine which position to pack linearly and which to optimize individually
        let packPosition, optimizePosition;
        let packSide, optimizeSide;
        
        if (pull.entrySide === packingWall) {
            // Entry is on the packing wall, exit is on rear
            packSide = pull.entrySide;
            optimizeSide = pull.exitSide;
        } else {
            // Exit is on the packing wall, entry is on rear  
            packSide = pull.exitSide;
            optimizeSide = pull.entrySide;
        }
        
        // Get linearly packed position on the side wall
        packPosition = getLinearPackedPositionOnWall(packingWall, index, spacing, dynamicBuffer, boxWidth, boxHeight, boxDepth);
        
        // Get mirrored position on the rear wall (maintain linear distribution)
        optimizePosition = getMirroredRearPosition(packPosition, packingWall, index, spacing, dynamicBuffer, boxWidth, boxHeight, boxDepth);
        
        // Assign positions correctly
        if (pull.entrySide === packingWall) {
            pull.customEntryPoint3D = packPosition;
            pull.customExitPoint3D = optimizePosition;
        } else {
            pull.customEntryPoint3D = optimizePosition;
            pull.customExitPoint3D = packPosition;
        }
        
        console.log(`    Entry: (${(pull.customEntryPoint3D.x/PIXELS_PER_INCH).toFixed(1)}, ${(pull.customEntryPoint3D.y/PIXELS_PER_INCH).toFixed(1)}, ${(pull.customEntryPoint3D.z/PIXELS_PER_INCH).toFixed(1)})`);
        console.log(`    Exit: (${(pull.customExitPoint3D.x/PIXELS_PER_INCH).toFixed(1)}, ${(pull.customExitPoint3D.y/PIXELS_PER_INCH).toFixed(1)}, ${(pull.customExitPoint3D.z/PIXELS_PER_INCH).toFixed(1)})`);
    });
}

// Function to get linearly packed position on a specific wall
function getLinearPackedPositionOnWall(wall, index, spacing, buffer, boxWidth, boxHeight, boxDepth) {
    const position = { x: 0, y: 0, z: 0 };
    
    switch (wall) {
        case 'left':
            position.x = -boxWidth/2;
            // Pack vertically from top to bottom
            position.y = (boxHeight/2) - buffer - (index * spacing);
            position.z = 0;
            break;
            
        case 'right':
            position.x = boxWidth/2;
            // Pack vertically from top to bottom  
            position.y = (boxHeight/2) - buffer - (index * spacing);
            position.z = 0;
            break;
            
        case 'top':
            position.y = boxHeight/2;
            // Pack horizontally from left to right
            position.x = (-boxWidth/2) + buffer + (index * spacing);
            position.z = 0;
            break;
            
        case 'bottom':
            position.y = -boxHeight/2;
            // Pack horizontally from left to right
            position.x = (-boxWidth/2) + buffer + (index * spacing);
            position.z = 0;
            break;
    }
    
    return position;
}

// Function to get mirrored position on rear wall that maintains linear distribution
function getMirroredRearPosition(sidePosition, packingWall, index, spacing, buffer, boxWidth, boxHeight, boxDepth) {
    // Mirror the linear packing from side wall to rear wall
    // This maintains the same spacing and distribution pattern
    
    const rearZ = -boxDepth/2; // Rear wall is at -boxDepth/2
    const position = { x: 0, y: 0, z: rearZ };
    
    switch (packingWall) {
        case 'left':
            // Left wall packs vertically, rear should pack vertically at far right
            position.x = (boxWidth/2) - buffer;
            position.y = (boxHeight/2) - buffer - (index * spacing);
            break;
            
        case 'right':
            // Right wall packs vertically, rear should pack vertically at far left
            position.x = (-boxWidth/2) + buffer;
            position.y = (boxHeight/2) - buffer - (index * spacing);
            break;
            
        case 'top':
            // Top wall packs horizontally, rear should pack horizontally at bottom
            position.x = (-boxWidth/2) + buffer + (index * spacing);
            position.y = (-boxHeight/2) + buffer;
            break;
            
        case 'bottom':
            // Bottom wall packs horizontally, rear should pack horizontally at top
            position.x = (-boxWidth/2) + buffer + (index * spacing);
            position.y = (boxHeight/2) - buffer;
            break;
    }
    
    // Constrain to wall bounds
    const radius = buffer; // Use buffer as radius approximation
    position.x = Math.max((-boxWidth/2) + radius, Math.min((boxWidth/2) - radius, position.x));
    position.y = Math.max((-boxHeight/2) + radius, Math.min((boxHeight/2) - radius, position.y));
    
    return position;
}

// Function to optimize sidewall U-pulls with spread strategy
function optimizeSidewallUPullsWithSpreadStrategy(sidewallUPulls, boxWidth, boxHeight, boxDepth) {
    // Group sidewall U-pulls by wall
    const wallGroups = {};
    sidewallUPulls.forEach(pull => {
        const wall = pull.entrySide; // Entry and exit are the same for U-pulls
        if (!wallGroups[wall]) {
            wallGroups[wall] = [];
        }
        wallGroups[wall].push(pull);
    });
    
    // Optimize each wall group with spread strategy
    Object.keys(wallGroups).forEach(wall => {
        const groupPulls = wallGroups[wall];
        console.log(`Spread strategy for ${groupPulls.length} U-pulls on ${wall} wall...`);
        
        if (groupPulls.length === 1) {
            // Single U-pull - use individual optimization
            const pull = groupPulls[0];
            const optimizedPositions = getOptimalPullPositions(pull, 0);
            if (optimizedPositions.entry) {
                pull.customEntryPoint3D = optimizedPositions.entry;
            }
            if (optimizedPositions.exit) {
                pull.customExitPoint3D = optimizedPositions.exit;
            }
        } else {
            // Multiple U-pulls - use spread strategy to maximize distance between raceways
            spreadUPullsOnWall(groupPulls, wall, boxWidth, boxHeight, boxDepth);
        }
    });
}

// Function to arrange U-pulls on a wall with converging pattern to maximize distance between raceways
function spreadUPullsOnWall(groupPulls, wall, boxWidth, boxHeight, boxDepth) {
    console.log(`  Arranging ${groupPulls.length} U-pulls on ${wall} wall with converging pattern`);
    
    // Sort by conduit size (largest first) for optimal packing
    groupPulls.sort((a, b) => parseFloat(b.conduitSize) - parseFloat(a.conduitSize));
    
    // Calculate spacing based on largest conduit
    const largestConduitSize = parseFloat(groupPulls[0].conduitSize);
    const largestOD = locknutODSpacing[largestConduitSize] || largestConduitSize + 0.5;
    const spacing = largestOD * PIXELS_PER_INCH;
    const buffer = spacing / 2;
    
    console.log(`  Largest conduit: ${largestConduitSize}", spacing: ${(spacing/PIXELS_PER_INCH).toFixed(2)}", buffer: ${(buffer/PIXELS_PER_INCH).toFixed(2)}"`);
    
    // Determine wall orientation and dimensions
    let isVertical, wallLength, fixedCoord, varCoord1, varCoord2;
    
    switch (wall) {
        case 'left':
            isVertical = true;
            wallLength = boxHeight;
            fixedCoord = -boxWidth/2;
            varCoord1 = 'y';
            varCoord2 = 'z';
            break;
        case 'right':
            isVertical = true;
            wallLength = boxHeight;
            fixedCoord = boxWidth/2;
            varCoord1 = 'y';
            varCoord2 = 'z';
            break;
        case 'top':
            isVertical = false;
            wallLength = boxWidth;
            fixedCoord = boxHeight/2;
            varCoord1 = 'x';
            varCoord2 = 'z';
            break;
        case 'bottom':
            isVertical = false;
            wallLength = boxWidth;
            fixedCoord = -boxHeight/2;
            varCoord1 = 'x';
            varCoord2 = 'z';
            break;
    }
    
    // Calculate converging positions
    groupPulls.forEach((pull, index) => {
        console.log(`  Processing U-pull ${pull.id} (${pull.conduitSize}") at index ${index}`);
        
        // For converging pattern:
        // Entry positions work inward from one extreme
        // Exit positions work inward from opposite extreme
        const entryOffset = buffer + (index * spacing);
        const exitOffset = buffer + (index * spacing);
        
        let entryPos, exitPos;
        
        if (isVertical) {
            // Vertical walls (left/right): vary Y coordinate, Z stays at 0 for front face
            entryPos = {
                x: fixedCoord,
                y: (wallLength/2) - entryOffset,    // Start from top, work down
                z: 0
            };
            exitPos = {
                x: fixedCoord,
                y: (-wallLength/2) + exitOffset,   // Start from bottom, work up
                z: 0
            };
        } else {
            // Horizontal walls (top/bottom): vary X coordinate, Z stays at 0 for front face
            entryPos = {
                x: (-wallLength/2) + entryOffset,  // Start from left, work right
                y: fixedCoord,
                z: 0
            };
            exitPos = {
                x: (wallLength/2) - exitOffset,   // Start from right, work left
                y: fixedCoord,
                z: 0
            };
        }
        
        // Ensure positions stay within wall bounds
        const minBound = -wallLength/2 + buffer;
        const maxBound = wallLength/2 - buffer;
        
        if (isVertical) {
            entryPos.y = Math.max(minBound, Math.min(maxBound, entryPos.y));
            exitPos.y = Math.max(minBound, Math.min(maxBound, exitPos.y));
        } else {
            entryPos.x = Math.max(minBound, Math.min(maxBound, entryPos.x));
            exitPos.x = Math.max(minBound, Math.min(maxBound, exitPos.x));
        }
        
        pull.customEntryPoint3D = entryPos;
        pull.customExitPoint3D = exitPos;
        
        // Calculate distance between entry and exit
        const distance = Math.sqrt(
            Math.pow(exitPos.x - entryPos.x, 2) + 
            Math.pow(exitPos.y - entryPos.y, 2) + 
            Math.pow(exitPos.z - entryPos.z, 2)
        );
        
        console.log(`    Entry: (${(entryPos.x/PIXELS_PER_INCH).toFixed(1)}, ${(entryPos.y/PIXELS_PER_INCH).toFixed(1)}, ${(entryPos.z/PIXELS_PER_INCH).toFixed(1)})`);
        console.log(`    Exit: (${(exitPos.x/PIXELS_PER_INCH).toFixed(1)}, ${(exitPos.y/PIXELS_PER_INCH).toFixed(1)}, ${(exitPos.z/PIXELS_PER_INCH).toFixed(1)})`);
        console.log(`    Distance: ${(distance/PIXELS_PER_INCH).toFixed(2)}"`);
    });
}

// Function to optimize rear-to-rear U-pulls with linear packing strategy
function optimizeRearToRearPullsWithLinearPacking(rearToRearPulls, boxWidth, boxHeight, boxDepth) {
    console.log(`Linear packing ${rearToRearPulls.length} rear-to-rear U-pulls on rear wall...`);
    
    // Sort by conduit size (largest first) for optimal packing
    rearToRearPulls.sort((a, b) => parseFloat(b.conduitSize) - parseFloat(a.conduitSize));
    
    // Calculate spacing for linear packing
    const largestConduitSize = Math.max(...rearToRearPulls.map(p => parseFloat(p.conduitSize)));
    const largestOD = locknutODSpacing[largestConduitSize] || largestConduitSize + 0.5;
    const spacing = largestOD * PIXELS_PER_INCH; // Use largest locknut OD for spacing
    const dynamicBuffer = spacing / 2; // Half the largest locknut OD
    
    console.log(`  Largest conduit: ${largestConduitSize}", spacing: ${(spacing/PIXELS_PER_INCH).toFixed(2)}", buffer: ${(dynamicBuffer/PIXELS_PER_INCH).toFixed(2)}"`);
    
    rearToRearPulls.forEach((pull, index) => {
        console.log(`  Processing rear-to-rear pull ${pull.id}: ${pull.entrySide} to ${pull.exitSide}`);
        
        // Entry: Left side of rear wall, working down from top
        const entryPosition = {
            x: (-boxWidth/2) + dynamicBuffer,  // Far left of rear wall
            y: (boxHeight/2) - dynamicBuffer - (index * spacing), // Top to bottom
            z: -boxDepth/2  // Rear wall
        };
        
        // Exit: Right side of rear wall, working down from top (directly across)
        const exitPosition = {
            x: (boxWidth/2) - dynamicBuffer,   // Far right of rear wall
            y: (boxHeight/2) - dynamicBuffer - (index * spacing), // Same Y as entry
            z: -boxDepth/2  // Rear wall
        };
        
        // Constrain to wall bounds
        const yMin = (-boxHeight/2) + dynamicBuffer;
        const yMax = (boxHeight/2) - dynamicBuffer;
        entryPosition.y = Math.max(yMin, Math.min(yMax, entryPosition.y));
        exitPosition.y = Math.max(yMin, Math.min(yMax, exitPosition.y));
        
        pull.customEntryPoint3D = entryPosition;
        pull.customExitPoint3D = exitPosition;
        
        console.log(`    Entry: (${(entryPosition.x/PIXELS_PER_INCH).toFixed(1)}, ${(entryPosition.y/PIXELS_PER_INCH).toFixed(1)}, ${(entryPosition.z/PIXELS_PER_INCH).toFixed(1)})`);
        console.log(`    Exit: (${(exitPosition.x/PIXELS_PER_INCH).toFixed(1)}, ${(exitPosition.y/PIXELS_PER_INCH).toFixed(1)}, ${(exitPosition.z/PIXELS_PER_INCH).toFixed(1)})`);
    });
}

// Function to optimize straight pulls with linear alignment strategy
function optimizeStraightPullsWithLinearAlignment(straightPulls, boxWidth, boxHeight, boxDepth) {
    console.log(`Optimizing ${straightPulls.length} straight pulls with linear alignment strategy`);
    
    // Group straight pulls by type (horizontal vs vertical)
    const horizontalPulls = straightPulls.filter(pull => 
        (pull.entrySide === 'left' && pull.exitSide === 'right') ||
        (pull.entrySide === 'right' && pull.exitSide === 'left')
    );
    
    const verticalPulls = straightPulls.filter(pull => 
        (pull.entrySide === 'top' && pull.exitSide === 'bottom') ||
        (pull.entrySide === 'bottom' && pull.exitSide === 'top')
    );
    
    // Optimize horizontal straight pulls
    if (horizontalPulls.length > 0) {
        optimizeHorizontalStraightPulls(horizontalPulls, boxWidth, boxHeight, boxDepth);
    }
    
    // Optimize vertical straight pulls
    if (verticalPulls.length > 0) {
        optimizeVerticalStraightPulls(verticalPulls, boxWidth, boxHeight, boxDepth);
    }
}

// Function to optimize horizontal straight pulls (left-right)
function optimizeHorizontalStraightPulls(horizontalPulls, boxWidth, boxHeight, boxDepth) {
    console.log(`Optimizing ${horizontalPulls.length} horizontal straight pulls`);
    
    // Get largest conduit OD for spacing
    const largestOD = Math.max(...horizontalPulls.map(pull => locknutODSpacing[pull.conduitSize] || pull.conduitSize + 0.5));
    const spacing = largestOD * PIXELS_PER_INCH;
    
    horizontalPulls.forEach((pull, index) => {
        // Use the same linear packing logic as side-to-rear pulls
        const dynamicBuffer = spacing / 2;
        const entryPosition = getLinearPackedPositionOnWall(pull.entrySide, index, spacing, dynamicBuffer, boxWidth, boxHeight, boxDepth);
        const exitPosition = getLinearPackedPositionOnWall(pull.exitSide, index, spacing, dynamicBuffer, boxWidth, boxHeight, boxDepth);
        
        // For straight pulls, align them on the same Y coordinate (height)
        const alignedY = entryPosition.y;
        
        pull.customEntryPoint3D = entryPosition;
        pull.customExitPoint3D = { 
            x: exitPosition.x, 
            y: alignedY,  // Same Y coordinate for perfect alignment
            z: exitPosition.z 
        };
        
        console.log(`  Pull ${pull.id} (${fractionToString(pull.conduitSize)}"): ${pull.entrySide} to ${pull.exitSide}`);
        console.log(`    Entry: (${(pull.customEntryPoint3D.x/PIXELS_PER_INCH).toFixed(1)}, ${(pull.customEntryPoint3D.y/PIXELS_PER_INCH).toFixed(1)}, ${(pull.customEntryPoint3D.z/PIXELS_PER_INCH).toFixed(1)})`);
        console.log(`    Exit: (${(pull.customExitPoint3D.x/PIXELS_PER_INCH).toFixed(1)}, ${(pull.customExitPoint3D.y/PIXELS_PER_INCH).toFixed(1)}, ${(pull.customExitPoint3D.z/PIXELS_PER_INCH).toFixed(1)})`);
    });
}

// Function to optimize vertical straight pulls (top-bottom)
function optimizeVerticalStraightPulls(verticalPulls, boxWidth, boxHeight, boxDepth) {
    console.log(`Optimizing ${verticalPulls.length} vertical straight pulls`);
    
    // Get largest conduit OD for spacing
    const largestOD = Math.max(...verticalPulls.map(pull => locknutODSpacing[pull.conduitSize] || pull.conduitSize + 0.5));
    const spacing = largestOD * PIXELS_PER_INCH;
    
    verticalPulls.forEach((pull, index) => {
        // Use the same linear packing logic as side-to-rear pulls
        const dynamicBuffer = spacing / 2;
        const entryPosition = getLinearPackedPositionOnWall(pull.entrySide, index, spacing, dynamicBuffer, boxWidth, boxHeight, boxDepth);
        const exitPosition = getLinearPackedPositionOnWall(pull.exitSide, index, spacing, dynamicBuffer, boxWidth, boxHeight, boxDepth);
        
        // For straight pulls, align them on the same X coordinate (width)
        const alignedX = entryPosition.x;
        
        pull.customEntryPoint3D = entryPosition;
        pull.customExitPoint3D = { 
            x: alignedX,  // Same X coordinate for perfect alignment
            y: exitPosition.y, 
            z: exitPosition.z 
        };
        
        console.log(`  Pull ${pull.id} (${fractionToString(pull.conduitSize)}"): ${pull.entrySide} to ${pull.exitSide}`);
        console.log(`    Entry: (${(pull.customEntryPoint3D.x/PIXELS_PER_INCH).toFixed(1)}, ${(pull.customEntryPoint3D.y/PIXELS_PER_INCH).toFixed(1)}, ${(pull.customEntryPoint3D.z/PIXELS_PER_INCH).toFixed(1)})`);
        console.log(`    Exit: (${(pull.customExitPoint3D.x/PIXELS_PER_INCH).toFixed(1)}, ${(pull.customExitPoint3D.y/PIXELS_PER_INCH).toFixed(1)}, ${(pull.customExitPoint3D.z/PIXELS_PER_INCH).toFixed(1)})`);
    });
}

// Function to arrange conduits optimally on a specific wall
function arrangeConduitsOnWall(wall, wallPulls) {
    if (wallPulls.length <= 1) return; // No need to arrange single conduit
    
    const boxWidth = currentBoxDimensions.width * PIXELS_PER_INCH;
    const boxHeight = currentBoxDimensions.height * PIXELS_PER_INCH;
    const boxDepth = currentBoxDimensions.depth * PIXELS_PER_INCH;
    
    // Calculate available space and optimal positions based on wall
    let availableLength, isHorizontal;
    
    switch (wall) {
        case 'left':
        case 'right':
            availableLength = boxHeight;
            isHorizontal = false;
            break;
        case 'top':
        case 'bottom':
            availableLength = boxWidth;
            isHorizontal = true;
            break;
        case 'rear':
            // For rear wall, use the larger dimension for more flexibility
            availableLength = Math.max(boxWidth, boxHeight);
            isHorizontal = boxWidth >= boxHeight;
            break;
    }
    
    // Calculate required spacing for each conduit (including locknut clearance)
    const conduitSpacings = wallPulls.map(pull => {
        const locknutOD = locknutODSpacing[pull.conduitSize] || pull.conduitSize + 0.5;
        return {
            pull: pull,
            requiredSpace: locknutOD * PIXELS_PER_INCH,
            isEntry: wall === pull.entrySide,
            isExit: wall === pull.exitSide
        };
    });
    
    // Sort by required space (largest first for better packing)
    conduitSpacings.sort((a, b) => b.requiredSpace - a.requiredSpace);
    
    // Calculate total required space
    const totalRequired = conduitSpacings.reduce((sum, c) => sum + c.requiredSpace, 0);
    const availableSpace = availableLength - totalRequired;
    
    if (availableSpace < 0) {
        console.warn(`Not enough space on ${wall} wall for optimal arrangement`);
        return;
    }
    
    // Distribute conduits evenly with maximum spacing
    const spacing = availableSpace / (conduitSpacings.length + 1);
    let currentPosition = spacing + conduitSpacings[0].requiredSpace / 2;
    
    conduitSpacings.forEach((conduitInfo, index) => {
        const pull = conduitInfo.pull;
        
        // Convert position to 3D coordinates
        const position = currentPosition - availableLength / 2; // Center around origin
        
        // Update pull positions based on wall orientation
        if (conduitInfo.isEntry) {
            // Create custom entry point if it doesn't exist
            if (!pull.customEntryPoint3D) {
                pull.customEntryPoint3D = get3DPosition(pull.entrySide, boxWidth, boxHeight, boxDepth);
            }
            updateConduitPosition(pull, 'entry', wall, position, isHorizontal);
        }
        if (conduitInfo.isExit) {
            // Create custom exit point if it doesn't exist
            if (!pull.customExitPoint3D) {
                pull.customExitPoint3D = get3DPosition(pull.exitSide, boxWidth, boxHeight, boxDepth);
            }
            updateConduitPosition(pull, 'exit', wall, position, isHorizontal);
        }
        
        // Move to next position
        currentPosition += conduitInfo.requiredSpace;
        if (index < conduitSpacings.length - 1) {
            currentPosition += spacing;
        }
    });
}

// Helper function to update conduit position on a wall
function updateConduitPosition(pull, pointType, wall, position, isHorizontal) {
    const boxWidth = currentBoxDimensions.width * PIXELS_PER_INCH;
    const boxHeight = currentBoxDimensions.height * PIXELS_PER_INCH;
    const boxDepth = currentBoxDimensions.depth * PIXELS_PER_INCH;
    
    const point = pointType === 'entry' ? pull.customEntryPoint3D : pull.customExitPoint3D;
    if (!point) return;
    
    switch (wall) {
        case 'left':
            point.x = -boxWidth / 2;
            point.y = position;
            break;
        case 'right':
            point.x = boxWidth / 2;
            point.y = position;
            break;
        case 'top':
            point.x = position;
            point.y = boxHeight / 2;
            break;
        case 'bottom':
            point.x = position;
            point.y = -boxHeight / 2;
            break;
        case 'rear':
            if (isHorizontal) {
                point.x = position;
                point.y = 0;
            } else {
                point.x = 0;
                point.y = position;
            }
            point.z = -boxDepth / 2;
            break;
    }
}

// Toggle debug window visibility
document.getElementById('toggleDebug').addEventListener('change', function() {
    const debugDiv = document.getElementById('debug').parentElement;
    if (this.checked) {
        debugDiv.style.display = 'block';
    } else {
        debugDiv.style.display = 'none';
    }
});

// Helper function to get client coordinates from mouse or touch events
function getClientCoordinates(event) {
    if (event.type.startsWith('touch')) {
        // For touch events, use the first touch
        if (event.touches && event.touches.length > 0) {
            return {
                clientX: event.touches[0].clientX,
                clientY: event.touches[0].clientY
            };
        } else if (event.changedTouches && event.changedTouches.length > 0) {
            // For touchend events, touches array is empty, use changedTouches
            return {
                clientX: event.changedTouches[0].clientX,
                clientY: event.changedTouches[0].clientY
            };
        }
    }
    // For mouse events, return clientX and clientY directly
    return {
        clientX: event.clientX,
        clientY: event.clientY
    };
}

// 3D Mouse interaction functions
function on3DMouseDown(event) {
    if (isDraggingViewCube) return; // Don't interact with scene when using ViewCube
    
    // In orthogonal view, allow panning but disable conduit dragging
    if (viewMode === 'orthogonal') {
        // Check if clicking on the box for panning
        const coords = getClientCoordinates(event);
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((coords.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((coords.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        const boxIntersects = raycaster.intersectObjects([pullBox3D], true);
        
        if (boxIntersects.length > 0) {
            // Clicking on box - enable panning
            controls.enabled = true;
            renderer.domElement.style.cursor = 'grabbing';
        } else {
            // Clicking outside box - disable panning
            controls.enabled = false;
        }
        return;
    }
    
    event.preventDefault();
    
    const coords = getClientCoordinates(event);
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((coords.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((coords.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Distance labels removed - we now modify wire paths instead
    
    // Intersect with all children of the groups recursively
    const intersects = raycaster.intersectObjects(pullEndpoints3D, true);
    
    if (intersects.length > 0) {
        // Find the parent group that has userData
        let targetObject = intersects[0].object;
        while (targetObject && !targetObject.userData.isDraggable) {
            targetObject = targetObject.parent;
        }
        if (targetObject && targetObject.userData.isDraggable) {
            draggedPoint3D = targetObject;
            controls.enabled = false; // Disable controls when dragging cylinders
            renderer.domElement.style.cursor = 'grabbing'; // Show closed hand while dragging
        }
    } else {
        // No cylinder hit - enable controls for touch rotation
        if (event.type === 'touchstart') {
            controls.enabled = true;
        }
    }
}

function on3DMouseMove(event) {
    // In orthogonal view, allow panning but disable conduit dragging
    if (viewMode === 'orthogonal') {
        // Check if hovering over the box for cursor feedback
        const coords = getClientCoordinates(event);
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((coords.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((coords.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        const boxIntersects = raycaster.intersectObjects([pullBox3D], true);
        
        if (boxIntersects.length > 0) {
            // Hovering over box - show move cursor and enable controls (including zoom)
            renderer.domElement.style.cursor = 'move';
            controls.enabled = true;
        } else {
            // Hovering over empty space - show default cursor and disable controls
            renderer.domElement.style.cursor = 'default';
            controls.enabled = false;
        }
        return;
    }
    
    // Prevent scrolling on touch devices when dragging
    if (event.type === 'touchmove' && draggedPoint3D) {
        event.preventDefault();
    }
    
    const coords = getClientCoordinates(event);
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((coords.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((coords.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Check for hover when not dragging
    if (!draggedPoint3D) {
        // First check for conduit intersections
        const conduitIntersects = raycaster.intersectObjects(pullEndpoints3D, true);
        
        if (conduitIntersects.length > 0) {
            // Find the parent group that has userData
            let targetObject = conduitIntersects[0].object;
            while (targetObject && !targetObject.userData.isDraggable) {
                targetObject = targetObject.parent;
            }
            if (targetObject && targetObject.userData.isDraggable) {
                renderer.domElement.style.cursor = 'grab';
                hoveredPoint = targetObject;
                // Disable controls when hovering over conduit to prevent panning
                controls.enabled = false;
                return; // Exit early, don't check box intersection
            }
        }
        
        // If no conduit hit, check for box intersection
        const boxIntersects = raycaster.intersectObjects([pullBox3D], true);
        if (boxIntersects.length > 0) {
            // Hovering over the box itself - enable panning
            renderer.domElement.style.cursor = 'move';
            hoveredPoint = null;
            controls.enabled = true;
        } else {
            // Hovering over empty space - disable panning
            renderer.domElement.style.cursor = 'default';
            hoveredPoint = null;
            controls.enabled = false;
        }
    }
    
    if (!draggedPoint3D) return;
    
    // Get the side of the wall this point should be constrained to
    const pull = draggedPoint3D.userData.pull;
    const pointType = draggedPoint3D.userData.type;
    const side = pointType === 'entry' ? pull.entrySide : pull.exitSide;
    const visualSphere = draggedPoint3D.userData.visualSphere;
    
    // Create a plane for the wall
    let planeNormal, planeConstant;
    const boxWidth = currentBoxDimensions.width * PIXELS_PER_INCH;
    const boxHeight = currentBoxDimensions.height * PIXELS_PER_INCH;
    const boxDepth = currentBoxDimensions.depth * PIXELS_PER_INCH;
    
    switch (side) {
        case 'left':
            planeNormal = new THREE.Vector3(1, 0, 0);
            planeConstant = boxWidth / 2;
            break;
        case 'right':
            planeNormal = new THREE.Vector3(-1, 0, 0);
            planeConstant = boxWidth / 2;
            break;
        case 'top':
            planeNormal = new THREE.Vector3(0, -1, 0);
            planeConstant = boxHeight / 2;
            break;
        case 'bottom':
            planeNormal = new THREE.Vector3(0, 1, 0);
            planeConstant = boxHeight / 2;
            break;
        case 'rear':
            planeNormal = new THREE.Vector3(0, 0, 1);
            planeConstant = boxDepth / 2;
            break;
    }
    
    const plane = new THREE.Plane(planeNormal, planeConstant);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersection);
    
    // Constrain the intersection point to the wall bounds accounting for locknut OD
    const conduitSize = pull.conduitSize;
    // Use locknut OD to ensure locknuts don't extend beyond box boundaries
    const locknutOD = locknutODSpacing[conduitSize] || conduitSize + 0.5;
    const outerRadius = (locknutOD / 2) * PIXELS_PER_INCH;
    
    switch (side) {
        case 'left':
        case 'right':
            intersection.y = Math.max(-boxHeight/2 + outerRadius, Math.min(boxHeight/2 - outerRadius, intersection.y));
            intersection.z = Math.max(-boxDepth/2 + outerRadius, Math.min(boxDepth/2 - outerRadius, intersection.z));
            break;
        case 'top':
        case 'bottom':
            intersection.x = Math.max(-boxWidth/2 + outerRadius, Math.min(boxWidth/2 - outerRadius, intersection.x));
            intersection.z = Math.max(-boxDepth/2 + outerRadius, Math.min(boxDepth/2 - outerRadius, intersection.z));
            break;
        case 'rear':
            intersection.x = Math.max(-boxWidth/2 + outerRadius, Math.min(boxWidth/2 - outerRadius, intersection.x));
            intersection.y = Math.max(-boxHeight/2 + outerRadius, Math.min(boxHeight/2 - outerRadius, intersection.y));
            break;
    }
    
    // Check if position is valid (respects both wall boundaries and overlap prevention)
    let validPosition = true;
    if (preventOverlap) {
        validPosition = !wouldCauseOverlap(intersection, pull, pointType, side);
    }
    
    // Only update position if it's valid
    if (validPosition) {
        // Update the cylinder group position
        draggedPoint3D.position.copy(intersection);
        
        // Update the pull's custom point
        if (pointType === 'entry') {
            pull.customEntryPoint3D = { x: intersection.x, y: intersection.y, z: intersection.z };
        } else {
            pull.customExitPoint3D = { x: intersection.x, y: intersection.y, z: intersection.z };
        }
    }
    // If position is invalid, conduit simply doesn't move (stays at current position)
    
    // Update just the wire path for this pull
    updateWirePath(pull);
}

function on3DMouseUp(event) {
    // In orthogonal view, allow panning but disable conduit dragging
    if (viewMode === 'orthogonal') {
        // Reset cursor after panning and check current hover state
        const coords = getClientCoordinates(event);
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((coords.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((coords.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        const boxIntersects = raycaster.intersectObjects([pullBox3D], true);
        
        if (boxIntersects.length > 0) {
            // Still hovering over box - show move cursor
            renderer.domElement.style.cursor = 'move';
        } else {
            // Not hovering over box - show default cursor
            renderer.domElement.style.cursor = 'default';
        }
        return;
    }
    
    if (draggedPoint3D) {
        // Clear the dragged point reference first
        const wasDragging = true;
        draggedPoint3D = null;
        
        // Now update the 3D pulls to recreate wire paths with new positions
        if (wasDragging) {
            update3DPulls();
            updateConduitColors(); // Update colors based on overlaps
            updatePullsTable(); // Update the table to show new min distances
        }
        
        savePullsToStorage(); // Save when done dragging
    }
    draggedPoint3D = null;
    hoveredPoint = null;
    renderer.domElement.style.cursor = 'default';
    // Re-enable controls for panning after conduit dragging
    if (event.type === 'mouseup') {
        controls.enabled = false; // Will be set correctly by mousemove handler
    }
    // For touch, controls state is already set correctly in touchstart
}

// Helper function to detect mobile
function isMobile() {
    return window.innerWidth <= 640 || 'ontouchstart' in window;
}

// ViewCube functions
function initViewCube() {
    console.log('Initializing ViewCube...');
    
    // Create ViewCube scene
    viewCubeScene = new THREE.Scene();
    viewCubeScene.background = null; // Transparent background
    
    // Create ViewCube camera (orthographic for consistent size)
    const aspect = 1;
    const d = 1.2; // Smaller view range = larger cube in view
    viewCubeCamera = new THREE.OrthographicCamera(-d, d, d, -d, 0.1, 100);
    viewCubeCamera.position.set(2, 2, 2);
    viewCubeCamera.lookAt(0, 0, 0);
    
    // Create ViewCube geometry
    const cubeGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const materials = [
        createViewCubeFaceMaterial('RIGHT'),  // +X
        createViewCubeFaceMaterial('LEFT'),   // -X
        createViewCubeFaceMaterial('TOP'),    // +Y
        createViewCubeFaceMaterial('BOTTOM'), // -Y
        createViewCubeFaceMaterial('FRONT'),  // +Z
        createViewCubeFaceMaterial('REAR')    // -Z
    ];
    
    viewCubeMesh = new THREE.Mesh(cubeGeometry, materials);
    viewCubeScene.add(viewCubeMesh);
    
    // Add bright lighting to ViewCube for better visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    viewCubeScene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    viewCubeScene.add(directionalLight);
    
    // Create ViewCube renderer
    const mobile = isMobile();
    const cubeSize = mobile ? 60 : viewCubeSize;
    viewCubeRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    viewCubeRenderer.setSize(cubeSize, cubeSize);
    viewCubeRenderer.domElement.style.cursor = 'pointer';
    viewCubeRenderer.domElement.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    viewCubeRenderer.domElement.style.borderRadius = '4px';
    viewCubeRenderer.domElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    viewCubeRenderer.domElement.id = 'viewCubeCanvas';
    viewCubeRenderer.domElement.title = 'Drag to rotate view';
    
    if (mobile) {
        // On mobile, add to mobile controls container
        const mobileControls = document.getElementById('mobile-controls');
        mobileControls.appendChild(viewCubeRenderer.domElement);
    } else {
        // On desktop, position absolutely
        viewCubeRenderer.domElement.style.position = 'absolute';
        viewCubeRenderer.domElement.style.top = '10px';
        viewCubeRenderer.domElement.style.right = '10px';
        viewCubeRenderer.domElement.style.zIndex = '1000';
        document.getElementById('canvas-holder').appendChild(viewCubeRenderer.domElement);
    }
    
    // Add ViewCube event listeners (mouse and touch)
    viewCubeRenderer.domElement.addEventListener('mousedown', onViewCubeMouseDown, false);
    viewCubeRenderer.domElement.addEventListener('mousemove', onViewCubeMouseMove, false);
    viewCubeRenderer.domElement.addEventListener('mouseup', onViewCubeMouseUp, false);
    // Touch events for mobile
    viewCubeRenderer.domElement.addEventListener('touchstart', onViewCubeMouseDown, false);
    viewCubeRenderer.domElement.addEventListener('touchmove', onViewCubeMouseMove, false);
    viewCubeRenderer.domElement.addEventListener('touchend', onViewCubeMouseUp, false);
    // Window listeners for both mouse and touch
    window.addEventListener('mousemove', onViewCubeMouseMove, false);
    window.addEventListener('mouseup', onViewCubeMouseUp, false);
    window.addEventListener('touchmove', onViewCubeMouseMove, false);
    window.addEventListener('touchend', onViewCubeMouseUp, false);
    
    // Create zoom buttons
    createZoomButtons();
    
    // Initial render
    renderViewCube();
    console.log('ViewCube initialized');
}

function createViewCubeFaceMaterial(label) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Fill background
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 256, 256);
    
    // Draw border
    context.strokeStyle = '#666';
    context.lineWidth = 8;
    context.strokeRect(4, 4, 248, 248);
    
    // Draw text shadow for better visibility
    context.shadowColor = 'rgba(0, 0, 0, 0.3)';
    context.shadowBlur = 4;
    context.shadowOffsetX = 1;
    context.shadowOffsetY = 1;
    
    // Draw text
    context.fillStyle = '#000';
    context.font = 'bold 36px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, 128, 128);
    
    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshPhongMaterial({ 
        map: texture
    });
}

function renderViewCube() {
    // Sync ViewCube rotation with main camera
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    
    // Calculate ViewCube camera position based on main camera direction
    const distance = 3;
    viewCubeCamera.position.x = -cameraDirection.x * distance;
    viewCubeCamera.position.y = -cameraDirection.y * distance;
    viewCubeCamera.position.z = -cameraDirection.z * distance;
    viewCubeCamera.lookAt(0, 0, 0);
    
    viewCubeRenderer.render(viewCubeScene, viewCubeCamera);
}

function onViewCubeMouseDown(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const coords = getClientCoordinates(event);
    const rect = viewCubeRenderer.domElement.getBoundingClientRect();
    viewCubeMouse.x = ((coords.clientX - rect.left) / rect.width) * 2 - 1;
    viewCubeMouse.y = -((coords.clientY - rect.top) / rect.height) * 2 + 1;
    
    viewCubeRaycaster.setFromCamera(viewCubeMouse, viewCubeCamera);
    const intersects = viewCubeRaycaster.intersectObject(viewCubeMesh);
    
    if (intersects.length > 0) {
        isDraggingViewCube = true;
        viewCubeDragStart.x = coords.clientX;
        viewCubeDragStart.y = coords.clientY;
        viewCubePreviousMouse.x = coords.clientX;
        viewCubePreviousMouse.y = coords.clientY;
        
        // Don't snap immediately - wait to see if user drags
    }
}

function onViewCubeMouseMove(event) {
    if (!isDraggingViewCube) return;
    
    event.preventDefault();
    
    const coords = getClientCoordinates(event);
    
    // Calculate mouse movement delta
    const deltaX = coords.clientX - viewCubePreviousMouse.x;
    const deltaY = coords.clientY - viewCubePreviousMouse.y;
    
    // Update previous mouse position
    viewCubePreviousMouse.x = coords.clientX;
    viewCubePreviousMouse.y = coords.clientY;
    
    // Rotate the main camera around the target
    const rotationSpeed = 0.005;
    
    // Horizontal rotation (around Y axis) - reversed
    const theta = -deltaX * rotationSpeed;
    
    // Vertical rotation (around X axis relative to camera) - reversed
    const phi = -deltaY * rotationSpeed;
    
    // Get camera position relative to target
    const offset = camera.position.clone().sub(controls.target);
    
    // Convert to spherical coordinates
    const radius = offset.length();
    let theta2 = Math.atan2(offset.x, offset.z);
    let phi2 = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)));
    
    // Apply rotation
    theta2 += theta;
    phi2 += phi;
    
    // Clamp phi to prevent flipping
    phi2 = Math.max(0.1, Math.min(Math.PI - 0.1, phi2));
    
    // Convert back to Cartesian coordinates
    offset.x = radius * Math.sin(phi2) * Math.sin(theta2);
    offset.y = radius * Math.cos(phi2);
    offset.z = radius * Math.sin(phi2) * Math.cos(theta2);
    
    // Update camera position
    camera.position.copy(controls.target).add(offset);
    camera.lookAt(controls.target);
    controls.update();
}

function onViewCubeMouseUp(event) {
    if (isDraggingViewCube) {
        const coords = getClientCoordinates(event);
        
        // Check if this was a click (no significant movement)
        const distance = Math.sqrt(
            Math.pow(coords.clientX - viewCubeDragStart.x, 2) + 
            Math.pow(coords.clientY - viewCubeDragStart.y, 2)
        );
        
        if (distance < 5) { // Click threshold
            // This was a click, snap to view
            const rect = viewCubeRenderer.domElement.getBoundingClientRect();
            viewCubeMouse.x = ((coords.clientX - rect.left) / rect.width) * 2 - 1;
            viewCubeMouse.y = -((coords.clientY - rect.top) / rect.height) * 2 + 1;
            
            viewCubeRaycaster.setFromCamera(viewCubeMouse, viewCubeCamera);
            const intersects = viewCubeRaycaster.intersectObject(viewCubeMesh);
            
            if (intersects.length > 0) {
                const faceIndex = Math.floor(intersects[0].faceIndex / 2);
                snapToView(faceIndex);
            }
        }
        
        isDraggingViewCube = false;
    }
}

function snapToView(faceIndex) {
    const boxSize = Math.max(
        currentBoxDimensions.width * PIXELS_PER_INCH,
        currentBoxDimensions.height * PIXELS_PER_INCH,
        currentBoxDimensions.depth * PIXELS_PER_INCH
    );
    const distance = boxSize * 1.5;
    
    let targetPosition;
    switch(faceIndex) {
        case 0: // RIGHT
            targetPosition = new THREE.Vector3(distance, 0, 0);
            break;
        case 1: // LEFT
            targetPosition = new THREE.Vector3(-distance, 0, 0);
            break;
        case 2: // TOP
            targetPosition = new THREE.Vector3(0, distance, 0);
            break;
        case 3: // BOTTOM
            targetPosition = new THREE.Vector3(0, -distance, 0);
            break;
        case 4: // FRONT
            targetPosition = new THREE.Vector3(0, 0, distance);
            break;
        case 5: // REAR
            targetPosition = new THREE.Vector3(0, 0, -distance);
            break;
    }
    
    // Animate camera to target position
    camera.position.copy(targetPosition);
    camera.lookAt(0, 0, 0);
    
    // Update camera far plane to prevent clipping
    camera.far = Math.max(1000, distance + boxSize * 2);
    camera.updateProjectionMatrix();
    
    controls.target.set(0, 0, 0);
    controls.update();
}

// Create control buttons
function createZoomButtons() {
    const mobile = isMobile();
    
    const buttonStyle = mobile ? {
        // Mobile styles - no absolute positioning
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        border: '1px solid #ccc',
        cursor: 'pointer',
        fontSize: '16px',
        color: '#333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    } : {
        // Desktop styles with absolute positioning
        position: 'absolute',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        border: '1px solid #ccc',
        cursor: 'pointer',
        fontSize: '16px',
        color: '#333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '1000',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    };
    
    const centerX = 10 + viewCubeSize/2 - 20; // Centered under ViewCube
    let currentTop = 10 + viewCubeSize + 10; // Start below ViewCube
    
    // Reset View button (home icon)
    const resetButton = document.createElement('button');
    resetButton.innerHTML = '<i class="fas fa-home"></i>';
    resetButton.title = 'Reset View';
    Object.assign(resetButton.style, buttonStyle);
    if (!mobile) {
        resetButton.style.top = currentTop + 'px';
        resetButton.style.right = centerX + 'px';
        currentTop += 45;
    }
    resetButton.addEventListener('click', resetView);
    resetButton.addEventListener('mouseenter', () => {
        resetButton.style.backgroundColor = 'rgba(240, 240, 240, 1)';
    });
    resetButton.addEventListener('mouseleave', () => {
        resetButton.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    });
    
    // Zoom in button
    const zoomInButton = document.createElement('button');
    zoomInButton.innerHTML = '+';
    zoomInButton.title = 'Zoom In';
    Object.assign(zoomInButton.style, buttonStyle);
    zoomInButton.style.fontSize = '20px';
    zoomInButton.style.fontWeight = 'bold';
    if (!mobile) {
        zoomInButton.style.top = currentTop + 'px';
        zoomInButton.style.right = centerX + 'px';
        currentTop += 45;
    }
    zoomInButton.addEventListener('click', () => zoomCamera(0.8));
    zoomInButton.addEventListener('mouseenter', () => {
        zoomInButton.style.backgroundColor = 'rgba(240, 240, 240, 1)';
    });
    zoomInButton.addEventListener('mouseleave', () => {
        zoomInButton.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    });
    
    // Zoom out button
    const zoomOutButton = document.createElement('button');
    zoomOutButton.innerHTML = '−';
    zoomOutButton.title = 'Zoom Out';
    Object.assign(zoomOutButton.style, buttonStyle);
    zoomOutButton.style.fontSize = '20px';
    zoomOutButton.style.fontWeight = 'bold';
    if (!mobile) {
        zoomOutButton.style.top = currentTop + 'px';
        zoomOutButton.style.right = centerX + 'px';
        currentTop += 45;
    }
    zoomOutButton.addEventListener('click', () => zoomCamera(1.25));
    zoomOutButton.addEventListener('mouseenter', () => {
        zoomOutButton.style.backgroundColor = 'rgba(240, 240, 240, 1)';
    });
    zoomOutButton.addEventListener('mouseleave', () => {
        zoomOutButton.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    });
    
    // Wireframe button
    const wireframeButton = document.createElement('button');
    wireframeButton.innerHTML = '<i class="fas fa-border-all"></i>';
    wireframeButton.title = 'Toggle Wireframe';
    Object.assign(wireframeButton.style, buttonStyle);
    wireframeButton.id = 'toggleWireframe';
    if (!mobile) {
        wireframeButton.style.top = currentTop + 'px';
        wireframeButton.style.right = centerX + 'px';
        currentTop += 45;
    }
    wireframeButton.addEventListener('click', toggleWireframeMode);
    wireframeButton.addEventListener('mouseenter', () => {
        wireframeButton.style.backgroundColor = 'rgba(240, 240, 240, 1)';
    });
    wireframeButton.addEventListener('mouseleave', () => {
        wireframeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    });
    
    // Labels toggle button
    const labelsButton = document.createElement('button');
    labelsButton.innerHTML = '<i class="fas fa-font"></i>';
    labelsButton.title = 'Toggle Labels';
    Object.assign(labelsButton.style, buttonStyle);
    labelsButton.id = 'toggleLabels';
    if (!mobile) {
        labelsButton.style.top = currentTop + 'px';
        labelsButton.style.right = centerX + 'px';
        currentTop += 45;
    }
    labelsButton.addEventListener('click', toggleLabels);
    labelsButton.addEventListener('mouseenter', () => {
        labelsButton.style.backgroundColor = 'rgba(240, 240, 240, 1)';
    });
    labelsButton.addEventListener('mouseleave', () => {
        labelsButton.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    });
    
    // Distance lines toggle button
    const distanceLinesButton = document.createElement('button');
    distanceLinesButton.innerHTML = '<i class="fas fa-ruler"></i>';
    distanceLinesButton.title = 'Toggle Distance Lines';
    Object.assign(distanceLinesButton.style, buttonStyle);
    distanceLinesButton.id = 'toggleDistanceLines';
    if (!mobile) {
        distanceLinesButton.style.top = currentTop + 'px';
        distanceLinesButton.style.right = centerX + 'px';
        currentTop += 45;
    }
    distanceLinesButton.addEventListener('click', toggleDistanceLines);
    distanceLinesButton.addEventListener('mouseenter', () => {
        distanceLinesButton.style.backgroundColor = 'rgba(240, 240, 240, 1)';
    });
    distanceLinesButton.addEventListener('mouseleave', () => {
        distanceLinesButton.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    });
    
    // Create prevent overlap toggle button
    const preventOverlapButton = document.createElement('button');
    preventOverlapButton.id = 'preventOverlap';
    preventOverlapButton.innerHTML = '<i class="fas fa-magnet"></i>';
    preventOverlapButton.title = 'Prevent Conduit Overlap';
    Object.assign(preventOverlapButton.style, buttonStyle);
    if (!mobile) {
        preventOverlapButton.style.top = currentTop + 'px';
        preventOverlapButton.style.right = centerX + 'px';
        currentTop += 45;
    }
    preventOverlapButton.addEventListener('click', togglePreventOverlap);
    preventOverlapButton.addEventListener('mouseenter', () => {
        preventOverlapButton.style.backgroundColor = 'rgba(240, 240, 240, 1)';
    });
    preventOverlapButton.addEventListener('mouseleave', () => {
        preventOverlapButton.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    });
    
    // Pull arrows toggle button
    const pullArrowsButton = document.createElement('button');
    pullArrowsButton.id = 'togglePullArrows';
    pullArrowsButton.innerHTML = '<i class="fas fa-arrow-right"></i>';
    pullArrowsButton.title = 'Toggle Pull ID Arrows';
    Object.assign(pullArrowsButton.style, buttonStyle);
    if (!mobile) {
        pullArrowsButton.style.top = currentTop + 'px';
        pullArrowsButton.style.right = centerX + 'px';
        currentTop += 45;
    }
    pullArrowsButton.addEventListener('click', togglePullArrows);
    pullArrowsButton.addEventListener('mouseenter', () => {
        pullArrowsButton.style.backgroundColor = 'rgba(240, 240, 240, 1)';
    });
    pullArrowsButton.addEventListener('mouseleave', () => {
        pullArrowsButton.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    });
    
    // Add buttons to appropriate container
    const container = mobile ? document.getElementById('mobile-controls') : document.getElementById('canvas-holder');
    container.appendChild(resetButton);
    container.appendChild(zoomInButton);
    container.appendChild(zoomOutButton);
    container.appendChild(wireframeButton);
    container.appendChild(labelsButton);
    container.appendChild(distanceLinesButton);
    container.appendChild(preventOverlapButton);
    container.appendChild(pullArrowsButton);
}

// Zoom camera function with animation
function zoomCamera(factor) {
    // Handle orthographic cameras differently
    if (camera.isOrthographicCamera) {
        // For orthographic cameras, use the zoom property
        const currentZoom = camera.zoom;
        const targetZoom = currentZoom * (1 / factor); // Invert factor for intuitive zoom direction
        
        // Set limits to prevent zooming too close or too far
        const minZoom = 0.1;
        const maxZoom = 5;
        
        if (targetZoom >= minZoom && targetZoom <= maxZoom) {
            // Animate zoom
            const duration = 300; // milliseconds
            const startTime = Date.now();
            
            function animateZoom() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Use easing function for smooth animation
                const easeProgress = easeInOutCubic(progress);
                
                // Interpolate zoom value
                camera.zoom = currentZoom + (targetZoom - currentZoom) * easeProgress;
                camera.updateProjectionMatrix();
                controls.update();
                
                if (progress < 1) {
                    requestAnimationFrame(animateZoom);
                }
            }
            
            animateZoom();
        }
    } else {
        // For perspective cameras, use the original position-based zoom
        const startPosition = camera.position.clone();
        const direction = camera.position.clone().sub(controls.target).normalize();
        const currentDistance = camera.position.distanceTo(controls.target);
        const targetDistance = currentDistance * factor;
        
        // Set limits to prevent zooming too close or too far
        const minDistance = 50;
        const maxDistance = 2000;
        
        if (targetDistance >= minDistance && targetDistance <= maxDistance) {
            const endPosition = controls.target.clone().add(direction.multiplyScalar(targetDistance));
            
            // Animate zoom
            const duration = 300; // milliseconds
            const startTime = Date.now();
            
            function animateZoom() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Use easing function for smooth animation
                const easeProgress = easeInOutCubic(progress);
                
                // Interpolate camera position
                camera.position.lerpVectors(startPosition, endPosition, easeProgress);
                controls.update();
                
                if (progress < 1) {
                    requestAnimationFrame(animateZoom);
                } else {
                    // Update camera far plane at end of zoom
                    const boxSize = Math.max(
                        currentBoxDimensions.width * PIXELS_PER_INCH,
                        currentBoxDimensions.height * PIXELS_PER_INCH,
                        currentBoxDimensions.depth * PIXELS_PER_INCH
                    );
                    camera.far = Math.max(1000, targetDistance + boxSize * 2);
                    camera.updateProjectionMatrix();
                }
            }
            
            animateZoom();
        }
    }
}

// Easing function for smooth animation
function easeInOutCubic(t) {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Handle window resize
let resizeTimeout;
function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (renderer && camera) {
            const canvasHolder = document.getElementById('canvas-holder');
            const width = canvasHolder.clientWidth;
            const height = canvasHolder.clientHeight || width * 0.75;
            
            // Update renderer size
            renderer.setSize(width, height);
            
            // Update camera aspect ratio
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            
            // Update ViewCube renderer if it exists
            if (viewCubeRenderer) {
                const mobile = isMobile();
                const cubeSize = mobile ? 60 : viewCubeSize;
                viewCubeRenderer.setSize(cubeSize, cubeSize);
            }
        }
    }, 250); // Debounce resize events by 250ms
}

// Store the previous view mode when switching to simple interface
let previousViewModeForSimple = null;

// Toggle between Advanced and Simple interface
function toggleInterface() {
    const toggle = document.getElementById('interfaceToggle');
    const advancedInterface = document.getElementById('advanced-interface');
    const simpleInterface = document.getElementById('simple-interface');
    const advancedCanvasHolder = document.getElementById('canvas-holder');
    const simpleCanvasHolder = document.getElementById('simple-canvas-holder');
    
    if (toggle.checked) {
        // Switch to Simple interface
        advancedInterface.classList.add('hidden');
        simpleInterface.classList.remove('hidden');
        
        // Apply simple mode feature styling
        applySimpleModeFeatures();
        
        // Update pulls table to populate simple interface
        updatePullsTable();
        
        // Sync box dimension inputs
        syncBoxDimensionInputs('advanced');
        
        // Sync calculation method toggle
        syncCalcMethodToggles('calcMethodToggle');
        
        // Store current view mode
        previousViewModeForSimple = viewMode;
        
        // Move canvas to simple interface first
        if (renderer && renderer.domElement) {
            simpleCanvasHolder.appendChild(renderer.domElement);
            // Also move ViewCube if it exists
            const viewCubeCanvas = document.getElementById('viewCubeCanvas');
            if (viewCubeCanvas) {
                simpleCanvasHolder.appendChild(viewCubeCanvas);
            }
        }
        
        // Force to orthogonal view mode (will be applied in resize timeout)
        if (viewMode !== 'orthogonal') {
            viewMode = 'orthogonal';
            isWireframeMode = false;
        }
        
        console.log('Switched to Simple interface (2D orthogonal view)');
    } else {
        // Switch to Advanced interface
        advancedInterface.classList.remove('hidden');
        simpleInterface.classList.add('hidden');
        
        // Restore previous view mode if different
        if (previousViewModeForSimple && previousViewModeForSimple !== 'orthogonal') {
            viewMode = previousViewModeForSimple;
            if (previousViewModeForSimple === 'solid') {
                isWireframeMode = false;
                switchTo3DView();
            } else if (previousViewModeForSimple === 'wireframe') {
                isWireframeMode = true;
                switchTo3DView();
            }
            applyViewMode();
        }
        
        // Move canvas back to advanced interface
        if (renderer && renderer.domElement) {
            advancedCanvasHolder.appendChild(renderer.domElement);
            // Also move ViewCube if it exists
            const viewCubeCanvas = document.getElementById('viewCubeCanvas');
            if (viewCubeCanvas) {
                advancedCanvasHolder.appendChild(viewCubeCanvas);
            }
        }
        
        console.log('Switched to Advanced interface');
    }
    
    // Ensure proper canvas sizing and rendering after interface switch
    if (renderer && camera) {
        setTimeout(() => {
            // Force resize calculation
            const activeCanvasHolder = toggle.checked ? simpleCanvasHolder : advancedCanvasHolder;
            const width = activeCanvasHolder.clientWidth;
            const height = activeCanvasHolder.clientHeight || width * 0.75;
            
            // Update renderer size
            renderer.setSize(width, height);
            
            // Update camera aspect ratio
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            
            // Update ViewCube renderer if it exists
            if (viewCubeRenderer) {
                const mobile = isMobile();
                const cubeSize = mobile ? 60 : 120;
                viewCubeRenderer.setSize(cubeSize, cubeSize);
            }
            
            // Apply complete orthogonal view for simple interface (now that canvas is properly sized)
            if (toggle.checked && viewMode === 'orthogonal' && previousViewModeForSimple !== 'orthogonal') {
                // Temporarily patch document.getElementById to work with simple canvas holder
                const originalGetElementById = document.getElementById;
                document.getElementById = function(id) {
                    if (id === 'canvas-holder') {
                        return activeCanvasHolder;
                    }
                    return originalGetElementById.call(document, id);
                };
                
                try {
                    // Use the complete existing orthogonal view setup
                    switchToOrthogonalView();
                    
                    // Recreate materials and update view (this handles wireframe->solid transition)
                    createPullBox3D();
                    update3DPulls();
                    updateConduitColors();
                    
                } finally {
                    // Always restore the original function
                    document.getElementById = originalGetElementById;
                }
                
                console.log('Applied complete orthogonal view for simple interface');
            }
            
            // Force a render
            if (scene && camera) {
                renderer.render(scene, camera);
            }
            
            console.log(`Resized canvas to ${width}x${height} for ${toggle.checked ? 'simple' : 'advanced'} interface`);
        }, 150);
    }
}
