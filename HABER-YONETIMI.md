# 📰 Haber Yönetimi Sistemi

## ✨ Özellikler

### 1. Haber Listesi (`/admin/articles`)

**Görüntüleme:**

- Tüm haberler tablo formatında
- Görsel önizleme (thumbnail)
- Kategori, durum, görüntülenme sayısı
- Arama fonksiyonu

**İşlemler:**

- 🔄 **Görseli Güncelle**: Unsplash'tan yeni görsel çeker
- 👁️ **Görüntüle**: Haberi yeni sekmede açar
- ✏️ **Düzenle**: Haber düzenleme sayfasına yönlendirir
- 🗑️ **Sil**: Haberi siler (onay ister)

### 2. Haber Düzenleme (`/admin/articles/[id]/edit`)

**Düzenlenebilir Alanlar:**

#### Temel Bilgiler

- **Başlık**: Haber başlığı (otomatik slug oluşturur)
- **Özet**: Kısa özet (150-200 karakter önerilir)
- **İçerik**: Tam haber içeriği (Markdown destekli)

#### Görsel ve Kategori

- **Görsel URL**: Unsplash veya başka kaynak
- **Kategori**: Dropdown'dan seçim
- **Durum**: Taslak / Yayında

#### SEO Bilgileri

- **Anahtar Kelimeler**: Virgülle ayrılmış (örn: yapay zeka, AI, teknoloji)
- **Meta Başlık**: SEO için özel başlık (opsiyonel)
- **Meta Açıklama**: SEO için özel açıklama (opsiyonel)

**Özellikler:**

- Canlı karakter sayacı
- Görsel önizleme
- Form validasyonu
- Otomatik slug oluşturma
- Kaydet / İptal butonları

### 3. Haber Silme

**Güvenlik:**

- Onay dialogu gösterir
- Sadece admin kullanıcılar silebilir
- Kalıcı silme (soft delete değil)

## 🔌 API Endpoints

### GET `/api/articles`

Tüm haberleri listeler (admin için)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Haber Başlığı",
      "slug": "haber-basligi",
      "excerpt": "Kısa özet",
      "imageUrl": "https://...",
      "status": "PUBLISHED",
      "views": 123,
      "publishedAt": "2024-01-01T00:00:00Z",
      "category": {
        "name": "Yapay Zeka"
      }
    }
  ]
}
```

### GET `/api/articles/[id]`

Tek bir haberi getirir (düzenleme için)

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Haber Başlığı",
    "slug": "haber-basligi",
    "excerpt": "Kısa özet",
    "content": "Tam içerik...",
    "imageUrl": "https://...",
    "status": "PUBLISHED",
    "categoryId": "uuid",
    "keywords": ["yapay zeka", "AI"],
    "metaTitle": "SEO Başlık",
    "metaDescription": "SEO Açıklama",
    "category": {
      "id": "uuid",
      "name": "Yapay Zeka",
      "slug": "yapay-zeka"
    }
  }
}
```

### PUT `/api/articles/[id]`

Haberi günceller

**Request Body:**

```json
{
  "title": "Güncel Başlık",
  "excerpt": "Güncel özet",
  "content": "Güncel içerik",
  "imageUrl": "https://...",
  "categoryId": "uuid",
  "status": "PUBLISHED",
  "keywords": ["keyword1", "keyword2"],
  "metaTitle": "SEO Başlık",
  "metaDescription": "SEO Açıklama"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Güncel Başlık",
    "slug": "guncel-baslik",
    ...
  }
}
```

### DELETE `/api/articles/[id]`

Haberi siler

**Response:**

```json
{
  "success": true,
  "message": "Haber silindi"
}
```

### POST `/api/articles/[id]/refresh-image`

Haberin görselini yeniler

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "imageUrl": "https://new-image-url...",
    ...
  }
}
```

### GET `/api/categories`

Tüm kategorileri listeler

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Yapay Zeka",
      "slug": "yapay-zeka",
      "description": "AI haberleri",
      "order": 1
    }
  ]
}
```

## 🎯 Kullanım Senaryoları

### Senaryo 1: Haber Düzenleme

1. `/admin/articles` sayfasına git
2. Düzenlemek istediğin haberin yanındaki ✏️ butonuna tıkla
3. Formu doldur / güncelle
4. "Kaydet" butonuna tıkla
5. Otomatik olarak haber listesine yönlendirilirsin

### Senaryo 2: Görsel Güncelleme

1. `/admin/articles` sayfasında
2. Haberin yanındaki 🔄 butonuna tıkla
3. Sistem Unsplash'tan yeni görsel çeker
4. Sayfa otomatik yenilenir

### Senaryo 3: Haber Silme

1. `/admin/articles` sayfasında
2. Haberin yanındaki 🗑️ butonuna tıkla
3. Onay dialogunda "Tamam"a tıkla
4. Haber kalıcı olarak silinir

### Senaryo 4: Haber Arama

1. `/admin/articles` sayfasında
2. Sağ üstteki arama kutusuna yaz
3. Haberler başlığa göre filtrelenir

## 🔒 Güvenlik

**Authentication:**

- Tüm admin sayfaları NextAuth ile korunur
- API endpoint'leri session kontrolü yapar
- Yetkisiz erişimde 401 hatası döner

**Validation:**

- Zorunlu alanlar kontrol edilir
- URL formatları doğrulanır
- Kategori ID'si geçerli olmalı

**Data Integrity:**

- Slug otomatik oluşturulur (Türkçe karakter desteği)
- publishedAt tarihi status'e göre ayarlanır
- Keywords array olarak saklanır

## 📝 Form Validasyonu

**Zorunlu Alanlar:**

- ✅ Başlık
- ✅ Özet
- ✅ İçerik
- ✅ Kategori

**Opsiyonel Alanlar:**

- Görsel URL
- Anahtar Kelimeler
- Meta Başlık
- Meta Açıklama

**Otomatik İşlemler:**

- Slug oluşturma (başlıktan)
- publishedAt ayarlama (status'e göre)
- Keywords array'e dönüştürme

## 🎨 UI/UX Özellikleri

**Responsive Design:**

- Mobil uyumlu
- Tablet optimizasyonu
- Desktop full-width

**Loading States:**

- Sayfa yüklenirken spinner
- Kayıt sırasında "Kaydediliyor..." butonu
- Görsel yenileme sırasında animasyon

**User Feedback:**

- Başarılı işlemde alert
- Hata durumunda açıklayıcı mesaj
- Karakter sayacı (özet ve içerik için)

**Accessibility:**

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus states

## 🚀 Gelecek İyileştirmeler

- [ ] Toplu silme
- [ ] Toplu durum değiştirme
- [ ] Gelişmiş filtreleme (kategori, durum, tarih)
- [ ] Sıralama (başlık, tarih, görüntülenme)
- [ ] Sayfalama (pagination)
- [ ] Görsel yükleme (upload)
- [ ] Markdown önizleme
- [ ] Taslak otomatik kaydetme
- [ ] Revizyon geçmişi
- [ ] Çoklu dil desteği

## 📊 Performans

**Optimizasyonlar:**

- Next.js Image component (otomatik optimizasyon)
- Lazy loading (görsel yükleme)
- Debounced search (arama)
- Minimal re-renders

**Metrics:**

- Sayfa yükleme: < 1s
- Form submit: < 500ms
- Görsel yenileme: < 2s

---

**Son Güncelleme:** 2024
**Versiyon:** 1.0.0
**Durum:** ✅ Production Ready
