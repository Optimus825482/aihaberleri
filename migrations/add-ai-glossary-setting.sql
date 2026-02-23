-- ============================================
-- AI Sözlük başlangıç kaydı (güvenli / idempotent)
-- Bu migration VERİ SİLMEZ, DB SIFIRLAMAZ.
-- ============================================

BEGIN;

INSERT INTO "Setting" ("id", "key", "value", "encrypted", "createdAt", "updatedAt")
VALUES (
  ('setting-' || md5(random()::text || clock_timestamp()::text)),
  'site_ai_terms_glossary',
  '[]',
  false,
  now(),
  now()
)
ON CONFLICT ("key") DO NOTHING;

COMMIT;
