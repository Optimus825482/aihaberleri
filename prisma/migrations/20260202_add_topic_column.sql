-- Add topic column to Article table for intelligent duplicate detection
-- Migration: 20260202_add_topic_column

-- Add topic column
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "topic" TEXT;

-- Create index for fast topic-based queries
CREATE INDEX IF NOT EXISTS "Article_topic_idx" ON "Article"("topic");

-- Create composite index for topic + publishedAt (for duplicate checks)
CREATE INDEX IF NOT EXISTS "Article_topic_publishedAt_idx" ON "Article"("topic", "publishedAt" DESC);

-- Add comment
COMMENT ON COLUMN "Article"."topic" IS 'Short topic identifier extracted from title (e.g., nvidia_openai_investment)';
