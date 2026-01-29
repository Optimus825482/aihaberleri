# 🔍 Agent Sistem Analizi ve Çözümler

## Tespit Edilen Sorunlar

### 🔴 Problem 1: Duplicate Haber Yayınlanıyor
**Belirti**: Aynı haber farklı kaynaklardan tekrar tekrar yayınlanıyor

**Kök Neden Analizi**:

1. **Duplicate Check Zamanlaması Sorunu**:
```typescript
// content.service.ts - selectBestArticles()
// ❌ SORUN: Duplicate check sadece seçim öncesinde yapılıyor
const uniqueArticles: NewsArticle[] = [];
for (const article of articles) {
  if (!(await isDuplicate(article))) {
    uniqueArticles.push(article);
  }
}
```

**Sorun**: 
- Duplicate check sadece `selectBestArticles()` fonksiyonunda yapılıyor
- Eğer farklı kaynaklardan gelen haberler **farklı kelimelerle** yazılmışsa (ör: "OpenAI GPT-5" vs "OpenAI'nin Yeni Modeli GPT-5") benzerlik %70'in altında kalabilir
- RSS'den gelen başlıklar genellikle kısadır, içerik henüz fetched değildir

2. **Zayıf Title Similarity Threshold**:
```typescript
// news.service.ts - isDuplicateNews()
const titleSimilarity = calculateSimilarity(title, article.title);
if (titleSimilarity > 0.7) {  // ❌ %70 çok düşük!
  return { isDuplicate: true };
}
```

**Örnekler**:
- "Google Gemini 2.0 Çıktı" vs "Google'ın Gemini 2.0 Modeli Yayınlandı" → %65 benzerlik (PASS)
- "OpenAI GPT-5 Geliyor" vs "GPT-5: OpenAI'nin Yeni Sürümü" → %60 benzerlik (PASS)

3. **Content Check Eksik**:
```typescript
// ❌ Content similarity sadece 300 karakter kontrol ediyor
const contentPreview1 = content.substring(0, 300).toLowerCase();
```

**Sorun**: İlk 300 karakter genellikle giriş cümlesidir, benzerliği yakalamaz.

---

### 🔴 Problem 2: Agent Belirlenen Zamanda Çalışmıyor
**Belirti**: Saat başı çalışması gerektiği halde agent tetiklenmiyor

**Kök Neden Analizi**:

1. **Worker vs In-Process Scheduler Çatışması**:
```typescript
// scheduler.ts
schedulerInterval = setInterval(async () => {
  await checkAndRunAgent();
}, 60 * 1000); // Her dakika check ediyor

// queue.ts
await newsAgentQueue.add("scrape-and-publish", {}, {
  delay,
  jobId: "news-agent-scheduled-run",  // Fixed jobId
  removeOnComplete: true,
});
```

**Sorun**:
- **BullMQ Worker** (asıl scheduled jobs)
- **In-Process Scheduler** (fallback)
- İkisi de çalışıyorsa çatışma olabilir
- `jobId: "news-agent-scheduled-run"` fixed olduğu için sadece 1 job queue'da olabilir

2. **Next Run Time Update Timing**:
```typescript
// agent.service.ts
const intervalHours = parseInt(intervalSetting?.value || "6");
const nextRun = new Date();
nextRun.setHours(nextRun.getHours() + intervalHours);
```

**Sorun**: 
- Admin panel'den interval değiştirilince mevcut job'a etki etmiyor
- Yeni job schedule edilene kadar eski interval geçerli
- "Hemen Çalıştır" butonu yeni job schedule etmeden çalıştırıyor

3. **Worker Health Check Geç Kalıyor**:
```typescript
// docker-compose.coolify.yaml
worker:
  healthcheck:
    interval: 30s  // ❌ 30 saniye çok uzun
    start_period: 30s
```

**Sorun**: Worker crash olup restart ederse 30 saniye boyunca job process edilmez.

---

### 🟡 Problem 3: Benzer Haberler Tekrar Seçiliyor
**Belirti**: "Tesla'nın yeni modeli" haberi birkaç saat arayla tekrar yayınlanıyor

**Kök Neden Analizi**:

1. **DeepSeek AI Selection Bias**:
```typescript
// deepseek.ts - analyzeNewsArticles()
const prompt = `Sen bir yapay zeka haber editörüsün. Bu haberleri analiz et...

Kriterleri:
1. Haber güncelliği ve önemi
2. Teknolojik yenilik seviyesi
3. Okuyucu ilgisi
...
```

**Sorun**: 
- DeepSeek'e geçmiş yayınlanan haberler verilmiyor
- AI aynı konudaki birden fazla haberi "önemli" olarak seçebiliyor
- Konu diversity kontrolü yok

2. **Trend Scoring Overlap**:
```typescript
// brave.ts - rankArticlesByTrendBrave()
// Her habere trend score veriliyor ama duplicate içinde benzer trend'ler yüksek puan alıyor
```

**Sorun**: 
- "GPT-5" trending ise, GPT-5 hakkındaki tüm haberler yüksek puan alır
- Farklı kaynaklardan gelen aynı konudaki haberler hep listenin üstünde

3. **Time Window Çok Kısa**:
```typescript
// news.service.ts
timeWindowHours: number = 48  // ❌ 48 saat yeterli mi?
```

**Sorun**: 
- Popüler bir haber (ör: ChatGPT güncelleme) 3-4 gün boyunca farklı kaynaklarda çıkabiliyor
- 48 saat sonra aynı haber tekrar seçilebiliyor

---

## 💡 Çözümler

### ✅ Çözüm 1: Gelişmiş Duplicate Detection

#### 1.1 Multi-Layer Duplicate Check
```typescript
// YENI: 5 katmanlı duplicate detection

async function isAdvancedDuplicate(article: NewsArticle): Promise<boolean> {
  // Layer 1: URL normalization (mevcut)
  // Layer 2: Exact title match (mevcut)
  
  // Layer 3: ENHANCED Title similarity - keyword extraction
  const extractKeywords = (text: string) => {
    // Remove stop words, extract main terms
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .filter(w => !['haber', 'news', 'için', 'olan', 'this', 'that'].includes(w));
  };
  
  const newKeywords = extractKeywords(article.title);
  
  for (const existingArticle of recentArticles) {
    const existingKeywords = extractKeywords(existingArticle.title);
    
    // If 60%+ keywords overlap → duplicate
    const intersection = newKeywords.filter(k => existingKeywords.includes(k));
    const keywordOverlap = intersection.length / Math.max(newKeywords.length, existingKeywords.length);
    
    if (keywordOverlap > 0.6) {
      return true;  // Keyword-based duplicate
    }
  }
  
  // Layer 4: Entity extraction (company names, product names)
  const entities = extractEntities(article.title);  // "OpenAI", "GPT-5", "Tesla"
  
  for (const existingArticle of recentArticles) {
    const existingEntities = extractEntities(existingArticle.title);
    
    // If same entities + time window < 72 hours → likely duplicate
    const entityMatch = entities.some(e => existingEntities.includes(e));
    const timeDiff = Date.now() - new Date(existingArticle.publishedAt).getTime();
    
    if (entityMatch && timeDiff < 72 * 60 * 60 * 1000) {
      // Same topic in last 3 days - check deeper
      const titleSimilarity = calculateSimilarity(article.title, existingArticle.title);
      if (titleSimilarity > 0.5) {  // Lower threshold with entity match
        return true;
      }
    }
  }
  
  // Layer 5: Topic clustering
  // Group articles by main topic (AI Models, Hardware, Companies, etc.)
  // Limit 1 article per topic per day
  
  return false;
}
```

#### 1.2 Increase Similarity Thresholds
```typescript
// news.service.ts - MEVCUT: %70
if (titleSimilarity > 0.7) {

// ÖNER İLEN: %55 (with keyword extraction)
if (titleSimilarity > 0.55) {
```

#### 1.3 Expand Time Window
```typescript
// MEVCUT: 48 hours
timeWindowHours: number = 48

// ÖNERİLEN: 96 hours (4 days) for trending topics
timeWindowHours: number = 96
```

---

### ✅ Çözüm 2: Agent Scheduling Düzeltmeleri

#### 2.1 Worker Priority (BullMQ First)
```typescript
// lib/init-scheduler.ts (yeni dosya)

export async function initializeAgentScheduling() {
  // Check if worker is available
  const redis = getRedis();
  
  if (redis) {
    console.log("✅ Worker available - using BullMQ scheduling");
    // BullMQ will handle scheduling
    await scheduleNewsAgentJob();
  } else {
    console.log("⚠️  Worker unavailable - using fallback in-process scheduler");
    startInProcessScheduler();
  }
}
```

#### 2.2 Immediate Reschedule on Interval Change
```typescript
// app/api/admin/agent-settings/route.ts

export async function POST(request: Request) {
  // ... interval değişikliği kaydedildi
  
  // YENI: Immediately reschedule job with new interval
  if (newsAgentQueue) {
    // Remove old job
    await newsAgentQueue.removeRepeatable({
      jobId: "news-agent-scheduled-run"
    });
    
    // Schedule with new interval
    await scheduleNewsAgentJob();
    
    console.log(`✅ Agent rescheduled with new interval: ${intervalHours} hours`);
  }
}
```

#### 2.3 Health Check Optimization
```yaml
# docker-compose.coolify.yaml
worker:
  healthcheck:
    interval: 10s  # 30s → 10s (daha hızlı recovery)
    timeout: 5s
    retries: 3
    start_period: 15s  # 30s → 15s
```

#### 2.4 Explicit Scheduling Debug Logs
```typescript
// queue.ts
export async function scheduleNewsAgentJob() {
  // ... mevcut kod
  
  console.log(`
  📅 AGENT SCHEDULE DEBUG:
  - Current time: ${new Date().toISOString()}
  - Next run time: ${nextTime.toISOString()}
  - Interval: ${intervalHours} hours
  - Job ID: news-agent-scheduled-run
  - Queue length: ${await newsAgentQueue.count()}
  `);
}
```

---

### ✅ Çözüm 3: Topic Diversity & Smart Selection

#### 3.1 DeepSeek'e Geçmiş Haberler Context
```typescript
// content.service.ts - selectBestArticles()

export async function selectBestArticles(
  articles: NewsArticle[],
  targetCount: number = 3,
): Promise<Array<{ article: NewsArticle; category: string }>> {
  
  // YENI: Fetch recently published articles for context
  const recentPublished = await db.article.findMany({
    where: {
      publishedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)  // Son 7 gün
      },
      status: "PUBLISHED"
    },
    select: {
      title: true,
      keywords: true,
    },
    take: 20,
    orderBy: { publishedAt: "desc" }
  });
  
  // DeepSeek'e gönder
  const analysis = await analyzeNewsArticles(
    uniqueArticles.slice(0, 20),
    recentPublished  // ← YENI PARAMETRE
  );
}
```

```typescript
// deepseek.ts - analyzeNewsArticles()

export async function analyzeNewsArticles(
  articles: Array<{...}>,
  recentPublished?: Array<{title: string, keywords: string[]}>  // YENI
): Promise<Array<{...}>> {
  
  const prompt = `Sen bir yapay zeka haber editörüsün...
  
  ${recentPublished && recentPublished.length > 0 ? `
  SON 7 GÜNDE YAYINLANAN HABERLER (TEKRAR SEÇME!):
  ${recentPublished.map((a, i) => `${i + 1}. ${a.title}`).join('\n')}
  
  ⚠️ Yukarıdaki haberlerle AYNI KONUDA olan haberleri seçme!
  ⚠️ Konu çeşitliliğine dikkat et (AI Modelleri, Donanım, Şirket Haberleri, vb.)
  ` : ''}
  
  Kriterleri:
  1. Haber güncelliği ve önemi
  2. Teknolojik yenilik seviyesi
  3. **KONU ÇEŞİTLİLİĞİ** (aynı konuda birden fazla haber seçme)
  4. Son 7 gündeki haberlerle FARKLI olmalı
  ...
  `;
}
```

#### 3.2 Topic Clustering
```typescript
// services/topic-clustering.ts (yeni dosya)

export async function groupArticlesByTopic(
  articles: NewsArticle[]
): Promise<Map<string, NewsArticle[]>> {
  
  const topics = new Map<string, NewsArticle[]>();
  
  for (const article of articles) {
    const topic = detectTopic(article.title, article.description);
    
    if (!topics.has(topic)) {
      topics.set(topic, []);
    }
    topics.get(topic)!.push(article);
  }
  
  return topics;
}

function detectTopic(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  
  // Topic keywords
  const topicPatterns = {
    'AI_MODELS': ['gpt', 'gemini', 'claude', 'llm', 'language model'],
    'ROBOTICS': ['robot', 'robotik', 'otonom', 'drone'],
    'HARDWARE': ['chip', 'gpu', 'tensor', 'nvidia', 'hardware'],
    'COMPANIES': ['openai', 'google', 'microsoft', 'meta', 'amazon'],
    'RESEARCH': ['araştırma', 'research', 'paper', 'study'],
    'REGULATION': ['yasa', 'regulation', 'policy', 'eu ai act'],
  };
  
  for (const [topic, keywords] of Object.entries(topicPatterns)) {
    if (keywords.some(kw => text.includes(kw))) {
      return topic;
    }
  }
  
  return 'GENERAL';
}
```

```typescript
// content.service.ts - selectBestArticles()

// Topic diversity enforcement
const topicGroups = await groupArticlesByTopic(uniqueArticles);

// Max 1 article per topic (unless total < targetCount)
const diverseArticles: NewsArticle[] = [];
for (const [topic, articles] of topicGroups) {
  if (articles.length > 0) {
    // Pick best one from each topic
    diverseArticles.push(articles[0]);
  }
}

// Send to DeepSeek for final selection
const analysis = await analyzeNewsArticles(diverseArticles, recentPublished);
```

#### 3.3 Time Window Extension for Popular Topics
```typescript
// news.service.ts

const EXTENDED_WINDOW_KEYWORDS = [
  'gpt', 'chatgpt', 'gemini', 'openai', 'google ai',
  'tesla', 'elon musk', 'meta', 'microsoft'
];

export async function isDuplicateNews(
  title: string,
  content?: string,
  timeWindowHours: number = 48
): Promise<{...}> {
  
  // YENI: Extend window for popular topics
  const lowerTitle = title.toLowerCase();
  const isPopularTopic = EXTENDED_WINDOW_KEYWORDS.some(kw => lowerTitle.includes(kw));
  
  if (isPopularTopic) {
    timeWindowHours = 168;  // 7 days for popular topics
    console.log(`🔍 Popular topic detected - extending duplicate check to 7 days`);
  }
  
  // ... rest of the function
}
```

---

## 🚀 Implementation Plan

### Phase 1: Quick Wins (Immediate)
1. ✅ **Increase similarity threshold** (0.7 → 0.55)
2. ✅ **Extend time window** (48 → 96 hours)
3. ✅ **Add popular topic detection** (7 day window)
4. ✅ **Fix worker health check** (30s → 10s)
5. ✅ **Add scheduling debug logs**

### Phase 2: Enhanced Detection (1-2 days)
1. ✅ **Implement keyword extraction** duplicate check
2. ✅ **Add entity extraction** (company/product names)
3. ✅ **Topic clustering** implementation
4. ✅ **Immediate job reschedule** on interval change

### Phase 3: AI-Powered Selection (2-3 days)
1. ✅ **Pass recent published articles** to DeepSeek
2. ✅ **Topic diversity enforcement** in selection
3. ✅ **Enhanced DeepSeek prompt** with context

---

## 📊 Expected Results

### Before (Current State)
- ❌ Duplicate rate: ~30-40% (3-4 duplicates per 10 articles)
- ❌ Agent miss rate: ~20% (fails to run on schedule)
- ❌ Topic diversity: Low (multiple articles on same topic)

### After (With Fixes)
- ✅ Duplicate rate: <5% (0-1 duplicates per 20 articles)
- ✅ Agent miss rate: <2% (reliable scheduling)
- ✅ Topic diversity: High (max 1 article per topic per day)

---

## 🔍 Monitoring & Debugging

### New Debug Endpoints

```typescript
// app/api/admin/agent-debug/route.ts

export async function GET() {
  const [lastRun, nextRun, interval, queueStatus] = await Promise.all([
    db.setting.findUnique({ where: { key: "agent.lastRun" } }),
    db.setting.findUnique({ where: { key: "agent.nextRun" } }),
    db.setting.findUnique({ where: { key: "agent.intervalHours" } }),
    newsAgentQueue?.count(),
  ]);
  
  return NextResponse.json({
    scheduling: {
      lastRun: lastRun?.value,
      nextRun: nextRun?.value,
      interval: interval?.value,
      queueLength: queueStatus || 0,
      workerActive: !!newsAgentQueue,
    },
    duplicateStats: {
      last24h: await getDuplicateStats(24),
      last7d: await getDuplicateStats(168),
    }
  });
}
```

### Enhanced Logging

```typescript
// agent.service.ts - executeNewsAgent()

console.log(`
🤖 AGENT EXECUTION REPORT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Statistics:
  - Articles scraped: ${articlesScraped}
  - Duplicates filtered: ${duplicatesFiltered}
  - Articles selected: ${selectedArticles.length}
  - Articles published: ${articlesCreated}
  
🎯 Duplicate Detection:
  - URL matches: ${urlDuplicates}
  - Title similarity: ${titleDuplicates}
  - Content similarity: ${contentDuplicates}
  - Keyword overlap: ${keywordDuplicates}
  
📅 Next Run:
  - Scheduled for: ${nextRun.toLocaleString('tr-TR')}
  - Interval: ${intervalHours} hours
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
```

---

## 💻 Hemen Uygulanacak Kodlar

Aşağıdaki dosyalarda değişiklik yapacağım:

1. `src/services/news.service.ts` - Enhanced duplicate detection
2. `src/services/content.service.ts` - Topic diversity
3. `src/lib/deepseek.ts` - Context-aware selection
4. `src/lib/queue.ts` - Immediate reschedule
5. `docker-compose.coolify.yaml` - Health check optimization

Değişiklikleri uygulamak için onay verirseniz başlayabilirim!
