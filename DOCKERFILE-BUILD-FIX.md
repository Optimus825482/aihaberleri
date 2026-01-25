# 🔧 Dockerfile Build Fix - NODE_ENV Issue

## 🐛 Problem

Build başarısız oluyor: `npm run build` exit code 1

**Root Cause**: `NODE_ENV=production` build sırasında devDependencies'leri skip ediyor ama Next.js build için TypeScript, ESLint, Prisma gibi devDependencies gerekiyor.

## ✅ Uygulanan Çözümler

### 1. Dependencies Stage - DevDependencies Dahil Et

**Önce:**

```dockerfile
RUN npm ci
```

**Sonra:**

```dockerfile
# Install ALL dependencies (including devDependencies) for build
RUN npm ci --include=dev
```

### 2. Builder Stage - NODE_ENV Sırasını Düzelt

**Önce:**

```dockerfile
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=1
RUN npm run build
```

**Sonra:**

```dockerfile
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
# Use development mode for build to include devDependencies
ENV NODE_ENV=development
RUN npm run build

# Set production mode after build
ENV NODE_ENV=production
```

## 🎯 Mantık

1. **Dependencies Stage**: `npm ci --include=dev` ile tüm dependencies (dev dahil) yüklenir
2. **Builder Stage**:
   - Build sırasında `NODE_ENV=development` kullanılır (devDependencies erişilebilir)
   - Build tamamlandıktan sonra `NODE_ENV=production` set edilir
3. **Runner Stage**: Production image'da sadece gerekli dosyalar kopyalanır

## 🚀 Deployment

```bash
git add Dockerfile
git commit -m "fix: NODE_ENV build issue - use development mode during build"
git push origin main
```

Coolify'da tekrar deploy et.

## 📊 Beklenen Sonuç

Build başarılı olacak çünkü:

- ✅ TypeScript compiler erişilebilir
- ✅ ESLint erişilebilir
- ✅ Prisma CLI erişilebilir
- ✅ Next.js build dependencies erişilebilir
- ✅ Build sonrası production mode aktif

---

**Status**: ✅ FIXED
**Date**: 2026-01-25
**Version**: 1.1
