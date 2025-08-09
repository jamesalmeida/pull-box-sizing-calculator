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
     */
    calculateP1ConflictZones(p1Pulls) {
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
            
            // Determine which P1 conduit blocks P2's desired starting position
            if ((wall === 'left' || wall === 'right') && corner === 'bottom') {
                // P2 wants to start at bottom and go up - find lowest P1 conduit
                return conduits[0]; // Already sorted, first is lowest
            } else if ((wall === 'left' || wall === 'right') && corner === 'top') {
                // P2 wants to start at top and go down - find highest P1 conduit
                return conduits[conduits.length - 1]; // Last is highest
            } else if ((wall === 'top' || wall === 'bottom') && corner === 'left') {
                // P2 wants to start at left and go right - find leftmost P1 conduit
                return conduits[0]; // First is leftmost
            } else if ((wall === 'top' || wall === 'bottom') && corner === 'right') {
                // P2 wants to start at right and go left - find rightmost P1 conduit
                return conduits[conduits.length - 1]; // Last is rightmost
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
            console.log('Priority 3: Higher priorities exist - checking wall sharing for each pull');
            this.arrangePriority3WithHigherPriorities(pulls, allPullsByPriority);
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
        
        p3Pulls.forEach(pull => {
            const hasSharedWall = this.doesPullShareWallWithHigherPriorities(pull, higherPriorityPulls);
            
            if (!hasSharedWall) {
                // IF its wall is NOT shared with P1 or P2
                // THEN arrange it normally using optimizeStraightPullsWithLinearAlignment()
                console.log(`P3 Pull ${pull.id}: No shared walls with higher priorities - arranging normally`);
                this.arrangeSingleP3PullNormally(pull);
            } else {
                // IF its wall is shared with higher priorities
                // THEN use placeholder logic (constraint-based placement)
                console.log(`P3 Pull ${pull.id}: Shared wall with higher priorities - using placeholder logic`);
                this.arrangeSingleP3PullWithPlaceholder(pull);
            }
        });
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
     * Arrange a single Priority 3 pull using placeholder logic
     */
    arrangeSingleP3PullWithPlaceholder(pull) {
        // Use the same placeholder logic - just center on walls
        const defaultEntry = get3DPosition(pull.entrySide, this.boxWidth, this.boxHeight, this.boxDepth);
        const defaultExit = get3DPosition(pull.exitSide, this.boxWidth, this.boxHeight, this.boxDepth);
        
        this.placedConduits.set(pull.id, {
            wall: pull.entrySide,
            entryPosition3D: defaultEntry,
            exitPosition3D: defaultExit,
            priority: 3,
            entrySide: pull.entrySide,
            exitSide: pull.exitSide,
            conduitSize: pull.conduitSize
        });
        
        console.log(`P3 Pull ${pull.id} (placeholder): Entry(${defaultEntry.x.toFixed(1)}, ${defaultEntry.y.toFixed(1)}, ${defaultEntry.z.toFixed(1)}) Exit(${defaultExit.x.toFixed(1)}, ${defaultExit.y.toFixed(1)}, ${defaultExit.z.toFixed(1)})`);
    }

    /**
     * Arrange Priority 4 (side-to-rear pulls) according to decision tree logic
     */
    arrangePriority4(pulls, allPullsByPriority) {
        console.log(`Processing Priority 4: ${pulls.length} pulls`);
        
        // Check if Priority 1, 2, or 3 conduits exist
        const higherPrioritiesExist = [1, 2, 3].some(p => 
            allPullsByPriority[p] && allPullsByPriority[p].length > 0
        );
        
        if (!higherPrioritiesExist) {
            // IF the job contains NO Priority 1, 2, or 3 conduits
            // THEN arrange Priority 4 conduits the normal way using optimizeSideToRearPullsWithLinearPacking()
            console.log('Priority 4: No higher priority conduits - arranging normally');
            this.arrangePriority4Normally(pulls);
        } else {
            // ELSE (one or more higher priorities present)
            console.log('Priority 4: Higher priorities exist - checking wall sharing for each pull');
            this.arrangePriority4WithHigherPriorities(pulls, allPullsByPriority);
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
        
        p4Pulls.forEach(pull => {
            const hasSharedWall = this.doesPullShareWallWithHigherPriorities(pull, higherPriorityPulls);
            
            if (!hasSharedWall) {
                // IF its wall is NOT shared with P1, P2, or P3
                // THEN arrange it normally using optimizeSideToRearPullsWithLinearPacking()
                console.log(`P4 Pull ${pull.id}: No shared walls with higher priorities - arranging normally`);
                this.arrangeSingleP4PullNormally(pull);
            } else {
                // IF its wall is shared with higher priorities
                // THEN use placeholder logic (constraint-based placement)
                console.log(`P4 Pull ${pull.id}: Shared wall with higher priorities - using placeholder logic`);
                this.arrangeSingleP4PullWithPlaceholder(pull);
            }
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
     * Arrange a single Priority 4 pull using placeholder logic
     */
    arrangeSingleP4PullWithPlaceholder(pull) {
        // Use the same placeholder logic - just center on walls
        const defaultEntry = get3DPosition(pull.entrySide, this.boxWidth, this.boxHeight, this.boxDepth);
        const defaultExit = get3DPosition(pull.exitSide, this.boxWidth, this.boxHeight, this.boxDepth);
        
        this.placedConduits.set(pull.id, {
            wall: pull.entrySide,
            entryPosition3D: defaultEntry,
            exitPosition3D: defaultExit,
            priority: 4,
            entrySide: pull.entrySide,
            exitSide: pull.exitSide,
            conduitSize: pull.conduitSize
        });
        
        console.log(`P4 Pull ${pull.id} (placeholder): Entry(${defaultEntry.x.toFixed(1)}, ${defaultEntry.y.toFixed(1)}, ${defaultEntry.z.toFixed(1)}) Exit(${defaultExit.x.toFixed(1)}, ${defaultExit.y.toFixed(1)}, ${defaultExit.z.toFixed(1)})`);
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
    
    // TODO: Update actual 3D positions based on placement results
}

console.log('Complex Pull Manager loaded successfully');