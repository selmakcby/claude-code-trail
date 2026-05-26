# Trail nedir, nasıl başla

Trail, **Claude Code'la çalışırken ne olduğunu gözünle gör + projendeki bilgi alanını yönet** diye yazılmış bir Claude Code plugin'i. Tamamen lokal — server `127.0.0.1`'de çalışır, hiçbir veri dışarı çıkmaz, **LLM çağrısı yapmaz**.

## Bu pencerede ne göreceksin

Üstte 7 sekme:

- **Notlar** — hızlı not alma, projedeki `notes/` (veya mevcut `notlar/`) klasörüne otomatik kayıt
- **Dosyalar** — proje dosyaları + markdown render, `.env` mask'lı
- **Patika** — Claude şu an açık olan session'da hangi dosyalara hangi sırayla dokundu
- **Bellek** — Claude seni nasıl hatırlıyor (4 tür memory)
- **Ajanlar** — bu projedeki ve global ajanlar + kullanım sıklığı + token tahmini
- **Geçmiş** — tüm Claude session'larının arşivi + her birinin replay'i (Patika ya da Konuşma görünümü)
- **Kılavuz** — burada okuduğun 7 ders

## Multi-project — bir pencereden tüm Claude projelerin

Sol üstteki **proje seçici dropdown**'unda bilgisayarındaki **bütün Claude Code projelerini** görürsün. Trail `~/.claude/projects/` altındaki session log'larını tarayıp her projeyi otomatik keşfeder. Tıkla, geç — server yeniden başlatmaya gerek yok, mevcut sekme yeni projeye göre tazelenir.

Bir projeden diğerine geçince cache temizlenir, aktif proje localStorage'a yazılır (refresh sonrası korunur).

## Dil ve tema

- **Sağ üst — EN / TR toggle**: Varsayılan dil İngilizce, Türkçe tek tıkla. Tab başlıkları, butonlar, hata mesajları hepsi anlık çevrilir.
- **Sağ üst — Karanlık / Krem / Term**: 3 tema. Seçim localStorage'da kalır.

## Hangi dert için?

İki büyük dert var:

**1. Görünmezlik.** Claude bir konuşmada 50 farklı şey yapıyor — okudu, yazdı, komut çalıştırdı. Sonra ne yaptığını hatırlamak zor. Git diff sadece dosya değişikliklerini gösteriyor. Trail'in **Patika** ve **Geçmiş** sekmeleri bu boşluğu kapatıyor.

**2. Hafıza.** Claude memory'i, ajan tanımlarını, session log'larını disk'te saklıyor ama kimse bakmıyor. Trail'in **Bellek** ve **Ajanlar** sekmeleri bunları gözünün önüne koyuyor.

## Otomatik yenileme

Statusbar'daki **`otomatik yenile`** toggle'ı açıkken her 10 saniyede aktif sekme sessizce tazelenir. Claude bir dosya yazınca / yeni bir session başlatınca / memory eklediğinde otomatik görürsün — manuel refresh atmana gerek yok.

Tazeleme sırasında **seçimin korunur**: açtığın eski konuşmadan kovulmazsın, üzerinde çalıştığın notun textarea'sı silinmez, açık dosyan kapanmaz. Sadece arka plandaki liste güncellenir.

## Maliyet — ne kadar token harcar?

Trail'in çalışması için Anthropic'e gönderilen token sayısı **net olarak çok düşük**:

| Ne zaman | Ne kadar | Niye |
|---|---|---|
| Claude Code açıkken (idle) | **~30 token** | Skill description manifest'te durur, Claude'un context'inde sürekli yüklü kalır |
| Kullanıcı `/trail` yazdığında | **~500–800 token (bir kez)** | `commands/trail.md` body'si context'e yüklenir + Claude'un sana açıklamayı yazması için ~100 output token |
| Kullanıcı "trail aç" / "show me what claude did" derken | **~200–400 token (bir kez)** | Skill tetiklenir, SKILL.md gövdesi context'e gelir |
| Trail UI'si çalışırken (browser açık) | **0 token** | Server tamamen lokal, **hiçbir LLM çağrısı yok**. Patika, geçmiş, dosya açma, not alma — hepsi lokal disk + Bun |
| Trail dosyalarını okurken (Files / Memory / Geçmiş) | **0 token** | Bun server `~/.claude/projects/*.jsonl` dosyalarını lokal'de parse eder, hiçbir API'a vurmaz |

Tipik bir Claude Code günü için Trail'in **toplam maliyeti ~1–2K token** civarı (plugin yüklü + birkaç defa `/trail` çağrılır + browser'da çalışır). Karşılaştırma: orta bir mesaj alış-verişi tek başına 5–20K token harcar. Trail'in payı **<%1**.

## Otomatik güncelleme — yeni versiyon nasıl alınır?

Bugün **Claude Code plugin'leri otomatik güncellenmiyor**. Plugin marketplace cache'i değişse bile, kurulu plugin disk'te aynı kalır. Trail için yeni versiyon çıktığında üç yol var:

**1. Manuel reinstall (en garanti)**

```
/plugin uninstall trail@selmakcby
/plugin install trail@selmakcby
/reload-plugins
```

Her şey temizlenir, marketplace'ten en son sürüm yeniden çekilir. ~5 saniye.

**2. Marketplace cache'i tazele + reinstall**

```
/plugin marketplace remove selmakcby
/plugin marketplace add selmakcby/claude-code-trail
/plugin install trail@selmakcby
```

Marketplace metadata'sının da cache'lendiği durumlar için.

**3. Yeni sürümden haberdar olma**

- **GitHub Releases watch**: `https://github.com/selmakcby/claude-code-trail` → "Watch" → "Custom" → "Releases" işaretle, mail al
- **CHANGELOG.md**: repo kökünde, her sürüm değişiklik notlarıyla
- **statusbar'daki versiyon etiketi** (sağ altta `v0.3.x` yazar): yeni sürümle uyumsuzluk hissedersen kontrol et

> İleride Claude Code resmi auto-update getirirse Trail bundan otomatik faydalanır — bizim tarafımızda ek bir iş yok.

## Nasıl başla — ilk 5 dakika

1. **Notlar**'a tıkla → `+ Yeni not` ile bir test notu aç, yazmayı dene (otomatik kayıt 1.2sn'de tetiklenir, `⌘S` ile anında)
2. **Patika**'ya tıkla → mevcut Claude konuşmanın kronolojisini gör, scrubber'ı çek
3. **Bellek**'e tıkla → Claude'un seni nasıl hatırladığını oku, `+ Yeni` ile bir kayıt ekle
4. **Geçmiş**'e tıkla → eski bir session aç, "Konuşma" görünümünde mesajları replay'le
5. **Kılavuz** ders 01'e geç — Vault kavramını anla

## Klavye kısayolları

- `⌘N` — herhangi bir sekmede, Notlar'a geçip yeni not açar
- `⌘S` — Notlar'da, açık notu hemen kaydeder
- `?` — Welcome overlay'i yeniden açar (statusbar'daki `rehber` butonuyla da)
- `Esc` — Welcome overlay'i veya açık form'u kapatır
