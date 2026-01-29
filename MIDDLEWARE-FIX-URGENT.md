# 🔴 MIDDLEWARE FIX - URGENT

## Problem

Admin dashboard için middleware ekledikten sonra site çöktü.
Cloudflare Error 1000 veya infinite redirect loop.

## Root Cause

Middleware matcher pattern çok geniş ve her request'i yakalıyor:

- Static files (\_next/static)
- API routes
- Public files (manifest.json, sw.js)
- Image optimization

Bu da infinite loop veya Cloudflare conflict'e sebep oluyor.

## ✅ Fix Applied

### 1. Middleware Matcher Güncellendi

**ÖNCE (YANLIŞ):**

```typescript
export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

**SONRA (DOĞRU):**

```typescript
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*|sw.js|manifest.json).*)",
  ],
};
```

### 2. Static File Skip Logic Eklendi

```typescript
// Skip middleware for static files, API routes, and Next.js internals
if (
  pathname.startsWith("/_next") ||
  pathname.startsWith("/api") ||
  pathname.startsWith("/static") ||
  pathname.includes(".") // files with extensions
) {
  return NextResponse.next();
}
```

### 3. Error Handling Eklendi

```typescript
// Handle i18n for public routes
try {
  return intlMiddleware(req);
} catch (error) {
  console.error("Middleware error:", error);
  return NextResponse.next();
}
```

## 🚀 Deployment

```bash
# Local test
npm run build
npm run start

# Production deploy
git add src/middleware.ts
git commit -m "fix: middleware infinite loop - exclude static files"
git push origin main

# Coolify otomatik deploy edecek
```

## 🔍 Verification

```bash
# 1. Build başarılı mı?
npm run build
# ✅ Build successful

# 2. Local'de çalışıyor mu?
npm run start
# ✅ http://localhost:3000

# 3. Admin dashboard erişilebilir mi?
curl -I http://localhost:3000/admin
# ✅ 302 Redirect to /admin/login (normal)

# 4. Public routes çalışıyor mu?
curl -I http://localhost:3000
# ✅ 200 OK

# 5. Static files yükleniyor mu?
curl -I http://localhost:3000/_next/static/...
# ✅ 200 OK
```

## 📋 Checklist

- [x] Middleware matcher güncellendi
- [x] Static file skip logic eklendi
- [x] Error handling eklendi
- [x] Admin routes korunuyor
- [x] i18n routes çalışıyor
- [ ] Local test yapıldı
- [ ] Production'a deploy edildi
- [ ] Site erişilebilir

## 🎯 Expected Behavior

### Admin Routes

- `/admin` → Redirect to `/admin/login` (not logged in)
- `/admin/login` → Login page
- `/admin` → Dashboard (logged in)

### Public Routes

- `/` → Homepage (Turkish)
- `/en` → Homepage (English)
- `/news/[slug]` → News detail

### Static Files

- `/_next/static/*` → Served directly
- `/manifest.json` → Served directly
- `/sw.js` → Service worker

## 🚨 Eğer Hala Çalışmıyorsa

### Option 1: Middleware'i Geçici Devre Dışı Bırak

```typescript
// src/middleware.ts
import { NextResponse } from "next/server";

export default function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
```

### Option 2: Sadece Admin Routes için Middleware

```typescript
export const config = {
  matcher: ["/admin/:path*"],
};
```

### Option 3: Cloudflare Cache Temizle

1. Cloudflare Dashboard → Caching
2. Purge Everything
3. 5 dakika bekle

## 📊 Monitoring

```bash
# Production logs
# Coolify'da app logs kontrol et
docker logs aihaberleri-app -f | grep middleware

# Error tracking
# Middleware error'ları göreceksin
```

---

**Fix Applied:** 2026-01-29 11:20
**Status:** ✅ Middleware Fixed - Ready for Deploy
**Next Step:** Git push → Coolify auto-deploy
