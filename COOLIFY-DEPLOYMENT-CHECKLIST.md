# Coolify Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Code Changes (COMPLETED)

- [x] Updated Dockerfile to Node 20 Alpine
- [x] Added OpenSSL 3.x support
- [x] Configured standalone output in next.config.js
- [x] Updated Prisma binary targets
- [x] Added build-time skip logic to all components
- [x] Added force-dynamic to pages with DB queries
- [x] Local build test passed

### 2. Environment Variables (TO BE SET IN COOLIFY)

**Required Build-Time Variables:**

```env
SKIP_ENV_VALIDATION=1
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

**Required Runtime Variables:**

```env
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/dbname

# Redis
REDIS_URL=redis://redis:6379

# NextAuth
NEXTAUTH_SECRET=your-secret-here-min-32-chars
NEXTAUTH_URL=https://aihaberleri.org

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://aihaberleri.org
NEXT_PUBLIC_SITE_NAME=AI Haberleri

# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@aihaberleri.org

# Firebase (for Push Notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# AI Services (Optional but recommended)
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxx
BRAVE_API_KEY=BSA-xxxxxxxxxxxxx
TAVILY_API_KEY=tvly-xxxxxxxxxxxxx
EXA_API_KEY=exa-xxxxxxxxxxxxx

# Agent Configuration (Optional)
AGENT_MIN_INTERVAL_HOURS=5
AGENT_MAX_ARTICLES=10
```

### 3. Coolify Configuration

**Build Settings:**

- Build Command: `npm run build`
- Start Command: `node server.js`
- Port: `3000`
- Health Check Path: `/api/health`

**Docker Settings:**

- Dockerfile: `Dockerfile` (in root)
- Build Context: `.`

**Resource Limits (Recommended):**

- Memory: 1GB minimum, 2GB recommended
- CPU: 1 core minimum, 2 cores recommended

## 🚀 Deployment Steps

### Step 1: Push Code to Repository

```bash
git add -A
git commit -m "Ready for production deployment"
git push origin main
```

✅ **COMPLETED**

### Step 2: Configure Coolify Project

1. Go to Coolify Dashboard
2. Select your project
3. Go to "Environment Variables" section
4. Add all required environment variables from the list above
5. Make sure `SKIP_ENV_VALIDATION=1` is set for build time

### Step 3: Trigger Deployment

1. Go to "Deployments" tab
2. Click "Deploy" button
3. Monitor build logs for any errors

### Step 4: Monitor Build Process

Watch for these success indicators:

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
⚠️  Redis skipped (build time)  <- This is expected
✓ Generating static pages
✓ Collecting build traces
✓ Finalizing page optimization
```

### Step 5: Verify Deployment

After deployment completes, verify:

1. **Health Check:**

   ```bash
   curl https://aihaberleri.org/api/health
   # Should return: {"status":"ok"}
   ```

2. **Homepage:**
   - Visit https://aihaberleri.org
   - Check if page loads correctly
   - Verify categories in header
   - Check footer links

3. **Database Connection:**
   - Check if articles are displayed
   - Verify categories work
   - Test navigation

4. **Redis Connection:**
   - Check application logs for Redis connection
   - Verify no Redis errors in logs

5. **Admin Panel:**
   - Visit https://aihaberleri.org/admin
   - Try logging in
   - Check if dashboard loads

## 🔍 Troubleshooting

### Build Fails with "Module not found"

**Solution:** Make sure `output: 'standalone'` is in `next.config.js`

### Build Fails with "Can't reach database"

**Solution:** Verify `SKIP_ENV_VALIDATION=1` is set in build environment

### Build Fails with "OpenSSL error"

**Solution:** Dockerfile already updated to use OpenSSL 3.x, rebuild from scratch

### Runtime Error: "Redis connection failed"

**Solution:** Check `REDIS_URL` environment variable and Redis service status

### Runtime Error: "Database connection failed"

**Solution:** Check `DATABASE_URL` and ensure database is accessible

### Pages Show "Loading..." Forever

**Solution:** This means `SKIP_ENV_VALIDATION` is still set at runtime. Remove it from runtime environment (only needed for build)

## 📊 Post-Deployment Verification

### 1. Functional Tests

- [ ] Homepage loads
- [ ] Articles display correctly
- [ ] Categories work
- [ ] Search works (if implemented)
- [ ] Admin panel accessible
- [ ] Login works
- [ ] Article creation works

### 2. Performance Tests

- [ ] Page load time < 3 seconds
- [ ] Time to First Byte (TTFB) < 500ms
- [ ] Lighthouse score > 90

### 3. SEO Tests

- [ ] Sitemap accessible: `/sitemap.xml`
- [ ] News sitemap accessible: `/news-sitemap.xml`
- [ ] Robots.txt accessible: `/robots.txt`
- [ ] Meta tags present on all pages
- [ ] Open Graph tags working

### 4. Email Tests

```bash
# Test email service
curl -X POST https://aihaberleri.org/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### 5. Push Notification Tests

- [ ] Service worker registers
- [ ] Push notification permission prompt works
- [ ] Test notification sends successfully

## 🎉 Success Criteria

Deployment is successful when:

- ✅ Build completes without errors
- ✅ Application starts successfully
- ✅ Health check returns 200 OK
- ✅ Homepage loads correctly
- ✅ Database queries work
- ✅ Redis connection established
- ✅ No errors in application logs
- ✅ All functional tests pass

## 📝 Notes

- **Build Time:** Approximately 3-5 minutes
- **First Deployment:** May take longer due to dependency installation
- **Subsequent Deployments:** Faster due to Docker layer caching
- **Zero Downtime:** Coolify supports blue-green deployment

## 🆘 Support

If deployment fails after following all steps:

1. Check Coolify build logs
2. Check application logs
3. Verify all environment variables are set correctly
4. Ensure database and Redis are running
5. Contact support with error logs

---

**Last Updated:** 2026-01-25
**Status:** ✅ Ready for Deployment
**Build Test:** ✅ Passed
**Local Test:** ✅ Passed
