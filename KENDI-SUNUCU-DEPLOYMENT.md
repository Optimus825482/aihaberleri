# 🚀 Google Batch Indexing - Kendi Sunucu Deployment

## ✅ Kendi Sunucunuzda Kurulum

Vercel değil, kendi sunucunuzda (VPS/Dedicated) deploy ediyorsunuz. Bu durumda cron job'u sistem cron ile kurmanız gerekiyor.

---

## 📋 Deployment Adımları

### 1. Prisma Migration

```bash
# Development
npx prisma generate
npx prisma migrate dev --name add_language_field

# Production
npx prisma migrate deploy
```

### 2. Build

```bash
npm run build
```

### 3. PM2 ile Restart (Eğer PM2 kullanıyorsanız)

```bash
pm2 restart all
# veya
pm2 restart your-app-name
```

### 4. Sistem Cron Job Kurulumu

Vercel Cron yerine **sistem cron** kullanacağız.

#### Linux/Ubuntu Sunucu:

```bash
# Crontab'ı düzenle
crontab -e

# Her saat başı çalışacak cron job ekle
0 * * * * curl -X POST http://localhost:3000/api/cron/google-indexing-batch -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/google-indexing-cron.log 2>&1
```

**Açıklama:**

- `0 * * * *` - Her saat başı (00:00, 01:00, 02:00, ...)
- `curl -X POST` - API endpoint'i çağır
- `http://localhost:3000` - Sunucunuzdaki Next.js uygulaması
- `-H "Authorization: Bearer YOUR_CRON_SECRET"` - Güvenlik için secret
- `>> /var/log/google-indexing-cron.log 2>&1` - Logları kaydet

#### Alternatif: Node.js Script ile Cron

Eğer `node-cron` kullanmak isterseniz:

```bash
npm install node-cron
```

**Dosya:** `scripts/cron-scheduler.js`

```javascript
const cron = require("node-cron");
const fetch = require("node-fetch");

// Her saat başı çalış
cron.schedule("0 * * * *", async () => {
  console.log("[Cron] Google Indexing Batch job başlatılıyor...");

  try {
    const response = await fetch(
      "http://localhost:3000/api/cron/google-indexing-batch",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
          "Content-Type": "application/json",
        },
      },
    );

    const result = await response.json();
    console.log("[Cron] Sonuç:", result);
  } catch (error) {
    console.error("[Cron] Hata:", error);
  }
});

console.log("Cron scheduler başlatıldı. Her saat başı çalışacak.");
```

**PM2 ile Çalıştır:**

```bash
pm2 start scripts/cron-scheduler.js --name google-indexing-cron
pm2 save
```

---

## 🔐 Environment Variables

`.env.production` dosyanıza ekleyin:

```bash
# Google Indexing Cron Secret
CRON_SECRET=your-super-secret-key-here-change-this
```

**Secret oluşturma:**

```bash
# Linux/Mac
openssl rand -base64 32

# veya
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🐳 Docker Kullanıyorsanız

### docker-compose.yaml

```yaml
services:
  app:
    # ... mevcut ayarlar
    environment:
      - CRON_SECRET=${CRON_SECRET}

  # Cron container (opsiyonel)
  cron:
    image: alpine:latest
    command: >
      sh -c "
        apk add --no-cache curl &&
        echo '0 * * * * curl -X POST http://app:3000/api/cron/google-indexing-batch -H \"Authorization: Bearer ${CRON_SECRET}\"' | crontab - &&
        crond -f -l 2
      "
    depends_on:
      - app
    environment:
      - CRON_SECRET=${CRON_SECRET}
```

---

## 📊 Cron Job Test

### Manuel Test

```bash
# Cron endpoint'i manuel çağır
curl -X POST http://localhost:3000/api/cron/google-indexing-batch \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Beklenen Yanıt:**

```json
{
  "success": true,
  "timestamp": "2026-02-05T10:00:00.000Z",
  "result": {
    "processedBatches": 2,
    "totalArticles": 20,
    "successCount": 18,
    "failedCount": 2
  }
}
```

### Cron Loglarını Kontrol

```bash
# Sistem cron kullanıyorsanız
tail -f /var/log/google-indexing-cron.log

# PM2 kullanıyorsanız
pm2 logs google-indexing-cron

# Docker kullanıyorsanız
docker logs -f cron-container-name
```

---

## 🔄 Alternatif Cron Çözümleri

### 1. Systemd Timer (Modern Linux)

**Dosya:** `/etc/systemd/system/google-indexing.service`

```ini
[Unit]
Description=Google Indexing Batch Job
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -X POST http://localhost:3000/api/cron/google-indexing-batch -H "Authorization: Bearer YOUR_CRON_SECRET"
User=www-data
```

**Dosya:** `/etc/systemd/system/google-indexing.timer`

```ini
[Unit]
Description=Google Indexing Batch Timer
Requires=google-indexing.service

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
```

**Aktif Et:**

```bash
sudo systemctl enable google-indexing.timer
sudo systemctl start google-indexing.timer
sudo systemctl status google-indexing.timer
```

### 2. BullMQ (Redis Queue)

Eğer Redis kullanıyorsanız:

```bash
npm install bullmq
```

```typescript
// lib/queue/google-indexing-queue.ts
import { Queue, Worker } from "bullmq";

const queue = new Queue("google-indexing", {
  connection: {
    host: "localhost",
    port: 6379,
  },
});

// Her saat başı job ekle
queue.add(
  "process-batches",
  {},
  {
    repeat: {
      pattern: "0 * * * *", // Her saat başı
    },
  },
);

// Worker
const worker = new Worker("google-indexing", async (job) => {
  const response = await fetch(
    "http://localhost:3000/api/cron/google-indexing-batch",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    },
  );
  return response.json();
});
```

---

## 📝 Deployment Script (Kendi Sunucu)

**Dosya:** `scripts/deploy-own-server.sh`

```bash
#!/bin/bash

echo "🚀 Google Batch Indexing - Kendi Sunucu Deployment"
echo ""

# 1. Prisma Generate
echo "📦 Prisma Client oluşturuluyor..."
npx prisma generate

# 2. Migration
echo "🗄️ Database migration uygulanıyor..."
npx prisma migrate deploy

# 3. Build
echo "🔨 Build yapılıyor..."
npm run build

# 4. PM2 Restart
echo "🔄 PM2 restart..."
pm2 restart all

# 5. Cron Job Kurulumu
echo "⏰ Cron job kuruluyor..."
CRON_SECRET=$(grep CRON_SECRET .env.production | cut -d '=' -f2)

# Mevcut cron'u kontrol et
if crontab -l | grep -q "google-indexing-batch"; then
    echo "✅ Cron job zaten mevcut"
else
    # Yeni cron job ekle
    (crontab -l 2>/dev/null; echo "0 * * * * curl -X POST http://localhost:3000/api/cron/google-indexing-batch -H \"Authorization: Bearer $CRON_SECRET\" >> /var/log/google-indexing-cron.log 2>&1") | crontab -
    echo "✅ Cron job eklendi"
fi

# 6. Test
echo ""
echo "🧪 Cron endpoint test ediliyor..."
curl -X POST http://localhost:3000/api/cron/google-indexing-batch \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"

echo ""
echo "✅ Deployment tamamlandı!"
echo ""
echo "📋 Kontrol:"
echo "1. Cron job: crontab -l"
echo "2. Loglar: tail -f /var/log/google-indexing-cron.log"
echo "3. PM2: pm2 logs"
```

**Çalıştır:**

```bash
chmod +x scripts/deploy-own-server.sh
./scripts/deploy-own-server.sh
```

---

## 🔍 Monitoring

### Cron Job Durumu

```bash
# Crontab'ı kontrol et
crontab -l

# Cron loglarını izle
tail -f /var/log/google-indexing-cron.log

# Sistem cron logları
tail -f /var/log/syslog | grep CRON
```

### Database Kontrol

```sql
-- Bekleyen batch'ler
SELECT * FROM "GoogleIndexingBatch"
WHERE status = 'PENDING'
ORDER BY scheduledFor;

-- Bugün işlenen batch'ler
SELECT * FROM "GoogleIndexingBatch"
WHERE status = 'COMPLETED'
AND DATE(completedAt) = CURRENT_DATE;
```

### Application Logs

```bash
# PM2 kullanıyorsanız
pm2 logs

# Docker kullanıyorsanız
docker logs -f container-name

# Systemd kullanıyorsanız
journalctl -u your-app-name -f
```

---

## ⚠️ Önemli Notlar

### Port Ayarı

- Cron job'da `http://localhost:3000` kullanıyoruz
- Eğer farklı port kullanıyorsanız değiştirin
- Örnek: `http://localhost:8080`

### Güvenlik

- `CRON_SECRET` mutlaka güçlü olmalı
- Endpoint sadece localhost'tan erişilebilir olmalı
- Firewall kurallarını kontrol edin

### Timezone

- Cron job sunucu timezone'unda çalışır
- UTC kullanıyorsanız saatleri ona göre ayarlayın
- Örnek: UTC+3 için 3 saat eksi

### Backup

- Cron job'u kurmadan önce mevcut crontab'ı yedekleyin:
  ```bash
  crontab -l > crontab-backup.txt
  ```

---

## 🎯 Özet

**Vercel Cron yerine:**

1. ✅ Sistem cron kullan (`crontab -e`)
2. ✅ veya Node.js cron (`node-cron` + PM2)
3. ✅ veya Systemd timer
4. ✅ veya BullMQ (Redis queue)

**Deployment:**

```bash
./scripts/deploy-own-server.sh
```

**Test:**

```bash
curl -X POST http://localhost:3000/api/cron/google-indexing-batch \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Monitoring:**

```bash
tail -f /var/log/google-indexing-cron.log
```

---

**Kendi sunucunuzda hazır! 🚀**
