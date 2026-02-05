-- Add Google Indexing Batch fields to Article
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "googleIndexed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "googleIndexingScheduled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "googleIndexingScheduledAt" TIMESTAMP(3);

-- Create GoogleIndexingBatch table
CREATE TABLE IF NOT EXISTS "GoogleIndexingBatch" (
    "id" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalArticles" INTEGER NOT NULL,
    "processedArticles" INTEGER NOT NULL DEFAULT 0,
    "failedArticles" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleIndexingBatch_pkey" PRIMARY KEY ("id")
);

-- Create GoogleIndexingBatchItem table
CREATE TABLE IF NOT EXISTS "GoogleIndexingBatchItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleIndexingBatchItem_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "GoogleIndexingBatch_scheduledFor_idx" ON "GoogleIndexingBatch"("scheduledFor");
CREATE INDEX IF NOT EXISTS "GoogleIndexingBatch_status_idx" ON "GoogleIndexingBatch"("status");
CREATE INDEX IF NOT EXISTS "GoogleIndexingBatch_createdAt_idx" ON "GoogleIndexingBatch"("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "GoogleIndexingBatchItem_batchId_idx" ON "GoogleIndexingBatchItem"("batchId");
CREATE INDEX IF NOT EXISTS "GoogleIndexingBatchItem_articleId_idx" ON "GoogleIndexingBatchItem"("articleId");
CREATE INDEX IF NOT EXISTS "GoogleIndexingBatchItem_status_idx" ON "GoogleIndexingBatchItem"("status");

-- Add foreign keys (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'GoogleIndexingBatchItem_batchId_fkey'
    ) THEN
        ALTER TABLE "GoogleIndexingBatchItem" 
        ADD CONSTRAINT "GoogleIndexingBatchItem_batchId_fkey" 
        FOREIGN KEY ("batchId") REFERENCES "GoogleIndexingBatch"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'GoogleIndexingBatchItem_articleId_fkey'
    ) THEN
        ALTER TABLE "GoogleIndexingBatchItem" 
        ADD CONSTRAINT "GoogleIndexingBatchItem_articleId_fkey" 
        FOREIGN KEY ("articleId") REFERENCES "Article"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
