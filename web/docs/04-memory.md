# Memory nasıl çalışır — 4 tür

## Memory = Claude'un seni hatırlama yöntemi

Claude Code'da "memory" denen şey, projeye özel kalıcı bilgi parçalarıdır. Konuşma bitse bile saklanır, yeni konuşmalarda otomatik kullanılır.

Konum: `~/.claude/projects/<encoded-path>/memory/`

İçinde:
- **`MEMORY.md`** — tüm memory'lerin tek satırlık index'i
- **`<slug>.md`** — her memory için bir markdown dosya, frontmatter'lı

Trail'in **Bellek** sekmesi bu klasörü görselleştirir.

## 4 tür memory

Frontmatter'daki `type` alanına göre 4 kategoriye ayrılır:

### 1. `user` — sen kimsin
> "Senior AI engineer, Vercel deploy ediyor, Next.js + shadcn stack, Türkiye'de"

Sen hakkında bilgi. Rolün, tercih ettiğin stack, çalışma şeklin. Claude bunu okuyup sana ona göre tavsiye veriyor.

### 2. `feedback` — verdiğin yönergeler
> "Test'lerde mock yerine gerçek DB kullan (geçen ay incident vardı)"

Bir konuşmada "şunu yapma", "şu şekilde yap" dediğin önemli geri bildirimler. Claude bunları biriktirir, gelecekte aynı hatayı yapmasın diye.

**Form:** kural + neden + nerede uygulanır.

### 3. `project` — bu projenin ne durumda olduğu
> "Trail v0.3 — C pozisyonu (learning + observability), yarın YouTube tutorial çekilecek"

Projenin mevcut durumu, aktif iş, deadline, niyet. Sürekli değişir — eskimişler silinir.

### 4. `reference` — dış kaynaklara işaretler
> "Production logları Grafana'da: grafana.internal/d/api-latency"

Dış sistemlere işaretler. URL'ler, dashboard linkleri, dokümantasyon yerleri.

## Memory ne zaman eklenir?

Claude, bir konuşma esnasında **karar verir**. Mantık:

- Senden gelen *bir bilgi* (kim olduğun, ne istediğin, ne dediğin) → muhtemelen kayıt
- Verdiğin *güçlü bir feedback* ("şunu yapma", "şuna devam et") → muhtemelen kayıt
- Anlık karar → kayıt yok

Sen manuel da ekleyebilirsin: **Bellek** sekmesinde `+ Yeni` butonu.

## İyi memory yazmanın 3 kuralı

1. **Spesifik ol.** "Selma dikkatli kod sever" değil → "Selma testleri integration olarak yazıyor, mock'tan kaçınıyor (önceki incident sebebi)"
2. **`Why:` yaz.** Sadece kural değil, neden — gelecekte edge case değerlendirmek için.
3. **Eski olanları sil.** Project type memory'ler hızlı eskir. Bellek sekmesinden silebilirsin.

## Memory ile context window karşılaştırması

| | Memory | Context |
|---|---|---|
| Saklanma | Disk (kalıcı) | Konuşma içi (geçici) |
| Boyut | Küçük (~1-2KB her biri) | Büyüyor (200K token'a kadar) |
| Otomatik yüklenir | Evet, her konuşmada | Sıfırdan başlar |
| Sen yönetirsin | Evet (sil/edit/ekle) | Hayır (Claude yönetir) |

Yani memory = uzun vadeli hafıza, context = kısa vadeli (RAM gibi).

## Pratik egzersiz

Trail'de **Bellek** sekmesine git:

1. Filtre'den `proje` (project) tipini seç → mevcut proje memory'leri
2. Bir kart aç, içeriğini oku — frontmatter'daki `why` kısmı var mı?
3. `+ Yeni` ile bir test memory ekle, type'ı `feedback` yap:
   - Başlık: "Test memory"
   - Açıklama: "Bellek tab'ını öğrenirken yazıldı"
   - Type: feedback
   - Body: "Bu sadece test, sonra silinecek"
4. Listede gözüktüğünü gör, sonra sağdaki "sil" ile kaldır

> Sonraki ders: **Patika nasıl okunur** — Trail'in en güçlü ekranını anlayacağız.
