-- İngilizce versiyonların indexing takibi için yeni kolonlar

-- IndexNow English tracking
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "indexNowStatusEn" TEXT DEFAULT 'PENDING';
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "indexedAtEn" TIMESTAMP(3);

-- Google English tracking  
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "googleIndexStatusEn" TEXT DEFAULT 'PENDING';
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "googleIndexedAtEn" TIMESTAMP(3);

-- Facebook English tracking (opsiyonel - şimdilik kullanmıyoruz)
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "facebookSharedEn" BOOLEAN DEFAULT false;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "Article_indexNowStatusEn_idx" ON "Article"("indexNowStatusEn");
CREATE INDEX IF NOT EXISTS "Article_googleIndexStatusEn_idx" ON "Article"("googleIndexStatusEn");
CREATE INDEX IF NOT EXISTS "Article_indexedAtEn_idx" ON "Article"("indexedAtEn");
CREATE INDEX IF NOT EXISTS "Article_googleIndexedAtEn_idx" ON "Article"("googleIndexedAtEn");

-- Composite indexes for filtering
CREATE INDEX IF NOT EXISTS "Article_status_googleIndexStatus_idx" ON "Article"("status", "googleIndexStatus");
CREATE INDEX IF NOT EXISTS "Article_status_googleIndexStatusEn_idx" ON "Article"("status", "googleIndexStatusEn");
