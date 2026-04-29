# Haber Oluşturma ve Yayınlama Pipeline – Detaylı Analiz

**Tarih:** 2026-03-07  
**Kapsam:** RSS toplama → makale sentezi → görsel → SEO → DB yayını → sosyal paylaşım.

---

## 1. Pipeline Akış Özeti

```text
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
- `PipelineReEnrichPayload` içinde `sources` / `synthesizedContent` yok; sadece temel alanlar ile `_forceReEnrich`, `_rejectionReason`, `_retryCount` bulunuyor. SourceGatherer bu alanlarla çalıştığı için runtime’da sorun yok.

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
- Firecrawl, Tavily, Exa, Google News çağrıları tek bir strateji (circuit breaker + retry) ile korunabilir.

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
| ---- | ---- | ----- | ------- |
| DuplicateDetector input tipi (CollectedArticle vs ScoredArticle) | Orta | Tutarsız | Tipi `CollectedArticle[]` veya union yap |
| Legacy ContentEnricher aynı queue | Yüksek | Risk | Kaldır veya queue’yu değiştir |
| SourceGatherer yerel circuit breaker | Orta | Tekrarlı | `lib/circuit-breaker` + `withCircuitBreakerAndRetry` kullan |
| SEO Optimizer nextQueueName eksik | Düşük | Tutarsız | `nextQueueName` ekle veya tamamen `emitToNextQueue`'ya geç |
| ContentSynthesizer 180s sabit timeout | Düşük | Belirsiz | Config/env veya dinamik timeout |
| RelevanceFilter bypass metrikleri | Orta | Eksik | Bypass sayısı log + metrik/alert |
| Re-enrich job tipi (SourceGatherer union) | Düşük | Net değil | `PipelineReEnrichPayload` union tipi |
| TrendEnricher `super("TrendEnricher")` | Düşük | İsim tutarsız | `super("trend-enricher")` |
| Pipeline health tek özet | Orta | Dağınık | Tek health/dashboard endpoint veya sayfa |

---

## 6. Sonuç

Pipeline mimarisi sağlam; kuyruk zinciri, kalite kapıları ve re-enrich döngüsü doğru tasarlanmış. Sorunlar çoğunlukla tip tutarlılığı, kullanılmayan legacy kod (ContentEnricher) ve izleme/konfigürasyon detaylarıyla sınırlı. Öncelik: ContentEnricher’ı devre dışı bırakmak/kaldırmak, ardından tip düzeltmeleri ve circuit breaker birleştirmesi.

---

## 7. Uygulanan Öneriler (2026-03-07)

| Öneri | Uygulama |
| ----- | -------- |
| 3.1-3.2 DuplicateDetector tipi | Input `CollectedArticle[]`; `ScoredArticle` optional; `RelevanceFilter ?? 0` |
| 3.3 ContentEnricher | `ENRICHED_ARTICLES_LEGACY` queue; `@deprecated` |
| 3.4 SEO Optimizer | `nextQueueName = DATABASE_PUBLISHER` |
| 3.5+3.8 Re-enrich | `SourceGathererInput` union; `RE_ENRICH_JOB_NAME` |
| 3.6-3.7 Doc + TrendEnricher | Comments; `super("trend-enricher")` |
| 4.1 SourceGatherer | Local CircuitBreaker removed; Tavily/Firecrawl/Exa/Google News wrapped with `withCircuitBreakerAndRetry` |
| 4.2-4.4 Timeout, bypass, visual_failed | `SYNTHESIS_TIMEOUT_MS`; `bypass_count` log; `metrics.visualFailed` |
| 4.7 Pipeline health tek özet | `GET /api/admin/pipeline/health`; admin ana sayfada `PipelineHealthCard` |

---

## 8. Güncel Önceliklendirilmiş Öneri Listesi (2026-03-13)

> **Önemli not:** Yukarıdaki bölümler 2026-03-07 snapshot’ını içerir. Aşağıdaki liste, 2026-03-13 itibarıyla kod tabanının güncel durumuna göre revize edilmiş **uygulama öncelik sırası** ve **önerilen kararları** temsil eder.

### 8.1 Öncelik 1 — Tek canonical worker belirle

#### 8.1.1 Mevcut durum

- `package.json` içinde varsayılan worker komutu: `npm run worker` → `src/workers/news-agent.worker.ts`
- Ayrı bir worker daha var: `npm run worker:orchestrator` → `src/workers/orchestrator.worker.ts`
- `orchestrator.worker.ts` yeni BullMQ/agent zincirini daha temiz temsil ediyor.
- `news-agent.worker.ts` ise hem queue worker, hem progress/log orchestration, hem de legacy `executeNewsAgent()` akışını birlikte taşıyor.

#### 8.1.2 Risk

- Operasyonda iki farklı giriş noktası farklı davranış üretir.
- Bakım maliyeti artar; hata anında “hangi worker gerçeği temsil ediyor?” sorusu çıkar.

#### 8.1.3 Karar önerisi

- **Canonical runtime:** `src/workers/orchestrator.worker.ts`
- `npm run worker` bu dosyaya yönlenmeli.
- `news-agent.worker.ts` şu seçeneklerden biriyle netleştirilmeli:
  - `deprecated` + sadece internal/legacy,
  - veya tamamen kaldırılmalı,
  - veya sadece ingestion/scheduling sorumluluğuna indirgenmeli.

#### 8.1.4 Somut aksiyonlar

1. `package.json` içinde `worker` script’ini `worker:orchestrator` ile hizala.
2. `news-agent.worker.ts` dosyasının tepesine açık bir durum notu ekle:
    - `@deprecated`
    - veya `@internal ingestion-only`
3. README ve deployment dokümanında tek çalışma komutu bırak.

#### 8.1.5 Done when

- Tek production worker komutu vardır.
- Legacy worker’ın rolü açıkça belgelenmiştir.
- Operasyon ekibi için belirsizlik kalmaz.

---

### 8.2 Öncelik 2 — Pipeline type sözleşmesini gerçek sıraya uydur

#### 8.2.1 Mevcut durum

- Queue akışı fiilen: `CollectedArticle → DuplicateDetector → RelevanceFilter → TrendEnricher → SourceGatherer ...`
- Ancak `src/agents/pipeline-types.ts` başındaki kavramsal akış hâlâ `CollectedArticle → ScoredArticle → UniqueArticle` diye yazılmış.
- Runtime bug büyük ölçüde çözülmüş olsa da, tip isimleri ile gerçek stage sırası arasında kavramsal kayma sürüyor.

#### 8.2.2 Risk

- Yeni geliştirici yanlış sırayı öğrenir.
- Kod review ve refactor sırasında tip akışını takip etmek zorlaşır.

#### 8.2.3 Karar önerisi

Stage isimleri queue sırasını birebir yansıtmalı:

```text
CollectedArticle
  → DeduplicatedArticle
  → ScoredArticle
  → TrendEnrichedArticle
  → ArticleWithSources
  → SynthesizedArticle
  → EnrichedArticle
  → ArticleWithVisuals
  → ArticleWithSEO
  → PublishedArticle
```

#### 8.2.4 Somut aksiyonlar

1. `pipeline-types.ts` içindeki başlık yorumunu güncelle.
2. `UniqueArticle` yerine `DeduplicatedArticle` gibi gerçek aşamayı anlatan isim kullan.
3. Agent import zincirlerini yeni type isimleriyle hizala.
4. Kuyruk isimleri ile type isimlerini aynı sırada belgeleyen küçük bir tablo ekle.

#### 8.2.5 Done when

- Tip isimleri gerçek pipeline sırasını yansıtır.
- Header comment, queue-manager ve orchestrator açıklamaları aynı dili konuşur.

---

### 8.3 Öncelik 3 — README + admin settings + env davranışını hizala

#### 8.3.1 Mevcut durum

- README env değişkenleri üzerinden “her çalıştırmada 1 haber” gibi konuşuyor.
- Gerçekte `agent.articlesPerRun` admin paneli ve DB setting’i kullanılıyor.
- `agent.service.ts` env değerini fallback olarak alıyor.
- `database-publisher.agent.ts` ayrıca publish limit uyguluyor.

#### 8.3.2 Risk

- Operasyon tarafı env değiştirir ama sonuç DB setting yüzünden beklediği gibi olmaz.
- Dokümantasyon kullanıcıyı yanlış yönlendirir.

#### 8.3.3 Karar önerisi

- **Tek source of truth:** `agent.articlesPerRun` (DB setting)
- Env yalnızca **bootstrap/fallback** amacıyla kullanılmalı.

#### 8.3.4 Önerilen davranış modeli

- Admin panel kaydı varsa: onu kullan
- DB’de yoksa: env fallback kullan
- README bunu açıkça söyle

#### 8.3.5 Somut aksiyonlar

1. README’de `AGENT_MIN_ARTICLES_PER_RUN` / `AGENT_MAX_ARTICLES_PER_RUN` anlatısını güncelle.
2. `articlesPerRun` için “DB setting > env fallback” kuralını dokümante et.
3. Admin panel açıklama metninde “çalışma başına işlenecek/yayınlanacak hedef haber sayısı” ifadesini netleştir.
4. Gerekirse collect limiti ile publish limitini ayrı isimlendir:
    - `candidateArticlesPerRun`
    - `publishArticlesPerRun`

#### 8.3.6 Done when

- README, admin panel ve runtime davranışı aynı modeli anlatır.
- `articlesPerRun` konusunda tek bir doğru açıklama vardır.

---

### 8.4 Öncelik 4 — Legacy orchestration sınırını belgeleyin veya kaldırın

#### 8.4.1 Mevcut durum

- `executeNewsAgent()` hâlâ önemli bir orchestration katmanı gibi duruyor.
- Bu katman topic grouping, hibrit skor, seçim ve bazı scheduling bağlamlarını taşıyor.
- BullMQ pipeline ise asıl processing zincirini taşıyor.

#### 8.4.2 Şu an belirsiz olan soru

- `executeNewsAgent()` tam olarak neyin sahibi?
- BullMQ zinciri nerede başlıyor, nerede bitiyor?

#### 8.4.3 Karar önerisi

İki rolden biri seçilmeli:

#### Seçenek A — Korunacaksa açık sınır çiz

- `executeNewsAgent()` = **ingestion / candidate selection / scheduling orchestration**
- BullMQ pipeline = **processing / validation / publish orchestration**

#### Seçenek B — Sadeleştirilecekse kaldır

- Topic grouping ve seçim logic’i canonical orchestrator içine veya ayrı ingestion service’e taşınır
- `news-agent.worker.ts` küçültülür / kaldırılır

#### 8.4.4 Somut aksiyonlar

1. `executeNewsAgent()` için tek cümlelik resmi sorumluluk tanımı yaz.
2. README veya bu dokümana “ingestion vs processing” sınır diyagramı ekle.
3. Eğer legacy ise dosya başına `@deprecated` ve kaldırma planı ekle.

#### 8.4.5 Done when

- Herkes `executeNewsAgent()` ile BullMQ zincirinin farkını 30 saniyede anlayabilir.
- Aynı işi yapan iki orchestration katmanı kalmaz.

---

### 8.5 Öncelik 5 — Kalite metriklerini görünürleştir

#### 8.5.1 Mevcut durum

- `bypass_count` log seviyesinde var.
- `visualFailed` metric/log olarak var.
- re-enrich queue adı ve cooldown davranışı tiplerle belgeli.
- `ContentValidator` reject reason’ları log’a yazıyor.
- `PipelineHealthCard` ve `/api/admin/pipeline/health` mevcut.

#### 8.5.2 Eksik olan

- Bu kalite sinyalleri tek ekranda veya zaman serisi halinde görünmüyor.
- Özellikle şu sayılar admin için ilk sınıf metrik değil:
  - bypass count
  - re-enrich count
  - visual fail count
  - publish reject reasons dağılımı

#### 8.5.3 Karar önerisi

Kalite metrikleri iki katmanda görünür olmalı:

1. **Anlık operasyonel görünüm**
    - bugünkü bypass
    - bugünkü re-enrich
    - bugünkü visual fail
    - son reject reason dağılımı

2. **Trend görünümü**
    - 24 saat / 7 gün eğilimleri

#### 8.5.4 Somut aksiyonlar

1. Yeni bir `pipeline quality summary` endpoint’i ekle veya mevcut health/stats endpoint’ini genişlet.
2. Redis/DB’de aşağıdaki sayaçları topla:
    - `quality:bypass_count`
    - `quality:re_enrich_count`
    - `quality:visual_failed`
    - `quality:reject_reason:<reason>`
3. Admin ana sayfaya “Kalite Sinyalleri” kartı ekle.
4. En az şu reject reason’ları breakdown olarak göster:
    - `english_title`
    - `dictionary_content`
    - `low_quality`
    - `missing_image`
    - `fallback_image`
    - `zero_external_sources`

#### 8.5.5 Done when

- Admin panelde kalite düşüşü log okumadan anlaşılır.
- LLM fallback / re-enrich / reject artışları görünür hale gelir.

---

## 9. Önerilen uygulama sırası

| Sıra | İş | Etki | Risk | Not |
| ---- | --- | ---- | ---- | --- |
| 1 | Canonical worker kararı | Çok yüksek | Düşük-Orta | Operasyonel belirsizliği hemen azaltır |
| 2 | Legacy orchestration sınırı | Yüksek | Orta | Worker sadeleştirme kararını destekler |
| 3 | Pipeline type sözleşmesi | Yüksek | Düşük | Refactor güvenliğini artırır |
| 4 | `articlesPerRun` davranış hizası | Orta-Yüksek | Düşük | Dokümantasyon ve admin UX netleşir |
| 5 | Kalite metrikleri görünürlüğü | Orta | Düşük-Orta | Operasyonel kaliteyi görünür yapar |

---

## 10. Kısa yönetici özeti

- **En kritik karar:** Tek worker standardı belirlenmeli.
- **En kritik teknik borç:** Type sözleşmesi ve runtime sırası aynı dili konuşmalı.
- **En kritik operasyonel eksik:** `articlesPerRun` davranışı ve kalite sinyalleri merkezi şekilde görünür değil.
- **Önerilen yön:** `orchestrator.worker.ts` canonical olsun; legacy orchestration ya küçültülsün ya kaldırma planına alınsın.
