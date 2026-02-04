-- Add titleABTest column to Article table for A/B testing feature
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "titleABTest" JSONB;

-- Add comment for documentation
COMMENT ON COLUMN "Article"."titleABTest" IS 'JSON object containing: titleVariants, activeVariant, variantViews, variantClicks for A/B testing';
