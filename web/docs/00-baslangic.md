# Trail nedir, nasıl başla

Trail, **Claude Code'la çalışırken ne olduğunu gözünle gör + projendeki bilgi alanını yönet** diye yazılmış bir Claude Code plugin'i. Tamamen lokal — server `127.0.0.1`'de çalışır, hiçbir veri dışarı çıkmaz, LLM çağrısı yapmaz.

## Bu pencerede ne göreceksin

Üstte 7 sekme:

- **Notlar** — hızlı not alma, `vault/notlar/` altına otomatik kayıt
- **Dosyalar** — proje dosyaları + markdown render
- **Patika** — Claude şu an açık olan session'da hangi dosyalara hangi sırayla dokundu
- **Bellek** — Claude seni nasıl hatırlıyor (4 tür memory)
- **Ajanlar** — bu projedeki ve global ajanlar + kullanım sıklığı
- **Geçmiş** — tüm Claude session'larının arşivi + her birinin replay'i
- **Kılavuz** — burada okuduğun ders sayfaları

## Hangi dert için?

İki büyük dert var:

**1. Görünmezlik.** Claude bir konuşmada 50 farklı şey yapıyor — okudu, yazdı, komut çalıştırdı. Sonra ne yaptığını hatırlamak zor. Git diff sadece dosya değişikliklerini gösteriyor. Trail'in **Patika** ve **Geçmiş** sekmeleri bu boşluğu kapatıyor.

**2. Hafıza.** Claude memory'i, ajan tanımlarını, session log'larını disk'te saklıyor ama kimse bakmıyor. Trail'in **Bellek** ve **Ajanlar** sekmeleri bunları gözünün önüne koyuyor.

## Nasıl başla

1. **Notlar**'a tıkla → `+ Yeni not` ile bir test notu aç, yazmayı dene (otomatik kayıt)
2. **Patika**'ya tıkla → mevcut Claude konuşmanın kronolojisini gör
3. **Bellek**'e tıkla → Claude'un seni nasıl hatırladığını oku, `+ Yeni` ile bir kayıt ekle
4. **Kılavuz** ders 01'e geç — Vault kavramını anla

> **İpucu:** Tema'yı sağ üstten değiştir (Dark / Cream / Term). `↻ auto` toggle'ı statusbar'da, otomatik yenileme aç/kapa.
