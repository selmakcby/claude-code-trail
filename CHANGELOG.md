# Changelog

Tüm önemli değişiklikler bu dosyada belgelenir.
Format: [Keep a Changelog](https://keepachangelog.com), semver: [SemVer](https://semver.org).

## [0.3.0] — 2026-05-25

### Değişti (BREAKING — yeni kurulumlar için)
- **Ürün adı: VaultStudio → Trail** (özenti hissi veren "vault" terimi ve generic "studio" eki bırakıldı)
  - Plugin adı: `vault-studio` → `trail`
  - Slash command: `/vault-studio` → `/trail` ("vault studio aç" doğal dil tetiği SKILL'de backward-compat olarak kaldı)
  - localStorage anahtarları: `vault-studio-*` → `trail-*` (henüz public kullanıcı yok, etki sıfır)
  - GitHub repo: `selmakcby/vault-studio` → `selmakcby/claude-code-trail` (henüz push edilmedi, sadece metadata güncellendi)
  - Lokal klasör adı `vault-studio` olarak kaldı (geçiş kolaylığı)

### Eklendi
- Türkçe tab başlıkları (Dosyalar, Patika, Bellek, Ajanlar, Geçmiş)
- Tab içeriklerinde açıklayıcı header'lar
- Otomatik refresh (10sn polling, durdurulabilir)
- Network error handling — server düşse "yeniden bağlanılıyor" gösterimi
- Kullanıcı dostu hata mesajları
- Empty state'lerde "ne yapmalı" rehberi
- LICENSE (MIT)
- **Marka kimliği:** SVG logo (V + path-end node glyph), favicon, tagline "Observability for Claude Code"
- **Topbar redesign:** logo + wordmark + tagline iki satır brand alanı
- **Karşılama overlay:** ilk açılışta 5 sekmenin tanıtımı, dismissible, localStorage ile bir kere gösterilir
- **Default tema → soft-dark** (modern SaaS, Linear/Vercel-vari)
- **Notlar tab (6. sekme)** — hızlı not alma sayfası:
  - Vault'ta `notlar/` klasörü otomatik oluşturulur
  - `+ Yeni not` butonu — `YYYY-MM-DD-HHMM-slug.md` formatında otomatik isim, Türkçe karakter transliterate
  - **Otomatik kayıt** — 1.2sn typing debounce, `⌘S` ile hemen kaydet
  - Arama (başlık + içerik)
  - Sil (DELETE endpoint)
  - `⌘N` ile yeni not kısayolu
  - Kayıt durumu göstergesi (saved/saving/dirty)
- **Patika tab — anlaşılırlık iyileştirmesi:**
  - Üstte insan dilinde özet kartı ("Claude bu session'da X işlem yaptı, Y dosyaya dokundu, en çok komut kullandı")
  - Tool isimleri yanında Türkçe etiketler (Bash → komut, Read → okuma)
  - Scrubber'a "zamanı geri sar" label + canlı pozisyon sayacı (37/51)
- **Tema picker → segmented control** (3 pill, native dropdown'un Safari mavi border'ı yok)
- **Session Replay (Geçmiş tab):** her session'da Patika/Konuşma toggle:
  - Patika: mevcut tool timeline
  - **Konuşma:** user/assistant mesajları chat balon görünümünde, markdown render, tool çağrıları inline collapsed
  - Çok uzun session'lar son 400 mesaja kısalır, sistem mesajları (slash, attachment) gizlenir + "hepsini göster" butonu
- **Bellek tab "+ Yeni" butonu:** inline form (title + type seç + description + body), POST endpoint, frontmatter ile dosya yaratır
- **Mikro polish:** kart hover lift, tab fade-in, tema geçişi smooth, scrubber pulse, save dot pulse, prefers-reduced-motion saygısı
- **C pozisyonu:** "Observability for Claude Code" → "Claude Code'u gör · öğren · yönet"
  - Brand tagline güncellendi (welcome overlay + topbar + page title)
  - README baştan yazıldı — content creator / öğrenen / power user üçlü hedef
- **Kılavuz tab (7. sekme)** — 7 ders sayfası, okundu işaretleme, ders navigation:
  - `00-baslangic` — Trail nedir, nasıl başla
  - `01-vault` — Vault kavramı, `.claude/` yapısı
  - `02-skill` — Skill anatomy + ilk skill örneği
  - `03-agent` — Agent vs Skill ayrımı + iyi agent kuralları
  - `04-memory` — 4 memory type açıklaması
  - `05-patika` — Patika sekmesi nasıl okunur
  - `06-llm-wiki` — Vault'unu birikimli bilgi arşivine çevirme stratejisi
  - Server `.md` MIME type ekledi (text/markdown)
  - Welcome overlay 7. ders'i tanıtacak şekilde güncellendi
- **GFM tablo desteği** markdown renderer'da (Kılavuz dersleri için kritik)
- **Hijyen dosyaları:** CONTRIBUTING.md, SECURITY.md, .editorconfig, .gitattributes
- **start.sh Bun min version kontrolü** (>=1.0.0)
- Welcome overlay'den **"Kılavuz'a git" CTA** + tekrar açma butonu
- ⌘N global hotkey (her tab'da çalışır, otomatik Notlar tab'a geçip yeni not açar)
- Memory create form: title boş ise kırmızı border + hata mesajı, Enter ile gönder
- **Multi-project desteği (kritik UX iyileştirmesi):**
  - Server `~/.claude/projects/` otomatik tarar, tüm Claude Code projelerini keşfeder
  - Tüm endpoint'ler `?project=/path/` query parametresi alır
  - Path decoding: encoded klasör adından gerçek yol çıkar, lossy ise session log'dan `cwd` field'i ile düzeltir
  - Topbar'da **proje switcher dropdown** (brand'in yanında) — ara, seç, geç
  - Aktif proje localStorage'a yazılır, yeniden açılışta korunur
  - Switch yapınca tüm tab cache'leri temizlenir, mevcut tab yeniden render
  - Silinmiş projeler "klasör yok" işaretiyle gri/disabled gösterilir
  - Güvenlik: sadece keşfedilen projeler + start time'daki vault path'ine izin (path traversal yok)
  - `GET /api/projects` endpoint'i — discoveried list (vaultDir, displayName, sessionCount, lastActivityMs, vaultExists)

## [0.2.0] — 2026-05-25

### Eklendi — **observability pivot**
- **Trail tab:** aktif Claude session'ının patikası (tool timeline, file heatmap, scrubber)
- **Memory tab:** Claude'un kullanıcı belleği — type'a göre kartlar, edit, sil
- **Agents tab:** ajan envanteri + kullanım istatistikleri (proje + global)
- **Sessions tab:** geçmiş tüm session'lar — özet + detaylı patika
- Server parsers: `claude-paths.ts`, `session-parser.ts`, `memory-parser.ts`, `agent-parser.ts`
- Yeni endpoint'ler: `/api/trail/current`, `/api/memory`, `/api/agents`, `/api/sessions`, `/api/sessions/:id`
- Tab navigation (5 sekme, localStorage persist)
- Terminal teması yeniden tasarım (scanlines/glow gitti, modern terminal)

### Düzeltildi
- `scripts/start.sh`: `VAULT_DIR` env var'ı script tarafından override ediliyordu
- Port collision detection — 7777-7796 arası boş port arar

## [0.1.0] — 2026-05-25 (ilk sürüm)

### Eklendi
- Claude Code plugin manifest + marketplace.json
- Slash command `/vault-studio`
- Skill "vault studio aç"
- Bun server, 127.0.0.1-only, CSP'li
- File tree + 5 kategori filter (vault/code/agents/skills/data)
- Markdown render + edit + wiki-link
- 3 tema: editorial (krem/terracotta), terminal (matrix), soft-dark (modern)
- Secret guard: `.env`, `*credentials*`, `*api_key*` mask + readonly
- Path traversal koruması (realpath check)
