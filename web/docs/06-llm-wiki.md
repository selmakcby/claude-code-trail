# LLM-Wiki stratejisi

## RAG değil — wiki

Standart RAG yaklaşımı: kaynakları indeksle, sorulduğunda en yakın chunk'ları getir, modele ver. Her sorgu yeniden keşfedilir, hiçbir şey kalıcı olarak öğrenilmez.

**LLM-Wiki yaklaşımı farklı:** model **birikimli** bir bilgi arşivi inşa eder. Yeni kaynak gelir, mevcut wiki'ye entegre eder, varlık ve kavram sayfalarını günceller, çelişkileri işaretler, çapraz-referansları korur.

Bu Selma'nın `youtube-brain` projesinin felsefesi — YouTube videolarından kalıcı bilgi arşivi.

## Wiki yapısı — 4 katman

```
vault/
├── index.md                ← ana sayfa, tema/varlık linkleri
├── insights/               ← çıkarımlar, soyut bilgiler
│   └── llm-wiki-vs-rag.md
├── ideas/                  ← ham fikirler, henüz işlenmemiş
│   └── 2026-05-25.md
├── drafts/                 ← yazılmakta olan içerikler
│   └── computer-use-video.md
├── log.md                  ← günlük etkinlik (append-only)
└── data/                   ← kaynak materyaller
    └── videos/
        └── <slug>/
            ├── description.md
            └── transcript.md
```

## 4 tipik akış

### Akış 1: Yeni kaynak geliyor
1. `data/videos/<slug>/` altına ham veri (description, transcript)
2. `insights/` altına çıkarımlar yazılır
3. `index.md`'de yeni link eklenir
4. İlgili `ideas/` veya `drafts/` güncellenir

### Akış 2: Mevcut bilgi güncellenir
1. Yeni bilgi geldi, eski sayfada ne var bak
2. Tutarsa: aynı dosyaya **update** ekle (append, başında tarih)
3. Tutmazsa: çelişki notu ekle, ikisini de bırak, gerçek araştırma sonrası karar

### Akış 3: Soru cevaplanır
1. Vault'ta arama yap (Grep / Glob)
2. İlgili sayfaları oku
3. Birden fazla kaynak varsa **karşılaştırma** yap, çelişki bul
4. Cevap içerikten çıkartılır + kaynak link verilir

### Akış 4: Çıktıya dönüştürme (YouTube video, makale)
1. `drafts/<konu>.md` aç
2. `insights/` + `data/` referans alarak içerik üret
3. Yayın sonrası `drafts/` → `log.md`'ye taşı (mention)

## Karar matrisi — yeni dosya mı, update mi?

| Durum | Aksiyon |
|---|---|
| Yepyeni konu | **Yeni dosya** + index'e link |
| Mevcut konu hakkında yeni bilgi | **Update** (append, tarihli) |
| Mevcut bilgiyle çelişki | **Update** + çelişki notu, ikisini bırak |
| Aynı bilginin farklı kelimelerle tekrarı | **Atla** veya mevcut sayfayı zenginleştir |
| Geçici düşünce | `ideas/2026-05-25.md` (günlük dosya) |

## "Atomic note" prensibi

Bir dosya = bir kavram veya varlık.

- ❌ `python-stuff.md` (çok geniş)
- ✅ `python-async-pattern.md` (atomic, tek konu)
- ✅ `gpt-4o-vision-yetenekleri.md` (atomic, tek varlık)

Bir kavram büyürse böl. Bir kavram diğeriyle yakınsa wiki-link kullan (`[[python-async-pattern]]`).

## Trail ile LLM-wiki nasıl yapılır?

1. **Notlar sekmesi** → günlük hızlı not, sonra `ideas/`'a taşı veya `insights/` aç
2. **Dosyalar sekmesi** → tüm vault gezinme, wiki-link'leri tıkla
3. **Bellek sekmesi** → `reference` type ile dış kaynak linkleri (Grafana, GitHub, dokümantasyon)
4. **Patika sekmesi** → Claude vault'unu nasıl tarıyor gör, hangi dosyalara temas ediyor — bilgi kayıpları orada görünür

## Pratik egzersiz

Eğer henüz vault'un yoksa, şu yapıyla başla:

```
projen/
├── vault/
│   ├── index.md             # ana sayfa
│   ├── insights/            # çıkarımlar
│   ├── ideas/               # ham fikirler
│   ├── drafts/              # çalışmalar
│   └── log.md               # günlük
└── CLAUDE.md                # projeye özel talimatlar
```

İlk `vault/index.md` içine yaz:

```markdown
# Bilgi sandığı

## Aktif konular
- [[ilk-konu]]
- [[ikinci-konu]]

## Son güncellenenler
- 2026-05-25 — [[ilk-konu]] eklendi
```

Sonra `vault/insights/ilk-konu.md` aç, frontmatter ile başla:

```markdown
---
title: İlk konu
tags: [örnek]
created: 2026-05-25
---

İlk içerik...
```

Trail'de Dosyalar sekmesinden gez, wiki-link'leri tıkla. Çalıştığını gör.

## Daha fazla

Selma'nın `youtube-brain` vault'unu örnek olarak inceleyebilirsin (eğer paylaşıma açıksa). Veya kendi YouTube/blog içeriğin için aynı yapıyı uygula.

> Bütün dersler bitti. **Şimdi pratik:** bir gerçek dosyaya not al, bir agent oluştur, bir memory ekle. Trail'i kullanmanın en hızlı öğrenme yolu.
