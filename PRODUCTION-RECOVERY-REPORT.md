# Production Recovery Report - 28 Ocak 2026

## 🚨 Kritik Sorunlar ve Çözümler

### 1. Disk Dolu Sorunu (%100 → %50)

**Problem:** Sunucu diski %100 doluydu, PostgreSQL crash loop'a girdi
**Kök Neden:** Docker build cache ve kullanılmayan image'ler
**Çözüm:**

```bash
# 73GB alan temizlendi
docker image prune -a -f
docker builder prune -a -f
```

**Sonuç:** Disk kullanımı %50'ye düştü, PostgreSQL recovery'den çıktı

### 2. Worker Container /tmp Permission Hatası

**Problem:** Worker container sürekli restart, tsx `/tmp/tsx-1001` dizinine yazamıyor
**Kök Neden:** Non-root user (UID 1001) olarak çalışan worker'ın /tmp'ye yazma yetkisi yok
**Çözüm:** `Dockerfile.worker` güncellendi

```dockerfile
# Create and set permissions for /tmp directory for tsx
RUN mkdir -p /tmp/tsx-1001 && chown -R worker:nodejs /tmp/tsx-1001
```

**Commit:** `f5d8992`

### 3. BullMQ Job Stalled Hatası

**Problem:** `job stalled more than allowable limit` - Job timeout
**Kök Neden:** Default stalled interval (30s) ve lock duration (30s) çok kısa
**Çözüm:** Worker ve Queue timeout ayarları güncellendi

```typescript
// Worker settings
settings: {
  stalledInterval: 60000,    // 60 saniye
  maxStalledCount: 2,        // 2 stall'a izin ver
  lockDuration: 600000,      // 10 dakika lock
}

// Queue timeout
timeout: 600000,             // 10 dakika job timeout
```

**Commit:** `69884e2`

## 📊 Sistem Durumu

### Öncesi

- ❌ Disk: %100 dolu
- ❌ PostgreSQL: Recovery mode (crash loop)
- ❌ Worker: Restart loop (/tmp permission)
- ❌ App: 500 Internal Server Error
- ❌ Jobs: Stalled errors

### Sonrası

- ✅ Disk: %50 kullanım (73GB temizlendi)
- ✅ PostgreSQL: Healthy
- ✅ Worker: Running (no /tmp errors)
- ✅ App: Running (Ready in 47ms)
- ✅ Jobs: 10 dakika timeout ile çalışıyor

## 🔧 Yapılan Değişiklikler

### 1. Dockerfile.worker

- `/tmp/tsx-1001` dizini oluşturuldu
- Worker user'a ownership verildi

### 2. src/workers/news-agent.worker.ts

- Job progress tracking eklendi
- Stalled interval: 60 saniye
- Lock duration: 10 dakika
- Max stalled count: 2

### 3. src/lib/queue.ts

- Job timeout: 10 dakika
- Attempts: 3
- Exponential backoff

## 📈 Deployment Timeline

1. **22:30** - Disk dolu tespit edildi
2. **22:35** - Docker cache temizlendi (73GB)
3. **22:40** - PostgreSQL restart edildi
4. **22:45** - Worker Dockerfile fix'i deploy edildi
5. **22:50** - BullMQ timeout fix'i deploy edildi
6. **22:55** - Sistem tamamen operasyonel

## ✅ Doğrulama

```bash
# Disk durumu
df -h /
# /dev/sda1  150G  72G  73G  50% /

# Container durumu
docker ps | grep i8gg
# app: Up, healthy
# worker: Up, healthy
# redis: Up, healthy

# PostgreSQL durumu
docker exec io0g0w08wgk0wgcs0osw0ooc pg_isready
# accepting connections

# Worker logs
docker logs worker-i8ggkoowk4s8okc4gso8kg4w-224538370784
# ✅ Redis connected
# 📅 Sıradaki çalışma zamanı: 1/28/2026, 10:47:59 PM
```

## 🎯 Önleyici Tedbirler

### 1. Disk Monitoring

- Coolify'da disk usage alert kurulmalı
- Otomatik cleanup cron job eklenebilir

### 2. Docker Cleanup

```bash
# Haftalık cleanup cron
0 2 * * 0 docker system prune -af --volumes
```

### 3. Job Monitoring

- BullMQ dashboard kurulabilir
- Stalled job alertleri eklenebilir

### 4. Health Checks

- PostgreSQL health check interval artırılabilir
- Worker health check daha detaylı yapılabilir

## 📝 Notlar

- Tüm değişiklikler production'da test edildi
- Downtime: ~25 dakika
- Veri kaybı: Yok
- Kullanıcı etkisi: Minimal (gece saatleri)

## 🚀 Sonraki Adımlar

1. ✅ Disk temizliği tamamlandı
2. ✅ Worker fix'i deploy edildi
3. ✅ Timeout ayarları güncellendi
4. ⏳ Monitoring kurulumu (opsiyonel)
5. ⏳ Otomatik cleanup (opsiyonel)

---

**Durum:** ✅ ÇÖZÜLDÜ
**Son Güncelleme:** 28 Ocak 2026, 22:55
**Deployment:** Başarılı (Commit: 69884e2)
