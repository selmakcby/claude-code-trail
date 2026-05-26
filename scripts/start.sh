#!/usr/bin/env bash
# Trail başlatıcı
# Kullanım: start.sh [port]
#
# Akıllı davranış:
# - Eğer 7777'de zaten bir Trail server çalışıyorsa, yeni server başlatmaz —
#   sadece browser'ı açar (verilen proje URL parametresiyle gelir).
# - Yoksa: yeni server başlatır, browser açar.

set -e

START_PORT="${1:-${PORT:-7777}}"
MAX_PORT=$((START_PORT + 20))
VAULT_DIR="${VAULT_DIR:-${CLAUDE_PROJECT_DIR:-$PWD}}"
VAULT_DIR="$(cd "$VAULT_DIR" 2>/dev/null && pwd)" || { echo "Trail: VAULT_DIR bulunamadı: $VAULT_DIR"; exit 1; }
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

# VAULT_DIR sanity check — sistem dizinlerinde / yazılamayan yerlerde başlatma
case "$VAULT_DIR" in
  "/" | "/Users" | "/Users/" | "/tmp" | "/var" | "/etc" | "/usr" | "/opt" | "/private" | "/Volumes")
    echo "Trail: '$VAULT_DIR' bir Claude projesi gibi görünmüyor."
    echo "  Bu sistem dizinine notlar/ oluşturulamaz."
    echo "  Gerçek bir proje klasöründen çalıştır:  cd ~/projects/myrepo && /trail"
    echo "  Veya başlattıktan sonra sol üstten farklı bir proje seç."
    exit 1
    ;;
esac

# Yazma izni kontrolü (notlar/ oluşturulabilir mi?)
if [ ! -w "$VAULT_DIR" ]; then
  echo "Trail UYARI: '$VAULT_DIR' yazılabilir değil — Notlar tab çalışmayabilir."
  echo "  Başlattıktan sonra sol üstten gerçek bir Claude projesi seç."
fi

# Browser açma yardımcısı
open_browser() {
  local url="$1"
  if command -v open >/dev/null 2>&1; then
    open "$url"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url"
  elif command -v start >/dev/null 2>&1; then
    start "$url"
  else
    echo "Browser'ı manuel aç: $url"
  fi
}

# Mevcut Trail server var mı kontrol et
existing_port=""
for p in $(seq "$START_PORT" "$MAX_PORT"); do
  if curl -s "http://127.0.0.1:$p/api/health" 2>/dev/null | grep -q '"status":"ok"'; then
    existing_port=$p
    break
  fi
done

if [ -n "$existing_port" ]; then
  # Mevcut server'a yeni proje URL parametresiyle aç
  url="http://127.0.0.1:$existing_port/?project=$VAULT_DIR"
  echo "Trail zaten çalışıyor (port $existing_port)."
  echo "  vault: $VAULT_DIR"
  echo "  url:   $url"
  echo ""
  echo "Mevcut server'a bağlanıldı. Browser'da yeni proje otomatik seçilecek."
  open_browser "$url"
  exit 0
fi

# Bun kontrolü
BUN_BIN=""
if command -v bun >/dev/null 2>&1; then
  BUN_BIN="bun"
elif [ -x "$HOME/.bun/bin/bun" ]; then
  BUN_BIN="$HOME/.bun/bin/bun"
else
  echo "Trail: Bun bulunamadı."
  echo "Kurulum: curl -fsSL https://bun.sh/install | bash"
  echo "Kurduktan sonra terminal'i yenile ve tekrar dene."
  exit 1
fi

# Bun >= 1.0.0 kontrolü
BUN_VER=$("$BUN_BIN" --version 2>/dev/null | head -1)
BUN_MAJOR=$(echo "$BUN_VER" | cut -d. -f1)
if [ -z "$BUN_MAJOR" ] || [ "$BUN_MAJOR" -lt 1 ]; then
  echo "Trail: Bun >= 1.0.0 gerek (mevcut: $BUN_VER)."
  echo "Güncelleme: $BUN_BIN upgrade"
  exit 1
fi

# Port'u bul (7777 doluysa 7778, 7779...)
PORT=""
for p in $(seq "$START_PORT" "$MAX_PORT"); do
  if ! lsof -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then
    PORT=$p
    break
  fi
done

if [ -z "$PORT" ]; then
  echo "Trail: $START_PORT - $MAX_PORT arası tüm portlar dolu."
  echo "Mevcut bir Trail instance'ı çalışıyor olabilir, Ctrl+C ile durdur."
  exit 1
fi

export VAULT_DIR
export PORT
export PLUGIN_DIR

echo "Trail başlatılıyor..."
echo "  vault: $VAULT_DIR"
echo "  port:  $PORT"
echo "  url:   http://127.0.0.1:$PORT"
echo ""

# Server arka planda, browser'ı aç, sonra foreground'a getir
"$BUN_BIN" "$PLUGIN_DIR/server/index.ts" &
SERVER_PID=$!

# Server'ın açılmasını bekle (max 5s)
for i in {1..50}; do
  if curl -s "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done

# Browser aç — mevcut vault'a proje query'siyle
open_browser "http://127.0.0.1:$PORT/?project=$VAULT_DIR"

# Ctrl+C ile server'ı temiz durdur
trap "kill $SERVER_PID 2>/dev/null; echo ''; echo 'Trail durdu.'; exit 0" INT TERM
wait $SERVER_PID
