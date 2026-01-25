# Docker Build Fix - Production Deployment

## Problem Summary

Docker build was failing on Coolify with multiple issues:

1. ❌ OpenSSL compatibility (Alpine needs OpenSSL 3.x)
2. ❌ Node version mismatch (Firebase requires Node 20+)
3. ❌ Prisma binary target incorrect for Alpine Linux
4. ❌ Redis/Database connection attempts during build time
5. ❌ TypeScript errors with null handling
6. ❌ Missing standalone output configuration

## Solutions Implemented

### 1. ✅ Dockerfile Updates

**File:** `Dockerfile`

- Updated to Node 20 Alpine (from Node 18)
- Added OpenSSL 3.x to all stages
- Configured standalone output for Next.js
- Added proper health checks

```dockerfile
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
```

### 2. ✅ Prisma Configuration

**File:** `prisma/schema.prisma`

- Updated binary targets for Alpine Linux with OpenSSL 3.x

```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
  engineType = "library"
}
```

### 3. ✅ Next.js Configuration

**File:** `next.config.js`

- Added `output: 'standalone'` for Docker deployment

```javascript
const nextConfig = {
  output: "standalone", // Required for Docker deployment
  // ... rest of config
};
```

### 4. ✅ Build-Time Environment Variable

**Environment Variable:** `SKIP_ENV_VALIDATION=1`

This variable is used to skip external service connections during build time:

- Redis connection skipped
- Database queries skipped
- External API calls skipped

**Add to Coolify Environment Variables:**

```
SKIP_ENV_VALIDATION=1
```

### 5. ✅ Redis Configuration

**File:** `src/lib/redis.ts`

- Added build-time skip logic
- Configured `maxRetriesPerRequest: null` for BullMQ
- Lazy connection initialization

```typescript
export const getRedis = () => {
  if (process.env.SKIP_ENV_VALIDATION === "1") {
    console.log("⚠️  Redis skipped (build time)");
    return null;
  }
  // ... rest of logic
};
```

### 6. ✅ Queue Configuration

**File:** `src/lib/queue.ts`

- Handle null Redis gracefully
- Skip queue creation during build

```typescript
export const newsAgentQueue = redis
  ? new Queue("news-agent", { connection: redis })
  : null;
```

### 7. ✅ Component Updates

**Files:**

- `src/components/HeaderWrapper.tsx`
- `src/components/Footer.tsx`

Both components now skip database queries during build:

```typescript
if (process.env.SKIP_ENV_VALIDATION === "1") {
  return <Component data={[]} />;
}
```

### 8. ✅ Sitemap Configuration

**Files:**

- `src/app/sitemap.ts`
- `src/app/news-sitemap.xml/route.ts`

Both files have:

- `export const dynamic = "force-dynamic";` - Skip at build time
- Build-time skip logic with `SKIP_ENV_VALIDATION`

### 9. ✅ Worker Updates

**File:** `src/workers/news-agent.worker.ts`

- Handle null Redis and queue gracefully
- Skip worker initialization during build

## Deployment Steps

### 1. Local Build Test

```bash
# Set environment variable
$env:SKIP_ENV_VALIDATION="1"

# Build
npm run build

# If successful, you should see:
# ✓ Compiled successfully
# ✓ Linting and checking validity of types
# ✓ Collecting page data
# ✓ Generating static pages
```

### 2. Docker Build Test

```bash
# Build Docker image
docker build -t ai-news-site .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="your_db_url" \
  -e REDIS_URL="your_redis_url" \
  -e NEXTAUTH_SECRET="your_secret" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  ai-news-site
```

### 3. Coolify Deployment

**Environment Variables to Set:**

```env
# Build-time
SKIP_ENV_VALIDATION=1
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Runtime
DATABASE_URL=postgresql://user:pass@postgres:5432/dbname
REDIS_URL=redis://redis:6379
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_SITE_NAME=AI Haberleri

# Email (Resend)
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@aihaberleri.org

# Firebase (optional)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key

# AI Services (optional)
DEEPSEEK_API_KEY=your-key
BRAVE_API_KEY=your-key
TAVILY_API_KEY=your-key
EXA_API_KEY=your-key
```

## Verification Checklist

After deployment, verify:

- [ ] ✅ Build completes without errors
- [ ] ✅ Container starts successfully
- [ ] ✅ Health check endpoint responds: `/api/health`
- [ ] ✅ Homepage loads correctly
- [ ] ✅ Database connection works
- [ ] ✅ Redis connection works
- [ ] ✅ Categories display in header/footer
- [ ] ✅ Articles load correctly
- [ ] ✅ Admin panel accessible
- [ ] ✅ Email service works
- [ ] ✅ Push notifications work

## Troubleshooting

### Build Still Fails

1. **Check Node Version:**

   ```bash
   docker run --rm node:20-alpine node --version
   # Should output: v20.x.x
   ```

2. **Check OpenSSL Version:**

   ```bash
   docker run --rm node:20-alpine openssl version
   # Should output: OpenSSL 3.x.x
   ```

3. **Verify Prisma Generation:**
   ```bash
   npx prisma generate
   # Should show: linux-musl-openssl-3.0.x
   ```

### Runtime Errors

1. **Database Connection:**
   - Verify `DATABASE_URL` is correct
   - Check if database is accessible from container
   - Test connection: `docker exec -it container-name npx prisma db pull`

2. **Redis Connection:**
   - Verify `REDIS_URL` is correct
   - Check if Redis is accessible from container
   - Test connection: `docker exec -it container-name redis-cli -u $REDIS_URL ping`

3. **Missing Environment Variables:**
   - Check all required env vars are set in Coolify
   - Restart container after adding env vars

## Files Modified

1. ✅ `Dockerfile` - Updated to Node 20 + OpenSSL 3.x
2. ✅ `next.config.js` - Added standalone output
3. ✅ `prisma/schema.prisma` - Updated binary targets
4. ✅ `src/lib/redis.ts` - Build-time skip logic
5. ✅ `src/lib/queue.ts` - Null Redis handling
6. ✅ `src/workers/news-agent.worker.ts` - Null handling
7. ✅ `src/components/HeaderWrapper.tsx` - Build-time skip
8. ✅ `src/components/Footer.tsx` - Build-time skip + TypeScript fixes
9. ✅ `src/app/sitemap.ts` - Force dynamic + build-time skip
10. ✅ `src/app/news-sitemap.xml/route.ts` - Force dynamic + build-time skip

## Next Steps

1. Commit all changes
2. Push to repository
3. Coolify will auto-deploy
4. Monitor build logs
5. Verify deployment with checklist above

## Success Criteria

✅ Build completes in < 5 minutes
✅ No TypeScript errors
✅ No missing module errors
✅ Container starts successfully
✅ All services connect properly
✅ Application is fully functional

---

**Last Updated:** 2026-01-25
**Status:** ✅ Ready for Deployment
