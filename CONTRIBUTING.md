# Katkıda bulunma

Trail için katkıya açığım. Aşağıdaki kurallara uy.

## Kurulum (development)

```bash
git clone <repo> ~/vault-studio
cd ~/vault-studio

# Bun >= 1.0
bun --version

# Bir test projesi üzerinde dene
VAULT_DIR=/path/to/test/project bash scripts/start.sh
```

Bun runtime native TypeScript — derleme yok. Frontend vanilla JS, no build step. Değişiklik yap → server yeniden başlat → browser hard refresh.

## PR kuralları

- **Tek sorumluluk:** Bir PR bir şey yapsın. Refactor + feature aynı PR'a girmesin
- **Commit format:** `<type>: <açıklama>` (feat, fix, refactor, docs, test, chore)
- **Test:** Manuel olarak en az `youtube-brain` benzeri gerçek bir vault'ta test et
- **Tema testi:** 3 temada da kontrol et (soft-dark, editorial, terminal)

## Hangi şeyler kabul edilir

- ✅ Bug fix
- ✅ Yeni tab veya endpoint (önce issue aç, kapsamı konuş)
- ✅ Tema ekleme (`web/themes/<name>.css` + CSS variable seti tam olmalı)
- ✅ Yeni Kılavuz ders sayfası (`web/docs/`'a markdown + `_index.json` güncelle)
- ✅ Belge iyileştirmesi
- ✅ Türkçe → İngilizce çeviri (i18n hazırlığı için)

## Hangi şeyler reddedilir

- ❌ Server'dan dış internete çağrı (lokal-only ilkesi)
- ❌ LLM çağrısı (V2'de eklenecek, kullanıcının kendi API key'i ile)
- ❌ Telemetri / analytics
- ❌ Bağımlılık ekleme (Bun + vanilla JS yeter — istisnası: gerçekten kritik bir özellik için)
- ❌ Build step (vanilla JS kalsın, no Webpack/Vite)

## Klasör yapısı

```
server/        → Bun TS, native (no build)
web/           → Vanilla JS modules, no build
web/tabs/      → Her tab tek dosyada, export edilmiş renderXTab(container)
web/themes/    → CSS variable setleri
web/docs/      → Kılavuz markdown'ları
.claude-plugin/→ Plugin/marketplace manifestleri
scripts/       → Shell scripts
```

## Yeni tab ekleme adımları

1. `web/tabs/<name>.js` → `export async function renderXTab(container)` fonksiyonu
2. `web/app.js` → import + `TABS` map'e ekle
3. `web/index.html` → topbar tab buton + welcome overlay tanıtım
4. `web/base.css` → yeni layout class'ları (mevcut pattern'i takip)
5. (gerekiyorsa) `server/<name>-api.ts` + `server/index.ts` endpoint
6. Manuel test 3 temada

## Güvenlik

Güvenlik açığı bulursan **GitHub issue açma**. Direkt e-posta: SECURITY.md'deki adrese.

## Lisans

Katkıda bulunarak MIT lisansı altında bağışta bulunmuş olursun.
