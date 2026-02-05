# 🚀 Google Indexing Status - Hızlı Migration Rehberi

## 📋 Sunucuda Yapılacaklar (5 Dakika)

### 1️⃣ PostgreSQL'e Bağlan

```bash
psql -U postgres -d ainewsdb
```

### 2️⃣ Bu SQL'i Çalıştır

```sql
-- Field'ları ekle
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "googleIndexStatus" TEXT DEFAULT 'PENDING';
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "googleIndexedAt" TIMESTAMP(3);

-- Index'leri oluştur
CREATE INDEX IF NOT EXISTS "Article_googleIndexStatus_idx" ON "Article"("googleIndexStatus");
CREATE INDEX IF NOT EXISTS "Article_googleIndexedAt_idx" ON "Article"("googleIndexedAt");
CREATE INDEX IF NOT EXISTS "Article_googleIndexStatus_publishedAt_idx" ON "Article"("googleIndexStatus", "publishedAt");
```

### 3️⃣ Kontrol Et

```sql
-- Field'lar eklendi mi?
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'Article'
AND column_name IN ('googleIndexStatus', 'googleIndexedAt');

-- Beklenen çıktı:
--     column_name      | data_type |  column_default
-- ---------------------+-----------+------------------
--  googleIndexStatus   | text      | 'PENDING'::text
--  googleIndexedAt     | timestamp | NULL
```

### 4️⃣ Prisma Client Güncelle

```bash
cd /path/to/aihaberleri
npx prisma generate
```

### 5️⃣ Uygulamayı Yeniden Başlat

```bash
# Coolify
# Deploy → Restart

# Veya PM2
pm2 restart aihaberleri
```

---

## ✅ Tamamlandı!

Artık admin panelde Google Indexing durumu doğru görünecek:

- **PENDING** → Henüz gönderilmedi
- **SUBMITTED** → Google'a bildirildi
- **FAILED** → Bildirim başarısız

---

## 🔄 Mevcut Haberleri Google'a Göndermek İçin

1. Admin panele git: `/admin/seo-notifications`
2. "Bekleyenleri Gönder" butonuna bas
3. Veya "Google'a Gönder" butonuna bas

---

## 📞 Sorun mu var?

Detaylı rehber: `docs/GOOGLE-INDEXING-STATUS-TRACKING-FIX.md`
