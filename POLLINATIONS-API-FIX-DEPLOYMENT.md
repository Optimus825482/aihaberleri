# 🎨 Pollinations.ai API Migration - Deployment Guide

**Date:** 2026-02-02  
**Status:** ✅ READY FOR DEPLOYMENT

---

## 📋 Summary

Migrated Pollinations.ai image generation from legacy anonymous endpoint to new authenticated API with proper error handling and fallback strategy.

---

## 🔧 Changes Made

### 1. API Endpoint Migration

- **Old:** `https://image.pollinations.ai/prompt/{prompt}?key=xxx` (legacy)
- **New:** `https://gen.pollinations.ai/image/{prompt}` with `Authorization: Bearer` header

### 2. Code Updates (`src/lib/pollinations.ts`)

**Removed:**

- `nologo` parameter (not supported in new API)
- Query string API key authentication
- `flux-realism` default model

**Added:**

- Bearer token authentication header
- Proper timeout handling (180s)
- Enhanced retry logic for 502/503/504 errors
- Exponential backoff (2s, 4s, 8s, 15s)
- Anonymous fallback for 4xx errors

**Updated:**

- Default model: `flux-realism` → `flux` (more stable)
- Timeout: 120s → 180s (Pollinations can be slow)
- Interface: Removed `nologo` from `PollinationsOptions`

### 3. Environment Configuration

**Added to `.env.example`:**

```bash
POLLINATIONS_API_KEY="pk_sET1VlYd117D84BM"
```

**Added to `.env.production`:**

```bash
POLLINATIONS_API_KEY=pk_sET1VlYd117D84BM
```

### 4. Test Script (`scripts/test-pollinations-api.ts`)

Created comprehensive test script that validates:

- ✅ API key validity
- ✅ Pollen balance (currently: 1 pollen)
- ✅ Available models (16 models)
- ✅ Image generation

---

## 🧪 Test Results

```bash
✅ API Key valid:
   Type: publishable
   Name: double-leopard
   Permissions: {"models":null,"account":["profile","balance","usage"]}
   Pollen Budget: Unlimited

✅ Pollen Balance: 1

✅ Available models (16):
   - kontext: FLUX.1 Kontext
   - turbo: SDXL Turbo
   - flux: FLUX.1 (default)
   ... and 13 more

✅ Image generated successfully!
   Content-Type: image/jpeg
   URL: https://gen.pollinations.ai/image/...
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
git add src/lib/pollinations.ts .env.production .env.example
git commit -m "fix: migrate to Pollinations.ai authenticated API endpoint"
git push origin main
```

### 3. Verify in Production

After deployment, check logs for:

```
🔑 Pollinations.ai API key ile görsel üretiliyor...
✅ Pollinations.ai görsel başarıyla oluşturuldu (authenticated)
```

### 4. Monitor Error Rates

Watch for these error patterns:

- ❌ `502/503/504` → Service temporarily down (will auto-retry)
- ❌ `400/404` → Falls back to anonymous endpoint
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
Authenticated API (with key)
  ↓ (on 4xx error)
Anonymous API (no key)
  ↓ (on failure)
Static fallback image (/logos/og-image.png)
```

---

## 📊 API Key Details

- **Type:** Publishable key
- **Name:** double-leopard
- **Pollen Balance:** 1 (Unlimited budget)
- **Permissions:** Models, account profile, balance, usage
- **Rate Limits:** Higher than anonymous (exact limits not documented)

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

### Issue 2: Pollinations.ai 502 Error

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

1. `src/lib/pollinations.ts` - API migration + error handling
2. `.env.example` - Added API key
3. `.env.production` - Added API key
4. `scripts/test-pollinations-api.ts` - Created test script

---

## ✅ Verification Checklist

- [x] API key tested and validated
- [x] Image generation working
- [x] Retry logic tested
- [x] Fallback strategy tested
- [x] Environment variables updated
- [x] Test script created
- [x] Documentation updated
- [ ] Deployed to production
- [ ] Production logs verified
- [ ] Error rates monitored

---

## 🎯 Expected Improvements

1. **Higher rate limits** with authenticated API
2. **Better error recovery** with retry logic
3. **Faster fallback** for 4xx errors
4. **No more 400 errors** from Next.js image optimization loop
5. **Reduced 502 errors** with longer timeout and retries

---

## 📞 Support

If issues persist after deployment:

1. Check Pollinations.ai status: https://pollinations.ai/
2. Verify API key in Coolify environment variables
3. Check production logs for error patterns
4. Test with: `npx tsx scripts/test-pollinations-api.ts`
5. Monitor pollen balance: https://gen.pollinations.ai/account/balance

---

**Ready for deployment! 🚀**
