-- Phase 5: Advanced Features Migration
-- Scheduled Publishing, Article Templates, and Enhanced SEO

-- Add scheduledPublishAt to Article table
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "scheduledPublishAt" TIMESTAMP(3);
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "templateId" TEXT;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "seoScore" INTEGER DEFAULT 0;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "readingTime" INTEGER DEFAULT 0; -- in minutes

-- Create ArticleTemplate table
CREATE TABLE IF NOT EXISTS "ArticleTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleTemplate_pkey" PRIMARY KEY ("id")
);

-- Create SEORecommendation table
CREATE TABLE IF NOT EXISTS "SEORecommendation" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "type" TEXT NOT NULL, -- "title", "description", "keywords", "content", "images"
    "severity" TEXT NOT NULL, -- "critical", "high", "medium", "low"
    "message" TEXT NOT NULL,
    "suggestion" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SEORecommendation_pkey" PRIMARY KEY ("id")
);

-- Create ArticleDuplicate table for merge tracking
CREATE TABLE IF NOT EXISTS "ArticleDuplicate" (
    "id" TEXT NOT NULL,
    "originalId" TEXT NOT NULL,
    "duplicateId" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending', -- "pending", "merged", "ignored"
    "mergedAt" TIMESTAMP(3),
    "mergedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleDuplicate_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "Article_scheduledPublishAt_idx" ON "Article"("scheduledPublishAt");
CREATE INDEX IF NOT EXISTS "Article_templateId_idx" ON "Article"("templateId");
CREATE INDEX IF NOT EXISTS "Article_seoScore_idx" ON "Article"("seoScore");

CREATE INDEX IF NOT EXISTS "ArticleTemplate_createdBy_idx" ON "ArticleTemplate"("createdBy");
CREATE INDEX IF NOT EXISTS "ArticleTemplate_isActive_idx" ON "ArticleTemplate"("isActive");

CREATE INDEX IF NOT EXISTS "SEORecommendation_articleId_idx" ON "SEORecommendation"("articleId");
CREATE INDEX IF NOT EXISTS "SEORecommendation_severity_idx" ON "SEORecommendation"("severity");
CREATE INDEX IF NOT EXISTS "SEORecommendation_isResolved_idx" ON "SEORecommendation"("isResolved");

CREATE INDEX IF NOT EXISTS "ArticleDuplicate_originalId_idx" ON "ArticleDuplicate"("originalId");
CREATE INDEX IF NOT EXISTS "ArticleDuplicate_duplicateId_idx" ON "ArticleDuplicate"("duplicateId");
CREATE INDEX IF NOT EXISTS "ArticleDuplicate_status_idx" ON "ArticleDuplicate"("status");

-- Add foreign keys with conditional check
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Article_templateId_fkey'
    ) THEN
        ALTER TABLE "Article" ADD CONSTRAINT "Article_templateId_fkey" 
        FOREIGN KEY ("templateId") REFERENCES "ArticleTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SEORecommendation_articleId_fkey'
    ) THEN
        ALTER TABLE "SEORecommendation" ADD CONSTRAINT "SEORecommendation_articleId_fkey" 
        FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ArticleDuplicate_originalId_fkey'
    ) THEN
        ALTER TABLE "ArticleDuplicate" ADD CONSTRAINT "ArticleDuplicate_originalId_fkey" 
        FOREIGN KEY ("originalId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ArticleDuplicate_duplicateId_fkey'
    ) THEN
        ALTER TABLE "ArticleDuplicate" ADD CONSTRAINT "ArticleDuplicate_duplicateId_fkey" 
        FOREIGN KEY ("duplicateId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ArticleTemplate_createdBy_fkey'
    ) THEN
        ALTER TABLE "ArticleTemplate" ADD CONSTRAINT "ArticleTemplate_createdBy_fkey" 
        FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
