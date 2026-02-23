-- Add stable visitor token and stop using IP as unique identity
ALTER TABLE "Visitor"
ADD COLUMN IF NOT EXISTS "visitorToken" TEXT;

UPDATE "Visitor"
SET "visitorToken" = gen_random_uuid()::text
WHERE "visitorToken" IS NULL;

ALTER TABLE "Visitor"
ALTER COLUMN "visitorToken" SET NOT NULL;

DROP INDEX IF EXISTS "Visitor_visitorToken_key";
CREATE UNIQUE INDEX "Visitor_visitorToken_key" ON "Visitor"("visitorToken");

ALTER TABLE "Visitor"
DROP CONSTRAINT IF EXISTS "Visitor_ipAddress_key";
