---
description: Open Trail (Claude Code observability + learning UI, local :7777, in browser)
argument-hint: "[port?]"
allowed-tools: Bash(bash:*)
---

Start Trail for the current working directory. If a Trail server is already running, just opens the browser pointed at the current project (no new server spawned).

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
  echo "Tried: \$CLAUDE_PLUGIN_ROOT, ~/.claude/plugins/cache/*/trail/*/, ~/.claude/skills/trail"
  echo "Check installation: /plugin marketplace list"
  exit 1
fi

bash "$PLUGIN_DIR/scripts/start.sh" "${1:-7777}"
```

After server starts, tell the user the URL. From the top-left dropdown they can switch between Claude projects. Stop with `Ctrl+C` in the terminal.
