# 🔧 Production Fix - Sharp & PostgreSQL

## Tarih: 2026-01-28

## Sorunlar

### 1. Sharp Image Optimization Hatası

```
⨯ Error: 'sharp' is required to be installed in standalone mode
```

### 2. PostgreSQL Connection Closed

```
prisma:error Error in PostgreSQL connection: Error { kind: Closed, cause: None }
```

---

## Çözümler

### ✅ Fix 1: DATABASE_URL Connection Pool

Coolify Environment Variables'a ekle:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public&connection_limit=10&pool_timeout=20&connect_timeout=10"
```

**Parametreler:**

- `connection_limit=10` - Max 10 connection (default: unlimited)
- `pool_timeout=20` - Pool'dan connection alma timeout (20 saniye)
- `connect_timeout=10` - Database'e bağlanma timeout (10 saniye)

### ✅ Fix 2: Prisma Schema Update

`prisma/schema.prisma` güncellendi:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  relationMode = "prisma"
}
```

### ✅ Fix 3: Sharp Binary (Zaten Yapıldı)

Dockerfile'da:

```dockerfile
# Copy sharp native binaries for standalone mode
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp
```

---

## Deployment Adımları

### 1. Git Push

```bash
git add prisma/schema.prisma PRODUCTION-FIX.md
git commit -m "fix: add prisma connection pool settings"
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
# Logs'ta sharp hatası olmamalı
docker logs -f <container-name> | grep sharp
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
✅ PostgreSQL connection stable olacak
✅ Resimler optimize edilecek
✅ Database connection pool yönetilecek

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
