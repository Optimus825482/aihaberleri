# 🗄️ Harici PostgreSQL Container Kurulumu

## 📊 Mevcut Durum

PostgreSQL ayrı bir Coolify container'ında kurulu:

### Connection Strings

**Public URL (Dışarıdan erişim):**

```
postgres://postgres:518518Erkan@77.42.68.4:5435/postgresainewsdb
```

**Internal URL (Container'lar arası):**

```
postgres://postgres:518518Erkan@io0g0w08wgk0wgcs0osw0ooc:5432/postgresainewsdb
```

## ✅ Docker Compose Yapılandırması

### Değişiklikler

1. **PostgreSQL container kaldırıldı** - Harici container kullanılıyor
2. **Redis container korundu** - Local container olarak çalışıyor
3. **App container DATABASE_URL'i harici PostgreSQL'e bağlanıyor**

### docker-compose.coolify.yaml

```yaml
version: "3.8"

services:
  # Redis (Local container)
  redis:
    image: redis:7-alpine
    container_name: aihaberleri-redis
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    restart: unless-stopped
    networks:
      - aihaberleri-network

  # Next.js App
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - NODE_ENV=production
    container_name: aihaberleri-app
    ports:
      - "${APP_PORT:-3001}:3000"
    environment:
      # Database (Harici PostgreSQL - INTERNAL URL kullan!)
      DATABASE_URL: ${DATABASE_URL}

      # Redis (Local container)
      REDIS_URL: redis://redis:6379

      # ... diğer environment variables
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - aihaberleri-network

volumes:
  redis_data:
    driver: local

networks:
  aihaberleri-network:
    driver: bridge
```

## 🔧 Coolify Environment Variables

### Kritik: DATABASE_URL

Coolify'da **INTERNAL URL** kullanmalısın:

```env
DATABASE_URL=postgres://postgres:518518Erkan@io0g0w08wgk0wgcs0osw0ooc:5432/postgresainewsdb
```

**Neden Internal URL?**

- Container'lar arası iletişim Coolify'nin internal network'ü üzerinden
- Public URL (77.42.68.4:5435) dışarıdan erişim için
- Internal URL (io0g0w08wgk0wgcs0osw0ooc:5432) container'lar arası

### Diğer Environment Variables

```env
# Database (INTERNAL URL!)
DATABASE_URL=postgres://postgres:518518Erkan@io0g0w08wgk0wgcs0osw0ooc:5432/postgresainewsdb

# Redis (Local container)
REDIS_URL=redis://redis:6379

# NextAuth
NEXTAUTH_SECRET=S7eZHSGib/CKLq0tz8rwB8vROnb0KkMHu6LwxHJT1WU=
NEXTAUTH_URL=https://aihaberleri.org

# AI Services
DEEPSEEK_API_KEY=sk-2750fa1691164dd2940c2ec3cb37d2e6
DEEPSEEK_API_URL=https://api.deepseek.com/v1

# Search APIs
BRAVE_API_KEY=BSAGBjbQoeFNCjKwfzhJg9cdsmG4UXu
TAVILY_API_KEY=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
EXA_API_KEY=e02e87e4-7221-4d22-beaa-56a3a683d374

# Email Service
RESEND_API_KEY=re_bMuDv7VC_3nwhr6Ab6GLndqyxsBbvDc9R
RESEND_FROM_EMAIL=noreply@aihaberleri.org

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=aihaberleri-46042
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@aihaberleri-46042.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDi92vXIVWGF7CX\nmmZSa7jU0GUP1tqeZxf9J9RWvt5+2dp7GDnl77dBomZXrW1mADhFSR/FeqmCan74\nC0LUMwV4gHo7aJ8RQpjIJ+g5KQYRKGU1RttR3+9KfTeWKQ955GF/dRK+z/JYJA08\n5GCp0DiMstpxl+HKU9Xn2sKfu04aWIpstqcPTSekk1w195EDt8dOhNcrkUGmaD5g\nZJc8oHJAQvOffdabjLdQuMf8MJqKXVJv1O/2ROn3S4AzLi4vdOjP9+hCIOpQOq66\n2zlcRhEq79khHrGDLHZ6zBIIynN4v80a+fZ8U002ARUEGN6VopgLKuCHD7wn4OhY\nvBexPlcVAgMBAAECggEADi9ojgmHTtosL013F6+j3akop9TF1SCcXzYeD03emg8D\nmK3q8HQLAA8mVlSAgd+BpNLtKWqBLaV6SgZqJtkJfn6JJS1kw69l3RyhZvEpb+kW\naj4DdxqH2h/5WWk3jma3sT+f7E0S2G9oZGXhpLtezWxgOrlDY2HZ/KOvhkwulXbV\nA6LKuwqNK3fLeBbx2Mu4Cfi6taHedre53FL8jZ0aIoeeErWM3u7qZjtuZdfEfrrm\nHikVLlejnAqC8Skj7YZtSCO4F63H/LuAjnmqH6SL9sVvX9dxViYU5T+9yPr/kCEH\nKqoiy/QOZmEBSrttXqEoEJHgo50J97nubiEG24nAAQKBgQD+KvmsYQwYRKrreysU\nosjY6EcT0xobne3CPcGoKKIUEcAxBwF3cmxTA4KAu8GLNfZhXTt+9NMqE2UWaa5U\nbVDVnw87XQFmcvsjfo3dUzj0SCok0PoE6/p1PmRDEXUeaXbc2+6Aux/gDcacQN/L\nbdKUa8sNA10aox4nFqwiZwGBHwKBgQDkmkAU0OyL/5kBvKXdZRXhCzF4cq3kfxdy\n4dVhCmPiNGa480Jl4WPO+tj9LAxp7HCjgaY7iqSgqQR6Dr6IV35mR9ipLsGJNQe2\nnKnSdCJjLa9R+7eZvbtQhx2ea8jMXT97g/aeX8XHgUP+B22RhueYg8DAK9fIOIRe\nwRilgTMdSwKBgQDbUWwGAev02PP/pFWFRf43pR8IDUXfBMTPsohzuTQ6SyLja18p\nmfO9Ii8vNFSK8nJ6i3+2Sj4YdYnp8CE8uuNgohL7r4Jwy9DHTQHPNGvV5ptvD2Be\ndN2247KSaPL93hVx+Nlx/YZAyMJTvGsgV9C4v9cDkJ57SLvREPBR8z5KEwKBgFXv\n+tkYdWRn0OBLR9tDzgbMy2spSV/Vuz3v0eRqIISACIHMyRA9u+SqfnomXgBP50RA\nT/qgMyVGhK1R76SXp6fRqIxpTE5FRkILAPhhui+ok/jw9ONx5QHv2V2dzV2uTFgl\nkseU32gRmzrbFgCYQ2YdWY+kq7jULkbktlw5hrqjAoGBAM4vU8Tu8PIgo52Jpng2\nVhQmoubm5xhY5lcsEuz+CUlrbV8Iis/X/yhJP1m49XKki0YdxbJQnvg4hISXQSRd\nmCpqEaxXyM3gAJkR+tXbBpkblH0ordQ8auzfc3LsgbBJYuqUwBhz1I9OKuBvnjTc\n7MRZ7Fasf3vcCchQcMl2zkuu\n-----END PRIVATE KEY-----\n"

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BEuzabZL4FeqPH3Z5QjmAUr4bJ774juFnZ_YslFJWh_FZJJQ54LdR3dw34w014XBa_iz3raZo9zI4GBxunuRZaE
VAPID_PRIVATE_KEY=BC3Cp8mqzQ-KlTbJ5mhb4Lheu2qeVB-09lk8WfdrTipWY26YSW9qcdLO5x6vygWVV3RLlp0CurQ242xBvyxQJu8
VAPID_EMAIL=info@aihaberleri.org

# Site Config
NEXT_PUBLIC_SITE_NAME=AI Haberleri
NEXT_PUBLIC_SITE_URL=https://aihaberleri.org
NEXT_PUBLIC_SITE_DESCRIPTION=Yapay zeka dünyasındaki gelişmeleri yakından takip edin

# Social
TWITTER_HANDLE=@aihaberleriorg
CONTACT_EMAIL=info@aihaberleri.org

# Agent Config
AGENT_ENABLED=true
AGENT_MIN_ARTICLES_PER_RUN=3
AGENT_MAX_ARTICLES_PER_RUN=5
AGENT_MIN_INTERVAL_HOURS=6

# Production
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
APP_PORT=3001
```

## 🔍 Bağlantı Testi

### PostgreSQL Bağlantısı Test Et

```bash
# Container içinden test
docker exec -it aihaberleri-app node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => console.log('✓ PostgreSQL connected'))
  .catch(err => console.error('✗ PostgreSQL error:', err));
"
```

### Redis Bağlantısı Test Et

```bash
# Container içinden test
docker exec -it aihaberleri-redis redis-cli ping
# Beklenen: PONG
```

## 🚀 Deployment Adımları

### 1. docker-compose.coolify.yaml'ı Push Et

```bash
git add docker-compose.coolify.yaml EXTERNAL-POSTGRES-SETUP.md
git commit -m "feat: configure for external PostgreSQL container"
git push origin main
```

### 2. Coolify'da Environment Variables Ayarla

**ÖNEMLİ:** `DATABASE_URL` için **INTERNAL URL** kullan:

```
postgres://postgres:518518Erkan@io0g0w08wgk0wgcs0osw0ooc:5432/postgresainewsdb
```

### 3. Deploy Et

Coolify'da "Redeploy" butonuna tıkla.

### 4. Bağlantıları Doğrula

```bash
# Health check
curl https://aihaberleri.org/api/health

# Beklenen response:
{
  "status": "ok",
  "timestamp": "2026-01-25T...",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Coolify Infrastructure                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐      ┌──────────────────┐       │
│  │ PostgreSQL       │      │ App Container    │       │
│  │ Container        │◄─────┤ (aihaberleri)    │       │
│  │ (Harici)         │      │                  │       │
│  │                  │      │  ┌────────────┐  │       │
│  │ Internal:        │      │  │ Next.js    │  │       │
│  │ io0g0w....:5432  │      │  │ App        │  │       │
│  │                  │      │  └────────────┘  │       │
│  │ Public:          │      │                  │       │
│  │ 77.42.68.4:5435  │      │  ┌────────────┐  │       │
│  └──────────────────┘      │  │ Redis      │  │       │
│                            │  │ (Local)    │  │       │
│                            │  └────────────┘  │       │
│                            └──────────────────┘       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## ✅ Checklist

- [x] docker-compose.coolify.yaml güncellendi
- [x] PostgreSQL container kaldırıldı
- [x] Redis container korundu
- [x] DATABASE_URL internal URL'e ayarlandı
- [ ] Coolify'da DATABASE_URL güncellendi
- [ ] Git push yapıldı
- [ ] Coolify'da redeploy yapıldı
- [ ] Health check test edildi
- [ ] Database bağlantısı doğrulandı

## 🔒 Güvenlik Notları

### Public vs Internal URL

- **Public URL (77.42.68.4:5435)**: Dışarıdan erişim için (pgAdmin, local development)
- **Internal URL (io0g0w....:5432)**: Container'lar arası iletişim için (production)

### Şifre Güvenliği

Mevcut şifre: `518518Erkan`

**Öneriler:**

- Production'da daha güçlü şifre kullan
- Şifreyi environment variable olarak sakla
- Düzenli olarak rotate et

## 🎯 Beklenen Sonuç

### Başarılı Deployment

```
✓ Build completed
✓ Container started
✓ Redis connected (local container)
✓ PostgreSQL connected (external container)
✓ Health check: OK
✓ Site accessible: https://aihaberleri.org
```

### Container Logs

```
🚀 Starting server...
✓ Prisma Client initialized
✓ Database connected: postgres://...@io0g0w08wgk0wgcs0osw0ooc:5432/postgresainewsdb
✓ Redis connected: redis://redis:6379
✓ Queue initialized
✓ Server ready on http://0.0.0.0:3000
```

---

**Status**: ✅ Ready for deployment
**Date**: 2026-01-25
**Configuration**: External PostgreSQL + Local Redis
