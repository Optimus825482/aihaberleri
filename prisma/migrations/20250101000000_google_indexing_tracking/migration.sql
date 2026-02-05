-- Google Indexing Tracking Migration
-- Oluşturulma Tarihi: 2025-01-01
-- Açıklama: Google Indexing API entegrasyonu için batch tracking, retry logic ve history tabloları

-- ============================================================================
-- STEP 1: Yeni Enum'ları Oluştur
-- ============================================================================

-- BatchType enum
CREATE TYPE "BatchType" AS ENUM (
  'MANUAL',
  'SCHEDULED',
  'AUTO_PUBLISH',
  'RETRY',
  'BULK_UPDATE'
);

-- BatchStatus enum
CREATE TYPE "BatchStatus" AS ENUM (
  'PENDING',
  'QUEUED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'PAUSED'
);

-- IndexType enum
CREATE TYPE "IndexType" AS ENUM (
  'INDEXNOW',
  'GOOGLE'
);

-- IndexAction enum
CREATE TYPE "IndexAction" AS ENUM (
  'SUBMIT',
  'UPDATE',
  'REMOVE'
);

-- IndexStatus enum'unu genişlet
ALTER TYPE "IndexStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';
ALTER TYPE "IndexStatus" ADD VALUE IF NOT EXISTS 'RATE_LIMITED';
ALTER TYPE "IndexStatus" ADD VALUE IF NOT EXISTS 'SKIPPED';

-- ============================================================================
-- STEP 2: GoogleIndexingBatch Tablosunu Oluştur
-- ============================================================================

CREATE TABLE "GoogleIndexingBatch" (
  "id" TEXT NOT NULL,
  
  -- Batch Bilgileri
  "batchType" "BatchType" NOT NULL DEFAULT 'MANUAL',
  "status" "BatchStatus" NOT NULL DEFAULT 'PENDING',
  "language" TEXT NOT NULL,
  
  -- İstatistikler
  "totalArticles" INTEGER NOT NULL DEFAULT 0,
  "submittedCount" INTEGER NOT NULL DEFAULT 0,
  "successCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  
  -- Timing
  "scheduledAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "estimatedDuration" INTEGER,
  "actualDuration" INTEGER,
  
  -- Rate Limiting
  "rateLimitHit" BOOLEAN NOT NULL DEFAULT false,
  "rateLimitResetAt" TIMESTAMP(3),
  "requestsPerMinute" INTEGER NOT NULL DEFAULT 0,
  
  -- Hata Yönetimi
  "errors" JSONB,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "maxRetries" INTEGER NOT NULL DEFAULT 3,
  "nextRetryAt" TIMESTAMP(3),
  
  -- Metadata
  "metadata" JSONB,
  "createdBy" TEXT,
  
  -- Timestamps
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "GoogleIndexingBatch_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- STEP 3: IndexingHistory Tablosunu Oluştur
-- ============================================================================

CREATE TABLE "IndexingHistory" (
  "id" TEXT NOT NULL,
  
  -- İlişkiler
  "articleId" TEXT NOT NULL,
  "batchId" TEXT,
  
  -- Indexing Detayları
  "indexType" "IndexType" NOT NULL,
  "action" "IndexAction" NOT NULL,
  "status" "IndexStatus" NOT NULL,
  
  -- Request/Response
  "requestUrl" TEXT,
  "requestPayload" JSONB,
  "responseStatus" INTEGER,
  "responseBody" JSONB,
  
  -- Timing
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  "duration" INTEGER,
  
  -- Hata Detayları
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "errorDetails" JSONB,
  
  -- Retry Bilgileri
  "retryAttempt" INTEGER NOT NULL DEFAULT 0,
  "isRetry" BOOLEAN NOT NULL DEFAULT false,
  "originalId" TEXT,
  
  -- Metadata
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "metadata" JSONB,
  
  CONSTRAINT "IndexingHistory_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- STEP 4: Article Tablosuna Yeni Field'ları Ekle
-- ============================================================================

-- IndexNow tracking fields
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "indexNowSubmittedAt" TIMESTAMP(3);
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "indexNowRetryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "indexNowNextRetryAt" TIMESTAMP(3);
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "indexNowLastError" TEXT;

-- Google Indexing tracking fields
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "googleIndexRetryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "googleIndexNextRetryAt" TIMESTAMP(3);
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "googleIndexLastError" TEXT;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "googleIndexBatchId" TEXT;

-- ============================================================================
-- STEP 5: Index'leri Oluştur
-- ============================================================================

-- GoogleIndexingBatch indexes
CREATE INDEX "GoogleIndexingBatch_status_idx" ON "GoogleIndexingBatch"("status");
CREATE INDEX "GoogleIndexingBatch_batchType_idx" ON "GoogleIndexingBatch"("batchType");
CREATE INDEX "GoogleIndexingBatch_language_idx" ON "GoogleIndexingBatch"("language");
CREATE INDEX "GoogleIndexingBatch_scheduledAt_idx" ON "GoogleIndexingBatch"("scheduledAt");
CREATE INDEX "GoogleIndexingBatch_startedAt_idx" ON "GoogleIndexingBatch"("startedAt");
CREATE INDEX "GoogleIndexingBatch_completedAt_idx" ON "GoogleIndexingBatch"("completedAt");
CREATE INDEX "GoogleIndexingBatch_status_scheduledAt_idx" ON "GoogleIndexingBatch"("status", "scheduledAt");
CREATE INDEX "GoogleIndexingBatch_createdBy_idx" ON "GoogleIndexingBatch"("createdBy");

-- IndexingHistory indexes
CREATE INDEX "IndexingHistory_articleId_idx" ON "IndexingHistory"("articleId");
CREATE INDEX "IndexingHistory_batchId_idx" ON "IndexingHistory"("batchId");
CREATE INDEX "IndexingHistory_indexType_idx" ON "IndexingHistory"("indexType");
CREATE INDEX "IndexingHistory_status_idx" ON "IndexingHistory"("status");
CREATE INDEX "IndexingHistory_submittedAt_idx" ON "IndexingHistory"("submittedAt" DESC);
CREATE INDEX "IndexingHistory_articleId_indexType_submittedAt_idx" ON "IndexingHistory"("articleId", "indexType", "submittedAt");
CREATE INDEX "IndexingHistory_status_submittedAt_idx" ON "IndexingHistory"("status", "submittedAt");

-- Article yeni field indexes
CREATE INDEX "Article_indexNowStatus_indexNowNextRetryAt_idx" ON "Article"("indexNowStatus", "indexNowNextRetryAt");
CREATE INDEX "Article_googleIndexStatus_googleIndexNextRetryAt_idx" ON "Article"("googleIndexStatus", "googleIndexNextRetryAt");
CREATE INDEX "Article_googleIndexBatchId_idx" ON "Article"("googleIndexBatchId");

-- ============================================================================
-- STEP 6: Mevcut Verileri Güncelle (Optional)
-- ============================================================================

-- Mevcut PENDING makaleleri için retry count'u sıfırla
UPDATE "Article" 
SET 
  "indexNowRetryCount" = 0,
  "googleIndexRetryCount" = 0
WHERE 
  "indexNowStatus" = 'PENDING' 
  OR "googleIndexStatus" = 'PENDING';

-- Mevcut FAILED makaleleri için retry zamanı ayarla (5 dakika sonra)
UPDATE "Article" 
SET 
  "indexNowNextRetryAt" = NOW() + INTERVAL '5 minutes'
WHERE 
  "indexNowStatus" = 'FAILED' 
  AND "indexNowRetryCount" < 3;

UPDATE "Article" 
SET 
  "googleIndexNextRetryAt" = NOW() + INTERVAL '5 minutes'
WHERE 
  "googleIndexStatus" = 'FAILED' 
  AND "googleIndexRetryCount" < 3;

-- ============================================================================
-- STEP 7: Yorum ve Dokümantasyon
-- ============================================================================

COMMENT ON TABLE "GoogleIndexingBatch" IS 'Google Indexing API için batch işlem takibi';
COMMENT ON TABLE "IndexingHistory" IS 'Tüm indexing işlemlerinin detaylı geçmişi';

COMMENT ON COLUMN "GoogleIndexingBatch"."batchType" IS 'Batch tipi: MANUAL, SCHEDULED, AUTO_PUBLISH, RETRY, BULK_UPDATE';
COMMENT ON COLUMN "GoogleIndexingBatch"."status" IS 'Batch durumu: PENDING, QUEUED, PROCESSING, COMPLETED, FAILED, CANCELLED, PAUSED';
COMMENT ON COLUMN "GoogleIndexingBatch"."language" IS 'Dil: tr, en, both';
COMMENT ON COLUMN "GoogleIndexingBatch"."rateLimitHit" IS 'Rate limit ile karşılaşıldı mı?';
COMMENT ON COLUMN "GoogleIndexingBatch"."requestsPerMinute" IS 'Dakikada yapılan request sayısı';

COMMENT ON COLUMN "IndexingHistory"."indexType" IS 'Indexing tipi: INDEXNOW, GOOGLE';
COMMENT ON COLUMN "IndexingHistory"."action" IS 'İşlem tipi: SUBMIT, UPDATE, REMOVE';
COMMENT ON COLUMN "IndexingHistory"."retryAttempt" IS 'Kaçıncı deneme (0 = ilk deneme)';
COMMENT ON COLUMN "IndexingHistory"."isRetry" IS 'Bu bir retry mi?';
COMMENT ON COLUMN "IndexingHistory"."originalId" IS 'İlk denemenin ID si (retry ise)';

COMMENT ON COLUMN "Article"."indexNowRetryCount" IS 'IndexNow için retry sayısı (max 3)';
COMMENT ON COLUMN "Article"."indexNowNextRetryAt" IS 'IndexNow için sonraki retry zamanı';
COMMENT ON COLUMN "Article"."googleIndexRetryCount" IS 'Google Indexing için retry sayısı (max 3)';
COMMENT ON COLUMN "Article"."googleIndexNextRetryAt" IS 'Google Indexing için sonraki retry zamanı';
COMMENT ON COLUMN "Article"."googleIndexBatchId" IS 'Hangi batch e ait olduğu';
