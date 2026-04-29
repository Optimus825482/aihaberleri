# AI News Site – Mimari & Analiz Raporu

**Proje:** ai-news-site (AI Haberleri)  
**Stack:** Next.js 14, Prisma, Neon/PostgreSQL, Redis, BullMQ  
**Tarih:** 2026-03-07  

---

## Analiz Metodolojisi (Multiparalel Orkestrasyon)

Bu rapor **paralel orkestrasyon** ile üretilmiştir: mimari, backend/API, frontend/UX, güvenlik/auth ve performans/ölçeklenebilirlik perspektifleri eşzamanlı analiz edilerek birleştirilmiştir. Tek bir lineer inceleme yerine çoklu uzman bakış açıları kullanılmıştır.

---

## 1. Mimari & Veri Akışı

### Mevcut Durum
- **Klasör yapısı:** `src/app` (App Router), `src/lib` (prisma, redis, queue-manager, auth, errors, validation), `src/components` (ui + admin + article vb.), `src/agents` (22 agent: content-collector, duplicate-detector, relevance-filter, trend-enricher, source-gatherer, content-synthesizer, content-validator, visual-generator, database-publisher, social-share, seo-*), `src/workers` (news-agent, orchestrator, seo-optimizer, seo-calculator), `src/services` (20 servis: newsletter, podcast, trend-fetcher, seo-orchestrator, content, agent vb.).
- **API organizasyonu:** Route’lar `src/app/api/` altında gruplanmış: `admin/*`, `agent/*`, `auth/*`, `cron/*`, `indexing/*`, `newsletter/*`, `podcast/*`, `push/*`, `search/*`, `analytics/*`, `articles/*`, `categories/*`, `settings/*`, `tts/*`, `visitors/*` vb. Middleware `src/middleware.ts`; admin sayfaları için JWT (`admin-session` cookie) doğrulaması, IndexNow key servisi, güvenlik header’ları.
- **Veri akışı:** Prisma → API route’lar (requireAdminAuth / auth) → Client (SWR/fetch) → UI. Admin API’ler `requireAdminAuth()` ile korunuyor.
- **Queue/worker:** BullMQ + `src/lib/queue-manager.ts` (QUEUE_NAMES: collected-articles, relevant-articles, unique-articles, trend-enrichment, enriched-articles, content-synthesis, content-validation, articles-with-visuals, database-publisher, social-share, seo-calculation, seo-optimization). Orchestrator worker 10 agent’ı başlatıyor, ContentCollector tetikliyor, pipeline sağlığını izliyor. SEO Optimizer worker toplu SEO optimizasyonu yapıyor; Redis progress, retry ve metrikler kullanılıyor.

### Güçlü Yönler
- Net katmanlı yapı (app / lib / components / agents / workers / services).
- Merkezi kuyruk yönetimi, agent bazlı concurrency ve rate limit.
- Admin için tek middleware (JWT + redirect) ve API tarafında `requireAdminAuth` tutarlı kullanımı.

### Risk / Eksikler
- Bazı admin route’larda rate limit yorum satırına alınmış (users/[id], users/bulk-role, articles/bulk).
- `api/public/` tamamen middleware dışında; public API’lerin sınırları net tanımlı değil.

### Öneriler
- Rate limit’i tüm hassas admin endpoint’lerinde zorunlu kılmak ve yorumdan çıkarmak.
- Public API’ler için liste ve rate limit politikasını dokümante etmek; gerekirse `api/public/` altında özel middleware kullanmak.

---

## 2. Backend & API

### Mevcut Durum
- **API grupları:** Admin (dashboard, users, articles, seo, newsletter, adsense, youtube, queues, pipeline, trends, audit-logs, notifications, messages, settings), Auth (NextAuth [...nextauth], admin login, csrf, session), Agent (execute, trigger, schedule, stats, job-progress, stream, health, worker-status, settings), Cron (save-provider-stats), Podcast (generate, rss), Newsletter (list, send, subscribe, unsubscribe, preview, send-daily, subscribers), Indexing (notify, batch), Analytics (track, pageview, ga-views, visitor-stats, ga4-realtime), Articles, Categories, Search, TTS, Push, Contact, Visitors, Settings, Health, Ready.
- **Validation:** Zod kullanımı (lib/validation-schemas.ts, lib/validation/admin.ts, lib/email.ts); bulk optimize/calculate, SEO update, newsletter, contact, push subscribe vb. için şemalar var.
- **Hata yönetimi:** Merkezi `lib/errors/error-handler.ts` (AppError, ErrorCode, createErrorResponse); production’da mesaj sadeleştirme; logger entegrasyonu.
- **Rate limiting:** `lib/rate-limiter.ts` (Redis tabanlı, sliding window, X-RateLimit-* header’ları); login, contact, newsletter subscribe, TTS, pageview, admin users, admin settings’te kullanılıyor. Bazı admin route’larda devre dışı/yorumda.
- **Dış servisler:** Firebase Admin, Resend (email – README’de SendGrid geçse de kod Resend), Google (GA4, Search Console, Indexing API, AdSense), Firecrawl, Tavily (search/crawl/research/extract), Brave Search, Google News, DeepSeek/NVIDIA (LLM), Pollinations (görsel), Exa, hybrid-search.

### Güçlü Yönler
- Zod ile tip güvenli validasyon ve merkezi hata formatı.
- Redis tabanlı rate limiter ve endpoint bazlı limitler.
- Çok sayıda dış entegrasyonun tek bir uygulama içinde yönetilmesi.

### Risk / Eksikler
- Rate limit ve validation kullanımı tüm route’larda tutarlı değil; bazı admin endpoint’leri açık.
- Dış servis hataları için ortak retry/backoff ve circuit breaker kullanımı her yerde yok (DeepSeek’te var, diğerlerinde kısmen).

### Öneriler
- Hassas admin endpoint’lerinde rate limit ve Zod validasyonunu zorunlu hale getirmek.
- Dış API çağrıları için ortak bir wrapper (circuit breaker + retry) kullanmak ve env’e göre fallback stratejisi yazmak.

---

## 3. Frontend & UX

### Mevcut Durum
- **Sayfa yapısı:** App Router; `app/layout.tsx` (Inter font, ThemeProvider, ClientProviders, ServiceWorker, GA/GTM/Yandex, VisitorTracker, AdSense, ErrorBoundary, LayoutWrapper, AudioProvider). Alt layout’lar: `admin`, `en`, `sss`, `search`, `en/faq`.
- **i18n:** Path tabanlı: `/en/*` İngilizce (metadata, alternates, hreflang); Türkçe varsayılan. next-intl kullanılıyor (hook/locale referansları var). Tam çeviri seti tek bir JSON’da değil, sayfa/metadata dağılık.
- **UI:** Radix tabanlı (accordion, alert-dialog, avatar, checkbox, dialog, dropdown, label, popover, progress, radio, scroll-area, select, separator, slider, switch, tabs, toast, tooltip vb.) + Tailwind + class-variance (cva). Framer Motion, Chart.js, Recharts, TanStack Table/Virtual. Form: react-hook-form + @hookform/resolvers (Zod).
- **State:** SWR kullanımı; hooks (use-trending vb.). Admin paneli: filtreler (MultiSelect, Range, FilterBar), tablolar, batch işlemler, SEO modalleri, pipeline/widget, realtime dashboard.

### Güçlü Yönler
- Radix + Tailwind ile erişilebilir ve tutarlı bileşen seti.
- Admin’de gelişmiş veri görüntüleme (tablolar, grafikler, pipeline durumu).
- i18n için dil prefix’i ve metadata/hreflang uyumu.

### Risk / Eksikler
- Ana font Inter; “generic” sayılabilecek bir seçim (tasarım kurallarına göre).
- next-intl ile tam merkezi çeviri dosyası yapısı net değil; bazı metinler hâlâ sabit.

### Öneriler
- Çevirileri tek bir yapıda (ör. `messages/tr.json`, `messages/en.json`) toplamak ve next-intl ile tam entegre etmek.
- Marka/ton için display font seçimi ve tipografi ölçeklerini gözden geçirmek.

---

## 4. Güvenlik & Auth

### Mevcut Durum
- **NextAuth:** auth.config.ts (JWT, 30 gün maxAge, httpOnly/sameSite/secure cookie, trustHost). Sayfa: signIn/error → `/admin/login`. Callbacks: authorized (admin’de login sayfası hariç giriş zorunlu), jwt (revoke kontrolü, session’a id/role).
- **Admin yetkilendirme:** Middleware’de `admin-session` cookie ile JWT verify (jose); admin sayfaları korumalı. API’de `requireAdminAuth()` (admin-auth.ts: getAdminSession, JWT verify, session revocation). RBAC: lib/auth/middleware.ts içinde PERMISSIONS matrisi (SEO endpoint’leri için VIEWER/EDITOR/ADMIN); requireRole kullanımı.
- **CSRF:** lib/auth/csrf.ts (double submit cookie, constant-time compare); api/auth/csrf route’u var. NextAuth kendi CSRF token’ını da kullanıyor.
- **API koruması:** Admin API’ler requireAdminAuth/requireRole; public route’lar middleware’de hariç tutuluyor. Security header’ları middleware ve security-headers.ts ile uygulanıyor.
- **Env/secrets:** NEXTAUTH_SECRET production’da zorunlu (yoksa throw); development’ta fallback ile uyarı. Kritik API anahtarları env’den okunuyor.

### Güçlü Yönler
- JWT + httpOnly cookie, session revocation, RBAC matrisi.
- CSRF için double submit cookie ve timing-safe karşılaştırma.
- Production’da NEXTAUTH_SECRET zorunluluğu.

### Risk / Eksikler
- CSP bilinçli olarak gevşek (Google/AdSense/Analytics uyumu için); XSS’e karşı ek katman düşünülebilir.
- RBAC sadece belirli SEO endpoint’leri için tanımlı; diğer admin endpoint’leri sadece “admin girişi” ile açık.

### Öneriler
- Tüm admin API’ler için role bazlı izin matrisini genişletmek (ör. articles, users, newsletter için EDITOR/ADMIN ayrımı).
- Nonce tabanlı CSP veya strict script-src için aşamalı sıkılaştırma planı (Analytics/AdSense ile test ederek).

---

## 5. Performans & Ölçeklenebilirlik

### Mevcut Durum
- **Caching:** Redis (queue, rate limit, session/revocation, pipeline state). Next.js image: remotePatterns + minimumCacheTTL 86400; `unoptimized: true` (görseller R2’de ön-optimize edilmiş).
- **Redis:** ioredis; OOM takibi (checkMemoryPressure), BullMQ event stream trim; lazy init, REDIS_URL zorunlu (build’de dummy).
- **Circuit breaker:** lib/circuit-breaker.ts (genel); deepseek.ts içinde NVIDIA/DeepSeek için ayrı state. Pipeline stats ve agent-settings’te circuit durumu gösteriliyor; alerting’te “circuit-breaker-open” kuralı var.
- **next.config:** standalone output, serverComponentsExternalPackages (puppeteer, firebase-admin, sharp, bullmq, ioredis, pg, googleapis, prisma, winston). optimizePackageImports (lucide-react, recharts, date-fns, @radix-ui/react-icons, framer-motion). Webpack cache false; OpenTelemetry ignore. outputFileTracingIncludes ile sharp. Server Actions bodySizeLimit 2mb.
- **Görsel:** sharp lib/image-optimizer.ts içinde (resize, format); R2’de ön-optimize webp, Next.js image proxy devre dışı.

### Güçlü Yönler
- Ağır paketlerin client’a girmemesi, optimizePackageImports ile tree-shake.
- Redis OOM takibi ve circuit breaker ile dış servis koruması.
- Görsel işleme için sharp kullanımı ve R2 + cache stratejisi.

### Risk / Eksikler
- TypeScript/ESLint build’de ignoreDuringBuilds: true; hatalar production’a sızabilir.
- Webpack cache kapalı; build süreleri uzayabilir.

### Öneriler
- CI’da TypeScript ve ESLint’i açık tutup, sadece yerel/build hızı için opsiyonel bypass kullanmak.
- Gerekirse webpack cache’i sadece CI/local’de açacak şekilde koşullu yapmak.

---

## Birleşik Özet (Türkçe)

**ai-news-site**, Next.js App Router, Prisma (Neon PostgreSQL), Redis ve BullMQ ile çalışan, çok ajanlı bir haber toplama/yayınlama ve yönetim platformudur. Mimari net: `src/app` (sayfa ve API), `src/lib` (veritabanı, kuyruk, auth, hata, validasyon), `src/components`, `src/agents`, `src/workers` ve `src/services` ayrımı veri akışını ve sorumlulukları anlaşılır kılıyor. Veri akışı Prisma → API (admin/auth korumalı) → client → UI şeklinde; kuyruk tarafında BullMQ ve orchestrator/SEO worker’lar ile pipeline yönetimi olgun.

Backend tarafında API grupları (admin, agent, auth, cron, podcast, newsletter, indexing, analytics, vb.) iyi ayrılmış; Zod validasyonu ve merkezi hata yönetimi var. Rate limiting Redis tabanlı ve birçok kritik endpoint’te uygulanıyor; ancak bazı admin route’larında devre dışı veya yorumda. Dış servisler (Firebase, Resend, Google, Firecrawl, Tavily, Brave, DeepSeek, Pollinations vb.) yoğun kullanılıyor; circuit breaker özellikle LLM tarafında mevcut, diğer entegrasyonlarda yaygınlaştırılabilir.

Frontend, Radix tabanlı bileşenler, Tailwind ve SWR ile tutarlı; admin paneli filtreler, tablolar ve pipeline/widget ile zengin. i18n path tabanlı (tr/en) ve next-intl kullanılıyor; çevirilerin tam merkezi bir yapıda toplanması ve tutarlı kullanımı iyileştirilebilir.

Güvenlik tarafında NextAuth JWT, httpOnly cookie, session revocation ve admin API’ler için `requireAdminAuth` kullanımı sağlam. CSRF double submit cookie ile destekleniyor. RBAC şu an belirli SEO endpoint’leri ile sınırlı; diğer admin işlemlerinde role bazlı izinler genişletilebilir. CSP, reklam ve analitik uyumu için bilinçli gevşek; ileride nonce veya daha sıkı politika değerlendirilebilir.

Performans ve ölçeklenebilirlikte Redis (kuyruk, rate limit, OOM takibi), circuit breaker ve next.config ile paket dışlama/optimize import’lar olumlu. Görseller R2 + sharp ile yönetiliyor; Next.js image proxy kapalı. TypeScript/ESLint build’de ignore edildiği için CI’da mutlaka kontrollü olmalı; webpack cache kapalı olduğundan build süreleri izlenmeli.

**Öncelikli aksiyonlar:** (1) Tüm hassas admin API’lerde rate limit ve Zod validasyonunu zorunlu kılmak, (2) RBAC’ı tüm admin endpoint’lere yaymak, (3) i18n çevirilerini merkezi yapıda toplamak, (4) CI’da TypeScript/ESLint hatalarını fail yapacak şekilde açmak, (5) Dış servis çağrıları için ortak circuit breaker/retry stratejisi tanımlamak.

---

## Uygulanan Öneriler (2026-03-07)

| Öneri | Uygulama |
|-------|----------|
| Rate limit | `users/[id]`, `users/[id]/activity`, `users/bulk-role`, `articles/bulk` route'larında rate limit aktif; 429 + `createRateLimitHeaders`. |
| RBAC | `admin-auth.ts`: `ADMIN_API_PERMISSIONS` matrisi ve `requireAdminAuthWithPermission(request)`; users, articles, newsletter, seo, dashboard için rol kuralları. Örnek route'lar: `users/[id]`, `users/bulk-role`, `articles/bulk`. |
| i18n | Merkezi kılavuz `docs/i18n.md`; `messages/tr.json` ve `messages/en.json` yapısı dokümante. |
| CI | `next.config.js`: `ignoreDuringBuilds` ve `ignoreBuildErrors` artık `!process.env.CI` ile koşullu; CI'da `CI=true` ile build fail eder. |
| Circuit breaker + retry | `lib/circuit-breaker.ts`: `withCircuitBreakerAndRetry`, `CircuitBreakerRetryOptions`; firecrawl, tavily, resend için `SERVICE_CONFIGS` eklendi. |
