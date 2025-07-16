# Technical Framework for Pull Box Sizing Calculator

## Purpose
This document provides detailed technical framework and implementation guidance for the Pull Box Sizing Calculator. It serves as a reference for architecture decisions, algorithms, and implementation details to guide development.

## High-Level Requirements

### User Experience Goals
Provide an intuitive 3D visualization tool for electricians and engineers to calculate NEC-compliant pull box dimensions with real-time visual feedback and interactive conduit positioning.

### Functionality Requirements
- **3D Visualization**: Interactive 3D model with draggable conduit positioning and industry-standard navigation
- **NEC Compliance**: Automatic calculation of minimum box dimensions per NEC Article 314.28 
- **Pull Management**: Support for straight pulls, angle pulls, U-pulls, and rear wall pulls with conductor sizing
- **Real-time Updates**: Instant dimension updates as users modify pull configurations

### Non-Functional Requirements
- **Performance**: Smooth 3D rendering and real-time calculations without lag
- **Accessibility**: Responsive design supporting desktop and mobile devices
- **Persistence**: Automatic data saving with localStorage between sessions
- **Browser Compatibility**: WebGL support across modern browsers (Chrome, Firefox, Safari, Edge)

## System Architecture

### Frontend Architecture
Single-page application using vanilla JavaScript with Three.js for 3D rendering. Component-based structure with modular JavaScript functions handling UI interactions, 3D scene management, and NEC calculations. Tailwind CSS provides responsive styling framework.

### Backend Architecture
Client-side only application - no backend required. All calculations performed in browser with data persistence via localStorage API.

### External Integrations
Three.js library for 3D graphics rendering and WebGL canvas management. CDN delivery for Three.js dependencies.

### Data Flow Diagram
```
User Input → Pull Configuration → NEC Calculations → 3D Scene Update → Visual Feedback
     ↓                                    ↓
LocalStorage ← Data Persistence    Dimension Display
```

## Data Models

### Pull Object Structure
```javascript
{
  id: number,
  entrySide: string,
  exitSide: string, 
  conduitSize: number,
  conductorSize: string,
  wireColor: {name: string, hex: string},
  entryPosition: {x: number, y: number},
  exitPosition: {x: number, y: number}
}
```

### Box Configuration
```javascript
{
  width: number,
  height: number, 
  depth: number,
  pulls: Pull[]
}
```

## Core Algorithms and Logic

### NEC Sizing Calculations
**Purpose**: Calculate minimum box dimensions per NEC Article 314.28
**Implementation**: Analyzes pull configurations to determine straight pulls (8x largest conduit) vs angle/U-pulls (6x largest + sum of others)
**Complexity**: O(n) where n is number of pulls

### 3D Position Mapping
**Purpose**: Convert 2D wall coordinates to 3D scene positions
**Implementation**: Maps entry/exit sides to box face coordinates with proper spacing for conduit visualization
**Complexity**: O(1) coordinate transformation

## UI Components

### 3D Scene Canvas
**Purpose**: Render interactive 3D visualization of pull box and conduits
**Layout**: Full-width canvas with overlay controls for zoom, wireframe toggle, labels
**Interactions**: Click-drag rotation, conduit repositioning, ViewCube navigation

### Pull Management Table
**Purpose**: Display and manage all pull configurations with minimum distance calculations
**Layout**: Responsive table with alternating row colors and action buttons
**Interactions**: Add/remove pulls, edit configurations, view NEC compliance status

## Proposed Code Structure

```
pull-box-sizing-calculator/
├── index.html
├── script.js
├── styles.css
├── README.md
└── dev/
    ├── setup.md
    ├── claude-context.md
    ├── progress.md
    ├── error-log.md
    └── app-framework.md
```

### Key File Responsibilities
- **index.html**: Main application structure and UI layout
- **script.js**: All JavaScript functionality including 3D rendering, calculations, and UI interactions
- **styles.css**: Custom CSS styling supplementing Tailwind classes

## Implementation Guidelines

### Coding Standards
- Vanilla JavaScript ES6+ features
- Modular function organization with clear separation of concerns
- Consistent naming conventions using camelCase
- Comprehensive comments for complex calculations

### Security Considerations
- Client-side only application minimizes security attack surface
- Input validation for conduit sizes and dimensions
- No external data transmission or server communication

### Performance Optimization
- Efficient Three.js scene updates using object pooling
- Throttled resize and scroll event handlers
- Minimal DOM manipulation during 3D interactions

### Error Handling
- Try-catch blocks around Three.js operations
- Graceful fallbacks for WebGL initialization failures
- User-friendly error messages for invalid configurations

## Testing Strategy

### Unit Testing
Manual testing of individual calculation functions and 3D scene operations

### Integration Testing  
Cross-browser testing for WebGL compatibility and responsive design

### End-to-End Testing
User workflow testing for complete pull box configuration scenarios

## Deployment and Infrastructure

### Development Environment
Simple local file serving - open index.html in browser or use local HTTP server

### Production Environment
Static file hosting via GitHub Pages with automatic deployment from main branch

### CI/CD Pipeline
GitHub Actions for automated deployment to GitHub Pages on push to main

### Monitoring and Logging
Browser console logging for debugging, no external monitoring required

## API Documentation

### Local Storage API
```javascript
// Save pull configuration
localStorage.setItem('pullBoxData', JSON.stringify(data))

// Load pull configuration  
JSON.parse(localStorage.getItem('pullBoxData'))
```

### Three.js Scene API
Standard Three.js object manipulation and rendering pipeline

## Configuration Management

### Environment Variables
No environment variables required - static configuration in code

### Feature Flags
Feature toggles implemented as JavaScript boolean constants

### Secrets Management
No secrets required for client-side only application

## Troubleshooting Guide

### Common Issues
- WebGL not supported: Display fallback message with browser upgrade suggestion
- Performance issues: Reduce 3D scene complexity or disable advanced rendering features
- Calculation errors: Validate input ranges and provide clear error messaging

### Debug Procedures
- Browser developer tools console for JavaScript errors
- Three.js scene inspector for 3D rendering issues
- localStorage inspection for data persistence problems

### Performance Monitoring
Monitor frame rate using browser performance tools and Three.js stats.js if needed