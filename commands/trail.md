---
description: Open Trail — local web UI that shows what Claude Code did in this project (sessions, memory, agents, files). Runs at http://localhost:7777.
argument-hint: "[port?]"
allowed-tools: Bash(bash:*)
---

# Open Trail for the current project

Trail is a fully local web UI (port 7777, `127.0.0.1` only — no LLM calls, nothing leaves the machine) that lets the user **see, learn, and manage** what Claude Code has been doing in their projects:

- **Trail tab** — the active session's tool calls in chronological order
- **History tab** — every past Claude Code session, replayable as conversation or tool path
- **Memory tab** — how Claude remembers the user (user / feedback / project / reference)
- **Agents tab** — project + global subagents, with usage stats
- **Files tab** — markdown viewer/editor with `.env` masking
- **Notes tab** — quick markdown notes saved into a `notes/` folder in the vault
- **Guide tab** — built-in 7-lesson onboarding to Claude Code concepts

The server discovers all of the user's Claude Code projects (from `~/.claude/projects/`) automatically; the user picks one from the top-left dropdown without restarting.

## Step 1 — start (or reattach to) the server

```bash
# Resolve plugin root — 4 fallbacks (most to least common):
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT:-}"

# 1) Standard Claude Code plugin install cache
if [ -z "$PLUGIN_DIR" ]; then
  CANDIDATE=$(ls -dt "$HOME"/.claude/plugins/cache/*/trail/*/scripts 2>/dev/null | head -1)
  [ -n "$CANDIDATE" ] && PLUGIN_DIR=$(dirname "$CANDIDATE")
fi

# 2) Marketplaces dir (alternative cache location)
if [ -z "$PLUGIN_DIR" ]; then
  CANDIDATE=$(ls -dt "$HOME"/.claude/plugins/marketplaces/*/scripts 2>/dev/null | head -1)
  [ -n "$CANDIDATE" ] && PLUGIN_DIR=$(dirname "$CANDIDATE")
fi

# 3) User-level skill symlink (dev install)
if [ -z "$PLUGIN_DIR" ] && [ -L "$HOME/.claude/skills/trail" ]; then
  RESOLVED=$(readlink "$HOME/.claude/skills/trail")
  PLUGIN_DIR=$(cd "$(dirname "$RESOLVED")/.." && pwd 2>/dev/null)
fi

if [ -z "$PLUGIN_DIR" ] || [ ! -d "$PLUGIN_DIR/scripts" ]; then
  echo "Trail: plugin path not found."
  echo ""
  echo "If the plugin cache is stale, reinstall:"
  echo "  /plugin uninstall trail@selmakcby"
  echo "  /plugin install trail@selmakcby"
  echo "  /reload-plugins"
  echo ""
  echo "Or, if it isn't in your marketplace list yet:"
  echo "  /plugin marketplace add selmakcby/claude-code-trail"
  exit 1
fi

bash "$PLUGIN_DIR/scripts/start.sh" "${1:-7777}"
```

## Step 2 — tell the user what just happened

After the script prints the URL, tell the user:

1. The Trail URL (e.g. `http://localhost:7777`). If the script said "already running", mention that Trail attached to the existing server instead of spawning a new one.
2. They can **switch between Claude projects from the top-left dropdown** — Trail discovered every Claude Code project on this machine, not just the current one.
3. **First visit:** a Welcome overlay will appear. It explains the 7 tabs. They can skip it or start with the built-in Guide.
4. **Language:** Trail's default UI is English; there's an EN/TR toggle top-right if they prefer Turkish.
5. **To stop:** `Ctrl+C` in this terminal.

If the user asks what each tab does, the Guide tab covers it in 7 short lessons. Don't repeat all of that here — point them to it.

If they're on Safari and see "page address isn't valid", remind them Safari auto-prefixes `127.0.0.1` with `www.` — they should type `http://localhost:7777` instead.

If they don't have Bun installed and the script reported it, the install command is `curl -fsSL https://bun.sh/install | bash`.
