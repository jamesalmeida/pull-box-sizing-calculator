/**
 * Complex Pull Manager - Priority-Based Auto-Arrangement System
 * 
 * Implements decision tree logic for managing complex pull scenarios where
 * multiple pull types (priorities) coexist and need coordinated arrangement
 * to prevent lockring overlaps on shared walls.
 * 
 * Priority System (based on dev/pull_box_decision_tree.md):
 * - Priority 1: Side-to-side U-pulls (left-left, right-right, top-top, bottom-bottom)
 * - Priority 2: Side-to-side angle pulls (left-top, left-bottom, right-top, right-bottom)
 * - Priority 3: Straight pulls (left-right, top-bottom)
 * - Priority 4: Side-to-rear pulls (left-rear, right-rear, top-rear, bottom-rear)
 * - Priority 5: Rear-to-rear U-pulls (rear-rear)
 */

// ============================================================================
// CORE DATA STRUCTURES
// ============================================================================

/**
 * Represents a zone on a wall that can be occupied by conduits
 */
class WallZone {
    constructor(wall, startPosition, endPosition, occupiedBy = null) {
        this.wall = wall; // 'left', 'right', 'top', 'bottom', 'rear'
        this.startPosition = startPosition; // coordinate along wall
        this.endPosition = endPosition;
        this.occupiedBy = occupiedBy; // priority number or null
        this.conduits = []; // conduits in this zone
    }
    
    isAvailable() {
        return this.occupiedBy === null;
    }
    
    getAvailableSpace() {
        return this.endPosition - this.startPosition;
    }
    
    getCenter() {
        return (this.startPosition + this.endPosition) / 2;
    }
}

/**
 * Result of pull priority classification
 */
class PriorityClassification {
    constructor(pullsByPriority, isComplex, activePriorities) {
        this.pullsByPriority = pullsByPriority; // {1: [], 2: [], 3: [], 4: [], 5: []}
        this.isComplex = isComplex; // boolean - multiple priorities present
        this.activePriorities = activePriorities; // array of active priority numbers
    }
}

// ============================================================================
// PRIORITY CLASSIFICATION SYSTEM
// ============================================================================

/**
 * Classifies a pull by priority level based on entry/exit sides
 * @param {string} entrySide - Entry wall side
 * @param {string} exitSide - Exit wall side
 * @returns {number} Priority level (1-5) or 0 if unrecognized
 */
function classifyPullByPriority(entrySide, exitSide) {
    // Priority 1: Side-to-side U-pulls
    if ((entrySide === 'left' && exitSide === 'left') ||
        (entrySide === 'right' && exitSide === 'right') ||
        (entrySide === 'top' && exitSide === 'top') ||
        (entrySide === 'bottom' && exitSide === 'bottom')) {
        return 1;
    }
    
    // Priority 2: Side-to-side angle pulls  
    if ((entrySide === 'left' && (exitSide === 'top' || exitSide === 'bottom')) ||
        (entrySide === 'right' && (exitSide === 'top' || exitSide === 'bottom')) ||
        (entrySide === 'top' && (exitSide === 'left' || exitSide === 'right')) ||
        (entrySide === 'bottom' && (exitSide === 'left' || exitSide === 'right'))) {
        return 2;
    }
    
    // Priority 3: Straight pulls
    if ((entrySide === 'left' && exitSide === 'right') ||
        (entrySide === 'right' && exitSide === 'left') ||
        (entrySide === 'top' && exitSide === 'bottom') ||
        (entrySide === 'bottom' && exitSide === 'top')) {
        return 3;
    }
    
    // Priority 4: Side-to-rear pulls
    if ((entrySide !== 'rear' && exitSide === 'rear') ||
        (entrySide === 'rear' && exitSide !== 'rear')) {
        return 4;
    }
    
    // Priority 5: Rear-to-rear U-pulls
    if (entrySide === 'rear' && exitSide === 'rear') {
        return 5;
    }
    
    console.warn(`Unrecognized pull combination: ${entrySide} -> ${exitSide}`);
    return 0; // Fallback for unrecognized combinations
}

/**
 * Classifies all pulls by priority and determines if complex arrangement is needed
 * @param {Array} pulls - Array of pull objects
 * @returns {PriorityClassification} Classification result
 */
function classifyAllPulls(pulls) {
    const pullsByPriority = {1: [], 2: [], 3: [], 4: [], 5: []};
    
    // Classify each pull by priority
    pulls.forEach(pull => {
        const priority = classifyPullByPriority(pull.entrySide, pull.exitSide);
        if (priority > 0) {
            pullsByPriority[priority].push(pull);
        }
    });
    
    // Determine active priorities
    const activePriorities = Object.keys(pullsByPriority)
        .filter(p => pullsByPriority[p].length > 0)
        .map(p => parseInt(p));
    
    // Complex arrangement needed if multiple priorities are present
    const isComplex = activePriorities.length > 1;
    
    console.log('Pull classification result:', {
        activePriorities,
        isComplex,
        counts: activePriorities.map(p => `P${p}: ${pullsByPriority[p].length}`).join(', ')
    });
    
    return new PriorityClassification(pullsByPriority, isComplex, activePriorities);
}

// ============================================================================
// COMPLEX PULL MANAGER
// ============================================================================

/**
 * Main class for managing complex pull arrangements using priority-based logic
 */
class ComplexPullManager {
    constructor(boxWidth, boxHeight, boxDepth, isParallelMode) {
        this.boxWidth = boxWidth;
        this.boxHeight = boxHeight;
        this.boxDepth = boxDepth;
        this.isParallelMode = isParallelMode;
        
        // Initialize wall zones for tracking occupied space
        this.initializeWallZones();
        
        // Track placed conduits: pullId -> {wall, position, priority}
        this.placedConduits = new Map();
        
        // Cache for P1 conflict zones to avoid recalculation
        this.p1ConflictZonesCache = null;
        
        // Store pulls by priority for later reference
        this.allPullsByPriority = null;
        
        console.log('ComplexPullManager initialized:', {
            dimensions: `${boxWidth/PIXELS_PER_INCH}"W x ${boxHeight/PIXELS_PER_INCH}"H x ${boxDepth/PIXELS_PER_INCH}"D`,
            mode: isParallelMode ? 'Parallel' : 'Non-parallel'
        });
    }
    
    initializeWallZones() {
        this.wallZones = {
            left: [new WallZone('left', -(this.boxHeight/2), (this.boxHeight/2))],
            right: [new WallZone('right', -(this.boxHeight/2), (this.boxHeight/2))],
            top: [new WallZone('top', -(this.boxWidth/2), (this.boxWidth/2))],
            bottom: [new WallZone('bottom', -(this.boxWidth/2), (this.boxWidth/2))],
            rear: [new WallZone('rear', -(this.boxWidth/2), (this.boxWidth/2))]
        };
    }
    
    /**
     * Main entry point for complex pull arrangement
     * @param {Object} pullsByPriority - Pulls grouped by priority level
     * @returns {Map} Placement results for 3D scene application
     */
    arrangeComplexPulls(pullsByPriority) {
        console.log('=== Starting Complex Pull Arrangement ===');
        
        // Store for use in helper functions
        this.allPullsByPriority = pullsByPriority;
        
        // Process each priority level sequentially (Step 1-5 of decision tree)
        for (let priority = 1; priority <= 5; priority++) {
            if (pullsByPriority[priority] && pullsByPriority[priority].length > 0) {
                console.log(`\n--- Processing Priority ${priority} (${pullsByPriority[priority].length} pulls) ---`);
                this.processPriorityLevel(priority, pullsByPriority[priority], pullsByPriority);
            }
        }
        
        console.log('=== Complex Pull Arrangement Complete ===');
        return this.placedConduits;
    }
    
    /**
     * Process a single priority level according to decision tree logic
     */
    processPriorityLevel(currentPriority, pulls, allPullsByPriority) {
        const higherPriorities = this.getHigherPriorities(currentPriority, allPullsByPriority);
        
        if (higherPriorities.length === 0) {
            console.log(`Priority ${currentPriority}: No higher priorities - arranging normally`);
            this.arrangeNormally(pulls, currentPriority, allPullsByPriority);
        } else {
            console.log(`Priority ${currentPriority}: Higher priorities exist [${higherPriorities.join(', ')}] - using complex arrangement`);
            this.arrangeWithPriorityConsideration(pulls, currentPriority, higherPriorities, allPullsByPriority);
        }
    }
    
    getHigherPriorities(currentPriority, allPullsByPriority) {
        const higherPriorities = [];
        for (let p = 1; p < currentPriority; p++) {
            if (allPullsByPriority[p] && allPullsByPriority[p].length > 0) {
                higherPriorities.push(p);
            }
        }
        return higherPriorities;
    }
    
    /**
     * Arrange pulls normally when no higher priorities exist
     */
    arrangeNormally(pulls, priority, allPullsByPriority) {
        console.log(`Arranging ${pulls.length} Priority ${priority} pulls normally`);
        
        if (priority === 1) {
            // Priority 1: Use existing single-priority arrangement logic
            this.arrangePriority1(pulls);
        } else if (priority === 2) {
            // Priority 2: Use decision tree logic
            this.arrangePriority2(pulls, allPullsByPriority);
        } else if (priority === 3) {
            // Priority 3: Use decision tree logic
            this.arrangePriority3(pulls, allPullsByPriority);
        } else if (priority === 4) {
            // Priority 4: Use decision tree logic
            this.arrangePriority4(pulls, allPullsByPriority);
        } else if (priority === 5) {
            // Priority 5: Use decision tree logic
            this.arrangePriority5(pulls, allPullsByPriority);
        } else {
            // Fallback: placeholder for unrecognized priorities
            this.arrangePlaceholder(pulls, priority);
        }
    }
    
    /**
     * Arrange Priority 2 (angle pulls) according to decision tree logic
     */
    arrangePriority2(pulls, allPullsByPriority) {
        console.log(`Processing Priority 2: ${pulls.length} pulls`);
        
        // Check if Priority 1 conduits exist
        const priority1Exists = allPullsByPriority[1] && allPullsByPriority[1].length > 0;
        
        if (!priority1Exists) {
            // IF the job contains NO Priority 1 conduits
            // THEN arrange Priority 2 conduits the normal way using optimizeAnglePullsWithClustering()
            console.log('Priority 2: No Priority 1 conduits - arranging normally');
            this.arrangePriority2Normally(pulls);
        } else {
            // ELSE (Priority 1 conduits are present)
            console.log('Priority 2: Priority 1 conduits exist - checking wall sharing for each pull');
            this.arrangePriority2WithP1Present(pulls, allPullsByPriority[1]);
        }
    }

    /**
     * Arrange all Priority 2 pulls normally (when no Priority 1 exists)
     */
    arrangePriority2Normally(pulls) {
        console.log(`Arranging ${pulls.length} Priority 2 pulls normally using optimizeAnglePullsWithClustering`);
        
        // Call the existing angle pull optimization function directly
        optimizeAnglePullsWithClustering(
            pulls,
            this.boxWidth,
            this.boxHeight,
            this.boxDepth,
            this.isParallelMode
        );
        
        // Store the results from the optimization
        pulls.forEach(pull => {
            this.placedConduits.set(pull.id, {
                wall: pull.entrySide,
                entryPosition3D: pull.customEntryPoint3D || get3DPosition(pull.entrySide, this.boxWidth, this.boxHeight, this.boxDepth),
                exitPosition3D: pull.customExitPoint3D || get3DPosition(pull.exitSide, this.boxWidth, this.boxHeight, this.boxDepth),
                priority: 2,
                entrySide: pull.entrySide,
                exitSide: pull.exitSide,
                conduitSize: pull.conduitSize
            });
            
            const entry = this.placedConduits.get(pull.id).entryPosition3D;
            const exit = this.placedConduits.get(pull.id).exitPosition3D;
            console.log(`P2 Pull ${pull.id}: Entry(${entry.x.toFixed(1)}, ${entry.y.toFixed(1)}, ${entry.z.toFixed(1)}) Exit(${exit.x.toFixed(1)}, ${exit.y.toFixed(1)}, ${exit.z.toFixed(1)})`);
        });
    }

    /**
     * Arrange Priority 2 when Priority 1 exists - group by shared wall status
     */
    arrangePriority2WithP1Present(p2Pulls, p1Pulls) {
        console.log(`Checking wall sharing for ${p2Pulls.length} Priority 2 pulls`);
        
        // Group pulls by shared wall status
        const noSharedWallPulls = [];
        const sharedWallPulls = [];
        
        p2Pulls.forEach(pull => {
            const hasSharedWall = this.doesPullShareWallWithP1(pull, p1Pulls);
            
            if (!hasSharedWall) {
                console.log(`P2 Pull ${pull.id}: No shared walls with P1 - adding to group arrangement`);
                noSharedWallPulls.push(pull);
            } else {
                console.log(`P2 Pull ${pull.id}: Shared wall with P1 - using constraint logic`);
                sharedWallPulls.push(pull);
            }
        });
        
        // Group arrange non-shared wall pulls (CLUSTERING)
        if (noSharedWallPulls.length > 0) {
            console.log(`Group arranging ${noSharedWallPulls.length} P2 pulls with no shared walls`);
            this.arrangePriority2Normally(noSharedWallPulls);
        }
        
        // Apply constraint logic for shared wall pulls
        if (sharedWallPulls.length > 0) {
            console.log(`Applying constraint logic for ${sharedWallPulls.length} P2 pulls with shared walls`);
            this.arrangePriority2WithConstraints(sharedWallPulls, p1Pulls);
        }
    }

    /**
     * Arrange a single Priority 2 pull normally (when no wall sharing)
     */
    arrangeSingleP2PullNormally(pull) {
        // Create single-pull array and use existing optimization
        const singlePullArray = [pull];
        
        optimizeAnglePullsWithClustering(
            singlePullArray,
            this.boxWidth,
            this.boxHeight,
            this.boxDepth,
            this.isParallelMode
        );
        
        // Store the result
        this.placedConduits.set(pull.id, {
            wall: pull.entrySide,
            entryPosition3D: pull.customEntryPoint3D || get3DPosition(pull.entrySide, this.boxWidth, this.boxHeight, this.boxDepth),
            exitPosition3D: pull.customExitPoint3D || get3DPosition(pull.exitSide, this.boxWidth, this.boxHeight, this.boxDepth),
            priority: 2,
            entrySide: pull.entrySide,
            exitSide: pull.exitSide,
            conduitSize: pull.conduitSize
        });
        
        // Log the result (needed for P3+ debugging and wall zone tracking)
        const entry = this.placedConduits.get(pull.id).entryPosition3D;
        const exit = this.placedConduits.get(pull.id).exitPosition3D;
        console.log(`P2 Pull ${pull.id}: Entry(${entry.x.toFixed(1)}, ${entry.y.toFixed(1)}, ${entry.z.toFixed(1)}) Exit(${exit.x.toFixed(1)}, ${exit.y.toFixed(1)}, ${exit.z.toFixed(1)})`);
    }

    /**
     * Arrange Priority 2 pulls with constraints when sharing walls with Priority 1
     * Implements decision tree lines 62-67: place P2 as close to ideal as possible
     * while pushing away from P1 and ensuring no lockring overlaps
     */
    arrangePriority2WithConstraints(sharedWallPulls, p1Pulls) {
        console.log(`Arranging ${sharedWallPulls.length} P2 pulls with P1 constraints`);
        
        // Step 1: Calculate P1 conflict zones on each wall
        const p1ConflictZones = this.calculateP1ConflictZones(p1Pulls);
        
        // Step 2: Group P2 pulls by type for coordinated arrangement
        const angleGroups = {};
        sharedWallPulls.forEach(pull => {
            const key = `${pull.entrySide}-${pull.exitSide}`;
            if (!angleGroups[key]) {
                angleGroups[key] = [];
            }
            angleGroups[key].push(pull);
        });
        
        // Step 3: Process each group with constraints
        Object.entries(angleGroups).forEach(([angleType, groupPulls]) => {
            console.log(`Processing ${groupPulls.length} ${angleType} P2 pulls with constraints`);
            this.arrangeAnglePullGroupWithConstraints(groupPulls, angleType, p1ConflictZones);
        });
    }
    
    /**
     * Calculate zones occupied by P1 conduits on each wall
     * Tracks individual conduit positions, not continuous spans
     * Now with caching to avoid recalculation
     */
    calculateP1ConflictZones(p1Pulls) {
        // Return cached zones if already calculated
        if (this.p1ConflictZonesCache !== null) {
            return this.p1ConflictZonesCache;
        }
        
        const zones = {
            left: { conduits: [] },
            right: { conduits: [] },
            top: { conduits: [] },
            bottom: { conduits: [] }
        };
        
        // Find all P1 conduits and mark their individual zones
        p1Pulls.forEach(pull => {
            // For U-pulls, both entry and exit are on the same wall
            if (pull.entrySide === pull.exitSide) {
                const wall = pull.entrySide;
                
                // Get the conduit positions from stored placements
                const placement = this.placedConduits.get(pull.id);
                if (!placement) {
                    console.warn(`P1 Pull ${pull.id} not found in placedConduits`);
                    return;
                }
                
                const entryPos = placement.entryPosition3D;
                const exitPos = placement.exitPosition3D;
                const radius = (locknutODSpacing[pull.conduitSize] || pull.conduitSize + 0.5) * PIXELS_PER_INCH / 2;
                
                // Add each conduit as a separate zone (not a span!)
                if (wall === 'left' || wall === 'right') {
                    // Entry conduit zone
                    zones[wall].conduits.push({
                        center: entryPos.y,
                        min: entryPos.y - radius,
                        max: entryPos.y + radius,
                        type: 'entry'
                    });
                    // Exit conduit zone
                    zones[wall].conduits.push({
                        center: exitPos.y,
                        min: exitPos.y - radius,
                        max: exitPos.y + radius,
                        type: 'exit'
                    });
                } else if (wall === 'top' || wall === 'bottom') {
                    // Entry conduit zone
                    zones[wall].conduits.push({
                        center: entryPos.x,
                        min: entryPos.x - radius,
                        max: entryPos.x + radius,
                        type: 'entry'
                    });
                    // Exit conduit zone
                    zones[wall].conduits.push({
                        center: exitPos.x,
                        min: exitPos.x - radius,
                        max: exitPos.x + radius,
                        type: 'exit'
                    });
                }
            }
        });
        
        // Sort conduits by position for easier processing
        Object.keys(zones).forEach(wall => {
            zones[wall].conduits.sort((a, b) => a.center - b.center);
        });
        
        // Log the conflict zones for debugging
        console.log('P1 Conflict Zones (individual conduits):');
        Object.entries(zones).forEach(([wall, data]) => {
            if (data.conduits.length > 0) {
                const axis = (wall === 'left' || wall === 'right') ? 'Y' : 'X';
                console.log(`  ${wall}: ${data.conduits.length} conduits`);
                data.conduits.forEach((conduit, i) => {
                    console.log(`    Conduit ${i+1}: ${axis}=${(conduit.center/PIXELS_PER_INCH).toFixed(1)}" (±${((conduit.max-conduit.min)/2/PIXELS_PER_INCH).toFixed(1)}")`);
                });
            }
        });
        
        // Cache the zones for future use
        this.p1ConflictZonesCache = zones;
        
        return zones;
    }
    
    /**
     * Arrange a group of P2 angle pulls with P1 constraints
     */
    arrangeAnglePullGroupWithConstraints(groupPulls, angleType, p1ConflictZones) {
        const [entryWall, exitWall] = angleType.split('-');
        
        // Get the normal cluster strategy
        const strategy = getClusterStrategy(entryWall, exitWall, this.boxWidth, this.boxHeight, this.boxDepth);
        
        // Adjust the strategy based on P1 conflict zones
        const adjustedStrategy = this.adjustStrategyForP1Conflicts(
            strategy, 
            p1ConflictZones,
            entryWall,
            exitWall,
            groupPulls
        );
        
        // Sort by size (largest first) - same as original clustering
        groupPulls.sort((a, b) => parseFloat(b.conduitSize) - parseFloat(a.conduitSize));
        
        // Apply clustering with adjusted positions
        groupPulls.forEach((pull, index) => {
            const positions = this.getConstrainedClusteredPositions(
                pull, 
                index, 
                adjustedStrategy, 
                groupPulls
            );
            
            // Store the positions
            pull.customEntryPoint3D = positions.entry;
            pull.customExitPoint3D = positions.exit;
            
            // Store in placedConduits
            this.placedConduits.set(pull.id, {
                wall: pull.entrySide,
                entryPosition3D: positions.entry,
                exitPosition3D: positions.exit,
                priority: 2,
                entrySide: pull.entrySide,
                exitSide: pull.exitSide,
                conduitSize: pull.conduitSize
            });
            
            console.log(`P2 Pull ${pull.id}: Entry(${(positions.entry.x/PIXELS_PER_INCH).toFixed(1)}", ${(positions.entry.y/PIXELS_PER_INCH).toFixed(1)}", ${(positions.entry.z/PIXELS_PER_INCH).toFixed(1)}") Exit(${(positions.exit.x/PIXELS_PER_INCH).toFixed(1)}", ${(positions.exit.y/PIXELS_PER_INCH).toFixed(1)}", ${(positions.exit.z/PIXELS_PER_INCH).toFixed(1)}")`);
        });
    }
    
    /**
     * Adjust clustering strategy to avoid P1 conflict zones
     */
    adjustStrategyForP1Conflicts(strategy, p1ConflictZones, entryWall, exitWall, groupPulls) {
        const adjusted = { ...strategy };
        
        // Calculate the buffer needed for the largest P2 conduit
        const largestConduitSize = Math.max(...groupPulls.map(p => parseFloat(p.conduitSize)));
        const largestRadius = (locknutODSpacing[largestConduitSize] || largestConduitSize + 0.5) * PIXELS_PER_INCH / 2;
        
        // Helper function to find the nearest P1 conduit in the direction P2 wants to go
        const findBlockingConduit = (wall, corner, axis) => {
            const conduits = p1ConflictZones[wall].conduits;
            if (conduits.length === 0) return null;
            
            // Find the P1 conduit that actually blocks P2's desired path
            // We need the last conduit in the blocking zone, not the first
            if ((wall === 'left' || wall === 'right') && corner === 'bottom') {
                // P2 wants to start at bottom and go up
                // Find all P1 conduits in the lower half
                const centerLine = 0; // Middle of the wall
                const lowerConduits = conduits.filter(c => c.center < centerLine);
                // Return the highest of the lower conduits (closest to center)
                return lowerConduits.length > 0 ? lowerConduits[lowerConduits.length - 1] : null;
            } else if ((wall === 'left' || wall === 'right') && corner === 'top') {
                // P2 wants to start at top and go down
                // Find all P1 conduits in the upper half
                const centerLine = 0;
                const upperConduits = conduits.filter(c => c.center > centerLine);
                // Return the lowest of the upper conduits (closest to center)
                return upperConduits.length > 0 ? upperConduits[0] : null;
            } else if ((wall === 'top' || wall === 'bottom') && corner === 'left') {
                // P2 wants to start at left and go right
                // Find all P1 conduits in the left half
                const centerLine = 0;
                const leftConduits = conduits.filter(c => c.center < centerLine);
                // Return the rightmost of the left conduits (closest to center)
                return leftConduits.length > 0 ? leftConduits[leftConduits.length - 1] : null;
            } else if ((wall === 'top' || wall === 'bottom') && corner === 'right') {
                // P2 wants to start at right and go left
                // Find all P1 conduits in the right half
                const centerLine = 0;
                const rightConduits = conduits.filter(c => c.center > centerLine);
                // Return the leftmost of the right conduits (closest to center)
                return rightConduits.length > 0 ? rightConduits[0] : null;
            }
            return null;
        };
        
        // Adjust entry wall starting position if there's a P1 conflict
        const entryBlocker = findBlockingConduit(entryWall, strategy.entryCorner);
        if (entryBlocker) {
            if (entryWall === 'left' || entryWall === 'right') {
                if (strategy.entryCorner === 'bottom') {
                    // P2 wants to start at bottom - start above the lowest P1 conduit
                    adjusted.entryStartY = entryBlocker.max + largestRadius;
                    console.log(`Adjusting ${entryWall} wall start: P1 conduit at Y=${(entryBlocker.center/PIXELS_PER_INCH).toFixed(1)}" blocks bottom, P2 starts at Y=${(adjusted.entryStartY/PIXELS_PER_INCH).toFixed(1)}"`);
                } else if (strategy.entryCorner === 'top') {
                    // P2 wants to start at top - start below the highest P1 conduit
                    adjusted.entryStartY = entryBlocker.min - largestRadius;
                    console.log(`Adjusting ${entryWall} wall start: P1 conduit at Y=${(entryBlocker.center/PIXELS_PER_INCH).toFixed(1)}" blocks top, P2 starts at Y=${(adjusted.entryStartY/PIXELS_PER_INCH).toFixed(1)}"`);
                }
            } else if (entryWall === 'top' || entryWall === 'bottom') {
                if (strategy.entryCorner === 'left') {
                    // P2 wants to start at left - start to the right of leftmost P1 conduit
                    adjusted.entryStartX = entryBlocker.max + largestRadius;
                    console.log(`Adjusting ${entryWall} wall start: P1 conduit at X=${(entryBlocker.center/PIXELS_PER_INCH).toFixed(1)}" blocks left, P2 starts at X=${(adjusted.entryStartX/PIXELS_PER_INCH).toFixed(1)}"`);
                } else if (strategy.entryCorner === 'right') {
                    // P2 wants to start at right - start to the left of rightmost P1 conduit
                    adjusted.entryStartX = entryBlocker.min - largestRadius;
                    console.log(`Adjusting ${entryWall} wall start: P1 conduit at X=${(entryBlocker.center/PIXELS_PER_INCH).toFixed(1)}" blocks right, P2 starts at X=${(adjusted.entryStartX/PIXELS_PER_INCH).toFixed(1)}"`);
                }
            }
        }
        
        // Similar adjustment for exit wall if needed
        const exitBlocker = findBlockingConduit(exitWall, strategy.exitCorner);
        if (exitBlocker) {
            if (exitWall === 'left' || exitWall === 'right') {
                if (strategy.exitCorner === 'bottom') {
                    adjusted.exitStartY = exitBlocker.max + largestRadius;
                    console.log(`Adjusting ${exitWall} wall exit: P1 conduit at Y=${(exitBlocker.center/PIXELS_PER_INCH).toFixed(1)}" blocks bottom, P2 starts at Y=${(adjusted.exitStartY/PIXELS_PER_INCH).toFixed(1)}"`);
                } else if (strategy.exitCorner === 'top') {
                    adjusted.exitStartY = exitBlocker.min - largestRadius;
                    console.log(`Adjusting ${exitWall} wall exit: P1 conduit at Y=${(exitBlocker.center/PIXELS_PER_INCH).toFixed(1)}" blocks top, P2 starts at Y=${(adjusted.exitStartY/PIXELS_PER_INCH).toFixed(1)}"`);
                }
            } else if (exitWall === 'top' || exitWall === 'bottom') {
                if (strategy.exitCorner === 'left') {
                    adjusted.exitStartX = exitBlocker.max + largestRadius;
                    console.log(`Adjusting ${exitWall} wall exit: P1 conduit at X=${(exitBlocker.center/PIXELS_PER_INCH).toFixed(1)}" blocks left, P2 starts at X=${(adjusted.exitStartX/PIXELS_PER_INCH).toFixed(1)}"`);
                } else if (strategy.exitCorner === 'right') {
                    adjusted.exitStartX = exitBlocker.min - largestRadius;
                    console.log(`Adjusting ${exitWall} wall exit: P1 conduit at X=${(exitBlocker.center/PIXELS_PER_INCH).toFixed(1)}" blocks right, P2 starts at X=${(adjusted.exitStartX/PIXELS_PER_INCH).toFixed(1)}"`);
                }
            }
        }
        
        return adjusted;
    }
    
    /**
     * Get clustered positions with P1 constraint adjustments
     */
    getConstrainedClusteredPositions(pull, index, adjustedStrategy, groupPulls) {
        const od = locknutODSpacing[pull.conduitSize] || pull.conduitSize + 0.5;
        const radius = (od * PIXELS_PER_INCH) / 2;
        const spacing = od * PIXELS_PER_INCH;
        
        // Calculate dynamic buffer based on largest conduit
        const largestConduitSize = Math.max(...groupPulls.map(p => parseFloat(p.conduitSize)));
        const largestOD = locknutODSpacing[largestConduitSize] || largestConduitSize + 0.5;
        const dynamicBuffer = (largestOD * PIXELS_PER_INCH) / 2;
        
        // Get the normal extreme positions
        let entryStart = getWallExtremePosition(
            pull.entrySide, 
            adjustedStrategy.entryCorner,
            dynamicBuffer,
            this.boxWidth, 
            this.boxHeight, 
            this.boxDepth
        );
        
        let exitStart = getWallExtremePosition(
            pull.exitSide,
            adjustedStrategy.exitCorner,
            dynamicBuffer,
            this.boxWidth,
            this.boxHeight,
            this.boxDepth
        );
        
        // Apply P1 conflict zone adjustments
        if (adjustedStrategy.entryStartY !== undefined) {
            entryStart.y = adjustedStrategy.entryStartY;
        }
        if (adjustedStrategy.entryStartX !== undefined) {
            entryStart.x = adjustedStrategy.entryStartX;
        }
        if (adjustedStrategy.exitStartY !== undefined) {
            exitStart.y = adjustedStrategy.exitStartY;
        }
        if (adjustedStrategy.exitStartX !== undefined) {
            exitStart.x = adjustedStrategy.exitStartX;
        }
        
        // Pack conduits linearly from the adjusted positions
        let entryPos, exitPos;
        
        if (this.isParallelMode) {
            // Parallel mode: same index for entry and exit
            entryPos = getLinearPackedPosition(
                entryStart, 
                pull.entrySide, 
                adjustedStrategy.entryCorner, 
                index, 
                spacing,
                this.boxWidth, 
                this.boxHeight, 
                this.boxDepth
            );
            exitPos = getLinearPackedPosition(
                exitStart,
                pull.exitSide,
                adjustedStrategy.exitCorner,
                index,
                spacing,
                this.boxWidth,
                this.boxHeight,
                this.boxDepth
            );
        } else {
            // Non-parallel mode: reversed index for exit
            entryPos = getLinearPackedPosition(
                entryStart, 
                pull.entrySide, 
                adjustedStrategy.entryCorner, 
                index, 
                spacing,
                this.boxWidth, 
                this.boxHeight, 
                this.boxDepth
            );
            const reversedIndex = groupPulls.length - 1 - index;
            exitPos = getLinearPackedPosition(
                exitStart,
                pull.exitSide,
                adjustedStrategy.exitCorner,
                reversedIndex,
                spacing,
                this.boxWidth,
                this.boxHeight,
                this.boxDepth
            );
        }
        
        // Constrain to wall boundaries
        const entryConstrained = lightConstrainToWall(
            entryPos, 
            pull.entrySide, 
            radius, 
            this.boxWidth, 
            this.boxHeight, 
            this.boxDepth
        );
        const exitConstrained = lightConstrainToWall(
            exitPos,
            pull.exitSide,
            radius,
            this.boxWidth,
            this.boxHeight,
            this.boxDepth
        );
        
        return {
            entry: entryConstrained,
            exit: exitConstrained
        };
    }

    /**
     * Check if a Priority 2 pull shares any wall with Priority 1 pulls
     */
    doesPullShareWallWithP1(p2Pull, p1Pulls) {
        const p2Walls = [p2Pull.entrySide];
        if (p2Pull.exitSide !== p2Pull.entrySide) {
            p2Walls.push(p2Pull.exitSide);
        }
        
        return p1Pulls.some(p1Pull => {
            const p1Walls = [p1Pull.entrySide];
            if (p1Pull.exitSide !== p1Pull.entrySide) {
                p1Walls.push(p1Pull.exitSide);
            }
            
            // Check if any P2 wall matches any P1 wall
            return p2Walls.some(p2Wall => p1Walls.includes(p2Wall));
        });
    }

    /**
     * Arrange Priority 3 (straight pulls) according to decision tree logic
     */
    arrangePriority3(pulls, allPullsByPriority) {
        console.log(`Processing Priority 3: ${pulls.length} pulls`);
        
        // Check if Priority 1 AND Priority 2 conduits exist
        const priority1Exists = allPullsByPriority[1] && allPullsByPriority[1].length > 0;
        const priority2Exists = allPullsByPriority[2] && allPullsByPriority[2].length > 0;
        
        if (!priority1Exists && !priority2Exists) {
            // IF the job contains NO Priority 1 AND NO Priority 2 conduits
            // THEN arrange Priority 3 conduits the normal way using optimizeStraightPullsWithLinearAlignment()
            console.log('Priority 3: No Priority 1 or 2 conduits - arranging normally');
            this.arrangePriority3Normally(pulls);
        } else {
            // ELSE (at least one of Priority 1 or 2 is present)
            // Decision tree lines 81-97: Check for Priority 4 conduits
            const priority4Exists = allPullsByPriority[4] && allPullsByPriority[4].length > 0;
            
            if (!priority4Exists) {
                // Line 81: IF there are NO priority 4 conduits
                console.log('Priority 3: No Priority 4 conduits - arranging P3 with P1/P2 constraints only');
                this.arrangePriority3WithHigherPriorities(pulls, allPullsByPriority);
            } else {
                // Line 89: ELSE there ARE priority 4 conduits
                console.log('Priority 3: Priority 4 conduits exist - checking P3+P4 wall sharing');
                this.arrangePriority3WithPriority4Interaction(pulls, allPullsByPriority);
            }
        }
    }

    /**
     * Arrange all Priority 3 pulls normally (when no higher priorities exist)
     */
    arrangePriority3Normally(pulls) {
        console.log(`Arranging ${pulls.length} Priority 3 pulls normally using optimizeStraightPullsWithLinearAlignment`);
        
        // Call the existing straight pull optimization function directly
        optimizeStraightPullsWithLinearAlignment(
            pulls,
            this.boxWidth,
            this.boxHeight,
            this.boxDepth,
            this.isParallelMode
        );
        
        // Store the results from the optimization
        pulls.forEach(pull => {
            this.placedConduits.set(pull.id, {
                wall: pull.entrySide,
                entryPosition3D: pull.customEntryPoint3D || get3DPosition(pull.entrySide, this.boxWidth, this.boxHeight, this.boxDepth),
                exitPosition3D: pull.customExitPoint3D || get3DPosition(pull.exitSide, this.boxWidth, this.boxHeight, this.boxDepth),
                priority: 3,
                entrySide: pull.entrySide,
                exitSide: pull.exitSide,
                conduitSize: pull.conduitSize
            });
            
            const entry = this.placedConduits.get(pull.id).entryPosition3D;
            const exit = this.placedConduits.get(pull.id).exitPosition3D;
            console.log(`P3 Pull ${pull.id}: Entry(${entry.x.toFixed(1)}, ${entry.y.toFixed(1)}, ${entry.z.toFixed(1)}) Exit(${exit.x.toFixed(1)}, ${exit.y.toFixed(1)}, ${exit.z.toFixed(1)})`);
        });
    }

    /**
     * Arrange Priority 3 when higher priorities exist - check each pull for wall sharing
     */
    arrangePriority3WithHigherPriorities(p3Pulls, allPullsByPriority) {
        const higherPriorityPulls = [
            ...(allPullsByPriority[1] || []),
            ...(allPullsByPriority[2] || [])
        ];
        
        console.log(`Checking wall sharing for ${p3Pulls.length} Priority 3 pulls against higher priorities`);
        
        // Group P3 pulls by type (left-right vs top-bottom)
        const horizontalPulls = [];
        const verticalPulls = [];
        const normalPulls = [];
        
        p3Pulls.forEach(pull => {
            const hasSharedWall = this.doesPullShareWallWithHigherPriorities(pull, higherPriorityPulls);
            
            if (!hasSharedWall) {
                console.log(`P3 Pull ${pull.id}: No shared walls with higher priorities - will arrange normally`);
                normalPulls.push(pull);
            } else {
                console.log(`P3 Pull ${pull.id}: Shared wall with higher priorities - grouping for constraint logic`);
                if ((pull.entrySide === 'left' && pull.exitSide === 'right') ||
                    (pull.entrySide === 'right' && pull.exitSide === 'left')) {
                    horizontalPulls.push(pull);
                } else if ((pull.entrySide === 'top' && pull.exitSide === 'bottom') ||
                           (pull.entrySide === 'bottom' && pull.exitSide === 'top')) {
                    verticalPulls.push(pull);
                }
            }
        });
        
        // Arrange normal pulls with constraint-based placement
        if (normalPulls.length > 0) {
            console.log(`Arranging ${normalPulls.length} P3 pulls with constraint-based placement`);
            normalPulls.forEach(pull => this.arrangeSingleP3PullWithConstraints(pull, allPullsByPriority));
        }
        
        // Arrange horizontal pulls as a group
        if (horizontalPulls.length > 0) {
            console.log(`Arranging ${horizontalPulls.length} horizontal P3 pulls with constraints as a group`);
            this.arrangeP3GroupWithConstraints(horizontalPulls, 'horizontal');
        }
        
        // Arrange vertical pulls as a group
        if (verticalPulls.length > 0) {
            console.log(`Arranging ${verticalPulls.length} vertical P3 pulls with constraints as a group`);
            this.arrangeP3GroupWithConstraints(verticalPulls, 'vertical');
        }
    }
    
    /**
     * Arrange a group of P3 pulls together with constraints
     * NEW APPROACH: Handle each wall independently, allowing conduits to bend if needed
     */
    arrangeP3GroupWithConstraints(pulls, orientation) {
        console.log(`Arranging P3 group of ${pulls.length} ${orientation} pulls with wall-by-wall checking`);
        
        // Sort pulls by size (largest first) for better packing
        pulls.sort((a, b) => parseFloat(b.conduitSize) - parseFloat(a.conduitSize));
        
        // Get the required spacing for the group
        const largestConduitSize = Math.max(...pulls.map(p => parseFloat(p.conduitSize)));
        const spacing = (locknutODSpacing[largestConduitSize] || largestConduitSize + 0.5) * PIXELS_PER_INCH;
        
        // Calculate total space needed for all pulls
        const totalSpaceNeeded = pulls.length * spacing;
        
        // Get walls
        const firstPull = pulls[0];
        const entryWall = firstPull.entrySide;
        const exitWall = firstPull.exitSide;
        
        // STEP 1: Handle entry wall independently
        console.log(`  Step 1: Checking ${entryWall} wall for constraints`);
        const entryWallConduits = this.getHigherPriorityConduitsOnWall(entryWall);
        let entryGapCenter;
        
        if (entryWallConduits.length === 0) {
            // No constraints on entry wall - use center
            console.log(`    No constraints on ${entryWall} wall - using center`);
            const basePos = get3DPosition(entryWall, this.boxWidth, this.boxHeight, this.boxDepth);
            entryGapCenter = (entryWall === 'left' || entryWall === 'right') ? basePos.y : basePos.x;
        } else {
            // Find gap on entry wall
            console.log(`    Found ${entryWallConduits.length} higher priority conduits on ${entryWall} wall`);
            entryGapCenter = this.findBestGapCenterForGroup(entryWall, totalSpaceNeeded, pulls.length);
            console.log(`    Entry wall gap center: ${(entryGapCenter/PIXELS_PER_INCH).toFixed(1)}"`);
        }
        
        // STEP 2: Handle exit wall independently
        console.log(`  Step 2: Checking ${exitWall} wall for constraints`);
        const exitWallConduits = this.getHigherPriorityConduitsOnWall(exitWall);
        let exitGapCenter;
        
        if (exitWallConduits.length === 0) {
            // No constraints on exit wall - match entry position (no bend)
            console.log(`    No constraints on ${exitWall} wall - matching entry position (no bend)`);
            exitGapCenter = entryGapCenter;
        } else {
            // Find gap on exit wall independently
            console.log(`    Found ${exitWallConduits.length} higher priority conduits on ${exitWall} wall`);
            exitGapCenter = this.findBestGapCenterForGroup(exitWall, totalSpaceNeeded, pulls.length);
            console.log(`    Exit wall gap center: ${(exitGapCenter/PIXELS_PER_INCH).toFixed(1)}"`);
        }
        
        // Log if conduits will bend
        if (Math.abs(entryGapCenter - exitGapCenter) > 0.1) {
            console.log(`  Conduits will bend: Entry at ${(entryGapCenter/PIXELS_PER_INCH).toFixed(1)}", Exit at ${(exitGapCenter/PIXELS_PER_INCH).toFixed(1)}"`);
        }
        
        // STEP 3: Position each pull in the group using independent wall positions
        pulls.forEach((pull, index) => {
            const offset = (index - (pulls.length - 1) / 2) * spacing;
            
            let entryPos, exitPos;
            
            if (orientation === 'horizontal') {
                // Horizontal pulls (left-right or right-left) - adjust Y position
                entryPos = get3DPosition(pull.entrySide, this.boxWidth, this.boxHeight, this.boxDepth);
                exitPos = get3DPosition(pull.exitSide, this.boxWidth, this.boxHeight, this.boxDepth);
                
                // Use independent positions for each wall
                entryPos.y = entryGapCenter + offset;
                exitPos.y = exitGapCenter + offset;
            } else {
                // Vertical pulls (top-bottom or bottom-top) - adjust X position
                entryPos = get3DPosition(pull.entrySide, this.boxWidth, this.boxHeight, this.boxDepth);
                exitPos = get3DPosition(pull.exitSide, this.boxWidth, this.boxHeight, this.boxDepth);
                
                // Use independent positions for each wall
                entryPos.x = entryGapCenter + offset;
                exitPos.x = exitGapCenter + offset;
            }
            
            // Store the result
            this.placedConduits.set(pull.id, {
                wall: pull.entrySide,
                entryPosition3D: entryPos,
                exitPosition3D: exitPos,
                priority: 3,
                entrySide: pull.entrySide,
                exitSide: pull.exitSide,
                conduitSize: pull.conduitSize
            });
            
            // Apply to pull object
            pull.customEntryPoint3D = entryPos;
            pull.customExitPoint3D = exitPos;
            
            console.log(`P3 Pull ${pull.id}: Entry(${(entryPos.x/PIXELS_PER_INCH).toFixed(1)}", ${(entryPos.y/PIXELS_PER_INCH).toFixed(1)}", ${(entryPos.z/PIXELS_PER_INCH).toFixed(1)}") Exit(${(exitPos.x/PIXELS_PER_INCH).toFixed(1)}", ${(exitPos.y/PIXELS_PER_INCH).toFixed(1)}", ${(exitPos.z/PIXELS_PER_INCH).toFixed(1)}")`);
        });
    }
    
    /**
     * Find the best gap center for a group of P3 conduits
     */
    findBestGapCenterForGroup(wall, totalSpaceNeeded, pullCount) {
        console.log(`Finding gap center on ${wall} wall for ${pullCount} pulls needing ${(totalSpaceNeeded/PIXELS_PER_INCH).toFixed(1)}" total`);
        
        // Get all existing conduits on this wall
        const wallConduits = this.getHigherPriorityConduitsOnWall(wall);
        
        if (wallConduits.length === 0) {
            // No conflicts - return center of wall
            console.log(`  No other conduits on ${wall} wall - using center`);
            const basePos = get3DPosition(wall, this.boxWidth, this.boxHeight, this.boxDepth);
            return (wall === 'left' || wall === 'right') ? basePos.y : basePos.x;
        }
        
        // Sort conduits by position
        wallConduits.sort((a, b) => a.center - b.center);
        
        // Find gaps that can fit the entire group
        const gaps = this.findGapsOnWall(wallConduits, wall, totalSpaceNeeded / 2);
        
        if (gaps.length === 0) {
            console.warn(`  No viable gaps found on ${wall} wall for group - using wall center as fallback`);
            const basePos = get3DPosition(wall, this.boxWidth, this.boxHeight, this.boxDepth);
            return (wall === 'left' || wall === 'right') ? basePos.y : basePos.x;
        }
        
        // Choose the largest gap
        const bestGap = gaps.reduce((best, gap) => gap.size > best.size ? gap : best);
        console.log(`  Best gap for group: center at ${(bestGap.center/PIXELS_PER_INCH).toFixed(1)}" with size ${(bestGap.size/PIXELS_PER_INCH).toFixed(1)}"`);
        
        return bestGap.center;
    }

    /**
     * Arrange a single Priority 3 pull normally (when no wall sharing)
     */
    arrangeSingleP3PullNormally(pull) {
        // Create single-pull array and use existing optimization
        const singlePullArray = [pull];
        
        optimizeStraightPullsWithLinearAlignment(
            singlePullArray,
            this.boxWidth,
            this.boxHeight,
            this.boxDepth,
            this.isParallelMode
        );
        
        // Store the result
        this.placedConduits.set(pull.id, {
            wall: pull.entrySide,
            entryPosition3D: pull.customEntryPoint3D || get3DPosition(pull.entrySide, this.boxWidth, this.boxHeight, this.boxDepth),
            exitPosition3D: pull.customExitPoint3D || get3DPosition(pull.exitSide, this.boxWidth, this.boxHeight, this.boxDepth),
            priority: 3,
            entrySide: pull.entrySide,
            exitSide: pull.exitSide,
            conduitSize: pull.conduitSize
        });
        
        // Log the result
        const entry = this.placedConduits.get(pull.id).entryPosition3D;
        const exit = this.placedConduits.get(pull.id).exitPosition3D;
        console.log(`P3 Pull ${pull.id}: Entry(${entry.x.toFixed(1)}, ${entry.y.toFixed(1)}, ${entry.z.toFixed(1)}) Exit(${exit.x.toFixed(1)}, ${exit.y.toFixed(1)}, ${exit.z.toFixed(1)})`);
    }

    /**
     * Arrange a single Priority 3 pull using constraint-based placement
     */
    arrangeSingleP3PullWithConstraints(pull, allPullsByPriority) {
        // Check if P3 shares walls with P1, P2, or P4 conduits
        const conflictPulls = [
            ...(allPullsByPriority[1] || []),
            ...(allPullsByPriority[2] || []),
            ...(allPullsByPriority[4] || [])
        ];
        const sharesWallWithConflicts = this.doesPullShareWallWithHigherPriorities(pull, conflictPulls);
        
        if (sharesWallWithConflicts) {
            // Case 1: P3 shares wall with P1/P2/P4 - use gap detection for both entry and exit walls
            console.log(`P3 Pull ${pull.id}: Shares walls with P1/P2/P4 - finding no-conflict zones`);
            this.positionP3PullWithGapDetection(pull);
        } else {
            // Case 2: P3 doesn't share walls with P1/P2/P4 - center on walls
            console.log(`P3 Pull ${pull.id}: No wall sharing with P1/P2/P4 - centering on walls`);
            this.positionP3PullCentered(pull);
        }
    }

    /**
     * Position P3 pull using gap detection to avoid conflicts
     */
    positionP3PullWithGapDetection(pull) {
        // Calculate spacing needed for this P3 conduit
        const conduitSize = parseFloat(pull.conduitSize);
        const spacing = (locknutODSpacing[conduitSize] || conduitSize + 0.5) * PIXELS_PER_INCH;
        
        // Find gap centers for both entry and exit walls
        const entryCenterPosition = this.findBestGapCenterForGroup(pull.entrySide, spacing, 1);
        const exitCenterPosition = this.findBestGapCenterForGroup(pull.exitSide, spacing, 1);
        
        console.log(`P3 Pull ${pull.id}: Entry gap center at ${(entryCenterPosition/PIXELS_PER_INCH).toFixed(1)}" on ${pull.entrySide} wall`);
        console.log(`P3 Pull ${pull.id}: Exit gap center at ${(exitCenterPosition/PIXELS_PER_INCH).toFixed(1)}" on ${pull.exitSide} wall`);
        
        // Position conduit using gap centers
        const entryPos = this.calculateWallPosition(pull.entrySide, entryCenterPosition);
        const exitPos = this.calculateWallPosition(pull.exitSide, exitCenterPosition);
        
        // Store the result
        this.placedConduits.set(pull.id, {
            wall: pull.entrySide,
            entryPosition3D: entryPos,
            exitPosition3D: exitPos,
            priority: 3,
            entrySide: pull.entrySide,
            exitSide: pull.exitSide,
            conduitSize: pull.conduitSize
        });
        
        console.log(`P3 Pull ${pull.id}: Entry(${entryPos.x.toFixed(1)}, ${entryPos.y.toFixed(1)}, ${entryPos.z.toFixed(1)}) Exit(${exitPos.x.toFixed(1)}, ${exitPos.y.toFixed(1)}, ${exitPos.z.toFixed(1)})`);
    }

    /**
     * Position P3 pull centered on both walls
     */
    positionP3PullCentered(pull) {
        // Get wall center positions
        const entryBasePos = get3DPosition(pull.entrySide, this.boxWidth, this.boxHeight, this.boxDepth);
        const exitBasePos = get3DPosition(pull.exitSide, this.boxWidth, this.boxHeight, this.boxDepth);
        
        console.log(`P3 Pull ${pull.id}: Centering entry on ${pull.entrySide} wall, exit on ${pull.exitSide} wall`);
        
        // Store the result
        this.placedConduits.set(pull.id, {
            wall: pull.entrySide,
            entryPosition3D: entryBasePos,
            exitPosition3D: exitBasePos,
            priority: 3,
            entrySide: pull.entrySide,
            exitSide: pull.exitSide,
            conduitSize: pull.conduitSize
        });
        
        console.log(`P3 Pull ${pull.id}: Entry(${entryBasePos.x.toFixed(1)}, ${entryBasePos.y.toFixed(1)}, ${entryBasePos.z.toFixed(1)}) Exit(${exitBasePos.x.toFixed(1)}, ${exitBasePos.y.toFixed(1)}, ${exitBasePos.z.toFixed(1)})`);
    }

    /**
     * Arrange a single Priority 3 pull with constraint logic
     * Finds available gaps between higher priority conduits and centers P3 in the largest gap
     */
    arrangeSingleP3PullWithPlaceholder(pull) {
        console.log(`Arranging P3 Pull ${pull.id} with gap-finding logic`);
        
        // For straight pulls, we need to handle both walls
        const entryWall = pull.entrySide;
        const exitWall = pull.exitSide;
        
        // Calculate P3's radius
        const p3Radius = (locknutODSpacing[pull.conduitSize] || pull.conduitSize + 0.5) * PIXELS_PER_INCH / 2;
        
        // Find best position for entry wall
        const entryPosition = this.findBestPositionInGaps(entryWall, p3Radius);
        
        // Find best position for exit wall
        const exitPosition = this.findBestPositionInGaps(exitWall, p3Radius);
        
        // For straight pulls, align them (same Y for horizontal, same X for vertical)
        let alignedEntryPos, alignedExitPos;
        
        if ((entryWall === 'left' && exitWall === 'right') || 
            (entryWall === 'right' && exitWall === 'left')) {
            // Horizontal straight pull - use same Y coordinate
            const alignedY = (entryPosition.y + exitPosition.y) / 2; // Average for best fit
            alignedEntryPos = { ...entryPosition, y: alignedY };
            alignedExitPos = { ...exitPosition, y: alignedY };
        } else if ((entryWall === 'top' && exitWall === 'bottom') || 
                   (entryWall === 'bottom' && exitWall === 'top')) {
            // Vertical straight pull - use same X coordinate
            const alignedX = (entryPosition.x + exitPosition.x) / 2; // Average for best fit
            alignedEntryPos = { ...entryPosition, x: alignedX };
            alignedExitPos = { ...exitPosition, x: alignedX };
        } else {
            // Shouldn't happen for straight pulls
            alignedEntryPos = entryPosition;
            alignedExitPos = exitPosition;
        }
        
        // Store the result
        this.placedConduits.set(pull.id, {
            wall: pull.entrySide,
            entryPosition3D: alignedEntryPos,
            exitPosition3D: alignedExitPos,
            priority: 3,
            entrySide: pull.entrySide,
            exitSide: pull.exitSide,
            conduitSize: pull.conduitSize
        });
        
        // Apply to pull object
        pull.customEntryPoint3D = alignedEntryPos;
        pull.customExitPoint3D = alignedExitPos;
        
        console.log(`P3 Pull ${pull.id}: Entry(${(alignedEntryPos.x/PIXELS_PER_INCH).toFixed(1)}", ${(alignedEntryPos.y/PIXELS_PER_INCH).toFixed(1)}", ${(alignedEntryPos.z/PIXELS_PER_INCH).toFixed(1)}") Exit(${(alignedExitPos.x/PIXELS_PER_INCH).toFixed(1)}", ${(alignedExitPos.y/PIXELS_PER_INCH).toFixed(1)}", ${(alignedExitPos.z/PIXELS_PER_INCH).toFixed(1)}")`);
    }
    
    /**
     * Find the best position for a conduit by analyzing gaps between higher priority conduits
     */
    findBestPositionInGaps(wall, conduitRadius) {
        console.log(`Finding gaps on ${wall} wall for conduit with radius ${(conduitRadius/PIXELS_PER_INCH).toFixed(2)}"`);
        
        // Collect all higher priority conduits on this wall
        const wallConduits = this.getHigherPriorityConduitsOnWall(wall);
        
        if (wallConduits.length === 0) {
            // No conflicts - return center of wall
            console.log(`  No higher priority conduits on ${wall} wall - using center`);
            return get3DPosition(wall, this.boxWidth, this.boxHeight, this.boxDepth);
        }
        
        // Sort conduits by position (Y for left/right, X for top/bottom)
        const isVerticalWall = (wall === 'left' || wall === 'right');
        wallConduits.sort((a, b) => a.center - b.center);
        
        // Find gaps
        const gaps = this.findGapsOnWall(wallConduits, wall, conduitRadius);
        
        if (gaps.length === 0) {
            console.warn(`  No viable gaps found on ${wall} wall - using wall center as fallback`);
            return get3DPosition(wall, this.boxWidth, this.boxHeight, this.boxDepth);
        }
        
        // Choose the largest gap
        const bestGap = gaps.reduce((best, gap) => gap.size > best.size ? gap : best);
        console.log(`  Best gap: center at ${(bestGap.center/PIXELS_PER_INCH).toFixed(1)}" with size ${(bestGap.size/PIXELS_PER_INCH).toFixed(1)}"`);
        
        // Create 3D position
        const basePos = get3DPosition(wall, this.boxWidth, this.boxHeight, this.boxDepth);
        if (isVerticalWall) {
            basePos.y = bestGap.center;
        } else {
            basePos.x = bestGap.center;
        }
        
        return basePos;
    }
    
    /**
     * Get all higher priority conduits on a specific wall
     * INCLUDING already-placed P3 conduits to avoid overlaps
     */
    getHigherPriorityConduitsOnWall(wall) {
        const conduits = [];
        
        // Add P1 conduits from conflict zones (both entry and exit points)
        const p1Zones = this.calculateP1ConflictZones(this.allPullsByPriority[1] || []);
        if (p1Zones[wall] && p1Zones[wall].conduits) {
            p1Zones[wall].conduits.forEach(conduit => {
                // Calculate radius from min/max values
                const radius = (conduit.max - conduit.min) / 2;
                conduits.push({
                    center: conduit.center,
                    radius: radius,
                    priority: 1,
                    type: 'P1'
                });
            });
        }
        
        // Add P2 and P3 conduits from placedConduits
        this.placedConduits.forEach((placement, pullId) => {
            if (placement.priority === 2 || placement.priority === 3) {
                const radius = (locknutODSpacing[placement.conduitSize] || placement.conduitSize + 0.5) * PIXELS_PER_INCH / 2;
                const typePrefix = placement.priority === 2 ? 'P2' : 'P3';
                
                // Check entry wall
                if (placement.entrySide === wall) {
                    const center = (wall === 'left' || wall === 'right') ? 
                        placement.entryPosition3D.y : placement.entryPosition3D.x;
                    conduits.push({
                        center: center,
                        radius: radius,
                        priority: placement.priority,
                        type: `${typePrefix}-entry`
                    });
                }
                
                // Check exit wall
                if (placement.exitSide === wall) {
                    const center = (wall === 'left' || wall === 'right') ? 
                        placement.exitPosition3D.y : placement.exitPosition3D.x;
                    conduits.push({
                        center: center,
                        radius: radius,
                        priority: placement.priority,
                        type: `${typePrefix}-exit`
                    });
                }
            }
        });
        
        console.log(`  Found ${conduits.length} higher priority and same priority conduits on ${wall} wall`);
        conduits.forEach(c => {
            console.log(`    ${c.type} at ${(c.center/PIXELS_PER_INCH).toFixed(1)}" (±${(c.radius/PIXELS_PER_INCH).toFixed(1)}") spans ${((c.center-c.radius)/PIXELS_PER_INCH).toFixed(1)}" to ${((c.center+c.radius)/PIXELS_PER_INCH).toFixed(1)}"`);
        });
        
        return conduits;
    }
    
    /**
     * Find gaps between conduits on a wall
     */
    findGapsOnWall(conduits, wall, requiredRadius) {
        const gaps = [];
        const isVerticalWall = (wall === 'left' || wall === 'right');
        
        // Determine wall bounds
        const wallMin = isVerticalWall ? -this.boxHeight / 2 : -this.boxWidth / 2;
        const wallMax = isVerticalWall ? this.boxHeight / 2 : this.boxWidth / 2;
        
        // Check gap from wall start to first conduit
        if (conduits.length > 0) {
            const firstConduit = conduits[0];
            const gapEnd = firstConduit.center - firstConduit.radius;
            const gapSize = gapEnd - wallMin;
            if (gapSize >= requiredRadius * 2) {
                gaps.push({
                    start: wallMin,
                    end: gapEnd,
                    size: gapSize,
                    center: (wallMin + gapEnd) / 2
                });
            }
        }
        
        // Check gaps between consecutive conduits
        for (let i = 0; i < conduits.length - 1; i++) {
            const current = conduits[i];
            const next = conduits[i + 1];
            
            const gapStart = current.center + current.radius;
            const gapEnd = next.center - next.radius;
            const gapSize = gapEnd - gapStart;
            
            if (gapSize >= requiredRadius * 2) {
                gaps.push({
                    start: gapStart,
                    end: gapEnd,
                    size: gapSize,
                    center: (gapStart + gapEnd) / 2
                });
            }
        }
        
        // Check gap from last conduit to wall end
        if (conduits.length > 0) {
            const lastConduit = conduits[conduits.length - 1];
            const gapStart = lastConduit.center + lastConduit.radius;
            const gapSize = wallMax - gapStart;
            if (gapSize >= requiredRadius * 2) {
                gaps.push({
                    start: gapStart,
                    end: wallMax,
                    size: gapSize,
                    center: (gapStart + wallMax) / 2
                });
            }
        }
        
        console.log(`  Wall bounds: ${(wallMin/PIXELS_PER_INCH).toFixed(1)}" to ${(wallMax/PIXELS_PER_INCH).toFixed(1)}"`);
        console.log(`  Required diameter: ${(requiredRadius*2/PIXELS_PER_INCH).toFixed(1)}"`);
        console.log(`  Found ${gaps.length} viable gaps`);
        gaps.forEach((gap, i) => {
            console.log(`    Gap ${i+1}: ${(gap.start/PIXELS_PER_INCH).toFixed(1)}" to ${(gap.end/PIXELS_PER_INCH).toFixed(1)}" (size: ${(gap.size/PIXELS_PER_INCH).toFixed(1)}", center: ${(gap.center/PIXELS_PER_INCH).toFixed(1)}")`);
        });
        
        return gaps;
    }

    /**
     * Arrange Priority 3 with Priority 4 interaction (decision tree lines 89-97)
     */
    arrangePriority3WithPriority4Interaction(p3Pulls, allPullsByPriority) {
        const p4Pulls = allPullsByPriority[4] || [];
        console.log(`Checking P3+P4 interaction: ${p3Pulls.length} P3 pulls, ${p4Pulls.length} P4 pulls`);
        
        // Check if P3 and P4 conduits share any walls
        const p3AndP4ShareWalls = this.doP3AndP4ShareWalls(p3Pulls, p4Pulls);
        
        if (!p3AndP4ShareWalls) {
            // Line 90-91: P3 and P4 do not share walls - arrange separately
            console.log('P3 and P4 do not share walls - arranging separately');
            this.arrangePriority3WithHigherPriorities(p3Pulls, allPullsByPriority);
            // P4 will be handled separately in its own priority processing
        } else {
            // Line 92-97: P3 and P4 DO share walls
            console.log('P3 and P4 share walls - checking for P1/P2 conflicts');
            
            // Get higher priority conduits (P1 and P2)
            const higherPriorityPulls = [
                ...(allPullsByPriority[1] || []),
                ...(allPullsByPriority[2] || [])
            ];
            
            // Check if shared walls also have P1/P2 conflicts
            const sharedWallsWithConflicts = this.getSharedWallsWithHigherPriorityConflicts(p3Pulls, p4Pulls, higherPriorityPulls);
            
            if (sharedWallsWithConflicts.length > 0) {
                // Line 96-97: Shared walls have P1/P2 conflicts - arrange P3+P4 together
                console.log(`P3+P4 share ${sharedWallsWithConflicts.length} wall(s) with P1/P2 conflicts - grouping together`);
                this.arrangePriority3AndPriority4Together(p3Pulls, p4Pulls, allPullsByPriority, sharedWallsWithConflicts);
            } else {
                // No conflicts - arrange normally but consider P4 spacing
                console.log('P3+P4 share walls but no P1/P2 conflicts - arranging with coordination');
                this.arrangePriority3WithHigherPriorities(p3Pulls, allPullsByPriority);
            }
        }
    }

    /**
     * Check if P3 and P4 conduits share any walls
     */
    doP3AndP4ShareWalls(p3Pulls, p4Pulls) {
        for (const p3Pull of p3Pulls) {
            for (const p4Pull of p4Pulls) {
                // Check if they share entry or exit walls
                if (p3Pull.entrySide === p4Pull.entrySide || 
                    p3Pull.entrySide === p4Pull.exitSide ||
                    p3Pull.exitSide === p4Pull.entrySide ||
                    p3Pull.exitSide === p4Pull.exitSide) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Get walls where P3 and P4 share space AND have higher priority conflicts
     */
    getSharedWallsWithHigherPriorityConflicts(p3Pulls, p4Pulls, higherPriorityPulls) {
        const conflictWalls = [];
        
        // Get all walls that P3 and P4 share
        const sharedWalls = new Set();
        p3Pulls.forEach(p3Pull => {
            p4Pulls.forEach(p4Pull => {
                if (p3Pull.entrySide === p4Pull.entrySide || 
                    p3Pull.entrySide === p4Pull.exitSide) {
                    sharedWalls.add(p3Pull.entrySide);
                }
                if (p3Pull.exitSide === p4Pull.entrySide ||
                    p3Pull.exitSide === p4Pull.exitSide) {
                    sharedWalls.add(p3Pull.exitSide);
                }
            });
        });
        
        // Check if any shared walls have higher priority conduits
        sharedWalls.forEach(wall => {
            const hasHigherPriorityOnWall = higherPriorityPulls.some(higherPull => 
                higherPull.entrySide === wall || higherPull.exitSide === wall
            );
            if (hasHigherPriorityOnWall) {
                conflictWalls.push(wall);
            }
        });
        
        return conflictWalls;
    }

    /**
     * Arrange P3 and P4 conduits together in no-conflict zones (decision tree line 97)
     * Process each wall separately as specified in decision tree line 95
     */
    arrangePriority3AndPriority4Together(p3Pulls, p4Pulls, allPullsByPriority, conflictWalls) {
        console.log(`Arranging P3+P4 together wall-by-wall on conflict walls: ${conflictWalls.join(', ')}`);
        
        // Process each conflict wall separately
        conflictWalls.forEach(wall => {
            console.log(`\n  Processing wall: ${wall}`);
            
            // Find all P3 and P4 conduits that use this wall (entry or exit)
            const p3OnWall = p3Pulls.filter(pull => pull.entrySide === wall || pull.exitSide === wall);
            const p4OnWall = p4Pulls.filter(pull => pull.entrySide === wall || pull.exitSide === wall);
            
            console.log(`    P3 conduits on ${wall} wall: ${p3OnWall.length}`);
            console.log(`    P4 conduits on ${wall} wall: ${p4OnWall.length}`);
            
            if (p3OnWall.length === 0 && p4OnWall.length === 0) {
                console.log(`    No P3/P4 conduits on ${wall} wall - skipping`);
                return;
            }
            
            // Calculate total space needed for P3+P4 conduits on this wall
            const p3Spacing = this.getRequiredSpacingForPulls(p3OnWall);
            const p4Spacing = this.getRequiredSpacingForPulls(p4OnWall);
            const totalSpaceNeeded = p3Spacing + p4Spacing;
            
            console.log(`    Total space needed: P3=${(p3Spacing/PIXELS_PER_INCH).toFixed(1)}" + P4=${(p4Spacing/PIXELS_PER_INCH).toFixed(1)}" = ${(totalSpaceNeeded/PIXELS_PER_INCH).toFixed(1)}"`);
            
            // Find gap center for combined P3+P4 group on this wall (excluding current P3 pulls from conflict detection)
            const gapCenter = this.findBestGapCenterForGroupExcluding(wall, totalSpaceNeeded, p3OnWall.length + p4OnWall.length, p3Pulls);
            
            console.log(`    Gap center on ${wall} wall: ${(gapCenter/PIXELS_PER_INCH).toFixed(1)}"`);
            
            // Position P3 conduits first (on top/leading side)
            if (p3OnWall.length > 0) {
                const p3Center = gapCenter - p4Spacing/2;
                console.log(`    Positioning ${p3OnWall.length} P3 conduits at center ${(p3Center/PIXELS_PER_INCH).toFixed(1)}"`);
                this.positionP3PullsOnWall(p3OnWall, wall, p3Center);
            }
            
            // Position P4 conduits second (below/trailing side)  
            if (p4OnWall.length > 0) {
                const p4Center = gapCenter + p3Spacing/2;
                console.log(`    Positioning ${p4OnWall.length} P4 conduits at center ${(p4Center/PIXELS_PER_INCH).toFixed(1)}"`);
                this.positionP4PullsOnWall(p4OnWall, wall, p4Center, 4);
            }
            
            // Mark P4 pulls as placed so they're not processed again in P4 priority
            p4OnWall.forEach(p4Pull => {
                this.markP4PullAsPlaced(p4Pull);
                console.log(`    Marked P4 Pull ${p4Pull.id} as placed with P3`);
            });
        });
        
        // Process P3's individual walls that weren't handled in the P3+P4 group phase
        console.log(`\n  Processing P3's remaining individual walls...`);
        
        // Get all walls used by P3 pulls
        const p3Walls = new Set();
        p3Pulls.forEach(pull => {
            p3Walls.add(pull.entrySide);
            p3Walls.add(pull.exitSide);
        });
        
        // Find P3 walls that weren't processed in the conflict walls phase
        const remainingP3Walls = Array.from(p3Walls).filter(wall => !conflictWalls.includes(wall));
        
        if (remainingP3Walls.length > 0) {
            console.log(`  P3 walls needing individual processing: ${remainingP3Walls.join(', ')}`);
            
            // Apply normal P3 constraint logic to remaining walls
            this.processP3IndividualWalls(p3Pulls, remainingP3Walls, allPullsByPriority);
        } else {
            console.log(`  All P3 walls were processed in P3+P4 group phase`);
        }
    }

    /**
     * Process P3's individual walls using normal constraint logic
     */
    processP3IndividualWalls(p3Pulls, remainingWalls, allPullsByPriority) {
        const higherPriorityPulls = [
            ...(allPullsByPriority[1] || []),
            ...(allPullsByPriority[2] || [])
        ];
        
        // Process each remaining wall for P3 pulls
        remainingWalls.forEach(wall => {
            console.log(`    Processing P3 individual wall: ${wall}`);
            
            // Find P3 pulls that use this wall
            const p3PullsOnWall = p3Pulls.filter(pull => 
                pull.entrySide === wall || pull.exitSide === wall
            );
            
            if (p3PullsOnWall.length === 0) {
                console.log(`      No P3 pulls on ${wall} wall`);
                return;
            }
            
            console.log(`      Found ${p3PullsOnWall.length} P3 pulls on ${wall} wall`);
            
            // Check for higher priority conflicts on this wall  
            const higherPriorityOnWall = higherPriorityPulls.filter(higherPull =>
                higherPull.entrySide === wall || higherPull.exitSide === wall
            );
            
            if (higherPriorityOnWall.length === 0) {
                console.log(`      No higher priority conflicts on ${wall} wall - centering normally`);
                // No constraints - position at wall center
                const wallCenter = 0; // Center of the wall
                this.positionP3PullsOnWall(p3PullsOnWall, wall, wallCenter);
            } else {
                console.log(`      Found ${higherPriorityOnWall.length} higher priority conflicts on ${wall} wall`);
                // Find no-conflict zone and center P3 pulls there (excluding current P3 pulls)
                const spacing = this.getRequiredSpacingForPulls(p3PullsOnWall);
                const gapCenter = this.findBestGapCenterForGroupExcluding(wall, spacing, p3PullsOnWall.length, p3PullsOnWall);
                
                console.log(`      Gap center for P3 on ${wall} wall: ${(gapCenter/PIXELS_PER_INCH).toFixed(1)}"`);
                
                // Position P3 pulls at gap center
                this.positionP3PullsOnWall(p3PullsOnWall, wall, gapCenter);
            }
        });
    }

    /**
     * Position a single P3 pull on a specific wall
     */
    positionP3PullOnWall(pull, wall, centerPosition) {
        console.log(`        Positioning P3 Pull ${pull.id} on ${wall} wall at ${(centerPosition/PIXELS_PER_INCH).toFixed(1)}"`);
        
        // Update the appropriate wall position (entry or exit)
        let currentPlacement = this.placedConduits.get(pull.id);
        
        if (!currentPlacement) {
            console.log(`        P3 Pull ${pull.id} not in placed conduits - initializing with default positions`);
            // Initialize with default positions
            const defaultEntry = get3DPosition(pull.entrySide, this.boxWidth, this.boxHeight, this.boxDepth);
            const defaultExit = get3DPosition(pull.exitSide, this.boxWidth, this.boxHeight, this.boxDepth);
            
            currentPlacement = {
                wall: pull.entrySide,
                entryPosition3D: defaultEntry,
                exitPosition3D: defaultExit,
                priority: 3
            };
            
            this.placedConduits.set(pull.id, currentPlacement);
        }
        
        let entryPos = currentPlacement.entryPosition3D;
        let exitPos = currentPlacement.exitPosition3D;
        
        if (pull.entrySide === wall) {
            // Update entry position
            entryPos = this.calculateWallPosition(wall, centerPosition);
        }
        
        if (pull.exitSide === wall) {
            // Update exit position
            exitPos = this.calculateWallPosition(wall, centerPosition);
        }
        
        // Update the placement
        this.placedConduits.set(pull.id, {
            ...currentPlacement,
            entryPosition3D: entryPos,
            exitPosition3D: exitPos
        });
        
        console.log(`        P3 Pull ${pull.id}: Entry(${entryPos.x.toFixed(1)}, ${entryPos.y.toFixed(1)}, ${entryPos.z.toFixed(1)}) Exit(${exitPos.x.toFixed(1)}, ${exitPos.y.toFixed(1)}, ${exitPos.z.toFixed(1)})`);
    }

    /**
     * Position multiple P3 pulls on a wall with proper clustering around center position
     */
    positionP3PullsOnWall(pulls, wall, centerPosition) {
        console.log(`      Positioning ${pulls.length} P3 pulls on ${wall} wall clustered around center ${(centerPosition/PIXELS_PER_INCH).toFixed(1)}"`);
        
        pulls.forEach((pull, index) => {
            // Calculate spacing for this specific pull
            const spacing = (locknutODSpacing[parseFloat(pull.conduitSize)] || parseFloat(pull.conduitSize) + 0.5) * PIXELS_PER_INCH;
            
            // Calculate offset from center for this pull in the group
            const offset = centerPosition + (index - (pulls.length - 1) / 2) * spacing;
            
            console.log(`        P3 Pull ${pull.id} positioned at offset ${(offset/PIXELS_PER_INCH).toFixed(1)}" (index ${index} of ${pulls.length})`);
            
            // Use the single pull positioning function with the calculated offset
            this.positionP3PullOnWall(pull, wall, offset);
        });
    }

    /**
     * Position P4 side-to-rear pulls with proper vertical alignment and maximum distance
     */
    positionP4PullsOnWall(pulls, wall, centerPosition, priority) {
        console.log(`      Positioning ${pulls.length} P${priority} side-to-rear pulls on ${wall} wall at center ${(centerPosition/PIXELS_PER_INCH).toFixed(1)}"`);
        
        pulls.forEach((pull, index) => {
            // Calculate spacing for this specific pull
            const spacing = (locknutODSpacing[parseFloat(pull.conduitSize)] || parseFloat(pull.conduitSize) + 0.5) * PIXELS_PER_INCH;
            
            // Calculate offset from center for this pull in the group
            const offset = centerPosition + (index - (pulls.length - 1) / 2) * spacing;
            
            let entryPos, exitPos;
            
            if (pull.entrySide === wall) {
                // This wall is the entry side - position entry at constrained location
                entryPos = this.calculateWallPosition(wall, offset);
                
                // For P4 side-to-rear: exit should be vertically aligned and at minimum required distance
                if (pull.exitSide === 'rear') {
                    // Calculate rear wall position that's vertically aligned with entry
                    const rearBasePos = get3DPosition('rear', this.boxWidth, this.boxHeight, this.boxDepth);
                    
                    // Maintain vertical alignment: use same Y coordinate as entry
                    const entryY = entryPos.y;
                    
                    // Calculate minimum required distance for side-to-rear pull
                    const conduitSize = parseFloat(pull.conduitSize);
                    const locknutSpacing = locknutODSpacing[conduitSize] || conduitSize + 0.5;
                    const throatDepth = conduitThroatDepths[conduitSize] || 1.0;
                    const minRequiredDistance = (6 * conduitSize) + locknutSpacing + throatDepth;
                    
                    console.log(`        P4 minimum distance calc: (6 × ${conduitSize}) + ${locknutSpacing} + ${throatDepth} = ${minRequiredDistance}"`);
                    
                    // Position exit on rear wall ensuring minimum required 3D distance
                    const minDistancePixels = minRequiredDistance * PIXELS_PER_INCH;
                    
                    // For side-to-rear pulls, exit must be on rear wall (fixed Z)
                    // Calculate the X/Y position that gives minimum required distance in 3D space
                    const rearZ = rearBasePos.z;
                    const distanceZ = Math.abs(rearZ - entryPos.z); // Distance in Z direction
                    
                    // Use Pythagorean theorem: total_distance² = x_distance² + y_distance² + z_distance²
                    // We need: total_distance ≥ minDistancePixels
                    // So: x_distance² + y_distance² = minDistancePixels² - z_distance²
                    const remainingDistanceSquared = Math.max(0, minDistancePixels * minDistancePixels - distanceZ * distanceZ);
                    const remainingDistance = Math.sqrt(remainingDistanceSquared);
                    
                    // Position exit on rear wall, moving away from entry in X/Y plane
                    let exitX = rearBasePos.x; // Start at rear wall center
                    let exitY = entryY; // Start aligned with entry
                    
                    if (remainingDistance > 0) {
                        if (pull.entrySide === 'left') {
                            // Left-to-rear: move right from entry position
                            exitX = entryPos.x + remainingDistance;
                        } else if (pull.entrySide === 'right') {
                            // Right-to-rear: move left from entry position  
                            exitX = entryPos.x - remainingDistance;
                        } else if (pull.entrySide === 'top') {
                            // Top-to-rear: maintain X alignment like horizontal P4s maintain Y alignment
                            exitX = entryPos.x; // Keep same X coordinate as entry
                            exitY = entryPos.y - remainingDistance;
                        } else if (pull.entrySide === 'bottom') {
                            // Bottom-to-rear: maintain X alignment like horizontal P4s maintain Y alignment  
                            exitX = entryPos.x; // Keep same X coordinate as entry
                            exitY = entryPos.y + remainingDistance;
                        }
                    }
                    
                    // Ensure it stays within rear wall bounds
                    const minRearX = rearBasePos.x - (this.boxWidth * PIXELS_PER_INCH / 2) + spacing/2;
                    const maxRearX = rearBasePos.x + (this.boxWidth * PIXELS_PER_INCH / 2) - spacing/2;
                    const minRearY = rearBasePos.y - (this.boxHeight * PIXELS_PER_INCH / 2) + spacing/2;
                    const maxRearY = rearBasePos.y + (this.boxHeight * PIXELS_PER_INCH / 2) - spacing/2;
                    
                    const finalRearX = Math.max(minRearX, Math.min(exitX, maxRearX));
                    const finalRearY = Math.max(minRearY, Math.min(exitY, maxRearY));
                    
                    exitPos = { 
                        x: finalRearX, 
                        y: finalRearY,
                        z: rearZ // Use rear wall Z coordinate
                    };
                    
                    if (pull.entrySide === 'left' || pull.entrySide === 'right') {
                        console.log(`        P4 side-to-rear alignment: Entry Y=${(entryY/PIXELS_PER_INCH).toFixed(1)}" -> Exit Y=${(finalRearY/PIXELS_PER_INCH).toFixed(1)}" (Y-aligned)`);
                    } else {
                        console.log(`        P4 side-to-rear alignment: Entry X=${(entryPos.x/PIXELS_PER_INCH).toFixed(1)}" -> Exit X=${(finalRearX/PIXELS_PER_INCH).toFixed(1)}" (X-aligned)`);
                    }
                } else {
                    // Other exit walls - use same offset for now
                    exitPos = this.calculateWallPosition(pull.exitSide, offset);
                }
            } else {
                // This wall is the exit side - shouldn't happen for P4 side-to-rear in this context
                exitPos = this.calculateWallPosition(wall, offset);
                entryPos = this.calculateWallPosition(pull.entrySide, offset);
            }
            
            // Store the placement
            this.placedConduits.set(pull.id, {
                wall: wall,
                entryPosition3D: entryPos,
                exitPosition3D: exitPos,
                priority: priority,
                entrySide: pull.entrySide,
                exitSide: pull.exitSide,
                conduitSize: pull.conduitSize
            });
            
            console.log(`        P${priority} Pull ${pull.id}: Entry(${entryPos.x.toFixed(1)}, ${entryPos.y.toFixed(1)}, ${entryPos.z.toFixed(1)}) Exit(${exitPos.x.toFixed(1)}, ${exitPos.y.toFixed(1)}, ${exitPos.z.toFixed(1)})`);
        });
    }


    /**
     * Position a group of pulls on a specific wall at a given center position
     */
    positionPullsOnWall(pulls, wall, centerPosition, priority) {
        console.log(`      Positioning ${pulls.length} P${priority} pulls on ${wall} wall at center ${(centerPosition/PIXELS_PER_INCH).toFixed(1)}"`);
        
        pulls.forEach((pull, index) => {
            // Calculate spacing for this specific pull
            const spacing = (locknutODSpacing[parseFloat(pull.conduitSize)] || parseFloat(pull.conduitSize) + 0.5) * PIXELS_PER_INCH;
            
            // Calculate offset from center for this pull in the group
            const offset = centerPosition + (index - (pulls.length - 1) / 2) * spacing;
            
            // Determine which wall position to update (entry or exit)
            let entryPos, exitPos;
            
            if (pull.entrySide === wall) {
                // This wall is the entry side - position entry, calculate exit independently
                entryPos = this.calculateWallPosition(wall, offset);
                
                // For exit, check if we already have a position stored, otherwise calculate default
                if (this.placedConduits.has(pull.id)) {
                    exitPos = this.placedConduits.get(pull.id).exitPosition3D;
                } else {
                    exitPos = this.calculateWallPosition(pull.exitSide, offset); // Start with same offset
                }
            } else {
                // This wall is the exit side - position exit, keep entry as calculated before
                exitPos = this.calculateWallPosition(wall, offset);
                
                // For entry, check if we already have a position stored, otherwise calculate default  
                if (this.placedConduits.has(pull.id)) {
                    entryPos = this.placedConduits.get(pull.id).entryPosition3D;
                } else {
                    entryPos = this.calculateWallPosition(pull.entrySide, offset); // Start with same offset
                }
            }
            
            // Store the updated placement
            this.placedConduits.set(pull.id, {
                wall: wall,
                entryPosition3D: entryPos,
                exitPosition3D: exitPos,
                priority: priority,
                entrySide: pull.entrySide,
                exitSide: pull.exitSide,
                conduitSize: pull.conduitSize
            });
            
            console.log(`        P${priority} Pull ${pull.id}: Entry(${entryPos.x.toFixed(1)}, ${entryPos.y.toFixed(1)}, ${entryPos.z.toFixed(1)}) Exit(${exitPos.x.toFixed(1)}, ${exitPos.y.toFixed(1)}, ${exitPos.z.toFixed(1)})`);
        });
    }

    /**
     * Find gap center excluding specific pulls from conflict detection
     */
    findBestGapCenterForGroupExcluding(wall, totalSpaceNeeded, pullCount, excludePulls) {
        console.log(`Finding gap center on ${wall} wall for ${pullCount} pulls needing ${(totalSpaceNeeded/PIXELS_PER_INCH).toFixed(1)}" total (excluding ${excludePulls.length} current pulls)`);
        
        // Get excluded pull IDs
        const excludeIds = new Set(excludePulls.map(pull => pull.id));
        
        // Get all existing conduits on this wall, excluding the ones being repositioned
        const wallConduits = this.getHigherPriorityConduitsOnWallExcluding(wall, excludeIds);
        
        if (wallConduits.length === 0) {
            // No conflicts - return center of wall
            console.log(`  No other conduits on ${wall} wall - using center`);
            const basePos = get3DPosition(wall, this.boxWidth, this.boxHeight, this.boxDepth);
            return (wall === 'left' || wall === 'right') ? basePos.y : basePos.x;
        }
        
        // Sort conduits by position
        wallConduits.sort((a, b) => a.center - b.center);
        
        // Find gaps that can fit the entire group
        const gaps = this.findGapsOnWall(wallConduits, wall, totalSpaceNeeded / 2);
        
        if (gaps.length === 0) {
            console.log(`  Warning: No suitable gaps found on ${wall} wall - using center as fallback`);
            const basePos = get3DPosition(wall, this.boxWidth, this.boxHeight, this.boxDepth);
            return (wall === 'left' || wall === 'right') ? basePos.y : basePos.x;
        }
        
        // Return the center of the largest gap
        const bestGap = gaps.reduce((largest, gap) => gap.size > largest.size ? gap : largest);
        console.log(`  Best gap for group: center at ${(bestGap.center/PIXELS_PER_INCH).toFixed(1)}" with size ${(bestGap.size/PIXELS_PER_INCH).toFixed(1)}"`);
        
        return bestGap.center;
    }

    /**
     * Get higher priority conduits on wall excluding specific pull IDs
     */
    getHigherPriorityConduitsOnWallExcluding(wall, excludeIds) {
        const conduits = [];
        
        // Add P1 conduits from conflict zones (both entry and exit points)
        const p1Zones = this.calculateP1ConflictZones(this.allPullsByPriority[1] || []);
        if (p1Zones[wall] && p1Zones[wall].conduits) {
            p1Zones[wall].conduits.forEach(conduit => {
                // Calculate radius from min/max values
                const radius = (conduit.max - conduit.min) / 2;
                conduits.push({
                    center: conduit.center,
                    radius: radius,
                    priority: 1,
                    type: 'P1'
                });
            });
        }
        
        // Add placed conduits from all priorities (entries and exits) but exclude specified pulls
        this.placedConduits.forEach((placement, pullId) => {
            if (excludeIds.has(pullId)) {
                console.log(`    Excluding P${placement.priority} Pull ${pullId} from conflict detection`);
                return; // Skip excluded pulls
            }
            
            // Check entry position
            if (placement.entrySide === wall) {
                const entryPos = placement.entryPosition3D;
                const radius = (locknutODSpacing[parseFloat(placement.conduitSize)] || parseFloat(placement.conduitSize) + 0.5) * PIXELS_PER_INCH / 2;
                const center = (wall === 'left' || wall === 'right') ? entryPos.y : entryPos.x;
                
                conduits.push({
                    center: center,
                    radius: radius,
                    priority: placement.priority,
                    type: `P${placement.priority}-entry`,
                    pullId: pullId
                });
            }
            
            // Check exit position
            if (placement.exitSide === wall) {
                const exitPos = placement.exitPosition3D;
                const radius = (locknutODSpacing[parseFloat(placement.conduitSize)] || parseFloat(placement.conduitSize) + 0.5) * PIXELS_PER_INCH / 2;
                const center = (wall === 'left' || wall === 'right') ? exitPos.y : exitPos.x;
                
                conduits.push({
                    center: center,
                    radius: radius,
                    priority: placement.priority,
                    type: `P${placement.priority}-exit`,
                    pullId: pullId
                });
            }
        });
        
        // Log found conduits
        conduits.forEach(conduit => {
            console.log(`    ${conduit.type} at ${(conduit.center/PIXELS_PER_INCH).toFixed(1)}" (±${(conduit.radius/PIXELS_PER_INCH).toFixed(1)}") spans ${((conduit.center-conduit.radius)/PIXELS_PER_INCH).toFixed(1)}" to ${((conduit.center+conduit.radius)/PIXELS_PER_INCH).toFixed(1)}"`);
        });
        
        return conduits;
    }

    /**
     * Calculate required spacing for a group of pulls
     */
    getRequiredSpacingForPulls(pulls) {
        if (pulls.length === 0) return 0;
        
        const largestSize = Math.max(...pulls.map(p => parseFloat(p.conduitSize)));
        const spacing = (locknutODSpacing[largestSize] || largestSize + 0.5) * PIXELS_PER_INCH;
        return pulls.length * spacing;
    }

    /**
     * Calculate position on a specific wall with offset
     */
    calculateWallPosition(wall, offset) {
        const basePos = get3DPosition(wall, this.boxWidth, this.boxHeight, this.boxDepth);
        
        // Apply offset based on wall orientation
        switch(wall) {
            case 'left':
            case 'right':
                return { x: basePos.x, y: basePos.y + offset, z: basePos.z };
            case 'top':
            case 'bottom':
                return { x: basePos.x + offset, y: basePos.y, z: basePos.z };
            case 'rear':
                return { x: basePos.x + offset, y: basePos.y, z: basePos.z };
            default:
                return basePos;
        }
    }

    /**
     * Mark a P4 pull as already placed so it's not processed again
     */
    markP4PullAsPlaced(p4Pull) {
        // Set a flag to indicate this P4 pull has been handled
        p4Pull._placedWithP3 = true;
    }

    /**
     * Arrange Priority 4 (side-to-rear pulls) according to decision tree logic
     */
    arrangePriority4(pulls, allPullsByPriority) {
        console.log(`Processing Priority 4: ${pulls.length} pulls`);
        
        // Filter out P4 pulls that were already placed with P3
        const unplacedPulls = pulls.filter(pull => !pull._placedWithP3);
        const alreadyPlaced = pulls.length - unplacedPulls.length;
        
        if (alreadyPlaced > 0) {
            console.log(`Priority 4: ${alreadyPlaced} pulls already placed with P3, processing ${unplacedPulls.length} remaining`);
        }
        
        if (unplacedPulls.length === 0) {
            console.log('Priority 4: All pulls already handled with P3 - skipping');
            return;
        }
        
        // Check if Priority 1, 2, or 3 conduits exist
        const higherPrioritiesExist = [1, 2, 3].some(p => 
            allPullsByPriority[p] && allPullsByPriority[p].length > 0
        );
        
        if (!higherPrioritiesExist) {
            // IF the job contains NO Priority 1, 2, or 3 conduits
            // THEN arrange Priority 4 conduits the normal way using optimizeSideToRearPullsWithLinearPacking()
            console.log('Priority 4: No higher priority conduits - arranging normally');
            this.arrangePriority4Normally(unplacedPulls);
        } else {
            // ELSE (one or more higher priorities present)
            console.log('Priority 4: Higher priorities exist - checking wall sharing for each pull');
            this.arrangePriority4WithHigherPriorities(unplacedPulls, allPullsByPriority);
        }
    }

    /**
     * Arrange all Priority 4 pulls normally (when no higher priorities exist)
     */
    arrangePriority4Normally(pulls) {
        console.log(`Arranging ${pulls.length} Priority 4 pulls normally using optimizeSideToRearPullsWithLinearPacking`);
        
        // Call the existing side-to-rear pull optimization function directly
        optimizeSideToRearPullsWithLinearPacking(
            pulls,
            this.boxWidth,
            this.boxHeight,
            this.boxDepth,
            this.isParallelMode
        );
        
        // Store the results from the optimization
        pulls.forEach(pull => {
            this.placedConduits.set(pull.id, {
                wall: pull.entrySide,
                entryPosition3D: pull.customEntryPoint3D || get3DPosition(pull.entrySide, this.boxWidth, this.boxHeight, this.boxDepth),
                exitPosition3D: pull.customExitPoint3D || get3DPosition(pull.exitSide, this.boxWidth, this.boxHeight, this.boxDepth),
                priority: 4,
                entrySide: pull.entrySide,
                exitSide: pull.exitSide,
                conduitSize: pull.conduitSize
            });
            
            const entry = this.placedConduits.get(pull.id).entryPosition3D;
            const exit = this.placedConduits.get(pull.id).exitPosition3D;
            console.log(`P4 Pull ${pull.id}: Entry(${entry.x.toFixed(1)}, ${entry.y.toFixed(1)}, ${entry.z.toFixed(1)}) Exit(${exit.x.toFixed(1)}, ${exit.y.toFixed(1)}, ${exit.z.toFixed(1)})`);
        });
    }

    /**
     * Arrange Priority 4 when higher priorities exist - check each pull for wall sharing
     */
    arrangePriority4WithHigherPriorities(p4Pulls, allPullsByPriority) {
        const higherPriorityPulls = [
            ...(allPullsByPriority[1] || []),
            ...(allPullsByPriority[2] || []),
            ...(allPullsByPriority[3] || [])
        ];
        
        console.log(`Checking wall sharing for ${p4Pulls.length} Priority 4 pulls against higher priorities`);
        
        // In complex scenarios, all P4 conduits use constraint-based placement
        // This handles both cases: gap detection for P1/P2 conflicts, or wall centering when no conflicts
        p4Pulls.forEach(pull => {
            console.log(`P4 Pull ${pull.id}: Using constraint-based placement for complex scenario`);
            this.arrangeSingleP4PullWithPlaceholder(pull, allPullsByPriority);
        });
    }

    /**
     * Arrange a single Priority 4 pull normally (when no wall sharing)
     */
    arrangeSingleP4PullNormally(pull) {
        // Create single-pull array and use existing optimization
        const singlePullArray = [pull];
        
        optimizeSideToRearPullsWithLinearPacking(
            singlePullArray,
            this.boxWidth,
            this.boxHeight,
            this.boxDepth,
            this.isParallelMode
        );
        
        // Store the result
        this.placedConduits.set(pull.id, {
            wall: pull.entrySide,
            entryPosition3D: pull.customEntryPoint3D || get3DPosition(pull.entrySide, this.boxWidth, this.boxHeight, this.boxDepth),
            exitPosition3D: pull.customExitPoint3D || get3DPosition(pull.exitSide, this.boxWidth, this.boxHeight, this.boxDepth),
            priority: 4,
            entrySide: pull.entrySide,
            exitSide: pull.exitSide,
            conduitSize: pull.conduitSize
        });
        
        // Log the result
        const entry = this.placedConduits.get(pull.id).entryPosition3D;
        const exit = this.placedConduits.get(pull.id).exitPosition3D;
        console.log(`P4 Pull ${pull.id}: Entry(${entry.x.toFixed(1)}, ${entry.y.toFixed(1)}, ${entry.z.toFixed(1)}) Exit(${exit.x.toFixed(1)}, ${exit.y.toFixed(1)}, ${exit.z.toFixed(1)})`);
    }

    /**
     * Arrange a single Priority 4 pull using constraint-based placement
     */
    arrangeSingleP4PullWithPlaceholder(pull, allPullsByPriority) {
        // Check if P4 shares walls specifically with P1/P2 (excluding P3)
        const sharesWallWithP1P2 = this.doesP4ShareWallWithP1OrP2Only(pull, allPullsByPriority);
        
        let centerPosition;
        
        if (sharesWallWithP1P2) {
            // Case 1: P4 shares wall with P1 and/or P2 - use gap detection
            console.log(`P4 Pull ${pull.id}: Shares wall with P1/P2 - finding no-conflict zone`);
            
            // Calculate spacing needed for this single P4 conduit
            const conduitSize = parseFloat(pull.conduitSize);
            const spacing = (locknutODSpacing[conduitSize] || conduitSize + 0.5) * PIXELS_PER_INCH;
            
            // Find gap center avoiding P1 and P2 conflicts
            centerPosition = this.findBestGapCenterForGroup(pull.entrySide, spacing, 1);
            
            console.log(`P4 Pull ${pull.id}: Using gap center at ${(centerPosition/PIXELS_PER_INCH).toFixed(1)}" on ${pull.entrySide} wall`);
        } else {
            // Case 2: P4 doesn't share walls with P1, P2, or P3 - center on wall
            console.log(`P4 Pull ${pull.id}: No wall sharing with P1/P2/P3 - centering on ${pull.entrySide} wall`);
            
            const basePos = get3DPosition(pull.entrySide, this.boxWidth, this.boxHeight, this.boxDepth);
            centerPosition = (pull.entrySide === 'left' || pull.entrySide === 'right') ? basePos.y : basePos.x;
            
            console.log(`P4 Pull ${pull.id}: Using wall center at ${(centerPosition/PIXELS_PER_INCH).toFixed(1)}" on ${pull.entrySide} wall`);
        }
        
        // Use existing P4 positioning logic (same as P3+P4 grouping)
        this.positionP4PullsOnWall([pull], pull.entrySide, centerPosition, 4);
    }

    /**
     * Arrange Priority 5 (rear-to-rear pulls) according to decision tree logic
     */
    arrangePriority5(pulls, allPullsByPriority) {
        console.log(`Processing Priority 5: ${pulls.length} pulls`);
        
        // Check if Priority 1, 2, 3, or 4 conduits exist
        const higherPrioritiesExist = [1, 2, 3, 4].some(p => 
            allPullsByPriority[p] && allPullsByPriority[p].length > 0
        );
        
        if (!higherPrioritiesExist) {
            // IF the job contains NO Priority 1, 2, 3, or 4 conduits
            // THEN arrange Priority 5 conduits the normal way using optimizeRearToRearPullsWithLinearPacking()
            console.log('Priority 5: No higher priority conduits - arranging normally');
            this.arrangePriority5Normally(pulls);
        } else {
            // ELSE (one or more higher priorities present)
            console.log('Priority 5: Higher priorities exist - checking wall sharing for each pull');
            this.arrangePriority5WithHigherPriorities(pulls, allPullsByPriority);
        }
    }

    /**
     * Arrange all Priority 5 pulls normally (when no higher priorities exist)
     */
    arrangePriority5Normally(pulls) {
        console.log(`Arranging ${pulls.length} Priority 5 pulls normally using optimizeRearToRearPullsWithLinearPacking`);
        
        // Call the existing rear-to-rear pull optimization function directly
        optimizeRearToRearPullsWithLinearPacking(
            pulls,
            this.boxWidth,
            this.boxHeight,
            this.boxDepth,
            this.isParallelMode
        );
        
        // Store the results from the optimization
        pulls.forEach(pull => {
            this.placedConduits.set(pull.id, {
                wall: pull.entrySide,
                entryPosition3D: pull.customEntryPoint3D || get3DPosition(pull.entrySide, this.boxWidth, this.boxHeight, this.boxDepth),
                exitPosition3D: pull.customExitPoint3D || get3DPosition(pull.exitSide, this.boxWidth, this.boxHeight, this.boxDepth),
                priority: 5,
                entrySide: pull.entrySide,
                exitSide: pull.exitSide,
                conduitSize: pull.conduitSize
            });
            
            const entry = this.placedConduits.get(pull.id).entryPosition3D;
            const exit = this.placedConduits.get(pull.id).exitPosition3D;
            console.log(`P5 Pull ${pull.id}: Entry(${entry.x.toFixed(1)}, ${entry.y.toFixed(1)}, ${entry.z.toFixed(1)}) Exit(${exit.x.toFixed(1)}, ${exit.y.toFixed(1)}, ${exit.z.toFixed(1)})`);
        });
    }

    /**
     * Arrange Priority 5 when higher priorities exist - check each pull for wall sharing
     */
    arrangePriority5WithHigherPriorities(p5Pulls, allPullsByPriority) {
        const higherPriorityPulls = [
            ...(allPullsByPriority[1] || []),
            ...(allPullsByPriority[2] || []),
            ...(allPullsByPriority[3] || []),
            ...(allPullsByPriority[4] || [])
        ];
        
        console.log(`Checking wall sharing for ${p5Pulls.length} Priority 5 pulls against higher priorities`);
        
        p5Pulls.forEach(pull => {
            const hasSharedWall = this.doesPullShareWallWithHigherPriorities(pull, higherPriorityPulls);
            
            if (!hasSharedWall) {
                // IF its wall is NOT shared with any higher priority
                // THEN arrange it normally using optimizeRearToRearPullsWithLinearPacking()
                console.log(`P5 Pull ${pull.id}: No shared walls with higher priorities - arranging normally`);
                this.arrangeSingleP5PullNormally(pull);
            } else {
                // IF its wall is shared with higher priorities
                // THEN use placeholder logic (constraint-based placement)
                console.log(`P5 Pull ${pull.id}: Shared wall with higher priorities - using placeholder logic`);
                this.arrangeSingleP5PullWithPlaceholder(pull);
            }
        });
    }

    /**
     * Arrange a single Priority 5 pull normally (when no wall sharing)
     */
    arrangeSingleP5PullNormally(pull) {
        // Create single-pull array and use existing optimization
        const singlePullArray = [pull];
        
        optimizeRearToRearPullsWithLinearPacking(
            singlePullArray,
            this.boxWidth,
            this.boxHeight,
            this.boxDepth,
            this.isParallelMode
        );
        
        // Store the result
        this.placedConduits.set(pull.id, {
            wall: pull.entrySide,
            entryPosition3D: pull.customEntryPoint3D || get3DPosition(pull.entrySide, this.boxWidth, this.boxHeight, this.boxDepth),
            exitPosition3D: pull.customExitPoint3D || get3DPosition(pull.exitSide, this.boxWidth, this.boxHeight, this.boxDepth),
            priority: 5,
            entrySide: pull.entrySide,
            exitSide: pull.exitSide,
            conduitSize: pull.conduitSize
        });
        
        // Log the result
        const entry = this.placedConduits.get(pull.id).entryPosition3D;
        const exit = this.placedConduits.get(pull.id).exitPosition3D;
        console.log(`P5 Pull ${pull.id}: Entry(${entry.x.toFixed(1)}, ${entry.y.toFixed(1)}, ${entry.z.toFixed(1)}) Exit(${exit.x.toFixed(1)}, ${exit.y.toFixed(1)}, ${exit.z.toFixed(1)})`);
    }

    /**
     * Arrange a single Priority 5 pull using placeholder logic
     */
    arrangeSingleP5PullWithPlaceholder(pull) {
        // Use the same placeholder logic - just center on walls
        const defaultEntry = get3DPosition(pull.entrySide, this.boxWidth, this.boxHeight, this.boxDepth);
        const defaultExit = get3DPosition(pull.exitSide, this.boxWidth, this.boxHeight, this.boxDepth);
        
        this.placedConduits.set(pull.id, {
            wall: pull.entrySide,
            entryPosition3D: defaultEntry,
            exitPosition3D: defaultExit,
            priority: 5,
            entrySide: pull.entrySide,
            exitSide: pull.exitSide,
            conduitSize: pull.conduitSize
        });
        
        console.log(`P5 Pull ${pull.id} (placeholder): Entry(${defaultEntry.x.toFixed(1)}, ${defaultEntry.y.toFixed(1)}, ${defaultEntry.z.toFixed(1)}) Exit(${defaultExit.x.toFixed(1)}, ${defaultExit.y.toFixed(1)}, ${defaultExit.z.toFixed(1)})`);
    }

    /**
     * Check if a pull shares any wall with higher priority pulls (generalized version)
     */
    doesPullShareWallWithHigherPriorities(pull, higherPriorityPulls) {
        const pullWalls = [pull.entrySide];
        if (pull.exitSide !== pull.entrySide) {
            pullWalls.push(pull.exitSide);
        }
        
        return higherPriorityPulls.some(higherPull => {
            const higherWalls = [higherPull.entrySide];
            if (higherPull.exitSide !== higherPull.entrySide) {
                higherWalls.push(higherPull.exitSide);
            }
            
            // Check if any pull wall matches any higher priority wall
            return pullWalls.some(wall => higherWalls.includes(wall));
        });
    }

    /**
     * Check if P4 pull shares walls with P1 and/or P2 only (excluding P3)
     */
    doesP4ShareWallWithP1OrP2Only(p4Pull, allPullsByPriority) {
        const p4Walls = [p4Pull.entrySide];
        if (p4Pull.exitSide !== p4Pull.entrySide) {
            p4Walls.push(p4Pull.exitSide);
        }
        
        // Check P1 and P2 pulls only
        const p1Pulls = allPullsByPriority[1] || [];
        const p2Pulls = allPullsByPriority[2] || [];
        const p1P2Pulls = [...p1Pulls, ...p2Pulls];
        
        return p1P2Pulls.some(higherPull => {
            const higherWalls = [higherPull.entrySide];
            if (higherPull.exitSide !== higherPull.entrySide) {
                higherWalls.push(higherPull.exitSide);
            }
            
            // Check if any P4 wall matches any P1/P2 wall
            return p4Walls.some(wall => higherWalls.includes(wall));
        });
    }

    /**
     * Arrange Priority 1 (U-pulls) using optimizeSidewallUPullsWithSpreadStrategy
     */
    arrangePriority1(pulls) {
        console.log('Using optimizeSidewallUPullsWithSpreadStrategy for Priority 1');
        
        // Group pulls by wall (left-left, right-right, etc.)
        const pullsByWall = this.groupPullsByWall(pulls);
        
        // Arrange each wall group using the correct U-pull function
        for (const [wall, wallPulls] of Object.entries(pullsByWall)) {
            if (wallPulls.length > 0) {
                console.log(`Arranging ${wallPulls.length} U-pulls on ${wall} wall using optimizeSidewallUPullsWithSpreadStrategy`);
                this.arrangeUPullWallGroup(wallPulls, wall);
            }
        }
    }
    
    /**
     * Group pulls by their wall (assuming U-pulls have same entry/exit)
     */
    groupPullsByWall(pulls) {
        const groups = {
            left: [],
            right: [],
            top: [],
            bottom: [],
            rear: []
        };
        
        pulls.forEach(pull => {
            // For Priority 1 U-pulls, entrySide === exitSide
            if (pull.entrySide === pull.exitSide) {
                groups[pull.entrySide].push(pull);
            }
        });
        
        return groups;
    }
    
    /**
     * Arrange a group of U-pulls on the same wall using optimizeSidewallUPullsWithSpreadStrategy
     */
    arrangeUPullWallGroup(wallPulls, wall) {
        console.log(`Calling optimizeSidewallUPullsWithSpreadStrategy for ${wallPulls.length} pulls on ${wall} wall`);
        
        // Call the existing U-pull optimization function directly
        optimizeSidewallUPullsWithSpreadStrategy(
            wallPulls,
            this.boxWidth,
            this.boxHeight,
            this.boxDepth,
            this.isParallelMode
        );
        
        // Store the results from the optimization
        wallPulls.forEach(pull => {
            // The optimization function should have set customEntryPoint3D and customExitPoint3D
            this.placedConduits.set(pull.id, {
                wall: wall,
                entryPosition3D: pull.customEntryPoint3D || get3DPosition(pull.entrySide, this.boxWidth, this.boxHeight, this.boxDepth),
                exitPosition3D: pull.customExitPoint3D || get3DPosition(pull.exitSide, this.boxWidth, this.boxHeight, this.boxDepth),
                priority: 1,
                entrySide: pull.entrySide,
                exitSide: pull.exitSide,
                conduitSize: pull.conduitSize
            });
            
            const entry = this.placedConduits.get(pull.id).entryPosition3D;
            const exit = this.placedConduits.get(pull.id).exitPosition3D;
            console.log(`P1 Pull ${pull.id}: Entry(${entry.x.toFixed(1)}, ${entry.y.toFixed(1)}, ${entry.z.toFixed(1)}) Exit(${exit.x.toFixed(1)}, ${exit.y.toFixed(1)}, ${exit.z.toFixed(1)})`);
        });
    }
    
    /**
     * Placeholder arrangement for non-P1 priorities
     */
    arrangePlaceholder(pulls, priority) {
        pulls.forEach((pull, index) => {
            // Placeholder: simple arrangement for now
            const defaultEntry = get3DPosition(pull.entrySide, this.boxWidth, this.boxHeight, this.boxDepth);
            const defaultExit = get3DPosition(pull.exitSide, this.boxWidth, this.boxHeight, this.boxDepth);
            
            // Apply simple offset for now
            if (pull.entrySide === 'left' || pull.entrySide === 'right') {
                defaultEntry.y += index * 50;
                defaultExit.y += index * 50;
            } else if (pull.entrySide === 'top' || pull.entrySide === 'bottom') {
                defaultEntry.x += index * 50;
                defaultExit.x += index * 50;
            } else if (pull.entrySide === 'rear') {
                defaultEntry.x += index * 50;
                defaultExit.x += index * 50;
            }
            
            this.placedConduits.set(pull.id, {
                wall: pull.entrySide,
                entryPosition3D: defaultEntry,
                exitPosition3D: defaultExit,
                priority: priority,
                entrySide: pull.entrySide,
                exitSide: pull.exitSide,
                conduitSize: pull.conduitSize
            });
        });
    }
    
    /**
     * Arrange pulls considering higher priority constraints
     */
    arrangeWithPriorityConsideration(pulls, currentPriority, higherPriorities, allPullsByPriority) {
        console.log(`Arranging ${pulls.length} Priority ${currentPriority} pulls with higher priority constraints`);
        
        if (currentPriority === 2) {
            // Priority 2: Use decision tree logic with higher priority constraints
            this.arrangePriority2(pulls, allPullsByPriority);
        } else if (currentPriority === 3) {
            // Priority 3: Use decision tree logic with higher priority constraints
            this.arrangePriority3(pulls, allPullsByPriority);
        } else if (currentPriority === 4) {
            // Priority 4: Use decision tree logic with higher priority constraints
            this.arrangePriority4(pulls, allPullsByPriority);
        } else if (currentPriority === 5) {
            // Priority 5: Use decision tree logic with higher priority constraints
            this.arrangePriority5(pulls, allPullsByPriority);
        } else {
            // Other priorities: use existing placeholder logic
            this.arrangeWithPlaceholderConstraints(pulls, currentPriority, higherPriorities);
        }
    }
    
    /**
     * Existing placeholder constraint logic for non-P2 priorities
     */
    arrangeWithPlaceholderConstraints(pulls, currentPriority, higherPriorities) {
        console.log(`Using placeholder constraint logic for Priority ${currentPriority}`);
        
        // TODO: Implement wall sharing detection and coordination
        // For now, basic implementation to avoid overlaps
        
        pulls.forEach((pull, index) => {
            // Placeholder: offset arrangement to avoid higher priorities
            const offset = higherPriorities.length * 100; // Simple offset strategy
            
            // TODO: Replace with actual arrangement logic considering higher priorities
            const defaultEntry = get3DPosition(pull.entrySide, this.boxWidth, this.boxHeight, this.boxDepth);
            const defaultExit = get3DPosition(pull.exitSide, this.boxWidth, this.boxHeight, this.boxDepth);
            
            // Apply offset for higher priority avoidance
            if (pull.entrySide === 'left' || pull.entrySide === 'right') {
                defaultEntry.y += offset + (index * 50);
                defaultExit.y += offset + (index * 50);
            } else if (pull.entrySide === 'top' || pull.entrySide === 'bottom') {
                defaultEntry.x += offset + (index * 50);
                defaultExit.x += offset + (index * 50);
            } else if (pull.entrySide === 'rear') {
                defaultEntry.x += offset + (index * 50);
                defaultExit.x += offset + (index * 50);
            }
            
            this.placedConduits.set(pull.id, {
                wall: pull.entrySide,
                entryPosition3D: defaultEntry,
                exitPosition3D: defaultExit,
                priority: currentPriority,
                entrySide: pull.entrySide,
                exitSide: pull.exitSide,
                conduitSize: pull.conduitSize
            });
        });
    }
}

// ============================================================================
// INTEGRATION FUNCTIONS
// ============================================================================

/**
 * Apply complex arrangement results to 3D scene
 * @param {Map} placedConduits - Results from ComplexPullManager
 */
function applyComplexArrangementTo3D(placedConduits) {
    console.log('Applying complex arrangement to 3D scene...');
    
    // TODO: Implement 3D scene integration
    // For now, just log the results
    
    placedConduits.forEach((placement, pullId) => {
        console.log(`Pull ${pullId}: ${placement.entrySide}->${placement.exitSide} at ${placement.wall} (Priority ${placement.priority})`);
        console.log(`  Entry: (${placement.entryPosition3D.x.toFixed(1)}, ${placement.entryPosition3D.y.toFixed(1)}, ${placement.entryPosition3D.z.toFixed(1)})`);
        console.log(`  Exit: (${placement.exitPosition3D.x.toFixed(1)}, ${placement.exitPosition3D.y.toFixed(1)}, ${placement.exitPosition3D.z.toFixed(1)})`);
        
        // Find the pull object and update its custom positions
        const pull = pulls.find(p => p.id == pullId);
        if (pull) {
            // Use the stored 3D coordinates directly
            pull.customEntryPoint3D = placement.entryPosition3D;
            pull.customExitPoint3D = placement.exitPosition3D;
        }
    });
    
    // Save the updated positions to localStorage so they persist on refresh
    if (typeof savePullsToStorage === 'function') {
        savePullsToStorage();
    }
    
    // TODO: Update actual 3D positions based on placement results
}

console.log('Complex Pull Manager loaded successfully');