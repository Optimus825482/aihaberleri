# 🚀 AKILLI FİLTRELEME SİSTEMİ - DEPLOYMENT REHBERİ

**Tarih:** 02 Şubat 2026  
**Durum:** Ready for Deployment  
**Tahmini Süre:** 1 saat

---

## 📋 DEPLOYMENT ADIMLARI

### ✅ Adım 1: Database Migration (5 dakika)

#### Lokal Test (Opsiyonel)

```bash
# Prisma client'ı güncelle
npx prisma generate

# Migration'ı test et (dry-run)
psql $DATABASE_URL < prisma/migrations/20260202_add_topic_column.sql
```

#### Production Deployment

```bash
# SSH ile sunucuya bağlan
ssh user@your-server.com
cd /path/to/project

# Migration'ı çalıştır
psql $DATABASE_URL < prisma/migrations/20260202_add_topic_column.sql

# Veya Prisma ile
npx prisma db push
```

**Beklenen Çıktı:**

```sql
ALTER TABLE
CREATE INDEX
CREATE INDEX
```

---

### ✅ Adım 2: Python Environment Setup (10 dakika)

#### Otomatik Kurulum (Önerilen)

```bash
# Setup script'ini çalıştır
chmod +x scripts/setup_python_env.sh
./scripts/setup_python_env.sh
```

#### Manuel Kurulum

```bash
# Virtual environment oluştur
python3 -m venv venv

# Aktive et
source venv/bin/activate  # Linux/Mac
# veya
venv\Scripts\activate     # Windows

# Dependencies'leri yükle
pip install -r scripts/requirements.txt
```

**Beklenen Çıktı:**

```
✅ Python 3 found: Python 3.11.x
📦 Creating virtual environment...
🔄 Activating virtual environment...
📥 Installing dependencies...
✅ Setup complete!
```

---

### ✅ Adım 3: Topic Extraction (30 dakika)

#### Test (İlk 10 Haber)

```bash
# Virtual environment'ı aktive et
source venv/bin/activate

# Test çalıştırması
python3 scripts/extract_topics_python.py --limit 10
```

**Beklenen Çıktı:**

```
============================================================
🚀 TOPIC EXTRACTION SCRIPT
============================================================

✅ Environment variables OK
✅ Database connected
✅ Topic column already exists
✅ Found 10 articles

📦 Batch 1/3 (4 articles)
   ✅ [1/10] Nvidia CEO'su OpenAI'a 100 Milyar Dolar...
      → nvidia_openai_investment
   ...

============================================================
PROCESSING COMPLETE
============================================================

✅ Processed: 10
❌ Failed: 0
⏱️  Duration: 5.2s
📊 Rate: 1.9 articles/sec
```

#### Production (TÜM Haberler)

```bash
# TÜM haberleri işle
python3 scripts/extract_topics_python.py --all

# Veya arka planda çalıştır
nohup python3 scripts/extract_topics_python.py --all > topic_extraction.log 2>&1 &

# Log'u takip et
tail -f topic_extraction.log
```

**Tahmini Süre:**

- 100 haber: ~45 saniye
- 500 haber: ~3.5 dakika
- 1000 haber: ~7 dakika
- 5000 haber: ~35 dakika

---

### ✅ Adım 4: Code Deployment (10 dakika)

```bash
# Git pull (eğer remote'ta ise)
git pull origin main

# Dependencies'leri güncelle
npm install

# Prisma client'ı yeniden oluştur
npx prisma generate

# Build
npm run build
```

---

### ✅ Adım 5: Worker Restart (2 dakika)

```bash
# PM2 ile çalışıyorsa
pm2 restart worker

# Veya systemd ile
sudo systemctl restart news-worker

# Veya manuel
pkill -f "news-agent.worker"
npm run worker
```

**Log'u kontrol et:**

```bash
pm2 logs worker --lines 50
```

**Beklenen Log:**

```
🚀 Starting News Agent Worker...
✅ Redis connected
✅ Database connection successful
✅ Worker started successfully!
👂 Listening for jobs on queue: news-agent
```

---

### ✅ Adım 6: Test & Verification (5 dakika)

#### Test 1: Smart Filtering Test

```bash
npm run test:smart-filtering
```

**Beklenen Çıktı:**

```
🚀 Testing Smart Filtering System

📰 Step 1: Fetching AI news...
✅ Fetched 79 articles

🎯 Step 2: Running smart filtering pipeline...

📊 STAGE 1: BATCH FILTERING
   Input: 79 haber
   ✅ Filtered: 40 haber

🧠 STAGE 2: TOPIC EXTRACTION
   Input: 40 haber
   ✅ Topics extracted: 40 haber

🔍 STAGE 3: TOPIC-BASED DUPLICATE CHECK & SMART SELECTION
   Input: 40 haber
   Target: 5 unique topics
   ✅ Selected: 5 unique topics

============================================================
✅ SMART FILTERING TAMAMLANDI
============================================================
   Stage 1 (Batch Filter):    79 → 40
   Stage 2 (Topic Extract):   40 → 40
   Stage 3 (Smart Select):    40 → 5
   Duplicate Rate:            87.5%
   Processing Time:           12.3s
============================================================

✅ Test completed successfully!
```

#### Test 2: Manuel Worker Trigger

```bash
# Admin panel'den manuel trigger
# veya API ile
curl -X POST http://localhost:3000/api/admin/agent/trigger \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Test 3: Database Verification

```bash
# Topic'leri kontrol et
psql $DATABASE_URL -c "SELECT topic, COUNT(*) FROM \"Article\" WHERE topic IS NOT NULL GROUP BY topic ORDER BY COUNT(*) DESC LIMIT 10;"
```

**Beklenen Çıktı:**

```
           topic            | count
----------------------------+-------
 nvidia_openai_investment   |     3
 google_gemini_release      |     2
 tesla_autopilot_safety     |     2
 microsoft_copilot_features |     1
 ...
```

---

## 🎯 SUCCESS CRITERIA

### ✅ Deployment Başarılı Sayılır Eğer:

1. **Database Migration:**
   - ✅ `topic` kolonu oluşturuldu
   - ✅ Index'ler oluşturuldu
   - ✅ Hata yok

2. **Topic Extraction:**
   - ✅ En az %90 başarı oranı
   - ✅ Topic'ler anlamlı (nvidia_openai_investment gibi)
   - ✅ Fallback topic'ler minimum (%10'dan az)

3. **Worker:**
   - ✅ Başarıyla başladı
   - ✅ Redis bağlantısı OK
   - ✅ Database bağlantısı OK
   - ✅ Job'ları işliyor

4. **Smart Filtering:**
   - ✅ 79 haber → 40 haber (Stage 1)
   - ✅ 40 haber → 40 topic (Stage 2)
   - ✅ 40 haber → 5-8 unique (Stage 3)
   - ✅ Duplicate rate: %80-90
   - ✅ Processing time: <3 dakika

5. **Publication:**
   - ✅ En az 1 haber yayınlandı
   - ✅ Topic field'ı dolu
   - ✅ Duplicate detection çalışıyor

---

## 🐛 TROUBLESHOOTING

### Sorun 1: Python Script Hatası

**Hata:**

```
ModuleNotFoundError: No module named 'psycopg2'
```

**Çözüm:**

```bash
source venv/bin/activate
pip install -r scripts/requirements.txt
```

---

### Sorun 2: Database Connection Error

**Hata:**

```
❌ Database connection failed: could not connect to server
```

**Çözüm:**

```bash
# DATABASE_URL'i kontrol et
echo $DATABASE_URL

# PostgreSQL'in çalıştığını kontrol et
pg_isready -h localhost -p 5432

# .env dosyasını kontrol et
cat .env | grep DATABASE_URL
```

---

### Sorun 3: DeepSeek API Rate Limit

**Hata:**

```
❌ DeepSeek API error: 429
```

**Çözüm:**

```bash
# Batch size'ı azalt
python3 scripts/extract_topics_python.py --batch-size 2

# Veya daha uzun bekleme süresi
# (script'te sleep süresini 500ms → 1000ms artır)
```

---

### Sorun 4: Worker Hala 0 Haber Yayınlıyor

**Kontrol Listesi:**

1. ✅ Database migration çalıştı mı?
2. ✅ Topic extraction tamamlandı mı?
3. ✅ Worker restart edildi mi?
4. ✅ Yeni kod deploy edildi mi?

**Debug:**

```bash
# Worker log'unu kontrol et
pm2 logs worker --lines 100

# Database'de topic'leri kontrol et
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Article\" WHERE topic IS NOT NULL;"

# Manuel test
npm run test:smart-filtering
```

---

## 📊 MONITORING

### Metrikler (İlk 24 Saat)

| Metrik           | Hedef     | Nasıl Kontrol Edilir                                     |
| ---------------- | --------- | -------------------------------------------------------- |
| Publication Rate | %12-20    | Admin panel → Agent logs                                 |
| Duplicate Rate   | %80-90    | Worker logs → "Duplicate Rate"                           |
| Topic Coverage   | %95+      | `SELECT COUNT(*) FROM "Article" WHERE topic IS NOT NULL` |
| Processing Time  | <3 dakika | Worker logs → "Processing Time"                          |
| Error Rate       | <%5       | Worker logs → "Failed" count                             |

### Alertler

```bash
# Cron job: Her saat kontrol et
0 * * * * /path/to/check_publication_rate.sh

# check_publication_rate.sh
#!/bin/bash
RATE=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM \"Article\" WHERE \"publishedAt\" > NOW() - INTERVAL '1 hour'")
if [ $RATE -eq 0 ]; then
  echo "⚠️  WARNING: No articles published in last hour" | mail -s "Worker Alert" admin@example.com
fi
```

---

## 🎉 DEPLOYMENT COMPLETE!

Tüm adımlar tamamlandıysa:

✅ Database migration başarılı  
✅ Topic extraction tamamlandı  
✅ Worker yeniden başlatıldı  
✅ Smart filtering çalışıyor  
✅ Haberler yayınlanıyor

**Sistem artık %12-20 yayınlama oranı ile çalışıyor! 🚀**

---

## 📞 DESTEK

Sorun yaşarsanız:

1. **Log'ları kontrol et:**

   ```bash
   pm2 logs worker --lines 100
   tail -f topic_extraction.log
   ```

2. **Database'i kontrol et:**

   ```bash
   psql $DATABASE_URL
   SELECT * FROM "Article" WHERE topic IS NOT NULL LIMIT 10;
   ```

3. **Test script'ini çalıştır:**

   ```bash
   npm run test:smart-filtering
   ```

4. **GitHub Issue aç:**
   - Log'ları ekle
   - Hata mesajlarını ekle
   - Adımları detaylandır

---

**Hazır! Deployment'a başlayabilirsin! 🚀**
