-- ============================================
-- Search Provider Monitoring - Database Migration
-- ============================================
-- Tarih: 2026-02-03
-- Amaç: SearchProviderMetric tablosunu oluştur
-- ============================================

-- 1. SearchProviderMetric tablosunu oluştur
CREATE TABLE IF NOT EXISTS "SearchProviderMetric" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTime" DOUBLE PRECISION,
    "available" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SearchProviderMetric_pkey" PRIMARY KEY ("id")
);

-- 2. İndeksler oluştur (performans için)
CREATE INDEX IF NOT EXISTS "SearchProviderMetric_provider_timestamp_idx" 
    ON "SearchProviderMetric"("provider", "timestamp");

CREATE INDEX IF NOT EXISTS "SearchProviderMetric_timestamp_idx" 
    ON "SearchProviderMetric"("timestamp");

-- 3. Tablo oluşturuldu mu kontrol et
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'SearchProviderMetric'
    ) THEN
        RAISE NOTICE '✅ SearchProviderMetric tablosu başarıyla oluşturuldu';
    ELSE
        RAISE EXCEPTION '❌ SearchProviderMetric tablosu oluşturulamadı';
    END IF;
END $$;

-- 4. İndeksler oluşturuldu mu kontrol et
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM pg_indexes 
        WHERE tablename = 'SearchProviderMetric' 
        AND indexname = 'SearchProviderMetric_provider_timestamp_idx'
    ) THEN
        RAISE NOTICE '✅ Provider-Timestamp indeksi oluşturuldu';
    END IF;
    
    IF EXISTS (
        SELECT FROM pg_indexes 
        WHERE tablename = 'SearchProviderMetric' 
        AND indexname = 'SearchProviderMetric_timestamp_idx'
    ) THEN
        RAISE NOTICE '✅ Timestamp indeksi oluşturuldu';
    END IF;
END $$;

-- ============================================
-- OPSIYONEL: Test Verisi Ekle (İsteğe Bağlı)
-- ============================================
-- Aşağıdaki kısmı sadece test için kullanın
-- Production'da çalıştırmayın!

/*
-- Son 24 saat için test verisi
DO $$
DECLARE
    i INTEGER;
    test_timestamp TIMESTAMP;
BEGIN
    FOR i IN 0..23 LOOP
        test_timestamp := NOW() - (i || ' hours')::INTERVAL;
        
        -- Google News (primary provider - daha fazla request)
        INSERT INTO "SearchProviderMetric" (
            "id", 
            "provider", 
            "timestamp", 
            "requests", 
            "errors", 
            "avgResponseTime", 
            "available"
        ) VALUES (
            gen_random_uuid()::TEXT,
            'google-news',
            test_timestamp,
            FLOOR(RANDOM() * 50 + 20)::INTEGER,  -- 20-70 requests
            FLOOR(RANDOM() * 3)::INTEGER,         -- 0-2 errors
            RANDOM() * 300 + 50,                  -- 50-350ms
            RANDOM() > 0.05                       -- 95% available
        );
        
        -- Brave (fallback provider)
        INSERT INTO "SearchProviderMetric" (
            "id", 
            "provider", 
            "timestamp", 
            "requests", 
            "errors", 
            "avgResponseTime", 
            "available"
        ) VALUES (
            gen_random_uuid()::TEXT,
            'brave',
            test_timestamp,
            FLOOR(RANDOM() * 10 + 1)::INTEGER,    -- 1-10 requests
            FLOOR(RANDOM() * 2)::INTEGER,         -- 0-1 errors
            RANDOM() * 500 + 100,                 -- 100-600ms
            RANDOM() > 0.1                        -- 90% available
        );
        
        -- Tavily (fallback provider)
        INSERT INTO "SearchProviderMetric" (
            "id", 
            "provider", 
            "timestamp", 
            "requests", 
            "errors", 
            "avgResponseTime", 
            "available"
        ) VALUES (
            gen_random_uuid()::TEXT,
            'tavily',
            test_timestamp,
            FLOOR(RANDOM() * 10 + 1)::INTEGER,    -- 1-10 requests
            FLOOR(RANDOM() * 2)::INTEGER,         -- 0-1 errors
            RANDOM() * 500 + 100,                 -- 100-600ms
            RANDOM() > 0.1                        -- 90% available
        );
    END LOOP;
    
    RAISE NOTICE '✅ Test verisi eklendi (72 kayıt)';
END $$;
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Migration sonrası kontrol sorguları

-- Tablo yapısını kontrol et
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'SearchProviderMetric'
ORDER BY ordinal_position;

-- İndeksleri kontrol et
SELECT 
    indexname, 
    indexdef
FROM pg_indexes
WHERE tablename = 'SearchProviderMetric';

-- Kayıt sayısını kontrol et
SELECT 
    provider,
    COUNT(*) as record_count,
    MIN(timestamp) as oldest_record,
    MAX(timestamp) as newest_record
FROM "SearchProviderMetric"
GROUP BY provider;

-- ============================================
-- CLEANUP (Gerekirse)
-- ============================================
-- Tabloyu silmek için (DİKKAT: Tüm veriyi siler!)

/*
DROP TABLE IF EXISTS "SearchProviderMetric" CASCADE;
RAISE NOTICE '⚠️ SearchProviderMetric tablosu silindi';
*/

-- ============================================
-- MIGRATION TAMAMLANDI
-- ============================================
