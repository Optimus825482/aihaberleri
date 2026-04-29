-- CreateEnum
CREATE TYPE "CoverageRecoveryAction" AS ENUM ('QUEUE_RECOVERY', 'NOTIFY_GOOGLE', 'BOTH', 'RECOVER_THEN_NOTIFY');

-- CreateEnum
CREATE TYPE "CoverageBatchStatus" AS ENUM ('RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "CoverageItemStatus" AS ENUM ('QUEUED', 'NOTIFIED', 'BOTH', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "CoverageRecoveryBatch" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "action" "CoverageRecoveryAction" NOT NULL,
    "status" "CoverageBatchStatus" NOT NULL DEFAULT 'RUNNING',
    "totalItems" INTEGER NOT NULL,
    "recoverableItems" INTEGER NOT NULL DEFAULT 0,
    "queuedItems" INTEGER NOT NULL DEFAULT 0,
    "notifiedItems" INTEGER NOT NULL DEFAULT 0,
    "skippedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverageRecoveryBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverageRecoveryItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "inputUrl" TEXT NOT NULL,
    "normalizedUrl" TEXT,
    "slug" TEXT,
    "locale" TEXT,
    "jobId" TEXT,
    "status" "CoverageItemStatus" NOT NULL,
    "reason" TEXT,
    "queued" BOOLEAN NOT NULL DEFAULT false,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverageRecoveryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoverageRecoveryBatch_status_idx" ON "CoverageRecoveryBatch"("status");

-- CreateIndex
CREATE INDEX "CoverageRecoveryBatch_createdAt_idx" ON "CoverageRecoveryBatch"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "CoverageRecoveryBatch_createdById_idx" ON "CoverageRecoveryBatch"("createdById");

-- CreateIndex
CREATE INDEX "CoverageRecoveryItem_batchId_idx" ON "CoverageRecoveryItem"("batchId");

-- CreateIndex
CREATE INDEX "CoverageRecoveryItem_status_idx" ON "CoverageRecoveryItem"("status");

-- CreateIndex
CREATE INDEX "CoverageRecoveryItem_jobId_idx" ON "CoverageRecoveryItem"("jobId");

-- AddForeignKey
ALTER TABLE "CoverageRecoveryBatch" ADD CONSTRAINT "CoverageRecoveryBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverageRecoveryBatch" ADD CONSTRAINT "CoverageRecoveryBatch_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverageRecoveryItem" ADD CONSTRAINT "CoverageRecoveryItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "CoverageRecoveryBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
