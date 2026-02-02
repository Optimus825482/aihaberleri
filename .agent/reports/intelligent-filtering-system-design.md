# 🚀 AKILLI HABER FİLTRELEME SİSTEMİ - TASARIM DOKÜMANI

**Tarih:** 02 Şubat 2026  
**Versiyon:** 2.0  
**Durum:** Implementation Ready

---

## 📋 SİSTEM AKIŞI

### Mevcut Sistem (v1.0):

```
79 haber → Brave Trend (20 haber) → DeepSeek Seçim (5 haber) → Duplicate Check → Yayınla
❌ SORUN: 20 haberden 0 yayınlandı (duplicate detection çok hassas)
```

### Yeni Sistem (v2.0):

```
79 haber
  ↓
📊 STAGE 1: Batch Filtering (79 → 40 haber)
  ├─ 8 batch × 10 haber
  ├─ Her batch'ten en iyi 5'ini seç (puan bazlı)
  └─ Sonuç: 40 haber
  ↓
🧠 STAGE 2: Topic Extraction (40 haber)
  ├─ DeepSeek API ile her haberin konusunu çıkar
  ├─ Benzer konuları grupla
  └─ Sonuç: 40 haber + topic metadata
  ↓
🔍 STAGE 3: Topic-Based Duplicate Check
  ├─ Veritabanındaki TÜM haberlerin konularını çıkar (one-time)
  ├─ Yeni haberleri puan sırasına göre işle
  ├─ Her haber için: Aynı topic var mı? → Varsa SKIP
  └─ Sonuç: 5-10 unique topic haberi
  ↓
📰 STAGE 4: Deep Research & Publish
  ├─ Her unique haber için kaynak topla
  ├─ İçerik sentezle
  └─ Yayınla
```

---

## 🎯 STAGE 1: BATCH FILTERING

### Amaç:

79 haberi → 40 habere düşür (en yüksek puanlıları seç)

### Algoritma:

```typescript
// 79 haber → 8 batch (10'ar haber)
const batches = chunkArray(articles, 10); // [10, 10, 10, 10, 10, 10, 10, 9]

const filteredArticles = [];
for (const batch of batches) {
  // Her batch'ten en iyi 5'ini seç
  const topFive = batch.sort((a, b) => b.trendScore - a.trendScore).slice(0, 5);

  filteredArticles.push(...topFive);
}

// Sonuç: 8 batch × 5 haber = 40 haber
```

### Performans:

- Süre: ~0.1 saniye (in-memory sorting)
- Maliyet: $0 (API call yok)

---

## 🧠 STAGE 2: TOPIC EXTRACTION

### Amaç:

Her haberin "konusunu" (topic) çıkar ve grupla

### Topic Nedir?

```
Örnek 1:
  Başlık: "Nvidia CEO'su OpenAI'a 100 Milyar Dolar Yatırım Yapacak"
  Topic: "nvidia_openai_investment"

Örnek 2:
  Başlık: "Endonezya Grok Yapay Zekasına Yasağı Kaldırdı"
  Topic: "indonesia_grok_ban"

Örnek 3:
  Başlık: "Google Gemini 2.0 Tanıtıldı"
  Topic: "google_gemini_release"
```

### DeepSeek API Prompt:

```typescript
const prompt = `Sen bir haber kategorilendirme uzmanısın.

Görevin: Aşağıdaki haber başlığından KISA ve AÇIKLAYICI bir topic (konu) çıkar.

KURALLAR:
1. Topic 2-4 kelime olmalı (snake_case formatında)
2. Ana entity'leri içermeli (şirket, ürün, kişi)
3. Ana aksiyonu içermeli (investment, ban, release, partnership)
4. Türkçe karaktersiz, küçük harf, alt çizgi ile ayrılmış

BAŞLIK: "${title}"

SADECE TOPIC'İ YANIT VER (örnek: nvidia_openai_investment)`;

const topic = await callDeepSeek(
  [
    {
      role: "system",
      content:
        "Sen bir haber kategorilendirme uzmanısın. Sadece topic yanıtı ver.",
    },
    { role: "user", content: prompt },
  ],
  { maxTokens: 50, temperature: 0.3 },
);
```

### Batch Processing:

```typescript
// 40 haberi 4'er batch'te işle (rate limit için)
const topicBatches = chunkArray(filteredArticles, 4);

for (const batch of topicBatches) {
  const topicPromises = batch.map((article) => extractTopic(article.title));
  const topics = await Promise.all(topicPromises);

  // Her habere topic'ini ekle
  batch.forEach((article, i) => {
    article.topic = topics[i];
  });

  // Rate limit protection
  await sleep(500);
}
```

### Performans:

- Süre: ~10 saniye (40 haber ÷ 4 batch × 500ms + API time)
- Maliyet: ~$0.01 (40 × 50 token × $0.14/1M)

### Topic Gruplama:

```typescript
// Benzer topic'leri grupla
const topicGroups = {};
for (const article of filteredArticles) {
  if (!topicGroups[article.topic]) {
    topicGroups[article.topic] = [];
  }
  topicGroups[article.topic].push(article);
}

// Örnek sonuç:
// {
//   "nvidia_openai_investment": [article1, article2, article3],
//   "indonesia_grok_ban": [article4, article5],
//   "google_gemini_release": [article6]
// }
```

---

## 🔍 STAGE 3: TOPIC-BASED DUPLICATE CHECK

### Amaç:

Veritabanındaki haberlerle topic bazlı duplicate kontrolü

### 3.1: Veritabanı Topic Extraction (One-Time)

**Sorun:** Mevcut haberlerin topic'i yok!

**Çözüm:** Background job ile tüm haberlerin topic'ini çıkar

```typescript
// Migration: Add topic column
ALTER TABLE "Article" ADD COLUMN "topic" TEXT;
CREATE INDEX "Article_topic_idx" ON "Article"("topic");

// Background job: Extract topics for existing articles
async function extractTopicsForExistingArticles() {
  const articles = await db.article.findMany({
    where: { topic: null },
    select: { id: true, title: true },
    take: 100 // Process 100 at a time
  });

  for (const article of articles) {
    const topic = await extractTopic(article.title);
    await db.article.update({
      where: { id: article.id },
      data: { topic }
    });
  }
}
```

### 3.2: Topic-Based Duplicate Check

```typescript
async function checkTopicDuplicate(
  article: NewsArticle,
  timeWindowDays: number = 7,
): Promise<boolean> {
  // Veritabanında aynı topic var mı?
  const existingArticle = await db.article.findFirst({
    where: {
      topic: article.topic,
      publishedAt: {
        gte: new Date(Date.now() - timeWindowDays * 24 * 60 * 60 * 1000),
      },
      status: "PUBLISHED",
    },
    select: { id: true, title: true, topic: true, publishedAt: true },
  });

  if (existingArticle) {
    console.log(`❌ TOPIC DUPLICATE: "${article.topic}"`);
    console.log(`   Existing: ${existingArticle.title}`);
    console.log(`   New: ${article.title}`);
    return true;
  }

  return false;
}
```

### 3.3: Smart Selection Algorithm

```typescript
async function selectUniqueTopicArticles(
  articles: NewsArticle[],
  targetCount: number = 5,
): Promise<NewsArticle[]> {
  // Puana göre sırala (en yüksek önce)
  const sortedArticles = articles.sort((a, b) => b.trendScore - a.trendScore);

  const selected: NewsArticle[] = [];
  const seenTopics = new Set<string>();

  for (const article of sortedArticles) {
    if (selected.length >= targetCount) break;

    // Bu topic'i daha önce seçtik mi?
    if (seenTopics.has(article.topic)) {
      console.log(`⏭️  SKIP (topic already selected): ${article.topic}`);
      continue;
    }

    // Veritabanında bu topic var mı?
    const isDuplicate = await checkTopicDuplicate(article, 7);
    if (isDuplicate) {
      console.log(`⏭️  SKIP (topic in database): ${article.topic}`);
      continue;
    }

    // ✅ Unique topic! Seç
    selected.push(article);
    seenTopics.add(article.topic);
    console.log(`✅ SELECTED: ${article.topic} (score: ${article.trendScore})`);
  }

  return selected;
}
```

### Performans:

- Süre: ~2 saniye (40 haber × 50ms DB query)
- Maliyet: $0 (sadece DB query)

---

## 📰 STAGE 4: DEEP RESEARCH & PUBLISH

### Amaç:

Seçilen unique haberleri derin araştırma ile yayınla

**Değişiklik yok!** Mevcut sistem aynen kullanılacak:

1. Brave Search ile kaynak topla (8-10 kaynak)
2. Jina Reader ile içerikleri oku
3. DeepSeek ile sentezle (TR + EN)
4. Görsel oluştur
5. Yayınla

---

## 📊 PERFORMANS TAHMİNİ

### Yeni Sistem (v2.0):

```
STAGE 1: Batch Filtering       ~0.1s   ($0)
STAGE 2: Topic Extraction       ~10s    ($0.01)
STAGE 3: Duplicate Check        ~2s     ($0)
STAGE 4: Deep Research          ~180s   ($0.50)
─────────────────────────────────────────────
TOPLAM:                         ~192s   ($0.51)
```

### Karşılaştırma:

```
                    Mevcut (v1.0)    Yeni (v2.0)
─────────────────────────────────────────────────
Süre:               ~31s             ~192s
Maliyet:            ~$0.50           ~$0.51
Yayınlanan Haber:   0/20 (0%)        5-8/40 (12-20%)
Duplicate Rate:     100%             10-20%
```

### Beklenen İyileşme:

- ✅ **0 haber → 5-8 haber** yayınlanır
- ✅ **Topic-based** duplicate detection (daha akıllı)
- ✅ **40 haber** arasından seçim (daha fazla çeşitlilik)
- ✅ **Batch filtering** (daha hızlı)

---

## 🔧 IMPLEMENTATION PLAN

### Phase 1: Database Migration (30 dakika)

1. ✅ `Article` tablosuna `topic` kolonu ekle
2. ✅ Index oluştur
3. ✅ Background job: Mevcut haberlerin topic'ini çıkar

### Phase 2: Topic Extraction Service (1 saat)

1. ✅ `extractTopic()` fonksiyonu
2. ✅ Batch processing
3. ✅ Rate limit protection

### Phase 3: Smart Filtering Pipeline (2 saat)

1. ✅ Stage 1: Batch filtering
2. ✅ Stage 2: Topic extraction
3. ✅ Stage 3: Topic-based duplicate check
4. ✅ Stage 4: Integration with existing system

### Phase 4: Testing & Monitoring (1 saat)

1. ✅ Unit tests
2. ✅ Integration tests
3. ✅ Performance monitoring
4. ✅ Alert system

**TOPLAM:** ~4.5 saat

---

## 🎯 SUCCESS METRICS

### KPI'lar:

1. **Publication Rate:** 0% → 12-20%
2. **Duplicate Rate:** 100% → 10-20%
3. **Topic Diversity:** 1-2 topic → 5-8 topic
4. **Processing Time:** 31s → 192s (acceptable)
5. **Cost per Article:** $0.50 → $0.06-0.10

### Monitoring:

```typescript
// Metrics to track
{
  "stage1_filtered": 40,
  "stage2_topics_extracted": 40,
  "stage3_unique_topics": 8,
  "stage4_published": 5,
  "duplicate_rate": 0.15,
  "processing_time_seconds": 192,
  "cost_usd": 0.51
}
```

---

## 🚀 NEXT STEPS

1. **HEMEN:** Database migration
2. **BUGÜN:** Topic extraction service
3. **YARIN:** Smart filtering pipeline
4. **BU HAFTA:** Testing & deployment

**Hazır mısın? Başlayalım! 🚀**
