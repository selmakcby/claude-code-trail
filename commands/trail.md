---
description: Trail'i aç (Claude Code observability + öğrenme arayüzü, lokal :7777, browser'da)
argument-hint: "[port?]"
allowed-tools: Bash(bash:*)
---

Trail'i mevcut çalışma dizini için başlat. Mevcut Trail server zaten çalışıyorsa yeniden başlatmaz — sadece browser'ı yeni projeye yönlendirir.

```bash
# Plugin root'u resolve et — 3 fallback
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT:-}"
if [ -z "$PLUGIN_DIR" ] && [ -L "$HOME/.claude/skills/trail" ]; then
  RESOLVED=$(readlink "$HOME/.claude/skills/trail")
  PLUGIN_DIR=$(cd "$(dirname "$RESOLVED")/.." && pwd 2>/dev/null)
fi
if [ -z "$PLUGIN_DIR" ] || [ ! -d "$PLUGIN_DIR/scripts" ]; then
  echo "Trail: plugin yolu bulunamadı."
  echo "Kurulum kontrolü: ls -la ~/.claude/skills/trail ~/.claude/commands/trail.md"
  exit 1
fi

bash "$PLUGIN_DIR/scripts/start.sh" "${1:-7777}"
```

Server başlatıldıktan sonra browser'da açılan adresi kullanıcıya bildir. Sol üstteki proje seçicide farklı Claude projeleri görünür. Durdurmak için terminal'de `Ctrl+C`.
