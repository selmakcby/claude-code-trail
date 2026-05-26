# Vault nedir, Claude'la nasıl çalışır

## Vault = bilgi sandığı

"Vault" terimi Obsidian'dan geldi: bir klasör + içindeki markdown dosyaları. Ama Claude Code dünyasında **vault** sadece markdown değil — projendeki tüm bilgi alanı:

```
projen/
├── vault/              ← markdown notlar (Obsidian'da yaygın)
├── .claude/
│   ├── agents/         ← uzmanlaşmış subagent tanımları
│   ├── commands/       ← /komut tanımları
│   └── skills/         ← skill'ler
├── CLAUDE.md           ← projeye özel kalıcı talimatlar
├── kod/                ← uygulama kaynak kodu
└── data/               ← veri dosyaları
```

Trail bu yapıyı **5 kategoriye** ayırıyor (Dosyalar sekmesi sol panel):

| Kategori | İçerik |
|---|---|
| `vault` | `.md`, `.mdx`, `.markdown`, `.txt` — yazılı bilgi |
| `code` | kaynak kodu (.ts, .js, .py, .rs, .go, .html, .css...) |
| `agents` | `.claude/agents/` + `agents/` altındaki ajan tanımları |
| `skills` | `.claude/skills/`, `skills/`, `.claude-plugin/`, `commands/` |
| `data` | `.json`, `.yaml`, `.csv`, `.env*` (env'ler mask'lı) |

## .claude/ klasörü — projenin "beyni"

Her Claude Code projesinin altında `.claude/` klasörü oluşur:

- `.claude/agents/*.md` — projeye özel subagent'lar
- `.claude/commands/*.md` — projeye özel `/komut`lar
- `.claude/skills/*` — projeye özel skill'ler
- `.claude/settings.json` — hook'lar, permission'lar
- `~/.claude/projects/<encoded-path>/` — session log'ları + memory (vault dışında)

Trail bunların hepsini görselleştirir. Sen `.claude/` içine elle bakmak zorunda değilsin.

## CLAUDE.md — projenin sabit talimatları

Her projenin kök klasöründe `CLAUDE.md` olursa, Claude her konuşmada bunu otomatik okur. "Bu proje şu stack'i kullanıyor", "Şu klasörü değiştirme", "Türkçe cevap ver" gibi talimatlar oraya gider.

Trail'de bu dosya **Dosyalar** sekmesinde root'ta gözükür, edit edilebilir.

## Vault dışı kalan veriler

Bunlar Trail'in **Bellek**, **Patika**, **Geçmiş** sekmelerinde gözükür ama vault'ta olmaz:

- `~/.claude/projects/<slug>/*.jsonl` — session log'ları (her konuşma için bir dosya)
- `~/.claude/projects/<slug>/memory/` — Claude'un bu projedeki kullanıcı belleği

Bunlar Claude'un kendi telemetrisi. Sen yazmıyorsun, Claude yazıyor.

## Pratik egzersiz

1. **Dosyalar** sekmesinde sol üstten `vault` filtresine tıkla → sadece markdown notlar
2. `agents` filtresine geç → projendeki ajan tanımlarını gör
3. `skills` filtresine geç → plugin/skill yapısını gör
4. Bir markdown'a tıkla → render edilir, `[[wiki-link]]`'leri tıklanabilir

> Sonraki ders: **Skill nedir, nasıl yazılır** — ilk skill'ini yazmayı öğreneceksin.
