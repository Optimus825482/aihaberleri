# Haber Oluşturma ve Yayınlama Pipeline – Detaylı Analiz

**Tarih:** 2026-03-07  
**Kapsam:** RSS toplama → makale sentezi → görsel → SEO → DB yayını → sosyal paylaşım.

---

## 1. Pipeline Akış Özeti

```
ContentCollector (RSS)
    → UNIQUE_ARTICLES (DuplicateDetector)
    → RELEVANT_ARTICLES (RelevanceFilter)
    → TREND_ENRICHMENT (TrendEnricher)
    → ENRICHED_ARTICLES (SourceGatherer)
    → CONTENT_SYNTHESIS (ContentSynthesizer)
    → CONTENT_VALIDATION (ContentValidator)
    → ARTICLES_WITH_VISUALS (VisualGenerator)
    → SEO_OPTIMIZATION (SEO Optimizer)
    → DATABASE_PUBLISHER (DatabasePublisher)
    → SOCIAL_SHARE (SocialShare)
```

**Re-enrich döngüsü:** DatabasePublisher kalite kapısında reddederse → `ENRICHED_ARTICLES` kuyruğuna `PipelineReEnrichPayload[]` eklenir (5 dk gecikmeli, 2 saat cooldown).

---

## 2. Güçlü Yönler

- **Net katmanlı yapı:** Her aşama tek sorumluluk, BullMQ ile kuyruk zinciri tutarlı.
- **Kalite kapıları:** DatabasePublisher’da TR başlık dili, sözlük içeriği, görsel zorunluluğu, dış kaynak yokluğu, kalite skoru kontrolleri var.
- **Re-enrich:** Reddedilen makaleler `_forceReEnrich` ile SourceGatherer’a geri gidiyor; agresif kaynak toplama ve 2 saat cooldown ile sonsuz döngü engelleniyor.
- **Tip zinciri:** `pipeline-types.ts` ile ArticleWithSources → SynthesizedArticle → EnrichedArticle tanımları merkezi.
- **Circuit breaker / timeout:** BaseAgent’ta process timeout, SourceGatherer’da yerel circuit breaker, Redis OOM guard mevcut.
- **Sosyal paylaşım ayrımı:** SocialShare ayrı agent; yayınlama başarısı sosyal API hatalarından etkilenmiyor.

---

## 3. Hatalı / Tutarsız Kısımlar

### 3.1 Tip uyumsuzluğu: ContentCollector → DuplicateDetector

- **ContentCollector** çıktısı: `CollectedArticle[]` (title, description, url, trendScore, category, vb.).
- **DuplicateDetector** job tipi: `Job<ScoredArticle[]>`.
- **ScoredArticle** = CollectedArticle + relevanceScore, reasoning, suggestedCategory (RelevanceFilter çıktısı).
- Gerçek akışta DuplicateDetector’a **CollectedArticle[]** geliyor; relevanceScore henüz yok. Çalışma zamanında alanlar kullanıldığı için bug yok ama tip yanlış.

**Öneri:** DuplicateDetector input tipini `CollectedArticle[]` veya `CollectedArticle[] | ScoredArticle[]` yap; ya da ortak bir `PipelineArticleBase` tipi tanımlayıp her iki agent’ta kullan.

---

### 3.2 DuplicateDetector çıktısında eksik alan

- DuplicateDetector `UniqueArticle[]` üretiyor; `UniqueArticle` = ScoredArticle + topic, isDuplicate, embedding.
- Girdi aslında `CollectedArticle[]` olduğu için `...article` ile yayılan objede `relevanceScore` / `reasoning` yok.
- RelevanceFilter bu çıktıyı alıp skorluyor; yani zincir doğru çalışıyor ama `UniqueArticle` tipi “relevanceScore opsiyonel” taşımıyor; dokümantasyon/tip açısından kafa karıştırıcı.

**Öneri:** UniqueArticle’da relevanceScore/reasoning’i optional yap veya DuplicateDetector çıktı tipini “RelevanceFilter girdisi” olarak ayrı bir interface ile tanımla.

---

### 3.3 Legacy ContentEnricher ve ENRICHED_ARTICLES

- **ContentEnricherAgent** hâlâ `queueName: QUEUE_NAMES.ENRICHED_ARTICLES` kullanıyor.
- Orchestrator sadece **SourceGatherer**’ı başlatıyor; ContentEnricher başlatılmıyor.
- Eğer bir yerde ContentEnricher da çalıştırılırsa aynı kuyruğu iki worker tüketir; işler bölünür veya çakışır.

**Öneri:** ContentEnricher’ı kaldır veya queue’yu değiştirip devre dışı bırak; dokümantasyonda “DEPRECATED – use SourceGatherer” olarak işaretle.

---

### 3.4 SEO Optimizer’da nextQueueName yok

- SEO Optimizer `config.nextQueueName` tanımlamıyor; `emitToNextQueue` kullanmıyor.
- DATABASE_PUBLISHER’a manuel `getQueue(QUEUE_NAMES.DATABASE_PUBLISHER)` + `queue.add(...)` ile gönderim var.
- Davranış doğru ama diğer agent’larla pattern farkı var; tek bir yerde manuel queue kullanımı.

**Öneri:** `nextQueueName: QUEUE_NAMES.DATABASE_PUBLISHER` ekleyip, yine `skipNextQueue: true` dönüp manuel add kullanmaya devam edebilirsin (mevcut mantık korunur). İstersen tamamen standart `emitToNextQueue` ile değiştirip tek pattern’e geç.

---

### 3.5 Re-enrich job formatı ve SourceGatherer job tipi

- DatabasePublisher re-enrich’te `PipelineReEnrichPayload[]` ekliyor.
- SourceGatherer job tipi: `SourceGathererInput[]` = `(UniqueArticle & Partial<ReEnrichMetadata>)[]`.
- PipelineReEnrichPayload’da sources/synthesizedContent yok; sadece temel alanlar + _forceReEnrich, _rejectionReason, _retryCount var. SourceGatherer bu alanlarla çalışıyor, runtime’da sorun yok.

**Öneri:** Tipi netleştirmek için `SourceGathererInput = (UniqueArticle | PipelineReEnrichPayload) & Partial<ReEnrichMetadata>` gibi bir union kullanılabilir; böylece re-enrich payload’ı açıkça modellenir.

---

### 3.6 ContentCollector → DuplicateDetector sırası ve dokümantasyon

- queue-manager yorumu: “ContentCollector → DuplicateDetector → RelevanceFilter”.
- Gerçek sıra: Collector → **DuplicateDetector** → **RelevanceFilter** → TrendEnricher → …
- DuplicateDetector “RelevanceFilter FIRST” yorumu ile uyumlu; ancak “Duplicate FIRST” ifadesi Collector’dan hemen sonra duplicate kontrolü anlamında doğru, dokümantasyon karışabilir.

**Öneri:** queue-manager ve orchestrator başlıklarındaki “RelevanceFilter FIRST” / “Duplicate FIRST” ifadelerini tek bir net cümleyle güncelle: “Collector → Duplicate → Relevance → Trend → SourceGatherer → …”.

---

### 3.7 TrendEnricher constructor ismi

- Sınıf adı: `TrendEnricherAgent`, constructor’da `super("TrendEnricher")` kullanılıyor.
- BaseAgent ve log’larda agent adı “TrendEnricher” oluyor; config.name ise “trend-enricher”.
- base-agent’taki timeout key’i `"trend-enricher"`. Tutarlılık için tek isim kullanılmalı.

**Öneri:** `super("trend-enricher")` yap; böylece config.name ve timeout key ile uyumlu olur.

---

### 3.8 DatabasePublisher’da re-enrich queue job adı

- Re-enrich için: `enricherQueue.add("force-re-enrich", retryArticles, { ... })`.
- Normal akışta TrendEnricher `queue.add("trend-enricher-output", data, ...)` (base-agent’tan gelen isimle) kullanıyor.
- İki farklı job “name”; tüketici (SourceGatherer) sadece job.data’ya baktığı için sorun yok. İzleme/debug için job name’lerin dokümante edilmesi faydalı.

**Öneri:** Re-enrich job name’ini (ör. `source-gatherer-re-enrich`) sabit bir constant’a alıp hem DatabasePublisher hem olası metrik/log’larda kullan.

---

## 4. Geliştirilmesi Gereken Kısımlar

### 4.1 Dış API çağrılarında ortak circuit breaker

- SourceGatherer kendi CircuitBreaker sınıfını (Tavily, Jina) kullanıyor.
- Projede `lib/circuit-breaker.ts` ve `withCircuitBreakerAndRetry` var; SourceGatherer bunları kullanmıyor.
- Firecrawl, Tavily, Exa, SearXNG çağrıları tek bir strateji (circuit breaker + retry) ile korunabilir.

**Öneri:** SourceGatherer’daki yerel circuit breaker’ı kaldırıp `withCircuitBreakerAndRetry('tavily', ...)` / `withCircuitBreakerAndRetry('firecrawl', ...)` vb. kullan; SERVICE_CONFIGS’teki firecrawl/tavily ayarlarıyla uyumlu olur.

---

### 4.2 ContentSynthesizer timeout sabiti

- Sentez için 180_000 ms (3 dk) sabit Promise.race kullanılıyor.
- base-agent’ta content-synthesizer timeout 12 dk (AGENT_TIMEOUTS).
- Job seviyesinde 3 dk, agent seviyesinde 12 dk; bir job içinde birden fazla makale olunca 3 dk makale başına, toplam 12 dk’yı aşabilir.

**Öneri:** 180s’i config veya env’den oku; ya da makale başına timeout’u (örn. 120s) ve toplam job timeout’u (12 dk) birlikte dokümante et. Gerekirse makale sayısına göre dinamik timeout (örn. min(180_000, 720_000 / articles.length)) kullan.

---

### 4.3 RelevanceFilter bypass modu

- DeepSeek başarısız olunca BYPASS_MODE_ENABLED ile “AI keyword” ile geçiriyor; RELEVANCE_THRESHOLD (35) atlanıyor.
- Bu sayede tek bir LLM hatası tüm batch’i kaybetmeyi engelliyor ama kalite düşebilir.

**Öneri:** Bypass’ı log’da net işaretle; mümkünse bypass ile geçen makale sayısını metrik/alert ile izle. Uzun süre yüksek bypass oranı varsa uyarı ver.

---

### 4.4 Görsel üretimi başarısız olan makaleler

- VisualGenerator görsel üretemezse makale fallback URL veya null ile devam ediyor.
- DatabasePublisher “image yok” ve “stock fallback” için re-enrich veya kalıcı red uyguluyor; bu doğru.
- Görsel adımında kaç makalenin drop edildiği pipeline metriklerinde net görünmüyor olabilir.

**Öneri:** VisualGenerator çıktısında “görsel üretilemeyen” sayısını logla; pipeline/stats endpoint’inde “visual_skipped” veya “visual_failed” sayacı ekle.

---

### 4.5 SocialShare hata yönetimi

- Platform bazlı hata kaydediliyor; bir platform fail olsa bile diğerleri çalışıyor.
- Agent tamamen fail ederse (örn. DB/Redis) job retry’a düşüyor (attempts: 3). Bu iyi.
- Hangi platformun ne sıklıkla fail ettiği uzun vadede raporlanmıyor.

**Öneri:** Platform bazlı başarı/başarısızlık oranını (ör. son 24 saat) Redis veya DB’de toplayıp admin panelde veya alerting’te göster.

---

### 4.6 Orchestrator tetikleme tek noktası

- Toplama sadece Smart Scheduler + `triggerContentCollection()` ile tetikleniyor.
- Manuel tetikleme muhtemelen API’den (ör. admin queues/trigger) yapılıyor; bu path’in rate limit ve yetki kontrolü pipeline bütünlüğü için önemli.

**Öneri:** Admin trigger endpoint’inde rate limit ve “tek seferde en fazla X tetikleme” kuralını doğrula; gerekirse “son tetiklemeden en az Y dakika geçmeli” kısıtı ekle.

---

### 4.7 Agent health ve pipeline izleme

- `updateAgentHealth` / `exitRecoveryMode` base-agent’ta çağrılıyor.
- Pipeline stats ve queue metrikleri ayrı endpoint’lerde (ör. pipeline/stats, queues/stats). Tek bir “pipeline sağlık” özeti (hangi agent’lar unhealthy, hangi kuyrukta birikme var) admin için faydalı.

**Öneri:** Tüm agent health + tüm kuyruk istatistiklerini tek bir “pipeline health” response’unda toplayan bir endpoint veya dashboard bileşeni ekle.

---

## 5. Özet Tablo

| Konu | Önem | Durum | Aksiyon |
|------|------|--------|--------|
| DuplicateDetector input tipi (CollectedArticle vs ScoredArticle) | Orta | Tutarsız | Tipi CollectedArticle[] veya union yap |
| Legacy ContentEnricher aynı queue | Yüksek | Risk | Kaldır veya queue’yu değiştir |
| SourceGatherer yerel circuit breaker | Orta | Tekrarlı | lib/circuit-breaker + withCircuitBreakerAndRetry kullan |
| SEO Optimizer nextQueueName eksik | Düşük | Tutarsız | nextQueueName ekle veya tamamen emitToNextQueue’ya geç |
| ContentSynthesizer 180s sabit timeout | Düşük | Belirsiz | Config/env veya dinamik timeout |
| RelevanceFilter bypass metrikleri | Orta | Eksik | Bypass sayısı log + metrik/alert |
| Re-enrich job tipi (SourceGatherer union) | Düşük | Net değil | PipelineReEnrichPayload union tipi |
| TrendEnricher super("TrendEnricher") | Düşük | İsim tutarsız | super("trend-enricher") |
| Pipeline health tek özet | Orta | Dağınık | Tek health/dashboard endpoint veya sayfa |

---

## 6. Sonuç

Pipeline mimarisi sağlam; kuyruk zinciri, kalite kapıları ve re-enrich döngüsü doğru tasarlanmış. Sorunlar çoğunlukla tip tutarlılığı, kullanılmayan legacy kod (ContentEnricher) ve izleme/konfigürasyon detaylarıyla sınırlı. Öncelik: ContentEnricher’ı devre dışı bırakmak/kaldırmak, ardından tip düzeltmeleri ve circuit breaker birleştirmesi.

---

## 7. Uygulanan Öneriler (2026-03-07)

| Öneri | Uygulama |
|-------|----------|
| 3.1-3.2 DuplicateDetector tipi | Input CollectedArticle[]; ScoredArticle optional; RelevanceFilter ?? 0. |
| 3.3 ContentEnricher | ENRICHED_ARTICLES_LEGACY queue; @deprecated. |
| 3.4 SEO Optimizer | nextQueueName DATABASE_PUBLISHER. |
| 3.5+3.8 Re-enrich | SourceGathererInput union; RE_ENRICH_JOB_NAME. |
| 3.6-3.7 Doc + TrendEnricher | Comments; super("trend-enricher"). |
| 4.1 SourceGatherer | Local CircuitBreaker removed. |
| 4.2-4.4 Timeout, bypass, visual_failed | SYNTHESIS_TIMEOUT_MS; bypass_count log; metrics.visualFailed. |
