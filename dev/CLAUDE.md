# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a client-side web application for calculating electrical pull box dimensions according to NEC Article 314.28. The application provides a 3D visualization of pull boxes with interactive conduit placement and real-time NEC compliance calculations.

## Architecture

### Core Technologies
- **Frontend**: Pure HTML, CSS, and JavaScript (no framework)
- **3D Graphics**: Three.js for 3D visualization and interactive controls
- **Styling**: Tailwind CSS (loaded via CDN)
- **Data Storage**: Browser localStorage for persistence

### File Structure
- `index.html` - Main application HTML with embedded mobile-responsive CSS
- `script.js` - Core application logic, 3D rendering, and NEC calculations
- `styles.css` - Additional CSS styles
- `test-touch.html` - Touch testing utilities for mobile development

### Key Components

#### 3D Visualization System
- Interactive 3D pull box with draggable conduit entry/exit points
- ViewCube navigation for standard orthographic views
- Wireframe mode toggle and label display controls
- Real-time distance visualization between conduit entries

#### NEC Calculation Engine
- Implements NEC Article 314.28 requirements for pull box sizing
- Supports straight pulls, angle pulls, U-pulls, and rear wall pulls
- Calculates minimum distances based on conduit sizes and conductor requirements
- Real-time compliance warnings and validation

#### Data Management
- Pull configurations stored in browser localStorage
- Automatic persistence of box dimensions and pull configurations
- Import/export functionality through browser storage APIs

## Development Commands

This is a static web application with no build process. Development workflow:

```bash
# Serve locally (any HTTP server)
python -m http.server 8000
# or
npx serve .

# Open in browser
open http://localhost:8000
```

## Deployment

The application is deployed via GitHub Pages using the workflow in `.github/workflows/deploy.yml`. Deployment happens automatically on push to main branch.

## Mobile Responsiveness

The application includes extensive mobile-specific styling and touch controls:
- Mobile-optimized UI with stacked layouts for screens < 640px
- Touch-friendly 3D navigation controls
- Responsive table that converts to stacked cards on mobile
- Separate mobile forms for better touch interaction

## Key Development Considerations

### 3D Rendering Performance
- The Three.js scene uses efficient geometry for real-time updates
- Conduit positions are constrained to box wall surfaces
- Distance calculations are optimized for interactive performance

### NEC Compliance Logic
- Pull box sizing follows strict NEC Article 314.28 requirements
- Minimum distances calculated based on conduit trade sizes
- Rear wall pulls require conductor size for bending radius calculations
- Warning system alerts users to non-compliant configurations

### Data Persistence
- All user data persists in localStorage automatically
- No server-side storage or user accounts required
- Clear data functionality available for reset scenarios

## Common Tasks

### Adding New Conduit Sizes
Update the `locknutODSpacing`, `actualConduitOD`, and `conduitThroatDepths` objects in `script.js` and corresponding HTML option elements.

### Modifying NEC Calculations
The calculation logic is centralized in the `calculateMinimumBoxDimensions()` function in `script.js`.

### Updating 3D Visualization
3D rendering code is in the `init3D()` and related functions. The scene uses a standard Three.js setup with OrbitControls and custom ViewCube implementation.