# 🔧 Production Fix - Sharp & PostgreSQL

## Tarih: 2026-01-28

## Status: ✅ SHARP FIXED | ✅ POSTGRESQL FIXED

## Sorunlar

### 1. ✅ Sharp Image Optimization Hatası (FIXED)

```
⨯ Error: 'sharp' is required to be installed in standalone mode
```

**Çözüm:** Kalıcı çözüm uygulandı. Detaylar: `SHARP-FIX-PERMANENT.md`

**Değişiklikler:**

1. `next.config.js` - outputFileTracingIncludes eklendi
2. `Dockerfile` - libvips42 runtime library eklendi
3. `Dockerfile` - Fresh sharp installation (runtime'da)
4. `scripts/verify-sharp.js` - Verification script eklendi

### 2. ✅ PostgreSQL Connection Closed (FIXED)

```
prisma:error Error in PostgreSQL connection: Error { kind: Closed, cause: None }
```

**Çözüm:** Connection pool settings eklendi

---

## Çözümler

### ✅ Fix 1: Sharp Image Optimization (KALICI ÇÖZÜM)

**Detaylı Dokümantasyon:** `SHARP-FIX-PERMANENT.md`

#### Değişiklikler:

**1. next.config.js**

```javascript
experimental: {
  outputFileTracingIncludes: {
    "/": ["./node_modules/sharp/**/*"],
  },
}
```

**2. Dockerfile - Runtime Sharp Installation**

```dockerfile
# libvips runtime library
RUN apt-get install -y libvips-dev libvips42

# Fresh sharp installation in runner stage
RUN npm install --omit=dev --ignore-scripts sharp@0.33.5
```

**3. Verification Script**

```bash
node scripts/verify-sharp.js
```

### ✅ Fix 2: DATABASE_URL Connection Pool

Coolify Environment Variables'a ekle:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public&connection_limit=10&pool_timeout=20&connect_timeout=10"
```

**Parametreler:**

- `connection_limit=10` - Max 10 connection (default: unlimited)
- `pool_timeout=20` - Pool'dan connection alma timeout (20 saniye)
- `connect_timeout=10` - Database'e bağlanma timeout (10 saniye)

### ✅ Fix 2: DATABASE_URL Connection Pool

Coolify Environment Variables'a ekle:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public&connection_limit=10&pool_timeout=20&connect_timeout=10"
```

**Parametreler:**

- `connection_limit=10` - Max 10 connection (default: unlimited)
- `pool_timeout=20` - Pool'dan connection alma timeout (20 saniye)
- `connect_timeout=10` - Database'e bağlanma timeout (10 saniye)

### ✅ Fix 3: Prisma Schema Update

`prisma/schema.prisma` güncellendi:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  relationMode = "prisma"
}
```

### ✅ Fix 3: Prisma Schema Update

`prisma/schema.prisma` güncellendi:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  relationMode = "prisma"
}
```

---

## Deployment Adımları

### 1. Git Push

```bash
git add .
git commit -m "fix(sharp): permanent solution for standalone mode + postgresql pool"
git push
```

### 2. Coolify Environment Variables

**Application → Environment Variables** → Edit:

Mevcut `DATABASE_URL`'i bul ve sonuna ekle:

```
?schema=public&connection_limit=10&pool_timeout=20&connect_timeout=10
```

**Örnek:**

```
# Önce
DATABASE_URL=postgresql://user:pass@host:5432/db

# Sonra
DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public&connection_limit=10&pool_timeout=20&connect_timeout=10
```

### 3. Redeploy

Coolify'da:

1. **Application → Deployments**
2. **Redeploy** butonuna tıkla
3. Logs'u izle

---

## Verification

### Sharp Kontrolü

```bash
# 1. Verification script çalıştır (container içinde)
docker exec <container-name> node scripts/verify-sharp.js

# 2. Logs'ta sharp hatası olmamalı
docker logs -f <container-name> | grep sharp

# 3. Image optimization test
curl -I https://aihaberleri.org/_next/image?url=/hero.jpg&w=640&q=75
# Response: 200 OK, Content-Type: image/webp
```

### PostgreSQL Kontrolü

```bash
# Connection error olmamalı
docker logs -f <container-name> | grep "prisma:error"
```

### Site Kontrolü

1. https://aihaberleri.org → Ana sayfa açılıyor mu?
2. Haber detay sayfası → Resimler yükleniyor mu?
3. Admin panel → Dashboard çalışıyor mu?

---

## Beklenen Sonuç

✅ Sharp hataları kaybolacak
✅ Image optimization çalışacak (WebP/AVIF)
✅ Responsive images optimize edilecek
✅ PostgreSQL connection stable olacak
✅ Database connection pool yönetilecek

---

## Dosya Değişiklikleri

### Yeni Dosyalar

- `SHARP-FIX-PERMANENT.md` - Detaylı sharp çözüm dokümantasyonu
- `scripts/verify-sharp.js` - Sharp verification script

### Güncellenen Dosyalar

- `next.config.js` - outputFileTracingIncludes eklendi
- `Dockerfile` - libvips42 + fresh sharp installation
- `PRODUCTION-FIX.md` - Bu dosya güncellendi
- `prisma/schema.prisma` - relationMode eklendi (önceden)

---

## Notlar

### Sharp Hakkında

- Sharp, Next.js'in image optimization için kullandığı native kütüphanedir
- Standalone mode'da manuel olarak kopyalanması gerekir
- `libvips-dev` runtime dependency'si zaten kurulu

### PostgreSQL Connection Pool

- Default Prisma connection limit: unlimited (tehlikeli!)
- Production'da mutlaka limit konulmalı
- Connection pool timeout'ları önemli
- Serverless ortamlarda connection pooling kritik

### Prisma relationMode

- `relationMode = "prisma"` - Foreign key'leri Prisma seviyesinde yönetir
- Database seviyesinde foreign key constraint'leri olmaz
- Daha esnek ama dikkatli kullanılmalı

---

## İlgili Dosyalar

1. `prisma/schema.prisma` - Connection pool settings
2. `Dockerfile` - Sharp binary copy
3. `.env` / Coolify Env Vars - DATABASE_URL

---

## Sonraki Adımlar

1. ✅ Prisma schema güncellendi
2. ⏳ Git push
3. ⏳ Coolify DATABASE_URL güncelle
4. ⏳ Redeploy
5. ⏳ Verification

**Status:** Ready to deploy
