        let pulls = [];
        let pullCounter = 1;
        
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
            depth: 4
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
        let is3DMode = true; // Always start in 3D mode
        let isWireframeMode = false;
        let showLabels = false; // Labels off by default
        let labels3D = []; // Store label sprites
        let showDistanceLines = false; // Distance lines off by default
        let raycaster, mouse;
        let draggedPoint3D = null;
        let pullEndpoints3D = [];
        let hoveredPoint = null;
        
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
                lastBoxDepth: pull.lastBoxDepth
            }));
            
            localStorage.setItem('pullBoxPulls', JSON.stringify(cleanPulls));
            localStorage.setItem('pullCounter', pullCounter.toString());
            localStorage.setItem('boxDimensions', JSON.stringify(currentBoxDimensions));
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
        }
        
        // Clear all pulls
        function clearAllPulls() {
            if (pulls.length > 0 && confirm('Are you sure you want to clear all pulls?')) {
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
                localStorage.setItem('pullBoxDimensions', JSON.stringify(currentBoxDimensions));
                
                // Clear the NEC warning
                const necWarning = document.getElementById('necWarning');
                if (necWarning) {
                    necWarning.style.display = 'none';
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
        
        // Toggle between solid and wireframe modes
        function toggleWireframeMode() {
            isWireframeMode = !isWireframeMode;
            const button = document.getElementById('toggleWireframe');
            
            if (isWireframeMode) {
                button.innerHTML = '<i class="fas fa-cube"></i>';
            } else {
                button.innerHTML = '<i class="fas fa-border-all"></i>';
            }
            
            // Recreate the box with the new mode
            createPullBox3D();
            // Recreate all pulls to restore cylinders
            update3DPulls();
            updateConduitColors();
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
        function updateBoxDimensions() {
            const width = parseFloat(document.getElementById('boxWidth').value);
            const height = parseFloat(document.getElementById('boxHeight').value);
            const depth = parseFloat(document.getElementById('boxDepth').value);
            
            if (width > 0 && height > 0 && depth > 0) {
                // First check if box is physically large enough for all conduits
                const fitCheck = canBoxFitAllConduits(width, height, depth, pulls);
                if (!fitCheck.canFit) {
                    alert(`Cannot resize box: Pull #${fitCheck.pullId} with ${fitCheck.conduitSize}" conduit (${fitCheck.od}" OD) cannot fit on the ${fitCheck.side} wall of a ${width}" × ${height}" × ${depth}" box.`);
                    
                    // Reset input values
                    document.getElementById('boxWidth').value = currentBoxDimensions.width;
                    document.getElementById('boxHeight').value = currentBoxDimensions.height;
                    document.getElementById('boxDepth').value = currentBoxDimensions.depth;
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
                
                // Adjust camera position based on new box size (keep current view angle)
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
                
                // Check if new dimensions meet minimum requirements
                checkBoxSizeCompliance();
            }
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
        function toggleConductorSize() {
            const entrySide = document.getElementById('entrySide').value;
            const exitSide = document.getElementById('exitSide').value;
            const conductorSizeSelect = document.getElementById('conductorSize');
            const conductorSizePlaceholder = document.getElementById('conductorSizePlaceholder');
            
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
            scene.fog = new THREE.Fog(0xf0f0f0, 500, 1500);
            
            // Get canvas container dimensions
            const canvasHolder = document.getElementById('canvas-holder');
            const canvasWidth = canvasHolder.clientWidth;
            const canvasHeight = canvasHolder.clientHeight || canvasWidth * 0.75; // Default to 4:3 aspect ratio
            camera = new THREE.PerspectiveCamera(75, canvasWidth / canvasHeight, 0.1, 1000);
            
            // Position camera for front view (matching resetView function)
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
            
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(canvasWidth, canvasHeight);
            renderer.shadowMap.enabled = true;
            
            // Add lights for better metal appearance
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);
            
            // Main directional light
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
            directionalLight.position.set(200, 300, 200);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            directionalLight.shadow.camera.near = 0.5;
            directionalLight.shadow.camera.far = 1000;
            directionalLight.shadow.camera.left = -500;
            directionalLight.shadow.camera.right = 500;
            directionalLight.shadow.camera.top = 500;
            directionalLight.shadow.camera.bottom = -500;
            scene.add(directionalLight);
            
            // Add a second light from the opposite side for better definition
            const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
            directionalLight2.position.set(-200, 200, -100);
            scene.add(directionalLight2);
            
            // Add a point light for highlights
            const pointLight = new THREE.PointLight(0xffffff, 0.2);
            pointLight.position.set(0, 400, 0);
            scene.add(pointLight);
            
            // Add orbit controls - enabled for better mobile navigation
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enabled = true; // Enable for mobile navigation
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.target.set(0, 0, 0);
            controls.enablePan = true; // Enable panning
            controls.enableZoom = true; // Enable zooming
            controls.enableRotate = true; // Enable rotation
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
            
            // Create wire path based on distance mode
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
            
            // Create wire path based on distance mode
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
                ], false, 'catmullrom', 0.5); // Standard tension
            }
            
            const points = curve.getPoints(50);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 5 });
            const curveObject = new THREE.Line(geometry, material);
            
            // Create a tube geometry for better visibility (like a wire/conduit)
            const tubeGeometry = new THREE.TubeGeometry(curve, 50, 3, 8, false);
            const tubeMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x0066ff, 
                emissive: 0x0044ff,
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
        function addPull() {
            const entrySide = document.getElementById('entrySide').value;
            const exitSide = document.getElementById('exitSide').value;
            const conduitSize = parseFloat(document.getElementById('conduitSize').value);
            const conductorSizeSelect = document.getElementById('conductorSize');
            const conductorSize = (entrySide === 'rear' || exitSide === 'rear') ? conductorSizeSelect.value : '16';
            const warningDiv = document.getElementById('pullWarning');
            const warningText = document.getElementById('pullWarningText');

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
            
            // Check if conduit fits on entry side
            if (!checkConduitFit(entrySide, conduitSize)) {
                const od = locknutODSpacing[conduitSize] || conduitSize + 0.5;
                warningText.textContent = `Cannot add pull: ${conduitSize}" conduit (${od}" OD) is too large to fit on the ${entrySide} wall of a ${currentBoxDimensions.width}" × ${currentBoxDimensions.height}" × ${currentBoxDimensions.depth}" box.`;
                warningDiv.style.display = 'block';
                setTimeout(() => { warningDiv.style.display = 'none'; }, 5000);
                return;
            }
            
            // Check if conduit fits on exit side
            if (!checkConduitFit(exitSide, conduitSize)) {
                const od = locknutODSpacing[conduitSize] || conduitSize + 0.5;
                warningText.textContent = `Cannot add pull: ${conduitSize}" conduit (${od}" OD) is too large to fit on the ${exitSide} wall of a ${currentBoxDimensions.width}" × ${currentBoxDimensions.height}" × ${currentBoxDimensions.depth}" box.`;
                warningDiv.style.display = 'block';
                setTimeout(() => { warningDiv.style.display = 'none'; }, 5000);
                return;
            }

            let pull = {
                id: pullCounter,
                entrySide,
                exitSide,
                conduitSize,
                conductorSize,
                customEntryPoint3D: null,
                customExitPoint3D: null
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
            const pullsList = document.querySelector('.pulls-list');
            const hasRear = pulls.some(pull => pull.entrySide === 'rear' || pull.exitSide === 'rear');
            tbody.innerHTML = '';
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
                    <div><span class="font-medium">Pull #:</span> <span>${pull.id}</span></div>
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
                    <td class="border p-2">${pull.id}</td>
                    <td class="border p-2">${pull.entrySide}</td>
                    <td class="border p-2">${pull.exitSide}</td>
                    <td class="border p-2">${fractionToString(pull.conduitSize)}"</td>
                    <td class="border p-2">${pull.entrySide === 'rear' || pull.exitSide === 'rear' ? pull.conductorSize : '-'}</td>
                    <td class="border p-2"${isDistanceTooSmall ? ' style="background-color: red; color: white;"' : ''}>${actualDistance.toFixed(2)}"</td>
                    <td class="border p-2">${(pull.conduitSize * 6).toFixed(2)}"</td>
                    <td class="border p-2"><button onclick="removePull(${pull.id})" class="text-red-600 hover:text-red-800"><i class="fas fa-times mr-1"></i>Remove</button></td>
                `;
                tbody.appendChild(row);
            });
        }

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
                        additionalConduits.push(p.conduitSize);
                    }
                    // For U-pulls, count the other side if it's not the max pull
                    if (p.entrySide === p.exitSide && p.entrySide === side && p !== maxPull) {
                        additionalConduits.push(p.conduitSize);
                    }
                });

                // If max pull is a U-pull, add it once more
                if (maxPull.entrySide === maxPull.exitSide && maxPull.entrySide === side) {
                    additionalConduits.push(maxPull.conduitSize);
                }

                const calc = 6 * maxSize + additionalConduits.reduce((sum, size) => sum + size, 0);
                debugLog += `Relevant pulls for ${side}: ${sidePulls.map(p => `Pull ${p.id} (${fractionToString(p.conduitSize)}")`).join(', ')}\n`;
                debugLog += `Largest pull: Pull ${maxPull.id} (${fractionToString(maxSize)}"), U-pull: ${maxPull.entrySide === maxPull.exitSide}\n`;
                debugLog += `Calculation: (6 x ${maxSize}) + ${additionalConduits.map(size => fractionToString(size)).join(' + ')} = ${calc} in\n`;
                return calc;
            }

            // Step 3: Left Side Angle/U-Pulls
            const leftPullsFilter = (p, side) => 
                (p.entrySide === side && p.exitSide !== 'right') || 
                (p.exitSide === side && p.entrySide !== 'right') || 
                (p.entrySide === side && p.exitSide === side);
            const minLeftCalc = calculateSide('left', leftPullsFilter);
            debugLog += `Step 3: Minimum left side angle/u-pull calc = ${minLeftCalc} in\n`;

            // Step 4: Right Side Angle/U-Pulls
            const rightPullsFilter = (p, side) => 
                (p.entrySide === side && p.exitSide !== 'left') || 
                (p.exitSide === side && p.entrySide !== 'left') || 
                (p.entrySide === side && p.exitSide === side);
            const minRightCalc = calculateSide('right', rightPullsFilter);
            debugLog += `Step 4: Minimum right side angle/u-pull calc = ${minRightCalc} in\n`;

            // Step 5: Top Side Angle/U-Pulls
            const topPullsFilter = (p, side) => 
                (p.entrySide === side && p.exitSide !== 'bottom') || 
                (p.exitSide === side && p.entrySide !== 'bottom') || 
                (p.entrySide === side && p.exitSide === side);
            const minTopCalc = calculateSide('top', topPullsFilter);
            debugLog += `Step 5: Minimum top side angle/u-pull calc = ${minTopCalc} in\n`;

            // Step 6: Bottom Side Angle/U-Pulls
            const bottomPullsFilter = (p, side) => 
                (p.entrySide === side && p.exitSide !== 'top') || 
                (p.exitSide === side && p.entrySide !== 'top') || 
                (p.entrySide === side && p.exitSide === side);
            const minBottomCalc = calculateSide('bottom', bottomPullsFilter);
            debugLog += `Step 6: Minimum bottom side angle/u-pull calc = ${minBottomCalc} in\n`;

            // Step 7: Minimum Box Depth
            // Consider rear side conductor depths
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
            const rearDepth = Math.max(...rearPulls.map(p => conductorDepths[p.conductorSize] || 0), 0);
            
            // Consider locknut OD spacing for conduits on top, bottom, left, and right sides
            const nonRearPulls = pulls.filter(p => 
                (p.entrySide !== 'rear' && p.entrySide !== 'front') || 
                (p.exitSide !== 'rear' && p.exitSide !== 'front')
            );
            const locknutDepth = Math.max(...nonRearPulls.map(p => {
                const od = locknutODSpacing[p.conduitSize] || p.conduitSize + 0.5;
                return od;
            }), 0);
            
            const maxDepth = Math.max(rearDepth, locknutDepth);
            debugLog += `Step 7: Minimum pull can depth\n`;
            debugLog += `  Rear conductor depth: ${rearDepth} in\n`;
            debugLog += `  Locknut OD requirement: ${locknutDepth} in\n`;
            debugLog += `  Selected: ${maxDepth} in\n`;

            // Step 8: Minimum Pull Can Width
            const widthCalcs = [minHStraightCalc, minLeftCalc, minRightCalc];
            const minWidth = Math.max(...widthCalcs);
            debugLog += `Step 8: Minimum pull can width\n`;
            debugLog += `  Horizontal: ${minHStraightCalc} in\n`;
            debugLog += `  Left: ${minLeftCalc} in\n`;
            debugLog += `  Right: ${minRightCalc} in\n`;
            debugLog += `  Selected: ${minWidth} in\n`;

            // Step 9: Minimum Pull Can Height
            const heightCalcs = [minVStraightCalc, minTopCalc, minBottomCalc];
            const minHeight = Math.max(...heightCalcs);
            debugLog += `Step 9: Minimum pull can height\n`;
            debugLog += `  Vertical: ${minVStraightCalc} in\n`;
            debugLog += `  Top: ${minTopCalc} in\n`;
            debugLog += `  Bottom: ${minBottomCalc} in\n`;
            debugLog += `  Selected: ${minHeight} in\n`;

            // Step 10: Final Result
            const width = minWidth > 0 ? `${fractionToString(minWidth)}"` : "No Code Minimum";
            const height = minHeight > 0 ? `${fractionToString(minHeight)}"` : "No Code Minimum";
            const depth = maxDepth > 0 ? `${fractionToString(maxDepth)}"` : "No Code Minimum";
            const result = `Width: ${width}\n\nHeight: ${height}\n\nDepth: ${depth}`;
            debugLog += `Step 10: Final pull box size = ${result.replace(/\n/g, ' ')}\n`;

            // Store minimum dimensions for comparison
            minimumBoxDimensions.width = minWidth;
            minimumBoxDimensions.height = minHeight;
            minimumBoxDimensions.depth = maxDepth;

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
                    `<button onclick="setToMinimumDimensions()" class="mt-2 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"><i class="fas fa-expand-arrows-alt mr-2"></i>Set to Minimum Dimensions</button>`;
                necWarning.style.display = 'block';
            } else {
                necWarning.style.display = 'none';
            }
        }
        
        // Function to automatically set box dimensions to minimum requirements
        function setToMinimumDimensions() {
            // Update input fields
            if (minimumBoxDimensions.width > 0) {
                document.getElementById('boxWidth').value = minimumBoxDimensions.width;
            }
            if (minimumBoxDimensions.height > 0) {
                document.getElementById('boxHeight').value = minimumBoxDimensions.height;
            }
            if (minimumBoxDimensions.depth > 0) {
                document.getElementById('boxDepth').value = minimumBoxDimensions.depth;
            }
            
            // Apply the changes
            updateBoxDimensions();
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
                    controls.enabled = false; // Disable orbit controls while dragging
                }
            }
        }
        
        function on3DMouseMove(event) {
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
                const intersects = raycaster.intersectObjects(pullEndpoints3D, true);
                if (intersects.length > 0) {
                    // Find the parent group that has userData
                    let targetObject = intersects[0].object;
                    while (targetObject && !targetObject.userData.isDraggable) {
                        targetObject = targetObject.parent;
                    }
                    if (targetObject && targetObject.userData.isDraggable) {
                        renderer.domElement.style.cursor = 'pointer';
                        hoveredPoint = targetObject;
                    } else {
                        renderer.domElement.style.cursor = 'default';
                        hoveredPoint = null;
                    }
                } else {
                    renderer.domElement.style.cursor = 'default';
                    hoveredPoint = null;
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
            
            // Constrain the intersection point to the wall bounds accounting for conduit OD
            const conduitSize = pull.conduitSize;
            const outsideDiameter = locknutODSpacing[conduitSize] || conduitSize + 0.5;
            const outerRadius = (outsideDiameter / 2) * PIXELS_PER_INCH;
            
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
            
            // Update the cylinder group position
            draggedPoint3D.position.copy(intersection);
            
            // Update the pull's custom point
            if (pointType === 'entry') {
                pull.customEntryPoint3D = { x: intersection.x, y: intersection.y, z: intersection.z };
            } else {
                pull.customExitPoint3D = { x: intersection.x, y: intersection.y, z: intersection.z };
            }
            
            // Update just the wire path for this pull
            updateWirePath(pull);
        }
        
        function on3DMouseUp(event) {
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
            controls.enabled = true; // Re-enable orbit controls after dragging
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
            viewCubeRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            viewCubeRenderer.setSize(viewCubeSize, viewCubeSize);
            viewCubeRenderer.domElement.style.position = 'absolute';
            viewCubeRenderer.domElement.style.top = '10px';
            viewCubeRenderer.domElement.style.right = '10px';
            viewCubeRenderer.domElement.style.cursor = 'pointer';
            viewCubeRenderer.domElement.style.zIndex = '1000';
            viewCubeRenderer.domElement.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            viewCubeRenderer.domElement.style.borderRadius = '4px';
            viewCubeRenderer.domElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            
            // Add ViewCube canvas to the main canvas holder
            document.getElementById('canvas-holder').appendChild(viewCubeRenderer.domElement);
            
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
            const buttonStyle = {
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
            Object.assign(resetButton.style, buttonStyle);
            resetButton.style.top = currentTop + 'px';
            resetButton.style.right = centerX + 'px';
            resetButton.addEventListener('click', resetView);
            resetButton.addEventListener('mouseenter', () => {
                resetButton.style.backgroundColor = 'rgba(240, 240, 240, 1)';
            });
            resetButton.addEventListener('mouseleave', () => {
                resetButton.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            });
            currentTop += 45;
            
            // Zoom in button
            const zoomInButton = document.createElement('button');
            zoomInButton.innerHTML = '+';
            Object.assign(zoomInButton.style, buttonStyle);
            zoomInButton.style.top = currentTop + 'px';
            zoomInButton.style.right = centerX + 'px';
            zoomInButton.style.fontSize = '20px';
            zoomInButton.style.fontWeight = 'bold';
            zoomInButton.addEventListener('click', () => zoomCamera(0.8));
            zoomInButton.addEventListener('mouseenter', () => {
                zoomInButton.style.backgroundColor = 'rgba(240, 240, 240, 1)';
            });
            zoomInButton.addEventListener('mouseleave', () => {
                zoomInButton.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            });
            currentTop += 45;
            
            // Zoom out button
            const zoomOutButton = document.createElement('button');
            zoomOutButton.innerHTML = '−';
            Object.assign(zoomOutButton.style, buttonStyle);
            zoomOutButton.style.top = currentTop + 'px';
            zoomOutButton.style.right = centerX + 'px';
            zoomOutButton.style.fontSize = '20px';
            zoomOutButton.style.fontWeight = 'bold';
            zoomOutButton.addEventListener('click', () => zoomCamera(1.25));
            zoomOutButton.addEventListener('mouseenter', () => {
                zoomOutButton.style.backgroundColor = 'rgba(240, 240, 240, 1)';
            });
            zoomOutButton.addEventListener('mouseleave', () => {
                zoomOutButton.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            });
            currentTop += 45;
            
            // Wireframe button
            const wireframeButton = document.createElement('button');
            wireframeButton.innerHTML = '<i class="fas fa-border-all"></i>';
            Object.assign(wireframeButton.style, buttonStyle);
            wireframeButton.style.top = currentTop + 'px';
            wireframeButton.style.right = centerX + 'px';
            wireframeButton.id = 'toggleWireframe';
            wireframeButton.addEventListener('click', toggleWireframeMode);
            wireframeButton.addEventListener('mouseenter', () => {
                wireframeButton.style.backgroundColor = 'rgba(240, 240, 240, 1)';
            });
            wireframeButton.addEventListener('mouseleave', () => {
                wireframeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            });
            currentTop += 45;
            
            // Labels toggle button
            const labelsButton = document.createElement('button');
            labelsButton.innerHTML = '<i class="fas fa-font"></i>';
            Object.assign(labelsButton.style, buttonStyle);
            labelsButton.style.top = currentTop + 'px';
            labelsButton.style.right = centerX + 'px';
            labelsButton.id = 'toggleLabels';
            labelsButton.addEventListener('click', toggleLabels);
            labelsButton.addEventListener('mouseenter', () => {
                labelsButton.style.backgroundColor = 'rgba(240, 240, 240, 1)';
            });
            labelsButton.addEventListener('mouseleave', () => {
                labelsButton.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            });
            
            currentTop += 45;
            
            // Distance lines toggle button
            const distanceLinesButton = document.createElement('button');
            distanceLinesButton.innerHTML = '<i class="fas fa-ruler"></i>';
            Object.assign(distanceLinesButton.style, buttonStyle);
            distanceLinesButton.style.top = currentTop + 'px';
            distanceLinesButton.style.right = centerX + 'px';
            distanceLinesButton.id = 'toggleDistanceLines';
            distanceLinesButton.addEventListener('click', toggleDistanceLines);
            distanceLinesButton.addEventListener('mouseenter', () => {
                distanceLinesButton.style.backgroundColor = 'rgba(240, 240, 240, 1)';
            });
            distanceLinesButton.addEventListener('mouseleave', () => {
                distanceLinesButton.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            });
            
            // Add buttons to canvas holder
            document.getElementById('canvas-holder').appendChild(resetButton);
            document.getElementById('canvas-holder').appendChild(zoomInButton);
            document.getElementById('canvas-holder').appendChild(zoomOutButton);
            document.getElementById('canvas-holder').appendChild(wireframeButton);
            document.getElementById('canvas-holder').appendChild(labelsButton);
            document.getElementById('canvas-holder').appendChild(distanceLinesButton);
        }
        
        // Zoom camera function with animation
        function zoomCamera(factor) {
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
                        viewCubeRenderer.setSize(viewCubeSize, viewCubeSize);
                    }
                }
            }, 250); // Debounce resize events by 250ms
        }
