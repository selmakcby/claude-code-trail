# Plan: Trail — Claude Code'u gör, öğren, yönet

> **İsim notu:** Plan v0 → v0.2 VaultStudio idi, v0.3'te Trail oldu.
> Eski "vault" terimi artık sadece "vault/" klasörünü (markdown notların) ifade eder; ürün adı Trail.

## Vizyon

**Trail = Claude Code'la çalışırken ne olduğunu gösteren ilk araç.**

Obsidian dosya gösteriyor. NotebookLM AI'la sohbet ettiriyor. Cursor/VSCode kod yazdırıyor. Hiçbiri Claude Code'un *kendi içinde* ne yaptığını göstermiyor. Claude:
- Hangi dosyalara dokundu, hangi sırayla?
- Seni nasıl hatırlıyor? (memory)
- Hangi ajanlar kuruldu, hangileri kullanıldı?
- Geçen hafta hangi session'da X dosyasını yazmıştık?

Tüm bu bilgi `~/.claude/projects/<encoded-path>/` altında zaten var — sadece kimse görselleştirmiyor.

Trail bu boşluğu kapatıyor. **Tamamen lokal**: Bun server `127.0.0.1`'e bind, LLM çağrısı yok, dış internet trafiği yok. Privacy + instant + tam kapsama.

"Vault" terimini yeniden tanımlıyoruz: Obsidian'ın markdown vault'u değil, **Claude Code'un projende oluşturduğu tüm hafıza ve varlık alanı** (dosyalar + session'lar + bellek + ajanlar + skill'ler).

## Konumlandırma

| | Obsidian | NotebookLM | Cursor/VSCode | **Trail** |
|---|---|---|---|---|
| Markdown vault | ✓ | | | ✓ |
| AI chat | | ✓ | ✓ | |
| Kod editör | | | ✓ | (basit) |
| **Claude Code observability** | | | | **✓ özgün** |
| Privacy (lokal-only) | ✓ | | | ✓ |
| Açık kaynak + plugin | ✓ | | (kısmen) | ✓ |

## Beş sekme

### 1. Files (✅ V1)
- File tree, 5 kategori filter (vault/code/agents/skills/data)
- Markdown render + edit + save
- Wiki-link `[[…]]` tıklanabilir
- Secret guard: `.env`, `*credentials*` mask + readonly

### 2. Trail — Claude'un Patikası (V1.5)
- Aktif session'ın `*.jsonl` log'unu parse et
- Tool use kronolojisi: Read/Edit/Write/Bash/Grep/Agent
- **File heatmap**: hangi dosyalara kaç kere dokundu
- **Timeline scrubber**: zamanı geri/ileri al, sırayla göster
- Filter: tool type'a göre

### 3. Memory (V1.5)
- `<slug>/memory/MEMORY.md` index + type'lı memory dosyaları
- 4 type'a göre kartlar: user / feedback / project / reference
- Her kart: title, description, body, eklenme zamanı
- Edit (markdown), Sil
- Yeni memory ekle butonu

### 4. Agents (V1.5)
- `.claude/agents/*.md` (proje) + `~/.claude/agents/*.md` (global)
- Her ajan kartı: name, description, tools, system prompt önizleme
- **Kullanım sıklığı**: son N session'da kaç kere çağrıldı (session log'dan say)
- "Kullanılmayan ajanlar" bölümü → temizlik önerisi

### 5. Sessions (V1.6)
- Tüm `<slug>/*.jsonl` dosyaları, kronolojik sıralı
- Her session: timestamp, mesaj sayısı, model, tool use sayısı, ana özet
- Tıklayınca: replay — user/assistant mesajları + tool call'lar
- Search: "geçen hafta X dosyası" → o session'ı bul
- Cost (token usage) gösterimi

## Mimari

```
Claude Code Plugin (GitHub: selmakcby/trail · local: ~/projects/vault-studio)
       │
       ├─ .claude-plugin/plugin.json + marketplace.json
       ├─ commands/trail.md              → /trail
       └─ skills/trail/SKILL.md          → "trail aç"
                       │
                       ↓
[ Bun local server :7777, 127.0.0.1-only ]
       │
       ├─ vault-scanner.ts       → proje dosyaları
       ├─ claude-paths.ts        → ~/.claude/projects/<encoded>/ çöz
       ├─ session-parser.ts      → jsonl → tool use timeline
       ├─ memory-parser.ts       → memory/ → type'lı kartlar
       ├─ agent-parser.ts        → agent definitions + usage stats
       ├─ file-api.ts            → read/write markdown
       └─ secret-guard.ts        → .env mask + readonly
                       │
                       ↓
[ Web UI — 5 sekme ]
   Files | Trail | Memory | Agents | Sessions
              │
              └─ 3 tema: editorial / terminal / soft-dark
```

## Yol haritası

### V1 (tamamlandı)
- Plugin manifest + marketplace + slash command + skill
- Bun server: 127.0.0.1, /api/tree, /api/file GET+PUT
- Files tab: tree + 5 kategori filter + markdown render + edit
- 3 tema (editorial/terminal/soft-dark), localStorage persist
- Secret guard, path traversal koruması, CSP

### V1.5 (bu pivot)
- **Killer features:** Trail + Memory + Agents tab'ları
- Yeni server parsers: claude-paths, session-parser, memory-parser, agent-parser
- Yeni endpoint'ler: /api/trail/current, /api/memory, /api/agents
- Tab navigation UI shell

### V1.6
- Sessions tab + replay
- Cost/token tracking
- Search (cross-session)

### V2
- Wiki-link autocomplete + graph view
- CSS variable customizer (tema runtime tweak)
- 4. tema (community)
- LLM zenginleştirme (kullanıcı API key)
- Statik site export

## Güvenlik

- Server **sadece** `127.0.0.1:7777` (LAN'a açık değil, internet'e açık değil)
- `~/.claude/projects/<encoded>/` salt-okunur erişim (memory hariç — onun edit/sil var)
- Vault path **cwd**'ye scoped; `.env*`, `id_*`, `*credentials*` mask + readonly
- Path traversal koruması (realpath check)
- LLM çağrısı YOK
- CSP header: `default-src 'self'`, no external scripts

## Twitter Demo (post-pivot)

30 saniyelik gif:
1. Terminal: `/plugin install trail@selmakcby`
2. `/vault-studio` → browser açılır
3. **Files tab**: bilinen file tree
4. **Trail tab tıkla**: "Claude bu konuşmada şu dosyalara şu sırayla dokundu" — animasyonlu heatmap
5. **Memory tab**: "Claude seni şöyle hatırlıyor" — type'lı kartlar
6. **Agents tab**: "Sende 12 ajan var, en çok şunu kullanıyorsun" — kullanım grafiği
7. Tema değiştir (editorial → terminal) — instant

Caption: *"Claude Code'la çalıştığında ne olduğunu ilk kez şeffaf hale getirdim. Hangi dosyalara dokundu, seni nasıl hatırlıyor, hangi ajanlar var — hepsi tek pencerede. Lokal, açık kaynak, plugin olarak kuruluyor."*

## Açık notlar / riskler

- **Session log şeması**: Claude Code `.jsonl` formatı değişebilir. Parser'ı defensive yaz, bilinmeyen tool'ları "other" olarak göster, schema fail olursa graceful degrade
- **Path encoding**: `~/.claude/projects/-Users-selma-youtube-brain/` formatı doğrulanmalı (cwd → `cwd.replace(/\//g, '-')`)
- **Memory dosya formatı**: Frontmatter (name/description/type) varsayımı doğrulanmalı; yoksa filename'den çıkarım
- **Çoklu vault**: Aynı projede 2 instance → port çakışması; start.sh 7777-7790 arası deniyor
- **Bun bağımlılığı**: Plugin install sonrası ilk tetikte kontrol, yoksa kurulum komutu öner
- **MIT lisans + GitHub açık kaynak**: Twitter post için zorunlu, repo `selmakcby/trail`
