# Deployment Kılavuzu - Yapay Zeka Haber Sitesi

Yapay Zeka Haber Sitesini production'a deploy etmek için eksiksiz kılavuz.

## 🎯 Deployment Seçenekleri

### Seçenek 1: VPS/Dedicated Server (Önerilen)

En iyisi: Tam kontrol, yüksek trafik için maliyet etkin

**Gereksinimler:**

- Ubuntu 22.04 LTS veya benzeri
- 2GB+ RAM
- 20GB+ depolama
- Docker & Docker Compose yüklü

**Adımlar:**

1. **Sunucuyu Hazırlayın**

```bash
# Sistemi güncelleyin
sudo apt update && sudo apt upgrade -y

# Docker'ı yükleyin
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose'u yükleyin
sudo apt install docker-compose -y

# Uygulama dizini oluşturun
mkdir -p /var/www/ai-news-site
cd /var/www/ai-news-site
```

2. **Repository'yi Klonlayın**

```bash
git clone <your-repo-url> .
```

3. **Environment'ı Yapılandırın**

```bash
cp .env.example .env
nano .env
```

Bu değişkenleri ayarlayın:

```env
# Veritabanı
DATABASE_URL="postgresql://aiuser:GUCLU_SIFRE@postgres:5432/ai_news_db"

# Redis
REDIS_URL="redis://redis:6379"

# NextAuth
NEXTAUTH_URL="https://domain-adiniz.com"
NEXTAUTH_SECRET="<openssl-rand-base64-32-ile-olusturun>"

# DeepSeek API (GEREKLİ)
DEEPSEEK_API_KEY="your-deepseek-api-key"

# Unsplash (Opsiyonel ama önerilen)
UNSPLASH_ACCESS_KEY="your-unsplash-key"

# Google AdSense (Opsiyonel)
NEXT_PUBLIC_ADSENSE_CLIENT_ID="ca-pub-xxxxxxxxxxxxxxxx"

# Site Yapılandırması
NEXT_PUBLIC_SITE_NAME="Yapay Zeka Haberleri"
NEXT_PUBLIC_SITE_URL="https://domain-adiniz.com"
NEXT_PUBLIC_SITE_DESCRIPTION="En son yapay zeka haberleri ve gelişmeleri"

# Agent Yapılandırması
AGENT_ENABLED="true"
AGENT_MIN_ARTICLES_PER_RUN="2"
AGENT_MAX_ARTICLES_PER_RUN="3"
AGENT_MIN_INTERVAL_HOURS="5"

# Environment
NODE_ENV="production"
```

4. **Servisleri Başlatın**

```bash
docker-compose up -d
```

5. **Migration'ları Çalıştırın**

```bash
docker-compose exec app npx prisma migrate deploy
```

6. **Admin Kullanıcısı Oluşturun**

```bash
docker-compose exec app npx tsx scripts/create-admin.ts
```

7. **Nginx Reverse Proxy Kurun**

```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/ai-news-site
```

Nginx yapılandırması:

```nginx
server {
    listen 80;
    server_name domain-adiniz.com www.domain-adiniz.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Siteyi etkinleştirin:

```bash
sudo ln -s /etc/nginx/sites-available/ai-news-site /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

8. **Let's Encrypt ile SSL Kurun**

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d domain-adiniz.com -d www.domain-adiniz.com
```

9. **Otomatik Yenileme Kurun**

```bash
sudo certbot renew --dry-run
```

10. **Firewall'u Yapılandırın**

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### Seçenek 2: Vercel + Harici Veritabanı

En iyisi: Hızlı deployment, otomatik ölçeklendirme

**Adımlar:**

1. **Vercel'e Deploy Edin**

```bash
npm install -g vercel
vercel
```

2. **Harici Veritabanı Kurun**

- PostgreSQL için Supabase, Railway veya Neon kullanın
- Redis için Upstash kullanın

3. **Environment Değişkenlerini Yapılandırın**
   Vercel dashboard'unda `.env.example` dosyasındaki tüm değişkenleri ekleyin

4. **Worker'ı Ayrı Deploy Edin**
   Worker bir sunucuda çalışmalıdır (Vercel'de değil):

```bash
# Sunucunuzda
git clone <repo>
npm install
npm run worker
```

### Seçenek 3: AWS/GCP/Azure

En iyisi: Kurumsal, yüksek erişilebilirlik

**AWS Örneği:**

1. **Container'lar için ECS/Fargate**
2. **PostgreSQL için RDS**
3. **Redis için ElastiCache**
4. **CDN için CloudFront**
5. **DNS için Route 53**

Detaylı AWS kılavuzu için `aws-deployment.md` dosyasına bakın.

## 🔧 Deployment Sonrası

### 1. Kurulumu Doğrulayın

```bash
# Servisleri kontrol edin
docker-compose ps

# Logları kontrol edin
docker-compose logs -f app
docker-compose logs -f worker

# Veritabanı bağlantısını test edin
docker-compose exec app npx prisma db pull
```

### 2. İlk Agent Çalıştırmasını Planlayın

Admin paneline giriş yapın:

1. `https://domain-adiniz.com/admin` adresine gidin
2. Admin kimlik bilgileriyle giriş yapın
3. "Görev Planla" butonuna tıklayın
4. İşin planlandığını doğrulayın

### 3. Agent'ı İzleyin

```bash
# Worker loglarını izleyin
docker-compose logs -f worker

# Agent istatistiklerini kontrol edin
curl https://domain-adiniz.com/api/agent/stats
```

### 4. İzleme Kurun

**Uptime İzleme:**

- UptimeRobot (ücretsiz)
- Pingdom
- StatusCake

**Hata Takibi:**

```bash
npm install @sentry/nextjs
```

`next.config.js` dosyasında Sentry'yi yapılandırın

**Log Toplama:**

- Papertrail
- Logtail
- CloudWatch (AWS)

### 5. Yedekleme Stratejisi

**Veritabanı Yedeği:**

```bash
# Yedekleme script'i oluşturun
cat > /root/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U aiuser ai_news_db > /backups/db_$DATE.sql
find /backups -name "db_*.sql" -mtime +7 -delete
EOF

chmod +x /root/backup-db.sh

# Crontab'a ekleyin (her gün saat 02:00'de)
crontab -e
0 2 * * * /root/backup-db.sh
```

**Tam Yedek:**

```bash
# Tüm uygulamayı yedekleyin
tar -czf ai-news-backup-$(date +%Y%m%d).tar.gz /var/www/ai-news-site
```

## 🚀 Performans Optimizasyonu

### 1. Caching'i Etkinleştirin

**Redis Caching:**

```typescript
// lib/cache.ts dosyasına ekleyin
import redis from "./redis";

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600,
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const data = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}
```

### 2. CDN Yapılandırması

Cloudflare veya CloudFront kullanın:

- Statik varlıkları cache'leyin
- Brotli sıkıştırmayı etkinleştirin
- Edge caching kurun

### 3. Veritabanı Optimizasyonu

```sql
-- İndeksler ekleyin
CREATE INDEX idx_articles_published ON articles(published_at DESC) WHERE status = 'PUBLISHED';
CREATE INDEX idx_articles_category ON articles(category_id);
CREATE INDEX idx_articles_slug ON articles(slug);
```

### 4. Görsel Optimizasyonu

Next.js Image component ile zaten yapılandırılmış:

- Otomatik WebP dönüşümü
- Lazy loading
- Responsive görseller

## 🔒 Güvenlik Sertleştirme

### 1. Environment Güvenliği

```bash
# .env izinlerini kısıtlayın
chmod 600 .env

# .env'i asla commit etmeyin
echo ".env" >> .gitignore
```

### 2. Veritabanı Güvenliği

```sql
-- Analitik için salt okunur kullanıcı oluşturun
CREATE USER analytics WITH PASSWORD 'guclu_sifre';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics;
```

### 3. Rate Limiting

`middleware.ts` dosyasına ekleyin:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});
```

### 4. Güvenlik Header'ları

`next.config.js` dosyasında zaten yapılandırılmış:

- CSP
- HSTS
- X-Frame-Options
- X-Content-Type-Options

## 📊 İzleme & Uyarılar

### 1. Health Check'leri Kurun

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    worker: await checkWorker(),
  };

  const healthy = Object.values(checks).every((c) => c);

  return Response.json({ healthy, checks }, { status: healthy ? 200 : 503 });
}
```

### 2. Uyarı Yapılandırması

**E-posta Uyarıları:**

```bash
# mailutils yükleyin
sudo apt install mailutils -y

# Uyarı script'i oluşturun
cat > /root/alert.sh << 'EOF'
#!/bin/bash
if ! curl -f http://localhost:3000/api/health; then
  echo "Site çalışmıyor!" | mail -s "Yapay Zeka Haber Sitesi Uyarısı" admin@example.com
fi
EOF

# Her 5 dakikada bir çalıştırın
*/5 * * * * /root/alert.sh
```

## 🔄 Güncellemeler & Bakım

### Uygulamayı Güncelleyin

```bash
cd /var/www/ai-news-site
git pull
docker-compose build
docker-compose up -d
docker-compose exec app npx prisma migrate deploy
```

### Kesintisiz Güncellemeler

```bash
# Yeni image build edin
docker-compose build app

# Yeni container başlatın
docker-compose up -d --no-deps --scale app=2 app

# Health check'i bekleyin
sleep 10

# Eski container'ı kaldırın
docker-compose up -d --no-deps --scale app=1 app
```

## 🆘 Sorun Giderme

### Agent Çalışmıyor

```bash
# Worker loglarını kontrol edin
docker-compose logs worker

# Worker'ı yeniden başlatın
docker-compose restart worker

# Kuyruğu kontrol edin
docker-compose exec app npx tsx scripts/check-queue.ts
```

### Veritabanı Bağlantı Sorunları

```bash
# PostgreSQL'i kontrol edin
docker-compose exec postgres psql -U aiuser -d ai_news_db

# Bağlantı havuzunu sıfırlayın
docker-compose restart app
```

### Yüksek Bellek Kullanımı

```bash
# Container istatistiklerini kontrol edin
docker stats

# docker-compose.yml dosyasında bellek limitini artırın
services:
  app:
    mem_limit: 2g
```

## 📞 Destek

Deployment sorunları için:

- Logları kontrol edin: `docker-compose logs`
- GitHub Issues: [repo-url]/issues
- E-posta: support@example.com

---

**Deployment Kontrol Listesi:**

- [ ] Environment değişkenleri yapılandırıldı
- [ ] Veritabanı migrate edildi
- [ ] Admin kullanıcısı oluşturuldu
- [ ] SSL sertifikası yüklendi
- [ ] Firewall yapılandırıldı
- [ ] Yedeklemeler planlandı
- [ ] İzleme kuruldu
- [ ] Agent planlandı
- [ ] DNS yapılandırıldı
- [ ] CDN etkinleştirildi (opsiyonel)
