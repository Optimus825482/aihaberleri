# 🔧 Production PostgreSQL Connection Fix

## ❌ Sorun

```
Error in PostgreSQL connection: Error { kind: Closed, cause: None }
```

**Root Cause:**

- 11 idle connections pool'da bekliyor
- Connection'lar düzgün kapatılmıyor
- Prisma connection pool ayarları optimize edilmemiş

---

## 📊 Mevcut Durum

### Connection Statistics

```
Total Connections: 17
Active: 1
Idle: 11
Idle in Transaction: 0
Max Connections: 100
Available: 83
```

### Problem

- Worker her çalıştığında yeni connection açıyor
- Eski connection'lar kapatılmıyor
- Zamanla connection pool dolacak

---

## ✅ Çözüm

### 1. DATABASE_URL Optimization

**Mevcut (Local):**

```env
DATABASE_URL="postgresql://postgres:518518Erkan@localhost:5432/ainewsdb?connection_limit=20&pool_timeout=10&connect_timeout=10&socket_timeout=30"
```

**Production için Optimize:**

```env
DATABASE_URL="postgresql://postgres:518518Erkan@77.42.68.4:5435/postgresainewsdb?connection_limit=10&pool_timeout=20&connect_timeout=10&socket_timeout=30&statement_cache_size=0"
```

**Değişiklikler:**

- `connection_limit=10` (20'den 10'a düşürüldü - worker için yeterli)
- `pool_timeout=20` (10'dan 20'ye artırıldı - daha uzun bekleme)
- `statement_cache_size=0` (cache kapatıldı - memory leak önleme)

### 2. Prisma Client Singleton Pattern

**Dosya:** `src/lib/db.ts`

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Graceful shutdown
process.on("beforeExit", async () => {
  await db.$disconnect();
});

process.on("SIGINT", async () => {
  await db.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await db.$disconnect();
  process.exit(0);
});
```

### 3. Worker Connection Management

**Dosya:** `src/workers/news-agent.worker.ts`

```typescript
// Worker başlangıcında
const worker = new Worker(
  "news-agent",
  async (job) => {
    try {
      // İş yap
      await processJob(job);
    } finally {
      // Her job sonrası connection'ları temizle
      await db.$disconnect();
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // Tek seferde 1 job
    lockDuration: 600000, // 10 dakika
  },
);

// Worker kapanırken
worker.on("closing", async () => {
  console.log("🔄 Worker closing, disconnecting from database...");
  await db.$disconnect();
});

process.on("SIGTERM", async () => {
  console.log("📛 SIGTERM received, closing worker...");
  await worker.close();
  await db.$disconnect();
  process.exit(0);
});
```

### 4. Idle Connection Cleanup (PostgreSQL)

**SQL Script:**

```sql
-- Idle connection'ları otomatik kapat (5 dakikadan eski)
ALTER DATABASE postgresainewsdb SET idle_in_transaction_session_timeout = '5min';
ALTER DATABASE postgresainewsdb SET statement_timeout = '30s';

-- Mevcut idle connection'ları temizle
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'postgresainewsdb'
  AND state = 'idle'
  AND state_change < NOW() - INTERVAL '5 minutes'
  AND pid <> pg_backend_pid();
```

---

## 🚀 Uygulama Adımları

### Adım 1: Database Settings (MCP ile)

```sql
-- Idle timeout ayarla
ALTER DATABASE postgresainewsdb SET idle_in_transaction_session_timeout = '5min';
ALTER DATABASE postgresainewsdb SET statement_timeout = '30s';
```

### Adım 2: Environment Variables (Coolify)

Coolify dashboard'da environment variables güncelle:

```env
DATABASE_URL=postgresql://postgres:518518Erkan@77.42.68.4:5435/postgresainewsdb?connection_limit=10&pool_timeout=20&connect_timeout=10&socket_timeout=30&statement_cache_size=0
```

### Adım 3: Code Changes (Already in place)

`src/lib/db.ts` zaten singleton pattern kullanıyor. Sadece graceful shutdown ekle.

### Adım 4: Worker Restart

```bash
# Coolify'da worker container'ı restart et
# veya
pm2 restart news-agent-worker
```

---

## 🔍 Monitoring

### Connection Monitoring Query

```sql
-- Her 1 dakikada bir çalıştır
SELECT
  count(*) as total,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle,
  count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_tx,
  max(EXTRACT(EPOCH FROM (NOW() - state_change))) as max_idle_seconds
FROM pg_stat_activity
WHERE datname = 'postgresainewsdb';
```

### Alert Thresholds

- ⚠️ **Warning:** Idle connections > 5
- 🚨 **Critical:** Idle connections > 10
- 🚨 **Critical:** Total connections > 50

---

## 📊 Expected Results

### Before Fix

```
Total: 17
Active: 1
Idle: 11
Problem: Connection leak
```

### After Fix

```
Total: 3-5
Active: 1-2
Idle: 1-2
Status: ✅ Healthy
```

---

## 🔧 Troubleshooting

### Problem: Connection still leaking

**Solution 1: Force close idle connections**

```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'postgresainewsdb'
  AND state = 'idle'
  AND pid <> pg_backend_pid();
```

**Solution 2: Restart PostgreSQL**

```bash
# Coolify'da PostgreSQL service'i restart et
```

**Solution 3: Check for connection leaks in code**

```typescript
// Her Prisma query sonrası
try {
  const result = await db.article.findMany();
  return result;
} finally {
  // Connection'ı serbest bırak
  await db.$disconnect();
}
```

### Problem: Worker crashes

**Check logs:**

```bash
# Coolify logs
docker logs <worker-container-id>

# veya
pm2 logs news-agent-worker
```

**Common causes:**

- Memory leak
- Unhandled promise rejection
- Database connection timeout

---

## 🎯 Best Practices

### 1. Connection Pooling

- Use singleton pattern for Prisma client
- Limit connection pool size (10 for worker)
- Set appropriate timeouts

### 2. Graceful Shutdown

- Always disconnect on process exit
- Handle SIGTERM and SIGINT signals
- Close worker before disconnecting

### 3. Error Handling

- Wrap database calls in try-finally
- Always disconnect in finally block
- Log connection errors

### 4. Monitoring

- Monitor connection count
- Alert on high idle connections
- Track connection age

---

## 📝 Checklist

- [ ] Update DATABASE_URL with optimized parameters
- [ ] Apply PostgreSQL idle timeout settings
- [ ] Add graceful shutdown to db.ts
- [ ] Update worker connection management
- [ ] Restart worker
- [ ] Monitor connection count
- [ ] Verify no connection leaks

---

## 🔄 Rollback Plan

If issues persist:

1. **Revert DATABASE_URL:**

   ```env
   DATABASE_URL=postgresql://postgres:518518Erkan@77.42.68.4:5435/postgresainewsdb
   ```

2. **Remove timeout settings:**

   ```sql
   ALTER DATABASE postgresainewsdb RESET idle_in_transaction_session_timeout;
   ALTER DATABASE postgresainewsdb RESET statement_timeout;
   ```

3. **Restart services**

---

## 📊 Performance Impact

### Before

- Connection leaks
- Memory usage increases over time
- Eventual connection pool exhaustion
- Worker crashes

### After

- Stable connection count
- Consistent memory usage
- No connection pool issues
- Reliable worker operation

---

**Status:** Ready to apply
**Priority:** 🚨 HIGH (Production issue)
**Estimated Time:** 10 minutes
**Risk:** Low (can be rolled back)
