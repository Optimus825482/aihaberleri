# 🐍 Python Topic Extraction Script

Mevcut haberlerin topic'lerini DeepSeek API kullanarak çıkaran Python script'i.

---

## 📋 Özellikler

- ✅ PostgreSQL veritabanına bağlanır
- ✅ `topic` kolonunu otomatik oluşturur (yoksa)
- ✅ Index'leri otomatik oluşturur
- ✅ DeepSeek API ile topic çıkarır
- ✅ Batch processing (4'er haber)
- ✅ Rate limit protection (500ms)
- ✅ Renkli terminal output
- ✅ Progress tracking
- ✅ Error handling
- ✅ Fallback topic generation

---

## 🚀 Kurulum

### 1. Python Ortamını Hazırla

```bash
# Otomatik kurulum (önerilen)
chmod +x scripts/setup_python_env.sh
./scripts/setup_python_env.sh

# Manuel kurulum
python3 -m venv venv
source venv/bin/activate
pip install -r scripts/requirements.txt
```

### 2. Environment Variables

`.env` dosyasında şunlar olmalı:

```env
DATABASE_URL=postgresql://user:password@host:port/database
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxx
```

---

## 💻 Kullanım

### Temel Kullanım

```bash
# Virtual environment'ı aktive et
source venv/bin/activate

# 100 haber işle (default)
python3 scripts/extract_topics_python.py

# Belirli sayıda haber işle
python3 scripts/extract_topics_python.py --limit 500

# TÜM haberleri işle
python3 scripts/extract_topics_python.py --all

# Batch size'ı değiştir
python3 scripts/extract_topics_python.py --batch-size 10
```

### Parametreler

| Parametre        | Açıklama                       | Default |
| ---------------- | ------------------------------ | ------- |
| `--limit N`      | İşlenecek haber sayısı         | 100     |
| `--all`          | Tüm haberleri işle             | False   |
| `--batch-size N` | Paralel işlenecek haber sayısı | 4       |

---

## 📊 Örnek Çıktı

```
============================================================
🚀 TOPIC EXTRACTION SCRIPT
============================================================

Date: 2026-02-02 15:30:45
Mode: LIMIT 100
Batch Size: 4

ℹ️  Checking environment variables...
✅ Environment variables OK
ℹ️  Connecting to database...
✅ Database connected
ℹ️  Checking topic column...
✅ Topic column already exists
ℹ️  Fetching articles without topic...
✅ Found 100 articles

============================================================
PROCESSING 100 ARTICLES
============================================================

ℹ️  Batch size: 4
ℹ️  Rate limit protection: 500ms between batches

📦 Batch 1/25 (4 articles)
   ✅ [1/100] Nvidia CEO'su OpenAI'a 100 Milyar Dolar Yatırım...
      → nvidia_openai_investment
   ✅ [2/100] Endonezya Grok Yapay Zekasına Yasağı Kaldırdı...
      → indonesia_grok_ban
   ✅ [3/100] Google Gemini 2.0 Tanıtıldı...
      → google_gemini_release
   ✅ [4/100] Tesla Autopilot Güvenlik Sorunları...
      → tesla_autopilot_safety

📦 Batch 2/25 (4 articles)
   ...

============================================================
PROCESSING COMPLETE
============================================================

✅ Processed: 98
❌ Failed: 2
⏱️  Duration: 45.3s
📊 Rate: 2.2 articles/sec
============================================================
```

---

## 🔧 Sunucuda Çalıştırma

### SSH ile Bağlan

```bash
ssh user@your-server.com
cd /path/to/project
```

### Script'i Çalıştır

```bash
# Virtual environment'ı aktive et
source venv/bin/activate

# TÜM haberleri işle
python3 scripts/extract_topics_python.py --all

# Veya nohup ile arka planda çalıştır
nohup python3 scripts/extract_topics_python.py --all > topic_extraction.log 2>&1 &

# Log'u takip et
tail -f topic_extraction.log
```

### Cron Job Olarak Çalıştır

```bash
# Crontab'ı düzenle
crontab -e

# Her gün saat 03:00'te çalıştır
0 3 * * * cd /path/to/project && source venv/bin/activate && python3 scripts/extract_topics_python.py --limit 100 >> /var/log/topic_extraction.log 2>&1
```

---

## 🐛 Troubleshooting

### Sorun 1: `psycopg2` kurulum hatası

**Hata:**

```
Error: pg_config executable not found
```

**Çözüm:**

```bash
# Ubuntu/Debian
sudo apt-get install libpq-dev python3-dev

# CentOS/RHEL
sudo yum install postgresql-devel python3-devel

# macOS
brew install postgresql
```

### Sorun 2: Database bağlantı hatası

**Hata:**

```
❌ Database connection failed: could not connect to server
```

**Çözüm:**

```bash
# DATABASE_URL'i kontrol et
echo $DATABASE_URL

# .env dosyasını kontrol et
cat .env | grep DATABASE_URL

# PostgreSQL'in çalıştığını kontrol et
pg_isready -h localhost -p 5432
```

### Sorun 3: DeepSeek API hatası

**Hata:**

```
❌ DeepSeek API error: 401
```

**Çözüm:**

```bash
# API key'i kontrol et
echo $DEEPSEEK_API_KEY

# .env dosyasını kontrol et
cat .env | grep DEEPSEEK_API_KEY

# API key'in geçerli olduğunu test et
curl -X POST https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"test"}]}'
```

### Sorun 4: Rate limit hatası

**Hata:**

```
❌ DeepSeek API error: 429
```

**Çözüm:**

```bash
# Batch size'ı azalt
python3 scripts/extract_topics_python.py --batch-size 2

# Veya daha uzun bekleme süresi ekle (script'te sleep süresini artır)
```

---

## 📈 Performans

### Beklenen Süre

| Haber Sayısı | Batch Size | Süre (tahmini) |
| ------------ | ---------- | -------------- |
| 100          | 4          | ~45 saniye     |
| 500          | 4          | ~3.5 dakika    |
| 1000         | 4          | ~7 dakika      |
| 5000         | 4          | ~35 dakika     |

### Optimizasyon İpuçları

1. **Batch size'ı artır** (rate limit izin veriyorsa):

   ```bash
   python3 scripts/extract_topics_python.py --batch-size 8
   ```

2. **Paralel çalıştır** (farklı terminal'lerde):

   ```bash
   # Terminal 1: İlk 500
   python3 scripts/extract_topics_python.py --limit 500

   # Terminal 2: Sonraki 500
   # (Script'i offset destekleyecek şekilde güncellemek gerekir)
   ```

3. **Sunucuda çalıştır** (daha hızlı internet):
   ```bash
   ssh user@server
   python3 scripts/extract_topics_python.py --all
   ```

---

## 🔒 Güvenlik

- ✅ API key'ler `.env` dosyasında saklanır
- ✅ `.env` dosyası `.gitignore`'da
- ✅ Database şifresi environment variable'da
- ✅ SQL injection koruması (parameterized queries)

---

## 📝 Notlar

- Script, mevcut `topic` değerlerini **güncellemez** (sadece `NULL` olanları işler)
- DeepSeek API başarısız olursa **fallback topic** oluşturulur
- Her batch arasında **500ms** bekleme vardır (rate limit koruması)
- Progress **real-time** olarak gösterilir
- Hata durumunda **otomatik retry** yoktur (manuel tekrar çalıştırın)

---

## 🎯 Sonraki Adımlar

1. ✅ Script'i çalıştır
2. ✅ Sonuçları kontrol et
3. ✅ Worker'ı yeniden başlat
4. ✅ Yeni sistemi test et

**Hazır! 🚀**
