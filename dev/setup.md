# SETUP TRIGGER - READ THIS FIRST

**⚠️ WHEN setup.md IS READ, CLAUDE MUST IMMEDIATELY EXECUTE SETUP ⚠️**

## IMMEDIATE SETUP ACTIONS REQUIRED:
1. **Scan dev/ directory** for files containing "TEMPLATE" in filename
2. **If templates found**: Complete full setup process below BEFORE any other actions
3. **If no templates**: Skip to normal session logic

## TEMPLATE SETUP PROCESS (Execute Immediately):
For each template file:
1. **Read the template file** to understand its structure and placeholders
2. **Rename file** by removing "TEMPLATE" (e.g., `progress-TEMPLATE.md` → `progress.md`)
3. **Replace ALL placeholders** with project-specific information:
   - {PROJECT_DESCRIPTION} → actual project description based on codebase
   - {TECH_STACK} → actual technologies used in project
   - {FILE_STRUCTURE} → actual project directory structure
   - {KEY_COMPONENTS} → actual key files/components found
   - {DEVELOPMENT_COMMANDS} → actual commands found in package.json, Makefile, etc.
   - {DEPLOYMENT_INFO} → actual deployment configuration found
   - {DEVELOPMENT_CONSIDERATIONS} → project-specific notes
   - {COMMON_TASKS} → tasks relevant to this specific project
4. **Customize content** to match current project context
5. **Save the customized file** with new name

## SETUP COMPLETION VERIFICATION:
- Announce "Framework setup complete - all templates customized"
- Verify no "TEMPLATE" files remain in dev/ directory
- List all files created during setup
- ONLY THEN proceed with normal session logic

---

# claude.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Logic
At the beginning of each session claude will:

### Session Initialization Checklist:
1. **Read framework-purpose.md** to understand the framework's goals and philosophy
2. **Check for templates first** (see FIRST SESSION SETUP above)
3. **Announce "Beginning Session #X"** where X is determined by counting existing sessions in claude-context.md
4. **Read this file completely** to understand project context and framework
5. **Read ALL other files** in the dev/ directory systematically
6. **Announce "up to date on dev contents"** when file review is complete
7. **Provide comprehensive summary** of:
   - Current project status
   - Progress from progress.md
   - Any issues from error-log.md
   - Proposed next steps based on all available information

### Session Management Commands:
- **"log session"**: Announce "Logging Session #X", review and update all dev/ files based on work completed
- **"wrap up"**: Announce "Wrapping up Session #X", finalize all documentation, suggest git operations if appropriate

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

{PROJECT_DESCRIPTION}

## Architecture

### Core Technologies
{TECH_STACK}

### File Structure
{FILE_STRUCTURE}

### Key Components
{KEY_COMPONENTS}

## Development Commands

{DEVELOPMENT_COMMANDS}

## Deployment

{DEPLOYMENT_INFO}

## Key Development Considerations

{DEVELOPMENT_CONSIDERATIONS}

## Common Tasks

{COMMON_TASKS}

## Framework Notes

This framework is designed to be:
- **Project-agnostic**: Works with any codebase or project type
- **Session-persistent**: Maintains context across Claude Code sessions
- **Organized**: Structured documentation for better development workflow
- **Adaptive**: Templates customize to match specific project needs

---

**Instructions for Use:**
1. Replace all `{PLACEHOLDER}` sections with project-specific information
2. Update project overview with your specific application details
3. Customize development commands and deployment information
4. Add project-specific considerations and common tasks
5. Remove these instructions once customization is complete