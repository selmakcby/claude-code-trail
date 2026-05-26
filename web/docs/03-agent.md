# Agent nedir, ne zaman kullanılır

## Agent = izole bir Claude alt-konuşması

Subagent, ana Claude konuşmasından **bağımsız** çalışan bir Claude instance'ıdır. Sen ana Claude'a "şu işi şu ajana yaptır" der, ana Claude alt-bir Claude'u tetikler, sonuç döner.

İki yere kurulur:
- **Proje:** `.claude/agents/<name>.md`
- **Global:** `~/.claude/agents/<name>.md`

## Skill vs Agent — net fark

| Skill | Agent |
|---|---|
| Ana konuşmada davranır | İzole konuşmada çalışır |
| Bağlam paylaşır | Bağlam temiz |
| "Sen bu mod'da konuş" | "Sen şu işi yap, sonucu döndür" |
| Sürekli kullanılır | Spesifik görevler için |
| Token verimli | Token daha pahalı (kendi history'si var) |

**Pratik:** Sık tekrar eden bir tetik → **skill**. İzole bir görev (kod review, test yazma, güvenlik denetimi) → **agent**.

## Agent anatomy

```markdown
---
name: security-reviewer
description: Auth, input validation, API endpoint, secret yönetimi gibi güvenlik-kritik kod yazıldığında devreye girer. OWASP Top 10 zaaflarını arar, fix önerir.
tools: Read, Grep, Glob, Bash
model: sonnet
---

# Security Reviewer

Sen bir senior güvenlik uzmanısın. Görev:

1. Verilen kod parçasını oku
2. Şunları kontrol et:
   - Hard-coded secret
   - SQL injection riski
   - XSS / CSRF
   - Hatalı auth check
   - Input validation eksikliği
3. Her bulguya CRITICAL / HIGH / MEDIUM / LOW etiketi koy
4. Fix önerisi ver
5. Yapılmazsa risk ne olur kısaca açıkla
```

**Önemli alanlar:**

- **name** — slash command'la veya Task tool'unda referans verilen ad
- **description** — Claude bu agent'ı ne zaman çağıracağını anlamak için kullanır
- **tools** (opsiyonel) — agent'ın erişebileceği tool listesi (kısıtla, fewer tools = focused)
- **model** (opsiyonel) — `sonnet`, `opus`, `haiku` — agent için spesifik model

## Tetikleme

Ana Claude konuşmasında Task tool ile çağrılır. Sen elle çağırmazsın, Claude duruma göre kullanır.

Trail'in **Ajanlar** sekmesinde bunu izleyebilirsin: her ajanın "kullanım sıklığı" sayacı var. **Hiç kullanılmayan** ajanları orada görebilir, neden tetiklenmediğini düşünebilirsin (genelde description belirsiz).

## İyi agent yazmanın 3 kuralı

1. **Tek sorumluluk.** Bir agent bir şeyi yapsın. "Hem code review hem refactor hem test yazsın" → kötü. Ayır.
2. **Spesifik description.** "Kullanışlı bir asistan" değil — "Auth/input/security-kritik kod yazıldığında çağrılır".
3. **Tool kısıtlaması.** Agent'a tüm tool'lar değil, ihtiyacı olanlar verilsin. Read+Grep+Glob yetiyorsa Write/Bash verme.

## Pratik egzersiz

Trail'de **Ajanlar** sekmesine git. Filtre'den "kullanılmayan"a tıkla. Hiç tetiklenmeyenleri listele. Description'larını oku — neden tetiklenmedikleri belli mi?

Kullanılmayan ajanları **silmek** projeyi temiz tutar. Plus Claude her konuşmada bütün description'ları taradığı için fazla ajan = daha yavaş discovery.

> Sonraki ders: **Memory nasıl çalışır** — Claude'un seni nasıl hatırladığını anla.
