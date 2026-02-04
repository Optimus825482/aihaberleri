-- Add titleABTest column to Article table for A/B testing feature
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "titleABTest" JSONB;

-- Add embedding column for vector similarity search (if pgvector is available)
-- Note: This requires pgvector extension to be installed
DO $$ 
BEGIN
    -- Check if pgvector extension exists
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        -- Add embedding column with vector type
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'Article' AND column_name = 'embedding') THEN
            EXECUTE 'ALTER TABLE "Article" ADD COLUMN "embedding" vector(384)';
        END IF;
    ELSE
        -- Fallback: Add as JSONB if pgvector not available
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'Article' AND column_name = 'embedding') THEN
            ALTER TABLE "Article" ADD COLUMN "embedding" JSONB;
        END IF;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN "Article"."titleABTest" IS 'JSON object containing: titleVariants, activeVariant, variantViews, variantClicks for A/B testing';
COMMENT ON COLUMN "Article"."embedding" IS 'Vector embedding for semantic similarity search (384 dimensions)';
