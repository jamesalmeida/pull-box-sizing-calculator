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
            this.arrangeNormally(pulls, currentPriority);
        } else {
            console.log(`Priority ${currentPriority}: Higher priorities exist [${higherPriorities.join(', ')}] - using complex arrangement`);
            this.arrangeWithPriorityConsideration(pulls, currentPriority, higherPriorities);
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
    arrangeNormally(pulls, priority) {
        console.log(`Arranging ${pulls.length} Priority ${priority} pulls normally`);
        
        // TODO: For MVP, implement basic arrangement
        // Later: delegate to existing single-priority functions by pull type
        
        pulls.forEach((pull, index) => {
            // Placeholder: simple arrangement for now
            this.placedConduits.set(pull.id, {
                wall: pull.entrySide,
                position: index * 50, // Temporary spacing
                priority: priority,
                entrySide: pull.entrySide,
                exitSide: pull.exitSide
            });
        });
    }
    
    /**
     * Arrange pulls considering higher priority constraints
     */
    arrangeWithPriorityConsideration(pulls, currentPriority, higherPriorities) {
        console.log(`Arranging ${pulls.length} Priority ${currentPriority} pulls with higher priority constraints`);
        
        // TODO: Implement wall sharing detection and coordination
        // For now, basic implementation to avoid overlaps
        
        pulls.forEach((pull, index) => {
            // Placeholder: offset arrangement to avoid higher priorities
            const offset = higherPriorities.length * 100; // Simple offset strategy
            
            this.placedConduits.set(pull.id, {
                wall: pull.entrySide,
                position: offset + (index * 50),
                priority: currentPriority,
                entrySide: pull.entrySide,
                exitSide: pull.exitSide
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
        console.log(`Pull ${pullId}: ${placement.entrySide}->${placement.exitSide} at ${placement.wall} position ${placement.position} (Priority ${placement.priority})`);
    });
    
    // TODO: Update actual 3D positions based on placement results
}

console.log('Complex Pull Manager loaded successfully');