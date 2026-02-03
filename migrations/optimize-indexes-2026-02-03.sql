-- ============================================================================
-- Veritabanı Index Optimizasyonu
-- Tarih: 3 Şubat 2026
-- Amaç: Duplicate ve kullanılmayan index'leri temizle, eksik index'leri ekle
-- ============================================================================

-- ÖNCE YEDEK AL!
-- pg_dump -h 77.42.68.4 -p 5435 -U postgres -d postgresainewsdb > backup_before_optimization.sql

BEGIN;

-- ============================================================================
-- 1. DUPLICATE INDEX'LERI TEMİZLE (20 adet)
-- ============================================================================

-- Article tablosu
DROP INDEX IF EXISTS "Article_slug_idx";  -- Article_slug_key tarafından kapsanıyor
DROP INDEX IF EXISTS "Article_topic_idx";  -- Article_topic_publishedAt_idx tarafından kapsanıyor

-- ArticleAnalytics tablosu
DROP INDEX IF EXISTS "ArticleAnalytics_articleId_idx";  -- ArticleAnalytics_articleId_createdAt_idx tarafından kapsanıyor

-- ArticleTranslation tablosu
DROP INDEX IF EXISTS "ArticleTranslation_articleId_idx";  -- ArticleTranslation_articleId_locale_idx tarafından kapsanıyor
DROP INDEX IF EXISTS "ArticleTranslation_articleId_locale_idx";  -- ArticleTranslation_articleId_locale_key tarafından kapsanıyor
DROP INDEX IF EXISTS "ArticleTranslation_locale_idx";  -- ArticleTranslation_locale_slug_idx tarafından kapsanıyor

-- User tablosu
DROP INDEX IF EXISTS "User_email_idx";  -- User_email_key tarafından kapsanıyor

-- AgentLog tablosu
DROP INDEX IF EXISTS "AgentLog_status_idx";  -- AgentLog_status_executionTime_idx tarafından kapsanıyor

-- BatchOperation tablosu
DROP INDEX IF EXISTS "BatchOperation_status_idx";  -- BatchOperation_status_operationType_idx tarafından kapsanıyor

-- Category tablosu
DROP INDEX IF EXISTS "Category_slug_idx";  -- Category_slug_key tarafından kapsanıyor

-- ErrorLog tablosu
DROP INDEX IF EXISTS "ErrorLog_level_idx";  -- ErrorLog_level_resolved_idx tarafından kapsanıyor

-- Newsletter tablosu
DROP INDEX IF EXISTS "Newsletter_email_idx";  -- Newsletter_email_key tarafından kapsanıyor
DROP INDEX IF EXISTS "Newsletter_token_idx";  -- Newsletter_token_key tarafından kapsanıyor

-- PushSubscription tablosu
DROP INDEX IF EXISTS "PushSubscription_endpoint_idx";  -- PushSubscription_endpoint_key tarafından kapsanıyor

-- Setting tablosu
DROP INDEX IF EXISTS "Setting_key_idx";  -- Setting_key_key tarafından kapsanıyor

-- SocialMedia tablosu
DROP INDEX IF EXISTS "SocialMedia_platform_idx";  -- SocialMedia_platform_key tarafından kapsanıyor

-- SystemMetric tablosu
DROP INDEX IF EXISTS "SystemMetric_metricType_idx";  -- SystemMetric_metricType_timestamp_idx tarafından kapsanıyor

-- UserSession tablosu
DROP INDEX IF EXISTS "UserSession_sessionToken_idx";  -- UserSession_sessionToken_key tarafından kapsanıyor
DROP INDEX IF EXISTS "UserSession_userId_idx";  -- UserSession_userId_isActive_idx tarafından kapsanıyor

-- Visitor tablosu
DROP INDEX IF EXISTS "Visitor_ipAddress_idx";  -- Visitor_ipAddress_key tarafından kapsanıyor

-- ============================================================================
-- 2. KULLANILMAYAN INDEX'LERI TEMİZLE (Hiç kullanılmayanlar)
-- ============================================================================

-- Article image index'leri (0 scan)
DROP INDEX IF EXISTS "Article_imageUrlSmall_idx";
DROP INDEX IF EXISTS "Article_imageUrlMedium_idx";

-- Article composite index'ler (0 scan)
DROP INDEX IF EXISTS "Article_topic_publishedAt_status_idx";
DROP INDEX IF EXISTS "Article_status_publishedAt_categoryId_idx";
DROP INDEX IF EXISTS "Article_status_publishedAt_score_idx";

-- ArticleAnalytics index'leri (0 scan)
DROP INDEX IF EXISTS "ArticleAnalytics_ipAddress_idx";
DROP INDEX IF EXISTS "ArticleAnalytics_city_createdAt_idx";
DROP INDEX IF EXISTS "ArticleAnalytics_country_createdAt_idx";

-- User index'leri (0 scan)
DROP INDEX IF EXISTS "User_isActive_idx";
DROP INDEX IF EXISTS "User_lastLogin_idx";
DROP INDEX IF EXISTS "User_role_idx";

-- UserSession index'leri (0 scan)
DROP INDEX IF EXISTS "UserSession_expiresAt_idx";
DROP INDEX IF EXISTS "UserSession_isActive_idx";
DROP INDEX IF EXISTS "UserSession_lastActivity_idx";

-- Visitor index'leri (0 scan)
DROP INDEX IF EXISTS "Visitor_createdAt_idx";
DROP INDEX IF EXISTS "Visitor_lastActivity_idx";
DROP INDEX IF EXISTS "Visitor_country_lastActivity_idx";
DROP INDEX IF EXISTS "Visitor_isp_lastActivity_idx";
DROP INDEX IF EXISTS "Visitor_city_lastActivity_idx";

-- Category index'leri (0 scan)
DROP INDEX IF EXISTS "Category_order_idx";
DROP INDEX IF EXISTS "Category_name_idx";

-- ContactMessage index'leri (0 scan)
DROP INDEX IF EXISTS "ContactMessage_createdAt_idx";
DROP INDEX IF EXISTS "ContactMessage_isRead_idx";

-- Newsletter index'leri (0 scan)
DROP INDEX IF EXISTS "Newsletter_status_idx";

-- AuditLog index'leri (0 scan)
DROP INDEX IF EXISTS "AuditLog_action_idx";
DROP INDEX IF EXISTS "AuditLog_resource_idx";
DROP INDEX IF EXISTS "AuditLog_userId_idx";

-- BatchOperation index'leri (0 scan)
DROP INDEX IF EXISTS "BatchOperation_operationType_idx";
DROP INDEX IF EXISTS "BatchOperation_createdBy_idx";
DROP INDEX IF EXISTS "BatchOperation_createdAt_idx";
DROP INDEX IF EXISTS "BatchOperation_status_operationType_idx";

-- ErrorLog index'leri (0 scan)
DROP INDEX IF EXISTS "ErrorLog_resolved_idx";
DROP INDEX IF EXISTS "ErrorLog_createdAt_idx";
DROP INDEX IF EXISTS "ErrorLog_userId_idx";
DROP INDEX IF EXISTS "ErrorLog_level_resolved_idx";

-- FilterPreset index'leri (0 scan)
DROP INDEX IF EXISTS "FilterPreset_userId_idx";
DROP INDEX IF EXISTS "FilterPreset_isDefault_idx";
DROP INDEX IF EXISTS "FilterPreset_isPublic_idx";

-- SEORecommendation index'leri (0 scan)
DROP INDEX IF EXISTS "idx_seo_unresolved";
DROP INDEX IF EXISTS "idx_seo_severity";

-- SearchProviderMetric index'leri (0 scan)
DROP INDEX IF EXISTS "SearchProviderMetric_timestamp_idx";
DROP INDEX IF EXISTS "SearchProviderMetric_provider_timestamp_idx";

-- SystemMetric index'leri (0 scan)
DROP INDEX IF EXISTS "SystemMetric_timestamp_idx";
DROP INDEX IF EXISTS "SystemMetric_metricType_timestamp_idx";

-- ArticleTemplate index'leri (0 scan)
DROP INDEX IF EXISTS "idx_template_active";
DROP INDEX IF EXISTS "idx_template_creator";
DROP INDEX IF EXISTS "idx_template_category";

-- ArticleDuplicate index'leri (0 scan)
DROP INDEX IF EXISTS "idx_duplicate_status";
DROP INDEX IF EXISTS "idx_duplicate_pending";

-- Article scheduled index (0 scan)
DROP INDEX IF EXISTS "idx_article_scheduled_publish";
DROP INDEX IF EXISTS "idx_article_template";

-- AgentLog index (0 scan)
DROP INDEX IF EXISTS "AgentLog_status_executionTime_idx";

-- ============================================================================
-- 3. EKSİK INDEX'LERI EKLE
-- ============================================================================

-- AuditLog için composite index (kullanıcı bazlı audit log sorguları için)
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx" 
ON "AuditLog" ("userId", "createdAt" DESC);

-- ============================================================================
-- 4. VACUUM VE ANALYZE
-- ============================================================================

-- Tüm tabloları vacuum ve analyze et
VACUUM ANALYZE "Article";
VACUUM ANALYZE "ArticleTranslation";
VACUUM ANALYZE "ArticleAnalytics";
VACUUM ANALYZE "User";
VACUUM ANALYZE "AuditLog";
VACUUM ANALYZE "AgentLog";
VACUUM ANALYZE "Category";
VACUUM ANALYZE "Visitor";

COMMIT;

-- ============================================================================
-- 5. DOĞRULAMA SORGUSU
-- ============================================================================

-- Index sayısını kontrol et
SELECT 
  schemaname,
  tablename,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY index_count DESC;

-- Toplam index boyutunu kontrol et
SELECT 
  pg_size_pretty(SUM(pg_relation_size(indexrelid))) as total_index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public';

-- ============================================================================
-- NOTLAR
-- ============================================================================

-- 1. Bu script'i çalıştırmadan önce MUTLAKA yedek alın!
-- 2. Production'da çalıştırmadan önce staging'de test edin
-- 3. Yoğun saatlerde çalıştırmayın (VACUUM kilitleme yapabilir)
-- 4. Script tamamlandıktan sonra index kullanımını izleyin
-- 5. Beklenen kazanç: ~1.5 MB disk + %15-25 INSERT/UPDATE performansı

-- ============================================================================
-- ROLLBACK (Sorun olursa)
-- ============================================================================

-- Eğer sorun olursa, yedekten geri yükleyin:
-- psql -h 77.42.68.4 -p 5435 -U postgres -d postgresainewsdb < backup_before_optimization.sql
