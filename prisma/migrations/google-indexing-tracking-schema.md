# Google Indexing Tracking - Database Schema Tasarımı

## 📊 Genel Bakış

Bu dokümantasyon, Google Indexing API entegrasyonu için gerekli database schema değişikliklerini içerir.

---

## 🎯 Gereksinimler

1. **indexNowStatus Field**: Article tablosuna eklenecek (✅ Mevcut)
2. **Batch Tracking**: Toplu gönderim takibi için yeni tablo
3. **Retry Logic**: Başarısız gönderimler için retry counter
4. **Timestamp Tracking**: Son gönderim zamanı, sonraki gönderim zamanı
5. **Language Support**: Türkçe ve İngilizce versiyonlar için ayrı tracking

---

## 📋 Schema Değişiklikleri

### 1. Article Tablosu - Yeni Field'lar

```prisma
model Article {
  // ... mevcut field'lar ...

  // Google Indexing API Tracking
  indexNowStatus         IndexStatus          @default(PENDING)
  indexNowSubmittedAt    DateTime?            // IndexNow API'ye gönderim zamanı
  indexNowRetryCount     Int                  @default(0)
  indexNowNextRetryAt    DateTime?            // Sonraki retry zamanı
  indexNowLastError      String?              // Son hata mesajı

  googleIndexStatus      IndexStatus          @default(PENDING)
  googleIndexedAt        DateTime?            // Google Indexing API notification zamanı
  googleIndexRetryCount  Int                  @default(0)
  googleIndexNextRetryAt DateTime?            // Sonraki retry zamanı
  googleIndexLastError   String?              // Son hata mesajı
  googleIndexBatchId     String?              // Hangi batch'e ait

  // İlişkiler
  googleIndexBatch       GoogleIndexingBatch? @relation(fields: [googleIndexBatchId], references: [id])
  indexingHistory        IndexingHistory[]

  // Yeni index'ler
  @@index([indexNowStatus, indexNowNextRetryAt])
  @@index([googleIndexStatus, googleIndexNextRetryAt])
  @@index([googleIndexBatchId])
}
```

### 2. IndexStatus Enum - Genişletilmiş

```prisma
enum IndexStatus {
  PENDING       // Henüz gönderilmedi
  SUBMITTED     // API'ye gönderildi, yanıt bekleniyor
  SUCCESS       // Başarıyla index'lendi
  FAILED        // Başarısız oldu
  SCHEDULED     // Retry için zamanlandı
  RATE_LIMITED  // Rate limit nedeniyle bekliyor
  SKIPPED       // Atlandı (duplicate, low quality, etc.)
}
```

### 3. GoogleIndexingBatch Tablosu - YENİ

```prisma
model GoogleIndexingBatch {
  id                String              @id @default(cuid())

  // Batch Bilgileri
  batchType         BatchType           @default(MANUAL)
  status            BatchStatus         @default(PENDING)
  language          String              // "tr" | "en" | "both"

  // İstatistikler
  totalArticles     Int                 @default(0)
  submittedCount    Int                 @default(0)
  successCount      Int                 @default(0)
  failedCount       Int                 @default(0)
  skippedCount      Int                 @default(0)

  // Timing
  scheduledAt       DateTime?           // Zamanlanmış batch için
  startedAt         DateTime?           // Batch başlangıç zamanı
  completedAt       DateTime?           // Batch tamamlanma zamanı
  estimatedDuration Int?                // Tahmini süre (saniye)
  actualDuration    Int?                // Gerçek süre (saniye)

  // Rate Limiting
  rateLimitHit      Boolean             @default(false)
  rateLimitResetAt  DateTime?           // Rate limit reset zamanı
  requestsPerMinute Int                 @default(0)

  // Hata Yönetimi
  errors            Json?               // Detaylı hata listesi
  retryCount        Int                 @default(0)
  maxRetries        Int                 @default(3)
  nextRetryAt       DateTime?

  // Metadata
  metadata          Json?               // Ek bilgiler (filters, criteria, etc.)
  createdBy         String?             // Batch'i oluşturan user

  // Timestamps
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  // İlişkiler
  articles          Article[]
  history           IndexingHistory[]

  // Index'ler
  @@index([status])
  @@index([batchType])
  @@index([language])
  @@index([scheduledAt])
  @@index([startedAt])
  @@index([completedAt])
  @@index([status, scheduledAt])
  @@index([createdBy])
}
```

### 4. BatchType Enum - YENİ

```prisma
enum BatchType {
  MANUAL        // Manuel tetiklenen batch
  SCHEDULED     // Zamanlanmış otomatik batch
  AUTO_PUBLISH  // Makale yayınlandığında otomatik
  RETRY         // Başarısız olanların retry'ı
  BULK_UPDATE   // Toplu güncelleme
}
```

### 5. BatchStatus Enum - YENİ

```prisma
enum BatchStatus {
  PENDING       // Bekliyor
  QUEUED        // Kuyruğa alındı
  PROCESSING    // İşleniyor
  COMPLETED     // Tamamlandı
  FAILED        // Başarısız
  CANCELLED     // İptal edildi
  PAUSED        // Duraklatıldı
}
```

### 6. IndexingHistory Tablosu - YENİ

```prisma
model IndexingHistory {
  id              String              @id @default(cuid())

  // İlişkiler
  articleId       String
  batchId         String?

  // Indexing Detayları
  indexType       IndexType           // "indexnow" | "google"
  action          IndexAction         // "submit" | "update" | "remove"
  status          IndexStatus

  // Request/Response
  requestUrl      String?             // Gönderilen URL
  requestPayload  Json?               // Request body
  responseStatus  Int?                // HTTP status code
  responseBody    Json?               // Response body

  // Timing
  submittedAt     DateTime            @default(now())
  respondedAt     DateTime?
  duration        Int?                // Milliseconds

  // Hata Detayları
  errorCode       String?
  errorMessage    String?
  errorDetails    Json?

  // Retry Bilgileri
  retryAttempt    Int                 @default(0)
  isRetry         Boolean             @default(false)
  originalId      String?             // İlk denemenin ID'si

  // Metadata
  userAgent       String?
  ipAddress       String?
  metadata        Json?

  // İlişkiler
  article         Article             @relation(fields: [articleId], references: [id], onDelete: Cascade)
  batch           GoogleIndexingBatch? @relation(fields: [batchId], references: [id])

  // Index'ler
  @@index([articleId])
  @@index([batchId])
  @@index([indexType])
  @@index([status])
  @@index([submittedAt(sort: Desc)])
  @@index([articleId, indexType, submittedAt])
  @@index([status, submittedAt])
}
```

### 7. IndexType Enum - YENİ

```prisma
enum IndexType {
  INDEXNOW  // IndexNow API
  GOOGLE    // Google Indexing API
}
```

### 8. IndexAction Enum - YENİ

```prisma
enum IndexAction {
  SUBMIT    // Yeni URL gönderimi
  UPDATE    // Mevcut URL güncelleme
  REMOVE    // URL kaldırma
}
```

---

## 🔍 Index Stratejisi

### Performans Optimizasyonu

1. **Composite Index'ler**:
   - `[status, scheduledAt]`: Zamanlanmış batch'leri hızlı bulmak için
   - `[articleId, indexType, submittedAt]`: Makale bazlı history sorguları için
   - `[status, submittedAt]`: Başarısız/pending kayıtları bulmak için

2. **Single Column Index'ler**:
   - `status`: Batch ve history filtreleme için
   - `indexType`: IndexNow vs Google ayrımı için
   - `submittedAt`: Zaman bazlı sorgular için

3. **Foreign Key Index'leri**:
   - `articleId`: Article ilişkisi için
   - `batchId`: Batch ilişkisi için
   - `googleIndexBatchId`: Article-Batch ilişkisi için

---

## 📊 Query Örnekleri

### 1. Retry Bekleyen Makaleleri Bul

```typescript
const articlesToRetry = await prisma.article.findMany({
  where: {
    googleIndexStatus: "FAILED",
    googleIndexRetryCount: { lt: 3 },
    googleIndexNextRetryAt: { lte: new Date() },
  },
  orderBy: { googleIndexNextRetryAt: "asc" },
  take: 100,
});
```

### 2. Aktif Batch'leri İzle

```typescript
const activeBatches = await prisma.googleIndexingBatch.findMany({
  where: {
    status: { in: ["PROCESSING", "QUEUED"] },
  },
  include: {
    _count: {
      select: { articles: true },
    },
  },
  orderBy: { startedAt: "desc" },
});
```

### 3. Makale Indexing Geçmişi

```typescript
const history = await prisma.indexingHistory.findMany({
  where: { articleId: "article-id" },
  orderBy: { submittedAt: "desc" },
  include: {
    batch: {
      select: { id: true, batchType: true, status: true },
    },
  },
});
```

### 4. Başarı Oranı Analizi

```typescript
const stats = await prisma.googleIndexingBatch.aggregate({
  where: {
    status: "COMPLETED",
    createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  },
  _avg: {
    successCount: true,
    failedCount: true,
    actualDuration: true,
  },
  _sum: {
    totalArticles: true,
    successCount: true,
    failedCount: true,
  },
});
```

---

## 🔄 Retry Logic Stratejisi

### Exponential Backoff

```typescript
function calculateNextRetry(retryCount: number): Date {
  // 1st retry: 5 minutes
  // 2nd retry: 15 minutes
  // 3rd retry: 1 hour
  const delays = [5, 15, 60]; // minutes
  const delayMinutes = delays[Math.min(retryCount, delays.length - 1)];
  return new Date(Date.now() + delayMinutes * 60 * 1000);
}
```

### Rate Limiting

```typescript
const RATE_LIMITS = {
  indexnow: {
    requestsPerMinute: 60,
    requestsPerDay: 10000,
  },
  google: {
    requestsPerMinute: 200,
    requestsPerDay: 200,
  },
};
```

---

## 📈 Monitoring & Analytics

### Dashboard Metrikleri

1. **Batch Performance**:
   - Toplam batch sayısı
   - Başarı oranı (%)
   - Ortalama işlem süresi
   - Rate limit hit oranı

2. **Article Status**:
   - Pending: X makaleler
   - Success: Y makaleler
   - Failed: Z makaleler
   - Retry scheduled: W makaleler

3. **Language Distribution**:
   - Türkçe: X makaleler
   - İngilizce: Y makaleler
   - Her ikisi: Z makaleler

---

## 🚨 Hata Yönetimi

### Hata Kategorileri

```typescript
enum ErrorCategory {
  RATE_LIMIT = "rate_limit",
  INVALID_URL = "invalid_url",
  NETWORK_ERROR = "network_error",
  AUTH_ERROR = "auth_error",
  SERVER_ERROR = "server_error",
  UNKNOWN = "unknown",
}
```

### Hata Loglama

```typescript
await prisma.indexingHistory.create({
  data: {
    articleId: article.id,
    batchId: batch.id,
    indexType: "GOOGLE",
    action: "SUBMIT",
    status: "FAILED",
    errorCode: "RATE_LIMIT_EXCEEDED",
    errorMessage: "Too many requests",
    errorDetails: {
      category: "rate_limit",
      retryAfter: 60,
      requestsRemaining: 0,
    },
    retryAttempt: article.googleIndexRetryCount,
    submittedAt: new Date(),
  },
});
```

---

## 🎯 Best Practices

1. **Batch Size**: 50-100 makale per batch (rate limit'e göre ayarla)
2. **Retry Strategy**: Maximum 3 retry, exponential backoff
3. **Language Handling**: Türkçe ve İngilizce için ayrı batch'ler
4. **Error Logging**: Her request için detaylı log tut
5. **Monitoring**: Real-time dashboard ile batch progress izle
6. **Cleanup**: 30 gün önceki history kayıtlarını arşivle

---

## 📝 Notlar

- `indexNowStatus` field'i zaten mevcut schema'da var
- `googleIndexStatus` field'i de mevcut
- Yeni eklenenler: retry logic, batch tracking, history
- Migration sırasında mevcut makalelerin status'ü korunacak
- Foreign key ilişkileri `relationMode = "prisma"` nedeniyle manuel yönetilecek
