# Worker Quick Start Guide

## 🚀 Hızlı Başlangıç

### 1. Test Queue Connection

```bash
npm run test:queue
```

**Başarılı ise:**

```
✅ Redis PING: PONG
✅ Queue Name: news-agent
✅ Queue Client: Connected
```

### 2. Start Worker

```bash
# Local development
npm run worker

# Docker
docker-compose -f docker-compose.coolify.yaml up -d worker
```

**Başarılı ise:**

```
✅ Redis connection verified (PONG received)
✅ Database connection successful
✅ Worker is ready and listening for jobs
```

### 3. Trigger Agent

```bash
# Via API
curl -X POST http://localhost:3000/api/agent/trigger \
  -H "Content-Type: application/json" \
  -d '{"executeNow": true}'

# Via Admin Panel
# http://localhost:3000/admin/agent → "Şimdi Çalıştır" butonu
```

**Başarılı ise:**

```json
{
  "success": true,
  "message": "Agent kuyruğa eklendi ve worker tarafından işlenecek",
  "data": {
    "jobId": "manual-trigger-1738000000000",
    "triggeredAt": "2025-01-27T12:00:00.000Z",
    "executionMode": "queue"
  }
}
```

### 4. Check Worker Logs

```bash
# Docker
docker-compose -f docker-compose.coolify.yaml logs -f worker

# Local
# Terminal'de worker çalışıyorsa direkt görürsün
```

**Başarılı ise:**

```
🔄 Job manual-trigger-1738000000000 is now active
🤖 Processing job: scrape-and-publish
✅ 3 haber yayınlandı
✅ Job completed successfully
```

## 🐛 Hızlı Troubleshooting

### Redis Bağlanamıyor?

```bash
# Redis çalışıyor mu?
docker ps | grep redis

# Redis'e ping at
redis-cli -u $REDIS_URL ping
```

### Worker Job Görmüyor?

```bash
# Queue stats kontrol et
npm run test:queue

# Worker restart et
docker-compose -f docker-compose.coolify.yaml restart worker
```

### Job Takılı Kaldı?

```bash
# Redis'te job'ları kontrol et
redis-cli -u $REDIS_URL KEYS "bull:news-agent:*"

# Takılı job'ları temizle
redis-cli -u $REDIS_URL DEL "bull:news-agent:stalled"
```

## 📚 Detaylı Dokümantasyon

Daha fazla bilgi için: [WORKER-TROUBLESHOOTING.md](./WORKER-TROUBLESHOOTING.md)

## ✅ Success Indicators

- ✅ `npm run test:queue` → Tüm testler geçiyor
- ✅ Worker logs → "Worker is ready and listening"
- ✅ Manuel trigger → "Job added successfully"
- ✅ Worker logs → "Processing job"
- ✅ Worker logs → "Job completed successfully"
- ✅ Admin panel → Yeni haberler görünüyor

## 🎯 Common Commands

```bash
# Test queue connection
npm run test:queue

# Start worker (local)
npm run worker

# Start worker (docker)
docker-compose -f docker-compose.coolify.yaml up -d worker

# View worker logs
docker-compose -f docker-compose.coolify.yaml logs -f worker

# Restart worker
docker-compose -f docker-compose.coolify.yaml restart worker

# Stop worker
docker-compose -f docker-compose.coolify.yaml stop worker

# Check worker health
docker inspect aihaberleri-worker | grep -A 5 Health
```

## 🔧 Environment Variables

```bash
# Required
REDIS_URL=redis://redis:6379
DATABASE_URL=postgresql://user:pass@host:5432/db

# Optional
AGENT_ENABLED=true
AGENT_MIN_ARTICLES_PER_RUN=2
AGENT_MAX_ARTICLES_PER_RUN=3
```

## 📊 Monitoring URLs

```bash
# Queue stats
http://localhost:3000/api/admin/queue/stats

# Agent history
http://localhost:3000/admin/agent

# Agent logs
http://localhost:3000/admin/logs
```
