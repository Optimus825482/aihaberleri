-- CreateEnum
CREATE TYPE "IndexStatus" AS ENUM ('PENDING', 'SUBMITTED', 'FAILED');

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "indexNowStatus" "IndexStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "indexedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Article_indexNowStatus_idx" ON "Article"("indexNowStatus");
