# Patika nasıl okunur

## Patika nedir?

**Patika** = aktif Claude Code session'ında yapılan tüm tool çağrılarının kronolojik kaydı. Her okuma, yazma, komut, arama — sırasıyla.

Trail bu veriyi `~/.claude/projects/<encoded-path>/<session-uuid>.jsonl` dosyasından canlı parse eder.

## Patika sekmesinde 4 bölüm

### 1. İnsan-dili özet (en üst)
> "Claude bu session'da 51 işlem yaptı · 16 dosyaya dokundu · en çok komut kullandı (26 kez) · en çok temas: /vault/index.md (4×) · süre 12dk"

Tek satırda "ne oldu". Konuşmayı hızlıca anlamak için.

### 2. Tool dağılımı (breakdown)
Her tool tipinin kaç kere kullanıldığı bar grafik:

| Tool | Türkçe | Ne yapar |
|---|---|---|
| `Bash` | komut | shell komutu (ls, git, npm...) |
| `Read` | okuma | dosya okuma |
| `Write` | yazma | yeni dosya yazma |
| `Edit` | düzenleme | mevcut dosyada satır değiştirme |
| `Grep` | metin arama | dosya içeriğinde regex arama |
| `Glob` | dosya arama | dosya adı pattern'iyle arama |
| `Agent` | alt ajan | subagent tetikleme |
| `WebFetch` | web indirme | URL'den içerik çekme |

**İpucu:** Bash + Read kombinasyonu yüksekse Claude araştırma modundaydı. Write + Edit yüksekse implementation modundaydı.

### 3. Dosya ısı haritası (heatmap)
En çok temas edilen dosyalar, kaç kere değil **ne kadar yoğun** dokunulduğunu gösterir:

- Renk yoğunluğu = dokunma sıklığı
- Yanında küçük tool glyph'ları (hangi tool ile)

Bu "Claude şu konuda en çok şu dosyalara baktı" cevabını verir. Eğer bir dosya çok temas almışsa Claude orada karar veriyordu.

### 4. Kronolojik patika (scrubber'lı)
En altta bir scrubber + tüm tool çağrılarının listesi:

- Scrubber'ı sola çek → o zamana kadar olanlar vurgulanır, sonrası soluk olur
- Sağdaki sayaç (`37/51`) hangi adımda olduğunu söyler
- Hover'da tool detayı

**Pratik kullanım:** "Hatırlamıyorum, hangi noktada Claude şu dosyayı açtı?" sorusunun cevabı burada.

## Patika ne öğretir?

1. **Verimlilik analizi:** Claude beklediğinden çok mu Bash kullandı? Belki direkt Glob daha iyiydi.
2. **Tekrar tespiti:** Aynı dosya 8 kez okundu mu? Claude bağlam kaybediyor olabilir.
3. **Strateji görme:** İlk 10 adım araştırma, sonraki 20 adım yazma — Claude'un planı görünür hale gelir.
4. **Demo malzemesi:** "Şuna baktı, şunu okudu, sonra yazdı" hikayesi YouTube/Twitter için altın.

## Şu an aktif session değil — eskisini görmek istiyorsan

**Geçmiş** sekmesine git. Tüm session listesi (son 30). Bir tanesine tıkla → detayında **Patika** ve **Konuşma** tab'ları var. **Patika** burayla aynı (statik), **Konuşma** o sessionda atılan mesajların tamamı.

## Pratik egzersiz

1. **Patika** sekmesine git
2. Üstteki özet cümlesini oku — Claude bugün en çok ne yaptı?
3. Scrubber'ı sola al → ilk 5 adımı izle
4. Heatmap'te en üstteki dosyaya bak — neden o kadar temas aldı?
5. **Geçmiş** sekmesine geç, en uzun session'ı aç → **Konuşma** tab'ında "ilk prompt"u oku, ne istemiştin hatırla

> Sonraki ders: **LLM-Wiki stratejisi** — vault'unu birikimli bilgi arşivine çevirmek için.
