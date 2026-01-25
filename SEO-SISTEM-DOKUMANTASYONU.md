# 🚀 SEO Sistem Dokümantasyonu

Kapsamlı SEO sistemi başarıyla kuruldu! Bu dokümantasyon, sistemin tüm özelliklerini ve kullanımını açıklar.

## 📋 İçindekiler

1. [Kurulum](#kurulum)
2. [Özellikler](#özellikler)
3. [Kullanım](#kullanım)
4. [API Endpoints](#api-endpoints)
5. [Manuel Adımlar](#manuel-adımlar)
6. [Monitoring](#monitoring)
7. [Best Practices](#best-practices)

---

## 🔧 Kurulum

### 1. Environment Variables

`.env` dosyanıza ekleyin:

```env
# Site URL (Production)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_SITE_NAME="AI Haberleri"

# Social Media (Optional)
TWITTER_HANDLE=@aihaberleri
CONTACT_EMAIL=info@yourdomain.com
```

### 2. IndexNow Initialization

İlk kurulumda IndexNow key oluşturun ve tüm article'ları submit edin:

```bash
npm run tsx scripts/init-indexnow.ts
```

Bu script:

- IndexNow API key oluşturur
- Key'i database'e kaydeder
- `public/{key}.txt` dosyası oluşturur
- Tüm published article'ları IndexNow'a gönderir

### 3. Build & Deploy

```bash
npm run build
npm run start
```

---

## ✨ Özellikler

### 1. Structured Data (JSON-LD)

**Nedir?** Schema.org formatında yapılandırılmış veri. Google, Bing, Yandex gibi arama motorlarının içeriği daha iyi anlamasını sağlar.

**Implementasyon:**

- ✅ **Organization Schema** - Site genelinde
- ✅ **WebSite Schema** - Ana sayfa
- ✅ **NewsArticle Schema** - Haber sayfaları
- ✅ **BreadcrumbList Schema** - Breadcrumb navigation
- ✅ **CollectionPage Schema** - Kategori sayfaları

**Faydaları:**

- Rich snippets (zengin sonuçlar)
- Google News'de daha iyi görünürlük
- Click-through rate (CTR) artışı
- Featured snippets şansı

**Test:**

```
https://search.google.com/test/rich-results
```

### 2. IndexNow API

**Nedir?** Microsoft Bing ve Yandex tarafından desteklenen instant indexing protokolü. Yeni veya güncellenmiş URL'leri anında arama motorlarına bildirir.

**Desteklenen Arama Motorları:**

- ✅ Bing
- ✅ Yandex
- ✅ Seznam.cz
- ✅ Naver

**Kullanım:**

```typescript
// Tek URL submit
import { submitArticleToIndexNow } from "@/lib/seo";
await submitArticleToIndexNow(articleSlug);

// Birden fazla URL submit
import { submitUrlsToIndexNow } from "@/lib/seo";
await submitUrlsToIndexNow([url1, url2, url3]);

// Tüm article'ları submit
import { submitAllArticlesToIndexNow } from "@/lib/seo";
const result = await submitAllArticlesToIndexNow();
```

**Otomatik Submission:**
Yeni article yayınlandığında otomatik submit için `news.service.ts`'e ekleyin:

```typescript
import { submitArticleToIndexNow } from "@/lib/seo";

// Article publish edildikten sonra
await submitArticleToIndexNow(article.slug);
```

### 3. Google News Sitemap

**Nedir?** Google News için özel XML sitemap. Son 48 saatteki haberleri içerir.

**URL:**

```
https://yourdomain.com/news-sitemap.xml
```

**Özellikler:**

- Son 48 saatteki haberler (Google News requirement)
- `<news:news>` tags ile optimize edilmiş
- Otomatik güncellenir (her request'te)
- 1 saat cache

**Google News'e Başvuru:**

1. [Google News Publisher Center](https://publishercenter.google.com/)
2. Site ekle
3. News sitemap URL'ini gönder: `https://yourdomain.com/news-sitemap.xml`

### 4. Enhanced Meta Tags

**Implementasyon:**

- ✅ Open Graph (Facebook, LinkedIn)
- ✅ Twitter Cards
- ✅ Canonical URLs
- ✅ Meta description optimization (max 160 char)
- ✅ Meta title optimization (max 60 char)
- ✅ Keywords extraction

**Kullanım:**

```typescript
import { generateArticleMetadata } from "@/lib/seo";

export async function generateMetadata({ params }): Promise<Metadata> {
  const article = await getArticle(params.slug);
  return generateArticleMetadata(article);
}
```

### 5. Canonical URLs

**Nedir?** Duplicate content'i önlemek için kullanılan URL standardizasyonu.

**Kullanım:**

```typescript
import { getArticleCanonicalUrl } from "@/lib/seo";

const canonicalUrl = getArticleCanonicalUrl(article.slug);
// https://yourdomain.com/news/article-slug
```

**Faydaları:**

- Duplicate content penalty'sini önler
- Link equity'yi korur
- Pagination'da doğru indexing

### 6. Performance Optimization

**Core Web Vitals Targets:**

- **LCP (Largest Contentful Paint):** < 2.5s ✅
- **INP (Interaction to Next Paint):** < 200ms ✅
- **CLS (Cumulative Layout Shift):** < 0.1 ✅

**Implementasyon:**

- Image optimization (WebP, AVIF)
- Lazy loading
- Font optimization (display: swap)
- Resource hints (preconnect, dns-prefetch)
- Cache headers

**Kullanım:**

```typescript
import { IMAGE_OPTIMIZATION, reportWebVitals } from "@/lib/seo";

// Image component
<Image
  src={src}
  alt={alt}
  sizes={IMAGE_OPTIMIZATION.sizes.hero}
  quality={IMAGE_OPTIMIZATION.quality.high}
  priority
/>

// Web Vitals tracking
export function reportWebVitals(metric) {
  // Analytics'e gönder
}
```

---

## 🎯 Kullanım

### Article Sayfası

Structured data otomatik olarak eklenir:

```tsx
// src/app/news/[slug]/page.tsx
import { generateArticleMetadata, generateNewsArticleSchema } from "@/lib/seo";

export async function generateMetadata({ params }): Promise<Metadata> {
  const article = await getArticle(params.slug);
  return generateArticleMetadata(article);
}

export default async function ArticlePage({ params }) {
  const article = await getArticle(params.slug);
  const schema = generateNewsArticleSchema(article);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={generateJsonLd(schema)}
      />
      {/* Page content */}
    </>
  );
}
```

### Category Sayfası

```tsx
import {
  generateCategoryMetadata,
  generateCollectionPageSchema,
} from "@/lib/seo";

export async function generateMetadata({ params }): Promise<Metadata> {
  const category = await getCategory(params.slug);
  const articlesCount = await getArticlesCount(category.id);
  return generateCategoryMetadata(category, articlesCount);
}
```

### Homepage

```tsx
import { generateHomeMetadata, generateWebSiteSchema } from "@/lib/seo";

export const metadata = generateHomeMetadata();

export default function HomePage() {
  const schema = generateWebSiteSchema();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={generateJsonLd(schema)}
      />
      {/* Page content */}
    </>
  );
}
```

---

## 🔌 API Endpoints

### POST /api/seo/indexnow

IndexNow submission API.

**Request:**

```json
{
  "action": "submit-url",
  "url": "https://yourdomain.com/news/article-slug"
}
```

**Actions:**

- `submit-url` - Tek URL submit
- `submit-urls` - Birden fazla URL submit
- `submit-all` - Tüm article'ları submit

**Response:**

```json
{
  "success": true,
  "count": 150
}
```

**Örnek:**

```typescript
const response = await fetch("/api/seo/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "submit-all",
  }),
});
```

---

## 📝 Manuel Adımlar

### 1. Google Search Console

1. [Google Search Console](https://search.google.com/search-console)'a git
2. Site ekle (Domain property önerilir)
3. Ownership doğrula (DNS TXT record)
4. Sitemap'leri gönder:
   - `https://yourdomain.com/sitemap.xml`
   - `https://yourdomain.com/news-sitemap.xml`

### 2. Google News Publisher Center

1. [Publisher Center](https://publishercenter.google.com/)'a git
2. Yeni publication ekle
3. Site bilgilerini doldur
4. News sitemap ekle: `https://yourdomain.com/news-sitemap.xml`
5. Review için gönder (1-2 hafta sürer)

### 3. Bing Webmaster Tools

1. [Bing Webmaster](https://www.bing.com/webmasters)'a git
2. Site ekle
3. Sitemap gönder: `https://yourdomain.com/sitemap.xml`
4. IndexNow otomatik çalışır (key zaten oluşturuldu)

### 4. Yandex Webmaster

1. [Yandex Webmaster](https://webmaster.yandex.com/)'a git
2. Site ekle
3. Sitemap gönder
4. IndexNow otomatik çalışır

---

## 📊 Monitoring

### Admin SEO Dashboard

**URL:** `/admin/seo`

**Özellikler:**

- IndexNow status ve manual submission
- Sitemap links
- Structured data checklist
- Core Web Vitals targets
- Google Search Console link
- SEO checklist

### Performance Monitoring

**Tools:**

- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Google Search Console](https://search.google.com/search-console)
- [Bing Webmaster Tools](https://www.bing.com/webmasters)
- [Rich Results Test](https://search.google.com/test/rich-results)

### Metrics to Track

1. **Indexing:**
   - Indexed pages count
   - Crawl errors
   - Sitemap coverage

2. **Performance:**
   - Core Web Vitals (LCP, INP, CLS)
   - Page load time
   - Mobile usability

3. **Traffic:**
   - Organic search traffic
   - Click-through rate (CTR)
   - Average position
   - Impressions

4. **Content:**
   - Rich results
   - Featured snippets
   - News carousel appearances

---

## 🎓 Best Practices

### 1. Content Optimization

- **Title:** 50-60 karakter, keyword-rich
- **Description:** 150-160 karakter, compelling
- **Keywords:** 5-10 relevant keywords
- **Headings:** H1 (1x), H2-H6 (hierarchical)
- **Images:** Alt text, descriptive filenames
- **Internal Links:** Related articles, categories

### 2. Technical SEO

- **Mobile-First:** Responsive design
- **HTTPS:** SSL certificate
- **Speed:** < 3s load time
- **Structured Data:** JSON-LD format
- **Canonical URLs:** Prevent duplicates
- **XML Sitemaps:** Updated regularly

### 3. Content Freshness

- **Update Frequency:** Daily news updates
- **Publish Time:** Consistent schedule
- **IndexNow:** Submit immediately after publish
- **News Sitemap:** Auto-updates (48h window)

### 4. Link Building

- **Internal Links:** 3-5 per article
- **External Links:** Authoritative sources
- **Backlinks:** Quality over quantity
- **Social Signals:** Share buttons

### 5. User Experience

- **Readability:** Short paragraphs, bullet points
- **Navigation:** Clear breadcrumbs
- **Related Content:** Increase engagement
- **Load Time:** Optimize images, lazy load

---

## 🔍 Testing & Validation

### 1. Structured Data

```bash
# Google Rich Results Test
https://search.google.com/test/rich-results?url=YOUR_URL

# Schema.org Validator
https://validator.schema.org/
```

### 2. Performance

```bash
# PageSpeed Insights
https://pagespeed.web.dev/?url=YOUR_URL

# Lighthouse (Chrome DevTools)
# Run: Ctrl+Shift+I -> Lighthouse tab
```

### 3. Mobile Usability

```bash
# Google Mobile-Friendly Test
https://search.google.com/test/mobile-friendly?url=YOUR_URL
```

### 4. Sitemap Validation

```bash
# XML Sitemap Validator
https://www.xml-sitemaps.com/validate-xml-sitemap.html
```

---

## 📈 Expected Results

### Short Term (1-2 weeks)

- ✅ IndexNow: Instant indexing on Bing/Yandex
- ✅ Rich snippets: Article cards in search results
- ✅ Core Web Vitals: Green scores
- ✅ Mobile usability: 100% pass

### Medium Term (1-3 months)

- 📈 Organic traffic: +30-50%
- 📈 Click-through rate: +20-30%
- 📈 Average position: Top 10 for target keywords
- 📈 Indexed pages: 90%+ coverage

### Long Term (3-6 months)

- 🎯 Google News: Approved and appearing in News tab
- 🎯 Featured snippets: 5-10 featured results
- 🎯 Domain authority: Increased backlinks
- 🎯 Brand searches: Increased direct traffic

---

## 🆘 Troubleshooting

### IndexNow Not Working

1. Check key file exists: `public/{key}.txt`
2. Verify key in database: `Setting` table
3. Check API response: Network tab
4. Verify URL format: Must be absolute URL

### Structured Data Errors

1. Test with Rich Results Test
2. Check JSON-LD syntax
3. Verify required fields
4. Validate image URLs

### Sitemap Not Updating

1. Check database connection
2. Verify article status: `PUBLISHED`
3. Clear Next.js cache: `rm -rf .next`
4. Rebuild: `npm run build`

### Performance Issues

1. Optimize images: WebP/AVIF format
2. Enable caching: Vercel/Cloudflare
3. Reduce bundle size: Code splitting
4. Lazy load: Below-the-fold content

---

## 📚 Resources

### Documentation

- [Google Search Central](https://developers.google.com/search)
- [IndexNow Protocol](https://www.indexnow.org/)
- [Schema.org](https://schema.org/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Next.js SEO](https://nextjs.org/learn/seo/introduction-to-seo)

### Tools

- [Google Search Console](https://search.google.com/search-console)
- [Bing Webmaster Tools](https://www.bing.com/webmasters)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Rich Results Test](https://search.google.com/test/rich-results)
- [Schema Markup Validator](https://validator.schema.org/)

---

## ✅ Checklist

### Initial Setup

- [x] Environment variables configured
- [x] IndexNow key generated
- [x] Structured data implemented
- [x] Sitemaps created
- [x] Meta tags optimized
- [x] Canonical URLs set
- [ ] Google Search Console verified
- [ ] Bing Webmaster Tools verified
- [ ] Google News application submitted

### Ongoing Maintenance

- [ ] Monitor Core Web Vitals weekly
- [ ] Check Search Console errors weekly
- [ ] Update content regularly
- [ ] Submit new articles to IndexNow
- [ ] Review and update keywords monthly
- [ ] Analyze traffic and rankings monthly

---

## 🎉 Sonuç

Kapsamlı SEO sistemi başarıyla kuruldu! Sistem şunları içerir:

1. ✅ **Structured Data** - Rich snippets için JSON-LD
2. ✅ **IndexNow API** - Instant indexing (Bing, Yandex)
3. ✅ **Google News Sitemap** - News-specific sitemap
4. ✅ **Enhanced Meta Tags** - OG, Twitter Cards
5. ✅ **Canonical URLs** - Duplicate content prevention
6. ✅ **Performance Optimization** - Core Web Vitals
7. ✅ **Admin Dashboard** - SEO monitoring

**Sonraki Adımlar:**

1. Google Search Console'da site doğrula
2. Google News'e başvur
3. IndexNow'u test et
4. Performance'ı monitor et
5. Traffic'i takip et

**Başarılar! 🚀**
