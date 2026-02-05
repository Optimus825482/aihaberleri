-- Add language field to Article table
ALTER TABLE "Article" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'tr';

-- Create indexes for language filtering
CREATE INDEX "Article_language_idx" ON "Article"("language");
CREATE INDEX "Article_googleIndexed_language_idx" ON "Article"("googleIndexed", "language");

-- Update existing articles to have language 'tr' (Turkish)
UPDATE "Article" SET "language" = 'tr' WHERE "language" IS NULL;
