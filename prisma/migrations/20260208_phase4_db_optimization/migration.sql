-- =============================================
-- FAZ 4: Database Optimizasyonu
-- =============================================

-- 1. GIN index for keywords - Array contains query performansı
CREATE INDEX IF NOT EXISTS idx_article_keywords_gin ON "Article" USING GIN ("keywords");
CREATE INDEX IF NOT EXISTS idx_article_keywords_en_gin ON "Article" USING GIN ("keywordsEn");

-- 2. Full-text search support - Title ve content için
-- Türkçe full-text search
CREATE INDEX IF NOT EXISTS idx_article_title_fulltext ON "Article" USING GIN (to_tsvector('turkish', "title"));
CREATE INDEX IF NOT EXISTS idx_article_content_fulltext ON "Article" USING GIN (to_tsvector('turkish', "content"));

-- İngilizce full-text search
CREATE INDEX IF NOT EXISTS idx_article_title_en_fulltext ON "Article" USING GIN (to_tsvector('english', COALESCE("titleEn", '')));
CREATE INDEX IF NOT EXISTS idx_article_content_en_fulltext ON "Article" USING GIN (to_tsvector('english', COALESCE("contentEn", '')));

-- 3. Partial index PUBLISHED - Sadece published makaleler için
CREATE INDEX IF NOT EXISTS idx_article_published_partial ON "Article" ("publishedAt" DESC) WHERE "status" = 'PUBLISHED';

-- 4. Composite indexes - Çoklu sorgu optimizasyonu
CREATE INDEX IF NOT EXISTS idx_article_status_published_lang ON "Article" ("status", "publishedAt" DESC, "language");
CREATE INDEX IF NOT EXISTS idx_article_trending_score ON "Article" ("isTrending", "trendScore" DESC);
