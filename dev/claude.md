# claude.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Logic
At the beginning of each session claude will be instructed to read this file. Claude should first identify the session number by counting existing sessions in claude-context.md and announce "Beginning Session #X" where X is the next session number. Upon reading this file claude will get an understanding of the current project and get context for the rest of the files in the directory. Once this file has been reviewed claude should use this context to read the rest of the files in the directory and give the user an indication that they have completed all the tasks by stating "up to date on dev contents" and then provide a summary of the project status and proposed next steps based on the progress.md or any other relevant files in this directory.

When told to "log session" claude will announce "Logging Session #X" where X is the current session number, then review this file again, followed by the rest of the files in this directory and update them as appropriate based on what has been done either since the session started, or since the last "log session" was executed. Sessions should be added to claude-context.md as separate numbered journal entries (Session 1, Session 2, etc.). Each session entry should be completely separate and independent. Previous sessions should be retained by default - never modify or combine previous session entries.

When told to "wrap up" the session claude will announce "Wrapping up Session #X" where X is the current session number, then review this file again, followed by the rest of the files in this directory and update them as appropriate based on what was done that session. Sessions should be added to claude-context.md as separate numbered journal entries (Session 1, Session 2, etc.). Each session entry should be completely separate and independent. Previous sessions should be retained by default - never modify or combine previous session entries. Claude will suggest adding, committing, and pushing if appropriate. Claude will let the user know this is done and that we are ready to end the session.

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

### `app-framework.md`
- **Purpose**: Technical documentation of application architecture and logic
- **Usage**: Document key technical decisions, algorithms, and implementation details
- **Benefits**: Reference for complex logic, onboarding documentation

### `claude.md`
- **Purpose**: Development guidance and project overview for Claude Code
- **Usage**: Instructions for consistent development approach and project context
- **Benefits**: Ensures Claude follows project conventions and understands architecture

## Project Overview

A web-based 3D visualization tool for calculating electrical pull box dimensions according to NEC Article 314.28. This interactive calculator helps electricians and engineers determine the minimum required dimensions for junction and pull boxes based on conduit sizes and pull configurations with real-time 3D visualization.

## Architecture

### Core Technologies
- **Three.js**: 3D graphics and visualization engine
- **Tailwind CSS**: Utility-first CSS framework for styling and responsive design
- **Vanilla JavaScript**: Core functionality and DOM manipulation
- **HTML5 Canvas**: 3D rendering surface via WebGL
- **LocalStorage API**: Client-side data persistence

### File Structure
```
pull-box-sizing-calculator/
├── index.html          # Main application structure and UI layout
├── script.js           # All JavaScript functionality (3D rendering, calculations, UI)
├── styles.css          # Custom CSS styling supplementing Tailwind
├── README.md           # Project documentation and usage instructions
└── dev/                # Development workflow and documentation
    ├── setup.md        # Framework setup instructions
    ├── claude.md       # Development guidance for Claude Code
    ├── claude-context.md # Session history and context
    ├── progress.md     # Project status and roadmap tracking
    ├── error-log.md    # Centralized error tracking
    └── app-framework.md # Technical architecture documentation
```

### Key Components
- **3D Scene Manager**: Three.js scene initialization, camera controls, and object management
- **Pull Box Calculator**: NEC Article 314.28 compliance calculations for different pull types
- **UI Controller**: DOM manipulation for pull management table and dimension controls
- **Data Persistence**: LocalStorage integration for saving/loading configurations

## Development Commands

No build process required - static files served directly:
```bash
# Development
open index.html  # or serve via local HTTP server

# Deployment
git push origin main  # Automatically deploys to GitHub Pages
```

## Deployment

**Production Environment**: GitHub Pages with automatic deployment
- **URL**: https://jamesalmeida.github.io/pull-box-sizing-calculator/
- **CI/CD**: GitHub Actions deploys from main branch automatically
- **Requirements**: Static file hosting, no server-side processing needed

## Roadmap Updates
- **ALWAYS** update the "Current Roadmap" section in progress.md in-place
- **NEVER** create duplicate roadmap sections
- Archive superseded roadmaps in "Roadmap History" when major changes occur
- Use clear timestamps and reasons when archiving old roadmaps

## Key Development Considerations

- **NEC Compliance**: Ensure all calculations strictly follow NEC Article 314.28 requirements
- **3D Performance**: Optimize Three.js scene updates and minimize unnecessary re-renders
- **Browser Compatibility**: Test WebGL support across modern browsers
- **Mobile Responsiveness**: Ensure touch interactions work properly on mobile devices
- **Data Validation**: Validate conduit sizes and dimensions against NEC standards
- **Error Handling**: Graceful fallbacks for WebGL initialization failures

## Common Tasks

- **Add New Pull Types**: Extend calculation logic in script.js and update UI accordingly
- **Enhance 3D Visualization**: Modify Three.js scene objects and materials
- **Update NEC Standards**: Review and update calculation constants and formulas
- **Improve UI/UX**: Modify HTML structure and CSS styling
- **Debug Calculations**: Use error-log.md for tracking calculation issues
- **Performance Optimization**: Profile 3D rendering and optimize scene complexity