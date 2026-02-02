# 🎨 Pollinations.ai API Migration - Deployment Guide

**Date:** 2026-02-02  
**Status:** ✅ READY FOR DEPLOYMENT  
**Fix:** Query parameter authentication (not Bearer token)

---

## 📋 Summary

Migrated Pollinations.ai image generation from legacy anonymous endpoint to new authenticated API with proper query parameter authentication and error handling.

---

## 🔧 Changes Made

### 1. API Endpoint Migration

- **Old:** `https://image.pollinations.ai/prompt/{prompt}` (legacy anonymous)
- **New:** `https://gen.pollinations.ai/image/{prompt}?key=xxx` (query parameter auth)

### 2. Authentication Method Fix

- **Wrong:** `Authorization: Bearer {key}` header (returns 400 error)
- **Correct:** `?key={key}` query parameter (works!)

### 3. Code Updates (`src/lib/pollinations.ts`)

**Removed:**

- Bearer token authentication (not supported - causes 400 error)
- `nologo` parameter (not supported in new API)
- `flux-realism` default model

**Added:**

- Query parameter API key authentication (`?key=xxx`)
- Proper timeout handling (180s)
- Enhanced retry logic for 502/503/504 errors
- Exponential backoff (2s, 4s, 8s, 15s)
- Anonymous fallback for 4xx errors

**Updated:**

- Authentication: Bearer header → Query parameter `?key=`
- Default model: `flux-realism` → `flux` (more stable)
- Timeout: 120s → 180s (Pollinations can be slow)
- Interface: Removed `nologo` from `PollinationsOptions`

### 4. Environment Configuration

**Added to `.env.example`:**

```bash
POLLINATIONS_API_KEY="pk_sET1VlYd117D84BM"
```

**Added to `.env.production`:**

```bash
POLLINATIONS_API_KEY=pk_sET1VlYd117D84BM
```

**Already in `.env` (local):**

```bash
POLLINATIONS_API_KEY="pk_sET1VlYd117D84BM"
```

### 5. Test Script (`scripts/test-pollinations-api.ts`)

Updated to use query parameter authentication instead of Bearer token.

---

## 🧪 Test Results

```bash
✅ API Key valid:
   Type: publishable
   Name: double-leopard
   Permissions: {"models":null,"account":["profile","balance","usage"]}
   Pollen Budget: Unlimited

✅ Pollen Balance: 0.9998 (decreased from 1.0 - API key is working!)

✅ Available models (16):
   - kontext: FLUX.1 Kontext
   - turbo: SDXL Turbo
   - flux: FLUX.1 (default)
   ... and 13 more

✅ Image generated successfully!
   Content-Type: image/jpeg
   Size: 109 KB
   URL: https://gen.pollinations.ai/image/...?key=pk_sET1VlYd117D84BM
```

---

## 🚀 Deployment Steps

### 1. Update Environment Variables in Coolify

Add to your Coolify environment variables:

```bash
POLLINATIONS_API_KEY=pk_sET1VlYd117D84BM
```

### 2. Deploy Updated Code

```bash
git add src/lib/pollinations.ts scripts/test-pollinations-api.ts
git add .env.production .env.example
git add POLLINATIONS-API-FIX-DEPLOYMENT.md IMAGE-GENERATION-FIX-SUMMARY.md
git commit -m "fix: use query parameter auth for Pollinations.ai API (not Bearer token)"
git push origin main
```

Or use the deployment script:

```powershell
.\deploy-image-fix.ps1
```

### 3. Verify in Production

After deployment, check logs for:

```
🔑 Pollinations.ai API key ile görsel üretiliyor...
📝 Prompt: ...
🎨 Authenticated URL (key=***): https://gen.pollinations.ai/image/...
✅ Pollinations.ai görsel başarıyla oluşturuldu (authenticated)
```

### 4. Monitor Error Rates

Watch for these patterns:

- ✅ No more 400 errors from authenticated endpoint
- ✅ Reduced 502 errors (better retry logic)
- ⚠️ `Prompt too long` → Auto-truncates to 800 chars

---

## 🔍 Error Handling Strategy

### Retry Logic

1. **502/503/504 errors:** Retry with exponential backoff (2s, 4s, 8s, 15s)
2. **4xx errors:** Immediately fallback to anonymous endpoint
3. **Timeout:** 180s timeout with abort controller
4. **Max retries:** 3 attempts before fallback

### Fallback Chain

```
Authenticated API (?key=xxx)
  ↓ (on 4xx error)
Anonymous API (no key)
  ↓ (on failure)
Static fallback image (/logos/og-image.png)
```

---

## 📊 API Key Details

- **Type:** Publishable key
- **Name:** double-leopard
- **Key:** pk_sET1VlYd117D84BM
- **Pollen Balance:** 0.9998 (Unlimited budget)
- **Permissions:** Models, account profile, balance, usage
- **Rate Limits:** Higher than anonymous
- **Authentication:** Query parameter `?key=xxx` (NOT Bearer token)

---

## 🐛 Fixed Issues

### Issue 1: Next.js Image 400 Error

**Problem:** Self-referencing URL causing optimization loop

```
https://aihaberleri.org/_next/image?url=https%3A%2F%2Faihaberleri.org%2Flogos%2Fog-image.png
```

**Solution:** Changed fallback from full URL to direct path

```typescript
// Before
const fallbackUrl = `${baseUrl}/logos/og-image.png`;

// After
const fallbackUrl = "/logos/og-image.png";
```

### Issue 2: Pollinations.ai 400 Error (Authentication)

**Problem:** Using Bearer token authentication

```
Authorization: Bearer pk_sET1VlYd117D84BM
Status: 400 Bad Request
```

**Solution:** Changed to query parameter authentication

```typescript
// Before (WRONG - returns 400)
const response = await fetch(imageUrl, {
  headers: {
    Authorization: `Bearer ${POLLINATIONS_API_KEY}`,
  },
});

// After (CORRECT - works!)
const imageUrl = `${POLLINATIONS_GEN_URL}/${encodedPrompt}?key=${POLLINATIONS_API_KEY}`;
const response = await fetch(imageUrl);
```

### Issue 3: Pollinations.ai 502 Error

**Problem:** Service temporarily down or rate limit hit

```
❌ Pollinations.ai failed after 3 attempts: Error: HTTP error! status: 502
```

**Solution:**

- Increased timeout from 120s to 180s
- Added exponential backoff retry logic
- Migrated to authenticated endpoint for better rate limits
- Added anonymous fallback for 4xx errors

---

## 📝 Files Modified

1. `src/lib/pollinations.ts` - Fixed authentication method (Bearer → query param)
2. `scripts/test-pollinations-api.ts` - Updated test to use query param
3. `.env.example` - Added API key
4. `.env.production` - Added API key
5. `.env` - Already had API key

---

## ✅ Verification Checklist

- [x] API key tested and validated
- [x] Image generation working with query param auth
- [x] Retry logic tested
- [x] Fallback strategy tested
- [x] Environment variables updated
- [x] Test script updated
- [x] Documentation updated
- [x] Pollen balance decreasing (API key is being used)
- [ ] Deployed to production
- [ ] Production logs verified
- [ ] Error rates monitored

---

## 🎯 Expected Improvements

1. **No more 400 errors** from authenticated endpoint (fixed auth method)
2. **Higher rate limits** with authenticated API
3. **Better error recovery** with retry logic
4. **Faster fallback** for 4xx errors
5. **Reduced 502 errors** with longer timeout and retries
6. **No more Next.js image loop** from fallback fix

---

## 📞 Support

If issues persist after deployment:

1. Check Pollinations.ai status: https://pollinations.ai/
2. Verify API key in Coolify environment variables
3. Check production logs for error patterns
4. Test with: `npx tsx scripts/test-pollinations-api.ts`
5. Monitor pollen balance: https://gen.pollinations.ai/account/balance

---

## 🔑 Key Learnings

**CRITICAL:** Pollinations.ai new API uses **query parameter authentication**, NOT Bearer token!

```bash
# ❌ WRONG (returns 400)
curl 'https://gen.pollinations.ai/image/test' \
  -H 'Authorization: Bearer pk_xxx'

# ✅ CORRECT (works!)
curl 'https://gen.pollinations.ai/image/test?key=pk_xxx'
```

---

**Ready for deployment! 🚀**
