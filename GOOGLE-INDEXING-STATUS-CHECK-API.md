# 🔍 Google Indexing Status Check API

**Tarih:** 2026-02-05
**Amaç:** Haberlerin Google'daki gerçek indexing durumunu kontrol etmek ve database'i güncellemek

---

## 📋 API Endpoints

### 1. Tek Haber Kontrolü

**Endpoint:** `GET /api/admin/google-indexing/check-status`

**Query Parameters:**

- `articleId` (required): Kontrol edilecek haberin ID'si

**Örnek İstek:**

```bash
curl -X GET "http://localhost:3000/api/admin/google-indexing/check-status?articleId=clx123abc"
```

**Başarılı Yanıt (Bildirilmiş):**

```json
{
  "success": true,
  "article": {
    "id": "clx123abc",
    "title": "OpenAI GPT-5 Duyuruldu",
    "slug": "openai-gpt-5-duyuruldu",
    "url": "https://aihaberleri.org/openai-gpt-5-duyuruldu"
  },
  "googleStatus": {
    "indexed": true,
    "status": "SUBMITTED",
    "notifyTime": "2026-02-05T10:30:00.000Z",
    "metadata": {
      "url": "https://aihaberleri.org/openai-gpt-5-duyuruldu",
      "latestUpdate": {
        "type": "URL_UPDATED",
        "notifyTime": "2026-02-05T10:30:00.000Z"
      }
    }
  },
  "updated": true,
  "message": "Haber Google'a bildirilmiş ve database güncellendi"
}
```

**Başarılı Yanıt (Bildirilmemiş):**

```json
{
  "success": true,
  "article": {
    "id": "clx123abc",
    "title": "OpenAI GPT-5 Duyuruldu",
    "slug": "openai-gpt-5-duyuruldu",
    "url": "https://aihaberleri.org/openai-gpt-5-duyuruldu"
  },
  "googleStatus": {
    "indexed": false,
    "status": "PENDING",
    "notifyTime": null,
    "metadata": null
  },
  "updated": true,
  "message": "Haber henüz Google'a bildirilmemiş"
}
```

**Hata Yanıtı:**

```json
{
  "success": false,
  "error": "Haber bulunamadı"
}
```

---

### 2. Toplu Haber Kontrolü

**Endpoint:** `POST /api/admin/google-indexing/check-status`

**Request Body:**

```json
{
  "articleIds": ["clx123abc", "clx456def", "clx789ghi"]
}
```

**Örnek İstek:**

```bash
curl -X POST "http://localhost:3000/api/admin/google-indexing/check-status" \
  -H "Content-Type: application/json" \
  -d '{
    "articleIds": ["clx123abc", "clx456def", "clx789ghi"]
  }'
```

**Başarılı Yanıt:**

```json
{
  "success": true,
  "total": 3,
  "indexed": 2,
  "notIndexed": 1,
  "results": [
    {
      "articleId": "clx123abc",
      "title": "OpenAI GPT-5 Duyuruldu",
      "url": "https://aihaberleri.org/openai-gpt-5-duyuruldu",
      "indexed": true,
      "notifyTime": "2026-02-05T10:30:00.000Z",
      "updated": true
    },
    {
      "articleId": "clx456def",
      "title": "Google Gemini 2.0 Çıktı",
      "url": "https://aihaberleri.org/google-gemini-2-0-cikti",
      "indexed": true,
      "notifyTime": "2026-02-05T11:00:00.000Z",
      "updated": true
    },
    {
      "articleId": "clx789ghi",
      "title": "Meta Llama 4 Geliyor",
      "url": "https://aihaberleri.org/meta-llama-4-geliyor",
      "indexed": false,
      "notifyTime": null,
      "updated": true
    }
  ]
}
```

**Limitler:**

- Maksimum 50 haber tek seferde
- Her istek arası 1 saniye bekleme (rate limiting)

---

## 🎯 Kullanım Senaryoları

### Senaryo 1: Tek Haberin Durumunu Kontrol Et

```bash
# Article ID ile kontrol
curl -X GET "http://localhost:3000/api/admin/google-indexing/check-status?articleId=clx123abc"
```

**Ne Yapar:**

1. Article'ı database'den bulur
2. Google Indexing API'den durumu sorgular
3. Sonuca göre database'i günceller:
   - Bildirilmişse: `googleIndexed: true`, `googleIndexStatus: SUBMITTED`
   - Bildirilmemişse: `googleIndexed: false`, `googleIndexStatus: PENDING`

### Senaryo 2: Tüm Haberlerin Durumunu Kontrol Et

```bash
# Önce tüm article ID'leri al
psql -d ainewsdb -c "SELECT id FROM \"Article\" WHERE status = 'PUBLISHED' LIMIT 50;" -t -A > article_ids.txt

# Sonra toplu kontrol et
curl -X POST "http://localhost:3000/api/admin/google-indexing/check-status" \
  -H "Content-Type: application/json" \
  -d "{\"articleIds\": $(cat article_ids.txt | jq -R . | jq -s .)}"
```

### Senaryo 3: Admin Panel'den Kontrol

Admin panel'e buton ekleyerek kullanıcılar tek tıkla kontrol edebilir:

```typescript
// Admin panel component
const checkGoogleStatus = async (articleId: string) => {
  const response = await fetch(
    `/api/admin/google-indexing/check-status?articleId=${articleId}`,
  );
  const data = await response.json();

  if (data.success) {
    alert(
      `Google Durumu: ${data.googleStatus.indexed ? "Bildirilmiş" : "Bildirilmemiş"}`,
    );
  }
};
```

---

## 🔄 Database Güncellemeleri

API, Google'dan gelen sonuca göre otomatik olarak database'i günceller:

### Bildirilmiş Haber

```sql
UPDATE "Article"
SET
  "googleIndexed" = true,
  "googleIndexStatus" = 'SUBMITTED',
  "googleIndexedAt" = '2026-02-05T10:30:00.000Z'
WHERE id = 'clx123abc';
```

### Bildirilmemiş Haber

```sql
UPDATE "Article"
SET
  "googleIndexed" = false,
  "googleIndexStatus" = 'PENDING'
WHERE id = 'clx123abc';
```

---

## 📊 Google Indexing API Metadata

Google'dan dönen metadata örneği:

```json
{
  "url": "https://aihaberleri.org/openai-gpt-5-duyuruldu",
  "latestUpdate": {
    "type": "URL_UPDATED",
    "notifyTime": "2026-02-05T10:30:00.000Z"
  },
  "latestRemove": null
}
```

**Field'lar:**

- `url`: Bildirilen URL
- `latestUpdate.type`: Bildirim türü (`URL_UPDATED` veya `URL_DELETED`)
- `latestUpdate.notifyTime`: Bildirim zamanı (ISO 8601)
- `latestRemove`: Silme bildirimi (varsa)

---

## ⚠️ Önemli Notlar

### 1. Rate Limiting

Google Indexing API'nin limitleri:

- **200 istek/gün** (quota)
- Toplu kontrolde her istek arası **1 saniye** bekleme

### 2. Authentication

API, Google Service Account kullanır:

- Environment variable: `GOOGLE_SERVICE_ACCOUNT_KEY`
- Veya JSON dosyası: `aihaberleri-46042-861df20fa232.json`

### 3. Hata Durumları

**Quota Exceeded:**

```json
{
  "success": false,
  "error": "Quota exceeded for quota metric 'Queries' and limit 'Queries per day'"
}
```

**Invalid URL:**

```json
{
  "success": false,
  "error": "Invalid URL format"
}
```

**Service Account Error:**

```json
{
  "success": false,
  "error": "Google Indexing API istemcisi oluşturulamadı"
}
```

---

## 🧪 Test

### Manuel Test

```bash
# 1. Tek haber kontrol
curl -X GET "http://localhost:3000/api/admin/google-indexing/check-status?articleId=YOUR_ARTICLE_ID"

# 2. Toplu kontrol (3 haber)
curl -X POST "http://localhost:3000/api/admin/google-indexing/check-status" \
  -H "Content-Type: application/json" \
  -d '{
    "articleIds": ["ID1", "ID2", "ID3"]
  }'
```

### Database Kontrolü

```sql
-- Kontrol edilen haberleri göster
SELECT
    id,
    title,
    "googleIndexed",
    "googleIndexStatus",
    "googleIndexedAt"
FROM "Article"
WHERE id IN ('ID1', 'ID2', 'ID3');
```

---

## 🔧 Entegrasyon Örnekleri

### 1. Cron Job ile Otomatik Kontrol

```bash
# Her gün 1 kez tüm haberleri kontrol et
0 2 * * * curl -X POST http://localhost:3000/api/admin/google-indexing/check-status -H "Content-Type: application/json" -d '{"articleIds": ["ID1", "ID2", "ID3"]}'
```

### 2. Admin Panel Butonu

```typescript
// src/app/admin/articles/page.tsx
const ArticleRow = ({ article }) => {
  const [checking, setChecking] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const res = await fetch(
        `/api/admin/google-indexing/check-status?articleId=${article.id}`
      );
      const data = await res.json();

      if (data.success) {
        toast.success(
          data.googleStatus.indexed
            ? 'Google\'a bildirilmiş ✅'
            : 'Henüz bildirilmemiş ⏳'
        );
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <tr>
      <td>{article.title}</td>
      <td>
        <button onClick={checkStatus} disabled={checking}>
          {checking ? 'Kontrol ediliyor...' : 'Google Durumunu Kontrol Et'}
        </button>
      </td>
    </tr>
  );
};
```

### 3. Batch Script

```bash
#!/bin/bash
# check-all-articles.sh

# Tüm article ID'leri al
ARTICLE_IDS=$(psql -d ainewsdb -t -A -c "SELECT id FROM \"Article\" WHERE status = 'PUBLISHED' LIMIT 50;")

# JSON array oluştur
JSON_ARRAY=$(echo "$ARTICLE_IDS" | jq -R . | jq -s .)

# API'ye gönder
curl -X POST "http://localhost:3000/api/admin/google-indexing/check-status" \
  -H "Content-Type: application/json" \
  -d "{\"articleIds\": $JSON_ARRAY}"
```

---

## ✅ Özet

**API Endpoint:** ✅ Oluşturuldu

**Özellikler:**

- ✅ Tek haber kontrolü (GET)
- ✅ Toplu haber kontrolü (POST, max 50)
- ✅ Otomatik database güncelleme
- ✅ Rate limiting (1 saniye/istek)
- ✅ Detaylı hata yönetimi

**Kullanım:**

```bash
# Tek haber
curl -X GET "http://localhost:3000/api/admin/google-indexing/check-status?articleId=xxx"

# Toplu
curl -X POST "http://localhost:3000/api/admin/google-indexing/check-status" \
  -H "Content-Type: application/json" \
  -d '{"articleIds": ["id1", "id2", "id3"]}'
```

**Sonraki Adım:** Admin panel'e buton ekle veya cron job kur

---

**API hazır! 🎉**
