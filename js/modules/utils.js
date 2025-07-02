// Utility Functions Module
import { CONFIG, LOCKNUT_OUTSIDE_DIAMETER_SPACING } from './config.js';

// Convert decimal to fraction string
export function fractionToString(decimal) {
    const fractions = {
        0.5: '1/2',
        0.75: '3/4',
        1.25: '1-1/4',
        1.5: '1-1/2',
        2.5: '2-1/2',
        3.5: '3-1/2'
    };
    
    // Check if decimal has an exact fraction representation
    if (fractions[decimal]) {
        return fractions[decimal];
    }
    
    // Otherwise return the decimal as a string
    return decimal.toString();
}

// Get 3D position for a given side of the box
export function get3DPosition(side, boxWidth, boxHeight, boxDepth) {
    switch (side) {
        case 'left': return { x: -boxWidth / 2, y: 0, z: 0 };
        case 'right': return { x: boxWidth / 2, y: 0, z: 0 };
        case 'top': return { x: 0, y: boxHeight / 2, z: 0 };
        case 'bottom': return { x: 0, y: -boxHeight / 2, z: 0 };
        case 'rear': return { x: 0, y: 0, z: -boxDepth / 2 };
        default: return { x: 0, y: 0, z: 0 };
    }
}

// Reposition conduit to fit within box boundaries
export function repositionConduitToFit(side, conduitSize, currentPoint, boxWidth, boxHeight, boxDepth) {
    const outsideDiameter = LOCKNUT_OUTSIDE_DIAMETER_SPACING[conduitSize] || conduitSize + 0.5;
    const outerRadius = (outsideDiameter / 2) * CONFIG.PIXELS_PER_INCH;
    
    let newPoint = { ...currentPoint };
    
    switch(side) {
        case 'left':
        case 'right':
            // Constrain y and z coordinates
            newPoint.y = Math.max(-(boxHeight * CONFIG.PIXELS_PER_INCH)/2 + outerRadius, 
                         Math.min((boxHeight * CONFIG.PIXELS_PER_INCH)/2 - outerRadius, newPoint.y));
            newPoint.z = Math.max(-(boxDepth * CONFIG.PIXELS_PER_INCH)/2 + outerRadius, 
                         Math.min((boxDepth * CONFIG.PIXELS_PER_INCH)/2 - outerRadius, newPoint.z));
            // Update x to match new wall position
            newPoint.x = (side === 'left' ? -boxWidth/2 : boxWidth/2) * CONFIG.PIXELS_PER_INCH;
            break;
        case 'top':
        case 'bottom':
            // Constrain x and z coordinates
            newPoint.x = Math.max(-(boxWidth * CONFIG.PIXELS_PER_INCH)/2 + outerRadius, 
                         Math.min((boxWidth * CONFIG.PIXELS_PER_INCH)/2 - outerRadius, newPoint.x));
            newPoint.z = Math.max(-(boxDepth * CONFIG.PIXELS_PER_INCH)/2 + outerRadius, 
                         Math.min((boxDepth * CONFIG.PIXELS_PER_INCH)/2 - outerRadius, newPoint.z));
            // Update y to match new wall position
            newPoint.y = (side === 'top' ? boxHeight/2 : -boxHeight/2) * CONFIG.PIXELS_PER_INCH;
            break;
        case 'rear':
            // Constrain x and y coordinates
            newPoint.x = Math.max(-(boxWidth * CONFIG.PIXELS_PER_INCH)/2 + outerRadius, 
                         Math.min((boxWidth * CONFIG.PIXELS_PER_INCH)/2 - outerRadius, newPoint.x));
            newPoint.y = Math.max(-(boxHeight * CONFIG.PIXELS_PER_INCH)/2 + outerRadius, 
                         Math.min((boxHeight * CONFIG.PIXELS_PER_INCH)/2 - outerRadius, newPoint.y));
            // Update z to match new wall position
            newPoint.z = (-boxDepth/2) * CONFIG.PIXELS_PER_INCH;
            break;
    }
    
    return newPoint;
}

// Easing function for smooth animation
export function easeInOutCubic(t) {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Check if a wall can fit a conduit
export function canWallFitConduit(side, outsideDiameter, width, height, depth) {
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

// Check if conduit fits within wall boundaries
export function checkConduitFit(side, conduitSize, customPoint, currentBoxDimensions) {
    const outsideDiameter = LOCKNUT_OUTSIDE_DIAMETER_SPACING[conduitSize] || conduitSize + 0.5;
    const outerRadius = outsideDiameter / 2; // in inches
    
    // Get wall dimensions
    const width = currentBoxDimensions.width;
    const height = currentBoxDimensions.height;
    const depth = currentBoxDimensions.depth;
    
    // Get position (default center or custom)
    let position = { x: 0, y: 0, z: 0 };
    if (customPoint) {
        position = {
            x: customPoint.x / CONFIG.PIXELS_PER_INCH,
            y: customPoint.y / CONFIG.PIXELS_PER_INCH,
            z: customPoint.z / CONFIG.PIXELS_PER_INCH
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