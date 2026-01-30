-- Add image size columns to Article table
-- Migration: add_image_sizes

ALTER TABLE "Article" 
ADD COLUMN IF NOT EXISTS "imageUrlMedium" TEXT,
ADD COLUMN IF NOT EXISTS "imageUrlSmall" TEXT,
ADD COLUMN IF NOT EXISTS "imageUrlThumb" TEXT;

-- Add indexes for image URLs (optional, for faster queries)
CREATE INDEX IF NOT EXISTS "Article_imageUrlMedium_idx" ON "Article"("imageUrlMedium");
CREATE INDEX IF NOT EXISTS "Article_imageUrlSmall_idx" ON "Article"("imageUrlSmall");
CREATE INDEX IF NOT EXISTS "Article_imageUrlThumb_idx" ON "Article"("imageUrlThumb");

-- Comment
COMMENT ON COLUMN "Article"."imageUrlMedium" IS 'Optimized medium size image (800px)';
COMMENT ON COLUMN "Article"."imageUrlSmall" IS 'Optimized small size image (400px)';
COMMENT ON COLUMN "Article"."imageUrlThumb" IS 'Optimized thumbnail image (200px)';
