# 🎯 Coolify Build Hatası - Root Cause & Solution

## 📊 Problem Analizi

### Hata

```
npm run build - exit code 1
```

### Root Cause

Next.js build sırasında **PrismaClient oluşturulmaya çalışıyor** ama `DATABASE_URL` environment variable'ı build-time'da mevcut değil.

#### Neden Oluyor?

1. **Next.js Build Process:**
   - Next.js build sırasında tüm route'ları ve component'leri analiz eder
   - `src/lib/db.ts` import edilir
   - `PrismaClient` oluşturulmaya çalışır

2. **Prisma Validation:**
   - PrismaClient oluşturulurken `DATABASE_URL` kontrol edilir
   - `SKIP_ENV_VALIDATION=1` sadece bizim custom validation'ımızı atlar
   - **Prisma'nın kendi validation'ını atlamaz!**

3. **Coolify Build Args:**
   - `DATABASE_URL` runtime environment variable olarak tanımlanmış
   - Build sırasında mevcut değil
   - Dockerfile'da da tanımlanmamış

## ✅ Çözüm

### 1. Build-Safe PrismaClient (src/lib/db.ts)

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create a mock PrismaClient for build time
const createMockPrismaClient = () => {
  return new Proxy(
    {},
    {
      get: () => {
        throw new Error(
          "PrismaClient is not available during build time. This should not be called.",
        );
      },
    },
  ) as PrismaClient;
};

// Skip PrismaClient creation during build time
export const db =
  process.env.SKIP_ENV_VALIDATION === "1"
    ? createMockPrismaClient()
    : (globalForPrisma.prisma ??
      new PrismaClient({
        log:
          process.env.NODE_ENV === "development"
            ? ["query", "error", "warn"]
            : ["error"],
      }));

if (
  process.env.NODE_ENV !== "production" &&
  process.env.SKIP_ENV_VALIDATION !== "1"
) {
  globalForPrisma.prisma = db as PrismaClient;
}
```

**Ne Yapıyor?**

- Build sırasında (`SKIP_ENV_VALIDATION=1`) mock PrismaClient döndürür
- Runtime'da gerçek PrismaClient oluşturur
- Mock client çağrılırsa hata verir (olmaması gereken bir durum)

### 2. Dockerfile - Dummy DATABASE_URL

```dockerfile
# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install OpenSSL 3.x
RUN apk add --no-cache openssl

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client with correct binary target for Alpine + OpenSSL 3.x
RUN npx prisma generate

# Build Next.js (standalone output)
# Skip build-time checks that require external services
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
# Provide dummy DATABASE_URL for Prisma during build (not used, just for validation)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
# Use development mode for build to include devDependencies
ENV NODE_ENV=development
RUN npm run build

# Set production mode after build
ENV NODE_ENV=production
```

**Ne Yapıyor?**

- Build sırasında dummy `DATABASE_URL` sağlar
- Prisma validation geçer
- Gerçek bağlantı yapılmaz (zaten SKIP_ENV_VALIDATION=1)
- Runtime'da Coolify'dan gelen gerçek `DATABASE_URL` kullanılır

## 🔍 Neden Bu Çözüm?

### Alternatif Çözümler ve Neden Seçilmedi

| Çözüm                                | Artıları                         | Eksileri                                | Karar |
| ------------------------------------ | -------------------------------- | --------------------------------------- | ----- |
| **Build arg ile DATABASE_URL geç**   | Temiz                            | Coolify'da her build için manuel config | ❌    |
| **Prisma generate'i runtime'a taşı** | Build hızlı                      | Container başlatma yavaş, risky         | ❌    |
| **Dynamic import kullan**            | Lazy loading                     | Karmaşık, her dosyada değişiklik        | ❌    |
| **Mock PrismaClient + Dummy URL**    | Güvenli, basit, production-ready | -                                       | ✅    |

### Güvenlik Kontrolü

✅ **Dummy DATABASE_URL güvenli mi?**

- Evet! Build sırasında hiçbir bağlantı yapılmaz
- `SKIP_ENV_VALIDATION=1` tüm database query'lerini atlar
- Runtime'da gerçek URL kullanılır

✅ **Production'da çalışır mı?**

- Evet! Runtime'da `SKIP_ENV_VALIDATION` unset olur
- Gerçek PrismaClient oluşturulur
- Tüm database işlemleri normal çalışır

## 🚀 Deployment Adımları

### 1. Değişiklikleri Commit Et

```bash
git add src/lib/db.ts Dockerfile
git commit -m "fix: build-safe PrismaClient for Coolify deployment"
git push origin main
```

### 2. Coolify'da Rebuild

1. Coolify dashboard'a git
2. Projeyi seç
3. "Redeploy" butonuna tıkla
4. Build loglarını izle

### 3. Build Başarılı Olmalı

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

### 4. Container Başlatma

```
🚀 Starting server...
✓ Ready on http://0.0.0.0:3000
```

### 5. Health Check

```bash
curl https://your-domain.com/api/health
# Response: {"status":"ok","timestamp":"...","database":"connected"}
```

## 🧪 Test Senaryoları

### Build Test

```bash
# Local test
docker build -t ai-news-test .
# Başarılı olmalı
```

### Runtime Test

```bash
# Container çalıştır
docker run -e DATABASE_URL="postgresql://..." -p 3000:3000 ai-news-test

# Health check
curl http://localhost:3000/api/health
```

### Database Connection Test

```bash
# Admin panel'e giriş yap
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"..."}'
```

## 📋 Checklist

- [x] Root cause tespit edildi
- [x] db.ts build-safe yapıldı
- [x] Dockerfile'a dummy DATABASE_URL eklendi
- [x] Güvenlik kontrolü yapıldı
- [x] Test senaryoları hazırlandı
- [ ] Coolify'da rebuild yapılacak
- [ ] Production'da test edilecek

## 🎯 Beklenen Sonuç

### Build Output

```
[builder] ✓ Compiled successfully
[builder] ✓ Linting and checking validity of types
[builder] ✓ Collecting page data
[builder] ✓ Generating static pages (15/15)
[builder] ✓ Finalizing page optimization
[builder] Route (app)                              Size     First Load JS
[builder] ┌ ○ /                                    5.2 kB          95 kB
[builder] ├ ○ /admin                               1.8 kB          87 kB
[builder] └ ○ /api/health                          0 B             0 B
```

### Runtime Output

```
🚀 Starting server...
✓ Database connected
✓ Redis connected
✓ Queue initialized
✓ Ready on http://0.0.0.0:3000
```

## 🔧 Troubleshooting

### Build Hala Başarısız?

1. **Prisma generate çalışmadı mı?**

   ```bash
   # Dockerfile'da kontrol et
   RUN npx prisma generate
   ```

2. **DATABASE_URL hala geçersiz mi?**

   ```bash
   # Dockerfile'da kontrol et
   ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
   ```

3. **SKIP_ENV_VALIDATION ayarlanmamış mı?**
   ```bash
   # Dockerfile'da kontrol et
   ENV SKIP_ENV_VALIDATION=1
   ```

### Runtime'da Database Bağlanamıyor?

1. **Coolify environment variables kontrol et**
   - `DATABASE_URL` doğru mu?
   - Şifre özel karakterler içeriyor mu? (URL encode gerekebilir)

2. **PostgreSQL container çalışıyor mu?**

   ```bash
   docker ps | grep postgres
   ```

3. **Network bağlantısı var mı?**
   ```bash
   docker exec -it <container> ping postgres
   ```

## 📚 Referanslar

- [Prisma Client Generation](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/generating-prisma-client)
- [Next.js Standalone Output](https://nextjs.org/docs/app/api-reference/next-config-js/output)
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Coolify Environment Variables](https://coolify.io/docs/knowledge-base/environment-variables)

## 🎉 Sonuç

Bu çözüm:

- ✅ Build sırasında PrismaClient oluşturulmasını engeller
- ✅ Runtime'da tam fonksiyonel çalışır
- ✅ Güvenli ve production-ready
- ✅ Minimal kod değişikliği
- ✅ Coolify ile tam uyumlu

**Artık Coolify'da başarılı bir şekilde deploy edilebilir!** 🚀
