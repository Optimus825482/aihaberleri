# Worker Troubleshooting Guide

## 🔍 Problem: Manuel Tetikleme Çalışıyor Ama Worker Çalışmıyor

### Root Cause

**Redis lazy connection** kullanımı nedeniyle worker başladığında Redis'e bağlanmıyor ve job'ları görmüyor.

### Yapılan Değişiklikler

#### 1. Redis Configuration (`src/lib/redis.ts`)

**Değişiklik:**

```typescript
// ÖNCE
lazyConnect: true, // Don't connect immediately

// SONRA
lazyConnect: false, // Connect immediately for worker
```

**Eklenen Event Handlers:**

- `ready` event: Redis komut kabul etmeye hazır
- `close` event: Connection kapandığında log

#### 2. Worker Initialization (`src/workers/news-agent.worker.ts`)

**Eklenen:**

- `ensureRedisConnection()` fonksiyonu
- Redis connection verification (PING test)
- Detaylı worker event logging
- Job processing detayları

**Yeni Event Handlers:**

- `ready`: Worker hazır
- `active`: Job aktif
- `stalled`: Job takıldı

#### 3. Trigger Endpoint (`src/app/api/agent/trigger/route.ts`)

**Eklenen:**

- Detaylı queue logging
- Job state tracking
- Error details in response

#### 4. Test Script (`src/scripts/test-queue-connection.ts`)

**Yeni script oluşturuldu:**

- Redis connection test
- Queue stats test
- Job addition test
- Worker detection test

## 🧪 Test Adımları

### 1. Redis Connection Test

```bash
npx tsx src/scripts/test-queue-connection.ts
```

**Beklenen Çıktı:**

```
🧪 Testing Queue Connection...
============================================================

1️⃣ Testing Redis Connection...
   Redis Status: ready
   ✅ Redis PING: PONG
   ✅ Redis SET/GET: test-value

2️⃣ Testing Queue Instance...
   ✅ Queue Name: news-agent
   ✅ Queue Client: Connected

3️⃣ Testing Queue Stats...
   Queue Stats:
     - Waiting: 0
     - Active: 0
     - Completed: 5
     - Failed: 0
     - Delayed: 1

4️⃣ Testing Upcoming Jobs...
   Found 1 upcoming jobs:
     - Job ID: news-agent-scheduled-run
       Name: scrape-and-publish
       Scheduled: 27.01.2025 15:30:00

5️⃣ Testing Job Addition...
   ✅ Test job added: test-1738000000000
   Job State: waiting
   ✅ Test job removed

6️⃣ Testing Worker Detection...
   Active Workers: 1
     - Worker: worker-1

============================================================
✅ Queue connection test completed!
```

### 2. Worker Başlatma

```bash
# Docker ile
docker-compose -f docker-compose.coolify.yaml up -d worker

# Veya local
npx tsx src/workers/news-agent.worker.ts
```

**Beklenen Log Çıktısı:**

```
🚀 Starting News Agent Worker...
🔍 Checking Redis connection...
✅ Redis connection verified (PONG received)
🔍 Testing database connection...
✅ Database connection successful
✅ All systems ready, starting worker...

🎯 Initializing BullMQ Worker...
   Queue Name: news-agent
   Redis Status: ready
   Concurrency: 1
   Lock Duration: 10 minutes

✅ Worker started successfully!
👂 Listening for jobs on queue: news-agent
📊 Worker stats will be logged here...

✅ Worker is ready and listening for jobs
```

### 3. Manuel Tetikleme

```bash
# API call
curl -X POST http://localhost:3000/api/agent/trigger \
  -H "Content-Type: application/json" \
  -d '{"executeNow": true}'
```

**Beklenen Response:**

```json
{
  "success": true,
  "message": "Agent kuyruğa eklendi ve worker tarafından işlenecek",
  "data": {
    "jobId": "manual-trigger-1738000000000",
    "triggeredAt": "2025-01-27T12:00:00.000Z",
    "nextRun": "2025-01-27T18:00:00.000Z",
    "executionMode": "queue"
  }
}
```

**Beklenen Worker Log:**

```
🔄 Job manual-trigger-1738000000000 is now active

============================================================
🤖 Processing job: scrape-and-publish (ID: manual-trigger-1738000000000)
   Priority: 1
   Attempt: 1/3
   Timestamp: 27.01.2025 15:00:00
============================================================

🤖 Agent çalıştırması başladı (Log ID: clx...)
📰 Adım 1: Yapay zeka haberleri aranıyor (RSS + Trend)...
✅ 15 trend haber bulundu
🎯 Adım 2: En iyi haberler seçiliyor...
✅ 3 haber seçildi
⚙️  Adım 3: Haberler işleniyor ve yayınlanıyor...
✅ 3 haber yayınlandı

📊 Execution Summary:
   Articles Scraped: 15
   Articles Created: 3
   Duration: 45s
   Status: ✅ SUCCESS

✅ Job manual-trigger-1738000000000 completed successfully
```

## 🐛 Troubleshooting

### Problem 1: Worker Redis'e Bağlanamıyor

**Semptom:**

```
❌ Redis connection check failed: Error: connect ECONNREFUSED
```

**Çözüm:**

1. Redis container'ının çalıştığını kontrol et:

   ```bash
   docker ps | grep redis
   ```

2. Redis URL'i kontrol et:

   ```bash
   echo $REDIS_URL
   ```

3. Redis'e manuel bağlan:
   ```bash
   redis-cli -u $REDIS_URL ping
   ```

### Problem 2: Worker Job'ları Görmüyor

**Semptom:**

```
✅ Worker started successfully!
👂 Listening for jobs on queue: news-agent
# Ama hiç job log'u yok
```

**Çözüm:**

1. Queue stats kontrol et:

   ```bash
   npx tsx src/scripts/test-queue-connection.ts
   ```

2. Worker detection kontrol et:

   ```bash
   # Test script'te "Active Workers: 0" görüyorsan worker çalışmıyor
   ```

3. Worker'ı restart et:
   ```bash
   docker-compose -f docker-compose.coolify.yaml restart worker
   ```

### Problem 3: Job Ekleniyor Ama Process Edilmiyor

**Semptom:**

```
📋 Queue available, adding job...
✅ Job added successfully!
   Job ID: manual-trigger-1738000000000
   State: waiting

# Ama worker'da hiç log yok
```

**Çözüm:**

1. Worker'ın aynı Redis instance'ına bağlı olduğunu kontrol et:

   ```bash
   # App container
   docker exec aihaberleri-app env | grep REDIS_URL

   # Worker container
   docker exec aihaberleri-worker env | grep REDIS_URL
   ```

2. Queue name'in aynı olduğunu kontrol et:
   - App: `newsAgentQueue` → `"news-agent"`
   - Worker: `new Worker("news-agent", ...)`

3. Redis'te job'ları manuel kontrol et:
   ```bash
   redis-cli -u $REDIS_URL
   > KEYS bull:news-agent:*
   > LRANGE bull:news-agent:waiting 0 -1
   ```

### Problem 4: Database Connection Error

**Semptom:**

```
❌ Database connection failed: Error: Connection terminated
```

**Çözüm:**

1. Database URL kontrol et:

   ```bash
   echo $DATABASE_URL
   ```

2. Database'e manuel bağlan:

   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

3. Worker'da retry mekanizması çalışıyor mu kontrol et:
   ```
   🔄 Database connection attempt 1/10...
   ⏳ Waiting 5000ms before retry...
   ```

## 📊 Monitoring

### Queue Stats API

```bash
# Queue stats
curl http://localhost:3000/api/admin/queue/stats

# Upcoming jobs
curl http://localhost:3000/api/admin/queue/jobs
```

### Worker Health Check

```bash
# Docker health check
docker inspect aihaberleri-worker | grep -A 5 Health

# Manual health check
docker exec aihaberleri-worker pgrep -f "news-agent.worker"
```

### Redis Monitoring

```bash
# Redis info
redis-cli -u $REDIS_URL INFO

# Queue keys
redis-cli -u $REDIS_URL KEYS "bull:news-agent:*"

# Job details
redis-cli -u $REDIS_URL HGETALL "bull:news-agent:manual-trigger-1738000000000"
```

## ✅ Success Checklist

- [ ] Redis connection test geçiyor
- [ ] Worker başlatıldığında "Worker is ready" log'u görünüyor
- [ ] Manuel tetikleme "Job added successfully" dönüyor
- [ ] Worker'da "Processing job" log'u görünüyor
- [ ] Job başarıyla tamamlanıyor
- [ ] Database'e article kaydediliyor

## 🚀 Production Deployment

### Pre-deployment Checklist

1. **Environment Variables:**

   ```bash
   REDIS_URL=redis://redis:6379
   DATABASE_URL=postgresql://...
   AGENT_ENABLED=true
   ```

2. **Docker Compose:**

   ```yaml
   worker:
     build:
       context: .
       dockerfile: Dockerfile.worker
     environment:
       - REDIS_URL=${REDIS_URL}
       - DATABASE_URL=${DATABASE_URL}
     depends_on:
       - redis
       - postgres
   ```

3. **Health Checks:**
   ```yaml
   healthcheck:
     test: ["CMD", "pgrep", "-f", "news-agent.worker"]
     interval: 30s
     timeout: 10s
     retries: 3
   ```

### Post-deployment Verification

1. Check worker logs:

   ```bash
   docker-compose logs -f worker
   ```

2. Test manual trigger:

   ```bash
   curl -X POST https://your-domain.com/api/agent/trigger
   ```

3. Monitor queue stats:
   ```bash
   curl https://your-domain.com/api/admin/queue/stats
   ```

## 📝 Summary

**Değişiklikler:**

1. ✅ Redis lazy connection → immediate connection
2. ✅ Worker Redis verification eklendi
3. ✅ Detaylı logging eklendi
4. ✅ Test script oluşturuldu
5. ✅ Troubleshooting guide oluşturuldu

**Sonuç:**

- Manuel tetikleme → Queue'ya job ekler
- Worker → Job'ı görür ve process eder
- App içinde direkt execution YOK
- Tüm execution worker üzerinden
