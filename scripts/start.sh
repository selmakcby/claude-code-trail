#!/usr/bin/env bash
# Trail launcher
# Usage: start.sh [port]
#
# Smart behavior:
# - If a Trail server is already running on 7777, just opens the browser
#   pointed at the current project (no new server spawned).
# - Otherwise: starts a new server, opens the browser.

set -e

START_PORT="${1:-${PORT:-7777}}"
MAX_PORT=$((START_PORT + 20))
VAULT_DIR="${VAULT_DIR:-${CLAUDE_PROJECT_DIR:-$PWD}}"
VAULT_DIR="$(cd "$VAULT_DIR" 2>/dev/null && pwd)" || { echo "Trail: VAULT_DIR not found: $VAULT_DIR"; exit 1; }
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

# VAULT_DIR sanity check — refuse system-shallow paths
case "$VAULT_DIR" in
  "/" | "/Users" | "/Users/" | "/tmp" | "/var" | "/etc" | "/usr" | "/opt" | "/private" | "/Volumes" | "/home" | "/root")
    echo "Trail: '$VAULT_DIR' does not look like a Claude project folder."
    echo "  A notes/ folder cannot be created here."
    echo "  Run from a real project folder, e.g.:  cd ~/projects/myrepo && /trail"
    echo "  Or, once Trail is open, pick a project from the top-left dropdown."
    exit 1
    ;;
esac

# Writeability hint
if [ ! -w "$VAULT_DIR" ]; then
  echo "Trail WARN: '$VAULT_DIR' is not writable — the Notes tab may not work."
  echo "  After it starts, pick a real Claude project from the top-left."
fi

# Browser opener helper
open_browser() {
  local url="$1"
  if command -v open >/dev/null 2>&1; then
    open "$url"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url"
  elif command -v start >/dev/null 2>&1; then
    start "$url"
  else
    echo "Open this URL manually: $url"
  fi
}

# Is a Trail server already up?
existing_port=""
for p in $(seq "$START_PORT" "$MAX_PORT"); do
  if curl -s "http://127.0.0.1:$p/api/health" 2>/dev/null | grep -q '"status":"ok"'; then
    existing_port=$p
    break
  fi
done

if [ -n "$existing_port" ]; then
  url="http://127.0.0.1:$existing_port/?project=$VAULT_DIR"
  echo "Trail already running (port $existing_port)."
  echo "  vault: $VAULT_DIR"
  echo "  url:   $url"
  echo ""
  echo "Connected to the existing server. Browser will switch to this project."
  open_browser "$url"
  exit 0
fi

# Bun check
BUN_BIN=""
if command -v bun >/dev/null 2>&1; then
  BUN_BIN="bun"
elif [ -x "$HOME/.bun/bin/bun" ]; then
  BUN_BIN="$HOME/.bun/bin/bun"
else
  echo "Trail: Bun not found."
  echo "Install:  curl -fsSL https://bun.sh/install | bash"
  echo "Then reopen your terminal and run /trail again."
  exit 1
fi

BUN_VER=$("$BUN_BIN" --version 2>/dev/null | head -1)
BUN_MAJOR=$(echo "$BUN_VER" | cut -d. -f1)
if [ -z "$BUN_MAJOR" ] || [ "$BUN_MAJOR" -lt 1 ]; then
  echo "Trail: Bun >= 1.0.0 required (found: $BUN_VER)."
  echo "Upgrade with:  $BUN_BIN upgrade"
  exit 1
fi

# Find a free port
PORT=""
for p in $(seq "$START_PORT" "$MAX_PORT"); do
  if ! lsof -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then
    PORT=$p
    break
  fi
done

if [ -z "$PORT" ]; then
  echo "Trail: ports $START_PORT - $MAX_PORT are all busy."
  echo "An existing Trail instance may be running — stop it with Ctrl+C."
  exit 1
fi

export VAULT_DIR
export PORT
export PLUGIN_DIR

echo "Trail starting..."
echo "  vault: $VAULT_DIR"
echo "  port:  $PORT"
echo "  url:   http://127.0.0.1:$PORT"
echo ""

# Server in background, open browser, then bring back to foreground
"$BUN_BIN" "$PLUGIN_DIR/server/index.ts" &
SERVER_PID=$!

# Wait until ready (max 5s)
for i in {1..50}; do
  if curl -s "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done

open_browser "http://127.0.0.1:$PORT/?project=$VAULT_DIR"

# Clean shutdown
trap "kill $SERVER_PID 2>/dev/null; echo ''; echo 'Trail stopped.'; exit 0" INT TERM
wait $SERVER_PID
