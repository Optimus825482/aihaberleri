-- Tesla Model S/X haberi kontrolü

-- 1. Başlıkta "Tesla" ve "Model S" veya "Model X" geçen haberler
SELECT 
    id,
    title,
    slug,
    "publishedAt",
    status,
    "sourceUrl"
FROM "Article"
WHERE 
    (
        LOWER(title) LIKE '%tesla%' 
        AND (
            LOWER(title) LIKE '%model s%' 
            OR LOWER(title) LIKE '%model x%'
            OR LOWER(title) LIKE '%discontinue%'
        )
    )
ORDER BY "publishedAt" DESC
LIMIT 10;

-- 2. Son 24 saatte yayınlanan tüm haberler
SELECT 
    id,
    title,
    "publishedAt",
    status
FROM "Article"
WHERE "publishedAt" >= NOW() - INTERVAL '24 hours'
ORDER BY "publishedAt" DESC;

-- 3. Mashable kaynaklı haberler
SELECT 
    id,
    title,
    "sourceUrl",
    "publishedAt"
FROM "Article"
WHERE "sourceUrl" LIKE '%mashable.com%'
ORDER BY "publishedAt" DESC
LIMIT 10;
