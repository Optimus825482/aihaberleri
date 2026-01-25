# IndexNow Setup Guide

## Sunucuda Kullanım (tsx olmadan)

### Yöntem 1: API Endpoint (Önerilen)

1. Next.js sunucusunun çalıştığından emin ol:

```bash
npm start
```

2. Başka bir terminal'de API'yi çağır:

```bash
curl http://localhost:3000/api/seo/init-indexnow
```

veya npm script ile:

```bash
npm run seo:init
```

### Yöntem 2: Direkt curl

```bash
curl -X GET http://localhost:3000/api/seo/init-indexnow | jq
```

### Yöntem 3: Browser

Sunucu çalışırken tarayıcıdan:

```
http://your-domain.com/api/seo/init-indexnow
```

## Ne Yapar?

1. ✅ IndexNow key dosyası oluşturur (`public/*.txt`)
2. ✅ Tüm published article'ları IndexNow'a submit eder
3. ✅ SEO indexing'i başlatır

## Sonuç

```json
{
  "success": true,
  "message": "IndexNow initialization tamamlandı",
  "count": 8,
  "steps": [
    "✅ Key dosyası oluşturuldu",
    "✅ 8 article IndexNow'a gönderildi",
    "📋 Sonraki adım: Google Search Console'da sitemap submit edin"
  ]
}
```

## Troubleshooting

### Sunucu çalışmıyor

```bash
# Sunucuyu başlat
npm start

# Başka terminal'de
npm run seo:init
```

### Port farklı

```bash
# Farklı port kullanıyorsan
curl http://localhost:PORT/api/seo/init-indexnow
```

### Production'da

```bash
curl https://your-domain.com/api/seo/init-indexnow
```
