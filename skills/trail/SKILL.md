---
name: trail
description: Kullanıcı "trail aç", "Claude'un izini göster", "projeyi browser'da aç", "trail studio aç", "vault studio aç" (eski isim) gibi şeyler söylediğinde Trail web arayüzünü lokalde başlatır. Tüm Claude Code projeleri tek pencerede gezinmeli — notlar, dosyalar, Claude'un patikası, bellek, ajanlar, geçmiş, kılavuz.
---

# Trail Skill

Kullanıcı Trail'i açmak istediğinde aşağıdaki Bash script'ini çalıştır. Plugin root'unu üç şekilde resolve etmeye çalışır:
1. `CLAUDE_PLUGIN_ROOT` env var (plugin install edilmişse otomatik set)
2. `~/.claude/skills/trail` symlink'inden parent'a çık (geliştirme/manuel kurulum)
3. İkisi de yoksa kullanıcıya kurulum talimatı

```bash
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT:-}"
if [ -z "$PLUGIN_DIR" ] && [ -L "$HOME/.claude/skills/trail" ]; then
  RESOLVED=$(readlink "$HOME/.claude/skills/trail")
  PLUGIN_DIR=$(cd "$(dirname "$RESOLVED")/.." && pwd 2>/dev/null)
fi
if [ -z "$PLUGIN_DIR" ] || [ ! -d "$PLUGIN_DIR/scripts" ]; then
  echo "Trail: plugin yolu bulunamadı. Bkz: ~/.claude/skills/trail/SKILL.md"
  exit 1
fi
bash "$PLUGIN_DIR/scripts/start.sh"
```

## Sonra kullanıcıya bildir

Hangi portta açıldığını ve nasıl durduracağını (`Ctrl+C`) söyle. Browser açıldıktan sonra sol üstteki proje seçici dropdown'dan farklı Claude projelerine geçilebileceğini hatırlat.

## Tetik örnekleri

- "trail aç"
- "Claude'un izini göster"
- "trail studio aç"
- "vault studio aç" (eski isim — backward compat)
- "projeyi browser'da aç"
- "open trail"
- "show me what Claude did"

## Güvenlik notları

- Server **sadece localhost**'a bind, LAN'a açık değil
- `.env`, `*credentials*`, `*api_key*` gibi dosyalar mask'lı ve readonly
- Path traversal koruması var, izin verilen proje dizinleri dışına çıkamaz
- LLM çağrısı YOK — tüm görselleştirme lokal veri üzerinden
