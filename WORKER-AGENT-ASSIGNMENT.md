# 🤖 Arka Plan Worker'ına Temsilci Ataması

**Tarih:** 2026-01-30  
**Durum:** ✅ Tamamlandı  
**Atanan Temsilci:** `@backend-specialist`

## 📋 Özet

Otonom haber ajan sistemi (News Agent Worker) için **@backend-specialist** temsilcisi atandı. Bu temsilci, worker'ın performansını, güvenilirliğini ve hata yönetimini optimize etmekten sorumlu.

## 🎯 Temsilci Profili

### Atanan Temsilci
```
@backend-specialist
```

### Yüklü Yetenekler (Skills)
- ✅ `nodejs-best-practices` - Node.js optimizasyonu, async pattern'ler
- ✅ `performance-profiling` - Performans analizi ve iyileştirme
- ✅ `database-design` - Prisma connection management
- ✅ `api-patterns` - BullMQ job handling ve queue management

### Otomatik Algılama Kuralları

**Temsilci Otomatik Etkinleşir:**
- Worker hataları (`src/workers/news-agent.worker.ts`)
- BullMQ job işleme sorunları
- Redis/PostgreSQL bağlantı problemleri
- Agent execution timeout'ları
- Memory leak'ler veya performans düşüşleri

## 📁 Sorumlu Dosyalar

### Primary Responsibility
```
src/workers/news-agent.worker.ts
```
**Temsilci Görevi:** 
- Job processing optimization
- Error handling patterns
- Connection lifecycle management
- Timeout protection
- Progress tracking

### Secondary Files
```
src/services/agent.service.ts      # Agent execution logic
src/services/content.service.ts    # Content processing
src/lib/queue.ts                   # BullMQ configuration
src/lib/redis.ts                   # Redis connection
src/lib/db.ts                      # Prisma client
```

## 🔍 Temsilci Gözetim Alanları

### 1. Performance Monitoring

**Metrikler:**
- Job execution time (target: <18 minutes)
- Memory usage (leak detection)
- Database connection pool efficiency
- Redis command latency

**Uyarı Tetikleyiciler:**
```typescript
// Performance degradation
if (executionTime > 18 * 60 * 1000) {
  // @backend-specialist: ALERT - Timeout risk
}

// Memory leak
if (memoryUsage > threshold) {
  // @backend-specialist: ALERT - Memory leak suspected
}
```

### 2. Error Pattern Analysis

**İzlenen Hata Türleri:**
- `PrismaClientInitializationError` - Database connection
- `Redis connection refused` - Redis unavailability
- `Job stalled` - BullMQ processing issues
- `Agent execution timeout` - Long-running tasks

**Temsilci Aksiyon:**
```markdown
🤖 **@backend-specialist detecting error pattern...**

Analysis:
- Error: [Error Type]
- Frequency: [Count in last hour]
- Impact: [Critical/High/Medium/Low]

Recommended Actions:
1. [Immediate fix]
2. [Prevention strategy]
3. [Monitoring improvement]
```

### 3. Connection Management

**Lifecycle Checkpoints:**
```typescript
// Startup
🔍 Redis connection → @backend-specialist validates
🔍 Database connection → @backend-specialist validates

// During Job
🔄 Progress updates → @backend-specialist monitors
🔄 Database reconnect → @backend-specialist handles

// Shutdown
🔌 Graceful disconnect → @backend-specialist ensures
```

### 4. Job Queue Health

**Queue Metrics:**
- Delayed jobs count
- Active jobs count
- Failed jobs rate
- Job completion time

**Temsilci Optimization:**
```typescript
// Detect queue congestion
if (delayedJobsCount > 5) {
  // @backend-specialist: Suggest concurrency increase
}

// Detect repeated failures
if (failedJobsRate > 0.2) {
  // @backend-specialist: Root cause analysis required
}
```

## 🚀 Temsilci Aktivasyon Örnekleri

### Örnek 1: Timeout Optimization

**Senaryo:** Agent execution sürekli 15 dakikayı aşıyor.

```markdown
🤖 **@backend-specialist analyzing execution timeout...**

**Skills Applied:** `nodejs-best-practices`, `performance-profiling`

**Analysis:**
- Current timeout: 18 minutes
- Average execution: 16.5 minutes
- Bottleneck: DeepSeek API calls (sequential)

**Optimization Suggestions:**
1. Implement parallel processing for independent API calls
2. Add progress caching to resume interrupted jobs
3. Increase timeout to 20 minutes for safety margin
4. Add intermediate checkpoints for long operations

**Implementation Priority:** HIGH
```

### Örnek 2: Connection Leak Detection

**Senaryo:** PostgreSQL connection count artıyor.

```markdown
🤖 **@backend-specialist detecting connection leak...**

**Skills Applied:** `database-design`, `nodejs-best-practices`

**Analysis:**
- Active connections: 47/50
- Connection growth rate: +2/hour
- Suspected source: `agent.service.ts` - missing $disconnect

**Fix Required:**
\`\`\`typescript
// BEFORE (leak)
await executeNewsAgent();
// Connection not closed

// AFTER (fixed)
try {
  await executeNewsAgent();
} finally {
  await db.$disconnect();
}
\`\`\`

**Prevention:**
- Add connection lifecycle logging
- Implement connection pool monitoring
- Set up Prisma connection warnings

**Implementation Priority:** CRITICAL
```

### Örnek 3: Job Stall Prevention

**Senaryo:** Worker jobs stall ettikten sonra timeout oluyor.

```markdown
🤖 **@backend-specialist analyzing job stall pattern...**

**Skills Applied:** `api-patterns`, `nodejs-best-practices`

**Root Cause:**
- Lock duration: 10 minutes
- Execution time: 15 minutes average
- Conflict: Job stalls before completion

**Solution:**
\`\`\`typescript
// Increase lock duration to match execution time + buffer
lockDuration: 1200000, // 20 minutes (was 600000)

// Add progress heartbeat
const progressInterval = setInterval(async () => {
  await job.updateProgress(currentProgress + 10);
}, 2 * 60 * 1000); // Every 2 minutes
\`\`\`

**Monitoring:**
- Track stall frequency (target: 0/day)
- Alert if stall count > 0
- Log progress update failures

**Implementation Priority:** HIGH
```

## 📊 Temsilci Dashboard Metrikleri

### Real-Time Monitoring

```typescript
// Worker Health Score (0-100)
const workerHealthScore = {
  uptime: 100,              // Worker availability
  successRate: 98.5,        // Job success percentage
  averageExecutionTime: 14, // Minutes
  errorRate: 1.5,           // Percentage
  queueBacklog: 0,          // Pending jobs
};

// Temsilci Evaluation
if (workerHealthScore.successRate < 95) {
  // @backend-specialist: ALERT - Success rate degradation
}
```

### Weekly Reports

**Temsilci Üretir:**
```markdown
📈 **Weekly Worker Performance Report**
Generated by: @backend-specialist

**Period:** 2026-01-23 to 2026-01-30

**Metrics:**
- Total Jobs: 28
- Success Rate: 96.4% (27/28)
- Average Duration: 14.2 minutes
- Longest Execution: 17.3 minutes
- Errors: 1 (timeout)

**Observations:**
- ✅ No connection leaks detected
- ✅ Memory usage stable (avg 285MB)
- ⚠️ 1 timeout on Jan 26 (DeepSeek API slow response)

**Recommendations:**
1. Monitor DeepSeek API latency
2. Consider implementing API response caching
3. Add retry mechanism for failed API calls

**Action Items:**
- [ ] Implement API call timeout protection
- [ ] Add request duration logging
- [ ] Set up DeepSeek API monitoring
```

## 🛠 Temsilci Müdahalesi Gereken Durumlar

### Acil Müdahale (CRITICAL)
1. **Worker Crash:** Process exit veya unhandled rejection
2. **Database Connection Lost:** PostgreSQL unavailable
3. **Redis Down:** Queue system offline
4. **Memory Leak:** Sürekli artan memory kullanımı

**Temsilci Aksiyonu:** Immediate diagnosis + fix suggestion + monitoring setup

### Yüksek Öncelik (HIGH)
1. **Job Success Rate < 95%:** Repeated failures
2. **Execution Time > 18 min:** Timeout risk
3. **Queue Backlog > 3:** Processing delay
4. **Error Rate > 5%:** System instability

**Temsilci Aksiyonu:** Root cause analysis + optimization plan

### Normal İzleme (MEDIUM)
1. **Performance Degradation:** Gradual slowdown
2. **Warning Logs:** Non-critical errors
3. **Resource Usage Changes:** Memory/CPU patterns
4. **API Latency:** External service delays

**Temsilci Aksiyonu:** Trend analysis + preventive suggestions

## 🔗 İlgili Dokümantasyon

- `WORKER-TROUBLESHOOTING.md` - Sorun giderme kılavuzu
- `WORKER-SYSTEM-RELIABILITY-FIX.md` - Güvenilirlik iyileştirmeleri
- `WORKER-CONNECTION-TIMEOUT-FIX.md` - Bağlantı timeout çözümleri
- `.github/copilot-instructions-agents.md` - Temsilci sistemi kılavuzu

## 🎓 Temsilci Kullanım Örnekleri

### Worker İyileştirme İsteği

**Kullanıcı:**
```
Worker'da memory leak var gibi, inceleyebilir misin?
```

**Temsilci Yanıtı:**
```markdown
🤖 **@backend-specialist analyzing memory leak...**

**Skills Applied:** `nodejs-best-practices`, `performance-profiling`

**Investigation Steps:**
1. Checking database connection lifecycle
2. Analyzing event listener cleanup
3. Reviewing interval/timeout clearing
4. Inspecting BullMQ worker configuration

**Findings:**
[Detailed analysis with code references]

**Fixes:**
[Specific code changes with explanations]

**Verification:**
[Monitoring setup to confirm fix]
```

### Performans Optimizasyonu

**Kullanıcı:**
```
Worker çok yavaş çalışıyor, optimize edebilir misin?
```

**Temsilci Yanıtı:**
```markdown
🤖 **@backend-specialist profiling worker performance...**

**Skills Applied:** `performance-profiling`, `nodejs-best-practices`

**Current Performance:**
- Execution Time: 16.8 minutes (avg)
- Bottlenecks: [List with timings]

**Optimization Plan:**
1. [Immediate wins - low effort, high impact]
2. [Medium term - refactoring needed]
3. [Long term - architectural changes]

**Expected Impact:**
- Target execution time: <12 minutes
- Improvement: ~28% faster
```

## ✅ Başarı Kriterleri

Temsilci ataması başarılı sayılır:

1. ✅ Worker uptime > 99.5%
2. ✅ Job success rate > 95%
3. ✅ Average execution time < 15 minutes
4. ✅ Zero critical errors per week
5. ✅ Memory usage stable (<500MB)
6. ✅ Automatic issue detection and alerts
7. ✅ Weekly performance reports generated

## 📝 Notlar

- Temsilci otomatik olarak devreye girer (manuel aktivasyon gerektirmez)
- Worker dosyalarında yapılan değişiklikler temsilci tarafından review edilir
- Kritik hatalar anında temsilci tarafından analiz edilir
- Haftalık performans raporları otomatik oluşturulur

---

**Son Güncelleme:** 2026-01-30  
**Temsilci Durumu:** 🟢 Aktif  
**Sorumluluk Alanı:** `src/workers/*`, `src/services/agent.service.ts`, `src/lib/queue.ts`
