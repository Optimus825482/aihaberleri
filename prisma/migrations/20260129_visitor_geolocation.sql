-- ============================================
-- Visitor Geolocation Enhancement
-- Phase 5 Addition: IP-based location tracking
-- ============================================

-- 1. Visitor tablosuna geolocation kolonları ekle
ALTER TABLE "Visitor" 
ADD COLUMN IF NOT EXISTS "isp" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "provider" VARCHAR(50);

-- 2. Performance için indeksler ekle
CREATE INDEX IF NOT EXISTS "idx_visitor_country" 
ON "Visitor"("country") 
WHERE "country" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_visitor_city" 
ON "Visitor"("city") 
WHERE "city" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_visitor_coordinates" 
ON "Visitor"("latitude", "longitude") 
WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;

-- 3. Provider performance tracking için
CREATE INDEX IF NOT EXISTS "idx_visitor_provider" 
ON "Visitor"("provider") 
WHERE "provider" IS NOT NULL;

-- ============================================
-- Verification Query
-- ============================================
-- Aşağıdaki sorguyla yeni kolonları doğrulayın:

/*
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'Visitor' 
AND column_name IN ('isp', 'latitude', 'longitude', 'timezone', 'provider');

-- Provider distribution (hangi provider ne kadar kullanıldı)
SELECT 
    provider,
    COUNT(*) as count,
    COUNT(DISTINCT "ipAddress") as unique_ips
FROM "Visitor"
WHERE provider IS NOT NULL
GROUP BY provider
ORDER BY count DESC;
*/

-- ============================================
-- Rollback Script (Sadece acil durum için!)
-- ============================================

/*
-- İndeksleri sil
DROP INDEX IF EXISTS "idx_visitor_provider";
DROP INDEX IF EXISTS "idx_visitor_coordinates";
DROP INDEX IF EXISTS "idx_visitor_city";
DROP INDEX IF EXISTS "idx_visitor_country";

-- Kolonları sil
ALTER TABLE "Visitor" 
DROP COLUMN IF EXISTS "provider",
DROP COLUMN IF EXISTS "timezone",
DROP COLUMN IF EXISTS "longitude",
DROP COLUMN IF EXISTS "latitude",
DROP COLUMN IF EXISTS "isp";
*/
