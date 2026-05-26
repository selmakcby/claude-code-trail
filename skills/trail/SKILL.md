---
name: trail
description: Trail is a local web UI that visualizes what Claude Code has been doing — sessions, tool calls, file activity, memory, subagents — for every Claude Code project on the user's machine. Invoke when the user says any of "open trail", "start trail", "show me trail", "trail aç" (Turkish), "show me what claude did", "show claude's path", "see my claude sessions", "show me the memory", "open the project in browser", "trail studio aç", or "vault studio aç" (legacy name), or otherwise asks to inspect/visualize their Claude Code activity. Runs at http://localhost:7777, 127.0.0.1-only, no LLM calls.
---

# Trail Skill

When the user wants to open Trail, run the Bash script below. It resolves the plugin root in 4 fallback steps so it works regardless of how the plugin was installed (marketplace, dev symlink, or via `$CLAUDE_PLUGIN_ROOT`).

After it boots, tell the user the URL and how to use it (see "After starting" below).

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
  echo "Trail: plugin path not found. Try /plugin marketplace list."
  exit 1
fi

bash "$PLUGIN_DIR/scripts/start.sh"
```

## After starting

Tell the user:

- The URL the script printed (typically `http://localhost:7777`).
- They can switch projects from the **top-left dropdown** — Trail auto-discovered every Claude Code project on this machine.
- The first visit shows a Welcome overlay explaining the 7 tabs (Notes, Files, Trail, Memory, Agents, History, Guide). They can dismiss it or start with the Guide.
- Default language is English; an EN/TR toggle is top-right if they prefer Turkish.
- Stop with `Ctrl+C` in the terminal.

## Trigger examples (English)

- "open trail"
- "start trail"
- "show me what claude did"
- "show me my claude sessions"
- "open the project in browser"
- "I want to see claude's path"
- "show me the memory"

## Trigger examples (Turkish)

- "trail aç"
- "claude'un izini göster"
- "trail studio aç"
- "vault studio aç" (legacy / earlier name)

## What Trail is (so Claude can explain it accurately)

- Pure local visualization — **no LLM calls**, **no data leaves the machine**.
- Server binds to `127.0.0.1` only (LAN/internet not reachable).
- Reads from `~/.claude/projects/<encoded-path>/*.jsonl` (the user's own Claude Code session logs).
- Writes only to the active project's vault — and only `.md`/`.mdx`/`.markdown`/`.txt` files.
- Secret-guarded: `.env*`, `*credentials*`, `*api_key*`, `*.pem`, `*.key`, etc. are masked + readonly.
- CSP-locked: no external scripts/styles loaded by the UI.

## Requirements

- **Bun >= 1.0** must be installed. If missing, the launcher prints `curl -fsSL https://bun.sh/install | bash`.
- Works on macOS and Linux out of the box. Windows requires WSL or git-bash (bash + standard Unix tools).
