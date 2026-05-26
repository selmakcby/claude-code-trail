# Trail

**See · Learn · Manage Claude Code.** A local Claude Code plugin that shows you what Claude actually did in your project, lets you manage memory and notes, and teaches you the platform from scratch.

> Türkçe: **Claude Code'u gör · öğren · yönet.** Claude'un kendi içinde ne yaptığını görsel olarak izle, projendeki bilgi alanını yönet, Claude Code'u sıfırdan öğren.

---

## Install — two commands

In any Claude Code session:

```
/plugin marketplace add selmakcby/claude-code-trail
/plugin install trail@selmakcby
```

Then in any project:

```
/trail
```

Browser opens at `http://localhost:7777`. Switch projects from the top-left dropdown.

**Requirements:** Bun >= 1.0 (`curl -fsSL https://bun.sh/install | bash`).

---

## What it does

Obsidian shows your files. NotebookLM lets you chat with AI. Cursor writes code.
**None of them show what Claude Code is actually doing inside.** And for newcomers, concepts (skill, agent, memory, vault) are scattered across docs.

Trail solves all three:

1. **See** — every tool call, every file Claude touched, every memory it built, in one window
2. **Learn** — built-in 7-lesson guide: vault, skill, agent, memory, trail, llm-wiki strategy
3. **Manage** — quick notes, memory edit/add/delete, agent inventory cleanup, session archive

Fully local: server binds to `127.0.0.1`, no LLM calls, no data leaves your machine.

---

## Kimin için?

| Hedef kullanıcı | Ne kazanır |
|---|---|
| **Claude Code'a yeni başlayan dev** | Yerleşik Kılavuz: vault/skill/agent/memory ne demek, somut örneklerle |
| **Content creator / educator** | Demo göstermeye hazır arayüz — YouTube/Twitter için "Claude ne yaptı" vitrini |
| **Claude Code power user** | Tool kullanım analizi, memory görünürlüğü, ajan kullanım istatistikleri |

---

## 7 sekme

| Sekme | İçerik |
|---|---|
| **Notlar** | Hızlı not alma — `vault/notlar/` altına otomatik kayıt, ⌘N, otomatik save, arama, sil |
| **Dosyalar** | Proje dosyaları — 5 kategori filter (vault/code/agents/skills/data), markdown render + edit, `.env` mask'lı |
| **Patika** | Aktif Claude session'ı — insan dilinde özet, tool dağılım grafiği, dosya ısı haritası, kronolojik scrubber |
| **Bellek** | Claude'un seni nasıl hatırladığı — 4 type kart (user/feedback/project/reference), `+ Yeni` ile ekle, edit, sil |
| **Ajanlar** | Proje + global ajanlar, kullanım sıklığı, system prompt önizleme, "hiç kullanılmayanlar" filtre |
| **Geçmiş** | Tüm session arşivi — her birinde **Patika** (tool timeline) + **Konuşma** (user/assistant chat replay) toggle |
| **Kılavuz** | 7 ders — Trail nedir / vault / skill / agent / memory / patika / llm-wiki — okundu işaretlemeli |

3 tema: **soft-dark** (modern, default), **editorial** (krem/terracotta), **terminal** (modern terminal).

---

## Manual install (development)

If you cloned the repo:

```bash
git clone https://github.com/selmakcby/claude-code-trail.git ~/trail
cd ~/trail
VAULT_DIR=/path/to/your-claude-project bash scripts/start.sh
```

Server starts on `127.0.0.1:7777`, browser opens automatically.

**Token cost:** Plugin sits in your Claude Code context for ~30 tokens (skill description only). Triggering it loads ~500 tokens once. The Bun server runs alongside, completely independent from Claude's context.

---

## Hikaye — niye var?

Selma `youtube-brain` vault'unda Claude Code'la çalışırken iki şeyin **görünmez** olduğunu fark etti:

1. **Vault'un kendisi arayüzsüz** — bilgi orada ama gezmek için terminal veya Obsidian şart
2. **Claude'un içinde olup biten görünmez** — hangi dosya okundu, hangi ajan tetiklendi, ne yazıldı

Üstüne bir sorun daha: Claude Code'a yeni başlayan biri için *skill nedir, agent nedir, memory ne işe yarar* — bunları doküman okuyarak parça parça öğrenmek zorunda.

Trail bu üçünü tek pakette çözüyor. Selma'nın YouTube content production'ı için demo + öğretme aracı, dev'ler için günlük çalışma arkadaşı.

---

## Mimari

```
Plugin (GitHub: selmakcby/claude-code-trail · local: ~/projects/vault-studio)
├── .claude-plugin/{plugin.json, marketplace.json}
├── commands/trail.md                 → /trail
├── skills/trail/SKILL.md             → "trail aç"
├── scripts/start.sh                  → bun server + browser
├── server/                           → Bun, 127.0.0.1-only
│   ├── index.ts                      → HTTP routing, CSP, MIME
│   ├── vault-scanner.ts              → file tree + kategorize
│   ├── claude-paths.ts               → ~/.claude/projects/<encoded>/ çöz
│   ├── session-parser.ts             → jsonl → tool timeline + conversation
│   ├── memory-parser.ts              → MEMORY.md + frontmatter parse + create
│   ├── agent-parser.ts               → ajan defs + usage stats
│   ├── notes-api.ts                  → /notlar/ klasör yönetimi + create/delete
│   ├── file-api.ts                   → read/write + path guard
│   └── secret-guard.ts               → .env mask + readonly
└── web/                              → vanilla JS, no build
    ├── index.html                    → tab navigation, welcome overlay
    ├── app.js                        → tab router, theme, auto-refresh
    ├── markdown.js                   → CSP-safe MD renderer
    ├── base.css                      → layout + polish animations
    ├── tabs/{notes,files,trail,memory,agents,sessions,guide}.js
    ├── themes/{soft-dark,editorial,terminal}.css
    ├── docs/                         → Kılavuz ders sayfaları (markdown)
    │   ├── _index.json
    │   └── {00..06}-*.md
    ├── logo.svg, favicon.svg
```

12 API endpoint, hepsi `127.0.0.1`-only ve CSP korumalı:

```
GET    /api/health                       GET    /api/tree
GET    /api/file?path=…                  PUT    /api/file?path=…
GET    /api/trail/current                GET    /api/sessions
GET    /api/sessions/:id                 GET    /api/sessions/:id/conversation
GET    /api/memory                       POST   /api/memory
PUT    /api/memory?file=…                DELETE /api/memory?file=…
GET    /api/agents
GET    /api/notes                        POST   /api/notes
DELETE /api/notes?file=…
```

---

## Güvenlik

- Server **sadece** `127.0.0.1:7777` (LAN'a/internet'e açık değil)
- `.env*`, `id_*`, `*credentials*`, `*.pem`, `*.key` → **mask + readonly**
- Path traversal koruması (realpath + isInside)
- Yazma sadece markdown uzantılarına
- Dosya boyut limiti 5MB
- **LLM çağrısı YOK** — tamamen lokal görselleştirme
- CSP header: `default-src 'self'`, no external script/style

---

## Sorun giderme

| Belirti | Sebep | Çözüm |
|---|---|---|
| Safari "page address isn't valid" | Safari `127.0.0.1:7777`'ye otomatik `www.` öneki ekledi | Adres çubuğuna `http://localhost:7777` yaz |
| "Trail: Bun bulunamadı" | Bun kurulu değil | `curl -fsSL https://bun.sh/install \| bash` |
| Vault yanlış görünüyor | start.sh `VAULT_DIR`'i override etmiş eski sürüm | v0.2.0+ güncelle |
| Tab boş | Bu projede henüz Claude session'ı yok | Terminal'de bu klasörden `claude` çalıştır, bir mesaj at |
| Statusbar "⚠ sunucu yok" | Bun server düştü | Terminal'i kontrol et, gerekirse `bash scripts/start.sh` ile yeniden başlat |

---

## Yol haritası

- **V0.3** ✅ — Tagline "gör · öğren · yönet", Kılavuz tab (7 ders), Session replay, Notlar + memory ekle, polish
- **V0.4** — Live mode (Claude şu anda ne yapıyor — WebSocket / SSE)
- **V0.5** — Token cost tracker, cross-session search
- **V1.0** — Wiki-link autocomplete + graph view, CSS variable customizer, 4. tema, kılavuz video gömme

CHANGELOG: [CHANGELOG.md](./CHANGELOG.md)

## Lisans

MIT — [LICENSE](./LICENSE)
