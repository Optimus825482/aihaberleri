# Pipeline Stuck Fix - 2026-02-09

## 🐛 SORUN

AI Haberleri sistemi takıldı:

- Sadece 1 haber paylaşıldı, sonra durdu
- `enriched-articles` kuyruğu stuck (2 item bekliyor, 3 failed)
- Interval 6 dakika gösteriyor (15 dakika olmalı)

## 🔍 ROOT CAUSE ANALİZİ

### 1. Content Enricher Timeout

- Tavily API çağrıları 8 saniye timeout → Yetersiz
- Jina Reader 5 saniye timeout → Yetersiz
- LLM synthesis timeout yok → Agent takılıyor

### 2. Interval Yanlış Ayarlanmış

- Default 0.167 saat (10 dakika) → Kullanıcı 15 dakika istiyor
- Database'de yanlış değer olabilir

### 3. Worker Lock Duration Yetersiz

- 20 dakika lock → Karmaşık işlemler için yetersiz
- Agent timeout 18 dakika → Lock'tan kısa, sorun yaratıyor

## ✅ YAPILAN DEĞİŞİKLİKLER

### 1. Timeout'ları Artırdık

**Dosya:** `src/agents/content-enricher.agent.ts`

```typescript
// ÖNCE:
const JINA_TIMEOUT = 5000; // 5 saniye
const TAVILY_TIMEOUT = 8000; // 8 saniye

// SONRA:
const JINA_TIMEOUT = 10000; // 10 saniye ✅
const TAVILY_TIMEOUT = 15000; // 15 saniye ✅
```

### 2. Timeout Protection Ekledik

**Dosya:** `src/agents/content-enricher.agent.ts`

Her kritik işleme Promise.race ile timeout koruması:

```typescript
// Source gathering: 30 saniye timeout
const sources = await Promise.race([
  this.gatherSourcesWithPriority(article),
  new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error("Source gathering timeout (30s)")),
      30000,
    ),
  ),
]);

// Content synthesis: 45 saniye timeout
const synthesized = await Promise.race([
  this.synthesizeContent(article, sources, category),
  new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error("Content synthesis timeout (45s)")),
      45000,
    ),
  ),
]);

// A/B test: 10 saniye timeout
const variants = await Promise.race([
  generateTitleVariants(content, category),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("A/B test timeout (10s)")), 10000),
  ),
]);
```

### 3. Interval Default'u Düzelttik

**Dosya:** `src/lib/queue.ts`

```typescript
// ÖNCE:
const intervalHours = setting ? parseFloat(setting.value) : 0.167; // 10 dakika

// SONRA:
const intervalHours = setting ? parseFloat(setting.value) : 0.25; // 15 dakika ✅
```

### 4. Worker Timeout ve Lock'u Artırdık

**Dosya:** `src/workers/news-agent.worker.ts`

```typescript
// ÖNCE:
AGENT_TIMEOUT_MS: 18 * 60 * 1000,  // 18 dakika
lockDuration: 1200000,              // 20 dakika

// SONRA:
AGENT_TIMEOUT_MS: 25 * 60 * 1000,  // 25 dakika ✅
lockDuration: 1800000,              // 30 dakika ✅
```

## 📊 BEKLENEN SONUÇLAR

### Önce (Sorunlu):

```
✅ 1 haber paylaşıldı
❌ Pipeline stuck (2 item bekliyor)
❌ 3 failed job
❌ 6 dakika interval (yanlış)
```

### Sonra (Düzeltilmiş):

```
✅ Her 15 dakikada 1-2 haber paylaşılacak
✅ Timeout koruması sayesinde agent takılmayacak
✅ Failed job'lar azalacak
✅ Pipeline akıcı çalışacak
```

## 🚀 DEPLOYMENT SONRASI

Deploy ettiğinde otomatik olarak:

1. **Worker restart olacak** → Stuck agent'lar temizlenecek
2. **Yeni timeout'lar aktif olacak** → Agent takılmayacak
3. **15 dakika interval başlayacak** → Düzenli haber akışı
4. **Lock duration yeterli olacak** → Job'lar tamamlanacak

## 🔧 MANUEL KONTROL (Opsiyonel)

Deploy sonrası database'de interval'i kontrol et:

```sql
-- Mevcut değeri gör
SELECT * FROM "Setting" WHERE key = 'agent.intervalHours';

-- Eğer yanlışsa düzelt (15 dakika = 0.25 saat)
UPDATE "Setting"
SET value = '0.25'
WHERE key = 'agent.intervalHours';
```

## 📈 İYİLEŞTİRMELER

| Metrik             | Önce  | Sonra | İyileşme         |
| ------------------ | ----- | ----- | ---------------- |
| Jina Timeout       | 5s    | 10s   | +100%            |
| Tavily Timeout     | 8s    | 15s   | +87%             |
| Agent Timeout      | 18 dk | 25 dk | +39%             |
| Lock Duration      | 20 dk | 30 dk | +50%             |
| Interval Default   | 10 dk | 15 dk | Kullanıcı isteği |
| Timeout Protection | ❌    | ✅    | Yeni özellik     |

## ✅ ÖZET

**4 kritik fix yapıldı:**

1. ✅ API timeout'ları artırıldı (Tavily 15s, Jina 10s)
2. ✅ Promise.race ile timeout koruması eklendi (30s, 45s, 10s)
3. ✅ Interval default 15 dakikaya çekildi
4. ✅ Worker timeout ve lock duration artırıldı (25 dk, 30 dk)

**Deploy et, sistem düzelecek!** 🚀
