# Skill nedir, nasıl yazılır

## Skill = Claude'a verilen "şu anda şunu yap" rehberi

Skill, Claude'un doğal dilden tetiklenen bir davranışıdır. Sen "X yap" deyince Claude bir markdown dosya açar, oradaki talimatları okur, ona göre davranır.

Bir skill iki yere kurulabilir:
- **Proje:** `.claude/skills/<name>/SKILL.md` (sadece bu projede aktif)
- **Global:** `~/.claude/skills/<name>/SKILL.md` (her projede aktif)
- **Plugin:** `<plugin>/skills/<name>/SKILL.md` (plugin install edilince aktif — Trail böyle dağıtılıyor)

## Skill anatomy

Bir SKILL.md dosyası şöyledir:

```markdown
---
name: trail
description: Kullanıcı "trail aç", "Claude'un izini göster", "projeyi browser'da aç" gibi şeyler söylediğinde lokalde web arayüzünü başlatır.
---

# Trail Skill

Kullanıcı Trail'i açmak istediğinde:

1. `${CLAUDE_PLUGIN_ROOT}/scripts/start.sh` script'ini Bash ile çalıştır
2. Browser'da açılan adresi kullanıcıya bildir
3. Hata durumunda kullanıcıya `curl -fsSL https://bun.sh/install | bash` öner

## Tetik örnekleri
- "trail aç"
- "Claude'un izini göster"
- "projeyi browser'da aç"
```

İki bölüm var:

1. **Frontmatter** (`---` arasında) — sadece `name` ve `description`. Claude bu description'ı okuyup "bu skill'i tetikleyeyim mi" kararı verir.
2. **Body** — skill tetiklendiğinde Claude'un okuyacağı talimatlar. Markdown serbest.

## Önemli: description çok kritik

Claude skill'leri "discovery" için sadece description'a bakar. Description belirsizse skill yanlış zamanlarda tetiklenir veya hiç tetiklenmez.

**İyi description:** ne zaman tetikleneceğini örnekle anlatır.
> "Kullanıcı 'trail aç', 'Claude'un izini göster' gibi şeyler söylediğinde..."

**Kötü description:** ne yaptığını anlatır ama ne zaman tetikleneceğini söylemez.
> "Trail web arayüzünü açar."

## İlk skill'ini yaz — 3 dakikada

`~/.claude/skills/turkce-cevir/SKILL.md` dosyası oluştur:

```markdown
---
name: turkce-cevir
description: Kullanıcı "şunu Türkçeye çevir", "translate to Turkish", "TR çeviri" gibi şeyler söylediğinde verilen metni Türkçeye çevirir, çevirinin alt satırına orijinali ekler.
---

# Türkçe çeviri

Kullanıcı bir metni Türkçeye çevirmeni isterse:

1. Metni ana çevir, akıcı + doğal Türkçe kullan
2. Teknik terimleri olduğu gibi bırak (örn: "API", "endpoint")
3. Çevirinin altına orijinali italik olarak ekle:

   ```
   <çeviri>

   _Orijinal: <orijinal metin>_
   ```
```

Kaydet. Yeni bir Claude Code session aç. "Şunu Türkçeye çevir: 'Hello world'" yaz. Skill tetiklenir.

## Skill mi, Command mi, Agent mi?

| | Tetik | Kullanım |
|---|---|---|
| **Skill** | Doğal dil ("şunu yap") | Sık karşılaşılan görevler — bağlam-aware |
| **Command** | `/komut` | Açık tetik istenen görevler |
| **Agent** | Claude veya sen tetikler | İzole, paralel, uzun iş |

Trail plugin'inde üçü de var:
- `commands/trail.md` — `/trail` slash command
- `skills/trail/SKILL.md` — "trail aç" doğal dil

> Sonraki ders: **Agent nedir, ne zaman kullanılır** — subagent ile skill farkını netleştireceğiz.
