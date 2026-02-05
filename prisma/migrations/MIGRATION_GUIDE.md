# Google Indexing Tracking - Migration Uygulama Rehberi

## 📋 Genel Bakış

Bu rehber, Google Indexing tracking migration'ını güvenli bir şekilde uygulamak için adım adım talimatlar içerir.

---

## ⚠️ Ön Hazırlık (ZORUNLU)

### 1. Yedek Alma

```bash
# PostgreSQL yedek alma
pg_dump -U postgres -d your_database > backup_$(date +%Y%m%d_%H%M%S).sql

# Veya Docker kullanıyorsanız
docker exec your_postgres_container pg_dump -U postgres your_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Geliştirme Ortamında Test

```bash
# Önce development/staging ortamında test edin
# Production'a geçmeden önce tüm testleri çalıştırın
```

### 3. Downtime Planlaması

- **Tahmini Süre**: 5-10 dakika (veritabanı boyutuna göre)
- **Önerilen Zaman**: Düşük trafik saatleri (gece 02:00-04:00)
- **Kullanıcı Bildirimi**: Bakım modu aktif edilmeli

---

## 🚀 Migration Adımları

### Adım 1: Prisma Schema Güncelleme

```bash
# 1. Mevcut schema.prisma dosyasını yedekleyin
cp prisma/schema.prisma prisma/schema.prisma.backup

# 2. schema-updated.prisma içeriğini schema.prisma'ya ekleyin
# Manuel olarak veya:
cat prisma/schema-updated.prisma >> prisma/schema.prisma
```

**Önemli**: `schema-updated.prisma` dosyasındaki içeriği mevcut `schema.prisma` dosyasına **ekleyin**, değiştirmeyin!

### Adım 2: Migration Dosyasını Kontrol Etme

```bash
# Migration dosyasını inceleyin
cat prisma/migrations/20250101000000_google_indexing_tracking/migration.sql

# SQL syntax kontrolü (opsiyonel)
psql -U postgres -d your_database --dry-run -f prisma/migrations/20250101000000_google_indexing_tracking/migration.sql
```

### Adım 3: Prisma Migration Uygulama

```bash
# Development ortamında
npx prisma migrate dev --name google_indexing_tracking

# Production ortamında
npx prisma migrate deploy
```

**Alternatif**: Manuel SQL çalıştırma

```bash
# Eğer Prisma migrate kullanmak istemiyorsanız
psql -U postgres -d your_database -f prisma/migrations/20250101000000_google_indexing_tracking/migration.sql
```

### Adım 4: Prisma Client Yeniden Oluşturma

```bash
# Prisma client'ı yeniden generate edin
npx prisma generate

# TypeScript type'ları kontrol edin
npm run type-check
```

### Adım 5: Verification (Doğrulama)

```bash
# Prisma Studio ile kontrol edin
npx prisma studio

# Veya SQL ile kontrol edin
psql -U postgres -d your_database
```

```sql
-- Yeni tabloların oluşturulduğunu kontrol edin
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('GoogleIndexingBatch', 'IndexingHistory');

-- Yeni enum'ların oluşturulduğunu kontrol edin
SELECT typname FROM pg_type
WHERE typname IN ('BatchType', 'BatchStatus', 'IndexType', 'IndexAction');

-- Article tablosuna yeni field'ların eklendiğini kontrol edin
SELECT column_name FROM information_schema.columns
WHERE table_name = 'Article'
AND column_name LIKE '%index%';

-- Index'lerin oluşturulduğunu kontrol edin
SELECT indexname FROM pg_indexes
WHERE tablename IN ('Article', 'GoogleIndexingBatch', 'IndexingHistory');
```

### Adım 6: Uygulama Kodunu Güncelleme

```bash
# TypeScript type'larını import edin
# lib/google-indexing/types.ts ve helpers.ts dosyalarını kullanın

# Örnek kullanım:
import { IndexStatus, BatchType } from '@/lib/google-indexing/types';
import { updateArticleIndexStatus, createIndexingHistory } from '@/lib/google-indexing/helpers';
```

### Adım 7: Test Çalıştırma

```bash
# Unit testleri çalıştırın
npm run test

# Integration testleri çalıştırın
npm run test:integration

# E2E testleri çalıştırın (opsiyonel)
npm run test:e2e
```

---

## 🧪 Test Senaryoları

### Test 1: Batch Oluşturma

```typescript
import { prisma } from "@/lib/prisma";
import { BatchType, BatchStatus } from "@/lib/google-indexing/types";

async function testBatchCreation() {
  const batch = await prisma.googleIndexingBatch.create({
    data: {
      batchType: BatchType.MANUAL,
      status: BatchStatus.PENDING,
      language: "tr",
      totalArticles: 10,
      createdBy: "test-user",
    },
  });

  console.log("✅ Batch oluşturuldu:", batch.id);
  return batch;
}
```

### Test 2: Article Status Güncelleme

```typescript
import { updateArticleIndexStatus } from "@/lib/google-indexing/helpers";
import { IndexType, IndexStatus } from "@/lib/google-indexing/types";

async function testArticleStatusUpdate() {
  const article = await prisma.article.findFirst();

  if (!article) {
    console.log("❌ Test için makale bulunamadı");
    return;
  }

  await updateArticleIndexStatus(
    article.id,
    IndexType.GOOGLE,
    IndexStatus.SUCCESS,
  );

  console.log("✅ Article status güncellendi");
}
```

### Test 3: Indexing History Oluşturma

```typescript
import { createIndexingHistory } from "@/lib/google-indexing/helpers";
import { IndexType, IndexStatus } from "@/lib/google-indexing/types";

async function testHistoryCreation() {
  const article = await prisma.article.findFirst();

  if (!article) {
    console.log("❌ Test için makale bulunamadı");
    return;
  }

  const history = await createIndexingHistory({
    articleId: article.id,
    indexType: IndexType.GOOGLE,
    action: "SUBMIT",
    status: IndexStatus.SUCCESS,
    requestUrl: `https://example.com/makale/${article.slug}`,
    responseStatus: 200,
    duration: 1500,
  });

  console.log("✅ History kaydı oluşturuldu:", history.id);
}
```

### Test 4: Retry Logic

```typescript
import {
  getRetryableArticles,
  calculateNextRetry,
} from "@/lib/google-indexing/helpers";
import { IndexType } from "@/lib/google-indexing/types";

async function testRetryLogic() {
  // Retry için uygun makaleleri getir
  const articles = await getRetryableArticles(IndexType.GOOGLE, 10);
  console.log(`✅ ${articles.length} makale retry için hazır`);

  // Sonraki retry zamanını hesapla
  const nextRetry = calculateNextRetry(0);
  console.log("✅ Sonraki retry zamanı:", nextRetry);
}
```

---

## 🔄 Rollback (Geri Alma)

Eğer migration'da sorun yaşarsanız:

### Hızlı Rollback

```bash
# Rollback SQL script'ini çalıştırın
psql -U postgres -d your_database -f prisma/migrations/20250101000000_google_indexing_tracking/rollback.sql

# Prisma schema'yı eski haline getirin
cp prisma/schema.prisma.backup prisma/schema.prisma

# Prisma client'ı yeniden generate edin
npx prisma generate

# Uygulamayı yeniden başlatın
npm run build
pm2 restart your-app
```

### Rollback Verification

```sql
-- Tabloların silindiğini kontrol edin
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('GoogleIndexingBatch', 'IndexingHistory');
-- Sonuç: Boş olmalı

-- Enum'ların silindiğini kontrol edin
SELECT typname FROM pg_type
WHERE typname IN ('BatchType', 'BatchStatus', 'IndexType', 'IndexAction');
-- Sonuç: Boş olmalı
```

---

## 📊 Post-Migration Kontrol Listesi

- [ ] Tüm tablolar başarıyla oluşturuldu
- [ ] Tüm enum'lar başarıyla oluşturuldu
- [ ] Article tablosuna yeni field'lar eklendi
- [ ] Tüm index'ler oluşturuldu
- [ ] Prisma client başarıyla generate edildi
- [ ] TypeScript type check geçti
- [ ] Unit testler geçti
- [ ] Integration testler geçti
- [ ] Uygulama başarıyla başlatıldı
- [ ] API endpoint'leri çalışıyor
- [ ] Dashboard'da yeni özellikler görünüyor
- [ ] Log'larda hata yok

---

## 🚨 Sorun Giderme

### Sorun 1: Enum Value Ekleme Hatası

**Hata**: `ERROR: enum value already exists`

**Çözüm**:

```sql
-- Mevcut enum value'ları kontrol edin
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'IndexStatus'::regtype;

-- Eğer value zaten varsa, migration script'teki ilgili satırı atlayın
```

### Sorun 2: Foreign Key Hatası

**Hata**: `ERROR: foreign key constraint fails`

**Çözüm**:

```sql
-- relationMode = "prisma" kullanıldığı için foreign key constraint'leri manuel yönetilir
-- Bu hata almamalısınız, ancak alırsanız:

-- Mevcut constraint'leri kontrol edin
SELECT conname FROM pg_constraint WHERE conrelid = 'Article'::regclass;

-- Gerekirse constraint'i kaldırın
ALTER TABLE "Article" DROP CONSTRAINT IF EXISTS "Article_googleIndexBatchId_fkey";
```

### Sorun 3: Index Oluşturma Hatası

**Hata**: `ERROR: index already exists`

**Çözüm**:

```sql
-- Mevcut index'leri kontrol edin
SELECT indexname FROM pg_indexes WHERE tablename = 'Article';

-- Eğer index zaten varsa, migration script'teki ilgili satırı atlayın
-- Veya önce index'i kaldırın:
DROP INDEX IF EXISTS "Article_indexNowStatus_indexNowNextRetryAt_idx";
```

### Sorun 4: Prisma Generate Hatası

**Hata**: `Error: Schema parsing failed`

**Çözüm**:

```bash
# Schema syntax'ını kontrol edin
npx prisma validate

# Schema'yı format edin
npx prisma format

# Cache'i temizleyin
rm -rf node_modules/.prisma
npx prisma generate
```

---

## 📈 Performance Optimizasyonu

### Migration Sonrası

```sql
-- Tablo istatistiklerini güncelleyin
ANALYZE "GoogleIndexingBatch";
ANALYZE "IndexingHistory";
ANALYZE "Article";

-- Index'leri yeniden oluşturun (opsiyonel, büyük tablolar için)
REINDEX TABLE "Article";
REINDEX TABLE "GoogleIndexingBatch";
REINDEX TABLE "IndexingHistory";

-- Vacuum işlemi (opsiyonel)
VACUUM ANALYZE "Article";
```

---

## 📝 Notlar

1. **Yedek Alma**: Migration öncesi mutlaka yedek alın
2. **Test Ortamı**: Önce development/staging'de test edin
3. **Downtime**: Production'da bakım modu aktif edin
4. **Monitoring**: Migration sırasında log'ları izleyin
5. **Rollback Plan**: Sorun durumunda hızlı rollback yapabilmek için hazırlıklı olun

---

## 🎯 Sonraki Adımlar

Migration başarıyla tamamlandıktan sonra:

1. **Google Indexing API Entegrasyonu**: API client'ı implement edin
2. **Batch Processor**: Batch işleme servisi oluşturun
3. **Retry Scheduler**: Otomatik retry mekanizması ekleyin
4. **Dashboard**: Admin panel'e indexing monitoring ekleyin
5. **Alerting**: Başarısız indexing'ler için alert sistemi kurun
6. **Analytics**: Indexing performans metrikleri ekleyin

---

## 📞 Destek

Sorun yaşarsanız:

1. Log dosyalarını kontrol edin
2. Prisma documentation'a bakın: https://www.prisma.io/docs
3. PostgreSQL log'larını inceleyin
4. Rollback script'ini kullanarak geri alın

**Önemli**: Production'da sorun yaşarsanız, önce rollback yapın, sonra sorunu çözün!
