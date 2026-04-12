# Kanban Board

Lightweight project management board for tracking Forever Fireflies development.

## How It Works

- **`kanban.json`** is the single source of truth — one flat JSON file with all cards and columns
- **`kanban-server.js`** is a zero-dependency Node server (just `http` and `fs`)
- **`kanban.html`** is a vanilla HTML/CSS/JS board UI — no build step, no framework

Both the developer (via browser) and Claude Code (via direct file edits) read and write `kanban.json`.

## Quick Start

```bash
cd kanban
node kanban-server.js
# Open http://localhost:3333
```

## Board Structure

| Columns | Tags | Priority |
|---------|------|----------|
| Backlog | `screen` | high |
| Up Next | `infra` | medium |
| In Progress | `copy` | low |
| Done | `design` | |
| Blocked | `bug`, `chore` | |

## Card Schema

```json
{
  "id": "a1b2c3",
  "title": "Fix audio playback on Android",
  "tag": "bug",
  "priority": "high",
  "column": "backlog",
  "notes": "Crashes on Android 14 when resuming from background",
  "link": "services/audio.service.ts",
  "createdAt": "2026-03-28T14:30:00Z",
  "updatedAt": "2026-03-28T14:30:00Z"
}
```

The `link` field is an optional file path reference into the codebase. `notes` supports free-text context.

## Using with Claude Code

Claude Code can read `kanban/kanban.json` directly and edit it with the Edit tool — no server needed. Example prompts:

- "Read the kanban board and tell me what's in progress"
- "Move the 'App icon finalization' card to In Progress"
- "Add a new card: 'Fix audio playback on Android' tagged as bug, high priority, in Backlog"
- "What blocked cards do we have? What's blocking them?"
- "Pick up the next high-priority card from Up Next and start working on it"
- "Update the notes on the 'Privacy policy' card with what we just discussed"
- "Show me all cards tagged 'chore'"

## Browser UI Features

- **Drag and drop** cards between columns
- **Click cards** to edit title, tag, column, priority, notes, and link
- **Auto-saves** on every change
- **Tag filtering** + text search
- **Done column** collapsed by default (show/hide toggle)
- **Copy JSON** button copies board state to clipboard
- **Sync status** indicator in header

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | New card |
| `Escape` | Close modal |

## Conflict Detection

If `kanban.json` is modified externally (by Claude Code or a manual edit) while the browser UI is open, the server returns **409 Conflict** and the board auto-refreshes to pick up the new state. This prevents stale overwrites — no data loss.
