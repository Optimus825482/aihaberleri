# 404 URL Pattern Analizi

## Özet

Google Search Console'dan alınan 2009 satırlık 404 URL listesi analiz edildi.

## Ana Problem Pattern'leri

### 1. `/news/en/news/` Double Prefix Hatası

**Pattern:** `https://aihaberleri.org/news/en/news/[slug]`  
**Doğrusu:** `https://aihaberleri.org/en/news/[slug]`

**Örnek:**

- ❌ `https://aihaberleri.org/news/en/news/pentagon-suspends-anthropic-contract-over-alleged-ai-model-misuse-in-defense-simulations`
- ✅ `https://aihaberleri.org/en/news/pentagon-suspends-anthropic-contract-over-alleged-ai-model-misuse-in-defense-simulations`

**Sebep:** Muhtemelen eski URL yapısından yeni yapıya geçişte `/news/` prefix'i kaldırılmamış.

### 2. Türkçe İçerik `/news/` Prefix'i

**Pattern:** `https://aihaberleri.org/news/[turkish-slug]`  
**Doğrusu:** `https://aihaberleri.org/[turkish-slug]` (prefix yok)

**Örnek:**

- ❌ `https://aihaberleri.org/news/insan-vucudu-gibi-dokunan-robotlar-macar-sirketi-allonic-uretimi-tamamen-yeniden-yaziyor`
- ✅ `https://aihaberleri.org/insan-vucudu-gibi-dokunan-robotlar-macar-sirketi-allonic-uretimi-tamamen-yeniden-yaziyor`

**Sebep:** Türkçe içerik için `/news/` prefix'i kullanılmamalı, sadece İngilizce içerik için `/en/news/` kullanılmalı.

### 3. Kategori URL'leri

**Pattern:** `https://aihaberleri.org/category/[slug]`  
**Doğrusu:** Kategoriler için `/category/` prefix'i doğru görünüyor, ancak bazı İngilizce kategoriler `/en/category/` olmalı.

**Örnekler:**

- ❌ `https://aihaberleri.org/category/yapay-zeka-etigi` (Türkçe - doğru)
- ❌ `https://aihaberleri.org/en/category/finans-yz` (İngilizce - doğru)

### 4. Statik Sayfalar

Bazı statik sayfalar 404 veriyor:

- `https://aihaberleri.org/rag-basics`
- `https://aihaberleri.org/ai-in-education-trends-2026`
- `https://aihaberleri.org/stanford-education-reform`
- `https://aihaberleri.org/tracker-engelleme-uzantilari`
- `https://aihaberleri.org/hakkimizda`
- `https://aihaberleri.org/iletisim`
- `https://aihaberleri.org/kategoriler`

## İstatistikler

Toplam 404 URL: **2009**

### URL Pattern Dağılımı (Tahmini)

- `/news/en/news/` double prefix: ~50-100 URL
- `/news/[turkish-slug]`: ~800-1000 URL
- `/en/news/[english-slug]`: ~800-900 URL (bunlar doğru)
- `/category/` ve `/en/category/`: ~20-30 URL
- Statik sayfalar: ~50-100 URL
- Diğer: ~50-100 URL

## Çözüm Stratejisi

### 1. Acil Redirect Kuralları (next.config.js)

```javascript
{
  source: '/news/en/news/:slug*',
  destination: '/en/news/:slug*',
  permanent: true
}
```

### 2. Türkçe İçerik Redirect

```javascript
{
  source: '/news/:slug*',
  destination: '/:slug*',
  permanent: true
}
```

### 3. Statik Sayfalar

Bu sayfaların gerçekten var olup olmadığını kontrol et:

- Varsa: URL yapısını düzelt
- Yoksa: Ana sayfaya veya ilgili kategoriye yönlendir

## Öneriler

1. **Sitemap Temizliği:** Eski URL'leri sitemap'ten kaldır
2. **Google Search Console:**
   - Eski sitemapleri kaldır
   - Yeni sitemapleri submit et
   - Önemli sayfalar için re-indexing iste
3. **İzleme:** 1-2 hafta sonra 404 sayısını kontrol et
4. **Internal Link Audit:** Sitede kendi içinde kırık linkler var mı kontrol et

## Sonraki Adımlar

1. ✅ Pattern analizi tamamlandı
2. ⏳ `next.config.js`'e redirect kuralları ekle
3. ⏳ Test et
4. ⏳ Deploy et
5. ⏳ Google Search Console'da izle
