# 🚀 Cache System Quick Reference

## Usage Examples

### Basic Cache Operations

```typescript
import { getCache } from "@/lib/cache";

const cache = getCache();

// GET with type safety
const articles = await cache.get<Article[]>("articles:list");

// SET with TTL and tags
await cache.set("articles:list", data, {
  ttl: 300,        // 5 minutes
  tags: ["articles"]
});

// Invalidate by tag
await cache.invalidateByTag("articles");

// Get stats
const stats = cache.getStats();
console.log(`Hit ratio: ${stats.hitRatio}`);
```

## Common Patterns

### API Route with Cache

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") || "1";
  
  // 1. Generate cache key
  const cacheKey = `resource:list:p${page}`;
  const cache = getCache();
  
  // 2. Try cache
  const cached = await cache.get<ResponseType>(cacheKey);
  if (cached) {
    const response = NextResponse.json(cached);
    response.headers.set("X-Cache", "HIT");
    return response;
  }
  
  // 3. Query database
  const data = await db.query();
  
  // 4. Build response
  const responseData = { success: true, data };
  
  // 5. Cache it
  await cache.set(cacheKey, responseData, {
    ttl: 300,
    tags: ["resource"]
  });
  
  // 6. Return
  const response = NextResponse.json(responseData);
  response.headers.set("X-Cache", "MISS");
  return response;
}
```

### Cache Invalidation After Update

```typescript
export async function PUT(request: Request) {
  // Update logic...
  const article = await db.article.update({ ... });
  
  // Invalidate cache
  const cache = getCache();
  await cache.invalidateByTag("articles");
  
  return NextResponse.json({ success: true, data: article });
}
```

## Cache TTL Guidelines

| Route Type | TTL | Reason |
|------------|-----|--------|
| Article list | 5 min | Balance freshness & performance |
| Single article | 10 min | Longer OK for detailed views |
| Categories | 30 min | Rarely change |
| Dashboard stats | 2 min | Need fresh analytics |
| User profile | 5 min | Moderate change frequency |
| Static config | 1 hour | Almost never changes |

## Tag Strategy

| Tag | Used For | Invalidate When |
|-----|----------|----------------|
| `articles` | All article caches | Article created/updated/deleted |
| `categories` | Category list | Category modified |
| `analytics` | Dashboard stats | Manual only (time-based) |
| `users` | User data | User profile updated |

## Monitoring Commands

```bash
# Check cache stats (requires admin auth)
curl -H "Authorization: Bearer TOKEN" \
  https://aihaberleri.org/api/admin/cache-stats

# Clear all cache
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"clear"}' \
  https://aihaberleri.org/api/admin/cache-stats

# Reset statistics
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"reset"}' \
  https://aihaberleri.org/api/admin/cache-stats
```

## Troubleshooting

### Low Hit Ratio (<50%)
1. Check if query params vary too much
2. Verify TTL isn't too short
3. Check invalidation isn't too aggressive

### Stale Data
1. Verify invalidation is called after updates
2. Check TTL settings
3. Manual clear: `POST /api/admin/cache-stats { action: "clear" }`

### Redis Connection Issues
```bash
# Check Redis health
docker-compose exec redis redis-cli ping
# Should return: PONG

# Check Redis keys
docker-compose exec redis redis-cli keys "cache:*"

# Check memory usage
docker-compose exec redis redis-cli info memory
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Cache hit ratio | >70% |
| Cached response time | <50ms |
| L1 cache size | <1000 entries |
| Redis memory | <100MB |

---

**Full Documentation**: See `CACHE-IMPLEMENTATION-COMPLETE.md`
