-- Tesla duplicate haberlerini kontrol et

-- 1. Tesla Model S/X haberleri (son 24 saat)
SELECT 
    id,
    title,
    slug,
    "publishedAt",
    "createdAt",
    status,
    "sourceUrl",
    "agentLogId"
FROM "Article"
WHERE 
    LOWER(title) LIKE '%tesla%' 
    AND (
        LOWER(title) LIKE '%model s%' 
        OR LOWER(title) LIKE '%model x%'
    )
    AND "publishedAt" >= NOW() - INTERVAL '24 hours'
ORDER BY "createdAt" DESC;

-- 2. Aynı agentLogId ile oluşturulan haberler
SELECT 
    "agentLogId",
    COUNT(*) as article_count,
    STRING_AGG(title, ' | ') as titles
FROM "Article"
WHERE "agentLogId" IS NOT NULL
GROUP BY "agentLogId"
HAVING COUNT(*) > 3
ORDER BY article_count DESC
LIMIT 10;

-- 3. Son agent log kayıtları
SELECT 
    id,
    status,
    "articlesCreated",
    "articlesScraped",
    duration,
    "executionTime",
    errors
FROM "AgentLog"
ORDER BY "executionTime" DESC
LIMIT 5;
