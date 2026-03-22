# Google Indexleme Sorunu Çözüm Rehberi

## 🔍 Durum Analizi

**Tespit Edilen:**

- ✅ Sitemap yapılandırması doğru (`/sitemap.xml` ve `/news-sitemap.xml`)
- ✅ Robots.txt doğru yapılandırılmış
- ✅ Kodda lokal path yok
- ❌ 1.31 milyar 404 hatası (anormal yüksek)

## 🚨 Acil Yapılacaklar

### 1. Google Search Console'da URL Analizi

```
1. Google Search Console → Kapsam → Bulunamadı (404)
2. Örnek URL'leri incele
3. "URL Denetleme" aracıyla nereden geldiğini bul
```

**Kontrol edilecek:**

- URL pattern'leri (hangi tür URL'ler 404 veriyor?)
- Kaynak (site haritası mı, harici link mi?)
- Tarih (ne zaman başladı?)

### 2. Site Haritası Doğrulama

**Canlı site haritalarını kontrol et:**

```bash
# Ana sitemap
curl https://aihaberleri.org/sitemap.xml

# News sitemap
curl https://aihaberleri.org/news-sitemap.xml

# Robots.txt
curl https://aihaberleri.org/robots.txt
```

**Beklenen çıktı:**

- Sitemap'ler XML formatında olmalı
- Sadece PUBLISHED makaleler olmalı
- URL'ler tam ve doğru olmalı (https://aihaberleri.org/news/...)

### 3. Eski URL'leri Yönlendir

Eğer site migration yaptıysan veya URL yapısı değiştiyse:

**Next.js'te 301 yönlendirme ekle:**

`next.config.js` dosyasına:

```javascript
module.exports = {
  async redirects() {
    return [
      // Eski URL pattern'i → Yeni URL
      {
        source: "/eski-url-pattern/:slug",
        destination: "/news/:slug",
        permanent: true, // 301 redirect
      },
      // Birden fazla eski pattern varsa
      {
        source: "/blog/:slug",
        destination: "/news/:slug",
        permanent: true,
      },
    ];
  },
};
```

### 4. Dinamik URL Kontrolü

**Potansiyel sorun:** Dinamik parametreler kontrolsüz çoğalıyor olabilir.

Kontrol et:

```bash
# Veritabanında yayınlanmış makale sayısı
# vs
# Sitemap'teki URL sayısı
```

## 🛠️ Kod İyileştirmeleri

### 1. Sitemap Hata Yönetimi İyileştir

Mevcut kod zaten iyi ama ek güvenlik ekleyelim:

```typescript
// app/sitemap.ts içinde
// Makale sayısını logla
console.log(
  `Sitemap generated: ${articles.length} articles, ${categories.length} categories`,
);

// Toplam URL sayısını kontrol et
const totalUrls =
  staticPages.length +
  categoryPages.length +
  englishCategoryPages.length +
  turkishArticlePages.length +
  englishArticlePages.length;

if (totalUrls > 50000) {
  console.warn(`⚠️ Sitemap has ${totalUrls} URLs (Google limit: 50,000)`);
}
```

### 2. Robots.txt'e Crawl Delay Ekle (Opsiyonel)

Eğer bot trafiği çok yüksekse:

```typescript
// app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/"],
        crawlDelay: 1, // 1 saniye bekle
      },
      // ... diğer kurallar
    ],
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/news-sitemap.xml`],
  };
}
```

### 3. 404 Sayfası İyileştir

Kullanıcı deneyimi için özel 404 sayfası:

`app/not-found.tsx` oluştur:

```typescript
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold mb-4">404 - Sayfa Bulunamadı</h1>
      <p className="text-gray-600 mb-8">
        Aradığınız sayfa mevcut değil veya taşınmış olabilir.
      </p>
      <Link
        href="/"
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
      >
        Ana Sayfaya Dön
      </Link>
    </div>
  );
}
```

## 📊 Google Search Console Aksiyonları

### 1. Eski Site Haritalarını Sil

```
1. Search Console → Site Haritaları
2. Eski/hatalı site haritalarını sil
3. Sadece şunları tut:
   - https://aihaberleri.org/sitemap.xml
   - https://aihaberleri.org/news-sitemap.xml
```

### 2. URL Kaldırma (Gerekirse)

Eğer çok fazla yanlış URL varsa:

```
1. Search Console → Kaldırmalar
2. Toplu URL kaldırma isteği gönder
3. Pattern bazlı kaldırma (örn: /eski-path/*)
```

### 3. Yeniden Dizine Ekleme İste

Düzeltmelerden sonra:

```
1. Search Console → URL Denetleme
2. Ana sayfayı ve önemli sayfaları denetle
3. "Dizine ekleme iste" butonuna tıkla
```

## 🔄 Monitoring ve Takip

### 1. Haftalık Kontrol

```bash
# Sitemap boyutu
curl -s https://aihaberleri.org/sitemap.xml | wc -l

# 404 sayısı (Search Console'dan)
# Trend: azalıyor mu?
```

### 2. Log Analizi

Production loglarında 404'leri takip et:

```typescript
// middleware.ts veya app/api/[...catchall]/route.ts
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 404 logla
  if (!isValidPath(pathname)) {
    console.log(
      `404: ${pathname} | Referer: ${request.headers.get("referer")}`,
    );
  }
}
```

## ✅ Başarı Kriterleri

**1-2 hafta içinde:**

- 404 sayısı %50 azalmalı
- Yeni URL'ler indexlenmeye başlamalı
- Search Console'da "Kapsam" raporu yeşile dönmeli

**1 ay içinde:**

- 404 sayısı < 1000 olmalı
- Tüm aktif sayfalar indexlenmeli
- Organik trafik artmalı

## 🆘 Hala Sorun Varsa

1. **Hosting/CDN kontrolü:** Cloudflare, Vercel gibi servislerde cache ayarları
2. **DNS kontrolü:** A/CNAME kayıtları doğru mu?
3. **SSL sertifikası:** HTTPS düzgün çalışıyor mu?
4. **Google'a manuel bildir:** Search Console → Geri Bildirim

## 📞 Destek

Sorun devam ederse:

- Google Search Console Help Forum
- Webmaster Stack Exchange
- Veya bana detaylı log/screenshot paylaş

---

**Son Güncelleme:** 2026-03-23
**Proje:** aihaberleri.org
**Tech Stack:** Next.js 15 + Prisma + PostgreSQL
