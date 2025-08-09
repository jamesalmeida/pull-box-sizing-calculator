// ANGLE PULL FUNCTIONS REFERENCE FROM script.js
// This file contains all angle pull related functions for reference
// DO NOT EXECUTE - FOR REFERENCE ONLY

// ============================================
// CONSTANTS
// ============================================

const PIXELS_PER_INCH = 25;

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

// ============================================
// MAIN ANGLE PULL FUNCTIONS
// ============================================

// Main entry point for angle pull optimization
function optimizeAnglePullsWithClustering(anglePulls, boxWidth, boxHeight, boxDepth, isParallelMode = false) {
    console.log(`Angle pulls optimization - Mode: ${isParallelMode ? 'Parallel' : 'Non-parallel'}`);
    // Different logic for parallel vs non-parallel mode implemented below
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
            clusterAnglePullGroup(groupPulls, boxWidth, boxHeight, boxDepth, isParallelMode);
        }
    });
}

// Core clustering function that handles parallel vs non-parallel modes
function clusterAnglePullGroup(groupPulls, boxWidth, boxHeight, boxDepth, isParallelMode = false) {
    const firstPull = groupPulls[0];
    const entryWall = firstPull.entrySide;
    const exitWall = firstPull.exitSide;
    
    console.log(`Clustering ${groupPulls.length} ${entryWall}/${exitWall} pulls for maximum raceway distances (${isParallelMode ? 'parallel' : 'non-parallel'} mode)`);
    
    // Determine optimal clustering corner for this angle type
    const clusterStrategy = getClusterStrategy(entryWall, exitWall, boxWidth, boxHeight, boxDepth);
    
    // Sort pulls by size (largest first) for better packing
    groupPulls.sort((a, b) => parseFloat(b.conduitSize) - parseFloat(a.conduitSize));
    
    if (isParallelMode) {
        // Parallel mode (isParallelMode = true): Use nested logic
        console.log('Using nested arrangement - conduits maintain order');
        
        // Position conduits in a tight cluster (original logic)
        groupPulls.forEach((pull, index) => {
            const positions = getClusteredPositions(pull, index, clusterStrategy, groupPulls, boxWidth, boxHeight, boxDepth);
            pull.customEntryPoint3D = positions.entry;
            pull.customExitPoint3D = positions.exit;
        });
    } else {
        // Non-parallel mode (isParallelMode = false): Use crossing logic
        console.log('Using crossing arrangement - conduits will cross each other');
        
        // Position conduits in a tight cluster with crossing pattern
        groupPulls.forEach((pull, index) => {
            const positions = getClusteredPositionsCrossing(pull, index, clusterStrategy, groupPulls, boxWidth, boxHeight, boxDepth);
            pull.customEntryPoint3D = positions.entry;
            pull.customExitPoint3D = positions.exit;
        });
    }
}

// Determines optimal corner placement for each angle pull type
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

// Position calculation for PARALLEL mode (nested arrangement)
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

// Position calculation for NON-PARALLEL mode (crossing arrangement)
function getClusteredPositionsCrossing(pull, index, strategy, groupPulls, boxWidth, boxHeight, boxDepth) {
    const od = locknutODSpacing[pull.conduitSize] || pull.conduitSize + 0.5;
    const radius = (od * PIXELS_PER_INCH) / 2;
    const spacing = od * PIXELS_PER_INCH; // Full locknut OD spacing to prevent overlap
    
    console.log(`Pull ${pull.id} (index ${index}): conduitSize=${pull.conduitSize}", od=${od}", spacing=${spacing/PIXELS_PER_INCH}" [CROSSING]`);
    
    // Calculate dynamic buffer based on largest conduit in the group
    const largestConduitSize = Math.max(...groupPulls.map(p => parseFloat(p.conduitSize)));
    const largestOD = locknutODSpacing[largestConduitSize] || largestConduitSize + 0.5;
    const dynamicBuffer = (largestOD * PIXELS_PER_INCH) / 2; // Half the largest locknut OD
    
    console.log(`  Group largest conduit: ${largestConduitSize}", buffer: ${(dynamicBuffer/PIXELS_PER_INCH).toFixed(2)}"`);
    
    // Get extreme starting positions for the walls with dynamic buffer
    const entryStart = getWallExtremePosition(pull.entrySide, strategy.entryCorner, dynamicBuffer, boxWidth, boxHeight, boxDepth);
    const exitStart = getWallExtremePosition(pull.exitSide, strategy.exitCorner, dynamicBuffer, boxWidth, boxHeight, boxDepth);
    
    // CROSSING LOGIC: Entry wall uses normal index, Exit wall uses reversed index
    const entryPos = getLinearPackedPosition(entryStart, pull.entrySide, strategy.entryCorner, index, spacing, boxWidth, boxHeight, boxDepth);
    const reversedIndex = groupPulls.length - 1 - index; // Reverse the index for exit wall
    const exitPos = getLinearPackedPosition(exitStart, pull.exitSide, strategy.exitCorner, reversedIndex, spacing, boxWidth, boxHeight, boxDepth);
    
    console.log(`  Entry: start=(${(entryStart.x/PIXELS_PER_INCH).toFixed(1)}, ${(entryStart.y/PIXELS_PER_INCH).toFixed(1)}) -> final=(${(entryPos.x/PIXELS_PER_INCH).toFixed(1)}, ${(entryPos.y/PIXELS_PER_INCH).toFixed(1)}) [index=${index}]`);
    console.log(`  Exit: start=(${(exitStart.x/PIXELS_PER_INCH).toFixed(1)}, ${(exitStart.y/PIXELS_PER_INCH).toFixed(1)}) -> final=(${(exitPos.x/PIXELS_PER_INCH).toFixed(1)}, ${(exitPos.y/PIXELS_PER_INCH).toFixed(1)}) [reversed index=${reversedIndex}]`);
    
    // Lightly constrain positions to stay within wall bounds (trust our linear packing)
    const entryConstrained = lightConstrainToWall(entryPos, pull.entrySide, radius, boxWidth, boxHeight, boxDepth);
    const exitConstrained = lightConstrainToWall(exitPos, pull.exitSide, radius, boxWidth, boxHeight, boxDepth);
    
    return {
        entry: entryConstrained,
        exit: exitConstrained
    };
}

// Gets starting position at wall extremes (corners)
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

// Packs conduits linearly from starting position
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
            if (corner === 'left') {
                position.x += index * spacing; // Move right from left
            } else if (corner === 'right') {
                position.x -= index * spacing; // Move left from right
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

// Ensures positions stay within wall boundaries
function lightConstrainToWall(position, wall, radius, boxWidth, boxHeight, boxDepth) {
    const pos = { ...position };
    const buffer = radius; // Use the conduit radius as buffer
    
    switch (wall) {
        case 'left':
            pos.x = -boxWidth/2; // Always on left wall
            // Constrain Y within wall height
            pos.y = Math.max(-boxHeight/2 + buffer, Math.min(boxHeight/2 - buffer, pos.y));
            // Constrain Z within box depth
            pos.z = Math.max(-boxDepth/2 + buffer, Math.min(boxDepth/2 - buffer, pos.z));
            break;
            
        case 'right':
            pos.x = boxWidth/2; // Always on right wall
            pos.y = Math.max(-boxHeight/2 + buffer, Math.min(boxHeight/2 - buffer, pos.y));
            pos.z = Math.max(-boxDepth/2 + buffer, Math.min(boxDepth/2 - buffer, pos.z));
            break;
            
        case 'top':
            pos.y = boxHeight/2; // Always on top wall
            pos.x = Math.max(-boxWidth/2 + buffer, Math.min(boxWidth/2 - buffer, pos.x));
            pos.z = Math.max(-boxDepth/2 + buffer, Math.min(boxDepth/2 - buffer, pos.z));
            break;
            
        case 'bottom':
            pos.y = -boxHeight/2; // Always on bottom wall
            pos.x = Math.max(-boxWidth/2 + buffer, Math.min(boxWidth/2 - buffer, pos.x));
            pos.z = Math.max(-boxDepth/2 + buffer, Math.min(boxDepth/2 - buffer, pos.z));
            break;
    }
    
    return pos;
}

// Optimizes position for single angle pulls  
function getOptimalPullPositions(pull, index) {
    const entryWall = pull.entrySide;
    const exitWall = pull.exitSide;
    
    // For single angle pulls, position at optimal corners for maximum raceway distance
    const positions = {};
    
    // Entry point optimization
    switch(entryWall) {
        case 'left':
            if (exitWall === 'top' || exitWall === 'right') {
                positions.entry = { x: -currentBoxDimensions.width * PIXELS_PER_INCH / 2, y: -currentBoxDimensions.height * PIXELS_PER_INCH / 2 + 75, z: 0 };
            } else {
                positions.entry = { x: -currentBoxDimensions.width * PIXELS_PER_INCH / 2, y: currentBoxDimensions.height * PIXELS_PER_INCH / 2 - 75, z: 0 };
            }
            break;
        case 'right':
            if (exitWall === 'top' || exitWall === 'left') {
                positions.entry = { x: currentBoxDimensions.width * PIXELS_PER_INCH / 2, y: -currentBoxDimensions.height * PIXELS_PER_INCH / 2 + 75, z: 0 };
            } else {
                positions.entry = { x: currentBoxDimensions.width * PIXELS_PER_INCH / 2, y: currentBoxDimensions.height * PIXELS_PER_INCH / 2 - 75, z: 0 };
            }
            break;
        case 'top':
            if (exitWall === 'left' || exitWall === 'bottom') {
                positions.entry = { x: currentBoxDimensions.width * PIXELS_PER_INCH / 2 - 75, y: currentBoxDimensions.height * PIXELS_PER_INCH / 2, z: 0 };
            } else {
                positions.entry = { x: -currentBoxDimensions.width * PIXELS_PER_INCH / 2 + 75, y: currentBoxDimensions.height * PIXELS_PER_INCH / 2, z: 0 };
            }
            break;
        case 'bottom':
            if (exitWall === 'left' || exitWall === 'top') {
                positions.entry = { x: currentBoxDimensions.width * PIXELS_PER_INCH / 2 - 75, y: -currentBoxDimensions.height * PIXELS_PER_INCH / 2, z: 0 };
            } else {
                positions.entry = { x: -currentBoxDimensions.width * PIXELS_PER_INCH / 2 + 75, y: -currentBoxDimensions.height * PIXELS_PER_INCH / 2, z: 0 };
            }
            break;
    }
    
    // Exit point optimization
    switch(exitWall) {
        case 'left':
            if (entryWall === 'top' || entryWall === 'right') {
                positions.exit = { x: -currentBoxDimensions.width * PIXELS_PER_INCH / 2, y: -currentBoxDimensions.height * PIXELS_PER_INCH / 2 + 75, z: 0 };
            } else {
                positions.exit = { x: -currentBoxDimensions.width * PIXELS_PER_INCH / 2, y: currentBoxDimensions.height * PIXELS_PER_INCH / 2 - 75, z: 0 };
            }
            break;
        case 'right':
            if (entryWall === 'top' || entryWall === 'left') {
                positions.exit = { x: currentBoxDimensions.width * PIXELS_PER_INCH / 2, y: -currentBoxDimensions.height * PIXELS_PER_INCH / 2 + 75, z: 0 };
            } else {
                positions.exit = { x: currentBoxDimensions.width * PIXELS_PER_INCH / 2, y: currentBoxDimensions.height * PIXELS_PER_INCH / 2 - 75, z: 0 };
            }
            break;
        case 'top':
            if (entryWall === 'left' || entryWall === 'bottom') {
                positions.exit = { x: currentBoxDimensions.width * PIXELS_PER_INCH / 2 - 75, y: currentBoxDimensions.height * PIXELS_PER_INCH / 2, z: 0 };
            } else {
                positions.exit = { x: -currentBoxDimensions.width * PIXELS_PER_INCH / 2 + 75, y: currentBoxDimensions.height * PIXELS_PER_INCH / 2, z: 0 };
            }
            break;
        case 'bottom':
            if (entryWall === 'left' || entryWall === 'top') {
                positions.exit = { x: currentBoxDimensions.width * PIXELS_PER_INCH / 2 - 75, y: -currentBoxDimensions.height * PIXELS_PER_INCH / 2, z: 0 };
            } else {
                positions.exit = { x: -currentBoxDimensions.width * PIXELS_PER_INCH / 2 + 75, y: -currentBoxDimensions.height * PIXELS_PER_INCH / 2, z: 0 };
            }
            break;
    }
    
    return positions;
}

// ============================================
// FUNCTION CALL HIERARCHY
// ============================================
/*
optimizeAnglePullsWithClustering()
  ├── Groups pulls by type (left-top, right-bottom, etc.)
  ├── For single pulls: calls getOptimalPullPositions()
  └── For multiple pulls: calls clusterAnglePullGroup()
      ├── Calls getClusterStrategy() to determine corners
      ├── Sorts pulls by size (largest first)
      └── Based on isParallelMode:
          ├── true: calls getClusteredPositions() [nested]
          └── false: calls getClusteredPositionsCrossing() [crossing]
              ├── Both call getWallExtremePosition() for start positions
              ├── Both call getLinearPackedPosition() for packing
              └── Both call lightConstrainToWall() for bounds checking

KEY DIFFERENCE between parallel/non-parallel:
- Both use locknutODSpacing for spacing (prevents overlaps)
- Parallel: entry and exit use same index (conduits run parallel)
- Non-parallel: exit uses reversed index (conduits cross)
*/