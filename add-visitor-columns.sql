-- Migration: Add missing columns to Visitor table
-- Run this SQL in Coolify PostgreSQL or via psql

-- Check if column exists before adding
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Visitor' AND column_name = 'isp') THEN
        ALTER TABLE "Visitor" ADD COLUMN "isp" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Visitor' AND column_name = 'latitude') THEN
        ALTER TABLE "Visitor" ADD COLUMN "latitude" DOUBLE PRECISION;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Visitor' AND column_name = 'longitude') THEN
        ALTER TABLE "Visitor" ADD COLUMN "longitude" DOUBLE PRECISION;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Visitor' AND column_name = 'timezone') THEN
        ALTER TABLE "Visitor" ADD COLUMN "timezone" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Visitor' AND column_name = 'provider') THEN
        ALTER TABLE "Visitor" ADD COLUMN "provider" TEXT;
    END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Visitor'
ORDER BY ordinal_position;
