-- Add image size columns to Article table if they don't exist
-- Run this in production database via Coolify console or psql

-- Check if columns exist first, then add them
DO $$ 
BEGIN
    -- Add imageUrlMedium column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Article' AND column_name = 'imageUrlMedium') THEN
        ALTER TABLE "Article" ADD COLUMN "imageUrlMedium" TEXT;
        RAISE NOTICE 'Added imageUrlMedium column';
    ELSE
        RAISE NOTICE 'imageUrlMedium column already exists';
    END IF;
    
    -- Add imageUrlSmall column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Article' AND column_name = 'imageUrlSmall') THEN
        ALTER TABLE "Article" ADD COLUMN "imageUrlSmall" TEXT;
        RAISE NOTICE 'Added imageUrlSmall column';
    ELSE
        RAISE NOTICE 'imageUrlSmall column already exists';
    END IF;
    
    -- Add imageUrlThumb column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Article' AND column_name = 'imageUrlThumb') THEN
        ALTER TABLE "Article" ADD COLUMN "imageUrlThumb" TEXT;
        RAISE NOTICE 'Added imageUrlThumb column';
    ELSE
        RAISE NOTICE 'imageUrlThumb column already exists';
    END IF;
END $$;
