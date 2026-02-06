-- SocialPlatform enum'una eksik değerleri ekle
-- Bu script Coolify PostgreSQL'de çalıştırılmalı

-- Önce mevcut enum değerlerini kontrol et
SELECT enum_range(NULL::\"SocialPlatform\");

-- Eksik enum değerlerini ekle (IF NOT EXISTS ile güvenli)
DO $$
BEGIN
  -- BLUESKY_EN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BLUESKY_EN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SocialPlatform')) THEN
    ALTER TYPE "SocialPlatform" ADD VALUE 'BLUESKY_EN';
  END IF;
  
  -- MASTODON_EN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MASTODON_EN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SocialPlatform')) THEN
    ALTER TYPE "SocialPlatform" ADD VALUE 'MASTODON_EN';
  END IF;

  -- FACEBOOK_EN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FACEBOOK_EN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SocialPlatform')) THEN
    ALTER TYPE "SocialPlatform" ADD VALUE 'FACEBOOK_EN';
  END IF;

  -- TUMBLR_EN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'TUMBLR_EN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SocialPlatform')) THEN
    ALTER TYPE "SocialPlatform" ADD VALUE 'TUMBLR_EN';
  END IF;
END
$$;

-- Sonucu kontrol et
SELECT enum_range(NULL::\"SocialPlatform\");
