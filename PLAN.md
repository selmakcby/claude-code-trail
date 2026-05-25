# Plan: VaultStudio — Claude Code Plugin

## Context

Selma `youtube-brain` vault'unda Claude Code ile çalışırken vault'un kendisinin **arayüzsüz** olduğunu fark etti. Bilgi orada ama görmek/dolaşmak için Obsidian veya komut satırı şart. Bu hem teknik olmayan kullanıcılar için yüksek bariyer, hem de Claude Code'un içinde olup bitenin (hangi dosya okundu/yazıldı, ajanlar ne yaptı) **görünmez** olması demek.

VaultStudio bu boşluğu kapatıyor: **Claude Code içine kurulan bir plugin**, kullanıcı Claude'a sorunca lokalde küçük bir web server başlatıyor, browser'dan tüm projeyi (vault + kod + ajanlar + skill'ler + env) görsel bir studio olarak veriyor. Üç ayırt edici özellik: (1) **Claude'un patikası** — agent'ın session'da hangi dosyaları sırasıyla okuyup yazdığını animasyonlu trail olarak görselleştirme, (2) **3–4 hazır tema + serbest CSS customization** — Obsidian'dan farkı: ürün gibi pretty bir output, (3) **Yerleşik kılavuz** — Claude Code'u bilmeyen biri "vault nedir, LLM wiki nedir, skill nedir" sayfalarını okuyarak içeri girebiliyor.

Pozisyonlama: Obsidian (power-user, link-graph) ve NotebookLM (chat-odaklı, kapalı kutu) arasındaki boşluk. Selma sonra Twitter'da demo gif'i + makale ile yayınlayacak.

## Scope Kararları (Selma'nın cevaplarından edit)

Selma "hepsi olsun, herkes için olsun" dedi. Bu MVP'yi şişirir. Aşağıdaki **scope kesimi**ni öneriyorum — gerekçeleriyle:

| Selma'nın isteği | MVP'de | V2'de | Gerekçe |
|---|---|---|---|
| Claude rolü: organize | ✅ | | Temel iş, olmazsa olmaz |
| Claude rolü: stil uygula | ✅ | | 3-4 tema MVP'nin diğer farkı |
| Claude rolü: zenginleştir/öğretmen | | ✅ | LLM çağrı maliyeti + güvenlik (output sanitization) tek başına bir iş |
| Claude rolü: site-içi Q&A | | ✅ (V3) | RAG + persistence + auth — ayrı bir epik |
| Hedef kitle: herkes | Claude Code kullananlar | Öğrenci onboarding | Skill, Claude Code kurulu olanlara ulaşır. "Öğrenci için" demek için CC kurulum rampası lazım — bu V2 |
| Tema: 3-4 hazır | ✅ (3 tema) | 4. tema | Editorial + terminal + paper. 4.'sü pattern oturduktan sonra |
| Kılavuz/öğrenme modu | ✅ (statik) | İnteraktif tur | Statik markdown ders sayfaları yeter, gezi turu V2 |
| Patika görselleştirme | ✅ | Canlı stream | Retroactive (session log parse) MVP'de. Canlı (Claude Code çalışırken event stream) çok daha zor |

**Edit'in mantığı:** Selma "mantıksız yerleri editle" dedi. Yukarıdaki kesim MVP'yi 1 haftalık iş yapıyor — patladıkça V2 olur. Twitter post'u için demo gif daha güçlü çünkü tek bir net hikaye anlatıyor: "vault'una arayüz verdim + Claude'un patikası bonus".

## Mimari

```
Claude Code skill (~/.claude/skills/vault-studio/)
       │
       ↓  user: "vault studio aç"
       │
[ Bun local server :7777 ]
       │
       ├─ vault-scanner.ts    → directory tree + kategorize
       ├─ path-parser.ts      → Claude Code session.jsonl parse
       ├─ file-api.ts         → read/write markdown (vault dosyaları)
       ├─ secret-guard.ts     → .env / key dosyaları readonly + masked preview
       └─ static / web/       → SPA frontend
                                  │
                                  ↓  browser http://localhost:7777
                                  │
                          [ VaultStudio UI ]
                          ├─ FileTree (sol)
                          ├─ Editor + Preview (orta)
                          ├─ ThemePicker + Customize (sağ üst)
                          ├─ PathTrail (alt, overlay)
                          └─ Guide (modal / tab)
```

**Kritik tasarım kararı: Local-only, no internet by default.** Server `127.0.0.1`'e bind, dış internet trafiği YOK. LLM çağrısı sadece zenginleştirme/Q&A için (V2+) — onda da kullanıcı API key veriyor, Selma'nın sunucusuna hiçbir şey gitmiyor.

## Critical Files (yeni proje, hepsi yeni)

Konum: `/Users/selma/projects/vault-studio/`

| Dosya | Amaç | Reuse |
|---|---|---|
| `skill/SKILL.md` | Claude Code skill manifest (name, description, args) | `~/.claude/skills/terminal-presentation/` pattern referans |
| `skill/start.sh` | `bun server/index.ts && open http://localhost:7777` | — |
| `server/index.ts` | Bun HTTP + REST endpoints | Bun runtime native |
| `server/vault-scanner.ts` | Directory walk + kategorize (vault/code/agent/skill/env/raw) | — |
| `server/path-parser.ts` | `.claude/projects/<slug>/session.jsonl` parse, tool-use event'ler | Mevcut session log formatı |
| `server/file-api.ts` | GET/PUT markdown dosyaları | Frontmatter parser: `gray-matter` |
| `server/secret-guard.ts` | `.env*`, `*credentials*`, `*key*` mask + readonly enforce | Pattern: env regex `=([^\n]+)` → `=***` |
| `web/index.html` | Tek HTML entry | — |
| `web/app.ts` | Router + state | Vanilla TS (önceki sunum pattern'ı), Vue/React opsiyonel |
| `web/components/FileTree.ts` | Kategorize sidebar (5 grup: vault / code / agents / skills / data) | — |
| `web/components/PathTrail.ts` | Session log → animasyonlu yol (SVG path + node highlight) | Selma'nın `loop-animation.html` animation pattern'ı |
| `web/components/Editor.ts` | Markdown edit + wiki-link autocomplete `[[…]]` | `marked` + custom autocomplete |
| `web/components/ThemePicker.ts` | 3 hazır + CSS var customizer | Editorial palette `/Users/selma/youtube-brain/vault/themes/editorial-presentation-style.md` |
| `web/themes/editorial.css` | Krem/terracotta (V6 stili kopyası) | `presentation.html` :root vars'tan portla |
| `web/themes/terminal.css` | Matrix/hacker | `~/.claude/skills/terminal-presentation/` örnek dosyalardan portla |
| `web/themes/paper.css` | Sade beyaz, akademik | Yeni — özgün |
| `web/docs/*.md` | Kılavuz: vault-nedir, llm-wiki, skill-yazma, claude-code-nedir | İlk taslakları `vault/themes/`'den uyarla |
| `README.md` | Proje açıklaması (TR + EN) | Selma'nın `claude-computer-demo/README.md` formatı |

## MVP Akışı (kullanıcı bakışı)

1. Kullanıcı `~/.claude/skills/vault-studio/` skill'i kurar (tek satır install komutu)
2. Herhangi bir projede Claude'a "vault studio aç" der
3. Skill `bun server` başlatır, browser açılır → `http://localhost:7777`
4. Studio yüklenir:
   - **Sol**: file tree, 5 kategori (vault / code / agents / skills / data)
   - **Orta**: dosya seçince markdown render + wiki-link tıklanabilir
   - **Sağ üst**: tema picker (editorial / terminal / paper), "customize" tuşu CSS var slider'ları açar
   - **Alt overlay**: "Claude'un patikası" — son session'da hangi sırada hangi dosya, animasyonlu
   - **Top bar**: "Kılavuz" tuşu — modal'da statik öğrenme sayfaları
5. Kullanıcı not yazabilir (sol "yeni not" tuşu) → vault'a yazılır
6. Wiki link autocomplete: `[[` yazınca mevcut dosyalar listelenir

## Güvenlik / Security (zorunlu)

- Server **sadece** `127.0.0.1:7777` (LAN'a açık değil, internet'e açık değil)
- Vault path **skill başlatıldığı cwd**'ye scoped — başka klasör görünmez
- `.env*`, `id_*`, `*_credentials*`, `*api_key*` regex match'leri **mask + readonly**
- File API'de path traversal koruması (`..` reject, realpath check)
- LLM çağrısı YOK (MVP'de). V2'de eklendiğinde: user-provided key, sunucu sadece proxy, log yok
- CSP header: `default-src 'self'`, no external scripts

## Verification (uçtan uca test)

1. **Kurulum testi**: `~/.claude/skills/vault-studio/` symlinkle, Claude Code'da `/skills` listesinde görünmeli
2. **Server testi**: Skill çalıştır, `curl http://127.0.0.1:7777/api/tree` → JSON, 5 kategori
3. **Test vault**: `/Users/selma/youtube-brain` üzerinde aç — vault klasörü tree'de görünmeli, dosya açınca wiki link tıklanabilir olmalı
4. **Patika testi**: Bu konuşmanın session.jsonl'ını parse et → bugün okunan/yazılan dosyalar tree üstünde sırayla highlight olmalı
5. **Tema testi**: 3 tema arasında geçiş, customize ile `--accent` değiştir, refresh sonrası persist (localStorage)
6. **Güvenlik testi**: `youtube-brain/projects/claude-computer-demo/.env` aç → değer mask'lı görünmeli, edit tuşu disabled
7. **Path traversal testi**: `/api/file?path=../../etc/passwd` → 403 / reject
8. **Browser testi**: Chrome + Safari + Firefox'ta render kontrol (özellikle CSS var animation)

## Twitter Demo Hikayesi (post-MVP)

30 saniyelik gif kurgusu:
1. Terminal: `claude` → "vault studio aç"
2. Browser açılır → file tree dolu, vault dosyaları görünür
3. Tema değiştir (editorial → terminal) — instant
4. "Claude'un patikası" overlay aç — dosyalar sırayla highlight
5. Bir nota tık → markdown render, `[[link]]`'ler tıklanabilir
6. Yeni not yaz → kaydet → sol tree'de görünür

Caption: "Vault'una arayüz yazdım. Claude Code skill olarak kurulu. 'Vault studio aç' diyince lokalde çalışıyor. Bonus: Claude'un projende hangi sırada nereyi gezdiğini gösteriyor."

## V2 Backlog (MVP onaylandıktan sonra)

- Claude zenginleştirme (LLM API key + organize/expand komutları)
- Site-içi Q&A (RAG, vault embeddings)
- Canlı patika stream (Claude Code çalışırken event hook)
- Statik site export (vault → Vercel/Netlify deploy butonu)
- İnteraktif kılavuz turu (ilk açılışta walk-through)
- 4. tema (community-contributed)

## Açık Notlar / Risk

- **Bun bağımlılığı**: Skill çalışması için Bun kurulu olmalı. Selma'nın projelerinde `bun` zaten var ama yaygın olmayabilir. Alternatif: skill install adımında `curl bun.sh/install` öner.
- **Session log şeması**: Claude Code session.jsonl formatı değişebilir. Path-parser'ı schema validation ile yaz, format değişirse graceful degrade (patika devre dışı, geri kalan çalışır).
- **Çoklu vault**: MVP'de tek cwd. Kullanıcı başka projede `vault studio aç` derse yeni server instance — port çakışması olur. Çözüm: skill'i çağırınca önce 7777'i kontrol et, doluysa 7778, 7779...
- **MIT lisans**: Açık kaynak GitHub repo (twitter post için zorunlu). Selma `selmakcby/vault-studio`.
