# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Logic
At the beginning of each session claude will be instructed to read this file. Claude should first identify the session number by counting existing sessions in claude-context.md and announce "Beginning Session #X" where X is the next session number. Upon reading this file claude will get an understanding of the current project and get context for the rest of the files in the directory. Once this file has been reviewed claude should use this context to read the rest of the files in the directory and give the user an indication that they have completed all the tasks by stating "up to date on dev contents" and then provide a summary of the project status and proposed next steps based on the progress.md or any other relavent files in this directory.  

When told to "log session" claude will announce "Logging Session #X" where X is the current session number, then review this file again, followed by the rest of the files in this directory and update them as appropriate based on what has been done either since the session started, or since the last "log session" was executed. Sessions should be added to claude-context.md as separate numbered journal entries (Session 1, Session 2, etc.). Each session entry should be completely separate and independent. Previous sessions should be retained by default - never modify or combine previous session entries.

When told to "wrap up" the session claude will announce "Wrapping up Session #X" where X is the current session number, then review this file again, followed by the rest of the files in this directory and update them as appropriate based on what was done that session. Sessions should be added to claude-context.md as separate numbered journal entries (Session 1, Session 2, etc.). Each session entry should be completely separate and independent. Previous sessions should be retained by default - never modify or combine previous session entries. Claude will suggest adding, commiting, and pushing if appropriate. Claude will let the user know this is done and that we are ready to end the session.


## Development Folder Structure

This `dev/` directory contains project management and documentation files to support development workflow:

### `claude-context.md`
- **Purpose**: Store session information between Claude Code sessions
- **Usage**: Update before closing each session with key progress, decisions, and context. Sessions should be added as separate numbered journal entries (Session 1, Session 2, etc.). Each session entry should be completely separate and independent. Previous sessions should be retained by default - never modify or combine previous session entries.
- **Benefits**: Provides continuity for future sessions, maintains development history

### `progress.md`
- **Purpose**: Comprehensive project status tracking and roadmap
- **Usage**: Regular updates to component completion status, milestones, and goals
- **Benefits**: Clear visibility into project state, structured progress tracking

### `error-log.md`
- **Purpose**: Centralized error tracking and debugging information
- **Usage**: Populated by developer when error logs are too large for chat interface
- **Benefits**: Persistent error context, easier debugging across sessions

### `app-logic.md`
- **Purpose**: Technical documentation of application architecture and logic
- **Usage**: Document key technical decisions, algorithms, and implementation details
- **Benefits**: Reference for complex logic, onboarding documentation

### `CLAUDE.md`
- **Purpose**: Development guidance and project overview for Claude Code
- **Usage**: Instructions for consistent development approach and project context
- **Benefits**: Ensures Claude follows project conventions and understands architecture


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