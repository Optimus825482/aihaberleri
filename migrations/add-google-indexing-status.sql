-- ============================================================================
-- Google Indexing Status Migration
-- ============================================================================
-- Bu migration Google Indexing API durumunu takip etmek için yeni field'lar ekler
-- 
-- Tarih: 2026-02-05
-- Amaç: IndexNow ve Google Indexing API durumlarını ayrı ayrı takip etmek
-- ============================================================================

-- 1. Google Indexing Status field'ı ekle (IndexNow'dan bağımsız)
ALTER TABLE "Article" 
ADD COLUMN IF NOT EXISTS "googleIndexStatus" TEXT DEFAULT 'PENDING';

-- 2. Google Indexing timestamp field'ı ekle
ALTER TABLE "Article" 
ADD COLUMN IF NOT EXISTS "googleIndexedAt" TIMESTAMP(3);

-- 3. Mevcut verileri güncelle (opsiyonel - tüm mevcut haberleri PENDING yap)
-- Bu adım opsiyoneldir, çünkü yeni field'lar zaten PENDING default değerine sahip
UPDATE "Article" 
SET "googleIndexStatus" = 'PENDING' 
WHERE "googleIndexStatus" IS NULL;

-- 4. Index'leri ekle (performans için)
CREATE INDEX IF NOT EXISTS "Article_googleIndexStatus_idx" 
ON "Article"("googleIndexStatus");

CREATE INDEX IF NOT EXISTS "Article_googleIndexedAt_idx" 
ON "Article"("googleIndexedAt");

-- 5. Composite index (Google status + published date için)
CREATE INDEX IF NOT EXISTS "Article_googleIndexStatus_publishedAt_idx" 
ON "Article"("googleIndexStatus", "publishedAt");

-- ============================================================================
-- Verification Queries (Migration sonrası kontrol için)
-- ============================================================================

-- Yeni field'ların eklendiğini kontrol et:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'Article' 
-- AND column_name IN ('googleIndexStatus', 'googleIndexedAt');

-- Index'lerin oluşturulduğunu kontrol et:
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'Article' 
-- AND indexname LIKE '%google%';

-- Mevcut durumu kontrol et:
-- SELECT 
--   "googleIndexStatus", 
--   COUNT(*) as count 
-- FROM "Article" 
-- GROUP BY "googleIndexStatus";

-- ============================================================================
-- Rollback (Geri alma) - Sadece gerekirse kullan!
-- ============================================================================

-- UYARI: Bu komutları çalıştırmadan önce backup aldığınızdan emin olun!

-- DROP INDEX IF EXISTS "Article_googleIndexStatus_publishedAt_idx";
-- DROP INDEX IF EXISTS "Article_googleIndexedAt_idx";
-- DROP INDEX IF EXISTS "Article_googleIndexStatus_idx";
-- ALTER TABLE "Article" DROP COLUMN IF EXISTS "googleIndexedAt";
-- ALTER TABLE "Article" DROP COLUMN IF EXISTS "googleIndexStatus";

-- ============================================================================
-- Migration Tamamlandı
-- ============================================================================
