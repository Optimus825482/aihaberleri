# 🚀 Google Indexleme Sorunu - Hemen Yapılacaklar

## ✅ Tamamlanan

1. ✅ Proje jCodemunch ile indexlendi
2. ✅ Sitemap ve robots.txt analiz edildi
3. ✅ Kod tabanında lokal path kontrolü yapıldı (temiz)
4. ✅ Sitemap kontrol script'i oluşturuldu

## 🎯 Şimdi Yapman Gerekenler (Sırayla)

### 1. Sitemap Kontrolü (5 dakika)

```bash
# Script'i çalıştır
npm run check:sitemap

# Çıktıyı incele:
# - Toplam URL sayısı
# - Duplicate var mı?
# - Veritabanı ile tutarlı mı?
```

**Beklenen:** URL sayısı makul olmalı (< 10,000), duplicate olmamalı.

### 2. Canlı Sitemap Kontrolü (2 dakika)

Tarayıcıda aç:

```
https://aihaberleri.org/sitemap.xml
https://aihaberleri.org/news-sitemap.xml
https://aihaberleri.org/robots.txt
```

**Kontrol et:**

- ✅ XML düzgün görünüyor mu?
- ✅ URL'ler doğru mu? (https://aihaberleri.org/news/...)
- ✅ Lokal path yok mu? (D:\, C:\, localhost)

### 3. Google Search Console İncelemesi (10 dakika)

**Adım 1: 404 URL'leri İncele**

```
1. Google Search Console'a gir
2. Kapsam → Bulunamadı (404)
3. İlk 20-30 URL'yi incele
4. Pattern bul:
   - Hepsi aynı tipte mi? (örn: /blog/... veya /old-path/...)
   - Tarih aralığı? (ne zaman başladı?)
   - Kaynak? (site haritası mı, harici link mi?)
```

**Adım 2: URL Denetleme**

```
1. Bir 404 URL'yi kopyala
2. URL Denetleme aracına yapıştır
3. "Keşfet" sekmesine bak
4. Nereden geldiğini öğren (site haritası, harici link, vb.)
```

**Adım 3: Eski Site Haritalarını Sil**

```
1. Site Haritaları → Mevcut site haritalarını gör
2. Eski/hatalı olanları sil
3. Sadece şunları tut:
   - https://aihaberleri.org/sitemap.xml
   - https://aihaberleri.org/news-sitemap.xml
```

### 4. Yönlendirme Ekle (Gerekirse) (15 dakika)

Eğer 404'ler eski URL pattern'inden geliyorsa:

**Örnek:** Eski URL'ler `/blog/...` şeklindeyse ve yeni URL'ler `/news/...` ise:

`next.config.js` dosyasını aç ve ekle:

```javascript
async redirects() {
  return [
    {
      source: '/blog/:slug',
      destination: '/news/:slug',
      permanent: true, // 301 redirect
    },
    // Başka pattern varsa ekle
  ]
}
```

Sonra:

```bash
npm run build
# Deploy et (Coolify, Vercel, vb.)
```

### 5. Yeniden Dizine Ekleme İste (5 dakika)

```
1. Google Search Console → URL Denetleme
2. Ana sayfayı denetle: https://aihaberleri.org
3. "Dizine ekleme iste" butonuna tıkla
4. Birkaç önemli sayfa için tekrarla:
   - https://aihaberleri.org/sitemap.xml
   - En popüler 2-3 makale
```

## 📊 Takip (1-2 hafta)

### Günlük Kontrol

```bash
# Her gün çalıştır
npm run check:sitemap
```

### Haftalık Kontrol

Google Search Console'da:

- Kapsam raporu → 404 sayısı azalıyor mu?
- Kapsam raporu → Yeni URL'ler indexleniyor mu?
- Performans → Organik trafik artıyor mu?

## 🆘 Sorun Devam Ederse

### Senaryo 1: 404 Sayısı Azalmıyor

**Olası nedenler:**

1. Harici sitelerden hala yanlış linkler geliyor
2. Eski site haritası hala cache'de
3. CDN/Hosting cache sorunu

**Çözüm:**

```bash
# Cache temizle (Cloudflare, Vercel, vb.)
# Google'a manuel bildir (Search Console → Geri Bildirim)
```

### Senaryo 2: Yeni URL'ler İndexlenmiyor

**Olası nedenler:**

1. Robots.txt engelliyor
2. Sitemap Google'a ulaşmıyor
3. Crawl bütçesi düşük

**Çözüm:**

```bash
# robots.txt kontrol et
curl https://aihaberleri.org/robots.txt

# Sitemap'i manuel gönder (Search Console)
# Crawl hızını artır (Search Console → Ayarlar)
```

### Senaryo 3: Duplicate Content Uyarısı

**Olası nedenler:**

1. Aynı içerik farklı URL'lerde
2. Canonical tag eksik/yanlış
3. Dil alternatifleri yanlış yapılandırılmış

**Çözüm:**

- Canonical tag'leri kontrol et
- Hreflang tag'lerini kontrol et
- Sitemap'te duplicate URL'leri temizle

## 📞 Bana Dönüş

Yukarıdaki adımları tamamladıktan sonra bana şunları paylaş:

1. `npm run check:sitemap` çıktısı
2. Google Search Console'dan 5-10 örnek 404 URL
3. 404'lerin pattern'i (varsa)
4. Eski URL yapısı neydi? (migration yaptıysan)

Bu bilgilerle spesifik çözüm üretiriz!

---

**Not:** Bu işlemler production'ı etkilemez, güvenle yapabilirsin.
