---
name: trail
description: When the user says "open trail", "trail aç", "show Claude's path", "open the project in browser", "trail studio aç", "vault studio aç" (old name), or similar, start Trail's local web UI. All Claude Code projects can be browsed from one window — notes, files, Claude's path, memory, agents, history, guide.
---

# Trail Skill

When the user wants to open Trail, run this Bash script. It resolves the plugin root in 4 fallback steps:

1. `CLAUDE_PLUGIN_ROOT` env var (set by Claude Code when plugin is installed)
2. `~/.claude/plugins/cache/*/trail/*/scripts/` (standard install location)
3. `~/.claude/plugins/marketplaces/*/scripts/` (marketplace cache)
4. `~/.claude/skills/trail` symlink (dev install)

```bash
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT:-}"

if [ -z "$PLUGIN_DIR" ]; then
  CANDIDATE=$(ls -dt "$HOME"/.claude/plugins/cache/*/trail/*/scripts 2>/dev/null | head -1)
  [ -n "$CANDIDATE" ] && PLUGIN_DIR=$(dirname "$CANDIDATE")
fi

if [ -z "$PLUGIN_DIR" ]; then
  CANDIDATE=$(ls -dt "$HOME"/.claude/plugins/marketplaces/*/scripts 2>/dev/null | head -1)
  [ -n "$CANDIDATE" ] && PLUGIN_DIR=$(dirname "$CANDIDATE")
fi

if [ -z "$PLUGIN_DIR" ] && [ -L "$HOME/.claude/skills/trail" ]; then
  RESOLVED=$(readlink "$HOME/.claude/skills/trail")
  PLUGIN_DIR=$(cd "$(dirname "$RESOLVED")/.." && pwd 2>/dev/null)
fi

if [ -z "$PLUGIN_DIR" ] || [ ! -d "$PLUGIN_DIR/scripts" ]; then
  echo "Trail: plugin path not found. Try: /plugin marketplace list"
  exit 1
fi

bash "$PLUGIN_DIR/scripts/start.sh"
```

## After starting

Tell the user which port it opened on and how to stop (`Ctrl+C`). Remind them they can switch projects from the dropdown top-left.

## Trigger examples

- "open trail"
- "trail aç"
- "show me what Claude did"
- "Claude'un izini göster"
- "trail studio aç"
- "vault studio aç" (legacy)
- "open project in browser"

## Security notes

- Server binds to **127.0.0.1 only** (LAN/internet not exposed)
- `.env`, `*credentials*`, `*api_key*` masked + readonly
- Path traversal protection on file API
- **No LLM calls** — purely local visualization
