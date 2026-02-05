-- Google Indexing Tracking Migration - ROLLBACK
-- Oluşturulma Tarihi: 2025-01-01
-- Açıklama: Migration'ı geri almak için rollback script

-- ============================================================================
-- UYARI: Bu script migration'ı tamamen geri alır!
-- ============================================================================
-- Çalıştırmadan önce:
-- 1. Veritabanı yedeği alın
-- 2. Aktif batch işlemlerinin tamamlanmasını bekleyin
-- 3. Production'da dikkatli kullanın
-- ============================================================================

-- ============================================================================
-- STEP 1: Article Tablosundan Yeni Field'ları Kaldır
-- ============================================================================

-- IndexNow tracking fields
ALTER TABLE "Article" DROP COLUMN IF EXISTS "indexNowSubmittedAt";
ALTER TABLE "Article" DROP COLUMN IF EXISTS "indexNowRetryCount";
ALTER TABLE "Article" DROP COLUMN IF EXISTS "indexNowNextRetryAt";
ALTER TABLE "Article" DROP COLUMN IF EXISTS "indexNowLastError";

-- Google Indexing tracking fields
ALTER TABLE "Article" DROP COLUMN IF EXISTS "googleIndexRetryCount";
ALTER TABLE "Article" DROP COLUMN IF EXISTS "googleIndexNextRetryAt";
ALTER TABLE "Article" DROP COLUMN IF EXISTS "googleIndexLastError";
ALTER TABLE "Article" DROP COLUMN IF EXISTS "googleIndexBatchId";

-- ============================================================================
-- STEP 2: Index'leri Kaldır
-- ============================================================================

-- Article indexes
DROP INDEX IF EXISTS "Article_indexNowStatus_indexNowNextRetryAt_idx";
DROP INDEX IF EXISTS "Article_googleIndexStatus_googleIndexNextRetryAt_idx";
DROP INDEX IF EXISTS "Article_googleIndexBatchId_idx";

-- IndexingHistory indexes
DROP INDEX IF EXISTS "IndexingHistory_articleId_idx";
DROP INDEX IF EXISTS "IndexingHistory_batchId_idx";
DROP INDEX IF EXISTS "IndexingHistory_indexType_idx";
DROP INDEX IF EXISTS "IndexingHistory_status_idx";
DROP INDEX IF EXISTS "IndexingHistory_submittedAt_idx";
DROP INDEX IF EXISTS "IndexingHistory_articleId_indexType_submittedAt_idx";
DROP INDEX IF EXISTS "IndexingHistory_status_submittedAt_idx";

-- GoogleIndexingBatch indexes
DROP INDEX IF EXISTS "GoogleIndexingBatch_status_idx";
DROP INDEX IF EXISTS "GoogleIndexingBatch_batchType_idx";
DROP INDEX IF EXISTS "GoogleIndexingBatch_language_idx";
DROP INDEX IF EXISTS "GoogleIndexingBatch_scheduledAt_idx";
DROP INDEX IF EXISTS "GoogleIndexingBatch_startedAt_idx";
DROP INDEX IF EXISTS "GoogleIndexingBatch_completedAt_idx";
DROP INDEX IF EXISTS "GoogleIndexingBatch_status_scheduledAt_idx";
DROP INDEX IF EXISTS "GoogleIndexingBatch_createdBy_idx";

-- ============================================================================
-- STEP 3: Tabloları Kaldır
-- ============================================================================

-- IndexingHistory tablosunu kaldır (önce foreign key ilişkisi olan)
DROP TABLE IF EXISTS "IndexingHistory";

-- GoogleIndexingBatch tablosunu kaldır
DROP TABLE IF EXISTS "GoogleIndexingBatch";

-- ============================================================================
-- STEP 4: Enum'ları Kaldır
-- ============================================================================

-- NOT: PostgreSQL'de enum value kaldırma direkt desteklenmez
-- IndexStatus enum'undan yeni value'ları kaldırmak için enum'u yeniden oluşturmak gerekir

-- Önce mevcut enum'u yedekle
DO $$
BEGIN
  -- Geçici enum oluştur
  CREATE TYPE "IndexStatus_old" AS ENUM ('PENDING', 'SUBMITTED', 'FAILED');
  
  -- Article tablosundaki column'u geçici enum'a çevir
  ALTER TABLE "Article" 
    ALTER COLUMN "indexNowStatus" TYPE "IndexStatus_old" 
    USING "indexNowStatus"::text::"IndexStatus_old";
  
  ALTER TABLE "Article" 
    ALTER COLUMN "googleIndexStatus" TYPE "IndexStatus_old" 
    USING "googleIndexStatus"::text::"IndexStatus_old";
  
  -- Eski enum'u kaldır
  DROP TYPE IF EXISTS "IndexStatus";
  
  -- Yeni enum'u eski isimle oluştur
  CREATE TYPE "IndexStatus" AS ENUM ('PENDING', 'SUBMITTED', 'FAILED');
  
  -- Column'ları yeni enum'a çevir
  ALTER TABLE "Article" 
    ALTER COLUMN "indexNowStatus" TYPE "IndexStatus" 
    USING "indexNowStatus"::text::"IndexStatus";
  
  ALTER TABLE "Article" 
    ALTER COLUMN "googleIndexStatus" TYPE "IndexStatus" 
    USING "googleIndexStatus"::text::"IndexStatus";
  
  -- Geçici enum'u kaldır
  DROP TYPE IF EXISTS "IndexStatus_old";
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'IndexStatus enum rollback hatası: %', SQLERRM;
END $$;

-- Diğer enum'ları kaldır
DROP TYPE IF EXISTS "IndexAction";
DROP TYPE IF EXISTS "IndexType";
DROP TYPE IF EXISTS "BatchStatus";
DROP TYPE IF EXISTS "BatchType";

-- ============================================================================
-- STEP 5: Veri Temizliği (Optional)
-- ============================================================================

-- Eğer rollback öncesi veri temizliği yapmak isterseniz:
-- NOT: Bu adım tabloları kaldırmadan önce çalıştırılmalıdır

-- IndexingHistory kayıtlarını temizle
-- DELETE FROM "IndexingHistory" WHERE "createdAt" < NOW() - INTERVAL '30 days';

-- GoogleIndexingBatch kayıtlarını temizle
-- DELETE FROM "GoogleIndexingBatch" WHERE "status" = 'COMPLETED' AND "completedAt" < NOW() - INTERVAL '30 days';

-- ============================================================================
-- STEP 6: Verification
-- ============================================================================

-- Rollback sonrası kontrol sorguları
DO $$
BEGIN
  -- Tabloların kaldırıldığını kontrol et
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'GoogleIndexingBatch') THEN
    RAISE EXCEPTION 'GoogleIndexingBatch tablosu hala mevcut!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'IndexingHistory') THEN
    RAISE EXCEPTION 'IndexingHistory tablosu hala mevcut!';
  END IF;
  
  -- Enum'ların kaldırıldığını kontrol et
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BatchType') THEN
    RAISE EXCEPTION 'BatchType enum hala mevcut!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BatchStatus') THEN
    RAISE EXCEPTION 'BatchStatus enum hala mevcut!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IndexType') THEN
    RAISE EXCEPTION 'IndexType enum hala mevcut!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IndexAction') THEN
    RAISE EXCEPTION 'IndexAction enum hala mevcut!';
  END IF;
  
  -- Article column'larının kaldırıldığını kontrol et
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Article' 
    AND column_name IN (
      'indexNowSubmittedAt',
      'indexNowRetryCount',
      'indexNowNextRetryAt',
      'indexNowLastError',
      'googleIndexRetryCount',
      'googleIndexNextRetryAt',
      'googleIndexLastError',
      'googleIndexBatchId'
    )
  ) THEN
    RAISE EXCEPTION 'Article tablosunda hala migration column ları mevcut!';
  END IF;
  
  RAISE NOTICE 'Rollback başarıyla tamamlandı!';
END $$;

-- ============================================================================
-- STEP 7: Post-Rollback Notları
-- ============================================================================

-- Rollback sonrası yapılması gerekenler:
-- 1. Prisma schema dosyasını eski haline getirin
-- 2. Prisma client'ı yeniden generate edin: npx prisma generate
-- 3. Uygulama kodundaki Google Indexing referanslarını kaldırın
-- 4. Cache'leri temizleyin
-- 5. Uygulamayı yeniden başlatın

-- Veri kaybı riski:
-- - GoogleIndexingBatch tablosundaki tüm batch kayıtları silinecek
-- - IndexingHistory tablosundaki tüm geçmiş kayıtları silinecek
-- - Article tablosundaki retry count ve timestamp bilgileri silinecek
-- - Bu veriler geri getirilemez, mutlaka yedek alın!
