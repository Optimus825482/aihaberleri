-- ============================================================================
-- Migration: Add Vector Embeddings for Semantic Duplicate Detection
-- Date: 2026-02-04
-- Model: all-MiniLM-L6-v2 (384 dimensions)
-- ============================================================================

-- Step 1: Enable pgvector extension
-- Note: This requires superuser privileges. On managed databases (Neon, Supabase),
-- the extension is pre-installed. On self-hosted, run: CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add embedding column to Article table
-- Using vector(384) to match all-MiniLM-L6-v2 model output
ALTER TABLE "Article" 
ADD COLUMN IF NOT EXISTS embedding vector(384);

-- Step 3: Create index for fast similarity search
-- IVFFlat is recommended for tables with 1000+ rows
-- Lists parameter: sqrt(num_rows) is a good starting point
-- For 10,000 articles: lists = 100
-- For 100,000 articles: lists = 316
CREATE INDEX IF NOT EXISTS idx_article_embedding_ivfflat
ON "Article" 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Step 4: Create index for filtering by date + embedding
-- Useful for time-windowed similarity searches
CREATE INDEX IF NOT EXISTS idx_article_published_embedding
ON "Article" ("publishedAt" DESC)
WHERE embedding IS NOT NULL;

-- Step 5: Create function for similarity search with threshold
CREATE OR REPLACE FUNCTION find_similar_articles(
    query_embedding vector(384),
    similarity_threshold float DEFAULT 0.85,
    hours_window int DEFAULT 72,
    max_results int DEFAULT 10
)
RETURNS TABLE (
    article_id text,
    title text,
    slug text,
    published_at timestamp,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id as article_id,
        a.title,
        a.slug,
        a."publishedAt" as published_at,
        (1 - (a.embedding <=> query_embedding))::float as similarity
    FROM "Article" a
    WHERE 
        a.embedding IS NOT NULL
        AND a."publishedAt" >= NOW() - (hours_window || ' hours')::interval
        AND (1 - (a.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY a.embedding <=> query_embedding
    LIMIT max_results;
END;
$$;

-- Step 6: Create function to check for semantic duplicates
CREATE OR REPLACE FUNCTION check_semantic_duplicate(
    query_embedding vector(384),
    similarity_threshold float DEFAULT 0.85,
    hours_window int DEFAULT 72
)
RETURNS TABLE (
    is_duplicate boolean,
    matched_article_id text,
    matched_title text,
    similarity float
)
LANGUAGE plpgsql
AS $$
DECLARE
    match_record RECORD;
BEGIN
    SELECT 
        a.id,
        a.title,
        (1 - (a.embedding <=> query_embedding))::float as sim
    INTO match_record
    FROM "Article" a
    WHERE 
        a.embedding IS NOT NULL
        AND a."publishedAt" >= NOW() - (hours_window || ' hours')::interval
        AND (1 - (a.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY a.embedding <=> query_embedding
    LIMIT 1;
    
    IF FOUND THEN
        RETURN QUERY SELECT 
            true as is_duplicate,
            match_record.id as matched_article_id,
            match_record.title as matched_title,
            match_record.sim as similarity;
    ELSE
        RETURN QUERY SELECT 
            false as is_duplicate,
            NULL::text as matched_article_id,
            NULL::text as matched_title,
            0::float as similarity;
    END IF;
END;
$$;

-- Step 7: Create function to update article embedding
CREATE OR REPLACE FUNCTION update_article_embedding(
    article_id text,
    new_embedding vector(384)
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "Article"
    SET embedding = new_embedding
    WHERE id = article_id;
END;
$$;

-- Step 8: Create statistics view for monitoring
CREATE OR REPLACE VIEW embedding_stats AS
SELECT 
    COUNT(*) as total_articles,
    COUNT(embedding) as articles_with_embeddings,
    COUNT(*) - COUNT(embedding) as articles_without_embeddings,
    ROUND((COUNT(embedding)::float / NULLIF(COUNT(*), 0) * 100)::numeric, 2) as coverage_percentage,
    MAX("publishedAt") as latest_article,
    MIN("publishedAt") FILTER (WHERE embedding IS NULL) as oldest_without_embedding
FROM "Article";

-- ============================================================================
-- Usage Examples:
-- ============================================================================
--
-- 1. Find similar articles:
--    SELECT * FROM find_similar_articles(
--        '[0.1, 0.2, ...]'::vector(384),  -- embedding vector
--        0.85,                             -- threshold
--        72,                               -- hours window
--        10                                -- max results
--    );
--
-- 2. Check for duplicate:
--    SELECT * FROM check_semantic_duplicate(
--        '[0.1, 0.2, ...]'::vector(384),
--        0.90,  -- higher threshold for duplicates
--        48     -- shorter window
--    );
--
-- 3. Monitor embedding coverage:
--    SELECT * FROM embedding_stats;
--
-- 4. Manual embedding update:
--    SELECT update_article_embedding('article_id', '[0.1, 0.2, ...]'::vector);
--
-- ============================================================================
-- Maintenance Notes:
-- ============================================================================
--
-- 1. Index Rebalancing (run periodically for optimal performance):
--    REINDEX INDEX idx_article_embedding_ivfflat;
--
-- 2. Vacuum after bulk inserts:
--    VACUUM ANALYZE "Article";
--
-- 3. Adjust IVFFlat lists parameter as data grows:
--    - For 50,000+ articles, consider lists = 224
--    - For 100,000+ articles, consider lists = 316
--    - For 1,000,000+ articles, consider HNSW index instead
--
-- 4. Alternative: Use HNSW index for very large datasets:
--    CREATE INDEX idx_article_embedding_hnsw
--    ON "Article" 
--    USING hnsw (embedding vector_cosine_ops)
--    WITH (m = 16, ef_construction = 64);
--
-- ============================================================================
