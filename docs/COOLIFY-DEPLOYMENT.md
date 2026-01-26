s'e başvuruldu

---

## 📞 Destek

Sorun yaşarsan:

1. Coolify logs'u kontrol et
2. Health check endpoint'ini test et
3. Database/Redis connection'ı test et
4. Environment variables'ı kontrol et

---

## 🎉 Başarılı Deployment!

Site artık canlı: **https://aihaberleri.org**

Sonraki adımlar:

1. Google Search Console'da site doğrula
2. Google News'e başvur
3. Sosyal medya hesaplarını güncelle
4. İlk haberleri yayınla (agent otomatik çalışacak)

- [ ] Domain DNS ayarları yapıldı
- [ ] SSL sertifikası aktif (Let's Encrypt)
- [ ] PostgreSQL servisi çalışıyor
- [ ] Redis servisi çalışıyor
- [ ] App deploy edildi
- [ ] Database migration tamamlandı
- [ ] Admin kullanıcı oluşturuldu
- [ ] Kategoriler seed edildi
- [ ] Sosyal medya hesapları seed edildi
- [ ] IndexNow initialize edildi
- [ ] Health check başarılı
- [ ] Auto deploy aktif
- [ ] Backup aktif
- [ ] Environment variables doğru
- [ ] Google Search Console'a sitemap gönderildi
- [ ] Google Newl-time logs görüntüle

````

### Database Logs

```bash
# Coolify Dashboard → PostgreSQL Service → Logs
````

---

## 🔄 Update & Rollback

### Update (Yeni Kod Deploy)

```bash
# Local'de
git add .
git commit -m "Update: new features"
git push origin main

# Coolify otomatik deploy eder (auto deploy aktifse)
# Veya manuel: Coolify Dashboard → App → Deploy
```

### Rollback (Önceki Versiyona Dön)

```bash
# Coolify Dashboard → App → Deployments
# Önceki deployment'i seç → Redeploy
```

---

## 🎯 Production Checklist

### Redis Connection Error

```bash
# Coolify terminal'de test et
redis-cli -u $REDIS_URL ping
```

### Build Error

```bash
# Coolify logs'u kontrol et
# Dashboard → App → Logs
```

### Migration Error

```bash
# Prisma schema'yı kontrol et
npx prisma validate

# Migration'ları tekrar çalıştır
npx prisma migrate deploy --force
```

---

## 📈 Monitoring

### Coolify Built-in Monitoring

- CPU Usage
- Memory Usage
- Network Traffic
- Disk Usage

### Application Logs

````bash
# Coolify Dashboard → App → Logs
# Reapp'i seç
2. **Settings** → **Auto Deploy**
3. **Enable** yap
4. Webhook URL'i kopyala
5. GitHub → Repository → Settings → Webhooks → Add webhook
6. Webhook URL'i yapıştır

Artık `git push` yaptığında otomatik deploy olur!

### Backup (Önemli!)

1. Coolify'da PostgreSQL service'i seç
2. **Backups** → **Enable Automatic Backups**
3. Schedule: Daily (her gün)
4. Retention: 7 days

---

## 🚨 Troubleshooting

### Database Connection Error

```bash
# Coolify terminal'de test et
psql $DATABASE_URL -c "SELECT 1"
````

2026-01-25T...",
"services": {
"database": "connected",
"app": "running"
}
}

```

### 2. Admin Panel
```

https://aihaberleri.org/admin/login

```

### 3. SEO Dashboard
```

https://aihaberleri.org/admin/seo

```

### 4. Sitemap'ler
```

https://aihaberleri.org/sitemap.xml
https://aihaberleri.org/news-sitemap.xml

```

### 5. IndexNow Key
```

https://aihaberleri.org/6b655ec4-34d5-46c5-9331-0783527dca7b.txt

````

---

## 🔧 Coolify Ayarları

### Auto Deploy (Git Push'ta Otomatik Deploy)

1. Coolify'da aile Hepsi Birlikte

Eğer PostgreSQL ve Redis'i de aynı compose file'da istersen:

1. Coolify Dashboard → **New Resource** → **Docker Compose**
2. Compose File: `docker-compose.coolify.yml` seç
3. Environment variables ekle (yukarıdaki gibi)
4. Deploy

**Not:** Bu yöntemde PostgreSQL ve Redis de app ile birlikte deploy edilir.

---

## 📊 Deployment Sonrası Kontroller

### 1. Health Check
```bash
curl https://aihaberleri.org/api/health
````

Beklenen response:

````json
{
  "status": "healthy",
  "timestamp": "andıktan sonra:

1. Coolify'da app container'a **Terminal** aç
2. Migration'ları çalıştır:
   ```bash
   npx prisma migrate deploy
````

3. Admin kullanıcı oluştur:

   ```bash
   npx tsx scripts/create-admin.ts
   ```

4. Kategorileri seed et:

   ```bash
   npx tsx scripts/seed-categories.ts
   ```

5. Sosyal medya hesaplarını seed et:

   ```bash
   npx tsx scripts/seed-social-media.ts
   ```

6. IndexNow'u initialize et:
   ```bash
   npx tsx scripts/init-indexnow.ts
   ```

---

## 🔄 Alternatif: Docker Compose R_RUN=3

AGENT_MAX_ARTICLES_PER_RUN=5
AGENT_MIN_INTERVAL_HOURS=6

# Optional - Google AdSense

NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX

```

4. **Domain** ayarla:
```

Domain: aihaberleri.org
SSL: Let's Encrypt (otomatik)

```

5. **Deploy** tıkla

### Adım 4: Database Migration

Deploy tamaml
# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://aihaberleri.org
NEXT_PUBLIC_SITE_NAME="AI Haberleri"
TWITTER_HANDLE=@aihaberleriorg
CONTACT_EMAIL=info@aihaberleri.org

# Agent Configuration
AGENT_ENABLED=true
AGENT_MIN_ARTICLES_PEnerate with: openssl rand -base64 32)
NEXTAUTH_URL=https://aihaberleri.org
NEXTAUTH_SECRET=GENERATE_THIS_WITH_OPENSSL

# DeepSeek AI
DEEPSEEK_API_KEY=your_deepseek_api_key

# Search APIs (En az biri gerekli)
BRAVE_API_KEY=your_brave_api_key
TAVILY_API_KEY=your_tavily_api_key
EXA_API_KEY=your_exa_api_key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
SMTP_FROM=info@aihaberleri.org
oolify Dashboard → **New Resource** → **Docker Compose**
2. Ayarlar:
```

Name: aihaberleri-app
Repository: https://github.com/Optimus825482/aihaberleri.git
Branch: main
Compose File: docker-compose.simple.yml

````

3. **Environment Variables** ekle:

```bash
# Database (Coolify PostgreSQL service'den kopyala)
DATABASE_URL=postgresql://aiuser:PASSWORD@aihaberleri-postgres:5432/ainewsdb

# Redis (Coolify Redis service'den kopyala)
REDIS_URL=redis://aihaberleri-redis:6379

# NextAuth (CRITICAL - Ge`
Name: aihaberleri-postgres
Version: 15
Database Name: ainewsdb
Username: aiuser
Password: [güçlü şifre oluştur]
````

4. **Deploy** tıkla
5. **Connection String**'i kopyala (Environment variables'da kullanacağız)

### Adım 2: Redis Servisi Ekle

1. Coolify Dashboard → **Services** → **Add Service**
2. **Redis** seç
3. Ayarlar:
   ```
   Name: aihaberleri-redis
   Version: 7
   ```
4. **Deploy** tıkla
5. **Connection String**'i kopyala

### Adım 3: Application Deploy

1. Cazırlık

### 1. GitHub Repository

✅ Tamamlandı: https://github.com/Optimus825482/aihaberleri.git

### 2. Domain

- Domain: `aihaberleri.org`
- DNS A Record: Coolify sunucu IP'sine yönlendir
- SSL: Coolify otomatik Let's Encrypt ile halleder

---

## 🎯 Coolify'da Kurulum (Önerilen Yöntem)

### Adım 1: PostgreSQL Servisi Ekle

1. Coolify Dashboard → **Services** → **Add Service**
2. **PostgreSQL** seç
3. Ayarlar:
   ``# 🚀 Coolify Deployment Guide - AI Haberleri

## 📋 Ön H
