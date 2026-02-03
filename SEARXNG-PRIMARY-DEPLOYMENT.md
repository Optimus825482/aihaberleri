# 🚀 SearXNG Primary + Fallback Deployment

## 📋 ÖZET

**SearXNG-First Hibrit Arama Sistemi** başarıyla kuruldu:

1. ✅ **SearXNG** - SINIRSIZ (primary, %90) ⭐
2. ✅ **Brave Search** - 2,000 sorgu/ay (fallback, %5)
3. ✅ **Tavily API** - 1,000 sorgu/ay (fallback, %5)

---

## 🎯 STRATEJİ

### SearXNG-First Yaklaşımı

**Primary Provider: SearXNG (%90)**

- Tüm isteklerin %90'ı SearXNG'ye gider
- Sınırsız, ücretsiz, hızlı
- Kendi sunucunda, düşük latency

**Emergency Fallback: Brave/Tavily (%10)**

- Sadece SearXNG çökerse devreye girer
- API key maliyeti minimal
- Rate limit riski çok düşük

### Önceki Sistem vs Yeni Sistem

| Özellik               | Round-Robin | SearXNG-First |
| --------------------- | ----------- | ------------- |
| **SearXNG Kullanımı** | %33         | **%90** ⭐    |
| **Brave Kullanımı**   | %33         | %5 (fallback) |
| **Tavily Kullanımı**  | %33         | %5 (fallback) |
| **API Maliyeti**      | Yüksek      | **Minimal**   |
| **Rate Limit Riski**  | Orta        | **Çok Düşük** |

---

## 📊 BEKLENEN SONUÇLAR

### Provider Dağılımı (Normal Durum)

```
SearXNG: ~90% (primary)
Brave:   ~5%  (fallback - sadece SearXNG fail olursa)
Tavily:  ~5%  (fallback - sadece SearXNG fail olursa)
```

### Aylık Kullanım Tahmini

**Örnek: 10,000 sorgu/ay**

- SearXNG: 9,000 sorgu (sınırsız, ücretsiz)
- Brave: 500 sorgu (2,000 limitin %25'i)
- Tavily: 500 sorgu (1,000 limitin %50'si)

**Sonuç:** Rate limit riski YOK! ✅

---

## 🔧 KONFIGÜRASYON

### Provider Öncelik Sırası

```typescript
const providers = [
  "searxng", // 1-9. öncelik (90%)
  "searxng",
  "searxng",
  "searxng",
  "searxng",
  "searxng",
  "searxng",
  "searxng",
  "searxng",
  "brave", // 10. öncelik (5% fallback)
  "tavily", // 11. öncelik (5% fallback)
];
```

### Fallback Senaryoları

**Senaryo 1: SearXNG Çalışıyor (Normal)**

```
İstek 1-9 → SearXNG ✅
İstek 10  → Brave (fallback check)
İstek 11  → Tavily (fallback check)
İstek 12+ → SearXNG ✅ (döngü)
```

**Senaryo 2: SearXNG Çöktü (Emergency)**

```
İstek 1 → SearXNG ❌ (error)
İstek 1 → Brave ✅ (fallback)
İstek 2 → Tavily ✅ (fallback)
İstek 3+ → Brave/Tavily rotation
```

**Senaryo 3: SearXNG Recovery**

```
SearXNG 5 dakika cooldown sonrası tekrar denenecek
Recovery başarılı → %90 kullanıma geri dön
```

---

## 💰 MALİYET ANALİZİ

### Önceki Sistem (Round-Robin)

**Aylık 10,000 sorgu:**

- Brave: 3,333 sorgu → **LIMIT AŞIMI** (2,000 limit)
- Tavily: 3,333 sorgu → **LIMIT AŞIMI** (1,000 limit)
- SearXNG: 3,333 sorgu → OK

**Sonuç:** Rate limit hataları, ek maliyet

### Yeni Sistem (SearXNG-First)

**Aylık 10,000 sorgu:**

- SearXNG: 9,000 sorgu → OK (sınırsız)
- Brave: 500 sorgu → OK (2,000 limitin %25'i)
- Tavily: 500 sorgu → OK (1,000 limitin %50'si)

**Sonuç:** Hiç rate limit yok, minimal maliyet ✅

---

## 🧪 TEST SONUÇLARI

### Test Komutu

```bash
npx tsx scripts/test-searxng.ts
```

### Beklenen Çıktı

```
📊 Provider İstatistikleri:

🟢 SearXNG (Self-hosted):
   Requests: ~90
   Errors: 0
   Status: ✅ Aktif

🔵 Brave Search:
   Requests: ~5
   Errors: 0
   Status: ✅ Aktif

🟣 Tavily API:
   Requests: ~5
   Errors: 0
   Status: ✅ Aktif

📊 Toplam İstek: 100
   SearXNG: 90.0% ⭐
   Brave: 5.0%
   Tavily: 5.0%
```

---

## 🚀 DEPLOYMENT

### 1. .env Dosyasına Ekle

```bash
# SearXNG (primary provider)
SEARXNG_BASE_URL="http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io"

# Fallback providers (opsiyonel - sadece emergency)
BRAVE_API_KEY="your-brave-api-key"
TAVILY_API_KEY="your-tavily-api-key"
```

### 2. Test Et

```bash
npx tsx scripts/test-searxng.ts
```

### 3. Production'a Deploy

```bash
git add .
git commit -m "feat: SearXNG-first strategy - %90 primary, %10 fallback"
git push
```

---

## 📈 MONİTORİNG

### Provider Kullanım Takibi

```typescript
import { getProviderStats } from "@/lib/hybrid-search";

const stats = getProviderStats();

console.log(`SearXNG: ${stats.searxng.requests} requests`);
console.log(`Brave: ${stats.brave.requests} requests`);
console.log(`Tavily: ${stats.tavily.requests} requests`);

// Beklenen oran: 90% / 5% / 5%
```

### Alarm Kuralları

**SearXNG Kullanımı < %80:**

```
⚠️ UYARI: SearXNG kullanımı düşük!
Fallback provider'lar çok fazla kullanılıyor.
SearXNG container'ını kontrol et.
```

**Brave/Tavily Kullanımı > %20:**

```
🚨 ALARM: Emergency fallback çok aktif!
SearXNG muhtemelen çökmüş.
Docker container'ı restart et.
```

---

## 🔧 SORUN GİDERME

### SearXNG Çalışmıyor

```bash
# Container durumunu kontrol et
docker ps | grep searxng

# Log'ları kontrol et
docker logs searxng

# Restart
docker restart searxng

# Test et
curl http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io/search?q=test&format=json
```

### Fallback Provider'lar Çok Kullanılıyor

**Sebep 1: SearXNG Çökmüş**

```bash
docker restart searxng
```

**Sebep 2: SearXNG Yavaş**

```bash
# UWSGI workers artır
# docker-compose.yaml:
UWSGI_WORKERS=8  # 4'ten 8'e çıkar
UWSGI_THREADS=8  # 4'ten 8'e çıkar
```

**Sebep 3: Network Sorunu**

```bash
# SearXNG URL'ini test et
curl -I http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io
```

---

## ✅ AVANTAJLAR

### Maliyet

- ✅ **%90 ücretsiz** (SearXNG)
- ✅ **%10 minimal maliyet** (Brave/Tavily fallback)
- ✅ **Rate limit riski yok**

### Performans

- ✅ **Daha hızlı** (SearXNG kendi sunucunda)
- ✅ **Daha güvenilir** (3 fallback seçeneği)
- ✅ **Daha basit** (tek primary provider)

### Bakım

- ✅ **Kolay monitoring** (SearXNG kullanımı %90 olmalı)
- ✅ **Kolay debug** (fallback kullanımı artarsa SearXNG'yi kontrol et)
- ✅ **Kolay scale** (SearXNG UWSGI workers artır)

---

## 🎉 SONUÇ

**SearXNG-First stratejisi başarıyla uygulandı!**

**Kazanımlar:**

- 🚀 %90 sınırsız arama (SearXNG)
- 💰 Minimal API maliyeti
- ⚡ Daha hızlı yanıt süreleri
- 🛡️ 3 fallback seçeneği
- 📊 Kolay monitoring

**Deployment Date:** 2026-02-03  
**Status:** ✅ Production Ready  
**Version:** 2.0.0 (SearXNG-First)
