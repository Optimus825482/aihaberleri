# RSS Feed Testing Scripts

Bu klasördeki Python scriptleri, RSS feed'leri test etmek ve yeni kaynaklar eklemek için kullanılır.

## 📦 Kurulum

```bash
# Python bağımlılıklarını yükle
pip install -r scripts/requirements.txt
```

## 🔧 Scriptler

### 1. `test-new-rss-feeds.py`

**Amaç:** Deploy öncesi tüm RSS feed'leri test eder.

**Kontroller:**

- ✅ HTTP status (200 OK)
- ✅ XML parsing (geçerli RSS/Atom formatı)
- ✅ Entry sayısı (minimum 1)
- ✅ Response time (15 saniye timeout)
- ✅ Required fields (title, link, date)

**Kullanım:**

```bash
python scripts/test-new-rss-feeds.py
```

**Çıktı:**

- Konsol: Renkli test sonuçları
- Dosya: `scripts/rss-test-report_YYYY-MM-DD_HH-MM-SS.txt`

**Exit Codes:**

- `0`: Tüm testler başarılı
- `1`: Bazı testler başarısız (deploy etme!)

---

### 2. `extract-and-test-journalism-ai-feeds.py`

**Amaç:** `resources.rss` dosyasından domain'leri çıkarır ve RSS feed'lerini bulur.

**İşlem Adımları:**

1. `resources.rss` içindeki tüm URL'leri parse eder
2. Unique domain'leri çıkarır
3. Her domain için yaygın RSS pattern'lerini test eder:
   - `/feed`
   - `/rss`
   - `/feed.xml`
   - `/rss.xml`
   - `/atom.xml`
   - vb.
4. Bulunan feed'leri kategorize eder
5. TypeScript formatında çıktı verir

**Kullanım:**

```bash
python scripts/extract-and-test-journalism-ai-feeds.py
```

**Çıktı:**

- Konsol: TypeScript formatında feed listesi
- Dosya: `scripts/journalism-ai-feeds-report.txt`

**Kategoriler:**

- `JOURNALISM AI & NEWSROOM TOOLS`: Gazetecilik AI araçları
- `AI RESEARCH & ACADEMIA`: Araştırma kurumları
- `TECH COMPANIES & AI LABS`: Teknoloji şirketleri
- `AI NEWS & ANALYSIS`: Genel AI haberleri

---

## 🚀 Workflow: Yeni Feed Ekleme

### Adım 1: Feed'leri Keşfet

```bash
python scripts/extract-and-test-journalism-ai-feeds.py
```

### Adım 2: TypeScript Çıktısını Kopyala

Script'in çıktısındaki TypeScript formatındaki feed'leri `src/lib/rss.ts` dosyasına ekle.

### Adım 3: Test Et

```bash
python scripts/test-new-rss-feeds.py
```

### Adım 4: Deploy

Tüm testler başarılıysa deploy et:

```bash
npm run build
npm run deploy
```

---

## 📊 Test Sonuçları

### Başarılı Test Örneği:

```
✅ [1/15] JournalismAI
   URL: https://www.journalismai.info/feed
   Entries: 25 | Response: 1.23s
   Feed Title: JournalismAI
   Language: en
```

### Başarısız Test Örneği:

```
❌ [2/15] Example Feed
   URL: https://example.com/feed
   Error: HTTP 404
   Response time: 0.45s
```

---

## ⚙️ Konfigürasyon

### Timeout Ayarları

```python
REQUEST_TIMEOUT = 15  # 15 saniye
MAX_RETRIES = 2       # 2 deneme
```

### Rate Limiting

```python
time.sleep(1)  # Domain'ler arası 1 saniye
time.sleep(0.5)  # Pattern'ler arası 0.5 saniye
```

---

## 🐛 Troubleshooting

### Problem: "Timeout" hatası

**Çözüm:** Feed yavaş yanıt veriyor. `REQUEST_TIMEOUT` değerini artır veya feed'i kaldır.

### Problem: "Invalid XML" hatası

**Çözüm:** Feed formatı bozuk. Feed URL'ini kontrol et veya alternatif feed bul.

### Problem: "No entries found" hatası

**Çözüm:** Feed boş. Feed'in aktif olduğunu kontrol et.

---

## 📝 Notlar

- **Rate Limiting:** Script'ler otomatik rate limiting kullanır. Çok fazla feed test ediyorsan bekleme sürelerini artır.
- **Retry Mechanism:** Timeout durumunda otomatik 2 kez daha dener.
- **User-Agent:** Tüm istekler `Mozilla/5.0 (compatible; AINewsBot/1.0)` user-agent'ı kullanır.

---

## 🎯 Sonuç

Bu script'ler sayesinde:

- ✅ Yeni feed'leri güvenle ekleyebilirsin
- ✅ Deploy öncesi tüm feed'leri test edebilirsin
- ✅ Bozuk feed'leri erken tespit edebilirsin
- ✅ Response time'ları ölçebilirsin

**Deploy öncesi MUTLAKA `test-new-rss-feeds.py` çalıştır!**
