-- AlterTable: Add GeoIP columns to ArticleAnalytics (NULL allowed, no data loss)
ALTER TABLE "ArticleAnalytics" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "ArticleAnalytics" ADD COLUMN IF NOT EXISTS "countryCode" TEXT;
ALTER TABLE "ArticleAnalytics" ADD COLUMN IF NOT EXISTS "region" TEXT;
ALTER TABLE "ArticleAnalytics" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "ArticleAnalytics" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "ArticleAnalytics" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

-- CreateIndex: Add indexes for location queries (IF NOT EXISTS for safety)
CREATE INDEX IF NOT EXISTS "ArticleAnalytics_country_idx" ON "ArticleAnalytics"("country");
CREATE INDEX IF NOT EXISTS "ArticleAnalytics_city_idx" ON "ArticleAnalytics"("city");
