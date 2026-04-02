# AI Haberleri — Proje İyileştirme Takip Dosyası

> Bu dosya kaldığımız yerden devam etmek için. Her görev tamamlandığında `[x]` yap.

---

## 🔴 KRİTİK — Tamamlanacaklar

### ✅ RSS Feed
- [x] `/feed.xml` — TR haber akışı (zaten mevcut)
- [x] `/en/feed.xml` — EN haber akışı (`src/app/en/feed.xml/route.ts`)
- [x] `<link rel="alternate" type="application/rss+xml">` layout.tsx'e eklendi

### ✅ Rate Limiting
- [x] `src/lib/rate-limiter.ts` — Sliding window implementasyonu mevcut
- [x] `src/lib/api-middleware.ts` — `withRateLimit` + `ADMIN_RATE_LIMITS` helper oluşturuldu
- [x] `POST /api/admin/social-shares/batch` — 5 req/dk rate limit eklendi
- [ ] `POST /api/admin/articles` — rate limit ekle (write: 30/dk)
- [ ] `DELETE /api/admin/articles` — rate limit ekle (delete: 10/dk)

### ✅ Makale Cache
- [x] `src/lib/cache.ts` — L1 (memory) + L2 (Redis) implementasyonu mevcut
- [x] Homepage DB sorgularına cache eklendi (3 dk TTL, `homepage` + `articles` tags)
- [ ] Article page DB sorgusuna Redis cache ekle (`src/app/news/[slug]/page.tsx`)
- [ ] EN article page için cache (`src/app/en/news/[slug]/page.tsx`)
- [ ] Cache invalidation: yeni makale yayınlanınca `articles:*` tag'i temizle

### ✅ hreflang Etiketleri
- [x] TR article page (`/news/[slug]`) — `generateMetadata` ile hreflang mevcut
- [x] EN article page (`/en/news/[slug]`) — hreflang mevcut (tr + en alternates)
- [x] Homepage (`/`) — `metadata.alternates.languages` eklendi (tr + en + x-default)
- [x] EN homepage (`/en`) — hreflang zaten mevcut
- [ ] Category pages (`/category/[slug]`) — hreflang ekle (düşük öncelik)

### ✅ Sentry Error Monitoring
- [x] `@sentry/nextjs` paketi kurulu
- [x] `src/lib/sentry.ts` — helper fonksiyonlar mevcut
- [x] `sentry.client.config.ts` — oluşturuldu (NEXT_PUBLIC_SENTRY_DSN)
- [x] `sentry.server.config.ts` — oluşturuldu (SENTRY_DSN)
- [x] `sentry.edge.config.ts` — oluşturuldu (SENTRY_DSN)
- [x] `src/instrumentation.ts` — oluşturuldu (server+edge init)
- [x] `next.config.js` → `instrumentationHook: true` yapıldı
- [x] sentry.io'da `aihaberleri` projesi oluşturuldu
- [ ] **Coolify'da eklenecek env var'lar (PUSH'tan sonra):**
  - `SENTRY_DSN=https://d3b0b7f318f7e61eec35f9a7751585c1@o4508861093642240.ingest.us.sentry.io/4511151204925440`
  - `NEXT_PUBLIC_SENTRY_DSN=https://d3b0b7f318f7e61eec35f9a7751585c1@o4508861093642240.ingest.us.sentry.io/4511151204925440`

### ✅ View Counter → Redis
- [x] `src/components/ViewTracker.tsx` — client component mevcut
- [x] `src/lib/view-counter.ts` — Redis INCR + batch flush servisi oluşturuldu
- [x] `src/app/api/articles/[id]/view/route.ts` — Redis tabanlı olarak güncellendi
- [x] `src/lib/cron.ts` — `viewFlushInterval` (5 dk) eklendi
- Önceki: 3 DB sorgusu/görüntüleme → Şimdi: ~0.3ms Redis işlemi

---

## 🟡 ÖNEMLİ — Sıradaki Sprint

- [ ] Google News Sitemap (`/news-sitemap.xml`) — Google News'e girmek için
- [ ] Telegram Bot paylaşım entegrasyonu
- [ ] Web Push Notifications (Service Worker hazır, sadece backend lazım)
- [ ] LinkedIn paylaşım entegrasyonu
- [ ] Newsletter otomasyonu (yeni makale → otomatik mail)

---

## 🟢 YENİ ÖZELLİKLER — Backlog

- [ ] İç linkleme (keyword-based otomatik)
- [ ] Article okuma süresi göstergesi (zaten `readingTime` field var, UI'a ekle)
- [ ] Dark/Light mod toggle (next-themes kurulu, UI eksik mi?)
- [ ] Makale kaydetme özelliği (favoriler)
- [ ] Kullanıcı yorum sistemi
- [ ] Trending Topics widget iyileştirmesi

---

## 📊 İnfrastrüktür / DevOps

- [ ] PostgreSQL otomatik backup (Coolify'da weekly snapshot)
- [ ] Redis `maxmemory` ve `maxmemory-policy allkeys-lru` ayarla
- [ ] Worker auto-restart policy Coolify'da `always` olduğunu doğrula
- [ ] Core Web Vitals haftalık izleme (PageSpeed Insights API ile cron)
- [ ] Docker image optimize (multi-stage, layer cache)

---

## ✅ Tamamlanan İyileştirmeler (Bu Oturum)

- [x] CSS @import kaldırıldı → FCP 22s → ~3s (tahmin)
- [x] CLS animasyonlar düzeltildi (width → transform:scaleX) → CLS ~0.01
- [x] Logo WebP, priority=true
- [x] Cloudflare Image Resizing srcSet (ArticleCard)
- [x] GA4 düzeltildi (hardcoded ID kaldırıldı)
- [x] Service Worker güncellendi (skipWaiting, Cache-Control)
- [x] Twitter sosyal medya platformlardan kaldırıldı
- [x] Language filter API'da düzeltildi
- [x] Negatif unshared sayısı düzeltildi (Math.max(0,...))
- [x] Admin sayfasında çift filtreleme kaldırıldı
- [x] fetchStats stale closure düzeltildi (activeBatchRef)
- [x] Prisma connection pool eklendi (connection_limit=5)
- [x] BullMQ concurrency azaltıldı (58 → 31)
- [x] Admin polling 5s → 15s
- [x] removeOnComplete/Fail limitleri düşürüldü
