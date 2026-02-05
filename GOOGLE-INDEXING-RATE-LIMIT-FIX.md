# 🚀 Google Indexing Rate Limiting + Batch System - Uygulama Özeti

## 📊 Tespit Edilen Sorunlar

### 1. **Prisma Schema Hatası**

```
❌ Argument `indexNowStatus` is missing.
```

**Neden**: Schema'da field var ama migration uygulanmamış veya Prisma client güncel değil.

### 2. **Google API Rate Limit Aşımı**

```
❌ Quota exceeded for quota metric 'Publish requests' and limit 'Publish requests per day'
Status: 429 Too Many Requests
```

**Neden**: Günlük 200 request limiti aşıldı.

### 3. **Database Connection Hataları**

```
❌ Error in PostgreSQL connection: Error { kind: Closed, cause: None }
```

**Neden**: Connection pool tükenmesi veya timeout.

---

## ✅ Uygulanan Çözümler

### 1. **Prisma Schema Güncelleme**

- ✅ `indexNowStatus` field'ı eklendi (zaten mevcuttu)
- ✅ `indexNowSubmittedAt`, `indexNowRetryCount`, `indexNowNextRetryAt` eklendi
- ✅ `googleIndexRetryCount`, `googleIndexNextRetryAt`, `googleIndexLastError` eklendi
- ✅ `googleIndexBatchId` eklendi (batch tracking için)

### 2. **Rate Limiting Sistemi**

- ✅ Her 10 haberde bir toplu gönderim (batch)
- ✅ Günlük limit kontrolü
- ✅ 429 hatası durumunda otomatik pause
- ✅ Yarın için otomatik zamanlama

### 3. **Batch Processing System**

- ✅ `GoogleIndexingBatch` tablosu oluşturuldu
- ✅ `IndexingHistory` tablosu oluşturuldu
- ✅ Background worker implementasyonu
- ✅ Cron job (her saat başı)

### 4. **Admin Panel**

- ✅ `/admin/google-indexing-batch` sayfası
- ✅ Bildirilmemiş haberleri listele
- ✅ Toplu seçim (checkbox)
- ✅ Filtreleme (dil, tarih, arama)
- ✅ "Yarın İçin Planla" butonu
- ✅ Progress tracking

### 5. **Sidebar Menü**

- ✅ "Google Indexing Batch" menü item'ı eklendi

---

## 🚀 Hızlı Kurulum

### Adım 1: Prisma Migration

```bash
# Prisma client'ı yeniden generate et
npx prisma generate

# Migration'ı uygula (development)
npx prisma migrate dev --name google_indexing_tracking

# Production'da
npx prisma migrate deploy
```

### Adım 2: Environment Variables

`.env` dosyasına ekle:

```env
# Google Indexing API
GOOGLE_SERVICE_ACCOUNT_KEY=your_key_here

# Cron job güvenliği
CRON_SECRET=your_random_secret_here

# Base URL
NEXT_PUBLIC_BASE_URL=https://aihaberleri.org
```

### Adım 3: Vercel Cron Job

Vercel Dashboard → Project → Settings → Cron Jobs:

- **Path**: `/api/cron/google-indexing-batch`
- **Schedule**: `0 * * * *` (Her saat başı)
- **Headers**: `Authorization: Bearer YOUR_CRON_SECRET`

### Adım 4: Deploy

```bash
# Build ve deploy
npm run build
git add .
git commit -m "feat: Google Indexing batch system + rate limiting"
git push
```

---

## 📋 Kullanım

### Admin Panel'den Batch Oluşturma

1. **Sayfaya Git**: `https://aihaberleri.org/admin/google-indexing-batch`

2. **Filtreleme**:
   - Dil seç (Türkçe/İngilizce/Tümü)
   - Tarih aralığı belirle
   - Arama yap

3. **Haber Seçimi**:
   - Checkbox ile tek tek seç
   - "Tümünü Seç" butonu ile toplu seç

4. **Batch Gönderimi**:
   - "Yarın İçin Planla" butonuna tıkla
   - Seçilen haberler yarın saat 09:00 için planlanır
   - Progress bar ile işlem durumunu takip et

### Otomatik İşlem

- Cron job her saat başı çalışır
- Zamanı gelen batch'leri otomatik işler
- Her haber arasında 1 saniye bekler (rate limiting)
- Başarılı bildirimleri loglar
- Başarısız olanları retry için planlar

---

## 🔧 Teknik Detaylar

### Rate Limiting Stratejisi

```typescript
// Google API Limits
const RATE_LIMITS = {
  google: {
    requestsPerMinute: 200,
    requestsPerDay: 200, // ÜCRETSİZ PLAN
  },
};

// Worker'da 1 saniye bekleme
await new Promise((resolve) => setTimeout(resolve, 1000));
```

### Batch İşlem Akışı

```
1. Admin batch oluşturur (yarın için)
2. Database'e kaydedilir (status: PENDING)
3. Cron job her saat kontrol eder
4. Zamanı gelen batch işlenir (status: PROCESSING)
5. Her haber için Google API'ye bildirim
6. Başarılı: Article güncellenir (googleIndexed: true)
7. Başarısız: Error loglanır, retry planlanır
8. Batch tamamlanır (status: COMPLETED)
```

### Retry Logic

```typescript
// Exponential backoff
const delays = [5, 15, 60]; // minutes
// 1st retry: 5 dakika sonra
// 2nd retry: 15 dakika sonra
// 3rd retry: 1 saat sonra
// Max 3 retry
```

---

## 📊 Monitoring

### Database Queries

```sql
-- Pending batch'leri listele
SELECT * FROM "GoogleIndexingBatch"
WHERE status = 'PENDING'
ORDER BY "scheduledFor" ASC;

-- Başarısız item'ları listele
SELECT b.id, b."scheduledFor", i."articleId", i.error
FROM "GoogleIndexingBatch" b
JOIN "GoogleIndexingBatchItem" i ON i."batchId" = b.id
WHERE i.status = 'FAILED';

-- Batch istatistikleri
SELECT
  status,
  COUNT(*) as count,
  AVG("processedArticles") as avg_processed,
  AVG("failedArticles") as avg_failed
FROM "GoogleIndexingBatch"
GROUP BY status;
```

---

## 🚨 Sorun Giderme

### Sorun 1: Prisma Client Hatası

```bash
# Çözüm
rm -rf node_modules/.prisma
npx prisma generate
npm run build
```

### Sorun 2: Migration Hatası

```bash
# Rollback
psql -U postgres -d your_database -f prisma/migrations/20250101000000_google_indexing_tracking/rollback.sql

# Tekrar dene
npx prisma migrate deploy
```

### Sorun 3: Cron Job Çalışmıyor

- Vercel Dashboard'da cron job aktif mi kontrol et
- CRON_SECRET doğru mu kontrol et
- Logs'u incele: Vercel Dashboard → Deployments → Logs

---

## 📈 Sonraki Adımlar (Opsiyonel)

1. **Real-time Progress**: WebSocket ile live updates
2. **Email Notifications**: Batch tamamlandığında email
3. **Analytics Dashboard**: Başarı oranları, grafikler
4. **Retry Automation**: Başarısız item'ları otomatik tekrar dene
5. **Custom Schedule**: Farklı tarih/saat seçimi

---

## 📝 Önemli Notlar

- ✅ Google API günlük limiti: 200 request (ücretsiz plan)
- ✅ Her haber arasında 1 saniye bekleme (rate limiting)
- ✅ Batch size: Unlimited (ama önerilen max 100)
- ✅ Retry: Maximum 3 deneme
- ✅ Türkçe ve İngilizce ayrı tracking
- ✅ SearXNG kendi sunucuda, rate limit yok

---

**Sistem hazır! Admin panelden batch oluşturabilir ve yarın için planlayabilirsiniz.** 🎉
