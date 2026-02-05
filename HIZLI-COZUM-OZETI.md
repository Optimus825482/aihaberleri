# ⚡ Google Indexing Rate Limit - Hızlı Çözüm Özeti

## 🎯 Sorun

1. **Prisma Schema Hatası**: `indexNowStatus` field'ı eksik
2. **Google API Rate Limit**: Günlük 200 request limiti aşıldı (429 hatası)
3. **Database Connection**: Aralıklı bağlantı hataları

---

## ✅ Çözüm (3 Adım)

### Adım 1: Hızlı Fix Script Çalıştır

**Windows (PowerShell):**

```powershell
.\scripts\quick-fix-google-indexing.ps1
```

**Linux/Mac (Bash):**

```bash
chmod +x scripts/quick-fix-google-indexing.sh
./scripts/quick-fix-google-indexing.sh
```

Bu script:

- ✅ Prisma client'ı temizler
- ✅ Yeniden generate eder
- ✅ Type check yapar
- ✅ Build test eder

### Adım 2: Admin Panelden Batch Oluştur

1. **Sayfaya git**: `http://localhost:3000/admin/google-indexing-batch`
2. **Haberleri seç**: Checkbox ile toplu seçim
3. **Planla**: "Yarın İçin Planla" butonuna tıkla
4. **Bekle**: Cron job otomatik çalışacak (her saat başı)

### Adım 3: Monitoring

- **Batch Durumu**: `/admin/google-indexing-batch` sayfasından takip et
- **Database**: `npx prisma studio` ile kontrol et
- **Logs**: Vercel Dashboard → Deployments → Logs

---

## 🚀 Sistem Nasıl Çalışıyor?

### Rate Limiting Stratejisi

```
❌ ESKİ: Her haber için anında Google'a bildirim
   → Günlük limit hızla aşılıyor (200 request/day)

✅ YENİ: Toplu gönderim (batch) sistemi
   → Her 10 haberde bir batch oluştur
   → Yarın için planla
   → Cron job otomatik gönderir
   → Her haber arasında 1 saniye bekle
```

### Batch İşlem Akışı

```
1. Admin → Haberleri seç → "Yarın İçin Planla"
2. Database → Batch kaydedilir (status: PENDING)
3. Cron Job → Her saat kontrol eder
4. Zamanı geldi mi? → Evet → Batch işlenir
5. Her haber için → Google API'ye bildirim
6. Başarılı → Article güncellenir (googleIndexed: true)
7. Başarısız → Error loglanır, retry planlanır
8. Batch tamamlanır → status: COMPLETED
```

---

## 📊 Özellikler

### Admin Panel

- ✅ Bildirilmemiş haberleri listele
- ✅ Filtreleme (dil, tarih, arama)
- ✅ Toplu seçim (checkbox)
- ✅ "Yarın İçin Planla" butonu
- ✅ Progress tracking

### Rate Limiting

- ✅ Her haber arasında 1 saniye bekleme
- ✅ Günlük limit kontrolü
- ✅ 429 hatası durumunda otomatik pause
- ✅ Retry logic (max 3 deneme)

### Batch System

- ✅ Toplu gönderim
- ✅ Zamanlama (yarın saat 09:00)
- ✅ Background worker
- ✅ Cron job (her saat başı)
- ✅ Error logging
- ✅ Progress tracking

### Language Support

- ✅ Türkçe ve İngilizce ayrı tracking
- ✅ Batch bazında dil seçimi
- ✅ Her dil için ayrı istatistikler

---

## 🔧 Teknik Detaylar

### Database Schema

**Yeni Tablolar:**

- `GoogleIndexingBatch`: Batch işlemlerini takip eder
- `GoogleIndexingBatchItem`: Her bir haberin durumunu takip eder
- `IndexingHistory`: Detaylı geçmiş kayıtları

**Article Tablosu Güncellemeleri:**

- `indexNowStatus`: IndexNow API durumu
- `indexNowRetryCount`: Retry sayısı
- `indexNowNextRetryAt`: Sonraki retry zamanı
- `googleIndexRetryCount`: Google retry sayısı
- `googleIndexNextRetryAt`: Google retry zamanı
- `googleIndexBatchId`: Hangi batch'e ait

### API Endpoints

- `GET /api/admin/google-indexing/unindexed`: Bildirilmemiş haberleri getir
- `POST /api/admin/google-indexing/batch`: Batch oluştur
- `GET /api/admin/google-indexing/batch?batchId=xxx`: Batch durumu sorgula
- `GET /api/cron/google-indexing-batch`: Cron job endpoint

### Cron Job

**Vercel Cron Ayarı:**

- Path: `/api/cron/google-indexing-batch`
- Schedule: `0 * * * *` (Her saat başı)
- Headers: `Authorization: Bearer YOUR_CRON_SECRET`

---

## 📝 Environment Variables

`.env` dosyasına ekle:

```env
# Google Indexing API
GOOGLE_SERVICE_ACCOUNT_KEY=your_key_here

# Cron job güvenliği
CRON_SECRET=your_random_secret_here

# Base URL
NEXT_PUBLIC_BASE_URL=https://aihaberleri.org
```

---

## 🚨 Sorun Giderme

### Prisma Client Hatası

```bash
rm -rf node_modules/.prisma
npx prisma generate
npm run build
```

### Migration Hatası

```bash
npx prisma migrate deploy
```

### Cron Job Çalışmıyor

- Vercel Dashboard'da cron job aktif mi kontrol et
- CRON_SECRET doğru mu kontrol et
- Logs'u incele

---

## 📈 Monitoring Queries

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

## ✅ Sonuç

**Sistem hazır!** Admin panelden batch oluşturabilir ve yarın için planlayabilirsiniz.

**Avantajlar:**

- ✅ Google API rate limit'i aşılmaz
- ✅ Otomatik toplu gönderim
- ✅ Retry logic ile başarısız bildirimleri tekrar dene
- ✅ Detaylı monitoring ve logging
- ✅ Türkçe ve İngilizce ayrı tracking

**Kullanım:**

1. Admin panel → Google Indexing Batch
2. Haberleri seç → Yarın için planla
3. Cron job otomatik gönderir
4. Monitoring ile takip et

🎉 **Başarılar!**
