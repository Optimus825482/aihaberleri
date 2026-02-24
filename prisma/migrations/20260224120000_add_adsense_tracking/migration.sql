-- CreateTable: AdSense Revenue Snapshots
CREATE TABLE IF NOT EXISTS "AdSenseSnapshot" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "earnings" DOUBLE PRECISION NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rpm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pageRpm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adUnits" JSONB,
    "countries" JSONB,
    "pages" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdSenseSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AdSense AI Analysis Results
CREATE TABLE IF NOT EXISTS "AdSenseAnalysis" (
    "id" TEXT NOT NULL,
    "metricsSnapshot" JSONB NOT NULL,
    "analysis" TEXT NOT NULL,
    "recommendations" JSONB NOT NULL,
    "warnings" JSONB,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "aiModel" TEXT NOT NULL DEFAULT 'deepseek',
    "aiDuration" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "actionsApplied" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdSenseAnalysis_pkey" PRIMARY KEY ("id")
);

-- Indexes for AdSenseSnapshot
CREATE UNIQUE INDEX IF NOT EXISTS "AdSenseSnapshot_date_key" ON "AdSenseSnapshot"("date");
CREATE INDEX IF NOT EXISTS "AdSenseSnapshot_date_idx" ON "AdSenseSnapshot"("date" DESC);
CREATE INDEX IF NOT EXISTS "AdSenseSnapshot_createdAt_idx" ON "AdSenseSnapshot"("createdAt");

-- Indexes for AdSenseAnalysis
CREATE INDEX IF NOT EXISTS "AdSenseAnalysis_createdAt_idx" ON "AdSenseAnalysis"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AdSenseAnalysis_status_idx" ON "AdSenseAnalysis"("status");
