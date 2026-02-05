# ✅ Google Indexing Durum Kontrolü - Hazır

## 🎯 Yapılan İşlemler

### 1. Prisma Client Güncelleme

- ✅ `npx prisma generate` ile client yeniden oluşturuldu
- ✅ Yeni alanlar (`language`, `googleIndexed`, `googleIndexingScheduled`) tanındı
- ✅ TypeScript hataları düzeltildi

### 2. Admin Panel Buton Ekleme

- ✅ "Google Durumunu Kontrol Et" butonu eklendi
- ✅ Seçili haberlerin Google'daki gerçek durumunu kontrol eder
- ✅ Database'i otomatik günceller
- ✅ Sonuçları toast ile gösterir

## 🚀 Kullanım

### Admin Panelinden Kullanım

1. **Admin paneline git:** `/admin/google-indexing-batch`

2. **Haberleri seç:**
   - Checkbox'larla haberleri seç
   - Veya "Tümünü Seç" butonuna bas

3. **Google durumunu kontrol et:**
   - "Google Durumunu Kontrol Et (X)" butonuna bas
   - Sistem her haberi Google API'den sorgular
   - Database otomatik güncellenir
   - Sonuç toast'ta gösterilir: "✅ 5 bildirilmiş, ❌ 3 bildirilmemiş"

4. **Bildirilmemiş haberleri gönder:**
   - "Yarın İçin Planla (X)" butonuna bas
   - Batch sistemi yarın için planlar

### API'den Kullanım

#### Tek Haber Kontrolü

```bash
curl -X GET "http://localhost:3000/api/admin/google-indexing/check-status?articleId=xxx"
```

#### Toplu Kontrol (Max 50 haber)

```bash
curl -X POST "http://localhost:3000/api/admin/google-indexing/check-status" \
  -H "Content-Type: application/json" \
  -d '{"articleIds": ["id1", "id2", "id3"]}'
```

## 📊 Sistem Davranışı

### Durum Kontrolü Sırasında

1. **Google API Sorgusu:**
   - Her haber için `getNotificationMetadata()` çağrılır
   - Google'dan bildirim geçmişi alınır

2. **Database Güncelleme:**
   - **Bildirilmiş ise:**
     - `googleIndexed = true`
     - `googleIndexStatus = "SUBMITTED"`
     - `googleIndexedAt = notifyTime`
   - **Bildirilmemiş ise:**
     - `googleIndexed = false`
     - `googleIndexStatus = "PENDING"`

3. **Rate Limiting:**
   - Her istek arasında 1 saniye beklenir
   - Google API limitlerini aşmaz

### Sonuç Gösterimi

```typescript
// Toast mesajı
"✅ 5 bildirilmiş, ❌ 3 bildirilmemiş"

// API response
{
  "success": true,
  "total": 8,
  "indexed": 5,
  "notIndexed": 3,
  "results": [...]
}
```

## 🎨 UI Özellikleri

### Buton Durumları

1. **Normal:**

   ```
   🔄 Google Durumunu Kontrol Et (5)
   ```

2. **Loading:**

   ```
   ⏳ Kontrol Ediliyor...
   ```

3. **Disabled:**
   - Hiç haber seçilmediğinde
   - Kontrol devam ederken

### Buton Konumu

```
┌─────────────────────────────────────────────────────┐
│ Google Indexing Batch                               │
│ Toplu Google bildirim yönetimi                      │
│                                                     │
│  [🔄 Google Durumunu Kontrol Et (5)]  [📤 Yarın İçin Planla (5)] │
└─────────────────────────────────────────────────────┘
```

## 🔧 Teknik Detaylar

### API Endpoint

- **Path:** `/api/admin/google-indexing/check-status`
- **Methods:** GET (tek), POST (toplu)
- **Rate Limit:** 1 saniye/istek
- **Max Batch:** 50 haber

### Database Alanları

```prisma
model Article {
  language                   String    @default("tr")
  googleIndexed              Boolean   @default(false)
  googleIndexStatus          IndexStatus @default(PENDING)
  googleIndexedAt            DateTime?
  googleIndexingScheduled    Boolean   @default(false)
  googleIndexingScheduledAt  DateTime?
}
```

### Frontend State

```typescript
const [checkingStatus, setCheckingStatus] = useState(false);
const [selectedArticles, setSelectedArticles] = useState<Set<string>>(
  new Set(),
);
```

## 📝 Workflow

```
1. Kullanıcı haberleri seçer
   ↓
2. "Google Durumunu Kontrol Et" butonuna basar
   ↓
3. Frontend → POST /api/admin/google-indexing/check-status
   ↓
4. Backend → Her haber için Google API sorgusu
   ↓
5. Database güncellenir (googleIndexed, googleIndexStatus)
   ↓
6. Frontend → Toast ile sonuç gösterilir
   ↓
7. Sayfa yenilenir (bildirilmiş haberler listeden çıkar)
```

## ✅ Test Senaryoları

### Senaryo 1: Bildirilmiş Haber

```
Input: Article ID (Google'a bildirilmiş)
Expected:
  - googleIndexed = true
  - googleIndexStatus = "SUBMITTED"
  - googleIndexedAt = notifyTime
  - Toast: "✅ 1 bildirilmiş"
```

### Senaryo 2: Bildirilmemiş Haber

```
Input: Article ID (Google'a bildirilmemiş)
Expected:
  - googleIndexed = false
  - googleIndexStatus = "PENDING"
  - Toast: "❌ 1 bildirilmemiş"
```

### Senaryo 3: Toplu Kontrol

```
Input: 10 article ID
Expected:
  - Her biri kontrol edilir
  - Database güncellenir
  - Toast: "✅ 7 bildirilmiş, ❌ 3 bildirilmemiş"
  - Sayfa yenilenir
```

## 🚨 Önemli Notlar

1. **Rate Limiting:**
   - Google API günlük limiti: 200 istek
   - Her kontrol 1 istek kullanır
   - Toplu kontrolde dikkatli olun

2. **Database Güncelleme:**
   - Kontrol sonrası otomatik güncellenir
   - Bildirilmiş haberler listeden çıkar
   - Yeniden kontrol için sayfa yenilenir

3. **Batch Sistemi:**
   - Kontrol sonrası bildirilmemiş haberler için batch oluşturabilirsiniz
   - Batch yarın için planlanır
   - Cron job otomatik gönderir

## 📦 Dosyalar

- ✅ `src/app/admin/google-indexing-batch/page.tsx` - Admin panel (buton eklendi)
- ✅ `src/app/api/admin/google-indexing/check-status/route.ts` - API endpoint
- ✅ `src/lib/seo/google-indexing-api.ts` - Google API integration
- ✅ `prisma/schema.prisma` - Database schema

## 🎉 Sonuç

Sistem hazır! Admin panelinden:

1. Haberleri seç
2. "Google Durumunu Kontrol Et" butonuna bas
3. Database otomatik güncellenir
4. Bildirilmemiş haberler için batch oluştur

**Artık Google'daki gerçek durumu kontrol edip database'i güncelleyebilirsiniz!** 🚀
