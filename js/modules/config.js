// Configuration and Constants Module
export const CONFIG = {
    // Scale factor for visualization
    PIXELS_PER_INCH: 25,
    
    // Default box dimensions
    DEFAULT_BOX_DIMENSIONS: {
        width: 12,
        height: 12,
        depth: 4
    },
    
    // ViewCube settings
    VIEW_CUBE_SIZE: 120, // Size in pixels
    
    // Animation settings
    ANIMATION_DURATION: 1000, // milliseconds
};

// Locknut outside diameter spacing in inches (per NEC)
export const LOCKNUT_OUTSIDE_DIAMETER_SPACING = {
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
export const ACTUAL_CONDUIT_OD = {
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

// Conduit throat depths
export const CONDUIT_THROAT_DEPTHS = {
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

// Conductor sizes and their depths (used for rear pulls)
export const CONDUCTOR_SIZE_DEPTHS = {
    '16': 0.5,    // 16 AWG
    '14': 0.5,    // 14 AWG
    '12': 0.625,  // 12 AWG
    '10': 0.75,   // 10 AWG
    '8': 0.875,   // 8 AWG
    '6': 1,       // 6 AWG
    '4': 1.25,    // 4 AWG
    '3': 1.375,   // 3 AWG
    '2': 1.5,     // 2 AWG
    '1': 1.625,   // 1 AWG
    '1/0': 1.875, // 1/0 AWG
    '2/0': 2,     // 2/0 AWG
    '3/0': 2.25,  // 3/0 AWG
    '4/0': 2.5,   // 4/0 AWG
    '250': 2.75,  // 250 kcmil
    '300': 3,     // 300 kcmil
    '350': 3.25,  // 350 kcmil
    '400': 3.5,   // 400 kcmil
    '500': 4,     // 500 kcmil
    '600': 4.5,   // 600 kcmil
    '750': 5,     // 750 kcmil
    '900': 5.5,   // 900 kcmil
    '1000': 6,    // 1000 kcmil
    '1250': 6.5,  // 1250 kcmil
    '1500': 7,    // 1500 kcmil
    '1750': 7.5,  // 1750 kcmil
    '2000': 8     // 2000 kcmil
};