# 🚀 Coolify Deployment Guide - AI Haberleri

## 📋 İçindekiler
1. [Coolify Nedir?](#coolify-nedir)
2. [Ön Gereksinimler](#ön-gereksinimler)
3. [İlk Kurulum](#ilk-kurulum)
4. [Environment Variables](#environment-variables)
5. [Deployment Workflow](#deployment-workflow)
6. [Troubleshooting](#troubleshooting)
7. [Production Checklist](#production-checklist)

---

## Coolify Nedir?

Coolify, self-hosted bir PaaS (Platform as a Service) platformudur. GitHub ile entegre çalışır ve her push'ta otomatik deployment yapar.

### Avantajları
- ✅ Git-based automatic deployments
- ✅ Multi-container (Docker Compose) desteği
- ✅ Built-in PostgreSQL, Redis yönetimi
- ✅ Environment variable management
- ✅ One-click rollback
- ✅ Real-time logs

---

## Ön Gereksinimler

### 1. GitHub Repository
```bash
# Repository aktif olmalı
https://github.com/Optimus825482/aihaberleri.git
```

### 2. Coolify Server
- **Server IP**: 77.42.68.4
- **Coolify Dashboard**: https://coolify.yourdomain.com
- **Min. Requirements**: 2GB RAM, 20GB Disk

### 3. Domain
- **Primary**: aihaberleri.org
- **SSL**: Let's Encrypt (Coolify otomatik halleder)

---

## İlk Kurulum

### Adım 1: Coolify'da Yeni Proje Oluştur

1. Coolify Dashboard'a giriş yap
2. **"New Resource"** → **"Docker Compose"** seç
3. Repository ekle:
   ```
   Repository: https://github.com/Optimus825482/aihaberleri.git
   Branch: main
   Docker Compose File: docker-compose.coolify.yaml
   ```

### Adım 2: Environment Variables Ekle

Coolify Dashboard → Project → **Environment** sekmesine git ve aşağıdaki değişkenleri ekle:

#### 🔑 Kritik (ZORUNLU)
```bash
# Database (Coolify'ın kendi PostgreSQL'i)
DATABASE_URL=postgresql://postgres:PASSWORD@postgres:5432/postgresainewsdb

# NextAuth
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=https://aihaberleri.org

# DeepSeek AI (Content Generation)
DEEPSEEK_API_KEY=your_deepseek_key_here

# Brave Search (Trend Analysis)
BRAVE_API_KEY=your_brave_api_key_here
```

#### 📧 Email (Optional ama önerilen)
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=info@aihaberleri.org
```

#### 🔔 Push Notifications (Optional)
```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

#### 🐦 Social Media (Optional)
```bash
TWITTER_APP_KEY=your_twitter_key
TWITTER_APP_SECRET=your_twitter_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_secret

FACEBOOK_PAGE_ID=your_page_id
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_token
```

#### ⚙️ Agent Configuration
```bash
AGENT_ENABLED=true
AGENT_MIN_ARTICLES_PER_RUN=3
AGENT_MAX_ARTICLES_PER_RUN=5
AGENT_MIN_INTERVAL_HOURS=6
```

### Adım 3: PostgreSQL Container Ekle (Coolify Built-in)

Coolify Dashboard'da:
1. **"New Resource"** → **"PostgreSQL"**
2. Database adı: `postgresainewsdb`
3. User: `postgres`
4. Password: **Güçlü şifre belirle**
5. **Internal URL'i not al**: `postgresql://postgres:PASSWORD@postgres:5432/postgresainewsdb`

⚠️ **ÖNEMLİ**: Bu Internal URL'i `DATABASE_URL` environment variable olarak kullan.

### Adım 4: Network Configuration

`docker-compose.coolify.yaml` zaten şu network yapısını kullanıyor:

```yaml
networks:
  aihaberleri-network:  # Internal network (app ↔ worker ↔ redis)
    driver: bridge
  coolify:              # Coolify'ın internal network (postgres erişimi)
    external: true
```

✅ Bu yapı sayesinde:
- App ve Worker aynı Redis'e bağlanır (`redis://redis:6379`)
- PostgreSQL Coolify network'ü üzerinden erişilir
- Dış dünyaya sadece App expose olur (port 3000)

---

## Deployment Workflow

### 🔄 Otomatik Deployment (Recommended)

Coolify, GitHub webhook'larını otomatik kurar. Her commit'te:

```bash
# Local'de değişiklik yap
git add .
git commit -m "feat: yeni özellik eklendi"
git push origin main

# Coolify otomatik algılar ve deploy eder:
# 1. Git pull
# 2. Docker build (app + worker)
# 3. Container restart
# 4. Health check
```

**Deployment süresi**: ~3-5 dakika

### 🖱️ Manuel Deployment

Coolify Dashboard'dan:
1. Project seç
2. **"Redeploy"** butonuna tıkla
3. Logs sekmesinden deployment'ı izle

### 🔙 Rollback

Bir önceki sürüme dönmek için:
1. Coolify Dashboard → Deployments
2. **"Successful Deployments"** listesinden istediğin versiyonu seç
3. **"Redeploy This Version"** tıkla

---

## Container Yönetimi

### Health Checks

`docker-compose.coolify.yaml` otomatik health check içerir:

```yaml
# Redis health check
redis:
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5

# Worker health check
worker:
  healthcheck:
    test: ["CMD", "pgrep", "-f", "news-agent.worker"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### Container Restart Stratejileri

```yaml
restart: unless-stopped  # Container crash olursa otomatik restart
```

**Manuel restart için**:
```bash
# Coolify Dashboard:
# Project → Containers → Worker → Restart
```

---

## Troubleshooting

### ❌ Problem: Worker Container Başlamıyor

**Belirti**:
```
Worker container keeps restarting
❌ Cannot start worker without database connection
```

**Çözüm**:
```bash
# 1. PostgreSQL container çalışıyor mu kontrol et
# Coolify Dashboard → PostgreSQL → Status: Running ✅

# 2. DATABASE_URL doğru mu kontrol et
# Environment variables → DATABASE_URL → Internal URL kullan
DATABASE_URL=postgresql://postgres:PASSWORD@postgres:5432/postgresainewsdb

# 3. Network bağlantısını test et
# Coolify Dashboard → App Container → Logs
# Arama: "✅ Database connected"
```

### ❌ Problem: Redis Connection Failed

**Belirti**:
```
❌ Redis not available. Worker cannot start.
```

**Çözüm**:
```bash
# 1. Redis container çalışıyor mu?
# Coolify Dashboard → Containers → redis → Status

# 2. REDIS_URL doğru mu?
# Environment: REDIS_URL=redis://redis:6379

# 3. Network ayarlarını kontrol et
# Her iki container da aihaberleri-network'te olmalı
```

### ❌ Problem: Image Build Failed (Sharp Error)

**Belirti**:
```
ERROR: Could not find Sharp
Module not found: sharp
```

**Çözüm**:
Bu sorun Dockerfile'da çözüldü:
```dockerfile
# Dockerfile içinde zaten var:
RUN npm install --legacy-peer-deps sharp@0.33.5
```

Eğer hala sorun varsa:
```bash
# Local'de test et:
npm run build

# Başarılı ise, git push yap
git push origin main
```

### ❌ Problem: Environment Variables Eksik

**Belirti**:
```
⚠️ DEEPSEEK_API_KEY is not set
Agent disabled: AGENT_ENABLED not set
```

**Çözüm**:
1. Coolify Dashboard → Environment
2. Eksik variable'ları ekle
3. **"Save"** ve **"Redeploy"** tıkla

⚠️ **UYARI**: Environment variable değişikliklerinden sonra MUTLAKA redeploy yapılmalı!

### ❌ Problem: Port Conflict

**Belirti**:
```
Error: Port 3000 already in use
```

**Çözüm**:
`docker-compose.coolify.yaml` farklı port kullanıyor:
```yaml
ports:
  - "${APP_PORT:-3001}:3000"  # Host:3001 → Container:3000
```

Coolify'da Reverse Proxy otomatik ayarlanır. Manuel port mapping yapma.

### ❌ Problem: Database Migration Failed

**Belirti**:
```
Prisma migration failed
P1001: Can't reach database server
```

**Çözüm**:
```bash
# 1. Manuel migration çalıştır
# Coolify Dashboard → App Container → Execute Command:
npx prisma migrate deploy

# 2. Seed data ekle (ilk kurulumda)
npx prisma db seed
```

---

## Production Checklist

### 📋 Deployment Öncesi

- [ ] `.env.example` güncel mi?
- [ ] `docker-compose.coolify.yaml` test edildi mi?
- [ ] Tüm Dockerfile'lar build oluyor mu?
- [ ] Tests geçiyor mu? (`npm test`)
- [ ] Lint hatası yok mu? (`npm run lint`)

### 📋 İlk Deployment (One-Time)

- [ ] Coolify'da PostgreSQL container oluşturuldu
- [ ] Database URL environment variable eklendi
- [ ] Prisma migrations çalıştırıldı (`npx prisma migrate deploy`)
- [ ] Seed data eklendi (`npx prisma db seed`)
- [ ] Admin user oluşturuldu
- [ ] Domain bağlandı (aihaberleri.org)
- [ ] SSL sertifikası aktif (Let's Encrypt)

### 📋 Her Deployment Sonrası

- [ ] Health check passed (App + Worker + Redis)
- [ ] Logs'ta error yok mu?
- [ ] Homepage açılıyor mu? (https://aihaberleri.org)
- [ ] Admin login çalışıyor mu? (/admin/login)
- [ ] Agent logs görünüyor mu? (/admin)
- [ ] Worker çalışıyor mu? (Coolify logs kontrol et)

### 📋 Monitoring

```bash
# Real-time logs
# Coolify Dashboard → Logs sekmesi

# App logs
Arama: "Server running on port 3000"
Arama: "✅ Database connected"

# Worker logs
Arama: "🚀 Starting News Agent Worker"
Arama: "✅ Redis connected"
Arama: "🤖 Agent çalıştırması başladı"
```

---

## Faydalı Komutlar

### Coolify Dashboard'dan Container Komutları

```bash
# App container'a gir
docker exec -it aihaberleri-app sh

# Worker container'a gir
docker exec -it aihaberleri-worker sh

# Redis'e bağlan
docker exec -it aihaberleri-redis redis-cli

# PostgreSQL'e bağlan
docker exec -it postgres psql -U postgres -d postgresainewsdb
```

### Database Komutları

```bash
# Migrations çalıştır
npx prisma migrate deploy

# Prisma Studio aç (local development)
npx prisma studio

# Database schema kontrol et
npx prisma db pull
```

### Debug Komutları

```bash
# Container status
docker ps

# Container logs
docker logs -f aihaberleri-app
docker logs -f aihaberleri-worker
docker logs -f aihaberleri-redis

# Network kontrol
docker network inspect coolify
docker network inspect aihaberleri-network
```

---

## Best Practices

### 1. Environment Variables
- ✅ Secrets'ları Coolify Dashboard'da sakla
- ❌ `.env` dosyasını commit etme
- ✅ `.env.example` güncel tut

### 2. Docker Images
- ✅ Multi-stage build kullan (Dockerfile zaten öyle)
- ✅ Layer caching optimize et
- ✅ Unused dependencies temizle

### 3. Health Checks
- ✅ Her service için health check tanımla
- ✅ Start period yeterli uzun olsun (30s+)
- ✅ Retry logic ekle

### 4. Logs
- ✅ Structured logging kullan (winston)
- ✅ Error'ları Sentry'ye gönder
- ✅ Critical olayları email ile bildir

### 5. Backups
- ✅ PostgreSQL daily backup yap (Coolify built-in)
- ✅ Redis persistence aktif (`appendonly yes`)
- ✅ `.env` backup'ı al (güvenli yerde sakla)

---

## Emergency Procedures

### 🚨 Site Down - Acil Müdahale

```bash
# 1. Health check
curl -I https://aihaberleri.org

# 2. Coolify logs kontrol
# Dashboard → Logs → Son 100 satır

# 3. Container restart
# Dashboard → Containers → App → Restart

# 4. Hala çalışmıyorsa rollback
# Dashboard → Deployments → Son başarılı deployment → Redeploy
```

### 🚨 Database Connection Lost

```bash
# 1. PostgreSQL container status
# Coolify Dashboard → PostgreSQL → Status

# 2. Connection test
# App container → Execute:
npx prisma db pull

# 3. PostgreSQL restart
# Dashboard → PostgreSQL → Restart
```

### 🚨 Worker Not Processing Jobs

```bash
# 1. Worker logs kontrol
# Coolify Dashboard → Worker Logs
# Arama: "Processing job"

# 2. Redis bağlantısı kontrol
# Worker logs: "✅ Redis connected"

# 3. Manuel job tetikle
# Browser: /admin/agent-settings → "Hemen Çalıştır"

# 4. Worker restart
# Dashboard → Worker → Restart
```

---

## Rollout Strategy

### 🟢 Normal Deployment (Low Risk)
```bash
# Changes: Bug fixes, UI updates, minor features
git push origin main
# Coolify otomatik deploy eder
```

### 🟡 Risky Deployment (Database Changes)
```bash
# Changes: Schema migrations, breaking changes

# 1. Maintenance mode (optional)
# Admin panel'den duyuru yap

# 2. Database backup
# Coolify Dashboard → PostgreSQL → Backup

# 3. Deploy
git push origin main

# 4. Migration test
# Coolify Dashboard → App → Execute:
npx prisma migrate deploy

# 5. Verify
# Test critical flows
```

### 🔴 Critical Rollback
```bash
# Emergency: Site broken, data loss risk

# 1. Immediate rollback
# Coolify Dashboard → Previous Deployment → Redeploy

# 2. Database rollback (if needed)
# PostgreSQL → Restore from backup

# 3. Investigate
# Logs + Sentry errors

# 4. Fix + redeploy
git revert HEAD
git push origin main
```

---

## Support & Resources

### Documentation
- [Coolify Docs](https://coolify.io/docs)
- [Next.js Docker](https://nextjs.org/docs/deployment)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)

### Internal Docs
- `README.md` - Project overview
- `docker-compose.coolify.yaml` - Production compose file
- `.github/copilot-instructions.md` - AI agent guide

### Logs
- Coolify Dashboard → Real-time logs
- Sentry → Error tracking
- Admin Panel → Agent logs

---

## 📞 Troubleshooting Contact

**Deployment sorunları için**:
1. Coolify Dashboard logs kontrol et
2. Bu guide'ı takip et
3. GitHub Issues aç (şablon kullan)
4. Urgent: Admin → Settings → Contact

**Version**: 1.0.0 (Son güncelleme: 29 Ocak 2026)
