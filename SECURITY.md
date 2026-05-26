# Güvenlik Politikası

## Mimari ilkeler

Trail **lokal-only** bir araçtır:

- Server `127.0.0.1`'e bind, **LAN'a açık değil, internet'e açık değil**
- LLM çağrısı yok — kullanıcının API key'i hiçbir yere gitmez
- Telemetri yok, analytics yok, harici çağrı yok
- CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'`

## Mevcut korumalar

| Risk | Önlem |
|---|---|
| Path traversal (`..`) | `realpath` + `isInside` check (`server/file-api.ts`) |
| Secret expose (`.env`, key dosyaları) | `secret-guard.ts` — mask + readonly |
| Cross-origin istek | `isLocalhost()` host header kontrolü |
| XSS (markdown render) | `escapeHtml` her inline render'da |
| Yetkisiz yazma | Yazma sadece `.md/.mdx/.markdown/.txt` |
| Büyük dosya saldırısı | 5MB dosya, 100KB memory limit |
| LAN exposure | `hostname: "127.0.0.1"` (Bun.serve hard-bind) |

## Korunmayan alanlar

- Aynı bilgisayardaki **başka kullanıcı** server'a erişebilir (POSIX dosya izinleri kontrolü dışında)
- Browser eklentileri içeriği görebilir (browser sandbox dışında)
- Memory ve session log dosyaları **disk'te plain text** — disk şifrelemesi kullan

## Sürüm desteği

| Sürüm | Destek |
|---|---|
| 0.3.x | Aktif |
| 0.2.x | Sadece güvenlik fix'leri |
| 0.1.x | Desteklenmiyor — yükselt |

## Açık raporlama

Güvenlik açığı bulursan **GitHub issue açma** (public).

E-posta: `selmabiyik222@gmail.com` (subject: `[vault-studio security]`)

Yanıt süresi: 5 iş günü içinde ilk değerlendirme.

## Açıklama politikası

- Bildirildiği tarihten itibaren **90 gün** içinde fix + public disclosure
- Acil/exploit-in-the-wild durumda hızlandırılır

## Teşekkür

Bildirimde bulunup public disclosure'a saygı göstermiş katkıcılar CHANGELOG'da
"Security" bölümünde anılır (anonim kalmayı tercih etmedikçe).
