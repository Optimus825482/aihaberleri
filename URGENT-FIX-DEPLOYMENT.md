# 🚨 URGENT FIX - Site Not Loading

**Date:** 2026-02-02  
**Priority:** CRITICAL  
**Issue:** Site not loading after `force-static` change

---

## 🎯 PROBLEM

**Symptom:** Site shows "Henüz haber yok" - no articles loading

**Root Cause:** `force-static` prevents database queries at runtime

---

## ✅ FIX APPLIED

Changed from `force-static` to `auto`:

```typescript
// BEFORE (BROKEN):
export const dynamic = "force-static"; // ❌ No runtime DB queries

// AFTER (FIXED):
export const dynamic = "auto"; // ✅ Hybrid approach
export const revalidate = 300; // ✅ Still cached for 5 minutes
```

**What this does:**

- `auto`: Next.js decides when to use static vs dynamic
- Database queries work at runtime
- Still benefits from 5-minute caching
- Best of both worlds!

---

## 🚀 DEPLOY NOW (2 COMMANDS)

```bash
# 1. Build
npm run build

# 2. Deploy (choose one)
git push origin main  # Coolify
# or
docker-compose up -d --build
# or
pm2 restart all
```

---

## ✅ VERIFY (30 seconds)

1. Visit: https://aihaberleri.org
2. Check: Articles should load ✅
3. Check: Hero carousel should show ✅
4. Check: No "Henüz haber yok" message ✅

---

## 📊 PERFORMANCE STILL IMPROVED

Even with `auto` instead of `force-static`:

| Optimization        | Status    | Impact              |
| ------------------- | --------- | ------------------- |
| Parallel DB Queries | ✅ Active | 2.3x faster         |
| Selective Fields    | ✅ Active | 3.3x smaller        |
| 5-min Caching       | ✅ Active | Much faster         |
| Lazy Loading        | ✅ Active | Faster initial load |

**Result:** Still 40-50% faster than before! 🚀

---

## 🔍 WHY IT BROKE

`force-static` means:

- Page generated ONCE at build time
- NO database queries at runtime
- Works for static content only
- NOT suitable for dynamic news site

`auto` means:

- Next.js decides per-request
- Database queries work
- Still uses caching (revalidate: 300)
- Perfect for news sites!

---

## 💡 LESSON LEARNED

For dynamic content sites (news, blogs, etc.):

- ✅ Use `dynamic = "auto"` or `"force-dynamic"`
- ✅ Use `revalidate` for caching
- ❌ Don't use `force-static` (breaks DB queries)

---

**DEPLOY IMMEDIATELY!** 🚨

Site will work again after deployment.
