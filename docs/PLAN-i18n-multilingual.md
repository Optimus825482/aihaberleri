# 🌍 AI Haberleri - Çok Dilli Site (i18n) Uygulama Planı

**Proje:** AI Haberleri İngilizce Versiyonu
**Tarih:** 2026-01-28
**Tahmini Süre:** 10-15 saat
**Durum:** 📋 Planlandı

---

## 📊 Genel Bakış

| Karar              | Seçim                            |
| ------------------ | -------------------------------- |
| URL Yapısı         | Path prefix: `/en/artikel-slug`  |
| Çeviri Motoru      | DeepSeek AI (mevcut API)         |
| DB Yapısı          | 1 Article → N ArticleTranslation |
| UI Çevirisi        | next-intl ile tam i18n           |
| Varsayılan Dil     | Türkçe (`tr`)                    |
| Desteklenen Diller | Türkçe, İngilizce                |

---

## 🏗️ Phase 1: Veritabanı Şeması (1-2 saat)

### 1.1 Yeni Tablo: ArticleTranslation

```prisma
model ArticleTranslation {
  id          String   @id @default(cuid())
  articleId   String
  locale      String   // "tr" | "en"
  title       String
  excerpt     String?
  content     String   @db.Text
  slug        String

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  article     Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@unique([articleId, locale])
  @@unique([slug, locale])
  @@index([locale])
}
```

### 1.2 Article Model Güncelleme

```prisma
model Article {
  // ... mevcut alanlar

  translations ArticleTranslation[]
}
```

### 1.3 Migration

```bash
npx prisma migrate dev --name add_article_translations
```

### Dosyalar:

- [ ] `prisma/schema.prisma` - ArticleTranslation modeli
- [ ] Migration çalıştır

---

## 🔄 Phase 2: Çeviri Servisi (2-3 saat)

### 2.1 Çeviri Fonksiyonu

```typescript
// src/lib/translation.ts
export async function translateArticle(
  article: { title: string; excerpt: string; content: string },
  targetLocale: "en" | "tr",
): Promise<TranslatedArticle>;
```

### 2.2 DeepSeek Entegrasyonu

```typescript
// src/lib/deepseek.ts - Yeni fonksiyon
export async function translateText(
  text: string,
  from: "tr" | "en",
  to: "tr" | "en",
): Promise<string>;
```

### 2.3 Otomatik Çeviri Pipeline

Haber yayınlandığında:

1. Türkçe haber veritabanına kaydedilir
2. Asenkron olarak İngilizce çeviri başlatılır
3. Çeviri tamamlandığında ArticleTranslation'a kaydedilir

### Dosyalar:

- [ ] `src/lib/translation.ts` - Çeviri servisi
- [ ] `src/lib/deepseek.ts` - translateText fonksiyonu
- [ ] `src/services/content.service.ts` - Çeviri trigger

---

## 🛤️ Phase 3: URL Routing (2-3 saat)

### 3.1 Middleware Yapısı

```typescript
// src/middleware.ts
import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: ["tr", "en"],
  defaultLocale: "tr",
  localePrefix: "as-needed", // /en/... için prefix, / için Türkçe
});
```

### 3.2 Klasör Yapısı

```
src/app/
├── [locale]/
│   ├── page.tsx              # Ana sayfa
│   ├── haber/
│   │   └── [slug]/
│   │       └── page.tsx      # Haber detay
│   ├── kategori/
│   │   └── [slug]/
│   │       └── page.tsx      # Kategori
│   └── layout.tsx            # Locale layout
├── api/                      # API rotaları (locale yok)
└── admin/                    # Admin (locale yok)
```

### 3.3 URL Örnekleri

| Türkçe                     | İngilizce                  |
| -------------------------- | -------------------------- |
| `/`                        | `/en`                      |
| `/haber/yapay-zeka-haberi` | `/en/news/ai-news-article` |
| `/kategori/teknoloji`      | `/en/category/technology`  |
| `/hakkimizda`              | `/en/about`                |

### Dosyalar:

- [ ] `src/middleware.ts` - i18n middleware
- [ ] `src/app/[locale]/layout.tsx` - Locale layout
- [ ] `src/app/[locale]/page.tsx` - Ana sayfa
- [ ] Tüm sayfa dosyalarını taşı

---

## 🎨 Phase 4: UI Çevirisi (3-4 saat)

### 4.1 Çeviri Dosyaları

```
src/
├── messages/
│   ├── tr.json    # Türkçe çeviriler
│   └── en.json    # İngilizce çeviriler
```

### 4.2 Türkçe Çeviri Dosyası (tr.json)

```json
{
  "common": {
    "home": "Ana Sayfa",
    "news": "Haberler",
    "categories": "Kategoriler",
    "about": "Hakkımızda",
    "contact": "İletişim",
    "search": "Ara...",
    "readMore": "Devamını Oku",
    "latestNews": "Son Haberler",
    "popularNews": "Popüler Haberler",
    "relatedNews": "İlgili Haberler"
  },
  "footer": {
    "copyright": "© 2026 AI Haberleri. Tüm hakları saklıdır.",
    "privacy": "Gizlilik Politikası",
    "terms": "Kullanım Şartları"
  },
  "article": {
    "publishedAt": "Yayınlanma Tarihi",
    "author": "Yazar",
    "views": "görüntüleme",
    "share": "Paylaş",
    "comments": "Yorumlar"
  }
}
```

### 4.3 İngilizce Çeviri Dosyası (en.json)

```json
{
  "common": {
    "home": "Home",
    "news": "News",
    "categories": "Categories",
    "about": "About",
    "contact": "Contact",
    "search": "Search...",
    "readMore": "Read More",
    "latestNews": "Latest News",
    "popularNews": "Popular News",
    "relatedNews": "Related News"
  },
  "footer": {
    "copyright": "© 2026 AI News. All rights reserved.",
    "privacy": "Privacy Policy",
    "terms": "Terms of Service"
  },
  "article": {
    "publishedAt": "Published",
    "author": "Author",
    "views": "views",
    "share": "Share",
    "comments": "Comments"
  }
}
```

### 4.4 Dil Değiştirici Komponenti

```typescript
// src/components/LanguageSwitcher.tsx
export function LanguageSwitcher() {
  // TR | EN toggle butonu
}
```

### Dosyalar:

- [ ] `src/messages/tr.json` - Türkçe çeviriler
- [ ] `src/messages/en.json` - İngilizce çeviriler
- [ ] `src/components/LanguageSwitcher.tsx` - Dil değiştirici
- [ ] Tüm hardcoded text'leri t() ile değiştir

---

## 🔍 Phase 5: SEO Optimizasyonu (1-2 saat)

### 5.1 hreflang Tags

```tsx
// Her sayfada
<link rel="alternate" hreflang="tr" href="https://aihaberleri.org/haber/..." />
<link rel="alternate" hreflang="en" href="https://aihaberleri.org/en/news/..." />
<link rel="alternate" hreflang="x-default" href="https://aihaberleri.org/haber/..." />
```

### 5.2 Sitemap Güncelleme

```xml
<url>
  <loc>https://aihaberleri.org/haber/yapay-zeka</loc>
  <xhtml:link rel="alternate" hreflang="tr" href="https://aihaberleri.org/haber/yapay-zeka"/>
  <xhtml:link rel="alternate" hreflang="en" href="https://aihaberleri.org/en/news/artificial-intelligence"/>
</url>
```

### 5.3 Meta Tags

```tsx
// İngilizce sayfa
<html lang="en">
<meta property="og:locale" content="en_US" />
<meta property="og:locale:alternate" content="tr_TR" />
```

### Dosyalar:

- [ ] `src/app/sitemap.ts` - Çok dilli sitemap
- [ ] `src/components/SEO.tsx` - hreflang tags
- [ ] Her sayfa için meta tags

---

## 📋 Phase X: Doğrulama Checklist

### Veritabanı

- [ ] ArticleTranslation tablosu oluşturuldu
- [ ] Migration başarılı
- [ ] Mevcut haberler için Türkçe translation oluşturuldu

### Çeviri

- [ ] DeepSeek çeviri fonksiyonu çalışıyor
- [ ] Otomatik çeviri pipeline aktif
- [ ] Çeviri kalitesi kontrol edildi

### Routing

- [ ] `/en` prefix çalışıyor
- [ ] Türkçe URL'ler değişmedi
- [ ] 404 sayfaları doğru

### UI

- [ ] Tüm text'ler çevrildi
- [ ] Dil değiştirici çalışıyor
- [ ] RTL desteği (gerekirse)

### SEO

- [ ] hreflang tags doğru
- [ ] Sitemap güncellendi
- [ ] Google Search Console'a eklendi

---

## 🔧 Teknik Bağımlılıklar

### Yeni Paketler

```bash
npm install next-intl
```

### Environment Variables

```env
# Zaten mevcut
DEEPSEEK_API_KEY=...

# Yeni
DEFAULT_LOCALE=tr
SUPPORTED_LOCALES=tr,en
```

---

## 📊 Uygulama Sırası

| Sıra | Phase                   | Bağımlılık | Süre     |
| ---- | ----------------------- | ---------- | -------- |
| 1    | Phase 1: Veritabanı     | -          | 1-2 saat |
| 2    | Phase 2: Çeviri Servisi | Phase 1    | 2-3 saat |
| 3    | Phase 3: URL Routing    | -          | 2-3 saat |
| 4    | Phase 4: UI Çevirisi    | Phase 3    | 3-4 saat |
| 5    | Phase 5: SEO            | Phase 3, 4 | 1-2 saat |

**Toplam:** ~10-15 saat

---

## 🚀 Sonraki Adımlar

1. Plan onayı al
2. Phase 1'den başla (veritabanı)
3. Her phase sonrası test
4. Production'a deploy

---

**Plan Durumu:** ✅ Hazır
**Onay Bekliyor:** Evet
