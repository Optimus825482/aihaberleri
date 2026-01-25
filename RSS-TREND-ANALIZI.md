# 📰 RSS + Trend Analizi Sistemi

## 🎯 Genel Bakış

Sistem artık **10+ RSS kaynağından** haber topluyor ve **Brave Search API** ile trend analizi yaparak **en popüler haberleri** otomatik seçiyor!

## 🔄 Çalışma Akışı

```
RSS Kaynakları (10+)
    ↓
Haber Toplama (50-100 haber)
    ↓
Son 48 Saat Filtresi
    ↓
Brave Search Trend Analizi
    ↓
Top 20 Trend Haber
    ↓
DeepSeek Seçim (2-3 haber)
    ↓
İçerik Yeniden Yazma
    ↓
Pollinations.ai Görsel
    ↓
Yayınlama
```

## 📡 RSS Kaynakları

### İngilizce Kaynaklar (10 Kaynak)

1. **MIT Technology Review - AI**
   - URL: `https://www.technologyreview.com/topic/artificial-intelligence/feed`
   - Akademik ve araştırma odaklı

2. **VentureBeat - AI**
   - URL: `https://venturebeat.com/category/ai/feed/`
   - İş ve teknoloji haberleri

3. **The Verge - AI**
   - URL: `https://www.theverge.com/rss/ai-artificial-intelligence/index.xml`
   - Teknoloji ve kültür

4. **TechCrunch - AI**
   - URL: `https://techcrunch.com/category/artificial-intelligence/feed/`
   - Startup ve yatırım haberleri

5. **Ars Technica - AI**
   - URL: `https://feeds.arstechnica.com/arstechnica/technology-lab`
   - Teknik derinlemesine analizler

6. **AI News**
   - URL: `https://www.artificialintelligence-news.com/feed/`
   - AI odaklı haber sitesi

7. **Machine Learning Mastery**
   - URL: `https://machinelearningmastery.com/feed/`
   - Eğitim ve tutorial içerikler

8. **OpenAI Blog**
   - URL: `https://openai.com/blog/rss.xml`
   - OpenAI resmi duyuruları

9. **Google AI Blog**
   - URL: `https://blog.research.google/feeds/posts/default`
   - Google AI araştırmaları

10. **DeepMind Blog**
    - URL: `https://deepmind.google/blog/rss.xml`
    - DeepMind araştırmaları

## 📊 Trend Analizi Sistemi

### Brave Search API Kullanımı

**API Key:** `BSAGBjbQoeFNCjKwfzhJg9cdsmG4UXu`

### Trend Skoru Hesaplama

Her haber için trend skoru şu faktörlere göre hesaplanır:

1. **Arama Sonuç Sayısı** (0-100 puan)
   - Brave Search'te kaç sonuç var
   - Daha fazla sonuç = daha popüler

2. **Başlık Benzerliği** (0-20 puan/sonuç)
   - Arama sonuçlarında başlık kelimeleri geçiyor mu
   - Yüksek benzerlik = daha alakalı

3. **Güncellik Bonusu** (0-10 puan/sonuç)
   - Son 1 saat: +10 puan
   - Son 1 gün: +5 puan
   - Daha eski: 0 puan

**Toplam Skor:** 0-500+ puan arası

### Örnek Trend Skorları

```
Skor 300+: Çok trend (viral haber)
Skor 200-300: Yüksek trend
Skor 100-200: Orta trend
Skor 0-100: Düşük trend
```

## 🔍 Haber Seçim Süreci

### Adım 1: RSS Toplama

```typescript
const rssItems = await fetchAllRSSFeeds();
// Sonuç: 50-100 haber
```

### Adım 2: Zaman Filtresi

```typescript
const recentItems = filterRecentArticles(rssItems, 48);
// Sonuç: Son 48 saatteki haberler
```

### Adım 3: Trend Analizi

```typescript
const rankings = await rankArticlesByTrend(recentItems);
// Sonuç: Trend skoruna göre sıralı liste
```

### Adım 4: Top 20 Seçimi

```typescript
const topArticles = rankings.slice(0, 20);
// Sonuç: En trend 20 haber
```

### Adım 5: DeepSeek Final Seçim

```typescript
const selected = await analyzeNewsArticles(topArticles);
// Sonuç: En iyi 2-3 haber
```

## 📝 Kod Örnekleri

### RSS Feed Okuma

```typescript
import { fetchAllRSSFeeds } from "@/lib/rss";

const items = await fetchAllRSSFeeds();
console.log(`${items.length} haber toplandı`);
```

### Trend Analizi

```typescript
import { rankArticlesByTrend } from "@/lib/brave";

const rankings = await rankArticlesByTrend([
  {
    title: "OpenAI GPT-5 Released",
    description: "New AI model with breakthrough capabilities",
  },
]);

console.log(`Trend skoru: ${rankings[0].score}`);
```

### Tam Entegrasyon

```typescript
import { fetchAINews } from "@/services/news.service";

const trendingNews = await fetchAINews();
// Otomatik olarak:
// 1. RSS'den toplar
// 2. Filtreler
// 3. Trend analizi yapar
// 4. Top 20'yi döner
```

## 🧪 Test

### Test Script Çalıştırma

```bash
# RSS + Trend analizi testi
npx tsx scripts/test-rss-trend.ts
```

### Beklenen Çıktı

```
🧪 RSS + Trend Analizi Entegrasyon Testi Başlıyor...

📝 Test 1: RSS Feed Okuma
✅ Toplam 87 haber toplandı

📝 Test 2: Son 48 Saat Filtresi
✅ Son 48 saatte 42 haber

📝 Test 3: Trend AI Konuları
✅ 10 trend konu bulundu

📝 Test 4: Trend Analizi
✅ Trend Sıralaması:
  1. Skor: 285 - OpenAI Announces GPT-5...
  2. Skor: 267 - Google DeepMind Breakthrough...
  3. Skor: 245 - Meta Releases Llama 3...

📝 Test 5: Tam Entegrasyon
✅ 20 trend haber seçildi

✅ Tüm Testler Başarılı!
```

## 🎯 Agent Kullanımı

### Otomatik Çalışma

Agent günde 2 kez otomatik çalışır:

```typescript
// Agent çalıştırıldığında:
1. RSS'den 50-100 haber toplar
2. Son 48 saatteki haberleri filtreler
3. Brave Search ile trend analizi yapar
4. Top 20 trend haberi seçer
5. DeepSeek ile en iyi 2-3'ünü seçer
6. İçerikleri yeniden yazar
7. Pollinations.ai ile görsel oluşturur
8. Yayınlar
```

### Manuel Çalıştırma

Admin panelinden:

```
/admin → "Agent'ı Çalıştır" butonu
```

## 📊 Performans

### Süre Analizi

| İşlem            | Süre               |
| ---------------- | ------------------ |
| RSS Toplama      | 5-10 saniye        |
| Trend Analizi    | 10-20 saniye       |
| DeepSeek Seçim   | 5-10 saniye        |
| İçerik Yazma     | 20-30 saniye/haber |
| Görsel Oluşturma | 2-3 saniye/haber   |
| **Toplam**       | **2-3 dakika**     |

### API Kullanımı

| Servis          | Kullanım    | Limit     |
| --------------- | ----------- | --------- |
| RSS Feeds       | 10 istek    | Sınırsız  |
| Brave Search    | 20-40 istek | 15,000/ay |
| DeepSeek        | 3-5 istek   | Ücretli   |
| Pollinations.ai | 2-3 istek   | Sınırsız  |

## 🔧 Yapılandırma

### Environment Variables

```env
# Brave Search API
BRAVE_API_KEY="BSAGBjbQoeFNCjKwfzhJg9cdsmG4UXu"

# Agent Configuration
AGENT_MIN_ARTICLES_PER_RUN="2"
AGENT_MAX_ARTICLES_PER_RUN="3"
AGENT_MIN_INTERVAL_HOURS="5"
```

### RSS Kaynakları Ekleme

```typescript
// src/lib/rss.ts
export const AI_NEWS_RSS_FEEDS = [
  {
    name: "Yeni Kaynak",
    url: "https://example.com/feed.xml",
    language: "en",
  },
  // ... diğer kaynaklar
];
```

## 🚀 Avantajlar

### Önceki Sistem

- ❌ Mock data kullanıyordu
- ❌ Gerçek haber kaynağı yoktu
- ❌ Trend analizi yoktu
- ❌ Rastgele seçim yapıyordu

### Yeni Sistem

- ✅ 10+ gerçek RSS kaynağı
- ✅ 50-100 gerçek haber
- ✅ Brave Search trend analizi
- ✅ Akıllı, veri bazlı seçim
- ✅ En popüler haberleri seçer
- ✅ Güncel ve alakalı içerik

## 📈 İstatistikler

### Günlük Kullanım

```
Agent Çalışma: 2x/gün
RSS Toplama: 100-200 haber/gün
Trend Analizi: 40-80 haber/gün
Seçilen Haberler: 4-6 haber/gün
Yayınlanan: 4-6 haber/gün
```

### Aylık Kullanım

```
Toplanan Haber: 3,000-6,000
Analiz Edilen: 1,200-2,400
Yayınlanan: 120-180
```

## 🔍 Debug ve Log'lar

### RSS Toplama Logları

```
📡 10 RSS feed okunuyor...
📡 RSS feed okunuyor: MIT Technology Review - AI
✅ 8 haber bulundu: MIT Technology Review - AI
📡 RSS feed okunuyor: VentureBeat - AI
✅ 12 haber bulundu: VentureBeat - AI
...
✅ Toplam 87 haber toplandı
✅ 87 benzersiz haber
```

### Trend Analizi Logları

```
📊 42 haber için trend analizi...
📊 Trend skoru hesaplanıyor: OpenAI GPT-5...
✅ Trend skoru: 285
📊 Trend skoru hesaplanıyor: Google DeepMind...
✅ Trend skoru: 267
...
✅ Trend sıralaması tamamlandı
Top 5: #1 (skor: 285), #2 (skor: 267), #3 (skor: 245)...
```

## 🎉 Sonuç

RSS + Trend Analizi sistemi ile:

- ✅ Gerçek, güncel haberler
- ✅ Veri bazlı seçim
- ✅ En popüler içerik
- ✅ Otomatik ve akıllı
- ✅ Production-ready

**Artık agent gerçek, trend AI haberlerini otomatik olarak buluyor, seçiyor ve yayınlıyor!** 🚀

---

**Versiyon:** 3.0.0  
**Tarih:** 2024  
**Durum:** ✅ Production Ready
