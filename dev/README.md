# Stateful Claude Framework

Maintains context across Claude Code sessions for complex projects.

## Setup (One-time)

1. Copy `dev-template/` to your project as `dev/`
2. Tell Claude: **"Read dev/setup.md"**

## Usage

**Start each session:**
```
"Read dev/claude.md and get up to date"
```

**During sessions:**
- `"log session"` - Update docs mid-session
- `"wrap up"` - End session, finalize docs

## What it does

- Claude remembers your project between sessions
- No more re-explaining architecture
- Tracks progress and decisions

Perfect for multi-session projects. Skip for simple one-off tasks.