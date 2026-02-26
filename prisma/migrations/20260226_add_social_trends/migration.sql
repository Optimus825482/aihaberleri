-- CreateTable: SocialTrend (Twitter & Reddit trend verileri)
CREATE TABLE "SocialTrend" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "hashtag" TEXT,
    "volume" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "sentiment" TEXT NOT NULL DEFAULT 'neutral',
    "region" TEXT NOT NULL DEFAULT 'TR',
    "language" TEXT NOT NULL DEFAULT 'tr',
    "keywords" TEXT[],
    "rank" INTEGER,
    "url" TEXT,
    "subreddit" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialTrend_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TrendSnapshot (Trend tarihçesi - dataset için)
CREATE TABLE "TrendSnapshot" (
    "id" TEXT NOT NULL,
    "trendId" TEXT NOT NULL,
    "volume" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TrendArticleMatch (Haber-Trend eşleşmeleri)
CREATE TABLE "TrendArticleMatch" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "trendId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "matchType" TEXT NOT NULL DEFAULT 'keyword',
    "matchedKeywords" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendArticleMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: SocialTrend indexes
CREATE INDEX "SocialTrend_platform_region_idx" ON "SocialTrend"("platform", "region");
CREATE INDEX "SocialTrend_topic_idx" ON "SocialTrend"("topic");
CREATE INDEX "SocialTrend_fetchedAt_idx" ON "SocialTrend"("fetchedAt");
CREATE INDEX "SocialTrend_expiresAt_idx" ON "SocialTrend"("expiresAt");
CREATE INDEX "SocialTrend_platform_language_idx" ON "SocialTrend"("platform", "language");
CREATE INDEX "SocialTrend_score_idx" ON "SocialTrend"("score" DESC);

-- CreateIndex: TrendSnapshot indexes
CREATE INDEX "TrendSnapshot_trendId_capturedAt_idx" ON "TrendSnapshot"("trendId", "capturedAt");
CREATE INDEX "TrendSnapshot_capturedAt_idx" ON "TrendSnapshot"("capturedAt" DESC);

-- CreateIndex: TrendArticleMatch indexes
CREATE UNIQUE INDEX "TrendArticleMatch_articleId_trendId_key" ON "TrendArticleMatch"("articleId", "trendId");
CREATE INDEX "TrendArticleMatch_articleId_idx" ON "TrendArticleMatch"("articleId");
CREATE INDEX "TrendArticleMatch_trendId_idx" ON "TrendArticleMatch"("trendId");
CREATE INDEX "TrendArticleMatch_matchScore_idx" ON "TrendArticleMatch"("matchScore" DESC);

-- AddForeignKey: TrendSnapshot → SocialTrend
ALTER TABLE "TrendSnapshot" ADD CONSTRAINT "TrendSnapshot_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "SocialTrend"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: TrendArticleMatch → Article
ALTER TABLE "TrendArticleMatch" ADD CONSTRAINT "TrendArticleMatch_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: TrendArticleMatch → SocialTrend
ALTER TABLE "TrendArticleMatch" ADD CONSTRAINT "TrendArticleMatch_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "SocialTrend"("id") ON DELETE CASCADE ON UPDATE CASCADE;
