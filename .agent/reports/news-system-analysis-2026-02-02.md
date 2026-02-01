# 📊 HABER SİSTEMİ ANALİZ RAPORU

**Tarih:** 2026-02-02
**Hazırlayan:** Woltran (AI Architect)

---

## 🔴 KRİTİK SORUN: ÇİFT DİL ÇAKIŞMASI

### Tespit Edilen Hata:

Görüntüde görülen sorun:

- **Sol:** İngilizce makale ("Capgemini Divests US Unit Amid ICE Contract Controversy")
- **Sağ:** Türkçe makale ("Capgemini Tartışmalı ICE Sözleşmesi Nedeniyle ABD Yan...")
- Her ikisi de **aynı kategoride (Yapay Zeka)** ve **ana Article tablosunda**

### Kök Neden:

**İKİ AYRI SİSTEM BİRBİRİYLE ÇAKIŞIYOR:**

1. **ESKİ SİSTEM (`content.service.ts`):**
   - Makaleyi Türkçe olarak `Article` tablosuna kaydeder
   - Yayınladıktan SONRA `translateAndSaveArticle()` çağırır
   - Bu fonksiyon **`ArticleTranslation` tablosuna** İngilizce çeviriyi kaydeder
   - Ana `Article` tablosu = Türkçe (tek kayıt)
   - `ArticleTranslation` tablosu = TR + EN çevirileri (ilişkili)

2. **YENİ SİSTEM (`intelligent-news.service.ts`):**
   - Hem Türkçe HEM İngilizce makaleyi **doğrudan `Article` tablosuna** kaydediyor
   - 2 AYRI makale oluşturuyor (slug: `xxx` ve `xxx-en`)
   - `ArticleTranslation` tablosunu KULLANMIYOR

### Sonuç:

- Türkçe haberler: 2 kez oluşuyor (eski + yeni sistem)
- İngilizce haberler: Ana sayfada Türkçe içeriklerle birlikte görünüyor
- Duplicate kontrolleri çalışmıyor çünkü farklı slug'lar var

---

## 📐 MEVCUT MİMARİ ANALİZİ

### Veritabanı Şeması:

```
┌─────────────────────────────────────────────────────────────┐
│                         Article                              │
├─────────────────────────────────────────────────────────────┤
│ id, title, slug, content, status, categoryId, ...            │
│ ❌ locale field YOK - tüm makaleler dil bilgisi olmadan      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    ArticleTranslation                        │
├─────────────────────────────────────────────────────────────┤
│ id, articleId, locale ("tr"|"en"), title, slug, content      │
│ ✅ Doğru yaklaşım - bir makale, çoklu çeviri                 │
└─────────────────────────────────────────────────────────────┘
```

### Servis Akışları:

```
┌─────────────────────────────────────────────────────────────┐
│              ESKİ SİSTEM (content.service.ts)                │
├─────────────────────────────────────────────────────────────┤
│  1. fetchAINews() → RSS + Trend                              │
│  2. selectBestArticles() → AI seçim                          │
│  3. processArticle() → DeepSeek yeniden yazma                │
│  4. publishArticle() → Article tablosuna kaydet              │
│  5. translateAndSaveArticle() → ArticleTranslation'a EN      │
│                                                              │
│  ✅ DOĞRU: 1 Article + 2 ArticleTranslation (tr, en)         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│           YENİ SİSTEM (intelligent-news.service.ts)          │
├─────────────────────────────────────────────────────────────┤
│  1. isArticleDuplicate() → Gelişmiş duplicate                │
│  2. gatherSources() → Brave + Jina/Tavily                    │
│  3. synthesizeContent() → DeepSeek sentez (TR + EN)          │
│  4. db.article.create() → Türkçe Article                     │
│  5. db.article.create() → İngilizce Article (YANLIŞ!)        │
│                                                              │
│  ❌ YANLIŞ: 2 Article kaydı (tr + en ayrı ayrı)              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 DETAYLI SORUN LİSTESİ

### 1. Çift Makale Sorunu (KRİTİK)

- **Konum:** `intelligent-news.service.ts` satır 952-1014
- **Sorun:** TR ve EN için 2 ayrı `db.article.create()` çağrısı
- **Etki:** Ana sayfada İngilizce haberler Türkçelerle karışık görünüyor

### 2. Dil Ayrımı Yok

- **Konum:** `Article` modeli (schema.prisma satır 80-128)
- **Sorun:** `locale` field'ı yok, hangi dilin ana makale olduğu belirsiz
- **Etki:** Frontend hangi dildeki haberleri göstereceğini bilmiyor

### 3. agent.service.ts Entegrasyonu

- **Konum:** `agent.service.ts` satır 240-260
- **Sorun:** Yeni `processIntelligentNews()` kullanılıyor ama...
- **Etki:** Eski `translateAndSaveArticle()` artık çağrılmıyor

### 4. Duplicate Kontrolü İngilizce İçin Çalışmıyor

- **Konum:** `intelligent-news.service.ts` satır 210-270
- **Sorun:** Duplicate kontrolü sadece orijinal başlıkla yapılıyor
- **Etki:** Türkçe ve İngilizce versiyonlar birbirini duplicate olarak görmüyor

---

## ✅ ÖNERİLEN ÇÖZÜMLER

### Seçenek A: ArticleTranslation Sistemini Kullan (ÖNERİLEN)

```
intelligent-news.service.ts değişikliği:

1. Sadece Türkçe makaleyi Article tablosuna kaydet
2. İngilizce içeriği ArticleTranslation tablosuna kaydet
3. translateAndSaveArticle() fonksiyonunu kullan veya benzer mantık ekle

Avantajlar:
- Mevcut frontend uyumlu
- Dil yönetimi düzgün çalışır
- SEO için hreflang düzgün uygulanabilir
```

### Seçenek B: Article Tablosuna locale Ekle

```
1. schema.prisma'ya locale field'ı ekle
2. Frontend'de locale filtrelemesi yap
3. Migration gerekli

Dezavantajlar:
- Büyük değişiklik gerekli
- Mevcut yapıyı bozar
```

### Seçenek C: İngilizce Yayını Kaldır (GEÇİCİ)

```
1. intelligent-news.service.ts'den EN article.create'i kaldır
2. Eski translateAndSaveArticle() sistemine dön

Avantajlar:
- Hızlı düzeltme
- Mevcut yapı korunur
```

---

## 🛠️ ACİL DÜZELTME PLANI

### Adım 1: intelligent-news.service.ts Düzeltmesi

```typescript
// KALDIRILACAK (satır 983-1014):
// İngilizce Article oluşturma kodu

// EKLENECEK:
// Türkçe makale oluşturduktan sonra:
await translateAndSaveArticle(trArticle.id, "tr");
```

### Adım 2: agent.service.ts Dönüşü

```typescript
// Return type değişikliği:
// { id, slug, language } → { id, slug }
```

### Adım 3: Veritabanı Temizliği

```sql
-- İngilizce olarak oluşturulmuş Article'ları bul ve sil
DELETE FROM "Article" WHERE slug LIKE '%-en';
```

---

## 📋 ÖZET

| Bileşen                      | Durum        | Öncelik     |
| ---------------------------- | ------------ | ----------- |
| İngilizce Article oluşturma  | ❌ HATALI    | P0 - Kritik |
| ArticleTranslation kullanımı | ⚠️ Eksik     | P0 - Kritik |
| Duplicate kontrolü (EN)      | ⚠️ Yetersiz  | P1 - Yüksek |
| Agent entegrasyonu           | ✅ Çalışıyor | -           |
| Jina/Tavily fallback         | ✅ Çalışıyor | -           |
| Kaynak toplama               | ✅ Çalışıyor | -           |

---

**Sonuç:** Yeni `intelligent-news.service.ts` sistemi makale araştırma ve sentezleme konusunda iyi çalışıyor, ancak **çift dilde yayınlama mantığı yanlış implementte edilmiş**. Mevcut `ArticleTranslation` mimarisine uygun hale getirilmeli.
