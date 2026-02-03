-- Admin Panel Schema Genişletme Migration
-- Tarih: 2026-02-03
-- Açıklama: User model genişletme, UserSession, SystemMetric, ErrorLog, BatchOperation, FilterPreset modelleri ekleme

-- 1. User tablosuna yeni kolonlar ekleme
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- User tablosuna yeni index'ler
CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User"("isActive");
CREATE INDEX IF NOT EXISTS "User_lastLogin_idx" ON "User"("lastLogin");

-- 2. UserSession tablosu oluşturma
CREATE TABLE IF NOT EXISTS "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "country" TEXT,
    "city" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- UserSession unique constraint ve index'ler
CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_sessionToken_key" ON "UserSession"("sessionToken");
CREATE INDEX IF NOT EXISTS "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX IF NOT EXISTS "UserSession_sessionToken_idx" ON "UserSession"("sessionToken");
CREATE INDEX IF NOT EXISTS "UserSession_isActive_idx" ON "UserSession"("isActive");
CREATE INDEX IF NOT EXISTS "UserSession_lastActivity_idx" ON "UserSession"("lastActivity");
CREATE INDEX IF NOT EXISTS "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- UserSession foreign key
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. SystemMetric tablosu oluşturma
CREATE TABLE IF NOT EXISTS "SystemMetric" (
    "id" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemMetric_pkey" PRIMARY KEY ("id")
);

-- SystemMetric index'ler
CREATE INDEX IF NOT EXISTS "SystemMetric_metricType_idx" ON "SystemMetric"("metricType");
CREATE INDEX IF NOT EXISTS "SystemMetric_timestamp_idx" ON "SystemMetric"("timestamp" DESC);
CREATE INDEX IF NOT EXISTS "SystemMetric_metricType_timestamp_idx" ON "SystemMetric"("metricType", "timestamp");

-- 4. ErrorLog tablosu oluşturma
CREATE TABLE IF NOT EXISTS "ErrorLog" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "context" JSONB,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "url" TEXT,
    "method" TEXT,
    "statusCode" INTEGER,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- ErrorLog index'ler
CREATE INDEX IF NOT EXISTS "ErrorLog_level_idx" ON "ErrorLog"("level");
CREATE INDEX IF NOT EXISTS "ErrorLog_resolved_idx" ON "ErrorLog"("resolved");
CREATE INDEX IF NOT EXISTS "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ErrorLog_userId_idx" ON "ErrorLog"("userId");

-- 5. BatchOperation tablosu oluşturma
CREATE TABLE IF NOT EXISTS "BatchOperation" (
    "id" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalItems" INTEGER NOT NULL,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchOperation_pkey" PRIMARY KEY ("id")
);

-- BatchOperation index'ler
CREATE INDEX IF NOT EXISTS "BatchOperation_status_idx" ON "BatchOperation"("status");
CREATE INDEX IF NOT EXISTS "BatchOperation_operationType_idx" ON "BatchOperation"("operationType");
CREATE INDEX IF NOT EXISTS "BatchOperation_createdBy_idx" ON "BatchOperation"("createdBy");
CREATE INDEX IF NOT EXISTS "BatchOperation_createdAt_idx" ON "BatchOperation"("createdAt" DESC);

-- 6. FilterPreset tablosu oluşturma
CREATE TABLE IF NOT EXISTS "FilterPreset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filters" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilterPreset_pkey" PRIMARY KEY ("id")
);

-- FilterPreset index'ler
CREATE INDEX IF NOT EXISTS "FilterPreset_userId_idx" ON "FilterPreset"("userId");
CREATE INDEX IF NOT EXISTS "FilterPreset_isDefault_idx" ON "FilterPreset"("isDefault");
CREATE INDEX IF NOT EXISTS "FilterPreset_isPublic_idx" ON "FilterPreset"("isPublic");

-- FilterPreset foreign key
ALTER TABLE "FilterPreset" ADD CONSTRAINT "FilterPreset_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. Performans için ek composite index'ler
CREATE INDEX IF NOT EXISTS "UserSession_userId_isActive_idx" ON "UserSession"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "ErrorLog_level_resolved_idx" ON "ErrorLog"("level", "resolved");
CREATE INDEX IF NOT EXISTS "BatchOperation_status_operationType_idx" ON "BatchOperation"("status", "operationType");

-- Migration tamamlandı
-- Toplam eklenen tablo: 5 (UserSession, SystemMetric, ErrorLog, BatchOperation, FilterPreset)
-- Toplam eklenen index: 30+
-- User model genişletildi: permissions, isActive, deletedAt kolonları eklendi
