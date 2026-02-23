-- CreateTable
CREATE TABLE IF NOT EXISTS "AIGlossaryTerm" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "normalizedTerm" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT NOT NULL DEFAULT 'SYSTEM',
    "confidence" DOUBLE PRECISION,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIGlossaryTerm_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "AIGlossaryTerm_normalizedTerm_key" ON "AIGlossaryTerm"("normalizedTerm");
CREATE UNIQUE INDEX IF NOT EXISTS "AIGlossaryTerm_term_key" ON "AIGlossaryTerm"("term");
CREATE INDEX IF NOT EXISTS "AIGlossaryTerm_isActive_idx" ON "AIGlossaryTerm"("isActive");
CREATE INDEX IF NOT EXISTS "AIGlossaryTerm_usageCount_idx" ON "AIGlossaryTerm"("usageCount");
CREATE INDEX IF NOT EXISTS "AIGlossaryTerm_lastSeenAt_idx" ON "AIGlossaryTerm"("lastSeenAt");
CREATE INDEX IF NOT EXISTS "AIGlossaryTerm_source_idx" ON "AIGlossaryTerm"("source");

-- Legacy Setting JSON -> Table migration (idempotent)
INSERT INTO "AIGlossaryTerm" (
  "id", "term", "normalizedTerm", "description", "aliases", "source", "isActive", "createdAt", "updatedAt"
)
SELECT
  ('glossary-' || md5((elem->>'term') || random()::text || clock_timestamp()::text)) AS id,
  elem->>'term' AS term,
  lower(trim(elem->>'term')) AS "normalizedTerm",
  elem->>'description' AS description,
  COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(elem->'aliases')),
    ARRAY[]::TEXT[]
  ) AS aliases,
  'LEGACY_SETTING' AS source,
  true AS "isActive",
  now() AS "createdAt",
  now() AS "updatedAt"
FROM "Setting" s,
LATERAL jsonb_array_elements(
  CASE
    WHEN s."value" IS NOT NULL AND s."value" <> '' THEN s."value"::jsonb
    ELSE '[]'::jsonb
  END
) elem
WHERE s."key" = 'site_ai_terms_glossary'
  AND jsonb_typeof(
    CASE
      WHEN s."value" IS NOT NULL AND s."value" <> '' THEN s."value"::jsonb
      ELSE '[]'::jsonb
    END
  ) = 'array'
  AND (elem->>'term') IS NOT NULL
  AND (elem->>'description') IS NOT NULL
ON CONFLICT ("normalizedTerm") DO NOTHING;
